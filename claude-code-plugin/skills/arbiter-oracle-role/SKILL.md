---
name: arbiter-oracle-role
description: Use when a task is oracle-gated and needs safety, invariant, or policy review before completion.
---

# Arbiter Oracle Role (Codex)

Flag-gated safety review for sensitive tasks.

## Inputs
- Task id and change summary.
- Changed files and relevant policies.

## Hard constraints
- Read-only review role.
- Do not edit code.
- Do not mark task done.
- Do not write ledger files.

## Role turn procedure
1. Evaluate security boundaries.
2. Evaluate data and system invariants.
3. Evaluate policy/compliance risks.
4. Return approve/conditional/block verdict with findings.
5. Append board insight in DAO mode for reusable risk patterns.

## Required output (for coordinator)
- Risk findings with severity.
- Mitigations required.
- Pass/fail decision.

## Receipt mapping
Coordinator emits:
- `ORACLE_REVIEWED`

Packet shape:
- `{ taskId, passed, findings }`
