# Install: Claude Code Plugin (A.R.S.D)

## 1) Copy plugin to Claude plugins location

Example:

```bash
mkdir -p ~/.claude/plugins
cp -R /path/to/a.r.s.d/claude-code-plugin ~/.claude/plugins/arsd-standalone
```

## 2) Verify plugin files

```bash
ls ~/.claude/plugins/arsd-standalone/.claude-plugin/plugin.json
ls ~/.claude/plugins/arsd-standalone/hooks/hooks.json
ls ~/.claude/plugins/arsd-standalone/skills
```

## 3) Restart Claude Code

Restart Claude Code so hooks and plugin metadata are reloaded.

## 4) Verify hook runs

Start a new session and confirm startup context includes A.R.S.D mention from `hooks/session-start.sh`.

## Notes

- This plugin ships full skills + runtime source, but actual runtime automation depends on your host environment and command wiring.
- For OpenCode/Codex runtime parity (automatic M1-M5 execution), use the root package `install.md` and install scripts.
