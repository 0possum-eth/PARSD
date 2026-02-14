---
name: arbiter-executor-role
description: Use when running the executor role turn to implement one Arbiter task and return structured execution evidence.
---

# Arbiter Executor Role (Codex)

Implements a single task and returns evidence. Never closes the task.

## Inputs
- Task id and requirement text.
- Current relevant files.
- Prior DAO board context (if `daoMode=true`).

## Hard constraints
- Do not write `docs/arbiter/_ledger/*`.
- Do not mark tasks done in `docs/arbiter/prd.json`.
- Follow TDD for behavior changes.
- Report evidence from actual command runs.

## Role turn procedure
1. Restate task scope and acceptance criteria.
2. Implement in minimal increments.
3. Run tests/checks.
4. Produce evidence packet inputs.
5. If DAO mode is on, append board insight.

## Required output (for coordinator)
- Implementation summary.
- Commands run with exit codes.
- Test files executed.
- Files changed.
- Risks/blockers.

## Receipt mapping
Coordinator emits:
- `EXECUTOR_COMPLETED`

Packet shape:
- `packet.taskId`
- `packet.execution[]` with `{ command, exitCode: 0, outputSummary, outputDigest }`
- optional `packet.tests[]`
- optional `packet.files_changed[]`
