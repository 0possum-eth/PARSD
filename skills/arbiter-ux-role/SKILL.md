---
name: arbiter-ux-role
description: Use when running the UX role turn for every task to simulate journey outcomes and catalog wiring work.
---

# Arbiter UX Role (Codex)

Mandatory for every task, immediately after executor output.

## Inputs
- Task id and user-facing behavior.
- Executor changed files.
- `docs/arbiter/prd.json` and active epic context.
- `docs/arbiter/_dao/wiring-catalog.jsonl`.
- `docs/arbiter/_dao/board.jsonl` if DAO mode is on.

## Hard constraints
- Do not write ledger files.
- Do not mark task/epic done.
- Always perform UX simulation, not just wiring checks.

## Role turn procedure
1. Simulate entry, happy path, empty/error/loading states.
2. Audit wiring (imports, init order, registrations, dependencies).
3. Append wiring entries to `wiring-catalog.jsonl`.
4. Append concise board insight in DAO mode.
5. Return verdict and journey checks.

## Wiring catalog entries
- `wiring-task`
- `wiring-clean`

## Required output (for coordinator)
- Journey checks list.
- UX verdict: pass/concern/fail.
- Wiring entries added.

## Receipt mapping
Coordinator emits:
- `UX_SIMULATED`

Packet shape (strict):
- `{ taskId, passed, journey_checks }`

Do not put wiring metadata in this packet; keep it in DAO files.
