# Google Sheets Schema: Send Errors

**Sheet Name:** Send Errors
**Purpose:** Log per-subscriber send failures during Workflow 2 (Send Newsletter). Enables post-run auditing and manual recovery without blocking the send batch.

## Column Definitions

| Column Name | Data Type | Required | Set by | Description | Example |
|-------------|-----------|----------|--------|-------------|---------|
| timestamp | datetime | Yes | Workflow 2 | ISO 8601 timestamp when error was caught | `2026-02-23T07:03:44Z` |
| execution_id | string | Yes | Workflow 2 | n8n execution ID (`$execution.id`) for correlating errors from the same run | `abc123xyz` |
| issue_number | integer | Yes | Workflow 2 | Issue number of the draft being sent | `42` |
| gmail_draft_id | string | Yes | Workflow 2 | Gmail draft ID of the email being sent | `r-9182736450198273` |
| programming_language | string | Yes | Workflow 2 | Language variant of the draft | `Python`, `JS/TS`, `C/C++` |
| subscriber_email | string | Yes | Workflow 2 | Email address of the subscriber who failed to receive | `user@example.com` |
| error_type | string | Yes | Workflow 2 | Short classification of failure | `gmail_send_failed`, `sheet_update_failed` |
| error_message | string | Yes | Workflow 2 | Raw error message from n8n node | `Gmail API quota exceeded` |
| resolved | string | No | Human | Human marks after investigating and resolving | `yes` or _(empty)_ |

**Column order in sheet:** `timestamp`, `execution_id`, `issue_number`, `gmail_draft_id`, `programming_language`, `subscriber_email`, `error_type`, `error_message`, `resolved`

## Error Type Values

| Error Type | Description |
|------------|-------------|
| `gmail_send_failed` | Gmail node failed to send the email to the subscriber |
| `sheet_update_failed` | Google Sheets update node failed to write `sent` status or `sent_date` after send batch |

## Behavior

- Errors are appended as new rows — one row per failed subscriber
- Workflow 2 continues sending to remaining subscribers after logging a failure (best-effort delivery)
- The draft row in Newsletter Drafts is still updated to `status = "sent"` after the batch completes, even if some sends failed
- The `resolved` column is human-managed — filter `resolved` is empty to find outstanding failures

## Workflow 2 Writes (per failed subscriber)

```
timestamp          = ISO 8601 timestamp at time of error
execution_id       = $execution.id from n8n
issue_number       = from draft row
gmail_draft_id     = from draft row
programming_language = from draft row
subscriber_email   = subscriber being sent to when failure occurred
error_type         = "gmail_send_failed" | "sheet_update_failed"
error_message      = error output from failed n8n node
resolved           = (empty — human fills)
```

## Human Recovery Workflow

1. Open Send Errors sheet after each Mon/Wed/Fri send run
2. Filter where `resolved` is empty
3. For `gmail_send_failed` rows: manually forward the Gmail draft to the subscriber's email
4. For `sheet_update_failed` rows: manually update the Newsletter Drafts row (`status = "sent"`, `sent_date`)
5. Mark `resolved = yes` after handling each row
