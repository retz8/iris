# docs/tasks — Session Coordination

This folder is the coordination layer for multi-session Claude Code work. It contains track definitions, implementation plans, and the shared handoff file.

## How It Works

Each major workstream runs as an independent Claude Code session ("track"). Sessions coordinate through `UPDATES.md` as the single source of truth — no real-time communication between sessions.

## Track Document Structure

Every track document is divided into exactly four phases:

1. **Explore** — Files to read, questions to answer, current state to map out.
2. **Discuss** — Findings to surface, design decisions to make with the human engineer.
3. **Plan** — Implementation plan written to `docs/tasks/{phase}-track-{x}-{name}/`. Use the `create-implementation-plan` skill.
4. **Execute** — Implementation steps, verification checks (lint, typecheck, tests), and handoff.

## Session Startup Rule

**When a Claude Code session is given a track document, it must:**

1. Read `docs/tasks/README.md` (this file).
2. Read `docs/tasks/UPDATES.md` and check that all listed dependencies are complete.
3. Immediately begin executing the **Explore** phase without waiting for manual prompting.

Do not ask "should I start?" — just start. The track document is the prompt.

## Handoff Rule

When the human engineer confirms a track is done, create `docs/tasks/{phase}-track-{x}-{name}/summary.md` summarizing what was done and what changed.

Only update `UPDATES.md` when explicitly told to. When updating, append an entry following the format in the UPDATES.md Format section below.

### Dependency Checking

Before starting execution, check `UPDATES.md` for your listed dependencies. If a dependency is not marked complete, wait and ask the human engineer before proceeding.

## Phases and Tracks

Work is organized into phases. All tracks within a phase run in parallel. The next phase starts only after all tracks in the current phase are complete.

Track files are named: `{phase}-track-{x}-{track-name}.md`

- `{phase}` — integer, the phase this track belongs to (1, 2, 3, …)
- `{track-x}` — letter identifier within the phase (a, b, c, …)
- `{track-name}` — short kebab-case description

Examples: `1-track-a-backend-hardening.md`, `2-track-a-marketplace-prep.md`

Implementation plan folders follow the same prefix: `1-track-a-backend-hardening/`

Track definition files contain:
- Scope: what this track owns
- Dependencies: which tracks must complete first (if any within the same phase)
- Deliverables: what "done" looks like
- Out of scope: what this track explicitly does not do

## Cleanup

After all tracks complete, task files are cleaned up:
- Track definitions and implementation plans — deleted (code is the artifact)
- Operational references that remain useful — moved to their relevant location in the codebase
- `UPDATES.md` and this file — kept as historical record

## UPDATES.md Format

```
## {Phase}-Track-{X} — {Track Name} — {COMPLETE | IN PROGRESS | BLOCKED}

One-paragraph summary of what was done and what changed.
See docs/tasks/{phase}-track-{x}-{name}/summary.md for full detail.
```
