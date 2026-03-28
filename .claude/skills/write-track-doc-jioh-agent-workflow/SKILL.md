---
name: write-track-doc-jioh-agent-workflow
description: "Generates a track definition document for the jioh agent workflow system. Use when asked to write a track doc, define a new track, or add a track to a phase. Produces a file under docs/tasks/ following the standard {phase}-track-{x}-{name}.md format."
user-invocable: true
allowed-tools: Read, Write, Bash
---

# Write Track Doc — Jioh Agent Workflow

Generate a track definition document for a new workstream in the multi-session Claude Code workflow.

## Before Writing

1. Read `docs/tasks/README.md` to confirm the current naming convention and file format.
2. Check `docs/tasks/` to see what phase numbers and track letters are already taken.
3. Determine the correct filename: `{phase}-track-{x}-{track-name}.md`
   - `{phase}` — integer (1, 2, 3, …)
   - `{x}` — next available letter in the phase (a, b, c, …)
   - `{track-name}` — short kebab-case description of the scope

## Document Structure

Every track document must follow this exact structure:

```
# {Phase}-Track-{X} — {Title}

**Phase:** {phase}
**Track:** {X}
**Scope:** One sentence describing what this track owns and delivers.

**Dependencies:** None | List of tracks that must complete first

**Deliverables:**
- Specific file or artifact that will exist when this track is done

**Out of scope:**
- Things this track explicitly does not do

**Skills:**
- `skill-name` — one sentence on why it's relevant to this track

---

## Phase 1 — Explore

Read the following files in order:

1. `path/to/file` — what to look for
2. `path/to/file` — what to look for

After reading, answer these questions:

- Question 1?
- Question 2?

---

## Phase 2 — Discuss

Surface findings to the human engineer and make decisions together:

1. Point to discuss.
2. Point to discuss.

Do not proceed to Plan until the human engineer confirms [key decision].

---

## Phase 3 — Plan

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/{phase}-track-{x}-{name}/`.

The plan should cover:
- Key area 1
- Key area 2

---

## Phase 4 — Execute

[What to build or write.]

Verification:
- Check 1
- Check 2
```

## Rules

- Scope must be one sentence — specific, not vague.
- Explore phase must list concrete files to read and concrete questions to answer. A session must be able to start immediately without further prompting.
- Discuss phase must end with an explicit gate: "Do not proceed to Plan until the human engineer confirms X."
- Skills section must only list skills that are genuinely useful for this track — not every available skill.
- If Phase 3 (Plan) is optional (e.g. the track is a strategy/decision track with no implementation), say so explicitly: "Only needed if the decision requires changes. If no changes are needed, skip to Phase 4."
- No time estimates. No emojis. No `---` dividers except between phases.

## After Writing

Report the filename created and confirm it follows the naming convention.
