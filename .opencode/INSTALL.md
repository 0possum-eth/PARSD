# PARSD Installation for OpenCode

This flow is intentionally compatible with the Obra Superpowers style:
fetch this file, then execute the commands.

## Install Skills + Plugin + Runtime (recommended)

Run from the target OpenCode workspace root:

```bash
set -euo pipefail
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --depth=1 https://github.com/0possum-eth/PARSD.git "$TMP_DIR/PARSD"
bash "$TMP_DIR/PARSD/scripts/install-opencode.sh" "$PWD"
```

## Skills + Plugin Only (no workspace runtime copy)

```bash
set -euo pipefail
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --depth=1 https://github.com/0possum-eth/PARSD.git "$TMP_DIR/PARSD"
bash "$TMP_DIR/PARSD/scripts/install-opencode.sh"
```

## Verify

```bash
test -f "${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}/skills/arbiter-coordinator/SKILL.md"
test -f "${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}/plugins/arbiter-os.js"
test -f "./arbiter/resonant/ssot.ts"
```

Restart OpenCode after install so skills and plugin hooks reload.

## Recovery (if OpenCode fails after plugin install)

If OpenCode errors during startup/session load, temporarily disable the plugin:

```bash
mv "${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}/plugins/arbiter-os.js" \
   "${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}/plugins/arbiter-os.js.disabled.$(date +%Y%m%d%H%M%S)"
```

Then restart OpenCode and re-run the install command above.
