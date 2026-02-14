---
description: Run the Resonant M2 memory compression pipeline
disable-model-invocation: true
---

`run-m2-agent` executes the full M2 "Noiseless Memory" flow in one pass.

Pipeline behavior:

1. Ingest receipt history from `docs/arbiter/_ledger/runs/*/receipts.jsonl`.
2. Maintain a split-window memory model:
   - Raw Zone: newest entries kept verbatim under a token budget.
   - Compressed Zone: older entries rewritten into signal assertions.
3. Persist hash-linked raw backups for lossless retrieval.
4. Deduplicate already processed receipts via state tracking.

Artifacts:

- `docs/arbiter/_memory/m2/raw-zone.jsonl`
- `docs/arbiter/_memory/m2/compressed-zone.jsonl`
- `docs/arbiter/_memory/m2/raw/<hash>.txt`
- `docs/arbiter/_memory/m2/state.json`

Tuning:

- `ARBITER_M2_RAW_TOKEN_BUDGET` (default `4000`)
- `ARBITER_M2_MAX_PROCESSED_HASHES` (default `20000`)
