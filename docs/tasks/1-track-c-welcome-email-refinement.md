# 1-Track-C — Welcome Email Refinement

**Phase:** 1
**Track:** C
**Scope:** Review and refine the welcome email sent to subscribers after they confirm their subscription.

**Dependencies:** None

**Deliverables:**
- Updated welcome email HTML template in `snippet/n8n-workflows/workflow-confirmation.md` Node 11

**Out of scope:**
- The newsletter email template (manual-content-generation.md Step 5)
- The confirmation email sent before the subscriber clicks confirm
- Changes to the confirmation workflow logic

**Skills:**
- `prompt-architect` — useful for refining the email copy: tone, structure, and messaging precision
- `product-designer` — for evaluating the welcome email as a subscriber experience touchpoint

---

## Phase 1 — Explore

Read the following files in order:

0. `./README.md` - understand the workflow
1. `snippet/n8n-workflows/workflow-confirmation.md` — focus on Node 11 (Gmail: Send Welcome Email), read the full HTML template carefully
2. `snippet/n8n-workflows/manual-content-generation.md` — read the newsletter email template (Step 5) to understand the visual and copy language of the broader Snippet brand

After reading, answer these questions:

- What is the current welcome email saying? What is the tone and structure?
- Is the copy consistent with the newsletter brand voice established in the newsletter template?
- What does the email promise the subscriber? Is it accurate and specific?
- Are there any structural or formatting issues (spacing, font sizes, link styles)?
- What feels off or weak — copy, structure, or both?

---

## Phase 2 — Discuss

Present findings to the human engineer:

1. Show a plain-text summary of what the current welcome email communicates.
2. Call out specific lines or sections that feel weak, inconsistent, or inaccurate.
3. Propose specific rewrites for discussion — keep suggestions minimal and focused.
4. Agree on what changes to make before touching the template.

Do not proceed to Plan until the human engineer approves the revised copy and structure.

### Agreed Changes

1. Subject: `Welcome to Snippet` (no "newsletter" label — subscriber just confirmed, has full context; body establishes format immediately)
2. Remove "Smart move." — flattery, inconsistent with newsletter tone
3. Merge AI sentence and ownership sentence into one paragraph (remove `<br>` between them)
4. Remove challenge bullet ("Challenge: What's this actually doing?") — implicit from the format
5. Remove "Copyable code. 2-minute read. Real skill-building." — redundant with bullets; "Real skill-building" is an unsubstantiated claim
6. Remove "First one Monday." — schedule already covered by bullet header
7. Elevate trending code language in snippet bullet: "One snippet from a repo engineers are reading this week (8–12 lines)"
8. Add project context as third bullet: "Project context: where the code came from"

### Approved Copy

Subject: Welcome to Snippet

You signed up for Snippet.

AI generates code faster than you can read it. But you're still the one who reviews it, merges it, owns it.

Can you read it well enough to trust it?

Every Mon/Wed/Fri, 7am:
- One snippet from a repo engineers are reading this week (8–12 lines)
- Breakdown: The pattern you need to see faster
- Project context: where the code came from

Train your eye. Ship with confidence.
Snippet

---

## Phase 3 — Plan

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/1-track-c-welcome-email-refinement/`.

The plan must show:
- Exact old HTML sections and their replacements
- Nothing outside the agreed changes should be touched

---

## Phase 4 — Execute

Apply the changes to Node 11 in `snippet/n8n-workflows/workflow-confirmation.md`.

Verification:
- Re-read the full updated template and confirm it reads naturally end-to-end
- Confirm unsubscribe link is still present and correct
- Confirm no structural HTML was broken
