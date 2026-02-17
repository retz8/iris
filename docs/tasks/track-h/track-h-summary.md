# Track H Summary: Newsletter Design Decisions

**For:** Track E (Landing Page) and Track F (Subscriber Management) implementation teams
**Date:** 2026-02-16
**Status:** All design decisions finalized

This document contains all decisions from Track H that Track E and F need to implement the newsletter.

## Newsletter Identity

**Name:** Snippet
**Tagline:** "Code reading challenges for the AI era"
**Domain:** iris-codes.com/snippet
**Sender Name:** "Snippet" (no "by IRIS")
**Email Address:** snippet@iris-codes.com
**Frequency:** Mon/Wed/Fri at 7am

## Target Audience

Mid-level engineers (2-5 years experience) who:
- Work with AI-generated code (Copilot, Cursor)
- Want to improve code reading skills
- Prefer direct, no-BS content
- Read on mobile during morning coffee

## Landing Page (Track E Implementation)

### Platform & Hosting
- Simple HTML/CSS (no framework)
- Hosted at: iris-codes.com/snippet
- Root domain (iris-codes.com) redirects to /snippet

### Design Requirements
- **Aesthetic:** Minimalist, clean, fast
- **NO dark mode** (not MVP)
- **Flexible color palette** (iterate during implementation)
- **Mobile-first** responsive design
- **Fast load time:** Under 2 seconds

### Signup Form Fields
```
Email (required, text input)
├─ Validation: email format
└─ Placeholder: "your@email.com"

Written Language (required, radio buttons)
├─ Option 1: English (en)
└─ Option 2: Korean (ko)

Programming Languages (required, checkboxes, multi-select)
├─ Option 1: Python
├─ Option 2: JS/TS (JavaScript/TypeScript)
└─ Option 3: C/C++
└─ Must select at least 1

Submit Button: "Subscribe"
```

### Form Submission
- **Endpoint:** n8n webhook (Track F provides URL)
- **Method:** POST
- **Payload:**
```json
{
  "email": "user@example.com",
  "written_language": "en",
  "programming_languages": ["Python", "JS/TS"],
  "source": "landing_page",
  "subscribed_date": "2026-02-16T12:00:00Z"
}
```

### Page Content Structure
```
Section 1: Hero
- Headline: "Can you read code faster than AI writes it?"
- Subheadline: "Code reading challenges. Mon/Wed/Fri mornings. 2 minutes."

Section 2: Format Preview
- Show example email structure:
  • Code snippet (8-12 lines)
  • Challenge: "Before scrolling: what does this do?"
  • Breakdown: 3 bullets
  • Project context

Section 3: Signup Form
- [Form fields above]
- Privacy note: "No spam. Unsubscribe anytime."

Footer:
- Unsubscribe link: iris-codes.com/unsubscribe
```

### Success State
After form submission:
- Show message: "You're subscribed! First Snippet arrives Monday 7am."
- OR redirect to: iris-codes.com/snippet/welcome

## Email Content Specifications (Track F Implementation)

### Subject Line Format
**Standard:** `Can you read this #001: <File Intent>`
**Challenge mode:** `Can you read this #004: ???`

Examples:
- `Can you read this #001: Authentication helper`
- `Can you read this #003: Thread-safe cache wrapper`
- `Can you read this #004: ???` (File Intent hidden)

### Email Structure
```
Subject: Can you read this #NNN: <File Intent or ???>

[Code Block - formatted HTML]

Before scrolling: what does this do?

The Breakdown
• What it does: [25-35 words]
• Key responsibility: [25-35 words]
• The clever part: [25-35 words]

Project Context
[40-50 words: repo name + description + why it's trending]

[Unsubscribe link]
```

### Code Block Format (CRITICAL)

**Use formatted HTML text with inline styles (NOT image)**

```html
<pre style="
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  background-color: #f6f8fa;
  padding: 16px;
  border-left: 3px solid #0969da;
  border-radius: 6px;
  overflow-x: auto;
  color: #24292f;
  margin: 20px 0;
"><code><span style="color: #cf222e;">def</span> <span style="color: #8250df;">authenticate</span>(username, password):
    user = User.query.filter_by(username=username).first()
    <span style="color: #cf222e;">if</span> user <span style="color: #cf222e;">and</span> user.check_password(password):
        <span style="color: #cf222e;">return</span> generate_token(user)
    <span style="color: #cf222e;">return</span> <span style="color: #0550ae;">None</span></code></pre>
```

**Syntax Highlighting Colors:**
- Keywords (def, if, return): `#cf222e` (red)
- Functions: `#8250df` (purple)
- Strings: `#0a3069` (dark blue)
- Numbers/literals: `#0550ae` (blue)
- Comments: `#6e7781` (gray)

**Why formatted text, not images:**
- Users can copy/paste code
- Accessible to screen readers
- Searchable (Cmd+F works)
- Fast (no image loading)

### Email Length
- **Total:** ~180 words
- **Read time:** 2 minutes
- **Breakdown:** 80-120 words (3 bullets, 25-35 words each)
- **Project context:** 40-50 words

### Footer
```
Python, JS/TS, C/C++ | Unsubscribe
```
- NO IRIS mention (clean, standalone brand)
- Unsubscribe link required (legally mandated)

## Welcome Email (Track F Implementation)

**Subject:** You merge it. Can you read it fast enough?

**Body:**
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

**Word count:** 82 words
**Tone:** Pragmatic professional, challenging but supportive

## Subscriber Management (Track F Implementation)

### Google Sheets Structure

**Sheet Name:** Newsletter
**Tab 1:** Subscribers

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| email | string | Yes | Primary key |
| written_language | string | Yes | "en" or "ko" |
| programming_languages | string | Yes | Comma-separated: "Python,JS/TS" |
| subscribed_date | timestamp | Yes | ISO 8601 format |
| source | string | Yes | "landing_page" |
| status | string | Yes | "active", "unsubscribed", "bounced" |
| unsubscribed_date | timestamp | No | Null if active |

**Example Row:**
```
email: jane@example.com
written_language: en
programming_languages: Python,JS/TS
subscribed_date: 2026-02-16T12:00:00Z
source: landing_page
status: active
unsubscribed_date: null
```

### Workflow 3: Subscriber Signup (n8n)

```
Webhook (POST /webhook/subscribe)
    ↓
Code Node: Validate email format
    ↓
Code Node: Check for duplicates (query Google Sheets by email)
    ↓
Google Sheets: Append new row (if not duplicate)
    ↓
Gmail: Send welcome email
```

## Unsubscribe Mechanism (Track F Implementation)

### Simple One-Click Flow

```
User clicks "Unsubscribe" in email footer
    ↓
URL: iris-codes.com/unsubscribe?email=user@example.com
    ↓
n8n webhook: POST /webhook/unsubscribe
    ↓
Google Sheets: Update subscriber row
    - Match by email
    - Set status = "unsubscribed"
    - Set unsubscribed_date = current timestamp
    ↓
Show confirmation page:
    "You're unsubscribed from Snippet."
    (Optional: "Changed your mind? Resubscribe")
```

### n8n Unsubscribe Workflow

```
Webhook (GET /webhook/unsubscribe?email=xxx)
    ↓
Code Node: Extract and validate email from query param
    ↓
Google Sheets: Search for email
    ↓
If found:
    Google Sheets: Update row
        - status = "unsubscribed"
        - unsubscribed_date = NOW()
    ↓
    Return HTML: "You're unsubscribed from Snippet."

If not found:
    Return HTML: "Email not found in our list."
```

### Unsubscribe Page (HTML)

**File:** iris-codes.com/unsubscribed (or show inline from n8n)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Unsubscribed - Snippet</title>
    <style>
        body { font-family: sans-serif; text-align: center; padding: 100px; }
        h1 { font-size: 24px; margin-bottom: 16px; }
        p { color: #666; }
        a { color: #0969da; text-decoration: none; }
    </style>
</head>
<body>
    <h1>You're unsubscribed from Snippet.</h1>
    <p>You won't receive any more emails from us.</p>
    <p><a href="https://iris-codes.com/snippet">Changed your mind? Resubscribe</a></p>
</body>
</html>
```

## Measuring Unsubscribe Rate

**Formula:**
```
Unsubscribe Rate (per email) = (Unsubscribes / Emails Sent) × 100
```

**Tracking:**
- Count rows where `status` changed from "active" to "unsubscribed" within time window
- Compare against total emails sent (from drafts sheet)

**Benchmarks:**
- < 0.5%: Excellent
- 0.5-1%: Good
- 1-2%: Average
- > 2%: Investigate specific issue
- > 5%: Add preference management

**When to Review:**
- After first 10 emails (establish baseline)
- Monthly trend analysis
- Spike detection (if single issue > 2%)

## Language & Content Variants

### Content Matrix
| Written Language | Programming Languages | Variants Needed |
|------------------|----------------------|-----------------|
| en | Python, JS/TS, C/C++ | 3 variants |
| ko | Python, JS/TS, C/C++ | 3 variants |
| **Total** | | **6 variants per issue** |

### Matching Logic (Workflow 2)
When sending emails:
1. Match subscriber's `written_language` exactly
2. Select ONE snippet from subscriber's `programming_languages` list
3. If subscriber selected multiple languages, randomly pick one for each issue

**Example:**
```
Subscriber: written_language=en, programming_languages=Python,JS/TS
Mon email: Send en + Python snippet
Wed email: Send en + JS/TS snippet
Fri email: Send en + Python snippet
```

## Technical Implementation Checklist

### Track E (Landing Page) Must Build:
- [ ] Landing page HTML/CSS at iris-codes.com/snippet
- [ ] Signup form with 3 fields (email, written language, programming languages)
- [ ] Form validation (email format, at least 1 programming language selected)
- [ ] POST to n8n webhook on submit
- [ ] Success confirmation message
- [ ] Mobile-responsive design
- [ ] Root domain redirect (iris-codes.com → iris-codes.com/snippet)

### Track F (Subscriber Management) Must Build:
- [ ] Google Sheets: Newsletter spreadsheet with Subscribers tab
- [ ] n8n Workflow 3: Webhook → Validate → Google Sheets → Welcome Email
- [ ] Welcome email template (HTML, 82 words, exact copy from above)
- [ ] n8n Unsubscribe Workflow: Webhook → Update Google Sheets → Confirmation page
- [ ] Unsubscribe confirmation page HTML
- [ ] Email template with formatted code blocks (inline styles)
- [ ] Test all email clients (Gmail, Outlook, Apple Mail, mobile)

## Assets Needed

**From Track H (provided):**
- Welcome email copy (final version above)
- Subject line format
- Code block HTML template with inline styles
- Email structure specification

**From Track E (to provide):**
- n8n webhook URL for signup
- Landing page URL (for footer links)

**From Track F (to provide):**
- n8n webhook URL for unsubscribe
- Google Sheets ID (for reference)

## Questions for Track E/F?

Contact the Track H team lead if you need clarification on:
- Branding decisions
- Content format
- Email copy
- Visual design direction

All major decisions are locked in. Implementation can proceed.
