# PARSD Installation for Replit (Skills-Only)

This flow is intentionally compatible with the Obra Superpowers style:
fetch this file, then execute the commands.

## Install Skills into the Active Replit Project

Run from the target Replit project root:

```bash
set -euo pipefail
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --depth=1 https://github.com/0possum-eth/PARSD.git "$TMP_DIR/PARSD"
bash "$TMP_DIR/PARSD/scripts/install-replit-skills-only.sh" "$PWD"
```

## Verify

```bash
test -f "./.agents/skills/arbiter-coordinator/SKILL.md"
test -f "./.agents/skills/using-arbiter-os/SKILL.md"
```

## Important Scope Note

This Replit flow installs skills only.
Resonant runtime hooks (automatic M1-M5 wiring) are intentionally not installed in Replit mode.
