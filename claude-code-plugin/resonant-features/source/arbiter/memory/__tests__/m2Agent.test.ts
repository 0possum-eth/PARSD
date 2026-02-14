import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  readM2CompressedZone,
  readM2RawZone,
  rehydrateRawByHash,
  runM2Agent
} from "../m2Agent";

const writeReceiptLine = async (
  rootDir: string,
  runId: string,
  receipt: Record<string, unknown>,
  ts: string
) => {
  const receiptsPath = path.join(rootDir, "docs", "arbiter", "_ledger", "runs", runId, "receipts.jsonl");
  await fs.promises.mkdir(path.dirname(receiptsPath), { recursive: true });
  await fs.promises.appendFile(
    receiptsPath,
    `${JSON.stringify({ ts, runId, receipt })}\n`,
    "utf8"
  );
};

test("runM2Agent ingests receipts, enforces split-window, and writes hash-linked compressed history", async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "arbiter-m2-agent-"));

  try {
    await writeReceiptLine(
      tempDir,
      "RUN-A",
      {
        type: "EXECUTOR_COMPLETED",
        taskId: "TASK-100",
        packet: {
          tests: ["executed:npm run test:arbiter"],
          files_changed: ["arbiter/execute/taskRunner.ts"],
          outputSummary: "Implemented watchdog flow"
        }
      },
      "2026-02-14T01:00:00.000Z"
    );
    await writeReceiptLine(
      tempDir,
      "RUN-A",
      {
        type: "VERIFIER_SPEC",
        taskId: "TASK-100",
        passed: true
      },
      "2026-02-14T01:00:01.000Z"
    );
    await writeReceiptLine(
      tempDir,
      "RUN-B",
      {
        type: "RESONANT_GUARDRAIL_EVENT",
        module: "watchdog",
        stage: "strategy_execution",
        outcome: "restart",
        reasonCode: "WATCHDOG_TIMEOUT"
      },
      "2026-02-14T01:00:02.000Z"
    );

    const result = await runM2Agent({
      cwd: tempDir,
      rawTokenBudget: 10
    });

    assert.equal(result.ingestedCount, 3);
    assert.ok(result.compressedAddedCount >= 1);

    const rawZone = await readM2RawZone({ cwd: tempDir });
    const compressedZone = await readM2CompressedZone({ cwd: tempDir });

    assert.ok(rawZone.length >= 1);
    assert.ok(compressedZone.length >= 1);

    const compressed = compressedZone[0];
    assert.match(compressed.rawHash, /^[a-f0-9]{64}$/);
    assert.ok(compressed.rawPath.startsWith("docs/arbiter/_memory/m2/raw/"));
    assert.ok(compressed.assertions.length >= 1);

    const hydrated = await rehydrateRawByHash(compressed.rawHash, { cwd: tempDir });
    assert.ok(hydrated);
    assert.equal(hydrated?.rawHash, compressed.rawHash);
    assert.match(hydrated?.text ?? "", /EXECUTOR_COMPLETED|VERIFIER_SPEC|RESONANT_GUARDRAIL_EVENT/);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});

test("runM2Agent is idempotent for previously ingested receipts", async () => {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "arbiter-m2-agent-idempotent-"));

  try {
    await writeReceiptLine(
      tempDir,
      "RUN-IDEMPOTENT",
      {
        type: "TASK_COMPLETED",
        taskId: "TASK-200",
        epicId: "EPIC-1"
      },
      "2026-02-14T01:10:00.000Z"
    );

    const first = await runM2Agent({ cwd: tempDir, rawTokenBudget: 8 });
    const second = await runM2Agent({ cwd: tempDir, rawTokenBudget: 8 });

    assert.equal(first.ingestedCount, 1);
    assert.equal(second.ingestedCount, 0);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
});
