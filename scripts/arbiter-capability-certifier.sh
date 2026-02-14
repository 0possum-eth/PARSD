#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/arbiter-capability-certifier.sh --run-id <id> --output-dir <dir> [options]

Options:
  --mode <preflight|gate|full>   Default: full
  --run-id <id>                  Required
  --output-dir <dir>             Required
  --receipts <path>              receipts.jsonl path for gate/full mode
  --task-id <id>                 Required for gate/full mode
  --require-oracle <yes|no>      Default: no
  --require-trust <yes|no>       Default: no
  --manifest <path>              Optional manifest path for binding
  --bind-manifest                Emit manifest.bindings.json
  --timeout-sec <n>              Budget metadata only (default: ARBITER_TIMEOUT_SEC or 180)
  --max-log-bytes <n>            Budget metadata only (default: ARBITER_MAX_LOG_BYTES or 1048576)
  --secret <value>               Signature secret (default: ARBITER_CERTIFIER_SECRET or local dev fallback)
USAGE
}

normalize_yes_no() {
  local value="${1:-}"
  local lowered
  lowered="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  case "$lowered" in
    yes|true|1) echo "yes" ;;
    *) echo "no" ;;
  esac
}

MODE="full"
RUN_ID=""
OUTPUT_DIR=""
RECEIPTS_PATH=""
TASK_ID=""
REQUIRE_ORACLE="no"
REQUIRE_TRUST="no"
MANIFEST_PATH=""
BIND_MANIFEST=0
TIMEOUT_SEC="${ARBITER_TIMEOUT_SEC:-180}"
MAX_LOG_BYTES="${ARBITER_MAX_LOG_BYTES:-1048576}"
CERTIFIER_SECRET="${ARBITER_CERTIFIER_SECRET:-parsd-local-dev-insecure}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --run-id)
      RUN_ID="${2:-}"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    --receipts)
      RECEIPTS_PATH="${2:-}"
      shift 2
      ;;
    --task-id)
      TASK_ID="${2:-}"
      shift 2
      ;;
    --require-oracle)
      REQUIRE_ORACLE="$(normalize_yes_no "${2:-}")"
      shift 2
      ;;
    --require-trust)
      REQUIRE_TRUST="$(normalize_yes_no "${2:-}")"
      shift 2
      ;;
    --manifest)
      MANIFEST_PATH="${2:-}"
      shift 2
      ;;
    --bind-manifest)
      BIND_MANIFEST=1
      shift
      ;;
    --timeout-sec)
      TIMEOUT_SEC="${2:-}"
      shift 2
      ;;
    --max-log-bytes)
      MAX_LOG_BYTES="${2:-}"
      shift 2
      ;;
    --secret)
      CERTIFIER_SECRET="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$MODE" in
  preflight|gate|full) ;;
  *)
    echo "Invalid --mode value: $MODE" >&2
    exit 2
    ;;
esac

if [[ -z "$RUN_ID" || -z "$OUTPUT_DIR" ]]; then
  echo "--run-id and --output-dir are required" >&2
  exit 2
fi

mkdir -p "$OUTPUT_DIR"

CERT_PATH="$OUTPUT_DIR/capability-certificate.json"
BIND_PATH="$OUTPUT_DIR/manifest.bindings.json"
TOOL_PROBE_PATH="$OUTPUT_DIR/toolchain-probe.json"
RECEIPT_GATE_PATH="$OUTPUT_DIR/receipt-gate.json"

if [[ "$MODE" == "preflight" || "$MODE" == "full" ]]; then
  CODEX_EXEC="no"
  SCREENSHOT_CMD="no"
  PLAYWRIGHT_RUNTIME="no"

  if command -v codex >/dev/null 2>&1; then
    CODEX_EXEC="yes"
  fi

  if command -v screencapture >/dev/null 2>&1; then
    SCREENSHOT_CMD="yes"
  fi

  shopt -s nullglob
  chromium_dirs=("$HOME/Library/Caches/ms-playwright/chromium-"*)
  shopt -u nullglob
  if (( ${#chromium_dirs[@]} > 0 )); then
    PLAYWRIGHT_RUNTIME="yes"
  fi

  cat > "$TOOL_PROBE_PATH" <<JSON
{
  "codexExec": "$CODEX_EXEC",
  "screenshotCmd": "$SCREENSHOT_CMD",
  "playwrightRuntime": "$PLAYWRIGHT_RUNTIME"
}
JSON
fi

if [[ "$MODE" == "gate" || "$MODE" == "full" ]]; then
  if [[ -z "$RECEIPTS_PATH" || -z "$TASK_ID" ]]; then
    echo "gate/full mode requires --receipts and --task-id" >&2
    exit 2
  fi

  RECEIPTS_PATH="$RECEIPTS_PATH" \
  TASK_ID="$TASK_ID" \
  REQUIRE_ORACLE="$REQUIRE_ORACLE" \
  REQUIRE_TRUST="$REQUIRE_TRUST" \
  node --input-type=module <<'NODE' > "$RECEIPT_GATE_PATH"
import fs from "node:fs";

const receiptsPath = process.env.RECEIPTS_PATH;
const taskId = process.env.TASK_ID;
const requireOracle = process.env.REQUIRE_ORACLE === "yes";
const requireTrust = process.env.REQUIRE_TRUST === "yes";

const requiredBase = [
  "EXECUTOR_COMPLETED",
  "UX_SIMULATED",
  "VERIFIER_SPEC",
  "VERIFIER_QUALITY"
];
const requiredOrder = [...requiredBase];
if (requireOracle) {
  requiredOrder.push("ORACLE_REVIEWED");
}
if (requireTrust) {
  requiredOrder.push("TRUST_CONFIRMED");
}

const rows = [];
const parseErrors = [];
if (!fs.existsSync(receiptsPath)) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        requiresOracleReviewed: requireOracle,
        requiresTrustConfirmed: requireTrust,
        checkedReceiptsPath: receiptsPath,
        requiredOrder,
        presentTypes: [],
        missingTypes: requiredOrder,
        orderErrors: [],
        schemaErrors: ["receipts_path_missing"]
      },
      null,
      2
    )
  );
  process.exit(0);
}

const lines = fs
  .readFileSync(receiptsPath, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  try {
    const parsed = JSON.parse(line);
    rows.push({ idx: i, parsed });
  } catch {
    parseErrors.push(`invalid_json_line_${i + 1}`);
  }
}

const byType = new Map();
for (const row of rows) {
  const receipt = row.parsed?.receipt;
  if (!receipt || typeof receipt !== "object") {
    continue;
  }
  const type = typeof receipt.type === "string" ? receipt.type : "";
  const rowTaskId = typeof receipt.taskId === "string" ? receipt.taskId : "";
  if (!type || rowTaskId !== taskId) {
    continue;
  }
  const list = byType.get(type) ?? [];
  list.push({ idx: row.idx, receipt });
  byType.set(type, list);
}

const presentTypes = [...byType.keys()].sort();
const missingTypes = [];
const schemaErrors = [...parseErrors];
const firstIndexByType = new Map();

const hasStringArray = (value) =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.length > 0);

const isPacketValid = (type, receipt) => {
  const packet = receipt?.packet;
  if (!packet || typeof packet !== "object") {
    return false;
  }
  if (packet.taskId !== taskId || packet.passed !== true) {
    return false;
  }

  if (type === "UX_SIMULATED") {
    return hasStringArray(packet.journey_checks);
  }
  if (type === "ORACLE_REVIEWED") {
    return hasStringArray(packet.findings);
  }
  if (type === "TRUST_CONFIRMED") {
    return (
      typeof packet.trustScope === "string" &&
      packet.trustScope.trim().length > 0 &&
      typeof packet.confirmation === "string" &&
      packet.confirmation.trim().length > 0
    );
  }
  return true;
};

for (const type of requiredOrder) {
  const entries = byType.get(type) ?? [];
  if (entries.length === 0) {
    missingTypes.push(type);
    continue;
  }

  const sorted = [...entries].sort((a, b) => a.idx - b.idx);
  firstIndexByType.set(type, sorted[0].idx);

  const hasValidPacket = sorted.some((entry) => isPacketValid(type, entry.receipt));
  if (!hasValidPacket) {
    schemaErrors.push(`${type.toLowerCase()}_packet_invalid`);
  }
}

const orderErrors = [];
let previous = -1;
for (const type of requiredOrder) {
  const idx = firstIndexByType.get(type);
  if (idx === undefined) {
    continue;
  }
  if (idx < previous) {
    orderErrors.push(`order_violation_${type.toLowerCase()}`);
  }
  previous = Math.max(previous, idx);
}

const ok = missingTypes.length === 0 && schemaErrors.length === 0 && orderErrors.length === 0;

console.log(
  JSON.stringify(
    {
      ok,
      requiresOracleReviewed: requireOracle,
      requiresTrustConfirmed: requireTrust,
      checkedReceiptsPath: receiptsPath,
      requiredOrder,
      presentTypes,
      missingTypes,
      orderErrors,
      schemaErrors
    },
    null,
    2
  )
);
NODE
fi

MODE="$MODE" \
RUN_ID="$RUN_ID" \
TIMEOUT_SEC="$TIMEOUT_SEC" \
MAX_LOG_BYTES="$MAX_LOG_BYTES" \
CERT_PATH="$CERT_PATH" \
BIND_PATH="$BIND_PATH" \
TOOL_PROBE_PATH="$TOOL_PROBE_PATH" \
RECEIPT_GATE_PATH="$RECEIPT_GATE_PATH" \
MANIFEST_PATH="$MANIFEST_PATH" \
BIND_MANIFEST="$BIND_MANIFEST" \
CERTIFIER_SECRET="$CERTIFIER_SECRET" \
node --input-type=module <<'NODE'
import { createHash } from "node:crypto";
import fs from "node:fs";

const mode = process.env.MODE;
const certPath = process.env.CERT_PATH;
const bindPath = process.env.BIND_PATH;
const probePath = process.env.TOOL_PROBE_PATH;
const gatePath = process.env.RECEIPT_GATE_PATH;
const manifestPath = process.env.MANIFEST_PATH;
const bindManifest = process.env.BIND_MANIFEST === "1";
const secret = process.env.CERTIFIER_SECRET;

const readJsonIfExists = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const sha256Hex = (value) => createHash("sha256").update(value, "utf8").digest("hex");
const sha256FileHex = (filePath) => {
  const data = fs.readFileSync(filePath);
  return createHash("sha256").update(data).digest("hex");
};

const probe =
  readJsonIfExists(probePath) ??
  {
    codexExec: "skipped",
    screenshotCmd: "skipped",
    playwrightRuntime: "skipped"
  };

const receiptGate =
  readJsonIfExists(gatePath) ??
  {
    ok: true,
    requiresOracleReviewed: false,
    requiresTrustConfirmed: false,
    checkedReceiptsPath: null,
    requiredOrder: [],
    presentTypes: [],
    missingTypes: [],
    orderErrors: [],
    schemaErrors: []
  };

const toolchainOk =
  mode === "gate" ||
  (probe.codexExec === "yes" && probe.screenshotCmd === "yes" && probe.playwrightRuntime === "yes");

const gateOk = mode === "preflight" || receiptGate.ok === true;

const reasons = [];
if (!toolchainOk) {
  reasons.push("toolchain_capability_not_certified");
}
if (!gateOk) {
  reasons.push("receipt_gate_not_satisfied");
}

const payload = {
  schemaVersion: "arbiter.capability.v1",
  generatedAt: new Date().toISOString(),
  runId: process.env.RUN_ID,
  mode,
  budgets: {
    timeoutSec: Number.parseInt(process.env.TIMEOUT_SEC ?? "180", 10),
    maxLogBytes: Number.parseInt(process.env.MAX_LOG_BYTES ?? "1048576", 10)
  },
  toolchain: {
    codexExec: probe.codexExec,
    screenshotCmd: probe.screenshotCmd,
    playwrightRuntime: probe.playwrightRuntime,
    ok: toolchainOk
  },
  receiptGate,
  certified: toolchainOk && gateOk,
  reasons
};

if (bindManifest && manifestPath && fs.existsSync(manifestPath)) {
  payload.manifestBinding = {
    manifestPath,
    manifestSha256: sha256FileHex(manifestPath),
    boundAt: new Date().toISOString()
  };
}

const signature = sha256Hex(`${secret}:${JSON.stringify(payload)}`);
const certificate = { ...payload, signature };

const certSerialized = `${JSON.stringify(certificate, null, 2)}\n`;
fs.writeFileSync(certPath, certSerialized, "utf8");

if (bindManifest && manifestPath && fs.existsSync(manifestPath)) {
  const bindings = {
    schemaVersion: "arbiter.manifest.binding.v1",
    runId: process.env.RUN_ID,
    boundAt: new Date().toISOString(),
    manifestPath,
    manifestSha256: sha256FileHex(manifestPath),
    capabilityCertificatePath: certPath,
    capabilityCertificateSha256: sha256FileHex(certPath)
  };
  fs.writeFileSync(bindPath, `${JSON.stringify(bindings, null, 2)}\n`, "utf8");
}
NODE

CERTIFIED="$(CERT_PATH="$CERT_PATH" node --input-type=module <<'NODE'
import fs from "node:fs";
const cert = JSON.parse(fs.readFileSync(process.env.CERT_PATH, "utf8"));
process.stdout.write(cert.certified === true ? "yes" : "no");
NODE
)"

if [[ "$CERTIFIED" == "yes" ]]; then
  echo "CERTIFIER_RESULT=certified"
  echo "CERT_PATH=$CERT_PATH"
  if [[ "$BIND_MANIFEST" -eq 1 ]]; then
    echo "BIND_PATH=$BIND_PATH"
  fi
  exit 0
fi

echo "CERTIFIER_RESULT=blocked"
echo "CERT_PATH=$CERT_PATH"
if [[ "$BIND_MANIFEST" -eq 1 ]]; then
  echo "BIND_PATH=$BIND_PATH"
fi
exit 1
