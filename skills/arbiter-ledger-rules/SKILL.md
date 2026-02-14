---
name: arbiter-ledger-rules
description: Ledger-first state and evidence requirements
---
# Arbiter Ledger Rules

- Ledger is append-only JSONL — never edit or delete entries
- Views are derived and regenerable from the ledger
- Only the Ledger Keeper (coordinator) writes task_done events
- Per-task receipt gate (ALL mandatory, no exceptions):
  - EXECUTOR_COMPLETED — executor evidence
  - UX_SIMULATED — journey simulation + wiring catalog update
  - VERIFIER_SPEC — spec compliance verified
  - VERIFIER_QUALITY — code quality verified
- Temporal ordering: EXECUTOR → UX → SPEC → QUALITY
- Per-epic gate (mandatory at phase/epic end):
  - INTEGRATION_CHECKED — electrician batch-fixes all wiring from catalog
- Optional per-task (flag-gated):
  - ORACLE_REVIEWED — if `requiresOracleReview: true`
- Never edit ledger or views outside the keeper
- Never mark a task done without ALL required receipts verified
