# Google Sheets Schema: Newsletter Drafts

**Sheet Name:** Newsletter Drafts
**Purpose:** Track newsletter drafts by linking to Gmail draft IDs. Full email content lives in Gmail — this sheet is the control panel for status and scheduling.

## Column Definitions

| Column Name | Data Type | Required | Set by | Description | Example |
|-------------|-----------|----------|--------|-------------|---------|
| issue_number | integer | Yes | Workflow 1 | Sequential issue number, auto-incremented | 42 |
| status | string | Yes | Workflow 1 / Human | Current state of the draft | `draft`, `scheduled`, `sent` |
| gmail_draft_id | string | Yes | Workflow 1 | Gmail draft ID returned after draft creation | `r-9182736450198273` |
| file_intent | string | Yes | Workflow 1 | One-line description of what the code file does | `Bash command validation hook` |
| repository_name | string | Yes | Workflow 1 | GitHub repository name | `anthropics/claude-code` |
| repository_url | string | Yes | Workflow 1 | Full GitHub repository URL | `https://github.com/anthropics/claude-code` |
| repository_description | string | Yes | Workflow 1 | Why this repo is trending | `Official CLI tool for Claude` |
| programming_language | string | Yes | Workflow 1 | Language of this row's snippet | `Python`, `JS/TS`, `C/C++` |
| source | string | Yes | Workflow 1 | How the repo was discovered | `HN #39872345`, `github_fallback` |
| created_date | datetime | Yes | Workflow 1 | ISO 8601 timestamp when draft was created | `2026-02-17T10:00:00Z` |
| scheduled_day | string | No | Human | Day to send. Human picks during Sunday review. | `mon`, `wed`, `fri` |
| sent_date | datetime | No | Workflow 2 | ISO 8601 timestamp when email was sent | `2026-02-23T07:03:00Z` |

**Column order in sheet:** `issue_number`, `status`, `gmail_draft_id`, `file_intent`, `repository_name`, `repository_url`, `repository_description`, `programming_language`, `source`, `created_date`, `scheduled_day`, `sent_date`

## Status Values

| Status | Set by | Description |
|--------|--------|-------------|
| `draft` | Workflow 1 | Gmail draft created, pending human review |
| `scheduled` | Human | Human has reviewed and set `scheduled_day` |
| `sent` | Workflow 2 | Email sent to subscribers |

## scheduled_day Values

Human sets this during Sunday review — just type one of three values:

| Value | Sends on |
|-------|----------|
| `mon` | Monday at 7am |
| `wed` | Wednesday at 7am |
| `fri` | Friday at 7am |

Workflow 2 cron runs Mon/Wed/Fri at 7am and filters rows where `status = "scheduled"` AND `scheduled_day = today's day abbreviation`.

## Row Structure

Each Sunday run writes 3 rows — one per language — sharing the same `issue_number`:

| issue_number | status | gmail_draft_id | programming_language | scheduled_day |
|---|---|---|---|---|
| 42 | draft | `r-9182736450` | Python | _(human fills)_ |
| 42 | draft | `r-1827364501` | JS/TS | _(human fills)_ |
| 42 | draft | `r-8273645019` | C/C++ | _(human fills)_ |

## Human Review Workflow (Every Sunday)

1. Open Gmail — 3 new drafts waiting
2. Read each draft (Python, JS/TS, C/C++)
3. Edit content directly in Gmail if needed
4. In Google Sheets: for each row, set `status` to `scheduled` and `scheduled_day` to `mon`, `wed`, or `fri`
5. Workflow 2 picks up rows automatically on the matching day at 7am

## Workflow 1 Writes (per language row)

```
issue_number         = next_issue_number (from Node 3)
status               = "draft"
gmail_draft_id       = returned from Gmail Create Draft node
file_intent          = from Claude Haiku breakdown
repository_name      = from AI Code Hunter
repository_url       = constructed from repo_full_name
repository_description = from AI Code Hunter
programming_language = "Python" | "JS/TS" | "C/C++"
source               = "HN #<story_id>" | "github_fallback"
created_date         = ISO 8601 timestamp (auto)
scheduled_day        = (empty — human fills)
sent_date            = (empty — Workflow 2 fills)
```
