# 4-Track-A — Copy Finalization

**Phase:** 4
**Track:** A
**Dependencies:** 3-Track-A (n8n Security Check) — COMPLETE, 3-Track-B (Web App UX/UI Review) — COMPLETE

## Scope

Audit and align copy across all four subscriber-facing text surfaces:

1. Landing page — `web/src/components/snippet/Hero.tsx`, `SignupForm.tsx`, `Footer.tsx`
2. Confirmation email — subscription workflow Node 11 (`workflow-subscription-double-optin.md`)
3. Welcome email — confirmation workflow Node 11 (`workflow-confirmation.md`)
4. Newsletter email — structure, labels, subject line format (Gmail drafts)

The goal is a single consistent voice across the full subscriber journey: from first impression on the landing page through confirmation, welcome, and every issue they receive.

## Out of Scope

- HTML/CSS layout changes
- Workflow logic changes
- Unsubscribe page (error states are functional, not brand-facing — acceptable as-is unless flagged during Discuss)
- Newsletter issue content (human-written per issue, not templated)

## Deliverables

- Agreed final copy for all surfaces, documented in an implementation plan
- All code changes applied (Hero, SignupForm, ConfirmationPage, workflow .md files)
- No inconsistencies remain across the four surfaces

---

## Phase 1: Explore — Current Copy Inventory

### 1. Landing Page

**Fix location:** `web/` — edit directly in source files, then rebuild.
- `web/src/components/snippet/Hero.tsx` — headline and subheadline
- `web/src/components/snippet/SignupForm.tsx` — form labels, button CTAs, post-submit states
- `web/src/pages/ConfirmationPage.tsx` — confirmation page states (confirmed, already_confirmed, expired, etc.)
- `web/src/pages/UnsubscribePage.tsx` — unsubscribe flow states

**Hero (`Hero.tsx`)**
- Headline: `Can you read code faster than AI writes it?`
- Subheadline: `Reading code from trending repos. Train your eyes / Mon/Wed/Fri mornings. 2 minutes.`

**SignupForm (`SignupForm.tsx`)**
- Step 1 CTA button: `Subscribe`
- Step 2 CTA button: `Complete subscription`
- Privacy line (both steps): `No spam. Unsubscribe anytime.`
- Post-submit pending heading: `Check your email`
- Post-submit pending body: `We sent a confirmation link to [email]. Click it to complete your subscription.`
- Post-submit hint: `Didn't receive it? Check your spam folder.`

**Footer (`Footer.tsx`)**
- `© 2026 Snippet · snippet.newsletter@gmail.com`

### 2. Confirmation Email (sent on signup, before user confirms)

**Fix location:** `snippet/n8n-workflows/workflow-subscription-double-optin.md` — update Node 11 (Gmail - Send Confirmation Email): Subject field and HTML Email Template. Changes must then be manually applied in the live n8n workflow.

**Subject:** `Confirm your Snippet subscription`

**Body:**
- Heading: `Confirm your subscription`
- Para 1: `You signed up for Snippet, the code reading challenge newsletter.`
- Para 2: `Click the button below to confirm your email address and complete your subscription:`
- Button: `Confirm Subscription`
- Small text: `This link expires in 48 hours.`
- Footer: `Didn't sign up? You can safely ignore this email.`

### 3. Welcome Email (sent after user confirms)

**Fix location:** `snippet/n8n-workflows/workflow-confirmation.md` — update Node 11 (Gmail - Send Welcome Email): Subject field and HTML Email Template. Changes must then be manually applied in the live n8n workflow.

**Subject:** `Welcome to Snippet`

**Body:**
- Para 1: `You signed up for Snippet.`
- Para 2: `AI generates code faster than you can read it. But you're still the one who reviews it, merges it, owns it.`
- Para 3: `Can you read it well enough to trust it?`
- Schedule header: `Every Mon/Wed/Fri, 7am:`
- Bullets:
  - `One snippet from a repo engineers are reading this week (8–12 lines)`
  - `Breakdown: The pattern you need to see faster`
  - `Project context: where the code came from`
- Sign-off: `Train your eye. Ship with confidence. / Snippet`
- Footer: `Python, JS/TS, C/C++ | Unsubscribe`

### 4. Newsletter Email (per-issue Gmail drafts)

**Fix location:** `snippet/n8n-workflows/deprecated/manual-content-generation.md` — update the prompts and HTML template used to compose each issue:
- Step 4 prompt — controls the breakdown field labels and instructions (`What it does`, `Key responsibility`, `The clever part`)
- Step 6 prompt + HTML template — controls the full email HTML structure, section headers, labels, and any structural copy around the snippet and breakdown

Structure defined by the manual content generation workflow. Current format:
- **Subject:** not yet standardized (human-written per issue)
- **Body structure:** snippet block + breakdown + project context
- No consistent sign-off or footer defined outside the unsubscribe token injection

---

## Phase 2: Discuss — Inconsistencies and Open Questions

### Identified inconsistencies

**I1 — Brand voice drop in the confirmation email**
The landing page opens with a direct, confident challenge: "Can you read code faster than AI writes it?" The confirmation email body falls to generic newsletter-signup language: "You signed up for Snippet, the code reading challenge newsletter." The phrase "code reading challenge newsletter" does not appear anywhere else and feels generic. The heading "Confirm your subscription" is also purely functional.

**I2 — Schedule representation varies**
- Landing page: `Mon/Wed/Fri mornings. 2 minutes.`
- Welcome email: `Every Mon/Wed/Fri, 7am:`
- Confirmation page (UI): `Your first Snippet arrives {day} at 7am EST.`
None of these are wrong, but they describe the same fact in three different ways. A consistent short form would read better.

**I3 — Welcome email opener is flat**
`You signed up for Snippet.` is intentionally spare but may read as cold immediately after confirmation. The next two paragraphs recover the voice well, but the opener sets a low ceiling.

**I4 — Newsletter email: no standardized subject line or footer**
The issue subject line is human-written per issue. No format has been decided. The unsubscribe footer is injected automatically, but there is no defined sign-off or structural footer beyond that.

**I5 — "Complete subscription" vs "Subscribe"**
Step 1 says "Subscribe", step 2 says "Complete subscription". The two-step flow is functional but the CTA change on step 2 may feel like a new commitment rather than completing what was started.

### Discuss methodology

Instead of answering Q1-Q6 directly, decisions will be informed by a simulated user-testing session using the `snippet-persona` sub-agent (`.claude/agents/snippet-persona.md`).

The persona is Alex, a mid-level software engineer with 4 years experience (Python/TS), who uses AI tools daily and has no prior knowledge of Snippet. The session walks Alex through each copy surface in subscriber order — landing page → form → post-submit → confirmation email → welcome email — asking open-ended first-impression questions. Reactions are synthesized into copy decisions that resolve Q1-Q6.

### Decisions — Landing page (Hero + SignupForm)

Resolved via Alex persona testing. Tested 5 headline/subheadline/CTA candidates, narrowed to C and A, then iterated subheadline variants to address medium signal and tone.

**LOCKED — Hero copy**
- Headline: `AI writes code faster than you can read it.`
- Subheadline: `Close the gap. One real snippet from trending repos — Mon/Wed/Fri, 2 minutes.`

Rationale: Statement framing (vs. question) converts better. "One real snippet" is specific enough that Alex could picture the format cold. "Close the gap" bridges the headline premise to the value prop without over-explaining. "Straight to your inbox" tested as filler and was cut — the email input field already signals medium.

**LOCKED — SignupForm step 1 CTA**
- Button: `Send me snippets` (replaces `Subscribe`)

Rationale: Concrete, product-specific, memorable. Alex: "a lot of CTAs say 'Get started' and you forget what you signed up for — this one I'd remember." Step 2 CTA (currently `Complete subscription`) and privacy line (`No spam. Unsubscribe anytime.`) unchanged pending Q6 decision.

**Note on I2 (schedule format):** The new subheadline standardizes to `Mon/Wed/Fri, 2 minutes` — no time of day. Other surfaces still vary. Will reconcile when welcome email and confirmation page are reviewed.

### Decisions — SignupForm step 2

**LOCKED — Step 2 CTA**
- Button: `Send me snippets` (replaces `Complete subscription`)

Rationale: Duplicate of step 1 CTA is intentional. Repeating the action felt natural to Alex — he didn't notice the repetition until prompted. "Complete subscription" read as paperwork; matching step 1 maintains momentum.

**LOCKED — Step 2 privacy line**
- Copy: `We'll match snippets to your selected languages.` (replaces `No spam. Unsubscribe anytime.`)

Rationale: The spam disclaimer is boilerplate that gets skipped. This line answers Alex's implicit question — "why does a newsletter need my stack?" — and confirms the selection is meaningful. Step 1 retains `No spam. Unsubscribe anytime.` where it's relevant.

### Decisions — Post-submit state (SignupForm success screen)

**LOCKED — Body copy**
- Before: `Click it to complete your subscription.`
- After: `Click it to verify your address.`

Rationale: "Complete your subscription" implied the user wasn't subscribed yet after clicking twice. "Verify your address" is accurate, low-stakes, and doesn't contradict the form momentum.

**LOCKED — Hint text**
- Before: `Didn't receive it? Check your spam folder.`
- After: `Usually arrives in under a minute. Not there? Check your spam folder.`

Rationale: Leading with "Didn't receive it?" planted doubt before the user had a chance to check. Flipped to lead with a positive time expectation, spam advice as fallback.

### Open questions for Discuss phase

**Q1.** What is the right tone for the confirmation email? Should it reflect the landing page's challenge framing, or stay intentionally neutral (since this email also serves as the "didn't sign up? ignore this" safety net)?

**Q2.** Should the schedule be stated consistently as `Mon/Wed/Fri at 7am EST` across all surfaces, or is variation acceptable?

**Q3.** Should the welcome email opener be changed? If so, what register — warmer, more direct, or stay spare?

**Q4.** What is the subject line format for newsletter issues? Options:
- `Snippet #1 — [language]: [topic]`
- `[language] snippet: [topic]`
- Free-form per issue
- Something else

**Q5.** Is there a desired sign-off for the newsletter email body (above the auto-injected unsubscribe footer)?

**Q6.** Keep "Complete subscription" on step 2, or change to something else (e.g., "Confirm email", "Continue")?

---

## Phase 3: Plan

_To be written after Discuss decisions are made. Will use the `create-implementation-plan` skill._

---

## Phase 4: Execute

_To be run after Plan is approved._

**Verification after changes:**
1. `npm run typecheck` — no TypeScript errors
2. `npm run lint` — no lint errors
3. `npm run build` — clean compile
4. Manual review: read all four surfaces in sequence as a new subscriber would experience them
