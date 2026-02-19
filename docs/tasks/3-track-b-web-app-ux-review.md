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

## Phase 4 — Execute

Apply all agreed changes to `web/`.

Verification:
- Run the web app locally and visually confirm each change
- Check mobile and desktop widths
- Confirm the signup flow works end-to-end after any changes
