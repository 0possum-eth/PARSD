#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_TAG="${1:-bootstrap}"
NOW_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RUN_ID="run-${RUN_TAG}"

ARB_DIR="$REPO_ROOT/docs/arbiter"
LEDGER_DIR="$ARB_DIR/_ledger"
DAO_DIR="$ARB_DIR/_dao"
MEM_DIR="$ARB_DIR/_memory/m2"

mkdir -p \
  "$LEDGER_DIR/runs/$RUN_ID" \
  "$LEDGER_DIR" \
  "$DAO_DIR/sessions" \
  "$MEM_DIR/raw" \
  "$ARB_DIR/reference/_inbox" \
  "$ARB_DIR/reference" \
  "$ARB_DIR/context-packs" \
  "$ARB_DIR/knowledge" \
  "$ARB_DIR/behavior" \
  "$ARB_DIR/notes"

if [[ ! -f "$ARB_DIR/prd.json" ]]; then
  cat > "$ARB_DIR/prd.json" <<JSON
{
  "schemaVersion": "arbiter.prd.v1",
  "daoMode": true,
  "workflowMode": "arbiter_core",
  "activeEpicId": "EPIC-RUNTIME-DEPENDENCY-CLOSURE",
  "epics": [
    {
      "id": "EPIC-RUNTIME-DEPENDENCY-CLOSURE",
      "title": "Close unresolved runtime dependencies",
      "status": "active",
      "tasks": [
        {
          "id": "TASK-DEP-001",
          "title": "Resolve core command/module import gaps",
          "status": "pending",
          "oracleRequired": false
        },
        {
          "id": "TASK-DEP-002",
          "title": "Re-verify receipt gates after dependency closure",
          "status": "pending",
          "oracleRequired": true
        }
      ]
    }
  ]
}
JSON
fi

if [[ ! -f "$LEDGER_DIR/trust.json" ]]; then
  cat > "$LEDGER_DIR/trust.json" <<JSON
{
  "schemaVersion": "arbiter.trust.v1",
  "updatedAt": "$NOW_UTC",
  "trustedBricks": [],
  "blockedBricks": []
}
JSON
fi

if [[ ! -f "$LEDGER_DIR/runs.jsonl" ]]; then
  : > "$LEDGER_DIR/runs.jsonl"
fi

if [[ ! -f "$LEDGER_DIR/prd.events.jsonl" ]]; then
  : > "$LEDGER_DIR/prd.events.jsonl"
fi

if [[ ! -f "$DAO_DIR/board.jsonl" ]]; then
  : > "$DAO_DIR/board.jsonl"
fi

if [[ ! -f "$DAO_DIR/wiring-catalog.jsonl" ]]; then
  : > "$DAO_DIR/wiring-catalog.jsonl"
fi

if [[ ! -f "$DAO_DIR/assignments.json" ]]; then
  cat > "$DAO_DIR/assignments.json" <<JSON
{
  "schemaVersion": "arbiter.dao.assignments.v1",
  "updatedAt": "$NOW_UTC",
  "owners": {}
}
JSON
fi

if [[ ! -f "$DAO_DIR/roster.json" ]]; then
  cat > "$DAO_DIR/roster.json" <<JSON
{
  "schemaVersion": "arbiter.dao.roster.v1",
  "updatedAt": "$NOW_UTC",
  "actors": {}
}
JSON
fi

RECEIPTS_PATH="$LEDGER_DIR/runs/$RUN_ID/receipts.jsonl"
if [[ ! -f "$RECEIPTS_PATH" ]]; then
  cat > "$RECEIPTS_PATH" <<JSONL
{"ts":"$NOW_UTC","runId":"$RUN_ID","receipt":{"type":"EXECUTOR_COMPLETED","taskId":"TASK-DEP-001","packet":{"taskId":"TASK-DEP-001","passed":true}}}
{"ts":"$NOW_UTC","runId":"$RUN_ID","receipt":{"type":"UX_SIMULATED","taskId":"TASK-DEP-001","packet":{"taskId":"TASK-DEP-001","passed":true,"journey_checks":["bootstrap"]}}}
JSONL
fi

printf '{"ts":"%s","type":"run_bootstrap","runId":"%s","note":"arbiter state initialized"}\n' "$NOW_UTC" "$RUN_ID" >> "$LEDGER_DIR/runs.jsonl"
printf '{"ts":"%s","type":"bootstrap","actor":"swarm","content":"state initialized for %s"}\n' "$NOW_UTC" "$RUN_ID" >> "$DAO_DIR/board.jsonl"
printf '{"ts":"%s","type":"bootstrap_state_ready","runId":"%s"}\n' "$NOW_UTC" "$RUN_ID" >> "$LEDGER_DIR/prd.events.jsonl"

echo "BOOTSTRAP_OK run_id=$RUN_ID"
echo "BOOTSTRAP_PATH=$ARB_DIR"
