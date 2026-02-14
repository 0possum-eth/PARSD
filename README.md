# PARSD (A.R.S.D Package)

**Persistent Arbiter Resonant SuperDAO** standalone package.

## Why "Persistent" Fits

`Persistent` in PARSD reflects how the system operates:

- Ledger receipts are durably written to disk and used as evidence gates.
- M2 memory is persisted with raw/compressed zones plus hash-linked rehydration.
- M1 SSoT documents are stored in a protected directory with encrypted payloads.
- Watchdog retries are bounded and tied to saved execution state.

Scope note:
- Full runtime automation (M1-M5 behavior hooks) is designed for Codex/OpenCode runtime wiring.
- Replit mode in this package is intentionally skills-only.

Contents:
- `skills/` - Full installed Codex skills set (Arbiter/SuperDAO + supporting skills)
- `resonant-features/` - M1-M5 runtime source and tests (automatic wiring)
- `scripts/` - Install helpers for Codex, OpenCode, and Replit (skills only)
- `claude-code-plugin/` - Claude Code plugin variant of this package
- `install.md` - Complete installation guide
