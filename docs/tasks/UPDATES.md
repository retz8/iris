# Task Updates

## 2026-02-22

**Hotfix — Automate Newsletter Content Generation** — Done

Replaced the Sunday manual 7-step content generation workflow with three Claude Code skills and two sub-agents. The pipeline runs across three separate sessions with human decision gates between each. See `docs/tasks/hotfix-automate-content-generation/summary.md` for full architecture notes.

Skill A (`discover-oss-candidates`): uses WebSearch to find trending OSS repos for Python, JS/TS, and C/C++, validates all URLs via browser, shows prior usage counts, and asks the human to pick one per language. Writes `snippet-selections/YYYY-MM-DD.md`.

Skill B (`find-snippet-candidates`): spawns 3 parallel `snippet-repo-explorer` sub-agents to browse each GitHub repo, returns ranked snippet candidates, verifies selected URLs, and appends picks to the same handoff file.

Skill C (`generate-snippet-draft`): reformats snippets for mobile, researches repos for project context, generates and self-refines breakdowns (including subscriber comprehension check), gets human confirmation, writes `drafts.json` and `repos.json`, spawns 3 parallel `snippet-html-generator` sub-agents for HTML generation, and writes 3 Gmail drafts via browser JS injection.

`snippet/n8n-workflows/content/drafts.json` and `repos.json` created. `manual-content-generation.md` marked as automated with links to all three skills.

**Hotfix — Remove Issue Number from Subscriber-Facing Email Subject** — Done

Removed `#[ISSUE_NUMBER]` from the subscriber-facing email subject while keeping it in the internal Gmail draft subject for workflow scoping. Also fixed the draft count validation to support the correct 9-draft-per-Sunday cadence (3 languages × 3 days).

Draft subject format changed to `Can you read this #[ISSUE_NUMBER] [LANGUAGE]: {{file_intent}}` — language added so the Gmail Drafts to Sheets workflow can scope to exactly 3 drafts per run. The workflow is now run once per language (3 runs each Sunday). `manual-content-generation.md` Step 6 template and instruction updated accordingly.

`workflow-gmail-drafts-to-sheet.md`: Node 1 Form Trigger gains a Language dropdown (Python / JS/TS / C/C++). Node 3 filter pattern updated from `#${issueNumber}:` to `#${issueNumber} ${language}:`, count check stays at exactly 3. Node 6 reads `issue_number` and `programming_language` from the Form Trigger instead of parsing from the subject — `programming_language` column is now auto-populated (no longer blank after import). Subject regex updated for the new format.

`workflow-send-newsletter.md`: Node 6 (Normalize Draft Content) strips the internal `#[N] [LANG]:` prefix from the subject before sending — subscribers receive `Can you read this: {file_intent}`.

`FormatPreview.tsx`: landing page preview updated to `Can you read this: Bash command validation` to reflect the subscriber-facing format.

## 2026-02-21 (continued)

**5-Track-A — SEO Optimization** — Done

Full SEO pass on the Snippet landing page. JSON-LD structured data was discussed and rejected. All other deliverables completed across two commits.

`web/index.html`: title updated to `Snippet — Code Reading Newsletter for Developers`; meta description rewritten to 140 chars targeting vibe coding, review bottleneck, code reading, and trending repos keywords; canonical link added pointing to `/snippet`; `og:url` corrected from root to `/snippet`; `og:site_name` added; `og:image` wired to `og-image.png`; Twitter Card added as `summary_large_image` with matching title, description, and image; full favicon link set added (favicon.ico, 32x32, 16x16, apple-touch-icon); `site.webmanifest` linked.

`web/public/`: `robots.txt` created — allows `/snippet`, excludes `/snippet/confirm` and `/snippet/unsubscribe`, references sitemap; `sitemap.xml` created — declares `/snippet` as sole indexable URL; full favicon set added (favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, android-chrome-192x192.png, android-chrome-512x512.png); `site.webmanifest` added with name and short_name filled in; `og-image.png` and `logo.svg`/`logo.png` added. `logo.svg` used in the page header alongside the "Snippet" wordmark.

**4-Track-A — Copy Finalization** — Done

Copy audit and rewrite across all subscriber-facing surfaces. Decisions were driven by simulated user testing using a `snippet-persona` sub-agent (Alex — mid-level engineer, 4yr, Python/TS, no prior Snippet knowledge). Each surface was shown cold in subscriber order; reactions synthesized into locked decisions.

Landing page hero: headline changed from question to statement framing ("AI writes code faster than you can read it."), subheadline rewritten to bridge the AI gap premise to the value prop ("Close the gap. One real snippet from trending repos — Mon/Wed/Fri, 2 minutes."). Step 1 CTA changed from "Subscribe" to "Send me snippets."

SignupForm step 2: CTA changed from "Complete subscription" to "Send me snippets" (intentional repeat). Privacy line changed from "No spam. Unsubscribe anytime." to "We'll match snippets to your selected languages." — contextually relevant and explains why language selection matters.

Post-submit state: body changed from "Click it to complete your subscription." to "Click it to verify your address." Hint text flipped to lead with time expectation ("Usually arrives in under a minute. Not there? Check your spam folder."). UI aligned with landing page aesthetic — card treatment removed, blue accent stripe removed, envelope emoji replaced with Heroicons SVG.

Confirmation email (workflow-subscription-double-optin.md Node 11): para 1 changed from "You signed up for Snippet, the code reading challenge newsletter." to "You're one click away." Para 2 tightened to "Confirm your email to start receiving snippets." Subject, button, expiry, and safety-net footer unchanged.

Welcome email (workflow-confirmation.md Node 11): opener changed from "You signed up for Snippet." to "You're in." Bullet 2 changed from "The pattern you need to see faster" to "The pattern you need to catch." Sign-off trimmed from "Train your eye. Ship with confidence." to "Train your eye." Middle paragraphs unchanged — they were the strongest part per Alex.

**3-Track-A — n8n Security Check** — Done

Full security review of all five n8n workflows before live deployment. Six issues found across Critical, High, and Low severity. Four fixed, two accepted as low risk at current scale.

Critical fix (C1): no rate limiting on `/subscribe` — resolved with a two-layer guard in the `Code - Validate Email & Required Fields` node: Origin header check (must match `https://iris-codes.com`) and `api_key` body field validation against `$vars.WEBHOOK_SECRET`. Frontend counterpart: `api_key: import.meta.env.VITE_WEBHOOK_SECRET` added to the POST payload in `web/src/components/snippet/SignupForm.tsx`.

High fix (H1): email enumeration via 409 — the `"Email already subscribed"` 409 response is replaced with a status-neutral 200 matching the new-signup response. Removes subscriber list enumeration.

High fix (H2): user-controlled `source` and `subscribed_date` written to Sheets — both fields are now hard-coded server-side in the Code node; client-supplied values ignored.

Low fix (L1): `email` field removed from `already_confirmed` and `already_unsubscribed` response bodies in the Confirmation and Unsubscription workflows.

Accepted risk: unsubscribe token has no expiration (UUID v4 space makes brute-force infeasible at scale); no CORS restriction (covered by Origin check in C1 fix). Full audit trail in `snippet/n8n-workflows/security-checklist.md`. Implementation plans and action plan in `docs/tasks/3-track-a-n8n-security-check/`.

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
