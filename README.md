# PARSD (A.R.S.D Package)

Standalone **Arbiter-Resonant-SuperDAO** export bundle.

## Why "Portable" Is Defensible

`Portable` in PARSD means **package portability across host environments**:

- Same repo layout installs in Codex, OpenCode, and Replit (skills-only) via `scripts/`.
- Same bundle includes a Claude Code plugin form under `claude-code-plugin/`.
- Same skills corpus is shipped once and reused across environments.

Scope note:
- Full runtime automation (M1-M5 behavior hooks) is designed for Codex/OpenCode runtime wiring.
- Replit mode in this package is intentionally skills-only.

Contents:
- `skills/` - Full installed Codex skills set (Arbiter/SuperDAO + supporting skills)
- `resonant-features/` - M1-M5 runtime source and tests (automatic wiring)
- `scripts/` - Install helpers for Codex, OpenCode, and Replit (skills only)
- `claude-code-plugin/` - Claude Code plugin variant of this package
- `install.md` - Complete installation guide
