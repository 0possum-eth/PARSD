---
name: arbiter-dao-mode
description: Use when daoMode is enabled and Arbiter role turns must coordinate through roster, board, assignments, and wiring catalogs.
---

# Arbiter DAO Mode (Codex)

DAO mode is a file-backed coordination protocol for role turns.

## Activation
Set `"daoMode": true` in `docs/arbiter/prd.json`.

## Files to maintain
- `docs/arbiter/_dao/roster.json`
- `docs/arbiter/_dao/board.jsonl`
- `docs/arbiter/_dao/assignments.json`
- `docs/arbiter/_dao/wiring-catalog.jsonl`

## Codex operation
- Before each role turn:
  - register/update actor in roster
  - assign owned files in assignments
  - prepare recent board context
- After each role turn:
  - append board insights/requests
  - release/update assignments
  - set role status in roster

## Board message schema (jsonl)
{"ts":"ISO","from":"username","type":"insight|vote|question|answer|request_respawn|request_overtime|handoff","to":"all|username|arbiter","content":"text","taskRef":"TASK-ID"}

## Wiring catalog schema (jsonl)
- `wiring-task`: discovered by UX turn
- `wiring-clean`: UX found no wiring issues
- `wiring-completed`: electrician fixed a listed task
- `sweep-completed`: electrician cross-phase summary

## Archive rules
- If board grows beyond 50 lines: archive old lines to `docs/arbiter/_dao/sessions/board-<ts>.jsonl`, keep last 20 active.
- On epic completion: archive wiring catalog to `wiring-catalog-<epicId>.jsonl` and start fresh.
