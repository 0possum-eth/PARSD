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
