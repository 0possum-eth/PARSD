---
name: using-arbiter-os
description: Use when running Arbiter OS in Codex to coordinate role-based execution with ledger and DAO artifacts as the source of truth.
---
# Using Arbiter OS (Codex)

Arbiter OS in Codex is skills-first orchestration with ledger-gated completion.

## Start Sequence (mandatory)
1. Open `codex-core-memory.md` in this skill directory.
2. Open `resonant-loop-integration.md` in this skill directory.
3. Open `resonant-codex-feasibility.md` in this skill directory.
4. Inspect `docs/arbiter/prd.json`.
5. Inspect latest `docs/arbiter/_ledger/runs/<runId>/receipts.jsonl` if available.
6. Choose workflow profile via `workflow-mode` context.
7. Run `arbiter-coordinator` loop.

## Codex execution model
- Codex runs one active agent per thread.
- Treat each "subagent" as a **role turn** with explicit role context:
  - executor
  - ux coordinator
  - verifier-spec
  - verifier-quality
  - electrician
  - oracle (flag-gated)
- Every role turn must produce file-based evidence before completion claims.

## Resonant Overlay (required)
- Module 1 SSoT injection before role turns.
- Module 2 raw/compressed context split with hash rehydration.
- Module 3 deterministic output gate before user-visible output.
- Module 4 watchdog restart + reload on stalls/timeouts.
- Module 5 paranoia-mode verification for all external inputs.

## Coverage map
Use `resonant-skill-coverage.md` to apply Resonant modules across all installed skills only where appropriate.

## Core guarantees
- Never mark task done without required receipts.
- Never mark epic complete without `INTEGRATION_CHECKED`.
- DAO mode (`prd.json: daoMode=true`) requires updating:
  - `docs/arbiter/_dao/roster.json`
  - `docs/arbiter/_dao/board.jsonl`
  - `docs/arbiter/_dao/assignments.json`
  - `docs/arbiter/_dao/wiring-catalog.jsonl`

## Skills to invoke
- `arbiter-coordinator`
- `arbiter-run-loop`
- `arbiter-ledger-ops`
- `arbiter-dao-mode` (when `daoMode=true`)
