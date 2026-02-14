import assert from "node:assert/strict";
import { test } from "node:test";

import { WatchdogError, runWithWatchdog } from "../watchdog";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("runWithWatchdog returns result when operation completes in time", async () => {
  const result = await runWithWatchdog("executor", async () => "ok", {
    timeoutMs: 50,
    maxRetries: 0
  });

  assert.equal(result, "ok");
});

test("runWithWatchdog retries once after timeout and succeeds", async () => {
  let attempts = 0;
  let restartCount = 0;

  const result = await runWithWatchdog(
    "verifier-spec",
    async () => {
      attempts += 1;
      if (attempts === 1) {
        await sleep(25);
        return "late";
      }
      return "recovered";
    },
    {
      timeoutMs: 5,
      maxRetries: 1,
      onRestart: async () => {
        restartCount += 1;
      }
    }
  );

  assert.equal(result, "recovered");
  assert.equal(attempts, 2);
  assert.equal(restartCount, 1);
});

test("runWithWatchdog throws WatchdogError after retries are exhausted", async () => {
  await assert.rejects(
    () =>
      runWithWatchdog(
        "executor",
        async () => {
          await sleep(25);
          return "never in time";
        },
        {
          timeoutMs: 5,
          maxRetries: 1
        }
      ),
    (error: unknown) => {
      assert.ok(error instanceof WatchdogError);
      assert.equal((error as WatchdogError).code, "WATCHDOG_TIMEOUT");
      assert.match((error as Error).message, /executor/i);
      return true;
    }
  );
});
