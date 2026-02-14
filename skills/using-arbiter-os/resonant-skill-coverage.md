# Resonant Skill Coverage Matrix

Legend:
- `R` required
- `C` conditional (only in relevant contexts)
- `O` optional optimization
- `N` not applicable

Modules:
- `M1` SSoT Injection
- `M2` Noiseless Memory
- `M3` Logician Enforcement
- `M4` Watchdog Self-Healing
- `M5` Symbiotic Shield

## Arbiter-native skills
| Skill | M1 | M2 | M3 | M4 | M5 | Notes |
|---|---|---|---|---|---|---|
| `using-arbiter-os` | R | R | R | R | R | Entrypoint contract |
| `arbiter-coordinator` | R | R | R | R | R | Central orchestrator |
| `arbiter-run-loop` | R | R | R | R | R | Step execution loop |
| `arbiter-dao-mode` | R | C | R | C | R | DAO board + wiring schema |
| `arbiter-ledger-ops` | R | C | R | C | R | Receipt/ledger schema gate |
| `arbiter-ledger-rules` | R | C | R | C | R | Gate semantics |
| `arbiter-executor-role` | C | O | R | C | R | Evidence payload discipline |
| `arbiter-ux-role` | C | O | R | C | R | Journey + wiring contract |
| `arbiter-ux-sim` | C | O | R | C | R | UX packet constraints |
| `arbiter-verifier-spec-role` | C | O | R | C | R | Deterministic verdict shape |
| `arbiter-verifier-quality-role` | C | O | R | C | R | Severity/verdict structure |
| `arbiter-electrician-role` | C | O | R | C | R | Integration gate |
| `arbiter-oracle-role` | C | O | R | C | R | Safety/policy findings |
| `arbiter-scout-role` | C | O | R | C | R | Candidate schema |
| `arbiter-doc-ingest` | C | O | C | O | R | Untrusted ingest |
| `arbiter-trust-gating` | R | O | R | O | R | Primary Shield checkpoint |

## Process/meta skills
| Skill | M1 | M2 | M3 | M4 | M5 | Notes |
|---|---|---|---|---|---|---|
| `using-superpowers` | C | O | C | O | C | Meta-routing only |
| `brainstorming` | C | O | N | N | C | External source sanitization |
| `writing-plans` | C | O | C | N | C | Plan format contracts |
| `executing-plans` | C | O | R | C | C | Step result contract |
| `subagent-driven-development` | C | O | R | C | C | Task-turn reliability |
| `test-driven-development` | C | O | R | N | N | Deterministic red/green loop |
| `systematic-debugging` | C | O | R | C | C | Root-cause evidence gating |
| `verification-before-completion` | C | O | R | N | N | Hard evidence protocol |
| `requesting-code-review` | C | O | C | N | C | Review schema discipline |
| `receiving-code-review` | C | O | C | N | C | Validate suggestions safely |
| `dispatching-parallel-agents` | C | O | C | C | C | Coordination reliability |
| `using-git-worktrees` | N | N | N | N | C | Safety boundary on filesystem ops |
| `finishing-a-development-branch` | C | O | C | N | C | Finalization checks |
| `writing-skills` | C | O | C | N | C | Skill contract consistency |
| `skill-creator` | C | O | C | N | C | Safe prompt/tool generation |
| `skill-installer` | C | O | C | N | R | External source trust required |

## Tool-centric skills
| Skill | M1 | M2 | M3 | M4 | M5 | Notes |
|---|---|---|---|---|---|---|
| `pdf` | N | O | C | N | R | Uploaded docs are untrusted |
| `playwright` | N | O | C | C | R | External web input sanitation |
| `screenshot` | N | N | N | N | C | Usually local-only, low risk |

## Skill-only profile recommendation
Apply Resonant modules strongly to Arbiter skills and selectively to process/tool skills as indicated above.
