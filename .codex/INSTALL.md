# PARSD Installation for Codex

This flow is intentionally compatible with the Obra Superpowers style:
fetch this file, then execute the commands.

## Install Skills + Runtime (recommended)

Run from the target Codex workspace root:

```bash
set -euo pipefail
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --depth=1 https://github.com/0possum-eth/PARSD.git "$TMP_DIR/PARSD"
bash "$TMP_DIR/PARSD/scripts/install-codex.sh" "$PWD"
```

## Skills-Only Install

```bash
set -euo pipefail
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --depth=1 https://github.com/0possum-eth/PARSD.git "$TMP_DIR/PARSD"
bash "$TMP_DIR/PARSD/scripts/install-codex.sh"
```

## Verify

```bash
test -f "${CODEX_HOME:-$HOME/.codex}/skills/arbiter-coordinator/SKILL.md"
test -f "./arbiter/resonant/ssot.ts"
test -f "./arbiter/memory/m2Agent.ts"
```

Optional runtime test check (if your workspace has Node toolchain available):

```bash
npx tsx --test arbiter/resonant/__tests__/logician.test.ts arbiter/resonant/__tests__/shield.test.ts arbiter/resonant/__tests__/watchdog.test.ts arbiter/resonant/__tests__/ssot.test.ts arbiter/memory/__tests__/m2Agent.test.ts
```
