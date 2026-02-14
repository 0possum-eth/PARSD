# Codex Core Memory Map (Arbiter OS)

Use this file at the start of every Arbiter run in Codex.

## Canonical workflow pattern
- Arbiter is the single coordinator.
- In Codex, "subagents" are executed as role turns (executor/ux/spec/quality/electrician/oracle), not as hidden runtime primitives.
- Ledger files are source of truth, not chat history.

## Required receipt order per task
1. EXECUTOR_COMPLETED
2. UX_SIMULATED
3. VERIFIER_SPEC
4. VERIFIER_QUALITY
5. ORACLE_REVIEWED (only if task requires oracle)

## Required epic gate
- INTEGRATION_CHECKED must exist before declaring epic complete.

## Key files (must know)
- docs/arbiter/prd.json
- docs/arbiter/_ledger/prd.events.jsonl
- docs/arbiter/_ledger/runs.jsonl
- docs/arbiter/_ledger/runs/<runId>/receipts.jsonl
- docs/arbiter/_ledger/trust.json
- docs/arbiter/_dao/roster.json
- docs/arbiter/_dao/board.jsonl
- docs/arbiter/_dao/assignments.json
- docs/arbiter/_dao/wiring-catalog.jsonl
- docs/arbiter/_dao/wiring-catalog-<epicId>.jsonl
- arbiter/execute/taskRunner.ts
- arbiter/resonant/shield.ts
- arbiter/resonant/logician.ts
- arbiter/resonant/watchdog.ts
- arbiter/supervisor/superviseRunEpic.ts
- arbiter/supervisor/worker.ts
- .opencode/plugins/arbiter-os.js

## Command surface
- run-epic
- run-epic-supervised
- arbiter-status
- workflow-mode
- approve-brick
- mount-doc
- list-bricks

## Codex execution rule
For each role turn, write artifacts to files first (receipts/board/catalog/ledger), then summarize in chat.
