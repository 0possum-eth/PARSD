import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type M2RawEntry = {
  id: string;
  ts: string;
  source: "receipt";
  text: string;
  tokenEstimate: number;
  receiptType?: string;
  runId?: string;
};

type M2CompressedEntry = {
  id: string;
  ts: string;
  source: "receipt";
  rawEntryId: string;
  rawHash: string;
  rawPath: string;
  tokenEstimate: number;
  assertions: string[];
  ambiguous: boolean;
  receiptType?: string;
  runId?: string;
};

type M2State = {
  schemaVersion: "m2.v1";
  processedReceiptHashes: string[];
};

type M2AgentOptions = {
  cwd?: string;
  rawTokenBudget?: number;
  maxProcessedReceiptHashes?: number;
};

type M2RunResult = {
  ingestedCount: number;
  compressedAddedCount: number;
  rawZoneCount: number;
  compressedZoneCount: number;
  rawZoneTokenEstimate: number;
};

type RehydrateOptions = {
  cwd?: string;
};

type RawRehydrateResult = {
  rawHash: string;
  rawPath: string;
  text: string;
};

const DEFAULT_RAW_TOKEN_BUDGET = 4_000;
const DEFAULT_MAX_PROCESSED_HASHES = 20_000;

const sha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const resolveM2Paths = (cwd: string) => {
  const memoryRoot = path.join(cwd, "docs", "arbiter", "_memory", "m2");
  const rawRoot = path.join(memoryRoot, "raw");
  return {
    memoryRoot,
    rawRoot,
    rawZonePath: path.join(memoryRoot, "raw-zone.jsonl"),
    compressedZonePath: path.join(memoryRoot, "compressed-zone.jsonl"),
    statePath: path.join(memoryRoot, "state.json")
  };
};

const ensureDir = async (targetPath: string) => {
  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
};

const readJsonl = async <T>(filePath: string): Promise<T[]> => {
  let content = "";
  try {
    content = await fs.promises.readFile(filePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const rows: T[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      rows.push(JSON.parse(trimmed) as T);
    } catch {
      // Ignore malformed historical rows to keep the agent resilient.
    }
  }
  return rows;
};

const writeJsonl = async (filePath: string, rows: unknown[]) => {
  await ensureDir(filePath);
  const content = rows.map((row) => JSON.stringify(row)).join("\n");
  await fs.promises.writeFile(filePath, content.length > 0 ? `${content}\n` : "", "utf8");
};

const readState = async (statePath: string): Promise<M2State> => {
  try {
    const content = await fs.promises.readFile(statePath, "utf8");
    const parsed = JSON.parse(content) as Partial<M2State>;
    const hashes = Array.isArray(parsed.processedReceiptHashes)
      ? parsed.processedReceiptHashes.filter((value): value is string => typeof value === "string")
      : [];
    return {
      schemaVersion: "m2.v1",
      processedReceiptHashes: hashes
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    return {
      schemaVersion: "m2.v1",
      processedReceiptHashes: []
    };
  }
};

const writeState = async (statePath: string, state: M2State) => {
  await ensureDir(statePath);
  await fs.promises.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
};

const estimateTokens = (text: string) => {
  const normalized = text.trim();
  if (!normalized) {
    return 0;
  }
  return Math.max(1, Math.ceil(normalized.length / 4));
};

const normalizeInline = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const extractMatches = (text: string, pattern: RegExp, mapper: (match: RegExpExecArray) => string) => {
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const value = mapper(match);
    if (value.length > 0) {
      values.push(value);
    }
  }
  return [...new Set(values)];
};

const compressToAssertions = (text: string): { assertions: string[]; ambiguous: boolean } => {
  const normalized = normalizeInline(text);
  if (!normalized) {
    return {
      assertions: ["signal=empty"],
      ambiguous: true
    };
  }

  const commands = extractMatches(
    normalized,
    /\b(?:npm run [\w:-]+|npx [\w:-]+|tsx [\w./:-]+|node [\w./:-]+|git [\w:-]+|rg [\w./:-]+)\b/gi,
    (match) => `cmd:${match[0].toLowerCase()}`
  );
  const filePaths = extractMatches(
    normalized,
    /\b(?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g,
    (match) => `file:${match[0]}`
  );
  const taskIds = extractMatches(
    normalized,
    /\bTASK-[A-Za-z0-9_-]+\b/g,
    (match) => `task:${match[0]}`
  );
  const receiptTypes = extractMatches(
    normalized,
    /"type"\s*:\s*"([A-Z_]+)"/g,
    (match) => `receipt:${match[1]}`
  );

  const assertions = [...commands, ...filePaths, ...taskIds, ...receiptTypes].slice(0, 24);
  if (assertions.length === 0) {
    return {
      assertions: [`signal:${normalized.slice(0, 180)}`],
      ambiguous: true
    };
  }
  return {
    assertions,
    ambiguous: assertions.length < 2
  };
};

const listRunReceiptFiles = async (cwd: string): Promise<Array<{ runId: string; receiptsPath: string }>> => {
  const runsRoot = path.join(cwd, "docs", "arbiter", "_ledger", "runs");
  let entries: fs.Dirent[] = [];
  try {
    entries = await fs.promises.readdir(runsRoot, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files: Array<{ runId: string; receiptsPath: string }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const receiptsPath = path.join(runsRoot, entry.name, "receipts.jsonl");
    try {
      const stat = await fs.promises.stat(receiptsPath);
      if (stat.isFile()) {
        files.push({ runId: entry.name, receiptsPath });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
  return files;
};

const ingestReceipts = async (
  cwd: string,
  state: M2State,
  maxProcessedReceiptHashes: number
): Promise<M2RawEntry[]> => {
  const processed = new Set(state.processedReceiptHashes);
  const newEntries: M2RawEntry[] = [];
  const runFiles = await listRunReceiptFiles(cwd);

  for (const file of runFiles) {
    let content = "";
    try {
      content = await fs.promises.readFile(file.receiptsPath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw error;
    }

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      const lineHash = sha256(trimmed);
      if (processed.has(lineHash)) {
        continue;
      }
      processed.add(lineHash);

      let ts = new Date().toISOString();
      let receiptType: string | undefined;
      try {
        const parsed = JSON.parse(trimmed) as {
          ts?: string;
          receipt?: { type?: string };
        };
        if (typeof parsed.ts === "string") {
          ts = parsed.ts;
        }
        if (parsed.receipt && typeof parsed.receipt.type === "string") {
          receiptType = parsed.receipt.type;
        }
      } catch {
        // Keep defaults if line cannot be parsed.
      }

      newEntries.push({
        id: sha256(`receipt:${lineHash}`),
        ts,
        source: "receipt",
        text: trimmed,
        tokenEstimate: estimateTokens(trimmed),
        receiptType,
        runId: file.runId
      });
    }
  }

  state.processedReceiptHashes = Array.from(processed).slice(-maxProcessedReceiptHashes);
  return newEntries.sort((left, right) => left.ts.localeCompare(right.ts));
};

const sortByTimestamp = <T extends { ts: string }>(rows: T[]) =>
  [...rows].sort((left, right) => left.ts.localeCompare(right.ts));

const dedupeRawEntries = (rows: M2RawEntry[]) => {
  const byId = new Map<string, M2RawEntry>();
  for (const row of sortByTimestamp(rows)) {
    byId.set(row.id, row);
  }
  return [...byId.values()];
};

const chooseRawWindow = (rows: M2RawEntry[], rawTokenBudget: number) => {
  const sorted = sortByTimestamp(rows);
  const keep = new Set<string>();
  let used = 0;

  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const row = sorted[index];
    const tokens = row.tokenEstimate || estimateTokens(row.text);
    if (keep.size === 0 || used + tokens <= rawTokenBudget) {
      keep.add(row.id);
      used += tokens;
    }
  }

  const rawZone = sorted.filter((row) => keep.has(row.id));
  const toCompress = sorted.filter((row) => !keep.has(row.id));
  return { rawZone, toCompress };
};

const createCompressedEntry = (rawEntry: M2RawEntry): M2CompressedEntry => {
  const rawHash = sha256(rawEntry.text);
  const compressedId = sha256(`compressed:${rawEntry.id}:${rawHash}`);
  const compression = compressToAssertions(rawEntry.text);
  return {
    id: compressedId,
    ts: rawEntry.ts,
    source: rawEntry.source,
    rawEntryId: rawEntry.id,
    rawHash,
    rawPath: `docs/arbiter/_memory/m2/raw/${rawHash}.txt`,
    tokenEstimate: estimateTokens(compression.assertions.join(" ")),
    assertions: compression.assertions,
    ambiguous: compression.ambiguous,
    receiptType: rawEntry.receiptType,
    runId: rawEntry.runId
  };
};

const persistRawText = async (cwd: string, rawHash: string, text: string) => {
  const filePath = path.join(cwd, "docs", "arbiter", "_memory", "m2", "raw", `${rawHash}.txt`);
  await ensureDir(filePath);
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  await fs.promises.writeFile(filePath, text, "utf8");
};

export async function readM2RawZone(options: { cwd?: string } = {}): Promise<M2RawEntry[]> {
  const cwd = options.cwd ?? process.cwd();
  const paths = resolveM2Paths(cwd);
  return readJsonl<M2RawEntry>(paths.rawZonePath);
}

export async function readM2CompressedZone(options: { cwd?: string } = {}): Promise<M2CompressedEntry[]> {
  const cwd = options.cwd ?? process.cwd();
  const paths = resolveM2Paths(cwd);
  return readJsonl<M2CompressedEntry>(paths.compressedZonePath);
}

export async function rehydrateRawByHash(
  rawHash: string,
  options: RehydrateOptions = {}
): Promise<RawRehydrateResult | null> {
  const cwd = options.cwd ?? process.cwd();
  const rawPath = path.join(cwd, "docs", "arbiter", "_memory", "m2", "raw", `${rawHash}.txt`);
  try {
    const text = await fs.promises.readFile(rawPath, "utf8");
    return {
      rawHash,
      rawPath: `docs/arbiter/_memory/m2/raw/${rawHash}.txt`,
      text
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function runM2Agent(options: M2AgentOptions = {}): Promise<M2RunResult> {
  const cwd = options.cwd ?? process.cwd();
  const rawTokenBudget =
    options.rawTokenBudget ??
    (() => {
      const parsed = Number.parseInt(process.env.ARBITER_M2_RAW_TOKEN_BUDGET || "", 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RAW_TOKEN_BUDGET;
    })();
  const maxProcessedReceiptHashes =
    options.maxProcessedReceiptHashes ??
    (() => {
      const parsed = Number.parseInt(process.env.ARBITER_M2_MAX_PROCESSED_HASHES || "", 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PROCESSED_HASHES;
    })();

  const paths = resolveM2Paths(cwd);
  await fs.promises.mkdir(paths.memoryRoot, { recursive: true });
  await fs.promises.mkdir(paths.rawRoot, { recursive: true });

  const state = await readState(paths.statePath);
  const existingRaw = await readJsonl<M2RawEntry>(paths.rawZonePath);
  const existingCompressed = await readJsonl<M2CompressedEntry>(paths.compressedZonePath);
  const compressedByRawHash = new Set(existingCompressed.map((entry) => entry.rawHash));

  const ingestedRaw = await ingestReceipts(cwd, state, maxProcessedReceiptHashes);
  const combinedRaw = dedupeRawEntries([...existingRaw, ...ingestedRaw]);
  const { rawZone, toCompress } = chooseRawWindow(combinedRaw, rawTokenBudget);

  const compressedNext = [...existingCompressed];
  let compressedAddedCount = 0;
  for (const rawEntry of toCompress) {
    const rawHash = sha256(rawEntry.text);
    if (compressedByRawHash.has(rawHash)) {
      continue;
    }
    const compressedEntry = createCompressedEntry(rawEntry);
    await persistRawText(cwd, compressedEntry.rawHash, rawEntry.text);
    compressedNext.push(compressedEntry);
    compressedByRawHash.add(compressedEntry.rawHash);
    compressedAddedCount += 1;
  }

  await writeJsonl(paths.rawZonePath, rawZone);
  await writeJsonl(paths.compressedZonePath, sortByTimestamp(compressedNext));
  await writeState(paths.statePath, state);

  return {
    ingestedCount: ingestedRaw.length,
    compressedAddedCount,
    rawZoneCount: rawZone.length,
    compressedZoneCount: compressedNext.length,
    rawZoneTokenEstimate: rawZone.reduce((sum, row) => sum + (row.tokenEstimate || estimateTokens(row.text)), 0)
  };
}

export type {
  M2AgentOptions,
  M2RunResult,
  M2RawEntry,
  M2CompressedEntry,
  RehydrateOptions,
  RawRehydrateResult
};
