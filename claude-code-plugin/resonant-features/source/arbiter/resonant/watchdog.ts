type WatchdogCode = "WATCHDOG_TIMEOUT" | "WATCHDOG_RESTART_FAILED";

type RunWithWatchdogOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  onRestart?: (context: { operation: string; attempt: number; error: WatchdogError }) => Promise<void> | void;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 1;

const resolvePositiveInt = (raw: string | undefined, fallback: number) => {
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const resolveTimeoutMs = (explicit?: number) => {
  if (Number.isFinite(explicit) && (explicit as number) > 0) {
    return explicit as number;
  }
  return resolvePositiveInt(process.env.ARBITER_WATCHDOG_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
};

const resolveMaxRetries = (explicit?: number) => {
  if (Number.isFinite(explicit) && (explicit as number) >= 0) {
    return explicit as number;
  }
  return resolvePositiveInt(process.env.ARBITER_WATCHDOG_MAX_RETRIES, DEFAULT_MAX_RETRIES);
};

class WatchdogError extends Error {
  code: WatchdogCode;
  operation: string;
  attempt: number;

  constructor(code: WatchdogCode, operation: string, attempt: number, message: string) {
    super(message);
    this.name = "WatchdogError";
    this.code = code;
    this.operation = operation;
    this.attempt = attempt;
  }
}

const withTimeout = async <T>(operation: string, attempt: number, fn: () => Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race<T>([
      Promise.resolve().then(fn),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new WatchdogError(
              "WATCHDOG_TIMEOUT",
              operation,
              attempt,
              `Watchdog timeout in ${operation} at attempt ${attempt}`
            )
          );
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

export async function runWithWatchdog<T>(
  operation: string,
  fn: () => Promise<T>,
  options: RunWithWatchdogOptions = {}
): Promise<T> {
  const timeoutMs = resolveTimeoutMs(options.timeoutMs);
  const maxRetries = resolveMaxRetries(options.maxRetries);
  const totalAttempts = maxRetries + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    try {
      return await withTimeout(operation, attempt, fn, timeoutMs);
    } catch (error) {
      if (!(error instanceof WatchdogError) || error.code !== "WATCHDOG_TIMEOUT") {
        throw error;
      }

      if (attempt >= totalAttempts) {
        throw error;
      }

      if (options.onRestart) {
        try {
          await options.onRestart({ operation, attempt, error });
        } catch (restartError) {
          const message = restartError instanceof Error ? restartError.message : "restart hook failed";
          throw new WatchdogError(
            "WATCHDOG_RESTART_FAILED",
            operation,
            attempt,
            `Watchdog restart failed in ${operation} at attempt ${attempt}: ${message}`
          );
        }
      }
    }
  }

  throw new WatchdogError("WATCHDOG_TIMEOUT", operation, totalAttempts, `Watchdog timeout in ${operation}`);
}

export { WatchdogError };
export type { WatchdogCode, RunWithWatchdogOptions };
