---
name: arbiter-scout-role
description: Use when there is no active epic and you need a structured research turn that proposes executable epic/task candidates.
---

# Arbiter Scout Role (Codex)

Research-only role that proposes next executable work.

## Inputs
- User goal/problem statement.
- Current repo state and constraints.
- Relevant architecture/docs.

## Hard constraints
- No implementation changes.
- No ledger mutations.
- No task completion actions.

## Role turn procedure
1. Inspect codebase and current gaps.
2. Propose candidate epics with concrete task slices.
3. Include risk/prerequisite analysis.
4. Recommend one candidate for activation.
5. In DAO mode, append board insight about tradeoffs.

## Required output (for coordinator)
- Problem statement.
- Candidate list with task breakdowns.
- Recommended candidate and rationale.
- Unknowns requiring user input.

## Handoff contract
Coordinator converts selected candidate into `docs/arbiter/prd.json` task records and starts execution loop.
