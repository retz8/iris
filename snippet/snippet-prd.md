# Snippet — Product Reference

Snippet is a code reading challenge newsletter. Three times a week, subscribers receive one short code snippet from a trending open-source project, a challenge prompt, and a concise breakdown.

**Tagline:** "Code reading challenges for the AI era"
**Domain:** iris-codes.com
**Sender:** snippet@iris-codes.com
**Frequency:** Mon / Wed / Fri at 7am

## Target Audience

Mid-level engineers (2-5 YoE) who work with AI-generated code (Copilot, Cursor), want to improve code reading speed and pattern recognition, prefer direct content with no filler. Read on mobile during morning coffee.

## Email Format

**Subject line:** `Can you read this #NNN: <file_intent>`
- Standard: `Can you read this #001: Authentication helper`
- Challenge mode: `Can you read this #004: ???` (file intent hidden)

**Body structure:**
1. Code block (8-12 lines, inline HTML styles — NOT an image)
2. Challenge prompt: *"Before scrolling: what does this do?"*
3. Three-dot separator
4. "The Breakdown" (3 bullets, ~30-40 words each):
   - **What it does:** starts with a verb
   - **Key responsibility:** its role in the codebase
   - **The clever part:** non-obvious insight a mid-level engineer would miss
5. Project Context: repo link + one-sentence description (~40-50 words)
6. Footer: `Python, JS/TS, C/C++ | Unsubscribe`

**Total:** ~180 words, 2-minute read. No IRIS mention in footer — Snippet is a standalone brand.

**Code block styling** (inline CSS, `<pre><code>` — copyable, searchable, accessible):
- Background: `#f6f8fa`, border-left `3px solid #0969da`, border-radius `6px`
- Font: `Consolas, Monaco, 'Courier New', monospace`, 14px, 1.6 line-height
- Syntax colors: keywords `#cf222e`, strings `#0a3069`, comments `#6e7781`

**Content variants:** Python, JS/TS, C/C++ — one snippet per issue per language. Each subscriber receives the variant matching one of their selected programming languages (randomly rotated across issues).

## Subscription Flow

Double opt-in required (GDPR compliance, list quality).

```
Landing page form
    ↓
POST /webhook/subscribe (n8n)
    → Validate email + programming_languages
    → Check duplicate status
    → Write row (status: pending) + generate confirmation_token (UUID v4, 48hr expiry)
    → Send confirmation email
    ↓
User clicks confirmation link → GET/POST /webhook/confirm?token=xxx (n8n)
    → Validate token (existence, expiry, status)
    → Update row: status=confirmed, generate unsubscribe_token, clear confirmation_token
    → Send welcome email
    ↓
Active subscriber
    ↓
User clicks unsubscribe in email → /snippet/unsubscribe?token=xxx (frontend)
    → User confirms → POST /webhook/unsubscribe (n8n)
    → Update row: status=unsubscribed, clear tokens
```

**Token security:** UUID v4 via `crypto.randomUUID()`. Confirmation tokens: single-use, 48hr expiry. Unsubscribe tokens: permanent until used (cleared on unsubscribe).

## Data Model

Google Sheets doc named **"Newsletter"** with two sheets.

### Sheet: Newsletter Subscribers

| Column | Notes |
|--------|-------|
| email | Unique. Normalized to lowercase. |
| programming_languages | Comma-separated: `Python,JS/TS` |
| status | `pending` → `confirmed` → `unsubscribed` (or `expired`) |
| confirmation_token | UUID v4. Cleared after confirmation. |
| token_expires_at | NOW() + 48 hours. Cleared after confirmation. |
| unsubscribe_token | UUID v4. Generated on confirmation. Cleared on unsubscribe. |
| created_date | ISO 8601. Original signup — preserved on re-subscription. |
| confirmed_date | ISO 8601. Set on confirmation. |
| unsubscribed_date | ISO 8601. Set on unsubscribe. |
| source | `landing_page` |

Re-subscription: if `status=unsubscribed`, update existing row (new token, reset status to pending, preserve `created_date`).

### Sheet: Newsletter Drafts

| Column | Set by | Notes |
|--------|--------|-------|
| issue_number | Workflow 1 | Auto-incremented (max+1 from sheet) |
| status | Workflow 1 / Human | `draft` → `scheduled` → `sent` |
| gmail_draft_id | Workflow 1 | Links tracking row to Gmail draft |
| file_intent | Workflow 1 | 3-5 word noun phrase |
| repository_name | Workflow 1 | `owner/repo` |
| repository_url | Workflow 1 | Full GitHub URL |
| repository_description | Workflow 1 | One sentence |
| programming_language | Workflow 1 | `Python`, `JS/TS`, or `C/C++` |
| source | Workflow 1 | `HN #<id>` or `github_fallback` |
| created_date | Workflow 1 | ISO 8601 |
| scheduled_day | Human | `mon`, `wed`, or `fri` — set during Sunday review |
| sent_date | Workflow 2 | Set after send |

Each Sunday run writes 3 rows sharing the same `issue_number` (one per language).

## n8n Workflows

Platform: `retz8.app.n8n.cloud`

| Workflow | Trigger | Status |
|----------|---------|--------|
| Workflow 2: Email Send | Schedule — Mon/Wed/Fri 7am | Not built |
| Workflow 3: Subscription | Webhook POST `/subscribe` | Built |
| Workflow 4: Confirmation | Webhook GET/POST `/confirm` | Built |
| Workflow 5: Unsubscription | Webhook GET/POST `/unsubscribe` | Built |

Webhook base URL: `https://retz8.app.n8n.cloud/webhook/`

## Content Pipeline (Manual)

Content is generated manually every Sunday using Gemini (free chat with web search), then drafted directly in Gmail. See `docs/tasks/n8n-workflows/manual-content-generation.md` for the full prompt workflow.

**Sunday workflow (5 steps):**
1. **Find repo candidates** — Gemini prompt searches Hacker News, Reddit, dev.to, GitHub trending. Returns 3-5 candidates per language (Python, JS/TS, C/C++). Pick 1 per language.
2. **Find snippet candidates** — Gemini browses the repo and returns 5 raw code candidates (file path + verbatim code, no interpretation). Pick the best one.
3. **Generate breakdown** — Follow-up prompt produces: `file_intent`, `breakdown_what`, `breakdown_responsibility`, `breakdown_clever`.
4. **Export JSON** — Follow-up produces a clean JSON object ready to paste into the email template.
5. **Generate HTML email** — Follow-up fills the fixed HTML template with the JSON values. Paste into Gmail draft, add syntax-highlighted snippet manually.

**After drafting (every Sunday):**
1. 3 Gmail drafts ready (Python, JS/TS, C/C++)
2. In Google Sheets: set `status=scheduled` and `scheduled_day=mon/wed/fri` for each row
3. Workflow 2 picks up scheduled rows automatically at 7am on the matching day

## Landing Page

Tech: React + Vite, hosted on Vercel at `iris-codes.com`.

Routes:
- `/` or `/snippet` — signup page
- `/snippet/confirm?token=xxx` — email confirmation page (calls Workflow 4)
- `/snippet/unsubscribe?token=xxx` — unsubscribe confirmation page (calls Workflow 5)

Signup form fields: email (required), programming languages (multi-select: Python, JS/TS, C/C++, at least 1 required). Progressive disclosure: email first, then language selection after initial engagement.

## Welcome Email

**Subject:** `You merge it. Can you read it fast enough?`

Body (exact copy):
```
You signed up for Snippet. Smart move.

AI generates code faster than you can read it.
But you're still the one who reviews it, merges it, owns it.

Can you read it well enough to trust it?

Every Mon/Wed/Fri, 7am:
→ One code snippet from a trending OSS project (8–12 lines)
→ Challenge: What's this actually doing?
→ Breakdown: The pattern you need to see faster

Copyable code. 2-minute read. Real skill-building.

First one Monday.

Train your eye. Ship with confidence.
Snippet

Python, JS/TS, C/C++ | Unsubscribe
```
