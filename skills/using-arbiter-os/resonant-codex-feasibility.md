# Resonant in Codex: Feasibility Boundary

Confidence: **moderate**.

## What is viable with skills only
- M1 SSoT policy injection via required pre-read files.
- M2 memory discipline via explicit raw/compressed workflow contracts.
- M3 output enforcement at process level (verification skills and schema-first instructions).
- M5 trust-first behavior (untrusted-by-default + explicit trust gating).

## What is only partially viable in Codex app
- M3 true deterministic middleware between model output and user output.
  - Deterministic packet validation is now enforced in Arbiter runtime, but platform-global interception is still unavailable.
- M4 always-on watchdog daemon inside Codex runtime.
  - An external supervisor command exists (`run-epic-supervised` / `arbiter/supervisor/superviseRunEpic.ts`), but not platform-level daemonization.
- M1 password-protected SSoT with automatic in-context decrypt/inject.
  - You can store encrypted files locally, but auto-decrypt/inject is not native in Codex UI pipeline.

## Not currently guaranteed by skill layer alone
- Hard blocking every malformed output before user sees it.
- Background service restart with zero UI involvement.
- Guaranteed cross-thread context dedupe at platform level.

## Runtime hardening now present in this codebase
- M3 deterministic packet checks: `arbiter/resonant/logician.ts`, enforced in `arbiter/execute/taskRunner.ts`.
- M4 timeout/retry guardrails: `arbiter/resonant/watchdog.ts`, enforced across executor/verifier/role-turn calls.
- M4 external restart loop: `arbiter/supervisor/superviseRunEpic.ts` with worker isolation in `arbiter/supervisor/worker.ts`.
- M5 paranoia filter: `arbiter/resonant/shield.ts`, enforced in `arbiter/execute/taskRunner.ts` and `.opencode/plugins/arbiter-os.js`.
- Guardrail telemetry receipts: `RESONANT_GUARDRAIL_EVENT` persisted to run receipts for shield/logician/watchdog events.

## Recommended operating profile (Codex-native)
1. Run **Skill-Only Resonant Profile** as default.
2. Treat M3 and M4 as procedural gates during Arbiter role turns.
3. Use strict `HALT_AND_ASK` fail-closed policy when rules are uncertain.
4. Add external scripts later only if you need hard runtime enforcement.

## Optional future hardening (outside current implementation)
- Promote supervisor to a true daemon with process manager integration.
- External Logician gateway for global, non-Arbiter output interception.
- External SSoT injector/decryptor service.
