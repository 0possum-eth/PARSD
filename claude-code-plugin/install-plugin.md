# Install: Claude Code Plugin (PARSD)

## 1) Copy plugin to Claude plugins location

Example:

```bash
mkdir -p ~/.claude/plugins
cp -R /path/to/p.a.r.s.d/claude-code-plugin ~/.claude/plugins/parsd
```

## 2) Verify plugin files

```bash
ls ~/.claude/plugins/parsd/.claude-plugin/plugin.json
ls ~/.claude/plugins/parsd/hooks/hooks.json
ls ~/.claude/plugins/parsd/skills
```

## 3) Restart Claude Code

Restart Claude Code so hooks and plugin metadata are reloaded.

## 4) Verify hook runs

Start a new session and confirm startup context includes PARSD mention from `hooks/session-start.sh`.

## Notes

- This plugin ships full skills + runtime source, but actual runtime automation depends on your host environment and command wiring.
- For OpenCode/Codex runtime parity (automatic M1-M5 execution), use the root package `install.md` and install scripts.
