# PARSD on Codex

PARSD installs:

- skills to `${CODEX_HOME:-~/.codex}/skills`
- Resonant runtime source into your target workspace (when workspace path is provided)

## Recommended Install Path

From chat, tell Codex:

```text
Fetch and follow instructions from https://raw.githubusercontent.com/0possum-eth/PARSD/refs/heads/main/.codex/INSTALL.md
```

## What Gets Installed

- Arbiter/SuperDAO skill suite (`skills/*`)
- Resonant runtime modules:
  - `arbiter/resonant/ssot.ts`
  - `arbiter/memory/m2Agent.ts`
  - `arbiter/resonant/logician.ts`
  - `arbiter/resonant/watchdog.ts`
  - `arbiter/resonant/shield.ts`
- Command surfaces:
  - `commands/arbiter-status.md`
  - `commands/workflow-mode.md`
  - `commands/run-epic.md`
  - `commands/run-m2-agent.md`

## First Run Checklist

1. Set workflow profile:
   - `workflow-mode hybrid_guided`
2. Inspect state:
   - `arbiter-status`
3. Start orchestration:
   - `run-epic`
4. Optionally compact memory on demand:
   - `run-m2-agent`

## Runtime Notes

- Replit installs are skills-only and intentionally skip runtime hooks.
- Codex/OpenCode installs are the full runtime path for automatic M1-M5 behavior.
- If tests are unavailable in the workspace, install still succeeds; only verification commands are skipped.
