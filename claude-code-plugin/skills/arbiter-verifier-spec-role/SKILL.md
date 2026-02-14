---
name: arbiter-verifier-spec-role
description: Use when running the spec verifier role turn to confirm implementation matches task requirements before quality review.
---

# Arbiter Verifier-Spec Role (Codex)

Validates requirement compliance from code and tests.

## Inputs
- Task id and requirement text.
- Executor report and changed files.
- UX verdict context.

## Hard constraints
- Read-only review role.
- Do not edit code.
- Do not mark task done.
- Do not write ledger files.

## Role turn procedure
1. Compare requirements vs actual code/test behavior.
2. Identify missing, incorrect, or extra behavior.
3. Return pass/fail with concrete references.
4. Optionally append board insight in DAO mode.

## Required output (for coordinator)
- Spec verdict.
- Findings with file references.
- Rework instructions if failing.

## Receipt mapping
Coordinator emits:
- `VERIFIER_SPEC`

Packet shape:
- `{ taskId, passed }`
