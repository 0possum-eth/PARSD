import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { spawnSync } from "node:child_process";

const REPO_ROOT = "/Users/0possum-eth/Desktop/p.a.r.s.d";
const CERTIFIER = path.join(REPO_ROOT, "scripts", "arbiter-capability-certifier.sh");
const SWARM_SCRIPT = path.join(REPO_ROOT, "scripts", "run-arbiter-swarm.sh");

const writeJsonl = async (filePath, rows) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  await fs.promises.writeFile(filePath, `${body}\n`, "utf8");
};

const runCertifier = (args, cwd = REPO_ROOT) => {
  return spawnSync("bash", [CERTIFIER, ...args], {
    cwd,
    encoding: "utf8"
  });
};

test("certifier fails gate when ORACLE_REVIEWED and TRUST_CONFIRMED are required but missing", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "parsd-certifier-missing-"));
  const outDir = path.join(tmp, "run");
  const receiptsPath = path.join(tmp, "receipts.jsonl");
  const manifestPath = path.join(tmp, "manifest.tsv");
  await fs.promises.writeFile(manifestPath, "idx\tphase\n1\tflow\n", "utf8");

  await writeJsonl(receiptsPath, [
    {
      ts: "2026-02-14T00:00:00Z",
      runId: "run-test",
      receipt: {
        type: "EXECUTOR_COMPLETED",
        taskId: "TASK-DEP-002",
        packet: { taskId: "TASK-DEP-002", passed: true }
      }
    },
    {
      ts: "2026-02-14T00:00:01Z",
      runId: "run-test",
      receipt: {
        type: "UX_SIMULATED",
        taskId: "TASK-DEP-002",
        packet: { taskId: "TASK-DEP-002", passed: true, journey_checks: ["happy-path"] }
      }
    },
    {
      ts: "2026-02-14T00:00:02Z",
      runId: "run-test",
      receipt: {
        type: "VERIFIER_SPEC",
        taskId: "TASK-DEP-002",
        packet: { taskId: "TASK-DEP-002", passed: true }
      }
    },
    {
      ts: "2026-02-14T00:00:03Z",
      runId: "run-test",
      receipt: {
        type: "VERIFIER_QUALITY",
        taskId: "TASK-DEP-002",
        packet: { taskId: "TASK-DEP-002", passed: true }
      }
    }
  ]);

  const result = runCertifier([
    "--mode",
    "gate",
    "--run-id",
    "run-test",
    "--output-dir",
    outDir,
    "--receipts",
    receiptsPath,
    "--task-id",
    "TASK-DEP-002",
    "--require-oracle",
    "yes",
    "--require-trust",
    "yes",
    "--manifest",
    manifestPath,
    "--bind-manifest"
  ]);

  assert.notEqual(result.status, 0, `expected non-zero exit, got ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

  const certPath = path.join(outDir, "capability-certificate.json");
  const cert = JSON.parse(await fs.promises.readFile(certPath, "utf8"));
  assert.equal(cert.receiptGate.ok, false);
  assert.equal(cert.receiptGate.requiresOracleReviewed, true);
  assert.equal(cert.receiptGate.requiresTrustConfirmed, true);
  assert.ok(cert.receiptGate.missingTypes.includes("ORACLE_REVIEWED"));
  assert.ok(cert.receiptGate.missingTypes.includes("TRUST_CONFIRMED"));
});

test("certifier passes gate with schema-complete ORACLE_REVIEWED and TRUST_CONFIRMED receipts", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "parsd-certifier-pass-"));
  const outDir = path.join(tmp, "run");
  const receiptsPath = path.join(tmp, "receipts.jsonl");
  const manifestPath = path.join(tmp, "manifest.tsv");
  await fs.promises.writeFile(manifestPath, "idx\tphase\n1\tflow\n", "utf8");

  await writeJsonl(receiptsPath, [
    {
      ts: "2026-02-14T00:00:00Z",
      runId: "run-test",
      receipt: {
        type: "EXECUTOR_COMPLETED",
        taskId: "TASK-DEP-002",
        packet: { taskId: "TASK-DEP-002", passed: true }
      }
    },
    {
      ts: "2026-02-14T00:00:01Z",
      runId: "run-test",
      receipt: {
        type: "UX_SIMULATED",
        taskId: "TASK-DEP-002",
        packet: { taskId: "TASK-DEP-002", passed: true, journey_checks: ["happy-path"] }
      }
    },
    {
      ts: "2026-02-14T00:00:02Z",
      runId: "run-test",
      receipt: {
        type: "VERIFIER_SPEC",
        taskId: "TASK-DEP-002",
        packet: { taskId: "TASK-DEP-002", passed: true }
      }
    },
    {
      ts: "2026-02-14T00:00:03Z",
      runId: "run-test",
      receipt: {
        type: "VERIFIER_QUALITY",
        taskId: "TASK-DEP-002",
        packet: { taskId: "TASK-DEP-002", passed: true }
      }
    },
    {
      ts: "2026-02-14T00:00:04Z",
      runId: "run-test",
      receipt: {
        type: "ORACLE_REVIEWED",
        taskId: "TASK-DEP-002",
        packet: { taskId: "TASK-DEP-002", passed: true, findings: ["risk:low"] }
      }
    },
    {
      ts: "2026-02-14T00:00:05Z",
      runId: "run-test",
      receipt: {
        type: "TRUST_CONFIRMED",
        taskId: "TASK-DEP-002",
        packet: {
          taskId: "TASK-DEP-002",
          passed: true,
          trustScope: "docs/arbiter/reference/core.md",
          confirmation: "approved"
        }
      }
    }
  ]);

  const result = runCertifier([
    "--mode",
    "gate",
    "--run-id",
    "run-test",
    "--output-dir",
    outDir,
    "--receipts",
    receiptsPath,
    "--task-id",
    "TASK-DEP-002",
    "--require-oracle",
    "yes",
    "--require-trust",
    "yes",
    "--manifest",
    manifestPath,
    "--bind-manifest"
  ]);

  assert.equal(result.status, 0, `expected zero exit\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);

  const certPath = path.join(outDir, "capability-certificate.json");
  const bindPath = path.join(outDir, "manifest.bindings.json");
  const cert = JSON.parse(await fs.promises.readFile(certPath, "utf8"));
  const bind = JSON.parse(await fs.promises.readFile(bindPath, "utf8"));

  assert.equal(cert.receiptGate.ok, true);
  assert.equal(typeof cert.signature, "string");
  assert.match(cert.signature, /^[a-f0-9]{64}$/);
  assert.match(bind.manifestSha256, /^[a-f0-9]{64}$/);
  assert.match(bind.capabilityCertificateSha256, /^[a-f0-9]{64}$/);
});

test("swarm harness integrates certifier preflight and deterministic compression fixture", async () => {
  const swarmScript = await fs.promises.readFile(SWARM_SCRIPT, "utf8");
  assert.match(swarmScript, /arbiter-capability-certifier\.sh/);
  assert.match(swarmScript, /CERTIFIER_CERT_PATH/);
  assert.match(swarmScript, /manifest\.bindings\.json/);
  assert.match(swarmScript, /toolchain-capability-host/);
  assert.match(swarmScript, /M2_FIXTURE_DIR/);
  assert.match(swarmScript, /rawTokenBudget:\s*120/);
  assert.match(swarmScript, /hydratedPresent/);
});
