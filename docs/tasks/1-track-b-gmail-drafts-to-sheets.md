# 1-Track-B — Gmail Drafts to Sheets

**Phase:** 1
**Track:** B
**Scope:** Build a minimal n8n workflow that fetches manually-written Gmail drafts and appends the corresponding rows to the Newsletter Drafts Google Sheet.

**Dependencies:** None

**Deliverables:**
- A working n8n workflow (on `retz8.app.n8n.cloud`) that reads Gmail drafts and populates Newsletter Drafts sheet rows
- Workflow documented in `snippet/n8n-workflows/workflow-gmail-drafts-to-sheets.md`

**Out of scope:**
- Sending emails to subscribers (that is Workflow 2)
- Auto-generating draft content
- Modifying the existing subscriber or confirmation workflows

**Skills:**
- `n8n-skills-2.2.0` — primary reference for n8n node types, Gmail node, Google Sheets node configuration
- `create-implementation-plan` — required for writing the Plan phase artifact
- `sequential-thinking` — useful for working through parsing logic, field mapping, and edge cases (duplicate runs, missing fields)

---

## Phase 1 — Explore

Read the following files in order:

0. `./README.md` - understand the workflow
1. `snippet/n8n-workflows/google-sheets-drafts-schema.md` — understand all required fields, which are set by Workflow 1, which are set by human, and what can be parsed from a draft
2. `snippet/n8n-workflows/manual-content-generation.md` — understand the Gmail draft format: subject line pattern, HTML body structure, what structured data is embedded
3. `snippet/n8n-workflows/workflow-confirmation.md` — study the existing n8n workflow doc format and node-by-node structure to match the documentation style

After reading, answer these questions:

- Which Google Sheet fields can be reliably parsed from the draft subject line?
- Which fields can be parsed from the draft HTML body?
- Which fields cannot be derived from the draft at all and need a decision (e.g. `source`, `issue_number`)
- How does the existing n8n Gmail node return draft data? What does `gmail_draft_id` look like?
- What is the right trigger for this workflow — manual button, schedule, or webhook?

---

## Phase 2 — Discuss

Surface findings to the human engineer and make decisions together:

1. Show which fields are parseable from the draft vs which need a decision.
2. Discuss how the workflow identifies which drafts to process (subject pattern? time window? label?).
3. Discuss how to handle `source` field — blank, default to `"manual"`, or something else.
4. Discuss how `issue_number` should be determined — parsed from subject, read from sheet to get next value, or human-set.
5. Confirm the trigger type (manual is fine for now if volume is low).
6. Confirm whether the workflow should be idempotent — what happens if run twice on the same drafts?

Do not proceed to Plan until the human engineer has answered these open questions.

---

## Phase 3 — Plan

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/1-track-b-gmail-drafts-to-sheets/`.

The plan should cover:
- Full n8n workflow node graph (trigger → Gmail fetch → parse → Sheet append)
- Exact JavaScript logic for parsing subject and HTML body
- How each Google Sheet column gets its value
- Edge cases: duplicate drafts, missing fields, parsing failures

---

## Phase 4 — Execute

Build the workflow in n8n at `retz8.app.n8n.cloud`.

Then write `snippet/n8n-workflows/workflow-gmail-drafts-to-sheets.md` following the node-by-node documentation format used in `workflow-confirmation.md`.

Verification:
- Run the workflow against a real or test Gmail draft
- Confirm the correct rows appear in the Newsletter Drafts sheet with all required fields populated
- Confirm the workflow does not duplicate rows if run again
