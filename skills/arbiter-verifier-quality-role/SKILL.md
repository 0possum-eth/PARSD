---
name: arbiter-verifier-quality-role
description: Use when running the quality verifier role turn after spec pass to validate technical quality, test quality, and risk posture.
---

# Arbiter Verifier-Quality Role (Codex)

Reviews build quality after spec compliance is established.

## Inputs
- Task id.
- Changed files and test evidence.
- Spec verifier pass context.

## Hard constraints
- Read-only review role.
- Do not edit code.
- Do not mark task done.
- Do not write ledger files.

## Role turn procedure
1. Review code quality and maintainability.
2. Review test quality and regression confidence.
3. Review security/performance/operational risks.
4. Return pass/fail with severity.
5. Append board insight in DAO mode when cross-task relevant.

## Required output (for coordinator)
- Quality verdict.
- Critical/important/minor findings.
- Required rework if not passing.

## Receipt mapping
Coordinator emits:
- `VERIFIER_QUALITY`

Packet shape:
- `{ taskId, passed }`
