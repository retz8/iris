---
goal: Build IRIS Landing Site with Snippet Newsletter Page
version: 2.0
date_created: 2026-02-17
last_updated: 2026-02-17
owner: Track E
status: Planned
tags: feature, landing-page, newsletter, distribution, homepage
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Build the IRIS landing site as a full React + Vite application hosted on Vercel. The site serves as the startup homepage with multiple product pages. Initial launch includes the Snippet newsletter landing page at `iris-codes.com/snippet` and unsubscribe page at `iris-codes.com/snippet/unsubscribe`. Future pages will include VS Code extension, Mac app, and other IRIS products. The Snippet page converts mid-level engineers (2-5 YoE) into newsletter subscribers. All Snippet design decisions are locked from Track H (`docs/tasks/track-h/track-h-summary.md`).

## 1. Requirements & Constraints

**Requirements**

- **REQ-001**: React + Vite application with React Router for multi-page routing
- **REQ-002**: Root domain `iris-codes.com` redirects to `/snippet` (for now, until homepage is built)
- **REQ-003**: Snippet newsletter page at `iris-codes.com/snippet` with sections: Hero, Format Preview, Signup Form, Footer
- **REQ-004**: Snippet hero headline: "Can you read code faster than AI writes it?"
- **REQ-005**: Snippet hero subheadline: "Code reading challenges. Mon/Wed/Fri mornings. 2 minutes."
- **REQ-006**: Format Preview shows example email: subject line, code snippet (8-12 lines Python from CLI tool), challenge question ("Before scrolling: what does this do?"), 3-bullet breakdown (what it does, key responsibility, the clever part), project context
- **REQ-007**: Signup form fields: email (required, text input, placeholder "your@email.com"), written language (required, radio: English/Korean), programming languages (required, checkboxes: Python, JS/TS, C/C++, min 1 selected)
- **REQ-008**: Submit button label: "Subscribe"
- **REQ-009**: Privacy note below form: "No spam. Unsubscribe anytime."
- **REQ-010**: Form POST payload: `{ email, written_language, programming_languages[], source: "landing_page", subscribed_date }` to n8n webhook URL
- **REQ-011**: Success state after submit: "You're subscribed! First Snippet arrives Monday 7am."
- **REQ-012**: Unsubscribe page at `iris-codes.com/snippet/unsubscribe` shows: "You're unsubscribed from Snippet." with resubscribe link back to `/snippet`
- **REQ-013**: Shared navigation component for future pages (extensible for `/extension`, `/mac-app`, etc.)
- **REQ-014**: Mobile-first responsive design
- **REQ-015**: Page load time under 2 seconds
- **REQ-016**: WCAG AA accessibility compliance
- **REQ-017**: SSL/HTTPS enabled (Vercel automatic)
- **REQ-018**: Custom domain `iris-codes.com` configured on Vercel

**Constraints**

- **CON-001**: React + Vite stack
- **CON-002**: Hosted on Vercel (free tier)
- **CON-003**: No dark mode for MVP
- **CON-004**: No logo or favicon image assets for MVP — text-based branding only
- **CON-005**: Webhook URL is a placeholder until Track F builds the n8n workflow
- **CON-006**: No IRIS branding on Snippet page — Snippet is a standalone brand
- **CON-007**: Root `/` redirects to `/snippet` until homepage is designed

**Guidelines**

- **GUD-001**: Color palette is flexible — design during implementation using frontend-design skill
- **GUD-002**: Minimalist, clean aesthetic targeting mid-level engineers (2-5 YoE)
- **GUD-003**: Code block in format preview uses Track H syntax highlighting spec: `#f6f8fa` background, `#0969da` left border, monospace font stack (Consolas, Monaco, Courier New), inline `<span>` color styles for keywords (`#cf222e`), functions (`#8250df`), strings (`#0a3069`), numbers (`#0550ae`), comments (`#6e7781`)
- **GUD-004**: Sample code snippet should be from a CLI tool (new, not from thoughts.md examples)
- **GUD-005**: Shared layout component with navigation for future scalability

**Patterns**

- **PAT-001**: React SPA with React Router. Routes: `/` (redirects to `/snippet`), `/snippet` (SnippetPage), `/snippet/unsubscribe` (UnsubscribePage)
- **PAT-002**: Shared `Layout` component wraps all pages with navigation (even if nav is minimal for MVP)
- **PAT-003**: Form validation: controlled React state + validation before POST
- **PAT-004**: On successful submit, conditionally render success message in-place (React state toggle)
- **PAT-005**: Component-based architecture with clear separation: pages, components, utils, styles

## 2. Implementation Steps

### Phase 1: Project Setup & Infrastructure

- GOAL-001: Initialize React + Vite project with routing, deployment config, and base architecture

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Run `npm create vite@latest landing -- --template react-ts` from repo root. Rename to `landing-site` if needed. Install dependencies: `react-router-dom` | | |
| TASK-002 | Configure `vite.config.ts`: no base path needed (deploys to root on Vercel). Add alias `@/` → `src/` for cleaner imports | | |
| TASK-003 | Set up React Router in `src/App.tsx` with `BrowserRouter`. Routes: `/` redirects to `/snippet`, `/snippet` renders `SnippetPage`, `/snippet/unsubscribe` renders `UnsubscribePage` | | |
| TASK-004 | Create `src/components/Layout.tsx`: shared layout with minimal navigation (just brand mark for now, extensible for future nav links). Wraps all page content with consistent header/footer structure | | |
| TASK-005 | Create project structure: `src/pages/`, `src/components/`, `src/utils/`, `src/styles/`. Move default files to appropriate directories | | |
| TASK-006 | Create Vercel deployment config: `vercel.json` with SPA rewrite rules (all routes → `/index.html` for client-side routing). Set build command `npm run build`, output directory `dist` | | |
| TASK-007 | Add `<meta>` tags in `index.html`: charset, viewport, description ("IRIS - Code comprehension tools for the AI era"), Open Graph tags (og:title, og:description, og:url, og:type). Set `<html lang="en">` | | |

### Phase 2: Global Styles & Design System

- GOAL-002: Create global CSS with design tokens, typography, and reusable component styles

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Create `src/styles/globals.css`: CSS custom properties for color palette (flexible, design during implementation), reset styles, base typography. Import Google Fonts in `index.html` (serif display font for headlines, system sans-serif for body, monospace for code) with `display=swap` | | |
| TASK-009 | Define spacing scale (8px rhythm), breakpoints (mobile-first: 768px, 1024px), typography scale (fluid scaling with clamp), focus styles (`:focus-visible` outlines), transition durations in CSS custom properties | | |
| TASK-010 | Create `src/styles/components.css`: reusable component styles for buttons, form inputs, cards. Dark CTA button style, pill/chip toggle buttons, input focus rings, card shadows | | |
| TASK-011 | Add subtle CSS entrance animations: `@keyframes fade-up`. Applied to page sections with staggered `animation-delay`. Include `@media (prefers-reduced-motion: reduce)` to disable animations | | |

### Phase 3: Snippet Page Components

- GOAL-003: Build all components for the Snippet newsletter landing page

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Create `src/components/snippet/Hero.tsx`: h1 headline "Can you read code faster than AI writes it?", p subheadline "Code reading challenges. Mon/Wed/Fri mornings. 2 minutes." Large serif headline, muted subheadline, generous vertical padding (80px mobile / 120px desktop), centered text | | |
| TASK-013 | Create `src/components/snippet/FormatPreview.tsx`: email card component (white background, subtle border + shadow, rounded corners) containing — subject line header ("Can you read this #012: <title>"), `<pre><code>` block with inline syntax-highlighted Python snippet (8-12 lines, new CLI tool snippet), italic challenge question "Before scrolling: what does this do?", "The Breakdown" section with 3 `<li>` bullets (what it does, key responsibility, the clever part), "Project Context" paragraph. Code block uses Track H spec. Component receives snippet data as props for future reusability | | |
| TASK-014 | Create `src/components/snippet/SignupForm.tsx`: controlled form with React state (email, writtenLanguage, programmingLanguages). Email `<input type="email">` full-width with border + focus ring. `<fieldset>`+`<legend>` for radio group (English/Korean) and checkbox group (Python, JS/TS, C/C++), styled as pill/chip toggle buttons. Submit `<button>` full-width with dark background. Privacy note "No spam. Unsubscribe anytime." in muted small text. Inline error messages rendered conditionally below invalid fields | | |
| TASK-015 | Add form validation logic in `SignupForm.tsx`: validate email format via regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), validate at least 1 programming language checked. Show inline errors. Build POST payload `{ email, written_language, programming_languages: [...], source: "landing_page", subscribed_date: new Date().toISOString() }`. Send via `fetch()` to constant `WEBHOOK_URL = 'https://n8n.iris-codes.com/webhook/subscribe'` (placeholder) with `Content-Type: application/json`. Disable button + "Subscribing..." during request. On success (or catch while placeholder): render success message "You're subscribed! First Snippet arrives Monday 7am." Add `// TODO: remove catch fallback when Track F provides real webhook URL` | | |
| TASK-016 | Create `src/components/snippet/Footer.tsx`: minimal footer with unsubscribe link to `/snippet/unsubscribe` (React Router `<Link>`). Can be extended in future for links, copyright, etc. | | |

### Phase 4: Pages Assembly

- GOAL-004: Assemble page components and create routes

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Create `src/pages/SnippetPage.tsx`: compose Hero, FormatPreview, SignupForm, Footer in order. Wrap in `<Layout>`. Apply fade-up animations to sections with staggered delays | | |
| TASK-018 | Create `src/pages/UnsubscribePage.tsx`: centered message "You're unsubscribed from Snippet.", secondary text "You won't receive any more emails from us.", React Router `<Link>` to `/snippet` with text "Changed your mind? Resubscribe". Wrap in `<Layout>` | | |
| TASK-019 | Add responsive CSS across all components: mobile-first base styles, `@media (min-width: 768px)` for larger typography and spacing. Code block `overflow-x: auto` for horizontal scroll on narrow screens. Touch targets minimum 44px height. Email input `font-size: 16px` (prevents iOS zoom). All interactive elements have visible `:focus-visible` styles. WCAG AA color contrast ratios | | |

### Phase 5: Vercel Deployment

- GOAL-005: Deploy to Vercel and configure custom domain

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | Install Vercel CLI: `npm i -g vercel`. Login: `vercel login` | | |
| TASK-021 | Deploy to preview: `cd landing && vercel` (follow prompts, select project settings). Verify preview deployment works, test all routes (`/`, `/snippet`, `/snippet/unsubscribe`) | | |
| TASK-022 | Deploy to production: `vercel --prod`. Note the production URL (e.g., `project-name.vercel.app`) | | |
| TASK-023 | In Vercel dashboard: Go to project → Settings → Domains → Add Domain. Add `iris-codes.com` (apex domain). Vercel will show required DNS records | | |
| TASK-024 | In Namesquare DNS settings for `iris-codes.com`: Add A record pointing to Vercel IP (`76.76.21.21`). Add CNAME record for `www` pointing to `cname.vercel-dns.com`. Delete any conflicting existing records (old A records, CNAMEs) | | |
| TASK-025 | Back in Vercel dashboard: Click "Verify" to confirm DNS propagation. May take 5-60 minutes. Use https://dnschecker.org to monitor propagation | | |
| TASK-026 | Verify SSL certificate is auto-provisioned by Vercel (happens automatically after domain verification). Test `https://iris-codes.com`, `https://iris-codes.com/snippet`, `https://iris-codes.com/snippet/unsubscribe`. Verify root redirects to `/snippet`. Verify `https://www.iris-codes.com` redirects to apex domain | | |

### Phase 6: Testing & Verification

- GOAL-006: Verify all acceptance criteria are met

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-027 | Test responsiveness: verify layout at 375px (mobile), 768px (tablet), 1280px (desktop) viewport widths. Check code block horizontal scroll on mobile. Verify all touch targets are 44px+ | | |
| TASK-028 | Test form validation: submit with empty email (should show error), submit with invalid email format (should show error), submit with no programming language selected (should show error), submit with valid data (should show success message) | | |
| TASK-029 | Test cross-browser: Chrome, Safari, Firefox on desktop. Safari on iOS. Check for layout breaks, form styling issues, animation rendering | | |
| TASK-030 | Test performance: page load time under 2 seconds (Lighthouse or browser DevTools network tab). Verify Vite-built assets are hashed and cacheable. Google Fonts loaded with `display=swap` | | |
| TASK-031 | Test accessibility: run Lighthouse accessibility audit, verify score >= 90. Check keyboard navigation through form. Verify focus styles visible on all interactive elements | | |
| TASK-032 | Test SPA routing: direct navigation to `https://iris-codes.com/snippet/unsubscribe` loads correctly (Vercel rewrites to `index.html`, React Router renders UnsubscribePage). Resubscribe link navigates back to `/snippet` via client-side routing. Root `/` redirects to `/snippet` | | |

## 3. Alternatives

- **ALT-001**: Host on EC2 with Nginx instead of Vercel — rejected because Vercel offers free hosting, automatic SSL, preview deployments, and simpler CI/CD. EC2 adds operational overhead.
- **ALT-002**: Plain HTML/CSS with no build step — rejected because this is a full startup homepage with multiple future pages (extension, Mac app, etc.). React + Vite provides component reusability and scalable routing.
- **ALT-003**: Next.js instead of Vite — rejected because SSR/SSG is unnecessary for a static marketing site. Vite is lighter, faster, and simpler for client-only apps.
- **ALT-004**: Separate repos for each product page — rejected because all pages share navigation and branding. Monorepo landing site is simpler to maintain.
- **ALT-005**: Use Formspree/Typeform for the signup form — rejected because Track F will provide an n8n webhook for full control over subscriber data and welcome email flow.

## 4. Dependencies

- **DEP-001**: Track H design decisions (complete) — `docs/tasks/track-h/track-h-summary.md`
- **DEP-002**: Vercel account (free tier)
- **DEP-003**: DNS access to `iris-codes.com` domain registrar (for A/CNAME records)
- **DEP-004**: Google Fonts CDN — for display font (loaded async with `display=swap`)
- **DEP-005**: Track F n8n webhook URL — placeholder for now, will be wired in when Track F completes
- **DEP-006**: Node.js + npm — for Vite build toolchain (already available in repo)
- **DEP-007**: `react-router-dom` — for client-side SPA routing

## 5. Files

**Project Root:**
- **FILE-001**: `landing/package.json` — dependencies, scripts
- **FILE-002**: `landing/vite.config.ts` — Vite config with alias
- **FILE-003**: `landing/vercel.json` — Vercel deployment config with SPA rewrites
- **FILE-004**: `landing/index.html` — Vite entry HTML with meta tags and Google Fonts

**Source:**
- **FILE-005**: `landing/src/App.tsx` — React Router setup with routes
- **FILE-006**: `landing/src/main.tsx` — React entry point

**Styles:**
- **FILE-007**: `landing/src/styles/globals.css` — CSS custom properties, reset, base typography
- **FILE-008**: `landing/src/styles/components.css` — Reusable component styles
- **FILE-009**: `landing/src/styles/animations.css` — Keyframes and animation utilities

**Layout:**
- **FILE-010**: `landing/src/components/Layout.tsx` — Shared layout with navigation

**Pages:**
- **FILE-011**: `landing/src/pages/SnippetPage.tsx` — Snippet newsletter landing page
- **FILE-012**: `landing/src/pages/UnsubscribePage.tsx` — Unsubscribe confirmation page

**Snippet Components:**
- **FILE-013**: `landing/src/components/snippet/Hero.tsx` — Snippet hero section
- **FILE-014**: `landing/src/components/snippet/FormatPreview.tsx` — Example email card with code snippet
- **FILE-015**: `landing/src/components/snippet/SignupForm.tsx` — Signup form with validation and webhook POST
- **FILE-016**: `landing/src/components/snippet/Footer.tsx` — Footer with unsubscribe link

## 6. Testing

- **TEST-001**: Visual regression — screenshot Snippet page at 375px, 768px, 1280px widths and verify no layout breaks
- **TEST-002**: Form validation — submit with empty fields, invalid email, no checkboxes selected; verify error messages appear
- **TEST-003**: Form submission — submit with valid data; verify success message replaces form
- **TEST-004**: Unsubscribe page — verify `/snippet/unsubscribe` loads via direct URL (SPA routing), displays correct message, resubscribe link navigates to `/snippet`
- **TEST-005**: Performance — Lighthouse performance score >= 90, load time < 2s on 3G throttle
- **TEST-006**: Accessibility — Lighthouse accessibility score >= 90, keyboard navigation works, focus styles visible
- **TEST-007**: Cross-browser — Chrome, Safari, Firefox desktop; Safari iOS mobile
- **TEST-008**: Routing — root `/` redirects to `/snippet`, direct navigation to `/snippet/unsubscribe` works, client-side nav works

## 7. Risks & Assumptions

- **RISK-001**: Google Fonts load may add latency on slow connections. Mitigation: use `display=swap` and `preconnect` hints. Fallback system fonts ensure text is visible immediately.
- **RISK-002**: Placeholder webhook URL means form submissions go nowhere until Track F completes. Mitigation: catch fetch errors gracefully, still show success message. Add TODO comment for wiring.
- **RISK-003**: DNS propagation delay when configuring custom domain on Vercel. Mitigation: test with Vercel preview URL first, configure DNS during off-hours, verify with DNS checker tools before announcing.
- **RISK-004**: Vercel free tier has bandwidth limits (100GB/month). Mitigation: monitor usage in Vercel dashboard. For MVP, highly unlikely to exceed limit.
- **ASSUMPTION-001**: DNS access to `iris-codes.com` at Namesquare is available for updating A/CNAME records.
- **ASSUMPTION-002**: Vercel's automatic SSL certificate provisioning works for custom domain (standard feature, should work).
- **ASSUMPTION-003**: Future product pages (extension, Mac app) will share the same design system and layout structure.

## 8. Related Specifications / Further Reading

- [Track E Task Spec](../track-e-distribution-landing.md)
- [Track H Summary (Design Decisions)](../track-h/track-h-summary.md)
- [Product Strategy](../../strategy-2026-02-10.md)
- [Target Audience Analysis](../../thoughts.md)
- [Project Progress](../UPDATES.md)
- [Vercel Docs - Deploy React Apps](https://vercel.com/docs/frameworks/vite)
- [Vercel Docs - Custom Domains](https://vercel.com/docs/concepts/projects/custom-domains)
