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

**Decisions made:**

1. **Parseable fields:**
   - From subject (`Can you read this #[ISSUE_NUMBER]: {{file_intent}}`): `issue_number`, `file_intent`
   - From HTML body (Project Context section): `repository_name`, `repository_url`, `repository_description`
   - From Gmail API metadata: `gmail_draft_id`, `created_date`
   - Hardcoded at write time: `status = "draft"`, `source = "manual"`
   - Left blank for human/Workflow 2: `programming_language`, `scheduled_day`, `sent_date`

2. **Draft identification:** Filter by subject containing `"Can you read this #"`. Already-sent drafts are excluded naturally — Workflow 2 (Track A) will prepend `[SENT]` to the subject after sending, which falls outside this filter.

3. **`source` field:** Default to `"manual"`.

4. **`issue_number`:** Parsed from the subject line per draft. All 3 drafts for a given Sunday share the same issue number because the human writes them that way.

5. **Trigger:** Manual button (n8n Execute Workflow trigger). Runs at most once per Sunday; low volume makes manual control preferable.

6. **Idempotency:** Check `gmail_draft_id` against existing sheet rows before appending. Skip any draft whose ID is already present.

7. **`programming_language`:** Left blank. Human fills this in the sheet alongside `scheduled_day` during Sunday review.

---

## Phase 3 — Plan

n8n workflow plan should follow the similar structure as snippet/n8n-workflows/workflow-confirmation

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
