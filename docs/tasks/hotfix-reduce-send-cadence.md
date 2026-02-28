# Hotfix — Reduce Send Cadence to Tue/Thu

**Type:** Hotfix
**Scope:** Change the newsletter send schedule from Mon/Wed/Fri (9 drafts/week) to Tue/Thu (6 drafts/week) across the n8n send workflow, landing page copy, welcome email, and content generation skills.

**Dependencies:** None

**Deliverables:**
- `snippet/n8n-workflows/workflow-send-newsletter.md` — cron trigger updated to Tue/Thu
- `web/index.html` and any web components — schedule copy updated
- `snippet/n8n-workflows/workflow-confirmation.md` — welcome email schedule copy updated
- `.claude/skills/discover-oss-candidates/SKILL.md` — issue count updated (3 → 2 per language)
- `.claude/skills/find-snippet-candidates/SKILL.md` — issue count updated if referenced
- `.claude/skills/generate-snippet-draft/SKILL.md` — issue count updated if referenced

**Out of scope:**
- Changing the number of languages (Python, JS/TS, C/C++ all stay)
- Modifying the Gmail Drafts to Sheets workflow (count validation is per-language per-run, stays at 3)
- Changing the Google Sheets schema
- Any marketing or distribution strategy changes

**Skills:**
- None required

---

## Phase 1 — Explore

Read the following files in order:

0. `./README.md` — understand the workflow
1. `snippet/n8n-workflows/workflow-send-newsletter.md` — find the cron trigger node and its day/time configuration
2. `web/index.html` — find all references to the send schedule (Mon/Wed/Fri, frequency, send days)
3. `web/src/components/snippet/FormatPreview.tsx` — check for any schedule references
4. `snippet/n8n-workflows/workflow-confirmation.md` — find Node 11 (welcome email) and locate the schedule mention
5. `.claude/skills/discover-oss-candidates/SKILL.md` — find all references to issue count, draft count, or "3 per language"
6. `.claude/skills/find-snippet-candidates/SKILL.md` — same as above
7. `.claude/skills/generate-snippet-draft/SKILL.md` — same as above

After reading, answer these questions:

- What exact text in the cron trigger node specifies Mon/Wed/Fri? What values need to change for Tue/Thu?
- What exact phrases on the landing page mention the send days or frequency?
- Does the welcome email reference specific days or just a count (e.g. "3x per week")?
- Do any of the three skills (A/B/C) hardcode "3 issues" or "9 drafts" or "Mon/Wed/Fri" anywhere?
- Are there any other files in `snippet/` or `web/` that reference the schedule that are not listed above?

---

## Phase 2 — Plan

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/hotfix-reduce-send-cadence/`.

The plan should cover:
- Exact node and field to update in the send workflow cron trigger (days of week)
- Exact copy changes for the landing page (find-and-replace targets)
- Exact copy changes for the welcome email Node 11
- Any skill SKILL.md lines that reference issue count or draft count that need updating
- Verification checklist (grep for old day names, count validation review)

---

## Phase 3 — Execute

Apply all changes identified in the plan:

1. Update the cron trigger in `workflow-send-newsletter.md` to Tue/Thu.
2. Update landing page schedule copy to reflect Tue/Thu cadence.
3. Update welcome email copy in `workflow-confirmation.md`.
4. Update any skill SKILL.md files that reference issue count or weekly draft count.

Verification:
- Grep the repo for `Monday`, `Wednesday`, `Friday`, `Mon/Wed/Fri`, `3x per week`, `three times` — confirm no stale schedule references remain in subscriber-facing or workflow files
- Confirm `workflow-gmail-drafts-to-sheet.md` count validation (3 per language per run) is unchanged — it does not need to change
- Confirm the total weekly draft count in skills/docs now reads 6 (not 9) wherever a total is stated
