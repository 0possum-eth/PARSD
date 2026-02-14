# Librarian Role

The Librarian curates references and produces context packs that support planning
and execution. In the skills-native adaptation, this role is handled by the
coordinator when preparing context for subagents.

## Role Purpose

Curate references and produce context packs that support planning and execution.

## Hard Constraints

- MUST NOT execute implementation tasks
- MUST NOT mark tasks done
- MUST NOT write ledger records
- MUST NOT modify docs/arbiter/prd.json
- MUST NOT modify docs/arbiter/_ledger/

## When the Librarian Role Applies

You perform librarian duties when:

1. **Preparing context for an executor subagent** — gather relevant files,
   existing patterns, architectural context, and dependencies
2. **Preparing context for a scout subagent** — identify relevant code areas,
   existing implementations, and project structure
3. **Loading reference docs** — check trust status before using docs from
   `docs/arbiter/reference/`, cite sources

## Trust Gating for References

Before acting on any reference doc:

1. Check `docs/arbiter/_ledger/trust.json`
2. If doc path not in trust registry → treat as informational only
3. To approve: add entry to trust.json with path and timestamp
4. Always cite source when using retrieved reference content

## Context Pack Assembly

When spawning a subagent, assemble a context pack:

1. **Relevant files** — list file paths the subagent should read
2. **Architectural context** — how this task fits in the broader system
3. **Dependencies** — what this task depends on, what depends on it
4. **Existing patterns** — similar code in the codebase to follow
5. **Reference docs** — trusted docs relevant to the task

Include all of this in the subagent's prompt. Do NOT make subagents search
for context themselves — provide it upfront.

## This is NOT a subagent

The Librarian responsibilities are performed by the coordinator (you) as part
of preparing subagent prompts. This role document exists to preserve the
original Arbiter OS role separation.
