# Complete Install Guide: A.R.S.D

This package is self-contained and can be published directly as a GitHub repo.

## What You Get

- Full skill set for Arbiter-Resonant-SuperDAO (`skills/`)
- Fully automatic runtime guardrails for M1-M5 (`resonant-features/source/`)
- Install scripts for Codex, OpenCode, and Replit
- Claude Code plugin variant (`claude-code-plugin/`)

## Prerequisites

- macOS/Linux shell (or Git Bash on Windows)
- `bash`
- `cp` (and optionally `rsync`)

## 1) Install in Codex (skills + runtime)

From inside this package root:

```bash
cd /path/to/a.r.s.d
./scripts/install-codex.sh /path/to/your/workspace
```

What it does:
- Installs skills to `${CODEX_HOME:-~/.codex}/skills`
- Copies resonant runtime files (M1-M5 + plugin/command wiring) into your workspace

Optional skills-only:

```bash
./scripts/install-codex.sh
```

## 2) Install in OpenCode (skills + plugin + runtime)

From inside this package root:

```bash
cd /path/to/a.r.s.d
./scripts/install-opencode.sh /path/to/your/workspace
```

What it does:
- Installs skills to `${OPENCODE_CONFIG_DIR:-~/.config/opencode}/skills`
- Installs plugin to `${OPENCODE_CONFIG_DIR:-~/.config/opencode}/plugins/arbiter-os.js`
- Copies resonant runtime files into your workspace

Then restart OpenCode.

## 3) Install in Replit (skills only)

Runtime hooks are intentionally excluded here per request.

```bash
cd /path/to/a.r.s.d
./scripts/install-replit-skills-only.sh /path/to/replit/repo
```

This installs skills under:
- `/path/to/replit/repo/.agents/skills`

## 4) Claude Code Plugin Variant

Use the packaged plugin in:
- `claude-code-plugin/`

See:
- `claude-code-plugin/install-plugin.md`

## 5) Environment Variables (optional)

- `ARBITER_SSOT_PASSWORD` - stable password source for M1 SSoT store
- `ARBITER_M2_RAW_TOKEN_BUDGET` - raw zone budget for M2 (default `4000`)
- `ARBITER_M2_MAX_PROCESSED_HASHES` - dedupe state size for M2 (default `20000`)

## 6) Verification Commands

Run in the target workspace:

```bash
npx tsx --test arbiter/resonant/__tests__/logician.test.ts arbiter/resonant/__tests__/shield.test.ts arbiter/resonant/__tests__/watchdog.test.ts arbiter/resonant/__tests__/ssot.test.ts arbiter/memory/__tests__/m2Agent.test.ts
npm run test:arbiter
```

Expected:
- All targeted guardrail tests pass
- Full arbiter suite passes
