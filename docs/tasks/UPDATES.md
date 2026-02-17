# Task Progress - Session Updates

Single source of truth for all parallel session work. Each session appends its summary here when complete.

---

## 2026-02-16 - Workflow Setup

**Status:** Complete

### What Was Done
- Created task coordination infrastructure
- Files created: `docs/tasks/README.md`, `docs/tasks/UPDATES.md`
- Defined 4-phase execution plan with 8 tracks (H, A, B, C, D, E, F, G)

### Decisions Made
- TODO.md is source of truth for MVP requirements
- UPDATES.md is source of truth for session progress
- Auto-analyze stays `true` (no change from current behavior)
- NO verification prompt for MVP (focus on current prompt quality only)

### What's Next
- Ready to launch Phase 1: Tracks H, A, B, C in parallel
- Tracks E and F wait for Track H completion
- Track D waits for Track B completion
- Track G waits for Tracks E and F completion

---

## 2026-02-16 - Track A: Extension UX Improvements

**Status:** Complete

### What Was Done
- **Error Handling UI**: Added persistent error state to sidebar with actionable buttons
  - Structured `ErrorDetails` type in `@iris/core` (type, message, statusCode)
  - Error state rendering in sidebar: badge (Network/Auth/Timeout/Server/Parse/Response), message, retry button
  - "Configure API Key" button for 401/403 errors (temporary, pre-GitHub OAuth)
  - Auth errors use yellow/warning styling; other errors use red/error styling
- **Multi-file LRU Cache**: In-memory cache (10 files) for instant file switching
  - SHA-256 content hashing for cache key validation
  - Auto-analysis uses cache (instant display on hit); manual analysis bypasses cache
  - Cache invalidation on file edit (STALE transition)
  - LRU eviction when cache exceeds 10 files
- **Persistence**: Cache survives extension reload via VS Code workspaceState
  - Async content hash validation on restore (discards stale entries)
  - Persist after each successful analysis and on deactivation
- Files created: `packages/iris-vscode/src/cache/analysisCache.ts`, `packages/iris-vscode/src/utils/contentHash.ts`
- Files modified: `packages/iris-core/src/models/types.ts`, `packages/iris-core/src/state/analysisState.ts`, `packages/iris-core/src/index.ts`, `packages/iris-vscode/src/state/irisState.ts`, `packages/iris-vscode/src/types/messages.ts`, `packages/iris-vscode/src/webview/sidePanel.ts`, `packages/iris-vscode/src/extension.ts`

### Decisions Made
- Error stored as `errorDetails` field in IDLE state (no new state enum value)
- API key configuration is temporary (marked with TODO comments for GitHub OAuth replacement)
- Cache lives at VS Code adapter layer (`iris-vscode`), not in platform-agnostic core
- workspaceState used for persistence (per-workspace scope, not globalState)
- Manual "Run Analysis" always bypasses cache (force refresh)

### What's Next
- Track A is complete; no blockers for other tracks
- Error UI and caching tested manually (7 error scenarios, 8 cache scenarios)

---

## 2026-02-16 - Track H: Newsletter Design Discussion

**Status:** Complete

### What Was Done
- Completed Phase 0 (Exploration): Reviewed newsletter-n8n-plan.md, thoughts.md, strategy-2026-02-10.md
- Completed Phase 1 (Discussion): Resolved all 8 open questions with human engineer
- Updated track-h-newsletter-design.md with all decisions
- Created track-h-summary.md for Track E and F implementation teams

### Decisions Made

**1. Newsletter Name & Branding**
- Name: "Snippet"
- Sender: "Snippet" (standalone brand, no "by IRIS")
- Subject format: "Can you read this #NNN: <File Intent or ???>"
- Challenge mode: Hide File Intent in 30-40% of issues (starts month 2)

**2. Language Support Strategy**
- Written languages: en, ko
- Programming languages: Python, JS/TS, C/C++ (multi-select)
- 6 base content variants per issue (2 written × 3 programming)

**3. Category System**
- NO categories for MVP
- Follow trending tech news instead (GitHub trending API)

**4. Landing Page & Signup Form**
- Platform: Simple HTML/CSS at iris-codes.com/snippet
- Root domain redirects to /snippet
- Fields: email (required), written language (required), programming languages (multi-select, required)
- NO name field (reduces friction)
- Design: Minimalist, no dark mode, flexible color palette

**5. Content Format Refinement**
- Email length: 2 minutes (~180 words)
- Breakdown: 80-120 words (3 bullets: what it does, key responsibility, clever part)
- Challenge placement: After code, before breakdown ("Before scrolling: what does this do?")
- Project context: 40-50 words (repo + description + why trending)
- Footer: Unsubscribe link only (no IRIS plug)
- Frequency: MWF 7am (confirmed)

**6. Code Snippet Format**
- Formatted HTML text with inline styles (NOT image)
- Copyable, selectable, accessible
- Light syntax highlighting via inline `<span style="color: ...">`
- Background: #f6f8fa, left border: #0969da
- Monospace font stack: Consolas, Monaco, Courier New

**7. Welcome Email Content**
- Subject: "You merge it. Can you read it fast enough?"
- Tone: Pragmatic professional (authority + skill-building)
- AI angle: "AI generates code faster than you can read it"
- Word count: 82 words
- Sign-off: "Train your eye. Ship with confidence."

**8. Unsubscribe Mechanism**
- Simple one-click unsubscribe (MVP)
- n8n webhook → Google Sheets update (status: active → unsubscribed)
- Confirmation page: "You're unsubscribed from Snippet"
- Preference management: Add only if unsubscribe rate > 5%
- Measurement system: Track per-issue and monthly rates with industry benchmarks

### What's Next
- **Track E (Landing Page)**: UNBLOCKED - has all branding and design decisions
- **Track F (Subscriber Management)**: UNBLOCKED - has welcome email and unsubscribe flow
- Track G (Content Pipeline): Still blocked, waits for E and F completion

### Files Modified
- `docs/tasks/track-h-newsletter-design.md` - All 8 sections marked as decided
- `docs/tasks/track-h-summary.md` - Created for Track E/F teams

---

## 2026-02-17 - Track B: Analysis Quality

**Status:** Complete (all 6 phases, 23 tasks, 129 tests passing)

### What Was Done

**Phase 0: Exploration**
- Tested current analysis quality against diverse files via live API
- Discovered critical cross-block range overlaps in ~40% of analyzed files
- Confirmed zero test coverage (backend/tests/ did not exist)
- Documented quality issues: verbose labels, over-granular blocks, long file intents

**Phase 1: Cross-Block Overlap Fix**
- Added `_deduplicate_cross_block_ranges()` in `backend/src/agent.py` (first-block-wins strategy)
- Wired into post-processing pipeline after existing `_merge_ranges()` loop
- 10 unit tests in `backend/tests/test_range_dedup.py`

**Phase 2: Test Infrastructure**
- Created full test directory structure with conftest, quality validators, sample corpus
- 6 quality validator functions + aggregator in `backend/tests/utils/quality_validators.py`
- 15 diverse sample files across Python (7), JavaScript (4), TypeScript (4)
- 24 validator unit tests in `backend/tests/test_quality_validators.py`

**Phase 3: Baseline Snapshots**
- Created `snapshot_manager.py` and `generate_snapshots.py` script
- Generated 15 baseline snapshots against live API with dedup-enabled server
- All 15 snapshots pass quality checks (zero cross-block overlaps)

**Phase 4: Core Test Suite**
- `test_analysis_quality.py`: 74 parameterized snapshot quality tests
- `test_edge_cases.py`: 8 edge case tests (empty, minified, comments, barrel files)
- `test_prompt_builder.py`: 6 prompt construction unit tests
- `test_range_processing.py`: 7 within-block merge unit tests

**Phase 5: Edge Case Handling**
- Empty file detection: returns graceful response without LLM call
- Minified code detection: heuristic (< 3 lines, any line > 500 chars), appends note to LLM prompt
- 30s timeout protection via OpenAI `timeout` parameter + `APITimeoutError` catch
- `routes.py`: changed `if not source_code` to `if source_code is None` (allow empty strings through)

**Phase 6: Prompt Tuning**
- Label conciseness rule: 2-5 words, noun phrases
- Small-file granularity rule: prefer 1-2 blocks for files under 30 lines
- Zero-tolerance cross-block overlap instruction (strengthened from "minimize" to "MUST")
- Regenerated all 15 snapshots; all pass quality checks post-tuning

**Total: 129 tests, all passing, lint clean**

### Files Created
- `docs/tasks/track-b/analysis-quality-implementation-plan.md`
- `backend/tests/__init__.py`, `backend/tests/conftest.py`
- `backend/tests/utils/__init__.py`, `backend/tests/utils/quality_validators.py`, `backend/tests/utils/snapshot_manager.py`
- `backend/tests/generate_snapshots.py`
- `backend/tests/test_range_dedup.py`, `backend/tests/test_quality_validators.py`
- `backend/tests/test_analysis_quality.py`, `backend/tests/test_edge_cases.py`
- `backend/tests/test_prompt_builder.py`, `backend/tests/test_range_processing.py`
- `backend/tests/fixtures/samples/` (15 sample files)
- `backend/tests/fixtures/snapshots/` (15 snapshot JSON files)

### Files Modified
- `backend/src/agent.py` — Cross-block dedup, empty file detection, minified detection, 30s timeout
- `backend/src/prompts.py` — Label conciseness, small-file granularity, zero-tolerance overlap rules
- `backend/src/routes.py` — Allow empty source_code passthrough

### Decisions Made
- First-block-wins for cross-block dedup (preserves comprehension-ordered priority)
- Two-tier testing: Tier 1 (fixtures, deterministic) by default; Tier 2 (live API) opt-in via `@pytest.mark.live`
- Quality validators are pure functions reusable in tests, CI, and snapshot generation
- Post-processing pipeline: LLM output -> within-block merge -> cross-block dedup -> validation

### What's Next
- Track B is complete; **Track D (backend hardening) is now unblocked**

---

## 2026-02-17 - Track E: Newsletter Landing Page (Phases 1-4)

**Status:** In Progress (Phases 1-4 complete, Phases 5-6 remaining)

### What Was Done

**Phase 0: Exploration**
- Reviewed Track H design decisions (all branding/messaging locked)
- Confirmed no existing landing page infrastructure
- Explored hosting options (EC2 vs Vercel)
- Decided on React + Vite stack for full startup homepage (not just newsletter page)

**Phase 1: Project Setup & Infrastructure**
- Initialized Vite React TypeScript project with `react-router-dom`
- Configured `vite.config.ts` with `@/` alias for cleaner imports
- Set up React Router: `/` → `/snippet`, `/snippet`, `/snippet/unsubscribe`
- Created shared `Layout` component with brand mark header (`>_ Snippet`)
- Organized project structure: `pages/`, `components/`, `styles/`, `utils/`
- Created `vercel.json` with SPA rewrite rules for client-side routing
- Added meta tags and Open Graph tags to `index.html`

**Phase 2: Global Styles & Design System**
- Created `globals.css` with comprehensive CSS custom properties (colors, typography, spacing, shadows)
- Warm editorial color palette: off-white background, serif headlines (Newsreader), system sans body
- Defined spacing scale (8px rhythm), breakpoints, fluid typography with `clamp()`
- Created `components.css`: buttons, form inputs, pill toggles, cards, code blocks (Track H spec)
- Created `animations.css`: fade-up/fade-in keyframes with staggered delays
- WCAG AA compliance: focus styles, color contrast, reduced motion support
- Added Google Fonts: Newsreader (serif), JetBrains Mono (monospace)

**Phase 3: Snippet Page Components**
- Created `Hero` component: headline "Can you read code faster than AI writes it?", subheadline, responsive padding
- Created `FormatPreview` component: email card with Python code snippet (command resolver), challenge question, 3-bullet breakdown, project context
- Created `SignupForm` component: controlled state, email/written language/programming languages fields, pill-style radio/checkbox toggles
- Added form validation: email regex, min 1 programming language check, inline error messages
- Added webhook POST to placeholder URL (`https://n8n.iris-codes.com/webhook/subscribe`) with success/error states
- Created `Footer` component: unsubscribe link to `/snippet/unsubscribe`

**Phase 4: Pages Assembly**
- Assembled `SnippetPage`: Hero + FormatPreview + SignupForm + Footer with staggered animations
- Styled `UnsubscribePage`: centered layout with resubscribe link
- Added responsive CSS throughout: mobile-first breakpoints at 768px

**Refactor: Renamed `landing/` → `web/`**
- Updated package.json name to reflect full web application scope (not just landing page)
- Updated all implementation plan references

**Build verified**: 11.51 KB CSS, 236.55 KB JS, all routes functional

### Files Created
- `docs/tasks/track-e/track-e-implementation-plan.md` — Complete implementation plan (6 phases, 32 tasks)
- `web/` — Full React + Vite application (renamed from `landing/`)
- `web/src/components/Layout.tsx` — Shared layout with brand mark
- `web/src/components/snippet/Hero.tsx` — Hero section
- `web/src/components/snippet/FormatPreview.tsx` — Email preview card
- `web/src/components/snippet/SignupForm.tsx` — Signup form with validation
- `web/src/components/snippet/Footer.tsx` — Footer with unsubscribe link
- `web/src/pages/SnippetPage.tsx` — Landing page assembly
- `web/src/pages/UnsubscribePage.tsx` — Unsubscribe confirmation
- `web/src/styles/globals.css` — Design system (224 lines)
- `web/src/styles/components.css` — Component styles (282 lines)
- `web/src/styles/animations.css` — CSS animations (47 lines)
- `web/vercel.json` — Vercel deployment config

### Decisions Made
- **Hosting**: Vercel (NOT EC2) — free tier, automatic SSL, preview deployments
- **Tech stack**: React + Vite (NOT plain HTML/CSS) — scalable for future product pages (extension, Mac app)
- **Architecture**: Full startup homepage, not just newsletter landing page
- **Unsubscribe URL**: `/snippet/unsubscribe` (NOT `/unsubscribe`)
- **Webhook**: Placeholder URL for now, Track F will provide real n8n webhook
- **Design system**: Warm editorial palette with Newsreader serif headlines, system sans body
- **Sample snippet**: New CLI tool code (command resolver with prefix matching) — NOT reused from thoughts.md

### What's Next
- **Phase 5**: Vercel deployment (7 tasks) — install CLI, deploy to preview/production, configure custom domain at Namesquare DNS, verify SSL
- **Phase 6**: Testing & verification (6 tasks) — responsiveness, form validation, cross-browser, performance, accessibility, SPA routing
- After Phase 5-6 complete: **Track G (Content Pipeline) is unblocked** (depends on Track E and F completion)

---

## 2026-02-17 - Track E: Landing Page Refinements & Security Planning

**Status:** Complete

### What Was Done

**Landing Page UX Improvements**
- **Progressive Disclosure Signup Flow**: Converted two-column sidebar layout to single-column with progressive disclosure
  - Email input shown first with "Subscribe" button
  - After email submission, language inputs appear (written language + programming languages)
  - Button changes to "Complete subscription"
  - Improves conversion by reducing initial form complexity
- **Layout Changes**: Removed two-column grid (`.snippet-layout`), removed sticky sidebar, single-column flow throughout
- **Hero Section Alignment**: Fixed headline/subheadline alignment by giving both `max-width: 32ch` (were 20ch/32ch, causing misalignment)
- **Preview Section Heading**: Added "What you'll receive" heading using `.section-intro` class (Spectral serif, elegant)
- **Thinking Dots Separator**: Added vertical three-dot separator after challenge question
  - Static (no animation) - appropriate for static email preview
  - Increased spacing before breakdown: `padding: var(--space-xl)`, `margin-bottom: var(--space-2xl)`
- **Sample Email Update**: Replaced generic code with real Python snippet from Claude Code repository
  - Subject: "Can you read this #042: Bash command validation hook"
  - Code from `bash_command_validator_example.py` (PreToolUse hook system)
  - Project context includes GitHub link: github.com/anthropics/claude-code
  - Updated breakdown to explain token validation pattern

**Dynamic Delivery Day**
- Added `getNextDeliveryDay()` function to calculate next Mon/Wed/Fri delivery based on signup day
- Success message now shows accurate delivery day: "First Snippet arrives {Monday|Wednesday|Friday} 7am"
- Handles all days: Sun/Mon → Monday, Tue/Wed → Wednesday, Thu/Fri/Sat → Monday

**Unsubscribe Flow (Phases 1-4 Complete)**
- **Phase 1**: Updated Footer to navigate to `/unsubscribe` (changed from `/snippet/unsubscribe`)
- **Phase 2**: Added state management to UnsubscribePage (email, isSubmitting, isSuccess, error states)
  - URL parameter extraction with `useSearchParams`
  - Email validation on mount
  - Error handling for missing/invalid email parameters
- **Phase 3**: Implemented webhook integration with placeholder URL
  - POST to `https://n8n.iris-codes.com/webhook/unsubscribe`
  - Payload: email, source, unsubscribed_date
  - Try-catch-finally error handling
  - Placeholder behavior: shows success even on error (TODO for real webhook)
- **Phase 4**: Built complete confirmation UI with conditional rendering
  - Confirmation state: "Unsubscribe from Snippet?" with email display and confirm button
  - Loading state: disabled button with "Unsubscribing..." text
  - Success state: "You're unsubscribed" with resubscribe link
  - Error state: displays error message with homepage link
- **Product Design Decision**: Removed footer unsubscribe link entirely
  - Industry standard: newsletters only have unsubscribe in emails
  - Prevents confusion from broken/error-state links
  - Users unsubscribe from email links with pre-filled email parameter

**Security & Compliance Planning**
- Created comprehensive double opt-in implementation plan: `docs/track-e/feature-double-optin-confirmation-1.md`
- **8 phases, 62 tasks** covering:
  1. Update SignupForm to show "Check your email" pending state
  2. Create ConfirmationPage component with token verification
  3. Define webhook API contract for Track F backend team
  4. Frontend API integration with confirmation endpoints
  5. Email confirmation template requirements
  6. Edge case handling (expired, invalid, already confirmed tokens)
  7. Comprehensive testing (unit, integration, email, security, accessibility)
  8. Documentation and deployment
- **Legal compliance**: GDPR Article 7 (explicit consent), CAN-SPAM requirements
- **Security**: UUID v4 tokens, 48-hour expiration, single-use, rate limiting
- **Quality goals**: 60-80% confirmation rate (industry standard)

### Files Created
- `docs/implementation-plans/feature-unsubscribe-confirmation-1.md` - Unsubscribe two-step confirmation plan
- `docs/track-e/feature-double-optin-confirmation-1.md` - Double opt-in security implementation plan

### Files Modified
- `web/src/components/snippet/SignupForm.tsx` - Progressive disclosure flow, dynamic delivery day calculation
- `web/src/components/snippet/FormatPreview.tsx` - Added preview heading, thinking dots, updated sample email content
- `web/src/components/snippet/Footer.tsx` - Removed unsubscribe link (industry standard practice)
- `web/src/pages/SnippetPage.tsx` - Single-column layout (removed two-column grid)
- `web/src/pages/UnsubscribePage.tsx` - Complete rewrite with state management, webhook integration, confirmation UI
- `web/src/styles/components.css` - Hero alignment fix, thinking dots styles, progressive disclosure styles, single-column layout

### Decisions Made
- **Progressive Disclosure**: Show email first, then language inputs after initial engagement (reduces form anxiety)
- **Delivery Day Logic**: Mon/Wed/Fri schedule with dynamic calculation based on signup day
- **Unsubscribe Access**: Email links only (no footer link) - matches Substack, Mailchimp, ConvertKit patterns
- **Security Approach**: Double opt-in required for legal compliance and list quality (GDPR mandates explicit consent)
- **Token Expiration**: 48 hours (industry standard)
- **Sample Content Source**: Real code from trending open source (Claude Code) instead of generic examples

### What's Next
- **Unsubscribe Flow Phase 5**: Testing & validation (8 tasks) - manual testing, integration testing, accessibility
- **Double Opt-In**: Ready for implementation when Track F backend support is available
  - Requires coordination with Track F for webhook endpoints, token management, email sending
  - Frontend phases 1-2 can start independently (update SignupForm, create ConfirmationPage)
- **Track E remaining**: Phase 5 (Vercel deployment), Phase 6 (testing & verification)

### Build Status
- ✅ All TypeScript compilation successful
- ✅ No type errors
- ✅ Lint warnings only (pre-existing, not related to changes)

---

## 2026-02-17 - Newsletter Simplification: Remove Written Language Support

**Status:** Complete

### What Was Done

**Removed Written Language Support from Newsletter:**
- Simplified newsletter to single language (English) for MVP
- Updated all n8n workflow documentation to remove `written_language` field
- Reduced content variants from 6 (2 languages × 3 programming languages) to 3 (3 programming languages only)

**Files Modified:**
- `docs/tasks/n8n-workflows/google-sheets-subscribers-schema.md`
  - Removed `written_language` column from schema
  - Removed written language validation rules
  - Updated all usage examples
- `docs/tasks/n8n-workflows/google-sheets-drafts-schema.md`
  - Changed from 6 content variants to 3 (Python, JS/TS, C/C++)
  - Removed written language dimension from variant table
  - Updated content_variant values (en-Python → Python, ko-JS/TS → JS/TS, etc.)
  - Updated all examples and queries (6 rows per issue → 3 rows per issue)
- `docs/tasks/n8n-workflows/workflow-subscription-double-optin.md`
  - Removed `written_language` from webhook input
  - Removed written language validation from Code node
  - Removed field from all column mappings and test examples
- `docs/tasks/n8n-workflows/workflow-unsubscribe-token-based.md`
  - Removed `written_language` from field preservation note

### Decisions Made

**Simplification Rationale:**
- Focus on single language (English) for MVP to reduce complexity
- Can add multi-language support post-launch if there's demand
- Reduces content creation workload from 6 variants to 3 per issue
- Simplifies subscriber matching logic (only programming_languages needed)

**Content Variants (Simplified):**
- Python variant → targets subscribers with Python in programming_languages
- JS/TS variant → targets subscribers with JS/TS in programming_languages
- C/C++ variant → targets subscribers with C/C++ in programming_languages

**Google Sheets Impact:**
- Subscribers sheet: Removed `written_language` column
- Drafts sheet: 3 rows per issue instead of 6
- Simpler queries and content management

### What's Next

- Frontend (Track E) will need to remove written language field from signup form
- Newsletter email templates remain English-only for MVP
- Can revisit multi-language support based on user feedback and growth

---

## 2026-02-17 - Track F: Newsletter Subscriber Management (Subscription Flow)

**Status:** In Progress (Subscription flow complete, Confirmation and Unsubscribe flows remaining)

### What Was Done

**n8n Workflow: Newsletter Subscription (Double Opt-In)**
- **Implemented complete subscription workflow** with email validation, duplicate detection, token generation, and confirmation email sending
- **Node-by-Node Implementation:**
  - Node 1: Webhook (POST /subscribe) - receives signup form submissions
  - Node 2: Code - Validates email format and programming languages
  - Node 3: IF - Routes based on validation result
  - Node 4: Code - Formats validation error response
  - Node 4a: Respond to Webhook - Returns 400 error for invalid input
  - Node 5: Google Sheets - Reads all subscribers to check for duplicates
  - Node 6: Code - Determines action based on duplicate status (error_confirmed, error_pending, update_resubscribe, create_new)
  - Node 7: Switch - Routes by action type (4 paths)
  - Node 8a: Code + Respond to Webhook - Returns 409 error for already confirmed subscribers
  - Node 8b: Code + Respond to Webhook - Returns 200 info for pending confirmations
  - Node 9: Code - Generates UUID v4 confirmation token with 48-hour expiration
  - Node 10a: Google Sheets - Appends new subscriber row (create_new path)
  - Node 10b: Google Sheets - Updates existing subscriber row (update_resubscribe path)
  - Node 11: Gmail - Sends confirmation email with token link
  - Node 12: Code + Respond to Webhook - Returns success response

**Key Features Implemented:**
- **Email Validation:** Regex-based format validation, programming languages validation (Python, JS/TS, C/C++)
- **Duplicate Detection:** Case-insensitive email matching with status-aware handling
  - Already confirmed → 409 error
  - Already pending → 200 informational response (prevents spam)
  - Unsubscribed → Update existing row (re-subscription)
  - Expired → Update existing row (new token)
- **Token Security:** UUID v4 tokens via `require('crypto').randomUUID()`, 48-hour expiration
- **Confirmation Email:** HTML template with confirmation button and fallback link
  - Subject: "Confirm your Snippet subscription"
  - Link: `https://iris-codes.com/snippet/confirm?token={token}`
  - Expiration notice: 48 hours
- **Response Formatting:** Code nodes before all "Respond to Webhook" nodes for clean JSON responses
- **Error Handling:** Structured error responses with error_type, message, statusCode fields

**Testing Completed:**
- Test 1: Valid new subscriber → 200, pending status, email sent
- Test 2: Invalid email format → 400 error
- Test 3: Missing programming languages → 400 error
- Test 4: Duplicate (already confirmed) → 409 error
- Test 5: Duplicate (pending confirmation) → 200 info
- Test 6: Re-subscription (previously unsubscribed) → 200, new token, email sent

### Files Created/Modified

**Documentation Created:**
- `docs/tasks/n8n-workflows/workflow-subscription-double-optin.md` - Complete node-by-node configuration guide with all code snippets, testing scenarios, and error handling rules

**Documentation Updated:**
- `docs/tasks/n8n-workflows/google-sheets-subscribers-schema.md` - (referenced for schema)

**n8n Workflow:**
- Webhook URL (Test): `https://retz8.app.n8n.cloud/webhook-test/subscribe`
- Webhook URL (Production): `https://retz8.app.n8n.cloud/webhook/subscribe` (when activated)

### Decisions Made

**Workflow Architecture:**
- Use Code nodes before all "Respond to Webhook" nodes for clean JSON response formatting
- Use Switch node instead of nested IF nodes for cleaner action routing
- First-incoming-item response mode for all webhook responses
- No Merge node needed before Gmail (direct connections from both Google Sheets nodes)

**Security & Validation:**
- UUID v4 tokens generated via Node.js crypto module: `const { randomUUID } = require('crypto');`
- 48-hour token expiration (industry standard)
- Email normalization: lowercase + trim before comparison
- Valid programming languages: Python, JS/TS, C/C++
- Case-insensitive duplicate detection

**Duplicate Handling:**
- Confirmed subscribers → 409 error (prevent duplicate subscriptions)
- Pending subscribers → 200 info (prevent email spam from repeated submissions)
- Unsubscribed subscribers → Update existing row (preserve original created_date)
- Expired tokens → Update existing row (new token, reset status to pending)

**Email Configuration:**
- Confirmation page URL: `/snippet/confirm` (not `/confirm`)
- Email subject: "Confirm your Snippet subscription"
- HTML email with button + fallback link
- Gmail OAuth2 for sending

### What's Next

**Track F Remaining Work:**
1. **Confirmation Flow** - Implement token verification workflow
   - Webhook: GET/POST `/confirm?token={token}`
   - Validate token (exists, not expired, status=pending)
   - Update subscriber status to "confirmed"
   - Generate unsubscribe token
   - Display success confirmation page
   - Handle edge cases (expired, invalid, already confirmed tokens)

2. **Unsubscribe Flow** - Implement token-based unsubscription workflow
   - Webhook: GET/POST `/unsubscribe?token={token}`
   - Validate unsubscribe token
   - Update subscriber status to "unsubscribed"
   - Display unsubscribe confirmation page
   - Handle edge cases (invalid token, already unsubscribed)

**Track F Blockers:**
- None - can proceed with confirmation and unsubscribe workflows independently

**Track G (Content Pipeline):**
- Still blocked - waits for Track F completion (all three flows: subscribe, confirm, unsubscribe)

---

<!-- All future session updates go below this line -->
