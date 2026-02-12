# Newsletter n8n Automation Plan

## Overview

A MWF (Mon/Wed/Fri) morning newsletter that sends trending open source code snippets to help developers improve their code reading skills. This is a pre-product audience builder for IRIS — educating developers about the importance of reading and understanding code in the AI era.

### Why This Newsletter

Most developers in the AI era accept AI-generated code without thorough review. They want to ship fast and the code is too much to read. This newsletter:
1. **Educates** readers about the importance of code reading — aligns with IRIS's mission
2. **Builds** a pool of potential IRIS users before the VS Code extension launches
3. **Collects** (optionally) data about how developers read code and what parts are difficult

### Newsletter Format (per issue)

```
1. Code Snippet        -> 8-12 lines from trending OSS, rendered as dark-mode image
2. The Challenge       -> "Before scrolling: what does this do?"
3. The Breakdown       -> What it does, key responsibilities, the clever part
4. Project Context     -> 1-2 sentences about the open source project
```

- Mobile-first (read on phone over morning coffee)
- Users choose preferred language (Python, TypeScript, etc.)
- Light but valuable — takes 3-5 min to read

---

## Architecture: 3 Workflows

### Workflow 1: Content Pipeline

**Trigger**: Every Sunday at 8pm (batches MWF content for the week)

```
Schedule Trigger (Sunday 8pm)
       |
       v
HTTP Request ---- GitHub Trending API
       |           (fetch trending repos by language)
       v
Code ------------ Filter & extract candidate files
       |           (pick files 8-15 lines, self-contained)
       v
HTTP Request ---- Fetch raw file content from GitHub
       |
       v
HTTP Request ---- Claude API (Anthropic)
       |           "What does this code do? 3 bullets."
       v
HTTP Request ---- Carbon API (code -> dark-mode image)
       |
       v
Code ------------ Compose full HTML email
       |           (mobile-first, inline CSS, embed image + breakdown)
       v
Gmail ----------- Create Draft (NOT send)
       |           (save as Gmail draft for human review)
       v
Google Sheets --- Write 3 rows (Mon/Wed/Fri)
                   [status: "draft", date, gmail_draft_id,
                    repo_name, repo_url, repo_description]
```

#### Node Details

| Step | n8n Node | Configuration |
|---|---|---|
| Trigger | `Schedule Trigger` | `rule.interval = [{ field: "weeks", triggerAtDay: [0], triggerAtHour: 20 }]` |
| Fetch trending | `HTTP Request` | `GET https://api.github.com/search/repositories?q=language:{lang}&sort=stars&order=desc&per_page=10` |
| Pick snippets | `Code` (JS) | Heuristics: 8-15 lines, self-contained, no imports-only files, has one "aha" moment |
| Generate breakdown | `HTTP Request` | `POST https://api.anthropic.com/v1/messages` — prompt asks for: what it does, responsibilities, the clever part. Under 100 words total |
| Render image | `HTTP Request` | `POST` to Carbon API — dark theme, syntax highlighted, 14-16px font, max 60 chars/line |
| Compose email | `Code` (JS) | Build mobile-first HTML (inline CSS, max-width 600px), embed code image + breakdown + project context |
| Save as draft | `Gmail` | `operation: "createDraft"` — subject line, full HTML body. Returns `gmail_draft_id` |
| Track in sheet | `Google Sheets` | `operation: "append"` — columns: `date`, `status`, `gmail_draft_id`, `repo_name`, `repo_url`, `repo_description` |

**Manual step after this runs**: Open Gmail, review 3 draft emails (~15 min) — you see exactly what subscribers will receive. Edit tone/layout directly in Gmail if needed. Then flip `status` from `"draft"` to `"approved"` in Google Sheets.

---

### Workflow 2: Send Newsletter ✅

**Trigger**: Mon/Wed/Fri at 7am

```
                    Schedule Trigger (MWF 7am)
                           |
                  ┌────────┴────────┐
                  v                 v
      Google Sheets (drafts)   Google Sheets (subscribers)
                  |                 |
                  v                 |
      Code --- Filter approved      |
               + last 7 days        |
                  |                 |
                  v                 |
      Gmail --- Fetch drafts        |
                by gmail_draft_id   |
                  |                 |
                  └────────┬────────┘
                           v
            Merge -------- Sync both branches
                           (waits for both inputs before proceeding)
                           |
                           v
            Code --------- Match fetched drafts to subscribers
                           (draft.programming_language == sub.programming_language
                            AND draft.written_language == sub.written_language)
                           Output: { email, name, subject, email_html, gmail_draft_id }
                           |
                           v
            Gmail -------- Send matched email to each subscriber
                           (resource: "message", operation: "send")
                           |
                           v
            Code --------- Remove duplicate draft IDs
                           (deduplicate by gmail_draft_id so each draft
                            is marked sent only once)
                           |
                           v
            Google Sheets - Update status -> "sent"
                            (match row by gmail_draft_id)
```

#### Node Details

| Step | n8n Node | Configuration |
|---|---|---|
| Trigger | `Schedule Trigger` | `rule.interval = [{ field: "weeks", triggerAtDay: [1,3,5], triggerAtHour: 7 }]` |
| Read drafts | `Google Sheets` | `operation: "read"` from drafts tab. Connected directly to trigger |
| Read subscribers | `Google Sheets` | `operation: "read"` from subscribers tab. Connected directly to trigger (parallel) |
| Filter drafts | `Code` (JS) | Filter to last 7 days + status == "approved". Pass through `gmail_draft_id`, `programming_language`, `written_language` |
| Fetch Gmail drafts | `Gmail` | `resource: "draft"`, `operation: "get"` — fetch each approved draft's full email HTML by `gmail_draft_id` |
| Merge | `Merge` | `mode: "combine"` — synchronization point that waits for both the Fetch Gmail branch and Read Subscribers branch before proceeding |
| Match + pair | `Code` (JS) | Access branches via `$('Fetch Gmail Draft').all()` and `$('Read Subscribers').all()`. For each subscriber, find the draft where `programming_language` and `written_language` match. Output: `{ email, name, subject, email_html, gmail_draft_id }` per pair |
| Send | `Gmail` | `resource: "message"`, `operation: "send"`. To: `{{ $json.email }}`, Subject: `{{ $json.subject }}`, HTML body: `{{ $json.email_html }}`. Gmail for <500 subs; switch to SendGrid/Resend via HTTP Request for scale |
| Remove duplicates | `Code` (JS) | Deduplicate by `gmail_draft_id` so each draft row is updated only once. References `$('Match + pair node').all()` |
| Mark sent | `Google Sheets` | `operation: "update"`, match row by `gmail_draft_id`, set `status` to `"sent"` |

---

### Workflow 3: Subscriber Management

**Trigger**: Webhook (landing page form submission)

```
Webhook --------- Landing page form submits here
       |
       v
Code ------------ Validate email, check duplicates
       |
       v
Google Sheets --- Append new subscriber row
       |           [email, name, language_pref, date]
       v
Gmail ----------- Send welcome email
```

#### Node Details

| Step | n8n Node | Configuration |
|---|---|---|
| Receive signup | `Webhook` | `POST /webhook/subscribe` — landing page form target |
| Validate | `Code` (JS) | Check email format, prevent duplicate subscriptions |
| Store | `Google Sheets` | `operation: "append"` to subscribers sheet |
| Welcome email | `Gmail` | Pre-written welcome: what to expect, MWF cadence, how to pick language |

---

## Automated vs Manual

| Automated | Manual (requires taste) |
|---|---|
| GitHub trending repo fetch | Final snippet selection |
| Snippet extraction + filtering | Review full email in Gmail drafts |
| Claude API breakdown generation | Edit tone/layout directly in Gmail |
| Code image rendering (Carbon) | Approve each issue (draft -> approved in Sheets) |
| HTML email composition + Gmail draft creation | |
| MWF scheduled sends | |
| Subscriber signup + welcome email | |

**Estimated time per issue after automation: ~10-15 min**

---

## Google Sheets Structure

### Sheet 1: Newsletter Drafts

| date | day | status | gmail_draft_id | written_language | programming_language | repo_name | repo_url | repo_description |
|---|---|---|---|---|---|---|---|---|
| 2026-02-16 | Mon | draft | r1234567890 | en | python | anthropics/claude-code | https://... | "CLI tool for..." |
| 2026-02-16 | Mon | draft | r9876543210 | ko | python | anthropics/claude-code | https://... | "CLI 도구..." |

- `written_language`: the language the email is written in (`en`, `ko`)
- `programming_language`: the code snippet's language (`python`, `typescript`, etc.)

Status lifecycle: `draft` -> `approved` -> `sent`

The full email content (snippet image, breakdown, HTML layout) lives in the Gmail draft — the sheet is just a tracking/approval layer. `gmail_draft_id` links to the actual email you review in Gmail.

### Sheet 2: Subscribers

| email | name | written_language | programming_language | subscribed_date | source |
|---|---|---|---|---|---|
| dev@example.com | Kim | ko | python | 2026-02-15 | landing_page |
| jane@example.com | Jane | en | typescript | 2026-02-15 | landing_page |

---

## Snippet Selection Criteria

Good snippets:
- 8-12 lines max (must fit on phone screen)
- Max 60 characters per line
- Self-contained (no missing imports/context needed)
- From recognizable projects (Next.js, FastAPI, etc.)
- Has one clear "aha" moment or non-obvious insight
- NOT: dense algorithms, config files, boilerplate

---

## Build Order

Build incrementally — start sending newsletters before full automation is ready:

1. ~~**Workflow 2 first** (sending) — manually write 3 issues in Google Sheets, get MWF send pipeline working~~ ✅ Done
2. **Workflow 3 next** (subscriptions) — webhook + Google Sheets + welcome email
3. **Workflow 1 last** (content pipeline) — most complex, automate after format is proven

---

## Email Platform Decision

| Scale | Solution |
|---|---|
| 0-500 subscribers | Gmail node (free, simple) |
| 500-5000 | Resend API via HTTP Request ($0.80/1000 emails) |
| 5000+ | SendGrid or ConvertKit (dedicated email platform) |

---

## Open Questions

- [ ] Newsletter name/branding (independent brand vs IRIS-branded?)
- [ ] Landing page platform (simple HTML? Carrd? Notion?)
- [ ] Start with one language or multiple from day one?
- [ ] Carbon API vs ray.so vs custom screenshot for code images?
- [ ] Unsubscribe mechanism (required by law)
