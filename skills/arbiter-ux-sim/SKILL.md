---
name: arbiter-ux-sim
description: Use when performing the mandatory UX turn for a task to produce journey checks and wiring catalog entries before verification.
---

# Arbiter UX Simulation (Codex)

Mandatory per-task checklist used during the UX role turn.

## Required inputs
- Task id and user-facing scope.
- Executor changed files.
- `docs/arbiter/prd.json` (task + epic context).
- `docs/arbiter/_dao/wiring-catalog.jsonl`.
- `docs/arbiter/_dao/board.jsonl` (if DAO mode).

## Journey checks (required)
1. Entry/discoverability.
2. Happy path.
3. Empty states.
4. Error states.
5. Loading states.
6. Edge cases.
7. Navigation continuity.
8. Copy/labels clarity.
9. Accessibility basics.
10. Responsive behavior.

## Wiring audit (required)
1. Import wiring.
2. Instantiation wiring.
3. Init order.
4. IPC/event registration.
5. Cross-module dependencies.
6. Security pattern consistency.
7. Config/settings linkage.

## DAO file outputs
Append to `docs/arbiter/_dao/wiring-catalog.jsonl`:
- `wiring-task` when issues are found.
- `wiring-clean` when no issues are found.

In DAO mode, append concise UX insight to `docs/arbiter/_dao/board.jsonl`.

## Receipt handoff
Coordinator emits `UX_SIMULATED` after this turn.

Packet shape (strict):
- `{ taskId, passed, journey_checks }`

Keep wiring metadata in DAO files, not in receipt packet extra keys.
