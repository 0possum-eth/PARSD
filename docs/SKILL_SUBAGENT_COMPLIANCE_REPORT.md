# Skill Subagent Compliance Report

Generated: 2026-02-14T03:35:58.041Z

## Scope

- Corpus: `skills/` in this repository
- Deep test set: Arbiter subagent role files + procedural operator files
- Method: deterministic compliance harness (instruction-coverage + integration consistency checks)

## Summary

- Structural skill quality (comprehensibility/completeness proxy): **9/33** files scored >= 5/7
- Subagent role compliance checks: **10/10** roles passed all required checks
- Integration consistency checks: **3/3** passed
- Skill frontmatter validity: **33/33** SKILL files valid (`name` + `description`)
- Root vs plugin skill parity: **PASS** (only `.DS_Store` differs)

## Subagent Role Results

| Role | File | Checks Passed | Result |
|---|---|---:|---|
| arbiter-coordinator | `skills/arbiter-coordinator/SKILL.md` | 7/7 | PASS |
| executor | `skills/arbiter-executor-role/SKILL.md` | 5/5 | PASS |
| ux | `skills/arbiter-ux-role/SKILL.md` | 5/5 | PASS |
| verifier-spec | `skills/arbiter-verifier-spec-role/SKILL.md` | 5/5 | PASS |
| verifier-quality | `skills/arbiter-verifier-quality-role/SKILL.md` | 5/5 | PASS |
| oracle | `skills/arbiter-oracle-role/SKILL.md` | 5/5 | PASS |
| electrician | `skills/arbiter-electrician-role/SKILL.md` | 5/5 | PASS |
| scout | `skills/arbiter-scout-role/SKILL.md` | 5/5 | PASS |
| librarian | `skills/arbiter-ledger-ops/librarian-role.md` | 5/5 | PASS |
| ledger-keeper | `skills/arbiter-ledger-ops/ledger-keeper-role.md` | 5/5 | PASS |

## Integration Consistency

| Check | Result |
|---|---|
| run-loop-receipt-order | PASS |
| ledger-rules-contains-ux-mandatory | PASS |
| coordinator-epic-gate-electrician | PASS |

## Packaging Consistency

| Check | Result |
|---|---|
| `skills/` vs `claude-code-plugin/skills/` content parity | PASS (non-functional `.DS_Store` difference only) |
| SKILL frontmatter (`name`, `description`) | PASS (33/33 valid) |

## Lowest Structural Scores (Needs Review First)

| File | Score (0-7) | Frontmatter | Inputs | Procedure | Outputs | Constraints |
|---|---:|---|---|---|---|---|
| `skills/arbiter-ledger-rules/SKILL.md` | 2 | Y | N | N | N | N |
| `skills/arbiter-dao-mode/SKILL.md` | 3 | Y | N | N | N | N |
| `skills/brainstorming/SKILL.md` | 3 | Y | N | N | N | N |
| `skills/executing-plans/SKILL.md` | 3 | Y | N | N | N | N |
| `skills/finishing-a-development-branch/SKILL.md` | 3 | Y | N | N | N | N |
| `skills/requesting-code-review/SKILL.md` | 3 | Y | N | N | N | N |
| `skills/screenshot/SKILL.md` | 3 | Y | N | N | N | N |
| `skills/subagent-driven-development/SKILL.md` | 3 | Y | N | N | N | N |
| `skills/systematic-debugging/SKILL.md` | 3 | Y | N | N | N | N |
| `skills/test-driven-development/SKILL.md` | 3 | Y | N | N | N | N |
| `skills/using-arbiter-os/SKILL.md` | 3 | Y | N | N | N | N |
| `skills/using-git-worktrees/SKILL.md` | 3 | Y | N | N | N | N |

## Confidence & Limitations

- Confidence: **moderate** for instruction completeness/comprehensibility and policy-level compliance prediction.
- Limitation: this harness does not execute live LLM subagents; it validates whether subagents are likely to comply based on explicit instruction coverage and cross-skill consistency.
- Next step for high confidence: run live pressure scenarios (RED/GREEN/REFACTOR) with fresh subagent sessions per `skills/writing-skills/testing-skills-with-subagents.md`.

## Live Pressure Follow-Up

- Completed on 2026-02-14 with fresh ephemeral subagent sessions.
- Report: `docs/SKILL_SUBAGENT_LIVE_PRESSURE_REPORT.md`
- Artifacts: `docs/live-pressure/2026-02-14-subagent-driven-development/`
