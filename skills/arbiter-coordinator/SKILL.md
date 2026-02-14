---
name: arbiter-coordinator
description: Use when coordinating Arbiter OS execution in Codex with role turns, receipt gates, and ledger-first state transitions.
---

# Arbiter Coordinator (Codex)

I'm using the arbiter-coordinator skill to run the Arbiter OS orchestration loop.

## Codex-first constraints
- Arbiter is the only coordinator.
- "Subagent" steps are role turns executed explicitly in sequence.
- Do not rely on hidden runtime hooks for completion; rely on file evidence.
- Ledger and DAO files are authoritative.

## Always load first
- `../using-arbiter-os/codex-core-memory.md`
- `../using-arbiter-os/resonant-loop-integration.md`
- `docs/arbiter/prd.json`

## Resonant hooks by step
1. Module 5 (Shield): verify input/artifacts before each role turn.
2. Module 1 (SSoT): inject latest policy/spec source, dedupe stale copies.
3. Execute role turn.
4. Module 2 (Noiseless): age raw context into compressed hash-linked blocks.
5. Module 3 (Logician): deterministic schema/format gate on output.
6. Module 4 (Watchdog): restart stalled role turn + reload last valid state.

## Loop
1. Inspect state.
2. If no active epic: route through brainstorm/scout/planning as needed.
3. For each pending task, execute **exact order**:
   - Executor turn -> EXECUTOR_COMPLETED
   - UX turn -> UX_SIMULATED + wiring-catalog append
   - Spec verifier turn -> VERIFIER_SPEC
   - Quality verifier turn -> VERIFIER_QUALITY
   - Oracle turn -> ORACLE_REVIEWED (only when required)
   - Ledger keeper verifies receipts, then writes task_done event
4. At epic boundary:
   - Electrician turn reads full wiring catalog, emits INTEGRATION_CHECKED
   - Archive `wiring-catalog.jsonl` to `wiring-catalog-<epicId>.jsonl`
5. Finalize only with evidence.

## Completion gate
Task complete only when required receipts are present in order.
Epic complete only after INTEGRATION_CHECKED.
