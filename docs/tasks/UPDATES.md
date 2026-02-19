# Task Updates

## 2026-02-19

**1-Track-A — Mobile Snippet UX** — Done

Added mobile-readability guidance to the Snippet newsletter manual content generation workflow. Updated Step 2 prompt with a soft preference rule (no line > 65 chars, nesting depth ≤ 3 levels). Added a new Step 3 (Reformat for Mobile) that uses an LLM to reformat the chosen snippet before breakdown generation — line breaks and indentation only, no logic changes. Steps renumbered from 5 to 6 total. See `docs/tasks/1-track-a-mobile-snippet-ux/summary.md` for full change log.

**1-Track-B — Gmail Drafts to Sheets** — Done

Built n8n workflow that reads manually-written Gmail drafts and appends rows to the Newsletter Drafts Google Sheet. Dedup by `gmail_draft_id`, count validation for exactly 3 drafts per issue, fan-out Merge architecture to handle empty-sheet first runs. See `snippet/n8n-workflows/workflow-gmail-drafts-to-sheet.md` for full node-by-node doc.

**1-Track-C — Welcome Email Refinement** — Done

Refined the welcome email in `snippet/n8n-workflows/workflow-confirmation.md` Node 11. Tightened copy, removed redundant and weak lines, elevated the real-trending-code value prop, added project context bullet. Subject simplified to `Welcome to Snippet`. See `1-track-c-welcome-email-refinement/summary.md` for full change log.
