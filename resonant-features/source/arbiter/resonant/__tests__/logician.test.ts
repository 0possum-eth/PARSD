import assert from "node:assert/strict";
import { test } from "node:test";

import { computeExecutionDigest } from "../../contracts/packets";
import { validateTaskCompletionPacket, validateVerificationPacket } from "../logician";

const buildExecutionRecord = (summary = "v20.0.0") => ({
  command: "node --version",
  exitCode: 0,
  outputSummary: summary,
  outputDigest: computeExecutionDigest(summary)
});

test("validateTaskCompletionPacket accepts valid executor packet", () => {
  const result = validateTaskCompletionPacket(
    {
      taskId: "TASK-1",
      execution: [buildExecutionRecord("ok")],
      tests: ["executed:node --version: ok"],
      files_changed: ["arbiter/execute/taskRunner.ts"]
    },
    "TASK-1"
  );

  assert.deepEqual(result, { ok: true });
});

test("validateTaskCompletionPacket rejects packets with mismatched task id", () => {
  const result = validateTaskCompletionPacket(
    {
      taskId: "TASK-OTHER",
      execution: [buildExecutionRecord()]
    },
    "TASK-1"
  );

  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, "TASK_ID_MISMATCH");
});

test("validateTaskCompletionPacket rejects invalid execution digests", () => {
  const result = validateTaskCompletionPacket(
    {
      taskId: "TASK-1",
      execution: [
        {
          command: "node --version",
          exitCode: 0,
          outputSummary: "ok",
          outputDigest: "f".repeat(64)
        }
      ]
    },
    "TASK-1"
  );

  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, "EXECUTION_DIGEST_INVALID");
});

test("validateVerificationPacket accepts valid verifier packet", () => {
  const result = validateVerificationPacket({ taskId: "TASK-1", passed: true }, "TASK-1");
  assert.deepEqual(result, { ok: true });
});

test("validateVerificationPacket rejects malformed packet", () => {
  const result = validateVerificationPacket({ taskId: "TASK-1", passed: "yes" }, "TASK-1");
  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, "VERIFICATION_PACKET_INVALID");
});
