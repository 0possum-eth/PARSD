# Ledger Keeper Role

The Ledger Keeper is a procedural role, not a subagent. The arbiter-coordinator
follows these rules when performing ledger operations.

## Role Purpose

Persist approved run outcomes to ledger artifacts with append-only discipline.

## Hard Constraints

- MUST NOT implement tasks
- MUST NOT accept task completion without ALL required receipts verified
- MUST preserve append-only ledger behavior
- MUST NOT edit or delete existing ledger entries
- MUST verify receipt evidence BEFORE writing task_done events

## Verification Gate (from verifyReceipts.ts)

Before writing a `task_done` event, verify ALL of the following:

### 1. EXECUTOR_COMPLETED receipt exists
- Receipt has `type: "EXECUTOR_COMPLETED"` and matching `taskId`
- Packet has non-empty `execution` array
- Each ExecutionRecord has:
  - `command`: non-empty string
  - `exitCode`: must be `0`
  - `outputSummary`: non-empty, max 200 characters
  - `outputDigest`: SHA-256 hex hash of outputSummary (64 hex chars, matches `computeExecutionDigest`)

### 2. UX_SIMULATED receipt exists AFTER executor receipt (MANDATORY — every task)
- Receipt has `type: "UX_SIMULATED"`, matching `taskId`, `passed: true`
- Packet has non-empty `journey_checks`
- This is NOT gated by flags — every task requires UX simulation

### 3. VERIFIER_SPEC receipt exists AFTER UX receipt
- Receipt has `type: "VERIFIER_SPEC"`, matching `taskId`, `passed: true`
- Packet has `taskId` and `passed: true`

### 4. VERIFIER_QUALITY receipt exists AFTER spec receipt
- Receipt has `type: "VERIFIER_QUALITY"`, matching `taskId`, `passed: true`
- Packet has `taskId` and `passed: true`

### 5. Conditional receipts (only if task flags set)
- If `requiresOracleReview: true` → ORACLE_REVIEWED receipt AFTER executor, `passed: true`, non-empty `findings`

**Note:** INTEGRATION_CHECKED is verified at epic completion (not per-task). The electrician runs at phase/epic end and the coordinator verifies its receipt before marking the epic complete.

**Temporal ordering: EXECUTOR → UX → SPEC → QUALITY → [ORACLE if flagged]**

### 6. Evidence quality checks
- Execution records must have meaningful evidence (not placeholder text)
- Tests field, if present, must contain meaningful entries (file paths or "executed:" prefixes)
- files_changed field, if present, must contain file paths

## Writing task_done

Only after ALL verification passes, append to `docs/arbiter/_ledger/prd.events.jsonl`:

```json
{"ts":"<ISO>","op":"task_done","id":"<taskId>","data":{"epicId":"<epicId>","evidence":{"executor_receipt_id":"<id>","verifier_receipt_ids":["<spec-id>","<quality-id>"],"execution":[...],"tests":[...],"files_changed":[...]}}}
```

## This is NOT a subagent

The Ledger Keeper responsibilities are performed by the coordinator (you) following
the arbiter-ledger-ops skill. This role document exists to preserve the original
Arbiter OS role separation and ensure the verification rules are explicit.
