---
name: create-hotfix-track-jioh-agent-workflow
description: "Generates a hotfix track definition document for the jioh agent workflow system. Use when asked to create a hotfix track for a small, out-of-band task between phases. Produces a file under docs/tasks/ following the hotfix-{name}.md format and updates README.md."
user-invocable: true
allowed-tools: Read, Write, Bash
---

# Create Hotfix Track — Jioh Agent Workflow

Generate a hotfix track definition document for a small, out-of-band task in the multi-session Claude Code workflow.

## What Is a Hotfix Track

A hotfix track is a small task completed between phases. It follows the same four-phase structure as a normal track (Explore, Discuss, Plan, Execute) with two differences:

- Filename: `hotfix-{name}.md` instead of `{phase}-track-{x}-{name}.md`
- No `summary.md` is produced when the track is done

## Before Writing

1. Read `docs/tasks/README.md` to understand the current workflow state.
2. Read the existing hotfix track at `docs/tasks/hotfix-remove-issue-number-from-subject.md` as a format reference.
3. Determine the filename: `hotfix-{name}.md` where `{name}` is a short kebab-case description of the task.

## Document Structure

Every hotfix track document must follow this exact structure:

```
# Hotfix — {Title}

**Type:** Hotfix
**Scope:** One sentence describing what this hotfix owns and delivers.

**Dependencies:** None | List of tracks that must complete first

**Deliverables:**
- Specific file or artifact that will exist when this hotfix is done

**Out of scope:**
- Things this hotfix explicitly does not do

**Skills:**
- `skill-name` — one sentence on why it's relevant to this hotfix

---

## Phase 1 — Explore

Read the following files in order:

0. `./README.md` — understand the workflow
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

Only needed if [condition]. If not, skip to Phase 4.

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/hotfix-{name}/`.

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
- Explore phase must always start with `0. ./README.md — understand the workflow`.
- Explore phase must list concrete files to read and concrete questions to answer. A session must be able to start immediately without further prompting.
- Discuss phase must end with an explicit gate: "Do not proceed to Plan until the human engineer confirms X."
- Phase 3 (Plan) is often optional for hotfixes — if the track is purely a decision with no implementation, say so explicitly: "Only needed if the decision requires changes."
- Skills section must only list skills that are genuinely useful for this hotfix — not every available skill. Use `None required` if no skills are needed.
- No time estimates. No emojis. No `---` dividers except between phases.
- No pre-filled analysis or findings — the document is instructions for an agent, not a report.

## After Writing

1. Update `docs/tasks/README.md` to add the hotfix to the Workflow Overview under the "Hotfixes" section. If no Hotfixes section exists yet, add one after the last phase block:

```
Hotfixes (out-of-band, between phases)
  hotfix-{name} — one-line description
```

2. Report the filename created and confirm README.md was updated.
