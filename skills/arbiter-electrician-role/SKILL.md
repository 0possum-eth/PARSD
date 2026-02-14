---
name: arbiter-electrician-role
description: Use when running the electrician role turn at epic end to resolve wiring catalog items and confirm cross-task integration health.
---

# Arbiter Electrician Role (Codex)

Runs at epic boundary, not per task.

## Inputs
- Active epic id.
- Full `docs/arbiter/_dao/wiring-catalog.jsonl`.
- Changed files across the epic.
- Entry-point and integration surfaces.

## Hard constraints
- Can edit runtime code for integration fixes.
- Do not mark epic done.
- Do not write ledger files directly.

## Role turn procedure
1. Read entire wiring catalog.
2. Apply required integration fixes.
3. Run syntax/tests for touched areas.
4. Append `wiring-completed` and `sweep-completed` entries.
5. Return integration verdict and file list.

## Required output (for coordinator)
- Resolved catalog items.
- Cross-phase sweep results.
- Files edited and verification commands.
- Remaining blockers (if any).

## Receipt mapping
Coordinator emits:
- `INTEGRATION_CHECKED`

Packet shape (strict):
- `{ taskId, passed }`

Wiring details stay in DAO catalog entries.
