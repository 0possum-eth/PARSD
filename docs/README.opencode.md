# PARSD on OpenCode

PARSD installs:

- skills to `${OPENCODE_CONFIG_DIR:-~/.config/opencode}/skills`
- plugin to `${OPENCODE_CONFIG_DIR:-~/.config/opencode}/plugins/arbiter-os.js`
- Resonant runtime source into your target workspace (when workspace path is provided)

## Recommended Install Path

From chat, tell OpenCode:

```text
Fetch and follow instructions from https://raw.githubusercontent.com/0possum-eth/PARSD/refs/heads/main/.opencode/INSTALL.md
```

## What Gets Installed

- Arbiter/SuperDAO skill suite (`skills/*`)
- OpenCode plugin transform + guardrails (`.opencode/plugins/arbiter-os.js`)
- Resonant runtime modules and tests under `arbiter/**`
- Command surfaces for status, workflow mode, epic loop, and M2 compaction

## First Run Checklist

1. Restart OpenCode after install.
2. Select workflow profile:
   - `workflow-mode hybrid_guided`
3. Inspect state:
   - `arbiter-status`
4. Start orchestration:
   - `run-epic`
5. Optionally compact memory:
   - `run-m2-agent`

## Runtime Notes

- OpenCode uses plugin hooks for automatic transform/guardrail wiring.
- Replit installs in this package are skills-only by design.
- If your target workspace is omitted, skills/plugin install still succeeds without runtime file copy.
- Installer now backs up an existing plugin before replacing it.

## Troubleshooting

If OpenCode shows session/file-load failures after plugin install, disable the plugin and restart:

```bash
mv "${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}/plugins/arbiter-os.js" \
   "${OPENCODE_CONFIG_DIR:-$HOME/.config/opencode}/plugins/arbiter-os.js.disabled.$(date +%Y%m%d%H%M%S)"
```

Then reinstall using the recommended path in `.opencode/INSTALL.md`.
