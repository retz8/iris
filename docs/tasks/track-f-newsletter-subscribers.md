# Track F: Newsletter Subscriber Management

**Stream:** Newsletter Workflow 3 (from newsletter-n8n-plan.md)
**Scope:** n8n workflow, Google Sheets, Gmail
**Dependencies:** Track H must complete first (newsletter format/branding decisions needed)
**Blocks:** Track G (content pipeline needs subscriber system validated)

## Objective

Build n8n Workflow 3 to handle newsletter subscriber signups via webhook, validate email addresses, store subscribers in Google Sheets, and send welcome emails. This enables the MWF newsletter distribution to start collecting subscribers.

**Current State:**
- Workflow 2 (Send Newsletter) is complete (per newsletter-n8n-plan.md)
- No subscriber management workflow yet
- No landing page signup form
- Google Sheets structure defined in newsletter-n8n-plan.md but not created

**From Newsletter Plan:**
- MWF (Mon/Wed/Fri) morning newsletter
- Target audience: mid-level engineers (2-5 YoE) per thoughts.md
- Format: code snippet, challenge, breakdown, project context
- Users choose: written_language (en, ko) and programming_language (python, typescript, etc.)

## Context

Workflow 3 is the subscriber onboarding pipeline. It connects the landing page signup form to the Google Sheets subscriber database and sends a welcome email explaining what to expect. Once validated, it unblocks Workflow 1 (content pipeline automation).

**Google Sheets Structure (from newsletter-n8n-plan.md):**
Sheet 2: Subscribers
- email
- name
- written_language (en, ko)
- programming_language (python, typescript, etc.)
- subscribed_date
- source (landing_page)

**Key Decisions from Track H:**
- Newsletter name/branding
- Written languages to support (en, ko confirmed; others?)
- Programming languages to offer at signup
- Category system (start with it or add later?)

## Phase 0: Exploration

Follow these steps to understand the current state:

1. Review newsletter-n8n-plan.md Workflow 3 architecture
2. Check if Google Sheets for newsletter already exists (create if not)
3. Check Track H decisions document for newsletter branding/format decisions
4. Research signup form platforms (embedded HTML, Carrd, Typeform, custom)
5. Review n8n documentation for webhook, validation, Google Sheets nodes
6. Draft preliminary welcome email copy (subject, body, unsubscribe link)

## Phase 1: Discovery/Discussion (with human engineer)

### Topics to Discuss

Based on Phase 0 exploration, discuss and generate specific questions for:

1. **Signup Form Design** - Form location, field requirements, category selection, language support
2. **Email Validation** - Client-side vs server-side, format vs deliverability, error handling
3. **Duplicate Handling** - Same-email signup behavior, preference updates, confirmation flow
4. **Welcome Email Content** - Content structure, sample snippet inclusion, unsubscribe mechanism, tone
5. **n8n Workflow Details** - Webhook URL, security, error handling, success confirmation

Document specific questions and design decisions here after discussion.

## Phase 2: Implementation Planning

**Will be filled in after Phase 1 discussion.** Should include:
- n8n Workflow 3 node structure
- Signup form HTML/platform choice
- Google Sheets setup (create sheet, configure columns)
- Welcome email template
- Validation logic details

## Phase 3: Execution

**Will be filled in after Phase 2 planning.** Should include:
- n8n workflow construction (webhook, validation, Google Sheets, Gmail nodes)
- Signup form creation
- Welcome email template writing
- Google Sheets creation and column setup
- Webhook URL configuration

## Phase 4: Testing & Verification

**Will be filled in after Phase 3 execution.** Should include:
- Test signup flow end-to-end (submit form, check Google Sheets, receive welcome email)
- Test duplicate email handling
- Test invalid email rejection
- Test welcome email rendering (mobile, desktop email clients)
- Verify unsubscribe link works (if implemented)

## Acceptance Criteria

- [ ] **n8n Workflow 3 Working:**
  - Webhook receives POST requests from signup form
  - Email validation logic works (rejects invalid formats)
  - Duplicate detection works (same email not added twice, or preferences updated)
  - Subscriber data appends to Google Sheets correctly
  - Welcome email sends successfully

- [ ] **Google Sheets Structure:**
  - Sheet 2 (Subscribers) exists with correct columns
  - Columns: email, name, written_language, programming_language, subscribed_date, source
  - Sheet is accessible to n8n workflow (credentials configured)

- [ ] **Signup Form:**
  - Form live and accessible (on landing page or standalone)
  - Form fields: email (required), name (optional/required?), language preferences
  - Form submits to n8n webhook correctly
  - User-friendly error messages for validation failures
  - Success confirmation after signup (redirect or message)

- [ ] **Welcome Email:**
  - Professional, on-brand (aligns with Track H branding)
  - Explains what to expect (MWF cadence, code snippets, format)
  - Includes unsubscribe link (legally required)
  - Renders correctly in major email clients (Gmail, Outlook, Apple Mail)
  - Mobile-responsive

- [ ] **Data Quality:**
  - All signups recorded in Google Sheets with correct timestamp
  - Language preferences captured accurately
  - No duplicate emails (or duplicates handled appropriately)

## Files Likely to Modify/Create

Based on scope:

**n8n Workflow:**
- n8n Workflow 3 (no code files - configured in n8n UI)
- Workflow export JSON (for backup/version control)

**Google Sheets:**
- Newsletter Google Sheet - Sheet 2: Subscribers (create via Google Sheets UI)

**Signup Form:**
- `landing/signup.html` or embedded in `landing/index.html`
- `landing/signup.js` (if client-side validation)
- OR: Carrd/Typeform configuration (no code)

**Welcome Email Template:**
- Email template (HTML if fancy, plain text if simple)
- Could live in n8n workflow or separate file

## Claude Code Session Instructions

### Skills to Use

- **n8n-skills-2.2.0** - For n8n workflow construction, node configuration, webhook setup
- **frontend-design** - If creating custom signup form with HTML/CSS

### Tools Priority

- **Read** - Review newsletter-n8n-plan.md for Workflow 3 details
- **Write** - Create signup form HTML, welcome email template
- **WebFetch** - Check n8n documentation for node details
- **Bash** - Not needed (n8n is no-code, Google Sheets is UI)

### n8n Workflow 3 Structure

From newsletter-n8n-plan.md:
```
Webhook --------- Landing page form submits here
       |
       v
Code ------------ Validate email, check duplicates
       |
       v
Google Sheets --- Append new subscriber row
       |           [email, name, written_language, programming_language, subscribed_date, source]
       v
Gmail ----------- Send welcome email
```

### Key Configuration Steps

1. **n8n Webhook Node:**
   - Method: POST
   - Path: /webhook/subscribe
   - Response: JSON success message or redirect

2. **n8n Code Node (Validation):**
   - Validate email format (regex or library)
   - Check duplicates (read Google Sheets, compare emails)
   - Handle edge cases (empty fields, malformed data)

3. **n8n Google Sheets Node:**
   - Operation: append
   - Sheet: Newsletter (Sheet 2: Subscribers)
   - Columns: map webhook fields to sheet columns

4. **n8n Gmail Node:**
   - Operation: send
   - To: {{ $json.email }}
   - Subject: "Welcome to [Newsletter Name]"
   - Body: Welcome email template (HTML or plain text)

### Coordination

- **Before starting:**
  - Read `docs/tasks/UPDATES.md` to confirm Track H is complete
  - Extract newsletter branding/naming from Track H summary
  - Do NOT start without branding clarity (newsletter name, tone, written languages)

- **After completing:** Append summary to `docs/tasks/UPDATES.md` with:
  - n8n Workflow 3 webhook URL
  - Google Sheets created (link)
  - Signup form location
  - Welcome email template
  - Subscriber count (should be 0 initially)

## Notes

- **BLOCKED by Track H** - Need newsletter branding/format decisions before building signup flow
- **BLOCKS Track G** - Content pipeline needs subscriber system validated first
- Workflow 2 (Send Newsletter) already complete - can test immediately after Workflow 3 done
- Category system decision from thoughts.md: "start with categories from day one, or add after proving format works?" - discuss in Phase 1
- Unsubscribe mechanism is legally required (CAN-SPAM Act, GDPR) - must implement
- Keep signup form simple for MVP (email + language preferences only)
