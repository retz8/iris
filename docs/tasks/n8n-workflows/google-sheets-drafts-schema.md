# Google Sheets Schema: Newsletter Drafts

**Sheet Name:** Newsletter Drafts
**Purpose:** Store newsletter content drafts with code snippets, breakdowns, and project context for scheduled delivery.

## Overview

Repository for all newsletter issues (past, present, future). Each row represents one newsletter issue with all content variants for different programming languages. Used by content pipeline (Track G) and sending workflow.

## Column Definitions

| Column Name | Data Type | Required | Description | Example |
|-------------|-----------|----------|-------------|---------|
| issue_number | integer | Yes | Sequential issue number | 42 |
| status | string | Yes | Draft state | draft, scheduled, sent |
| subject_template | string | Yes | Email subject line template with placeholders | Can you read this #{issue_number}: {file_intent} |
| file_intent | string | Yes | One-line description of what the file does | Bash command validation hook |
| repository_name | string | Yes | GitHub repository name | anthropics/claude-code |
| repository_url | string | Yes | Full GitHub repository URL | https://github.com/anthropics/claude-code |
| repository_description | string | Yes | Why this repo is trending/interesting | Official CLI tool for Claude with extensibility hooks |
| programming_language | string | Yes | Code snippet language | Python, JavaScript, TypeScript, C, C++ |
| code_snippet | text | Yes | Actual code snippet (8-12 lines) | def _validate_command(command: str)...\n |
| challenge_question | string | Yes | Question before breakdown | Before scrolling: what does this do? |
| breakdown_what | string | Yes | What it does (1st bullet, 30-40 words) | Validates bash commands before execution by checking... |
| breakdown_responsibility | string | Yes | Key responsibility (2nd bullet, 30-40 words) | Acts as a pre-execution gate for the Bash tool... |
| breakdown_clever | string | Yes | The clever part (3rd bullet, 30-40 words) | Uses different exit codes for different outcomes... |
| content_variant | string | Yes | Programming language identifier | Python, JS/TS, C/C++ |
| created_date | datetime | Yes | ISO 8601 timestamp when draft was created | 2026-02-17T10:00:00Z |
| scheduled_date | datetime | No | ISO 8601 timestamp when newsletter is scheduled to send | 2026-02-19T07:00:00Z |
| sent_date | datetime | No | ISO 8601 timestamp when newsletter was sent | 2026-02-19T07:05:00Z |
| source | string | Yes | How this snippet was sourced | github_trending, manual_curation, community_submission |

## Status Values

| Status | Description | Next States |
|--------|-------------|-------------|
| draft | Content created but not ready for sending | scheduled, archived |
| scheduled | Ready to send, scheduled for specific date/time | sent, draft (if rescheduled) |
| sent | Successfully sent to subscribers | N/A (terminal state) |
| archived | Not sent, removed from queue | N/A |

## Content Variants

Each issue has **3 content variants** (one per programming language):

| Variant | Programming Language | Target Subscribers |
|---------|---------------------|-------------------|
| Python | Python | programming_languages contains Python |
| JS/TS | JavaScript/TypeScript | programming_languages contains JS/TS |
| C/C++ | C/C++ | programming_languages contains C/C++ |

**Storage Strategy:**
- One row per variant (3 rows per issue, different programming_language and content_variant)
- Simpler queries and better scalability than single-row-per-issue approach

## Data Validation Rules

**Issue Number:**
- Auto-increment starting from 1
- Sequential (no gaps)
- Unique per variant (e.g., issue #42 has 3 rows)

**Subject Template:**
- Must include `{issue_number}` and `{file_intent}` placeholders
- Max length: 100 characters (email subject line best practice)

**Code Snippet:**
- 8-12 lines of code (readability constraint)
- Properly formatted with indentation
- Syntax-highlighted in email (handled by email template)

**Breakdown Bullets:**
- Each bullet: 30-40 words
- Total breakdown: ~120 words max
- Clear, concise, actionable insights

**Timestamps:**
- Format: ISO 8601 with timezone (e.g., `2026-02-17T10:00:00Z`)
- Scheduled date must be Mon/Wed/Fri at 7:00 AM
- Sent date should match scheduled date (within 10 minutes tolerance)

## Usage Examples

**Draft (Python variant):**
| issue_number | status | subject_template | file_intent | repository_name | repository_url | repository_description | programming_language | code_snippet | challenge_question | breakdown_what | breakdown_responsibility | breakdown_clever | content_variant | created_date | scheduled_date | sent_date | source |
|--------------|--------|------------------|-------------|-----------------|----------------|----------------------|---------------------|--------------|-------------------|----------------|------------------------|-----------------|----------------|--------------|----------------|-----------|--------|
| 42 | draft | Can you read this #{issue_number}: {file_intent} | Bash command validation hook | anthropics/claude-code | https://github.com/... | Official CLI tool for Claude | Python | def _validate_command... | Before scrolling: what does this do? | Validates bash commands... | Acts as a pre-execution gate... | Uses different exit codes... | Python | 2026-02-17T10:00:00Z | null | null | github_trending |

**Scheduled (JS/TS variant):**
| issue_number | status | subject_template | file_intent | repository_name | repository_url | repository_description | programming_language | code_snippet | challenge_question | breakdown_what | breakdown_responsibility | breakdown_clever | content_variant | created_date | scheduled_date | sent_date | source |
|--------------|--------|------------------|-------------|-----------------|----------------|----------------------|---------------------|--------------|-------------------|----------------|------------------------|-----------------|----------------|--------------|----------------|-----------|--------|
| 43 | scheduled | Can you read this #{issue_number}: {file_intent} | TypeScript interface validator | facebook/react | https://github.com/... | Popular UI library | JS/TS | interface Props {...} | Before scrolling: what does this do? | TypeScript interface... | Type safety enforcement... | Generic type utilization... | JS/TS | 2026-02-18T09:00:00Z | 2026-02-21T07:00:00Z | null | manual_curation |

**Sent (C/C++ variant):**
| issue_number | status | subject_template | file_intent | repository_name | repository_url | repository_description | programming_language | code_snippet | challenge_question | breakdown_what | breakdown_responsibility | breakdown_clever | content_variant | created_date | scheduled_date | sent_date | source |
|--------------|--------|------------------|-------------|-----------------|----------------|----------------------|---------------------|--------------|-------------------|----------------|------------------------|-----------------|----------------|--------------|----------------|-----------|--------|
| 41 | sent | Can you read this #{issue_number}: {file_intent} | Memory pool allocator | torvalds/linux | https://github.com/... | Linux kernel | C/C++ | static inline void *... | Before scrolling: what does this do? | Custom memory allocator... | Reduces fragmentation... | Bit-packing optimization... | C/C++ | 2026-02-15T08:00:00Z | 2026-02-17T07:00:00Z | 2026-02-17T07:03:00Z | github_trending |

## Queries

**Get next scheduled issue for sending (Mon/Wed/Fri 7am cron):**
```
Filter: status = "scheduled" AND scheduled_date <= NOW()
Order by: scheduled_date ASC
Limit: 3 (all variants for one issue)
```

**Get all drafts for content pipeline:**
```
Filter: status = "draft"
Order by: created_date DESC
```

**Get sent issues for analytics:**
```
Filter: status = "sent"
Order by: sent_date DESC
```

**Get specific issue with all variants:**
```
Filter: issue_number = 42
```

## Workflow Integration

**Content Creation (Track G):**
1. Create 3 rows (one per variant) with same issue_number
2. Set status = "draft"
3. Populate all content fields
4. Set scheduled_date for next Mon/Wed/Fri 7am

**Newsletter Sending (n8n cron):**
1. Query: status = "scheduled" AND scheduled_date <= NOW()
2. For each variant, match with subscribers (programming_languages)
3. Send email to matched subscribers
4. Update status = "sent", sent_date = NOW()

**Content Preview (landing page):**
1. Query: status = "sent" AND content_variant = "Python"
2. Order by: sent_date DESC
3. Limit: 1 (most recent sent issue)
4. Use for landing page "What you'll receive" preview

## Maintenance

**Archive Old Drafts:**
- Find rows with status = "draft" AND created_date < (NOW() - 30 days)
- Update status = "archived" (keeps data for reference)

**Issue Number Generation:**
- Query max(issue_number) from all rows
- New issue_number = max + 1
- Create 3 rows with same issue_number, different content_variant

## Challenge Mode (Month 2+)

**Hide File Intent in 30-40% of Issues:**
- Add column: `challenge_mode` (boolean)
- If true: subject_template = "Can you read this #{issue_number}: ???"
- Email body hides file_intent until after breakdown
- Randomly select 30-40% of issues for challenge mode

## Security Notes

- No sensitive data stored (all content is public OSS code)
- Repository URLs validated (must be valid GitHub URLs)
- Code snippets sanitized before email sending (prevent XSS in email clients)
- Scheduled dates validated (must be future Mon/Wed/Fri 7am)
