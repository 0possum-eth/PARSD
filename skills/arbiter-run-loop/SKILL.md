---
name: arbiter-run-loop
description: Use when executing the Arbiter loop in Codex and you need an exact step order with DAO and receipt gates.
---
# Arbiter Run Loop (Codex)

## Preflight
- Read `../using-arbiter-os/codex-core-memory.md`.
- Read `../using-arbiter-os/resonant-loop-integration.md`.
- Confirm current state in `docs/arbiter/prd.json`.

## Execution sequence
1. INSPECT
- Determine `NO_ACTIVE_EPIC`, `ACTIVE_EPIC`, or `NO_MORE_WORK`.

2. PLAN (only if no active epic)
- Brainstorm + plan or scout path.
- Activate epic in `prd.json`.

3. TASK LOOP (ACTIVE_EPIC)
- Executor turn -> `EXECUTOR_COMPLETED`
- UX turn (mandatory) -> `UX_SIMULATED` + wiring catalog update
- Spec verifier turn -> `VERIFIER_SPEC`
- Quality verifier turn -> `VERIFIER_QUALITY`
- Oracle turn (only if flagged) -> `ORACLE_REVIEWED`
- Ledger keeper verifies receipts then appends task_done event

4. EPIC BOUNDARY
- Electrician turn (mandatory) -> `INTEGRATION_CHECKED`
- Archive `docs/arbiter/_dao/wiring-catalog.jsonl` to `wiring-catalog-<epicId>.jsonl`
- Advance/clear active epic

5. FINALIZE
- Emit `RUN_FINALIZED` only after gates are satisfied.

## Resonant enforcement (all stages)
- M5 Shield before each turn.
- M1 SSoT inject + dedupe for current stage.
- M2 raw->compressed rotation with hash retrieval on ambiguity.
- M3 deterministic output schema gate.
- M4 watchdog timeout/loop recovery.
