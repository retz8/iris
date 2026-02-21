# Task Updates

## 2026-02-21 (continued)

**3-Track-B — Web App UX/UI Review** — Done

Full UX/UI review of the Snippet landing page (`web/`) before deployment. All agreed changes applied across 4 commits.

CSS bug fixes (`9c51a21`): corrected two undefined CSS variable references — `--font-serif` → `--font-heading` in `.success-message h3`, and `--color-text-primary` → `--color-text` in `.email-subject`.

Footer and contact (`8550b86`): added `© 2026 Snippet · snippet.newsletter@gmail.com` to the footer (previously empty). Contact email also added to `snippet/README.md`. `.footer-copy` style added.

Signup flow, copy, consistency, dead code (`90adf29`): smooth `scrollIntoView` when advancing email → language step; hero subheadline copy fixed ("Reading codes" → "Reading code"); unsubscribe error states (`missing_token`, `not_confirmed`, `token_not_found`, `server_error`) now use `.confirmation-home-link` for "Go to homepage" links, matching confirmation page styling; orphaned `enforceChatHistoryFinalBudget` function removed from `Layout.tsx`; `snippet/before-release.md` created to track favicon/logo task before launch.

Clearable email input (`63ff484`): standard clearable input pattern on the email field — `×` button appears when the field has text, hides when empty, clicking it only clears the value. Works in both signup step 1 and step 2. Decision log written to `docs/tasks/3-track-b-web-app-ux-review.md`.

## 2026-02-21

**2-Track-A — Send Email Workflow** — Done

Built and fully tested the n8n workflow that sends scheduled newsletter emails to confirmed subscribers. Documented in `snippet/n8n-workflows/workflow-send-newsletter.md`. Workflow uses no loop nodes — a single Code node (Node 7) builds the full send queue by combining drafts and subscribers, then Gmail Send processes each item automatically. Key fixes during testing: switched from `$items()` to `$input.all()` for IF node conditions, resolved Gmail draft ID matching via fallback field detection, and simplified draft HTML normalization. Schema files relocated to `snippet/schema/` as part of a folder refactor done alongside this track.

Send failures are logged to a new "Send Errors" Google Sheet (schema: `snippet/schema/google-sheets-send-errors-schema.md`). Three error types are captured: `gmail_send_failed` (Gmail node failed to deliver to a subscriber), `draft_decode_failed` (Gmail API returned a draft with no HTML body), and `sheet_update_failed` (Sheets update node failed to mark a draft as sent). Each row includes `timestamp`, `execution_id`, `issue_number`, `gmail_draft_id`, `programming_language`, `subscriber_email`, `error_type`, `error_message`, and a human-managed `resolved` field. Recovery is manual: filter unresolved rows after each send run and handle per error type.

## 2026-02-20

**2-Track-C — Timezone Strategy** — Done

Decided on US Eastern (`America/New_York`) as the single send timezone for the newsletter. n8n instance timezone must be changed from UTC to `America/New_York` in Settings. Two copy changes: welcome email Node 11 `7am` → `7am EST`, landing page schedule mention `7am` → `7am EST`. No schema changes, no workflow logic changes. See `docs/tasks/2-track-c-timezone-strategy/summary.md` for full rationale and `action-plan.md` for step-by-step manual instructions.

## 2026-02-19

**1-Track-A — Mobile Snippet UX** — Done

Added mobile-readability guidance to the Snippet newsletter manual content generation workflow. Updated Step 2 prompt with a soft preference rule (no line > 65 chars, nesting depth ≤ 3 levels). Added a new Step 3 (Reformat for Mobile) that uses an LLM to reformat the chosen snippet before breakdown generation — line breaks and indentation only, no logic changes. Steps renumbered from 5 to 6 total. See `docs/tasks/1-track-a-mobile-snippet-ux/summary.md` for full change log.

**1-Track-B — Gmail Drafts to Sheets** — Done

Built n8n workflow that reads manually-written Gmail drafts and appends rows to the Newsletter Drafts Google Sheet. Dedup by `gmail_draft_id`, count validation for exactly 3 drafts per issue, fan-out Merge architecture to handle empty-sheet first runs. See `snippet/n8n-workflows/workflow-gmail-drafts-to-sheet.md` for full node-by-node doc.

**1-Track-C — Welcome Email Refinement** — Done

Refined the welcome email in `snippet/n8n-workflows/workflow-confirmation.md` Node 11. Tightened copy, removed redundant and weak lines, elevated the real-trending-code value prop, added project context bullet. Subject simplified to `Welcome to Snippet`. See `1-track-c-welcome-email-refinement/summary.md` for full change log.
