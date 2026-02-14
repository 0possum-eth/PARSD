# PARSD Deep Swarm Upgrade Report (2026-02-14)

## Verdict
The harness is now significantly deeper and more honest. It produces real governance friction, real timeout/failure accounting, and full subagent traceability across swarm and incantation runs.

Final evidence runs:
- Swarm: /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T5
- Incantation: /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/incantations/incant-deep-20260214T5

## Fixes Implemented
1. Fixed stdin loss in timeout wrapper so subagent prompts are actually delivered.
2. Fixed exit-code and timed-out capture so failures no longer appear as false zeroes.
3. Fixed incantation swarm-facts aggregation field mapping.
4. Installed Playwright Chromium runtime and mapped Chrome path for MCP compatibility.
5. Added Playwright profile reset preflight to reduce singleton lock/session conflicts.
6. Upgraded DAO phase from one-turn to two-turn role interaction per round (t1 initial, t2 reply, then coordinator).
7. Added hard prompt guardrails against package manager/test drift during governance probes.
8. Fixed heredoc quoting issue that executed guardrail tokens as shell commands.
9. Added timeout-smoke validation run proving manifest persistence of exit_code=124 and timed_out=1.
10. Added lightweight toolchain-capability constraints to reduce screenshot payload blowups.

## Coverage
- Skill pressure runs: 35
- DAO role/coordinator runs: 27
- Flow probes: 6
- Compression probe: 1
- Total swarm subagents: 69
- Total incantation subagents: 8

## Final Metrics
Swarm T5:
- Manifest: /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T5/manifest.tsv
- Summary: /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T5/summary.md
- Non-zero exits: 1
- Timed out: 1
- Notable failure: idx 68, id flow-68-toolchain-capability, exit_code 124, timed_out 1

Incantation T5:
- Manifest: /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/incantations/incant-deep-20260214T5/manifest.tsv
- Non-zero exits: 0
- Timed out: 0

Timeout accounting proof:
- /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/incantations/incant-timeout-smoke2-20260214T4/subagent-index.md
- Result: all 8 rows captured exit_code 124 and timed_out 1.

## Key Findings
1. DAO governance is now visibly non-trivial.
- Rounds now show block, pause, proceed, and continue under explicit evidence constraints.
- Evidence: /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/_dao/board.jsonl

2. Gate behavior is fail-closed where it matters.
- Receipt gate: block.
- Oracle gate: block.
- Trust-injection gate: halt_and_ask.
- M3 schema failure: block_and_regenerate.

3. Watchdog response is defensive and explicit.
- M4 flow returns restart_role_and_reload_state under stall scenario.

4. Toolchain is still the unstable leg under pressure.
- T5 timed out on toolchain-capability (exit 124).
- Evidence: /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T5/logs/flow-68-toolchain-capability.log.txt
- Post-fix prompt constraints were validated in a fresh smoke session with decision sufficient.
- Evidence:
- /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T5/outputs/flow-68-toolchain-capability.postfix-smoke.output.txt
- /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T5/logs/flow-68-toolchain-capability.postfix-smoke.log.txt

5. Compression remains partial despite successful command execution.
- Compression rc is 0, but compressed zone count is still 0, so rehydration path was not exercised.
- Evidence:
- /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T5/compression-check.json
- /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T5/outputs/compression-audit-69.output.txt

6. Incantation analysis agrees with swarm findings.
- Skeptic, forensics, and dependency probes all flag unresolved closure artifacts and blocked chains.
- Evidence: /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/incantations/incant-deep-20260214T5/outputs

## Skill Interplay
- Generated skill interplay map: /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/skill-interplay/deep-upgrade-20260214T5.md
- Includes full inventory, dependency hubs, and directed edges across all discovered skills.

## Subagent Tracking
Swarm index (all 69 subagents with session id, decision, exit, timeout, output path, log path):
- /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/swarm-runs/deep-upgrade-20260214T5/subagent-index.md

Incantation index (all 8 subagents with session id, exit, timeout, output path, log path):
- /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/incantations/incant-deep-20260214T5/subagent-index.md

Timeout smoke index:
- /Users/0possum-eth/Desktop/p.a.r.s.d/docs/arbiter/incantations/incant-timeout-smoke2-20260214T4/subagent-index.md

## Remaining Gaps
1. Toolchain-capability remains vulnerable to long trajectories and output bloat.
2. Compression path still does not generate compressed artifacts under current fixture.
3. Oracle/trust closure artifacts still need completion for end-to-end lifecycle readiness.

## Recommended Next Steps
1. Add a host-side toolchain preflight script and use subagents only for policy interpretation.
2. Add deterministic M2 compression fixture data to guarantee compressed output and rehydration proof.
3. Add strict receipt schema gate for ORACLE_REVIEWED and trust confirmation before coordinator continue.
