# Arbiter Capability Certifier Gap Closure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the winning `arbiter-capability-certifier` and close the three remaining gaps in swarm execution reliability.

**Architecture:** Add a host-side certifier CLI that performs deterministic toolchain probes, receipt schema gating, and signed certificate emission. Integrate it into `run-arbiter-swarm.sh` as a hard preflight and final bind step, and replace subagent-based toolchain capability checks with host-side checks. Make compression validation deterministic by running M2 against an isolated fixture workspace with forced compression and rehydration proof.

**Tech Stack:** Bash, Node.js built-ins (`crypto`, `fs`), existing shell harness, TypeScript M2 agent (runtime via `node --experimental-strip-types`), Node test runner.

---

### Task 1: Add failing tests for certifier behavior

**Files:**
- Create: `tests/scripts/arbiter-capability-certifier.test.mjs`
- Test: `tests/scripts/arbiter-capability-certifier.test.mjs`

**Step 1: Write the failing test**
- Add tests that invoke `scripts/arbiter-capability-certifier.sh` in temp dirs and assert:
  - Fails receipt gate when `ORACLE_REVIEWED` and `TRUST_CONFIRMED` are required but absent.
  - Passes when both receipts are present with valid packet schema.
  - Emits signed certificate JSON and bind metadata.

**Step 2: Run test to verify it fails**
Run: `node --test tests/scripts/arbiter-capability-certifier.test.mjs`
Expected: FAIL because script does not exist/does not satisfy schema checks yet.

**Step 3: Implement minimal script**
- Add `scripts/arbiter-capability-certifier.sh` with:
  - host preflight probes (`codex`, screenshot command, Playwright runtime cache check),
  - deterministic receipt schema/order validator,
  - signed certificate JSON emission (`sha256` with secret-derived signature),
  - optional manifest bind metadata.

**Step 4: Run test to verify it passes**
Run: `node --test tests/scripts/arbiter-capability-certifier.test.mjs`
Expected: PASS.

### Task 2: Integrate certifier into swarm harness and remove toolchain-capability subagent dependency

**Files:**
- Modify: `scripts/run-arbiter-swarm.sh`

**Step 1: Write the failing test**
- Extend script test to assert swarm harness references certifier and does not execute subagent `toolchain-capability` flow.

**Step 2: Run test to verify it fails**
Run: `node --test tests/scripts/arbiter-capability-certifier.test.mjs`
Expected: FAIL on harness-integration assertions.

**Step 3: Write minimal implementation**
- In `run-arbiter-swarm.sh`:
  - call certifier preflight before swarm phases and fail closed on non-certified result,
  - replace `toolchain-capability` subagent flow with host-generated capability report derived from certificate,
  - add final certificate bind step after manifest build (certificate hash + manifest hash linkage artifact),
  - include certifier artifacts in summary.

**Step 4: Run test to verify it passes**
Run: `node --test tests/scripts/arbiter-capability-certifier.test.mjs`
Expected: PASS.

### Task 3: Make compression validation deterministic and force compressed artifact generation

**Files:**
- Modify: `scripts/run-arbiter-swarm.sh`

**Step 1: Write the failing test**
- Extend script test to assert deterministic compression fixture logic exists (isolated fixture dir, low token budget, rehydration check).

**Step 2: Run test to verify it fails**
Run: `node --test tests/scripts/arbiter-capability-certifier.test.mjs`
Expected: FAIL on compression fixture assertions.

**Step 3: Write minimal implementation**
- Change swarm phase 4 compression check to:
  - use isolated fixture under run dir,
  - write deterministic receipts with long payload,
  - run `runM2Agent` with strict token budget,
  - assert compressed entries and rehydration proof in JSON output.

**Step 4: Run test to verify it passes**
Run: `node --test tests/scripts/arbiter-capability-certifier.test.mjs`
Expected: PASS.

### Task 4: Verify end-to-end script quality and behavior gates

**Files:**
- Modify: `scripts/run-arbiter-swarm.sh`
- Modify: `scripts/arbiter-capability-certifier.sh`

**Step 1: Add guardrail checks**
- `bash -n scripts/arbiter-capability-certifier.sh scripts/run-arbiter-swarm.sh`

**Step 2: Execute focused certifier test**
- `node --test tests/scripts/arbiter-capability-certifier.test.mjs`

**Step 3: Run one smoke swarm session with short limits**
- `TIMEOUT_SEC=90 PARALLEL_SKILLS=1 PARALLEL_ROLES=1 ./scripts/run-arbiter-swarm.sh certifier-smoke-$(date -u +%Y%m%dT%H%M%SZ)`

**Step 4: Validate outputs**
- Confirm output artifacts exist:
  - `docs/arbiter/swarm-runs/<run>/capability-certificate.json`
  - `docs/arbiter/swarm-runs/<run>/manifest.bindings.json`
  - `docs/arbiter/swarm-runs/<run>/compression-check.json`

