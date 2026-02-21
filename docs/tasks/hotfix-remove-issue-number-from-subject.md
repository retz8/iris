# Hotfix — Remove Issue Number from Email Subject

**Type:** Hotfix
**Scope:** Decide whether to remove `#[ISSUE_NUMBER]` from the subscriber-facing newsletter email subject line, and if yes, update all affected surfaces.

**Dependencies:** None.

**Deliverables:**
- Locked decision recorded in session
- If removing: subject format updated in `manual-content-generation.md`, `FormatPreview.tsx`, and `workflow-gmail-drafts-to-sheet.md`

**Out of scope:**
- Changes to `issue_number` as an internal field in Google Sheets schema or workflow logic

**Skills:**
- None required

---

## Phase 1 — Explore

Read the following files in order:

0. `./README.md` — understand the workflow
1. `snippet/n8n-workflows/content/manual-content-generation.md` — find the subject line template in Step 6 and the manual instruction to replace `[ISSUE_NUMBER]` when creating the Gmail draft
2. `web/src/components/snippet/FormatPreview.tsx` — see how the subject appears on the landing page preview
3. `snippet/n8n-workflows/workflow-gmail-drafts-to-sheet.md` — find the Code node that parses `issue_number` and `file_intent` from the subject via regex; note whether the Form Trigger also collects `issue_number` as a separate input

After reading, answer these questions:

- What is the exact current subject format and on which lines does it appear in each file?
- Which surfaces showing the issue number are subscriber-facing vs internal-only?
- If the number is removed from the subject, which workflow nodes break and what is the available fallback?

---

## Phase 2 — Discuss

Surface findings to the human engineer and make decisions together:

1. List every subscriber-facing surface that currently shows the issue number.
2. Explain the workflow dependency: the Code node parses `issue_number` from the subject — describe what breaks and what the fallback is.
3. Present the case for removal: new subscribers receiving issue #42 may feel they missed prior issues; `file_intent` alone is sufficient; manual replacement each week adds friction.
4. Present the case for keeping: long-term subscribers get a continuity signal; consistent with common newsletter conventions.

Do not proceed to Plan until the human engineer confirms whether to remove or keep the issue number.

---

## Phase 3 — Plan

Only needed if the decision is to remove. If keeping, skip to Phase 4.

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/hotfix-remove-issue-number-from-subject/`.

The plan should cover:
- Updated subject line template and manual instruction in `manual-content-generation.md`
- Updated preview subject in `FormatPreview.tsx`
- Updated Code node parsing logic in `workflow-gmail-drafts-to-sheet.md` to read `issue_number` from Form Trigger input instead of parsing from subject

---

## Phase 4 — Execute

Apply the changes from the plan.

Verification:
- `manual-content-generation.md` subject line template and Step 6 instruction no longer reference `[ISSUE_NUMBER]`
- `FormatPreview.tsx` preview subject matches the new format
- `workflow-gmail-drafts-to-sheet.md` Code node no longer parses `issue_number` from subject; reads Form Trigger input value instead
- Human engineer confirms the new subject format reads correctly
