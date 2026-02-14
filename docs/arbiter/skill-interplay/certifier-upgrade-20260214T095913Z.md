# Skill Interplay Map

Generated: certifier-upgrade-20260214T095913Z (UTC)

- Total skills: `35`
- Directed interplay edges: `35`

## Inventory

| Skill | Path | Description |
|---|---|---|
| `arbiter-coordinator` | `skills/arbiter-coordinator/SKILL.md` | Use when coordinating Arbiter OS execution in Codex with role turns, receipt gates, and ledger-first state transitions. |
| `arbiter-dao-mode` | `skills/arbiter-dao-mode/SKILL.md` | Use when daoMode is enabled and Arbiter role turns must coordinate through roster, board, assignments, and wiring catalogs. |
| `arbiter-doc-ingest` | `skills/arbiter-doc-ingest/SKILL.md` | Use when adding new source documents into Arbiter reference storage while preserving untrusted-by-default handling and provenance. |
| `arbiter-electrician-role` | `skills/arbiter-electrician-role/SKILL.md` | Use when running the electrician role turn at epic end to resolve wiring catalog items and confirm cross-task integration health. |
| `arbiter-executor-role` | `skills/arbiter-executor-role/SKILL.md` | Use when running the executor role turn to implement one Arbiter task and return structured execution evidence. |
| `arbiter-ledger-ops` | `skills/arbiter-ledger-ops/SKILL.md` | Use when reading or writing Arbiter receipts, ledger events, and DAO evidence files from Codex. |
| `arbiter-ledger-rules` | `skills/arbiter-ledger-rules/SKILL.md` | Ledger-first state and evidence requirements |
| `arbiter-oracle-role` | `skills/arbiter-oracle-role/SKILL.md` | Use when a task is oracle-gated and needs safety, invariant, or policy review before completion. |
| `arbiter-run-loop` | `skills/arbiter-run-loop/SKILL.md` | Use when executing the Arbiter loop in Codex and you need an exact step order with DAO and receipt gates. |
| `arbiter-scout-role` | `skills/arbiter-scout-role/SKILL.md` | Use when there is no active epic and you need a structured research turn that proposes executable epic/task candidates. |
| `arbiter-trust-gating` | `skills/arbiter-trust-gating/SKILL.md` | Use when reference docs or mounted behavior docs are involved and execution must be gated by explicit trust decisions. |
| `arbiter-ux-role` | `skills/arbiter-ux-role/SKILL.md` | Use when running the UX role turn for every task to simulate journey outcomes and catalog wiring work. |
| `arbiter-ux-sim` | `skills/arbiter-ux-sim/SKILL.md` | Use when performing the mandatory UX turn for a task to produce journey checks and wiring catalog entries before verification. |
| `arbiter-verifier-quality-role` | `skills/arbiter-verifier-quality-role/SKILL.md` | Use when running the quality verifier role turn after spec pass to validate technical quality, test quality, and risk posture. |
| `arbiter-verifier-spec-role` | `skills/arbiter-verifier-spec-role/SKILL.md` | Use when running the spec verifier role turn to confirm implementation matches task requirements before quality review. |
| `brainstorming` | `skills/brainstorming/SKILL.md` | You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation. |
| `dispatching-parallel-agents` | `skills/dispatching-parallel-agents/SKILL.md` | Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies |
| `executing-plans` | `skills/executing-plans/SKILL.md` | Use when you have a written implementation plan to execute in a separate session with review checkpoints |
| `finishing-a-development-branch` | `skills/finishing-a-development-branch/SKILL.md` | Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup |
| `pdf` | `skills/pdf/SKILL.md` | Use when tasks involve reading, creating, or reviewing PDF files where rendering and layout matter; prefer visual checks by rendering pages (Poppler) and use Python tools such as `reportlab`, `pdfplumber`, and `pypdf` for generation and extraction. |
| `playwright` | `skills/playwright/SKILL.md` | Use when the task requires automating a real browser from the terminal (navigation, form filling, snapshots, screenshots, data extraction, UI-flow debugging) via `playwright-cli` or the bundled wrapper script. |
| `receiving-code-review` | `skills/receiving-code-review/SKILL.md` | Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation |
| `requesting-code-review` | `skills/requesting-code-review/SKILL.md` | Use when completing tasks, implementing major features, or before merging to verify work meets requirements |
| `screenshot` | `skills/screenshot/SKILL.md` | Use when the user explicitly asks for a desktop or system screenshot (full screen, specific app or window, or a pixel region), or when tool-specific capture capabilities are unavailable and an OS-level capture is needed. |
| `skill-creator` | `skills/.system/skill-creator/SKILL.md` | Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. |
| `skill-installer` | `skills/.system/skill-installer/SKILL.md` | Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). |
| `subagent-driven-development` | `skills/subagent-driven-development/SKILL.md` | Use when executing implementation plans with independent tasks in the current session |
| `systematic-debugging` | `skills/systematic-debugging/SKILL.md` | Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes |
| `test-driven-development` | `skills/test-driven-development/SKILL.md` | Use when implementing any feature or bugfix, before writing implementation code |
| `using-arbiter-os` | `skills/using-arbiter-os/SKILL.md` | Use when running Arbiter OS in Codex to coordinate role-based execution with ledger and DAO artifacts as the source of truth. |
| `using-git-worktrees` | `skills/using-git-worktrees/SKILL.md` | Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification |
| `using-superpowers` | `skills/using-superpowers/SKILL.md` | Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions |
| `verification-before-completion` | `skills/verification-before-completion/SKILL.md` | Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always |
| `writing-plans` | `skills/writing-plans/SKILL.md` | Use when you have a spec or requirements for a multi-step task, before touching code |
| `writing-skills` | `skills/writing-skills/SKILL.md` | Use when creating new skills, editing existing skills, or verifying skills work before deployment |

## Dependency Hubs

| Skill | Outgoing refs | Incoming refs |
|---|---:|---:|
| `subagent-driven-development` | 6 | 3 |
| `using-git-worktrees` | 4 | 4 |
| `executing-plans` | 3 | 4 |
| `finishing-a-development-branch` | 3 | 3 |
| `using-arbiter-os` | 4 | 2 |
| `writing-plans` | 3 | 3 |
| `brainstorming` | 2 | 3 |
| `systematic-debugging` | 2 | 1 |
| `test-driven-development` | 0 | 3 |
| `writing-skills` | 3 | 0 |
| `arbiter-coordinator` | 1 | 1 |
| `arbiter-run-loop` | 1 | 1 |
| `playwright` | 2 | 0 |
| `verification-before-completion` | 0 | 2 |
| `arbiter-dao-mode` | 0 | 1 |
| `arbiter-ledger-ops` | 0 | 1 |
| `pdf` | 0 | 1 |
| `requesting-code-review` | 0 | 1 |
| `screenshot` | 0 | 1 |
| `using-superpowers` | 1 | 0 |
| `arbiter-doc-ingest` | 0 | 0 |
| `arbiter-electrician-role` | 0 | 0 |
| `arbiter-executor-role` | 0 | 0 |
| `arbiter-ledger-rules` | 0 | 0 |
| `arbiter-oracle-role` | 0 | 0 |
| `arbiter-scout-role` | 0 | 0 |
| `arbiter-trust-gating` | 0 | 0 |
| `arbiter-ux-role` | 0 | 0 |
| `arbiter-ux-sim` | 0 | 0 |
| `arbiter-verifier-quality-role` | 0 | 0 |
| `arbiter-verifier-spec-role` | 0 | 0 |
| `dispatching-parallel-agents` | 0 | 0 |
| `receiving-code-review` | 0 | 0 |
| `skill-creator` | 0 | 0 |
| `skill-installer` | 0 | 0 |

## Directed Edges

| From | To |
|---|---|
| `arbiter-coordinator` | `using-arbiter-os` |
| `arbiter-run-loop` | `using-arbiter-os` |
| `brainstorming` | `using-git-worktrees` |
| `brainstorming` | `writing-plans` |
| `executing-plans` | `finishing-a-development-branch` |
| `executing-plans` | `using-git-worktrees` |
| `executing-plans` | `writing-plans` |
| `finishing-a-development-branch` | `executing-plans` |
| `finishing-a-development-branch` | `subagent-driven-development` |
| `finishing-a-development-branch` | `using-git-worktrees` |
| `playwright` | `pdf` |
| `playwright` | `screenshot` |
| `subagent-driven-development` | `executing-plans` |
| `subagent-driven-development` | `finishing-a-development-branch` |
| `subagent-driven-development` | `requesting-code-review` |
| `subagent-driven-development` | `test-driven-development` |
| `subagent-driven-development` | `using-git-worktrees` |
| `subagent-driven-development` | `writing-plans` |
| `systematic-debugging` | `test-driven-development` |
| `systematic-debugging` | `verification-before-completion` |
| `using-arbiter-os` | `arbiter-coordinator` |
| `using-arbiter-os` | `arbiter-dao-mode` |
| `using-arbiter-os` | `arbiter-ledger-ops` |
| `using-arbiter-os` | `arbiter-run-loop` |
| `using-git-worktrees` | `brainstorming` |
| `using-git-worktrees` | `executing-plans` |
| `using-git-worktrees` | `finishing-a-development-branch` |
| `using-git-worktrees` | `subagent-driven-development` |
| `using-superpowers` | `brainstorming` |
| `writing-plans` | `brainstorming` |
| `writing-plans` | `executing-plans` |
| `writing-plans` | `subagent-driven-development` |
| `writing-skills` | `systematic-debugging` |
| `writing-skills` | `test-driven-development` |
| `writing-skills` | `verification-before-completion` |
