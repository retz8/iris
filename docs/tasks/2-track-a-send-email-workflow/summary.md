# Summary: Send Email Workflow

## Problem Statement

Phase 1 Track B produced a Newsletter Drafts sheet populated with Gmail draft IDs, statuses, and scheduled send days. No workflow existed to actually send those drafts to subscribers. This track designs and documents Workflow 2 — the cron-triggered send pipeline that takes scheduled drafts, personalizes them per subscriber, sends them, and marks them sent.

## Decisions Made (Discuss Phase)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Unsubscribe token placeholder | `UNSUBSCRIBE_TOKEN` in draft HTML | Confirmed from actual Gmail draft output — literal string replaced in Code node via JS `.replace()` |
| Multi-language subscriber assignment | Random pick per run | Subscriber with `Python,JS/TS` gets one language randomly selected each send; prevents double-emails when both drafts are scheduled the same day |
| Send failure handling | Best-effort (continue) | Workflow continues after per-subscriber failures; errors surface in n8n Executions tab |
| Draft status update timing | Once after all subscribers complete | Simple and safe for early stage; fires on Split In Batches done output |
| Error log schema | New "Send Errors" Google Sheet | One row per failure: `timestamp`, `execution_id`, `issue_number`, `gmail_draft_id`, `programming_language`, `subscriber_email`, `error_type`, `error_message`, `resolved` |

## What Was Built

Two new schema/workflow docs in `snippet/n8n-workflows/`:

**`google-sheets-send-errors-schema.md`**
Schema for the Send Errors sheet. Tracks per-subscriber send failures and draft status update failures for manual recovery. Human-managed `resolved` column for triaging.

**`workflow-send-newsletter.md`**
Full node-by-node implementation plan for Workflow 2. 14 nodes total:

| Node | Type | Purpose |
|------|------|---------|
| 1 | Schedule Trigger | Cron: Mon/Wed/Fri at 7am (`0 7 * * 1,3,5`) |
| 2 | Code | Get today's day abbreviation (`mon`/`wed`/`fri`) |
| 3 | Google Sheets | Fetch all confirmed subscribers once per run |
| 4 | Google Sheets | Fetch scheduled drafts for today |
| 5 | Loop Over Items | Outer loop: one draft at a time |
| 6 | Gmail | Get draft by ID (`$json.html` and `$json.subject` already decoded) |
| 7 | Code | Extract HTML and metadata — no base64 decode needed |
| 7a | IF | Route draft decode failures to error log |
| 7b | Google Sheets | Append `draft_decode_failed` to Send Errors |
| 8 | Code | Filter subscribers by language + random pick for multi-language subscribers |
| 9 | Split In Batches | Inner loop: one subscriber at a time (explicit reconnect required) |
| 10 | Code | Replace `UNSUBSCRIBE_TOKEN` with subscriber's actual token |
| 11 | Gmail | Send email — output reconnects to Node 9 to advance loop |
| 13 | Google Sheets | Update draft row: `status = "sent"`, `sent_date = now` (Continue on Error: ON) |
| 14 | IF | Route draft status update failures to error log |
| 14a | Google Sheets | Append `sheet_update_failed` to Send Errors |

## Technical Issues Resolved During Build

**`Buffer` not available in n8n Code node**
Initially planned to decode Gmail's base64 body using `Buffer.from()`. n8n's sandbox does not expose `Buffer` as a global and `require('buffer')` is also blocked. Resolved by discovering that n8n's Gmail node already decodes the draft — `$json.html` and `$json.subject` are ready to use directly. No decoding needed.

**Inner subscriber loop only sending to first subscriber**
`Loop Over Items` sends all items through the loop output in a single pass — it does not iterate one-at-a-time even with `batchSize: 1`. Switched inner loop to `Split In Batches` with an explicit reconnect from Gmail Send back to the Split In Batches input. This explicit reconnect is what drives sequential iteration.

**IF branching inside Split In Batches**
An IF node inside the subscriber loop (for per-subscriber error logging to GSheets) caused the loop to stop after the first iteration. The loop body must be a linear chain — no IF branching. Send failure logging is deferred to the n8n Executions tab.

## Known Limitations

- Per-subscriber Gmail send failures are not written to the Send Errors sheet — they appear only in n8n's Executions tab. Proper per-subscriber error logging requires n8n's Error Workflow feature to avoid breaking the loop.
- Multi-language subscriber random assignment is non-deterministic: a subscriber with `Python,JS/TS` may get the same language two runs in a row. Deterministic assignment (e.g., round-robin by day) is a future improvement.
- If Node 13 (draft status update) fails, the draft stays `scheduled` and will be resent on the next matching day. The `sheet_update_failed` error log entry is the recovery signal.

## Follow-up Condition

Activate and test Workflow 2 in n8n against real scheduled drafts. Once confirmed working end-to-end, revisit per-subscriber error logging with n8n Error Workflow.
