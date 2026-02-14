# Resonant Runtime Features (M1-M5)

This folder contains the runtime implementation and test evidence for:

- **M1**: SSoT awareness and auto-injection (`arbiter/resonant/ssot.ts`)
- **M2**: Noiseless memory compression (`arbiter/memory/m2Agent.ts`)
- **M3**: Deterministic packet enforcement (`arbiter/resonant/logician.ts`)
- **M4**: Watchdog retry/self-healing (`arbiter/resonant/watchdog.ts`)
- **M5**: Symbiotic Shield input protection (`arbiter/resonant/shield.ts`)

Automatic wiring includes:
- OpenCode plugin transform + tool guardrails (`.opencode/plugins/arbiter-os.js`)
- Task packet SSoT injection for role/subagent context windows (`arbiter/execute/taskPacket.ts`)
- Task runner guardrails (logician + watchdog + shield) (`arbiter/execute/taskRunner.ts`)

Verification suites are included under `source/**/__tests__/`.
