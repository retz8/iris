# 3-Track-B — Web App UX/UI Review

**Phase:** 3
**Track:** B
**Scope:** Final UX/UI review of the web app before deployment — identify issues, discuss with the human engineer, and apply agreed adjustments.

**Dependencies:** Phase 1 and Phase 2 all tracks must be complete.

**Deliverables:**
- All agreed UX/UI adjustments applied to `web/`
- No new files or components unless explicitly agreed in Discuss

**Out of scope:**
- New features or pages not already built
- Backend changes
- Newsletter email template design

**Skills:**
- `ui-ux-pro-max` — for evaluating layout, spacing, typography, responsiveness, and component design
- `frontend-design` — for applying polished, production-grade fixes to React/Vite components
- `product-designer` — for evaluating the signup flow as a user experience end-to-end

---

## Phase 1 — Explore

Read the following to understand the current web app:

0. `./README.md` - understand the workflow
1. `web/` directory structure — understand what pages and components exist
2. Read the main page component(s) — landing page, signup flow, confirmation page, unsubscribe page
3. Read the CSS or styling approach (Tailwind, inline styles, CSS modules — identify which)

After reading, prepare a structured review covering:

**Layout and structure:**
- Does the page hierarchy make sense? Is the visual flow clear?
- Are there any obvious layout breakdowns at mobile widths?

**Typography and spacing:**
- Is font sizing consistent and readable at all breakpoints?
- Is spacing (padding, margin, gaps) consistent across sections?

**Signup flow:**
- Does the flow from landing → signup → confirmation feel smooth?
- Are error and success states handled clearly?

**Copy and messaging:**
- Does the copy match the Snippet brand voice?
- Is the value proposition clear above the fold?

**Visual consistency:**
- Are colors, border styles, and component styles consistent across pages?

---

## Phase 2 — Discuss

Present the review findings to the human engineer:

1. Walk through each area (layout, typography, signup flow, copy, consistency) with specific observations.
2. For each issue, show the exact component/file and line where it occurs.
3. Propose specific fixes — be concrete, not general.
4. Agree on what to change before proceeding.

Do not proceed to Execute until the human engineer confirms the agreed changes.

---

## Phase 3 — Plan

Only needed if changes are substantial (multiple files, interconnected components). If changes are small and isolated, skip directly to Execute.

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/3-track-b-web-app-ux-review/`.

---

## Phase 2 — Decisions Log

### Layout and Structure

**Issue 1 — Header/content horizontal misalignment**
Decision: INTENTIONAL. Header brand mark is left-aligned at desktop widths by design. No change.

**Issue 2 — Empty footer**
Decision: FIXED. Option D selected — `© 2026 Snippet · snippet.newsletter@gmail.com`. Contact email is the strongest trust signal for a developer audience. Committed in `8550b86`.
Files changed: `web/src/components/snippet/Footer.tsx`, `web/src/styles/components.css` (added `.footer-copy`), `snippet/README.md` (contact email added)

### Signup Flow

**Issue 5 — No scroll reset on step 1 → step 2 transition**
Decision: FIXED. Added `useRef` on the subscribe section + `useEffect` that calls `scrollIntoView({ behavior: 'smooth', block: 'start' })` when `showLanguageInputs` becomes true. Committed in `90adf29`.
File: `web/src/components/snippet/SignupForm.tsx`

**Issue 6 — Email field in step 2 fully editable, no back path**
Decision: FIXED. Standard clearable input pattern — `×` shows whenever the email field has any text (in both step 1 and step 2), hides when empty. Clicking `×` only clears the email value; no other state changes. Email is always editable. Language selections are not affected. Committed in `63ff484`.
Files: `web/src/components/snippet/SignupForm.tsx`, `web/src/styles/components.css`

### Copy and Messaging

**Issue 7 — "Reading codes" grammatical error**
Decision: FIXED. Changed to "Reading code from trending repos." Committed in `90adf29`.
File: `web/src/components/snippet/Hero.tsx:9`

**Issue 8 — Hard `<br />` in hero subheadline**
Decision: KEEP. Current structure works fine at all tested widths. No change.

### Visual Consistency

**Issue 9 — Unsubscribe vs. confirmation error states inconsistent**
Decision: FIXED. Unsubscribe error states (missing_token, not_confirmed, token_not_found, server_error) now use `.confirmation-home-link` for "Go to homepage" links. Success and already_unsubscribed states retain `.resubscribe-link` as a positive CTA. Committed in `90adf29`.
File: `web/src/pages/UnsubscribePage.tsx`

### Dead Code / Bugs

**Issue 10 — Orphaned function in Layout.tsx**
Decision: FIXED. Removed `enforceChatHistoryFinalBudget` function (lines 24–51) from Layout.tsx. Committed in `90adf29`.
File: `web/src/components/Layout.tsx`

**Issue 11 — App.css never imported**
Decision: KEEP for now. May be needed later. Created `snippet/before-release.md` with favicon/logo configuration task tracked there. Committed in `90adf29`.

### Typography and Spacing

**Issue 3 — `--font-serif` undefined in `.success-message h3`**
Decision: FIXED. Replaced with `--font-heading`. Committed in `9c51a21`.
File: `web/src/styles/components.css:291`

**Issue 4 — `--color-text-primary` undefined in `.email-subject`**
Decision: FIXED. Replaced with `--color-text`. Committed in `9c51a21`.
File: `web/src/styles/components.css:488`

---

## Phase 4 — Execute

Apply all agreed changes to `web/`.

Verification:
- Run the web app locally and visually confirm each change
- Check mobile and desktop widths
- Confirm the signup flow works end-to-end after any changes
