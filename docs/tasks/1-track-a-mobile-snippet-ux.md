# 1-Track-A — Mobile Snippet UX

**Phase:** 1
**Track:** A
**Scope:** Define and document a mobile-readability criterion for code snippet selection in the Snippet newsletter manual workflow.

**Dependencies:** None

**Deliverables:**
- Updated `snippet/n8n-workflows/manual-content-generation.md` — Step 2 prompt includes a concrete mobile-readability rule for snippet selection

**Out of scope:**
- Changing the email HTML/CSS template
- Changing the email layout or structure
- Automating snippet selection

**Skills:**
- `prompt-architect` — the core deliverable is rewriting a selection prompt; use this to refine the wording precisely
- `sequential-thinking` — useful for working through what "mobile-readable" means as a structured definition before committing to a rule

---

## Phase 1 — Explore

Read the following files in order:

1. `snippet/n8n-workflows/manual-content-generation.md` — understand the full 5-step manual workflow, especially Step 2 (snippet candidate selection) and Step 5 (HTML email template)
2. `snippet/n8n-workflows/google-sheets-drafts-schema.md` — understand the `file_intent` field and how snippets are described

After reading, answer these questions:

- What does the current Step 2 prompt say about snippet selection criteria? Does it mention line length, nesting depth, or readability?
- What CSS properties does the email `<pre>` block use? Does it already handle wrapping?
- What does "hard to read on mobile" concretely look like for a code snippet? (e.g. deeply nested, long variable names, lines > N chars)
- What properties make a snippet naturally mobile-readable without relying on wrapping?

---

## Phase 2 — Discuss

Surface the following findings to the human engineer and make decisions together:

1. Show what the current Step 2 selection criteria look like and what's missing.
2. Propose a concrete definition of "mobile-readable" — e.g. max line length, max nesting depth, preference for self-contained logic that reads top-to-bottom.
3. Discuss whether to add a hard rule ("reject any snippet with lines over X chars") or a soft preference ("prefer snippets that…").
4. Decide the exact wording to add to the Step 2 prompt.

Do not proceed to Plan until the human engineer confirms the rule definition and wording.

---

## Phase 3 — Plan

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/1-track-a-mobile-snippet-ux/`.

The plan should cover:
- Exact edit to `manual-content-generation.md` Step 2 prompt (show old text and new text)
- Whether any other steps in the workflow need updating

---

## Phase 4 — Execute

Apply the edit to `snippet/n8n-workflows/manual-content-generation.md`.

Verification:
- Re-read the updated Step 2 prompt and confirm the mobile-readability rule is clear and actionable for a human following the workflow
- No other files should need changes


--

## Skills
