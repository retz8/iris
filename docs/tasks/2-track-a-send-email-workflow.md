# 2-Track-A — Send Email Workflow

**Phase:** 2
**Track:** A
**Scope:** Design and document the n8n workflow that sends scheduled newsletter emails to confirmed subscribers (Workflow 2).

**Dependencies:** Phase 1 Track B must be complete (Newsletter Drafts sheet must be populated).

**Deliverables:**
- `snippet/n8n-workflows/workflow-send-email.md` — full node-by-node implementation plan following the format of `workflow-confirmation.md`

**Out of scope:**
- Building or activating the workflow in n8n (plan only)
- Changes to the subscriber schema
- Changes to the email template

**Skills:**
- `n8n-skills-2.2.0` — primary reference for n8n node types, Gmail node, Google Sheets node, cron trigger configuration
- `create-implementation-plan` — required for writing the Plan phase artifact
- `sequential-thinking` — useful for reasoning through the send sequence, failure handling, and sheet update ordering

---

## Phase 1 — Explore

Read the following files in order:

1. `snippet/n8n-workflows/google-sheets-drafts-schema.md` — understand the full drafts sheet schema, especially the `status`, `scheduled_day`, `gmail_draft_id`, and `sent_date` fields and how Workflow 2 is expected to interact with them
2. `snippet/n8n-workflows/google-sheets-subscribers-schema.md` — understand the subscribers sheet: which fields are needed to send an email (email, unsubscribe_token, status)
3. `snippet/n8n-workflows/workflow-confirmation.md` — study the node-by-node documentation format to match exactly

After reading, answer these questions:

- What is the exact trigger condition? (cron schedule, day filter, status filter)
- What is the sequence of operations: read drafts → fetch Gmail draft content → read subscribers → send per subscriber?
- How does the workflow fetch the actual email content from Gmail given a `gmail_draft_id`?
- How should `sent_date` and `status` be updated after a successful send?
- What should happen if a send fails mid-batch (some subscribers sent, some not)?
- How does the unsubscribe token get injected into each outgoing email?

---

## Phase 2 — Discuss

Surface findings to the human engineer and make decisions together:

1. Confirm the send sequence — does the workflow send one email per subscriber per draft, or one combined email?
2. Discuss failure handling — if Gmail send fails for one subscriber, continue or abort?
3. Discuss how the unsubscribe token is injected — is it a find-and-replace on the draft HTML?
4. Confirm the cron schedule timezone (what timezone does the n8n instance run in?).
5. Confirm whether `status` should be updated atomically or after all sends complete.

Do not proceed to Plan until the human engineer confirms the send sequence and failure handling approach.

---

## Phase 3 — Plan

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/2-track-a-send-email-workflow/`.

The plan must cover:
- Full node graph with node types, purpose, and configuration
- Exact filter logic for selecting today's scheduled drafts
- Subscriber fetch and iteration strategy
- Unsubscribe token injection into email HTML
- Sheet update logic (sent_date, status → "sent")
- Error handling per node

---

## Phase 4 — Execute

Write `snippet/n8n-workflows/workflow-send-email.md` following the node-by-node format of `workflow-confirmation.md`.

Verification:
- Every node has: type, purpose, full configuration, and expected output
- The workflow covers the complete path from cron trigger to sheet update
- All open questions from Discuss phase are resolved in the doc
