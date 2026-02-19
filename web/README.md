# IRIS Web App

React + Vite + TypeScript SPA deployed at [iris-codes.com](https://iris-codes.com) on Vercel.

This is the IRIS startup homepage. Initial launch includes the Snippet newsletter landing page. Future pages will cover the VS Code extension, Mac app, and other IRIS products.

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | — | Redirects to `/snippet` |
| `/snippet` | `SnippetPage` | Newsletter landing page (hero, format preview, signup form) |
| `/snippet/confirm` | `ConfirmationPage` | Email confirmation after double opt-in |
| `/snippet/unsubscribe` | `UnsubscribePage` | Token-based unsubscribe with confirmation step |

## Project Structure

```
web/
├── index.html                     # Vite entry point (meta tags, Google Fonts)
├── vite.config.ts                 # @/ alias → src/
├── vercel.json                    # SPA rewrites (all routes → index.html)
└── src/
    ├── App.tsx                    # BrowserRouter + route definitions
    ├── main.tsx                   # React entry point
    ├── config/
    │   └── webhooks.ts            # WEBHOOK_BASE (dev vs prod n8n URLs)
    ├── components/
    │   ├── Layout.tsx             # Shared layout with brand mark header
    │   └── snippet/
    │       ├── Hero.tsx           # Headline + subheadline
    │       ├── FormatPreview.tsx  # Sample email card with syntax-highlighted code
    │       ├── SignupForm.tsx     # Progressive disclosure form + webhook POST
    │       └── Footer.tsx        # Minimal footer
    ├── pages/
    │   ├── SnippetPage.tsx        # Assembles snippet components
    │   ├── ConfirmationPage.tsx   # Token verification page
    │   └── UnsubscribePage.tsx    # Token-based unsubscribe page
    └── styles/
        ├── globals.css            # Design tokens, reset, base typography
        ├── components.css         # Buttons, forms, cards, pills, code blocks
        └── animations.css         # fade-up / fade-in keyframes
```

## Local Development

```bash
cd web
npm install
npm run dev          # localhost:5173
npm run build        # production build → dist/
npm run preview      # preview production build locally
```

No environment variable is required for local development. The app defaults to the n8n webhook-test URLs.

## Environment Variables

| Variable | Values | Effect |
|----------|--------|--------|
| `VITE_APP_ENV` | `prod` / anything else | Switches webhook base URL |

Set in Vercel project settings for production deployments:
- `VITE_APP_ENV=prod`

Webhook base URLs (defined in `src/config/webhooks.ts`):
- dev: `https://retz8.app.n8n.cloud/webhook-test`
- prod: `https://retz8.app.n8n.cloud/webhook`

## Subscription Flow (Double Opt-In)

The Snippet newsletter uses a two-step double opt-in flow for GDPR/CAN-SPAM compliance.

### Step 1 — Signup Form (progressive disclosure)

1. User lands on `/snippet`, sees email field and "Subscribe" button.
2. After entering a valid email and clicking Subscribe, programming language checkboxes appear (Python, JS/TS, C/C++ — select at least 1).
3. On final submit, `SignupForm` POSTs to `/subscribe`. Button shows "Subscribing..." and is disabled during the request.
4. On success (`status: "pending"`), the form is replaced by a "Check your email" confirmation message showing the submitted email address.
5. On error, an inline error message is displayed; the form remains editable.

### Step 2 — Email Confirmation

1. n8n sends a confirmation email containing a link to `/snippet/confirm?token={uuid}`.
2. `ConfirmationPage` extracts the token via `useSearchParams`, then GETs `/confirm?token={uuid}`.
3. States: loading ("Confirming your subscription..."), confirmed ("You're confirmed! First Snippet arrives {day} 7am"), or error (expired, invalid, already confirmed — each with clear copy and a link back to `/snippet`).

### Delivery Day Logic

`getNextDeliveryDay()` (exported from `SignupForm.tsx`) calculates the next Mon/Wed/Fri based on the current day:
- Sun/Mon → Monday
- Tue/Wed → Wednesday
- Thu/Fri/Sat → Monday

## Unsubscribe Flow

Unsubscribe links in newsletter emails point to `/snippet/unsubscribe?token={uuid}`.

1. Page loads and shows a confirmation prompt: "Unsubscribe from Snippet?" with the email address.
2. On confirm, POSTs `{ token }` to `/unsubscribe`.
3. States: success ("You're unsubscribed"), already unsubscribed, or error (missing/invalid token, never confirmed).
4. No footer link on the landing page — industry standard is email-link-only unsubscribe.

## Webhook API Reference

All endpoints are on `WEBHOOK_BASE` (see environment section above).

### POST /subscribe

Request:
```json
{
  "email": "user@example.com",
  "programming_languages": ["Python", "JS/TS"],
  "source": "landing_page",
  "subscribed_date": "2026-02-17T12:00:00Z"
}
```

Valid `programming_languages` values: `"Python"`, `"JS/TS"`, `"C/C++"` (array, min 1).

| HTTP | Condition | Response shape |
|------|-----------|----------------|
| 200 | New or re-subscription | `{ success: true, status: "pending", email }` |
| 200 | Duplicate (already pending) | `{ success: true, status: "pending", message: "already sent", email }` |
| 400 | Validation error | `{ success: false, error, error_type }` |
| 409 | Already confirmed subscriber | `{ success: false, error: "Email already subscribed", email }` |

### GET /confirm?token={uuid}

| HTTP | Condition | Response shape |
|------|-----------|----------------|
| 200 | Confirmed | `{ success: true, email }` |
| 200 | Already confirmed | `{ success: true, message: "already subscribed", email }` |
| 400 | Missing token | `{ success: false, error_type: "missing_token" }` |
| 400 | Expired token | `{ success: false, error_type: "token_expired" }` |
| 404 | Token not found | `{ success: false, error_type: "token_not_found" }` |
| 500 | Invalid status | `{ success: false, error_type: "invalid_status" }` |

### POST /unsubscribe

Request: `{ "token": "{uuid}" }`

| HTTP | Condition | Response shape |
|------|-----------|----------------|
| 200 | Unsubscribed | `{ success: true, email }` |
| 200 | Already unsubscribed | `{ success: true, email }` |
| 400 | Missing token | `{ success: false, error_type: "missing_token" }` |
| 400 | Never confirmed | `{ success: false, error_type: "not_confirmed" }` |
| 404 | Token not found | `{ success: false, error_type: "token_not_found" }` |
| 500 | Invalid status | `{ success: false, error_type: "invalid_status" }` |

### error_type → UI mapping

| `error_type` | UI |
|--------------|----|
| `invalid_email` / `missing_programming_languages` / `invalid_programming_languages` | Inline field error on signup form |
| `missing_token` | "Invalid link. Please use the link from your email." |
| `token_expired` | "This link has expired. Please sign up again." + link to /snippet |
| `token_not_found` | "Invalid or already-used link." |
| `not_confirmed` | "This subscription was never confirmed." |
| `invalid_status` | Generic server error, suggest retry |

## Design System

Defined in `src/styles/globals.css` and `src/styles/components.css`.

- Typography: Newsreader (serif, headlines), system sans-serif (body), JetBrains Mono (code)
- Color palette: warm off-white background, editorial neutral tones
- Spacing: 8px rhythm via CSS custom properties (`--space-xs` through `--space-3xl`)
- Breakpoint: mobile-first, `768px` for wider layouts
- Accessibility: WCAG AA contrast, `:focus-visible` outlines, `prefers-reduced-motion` support
- Code block spec: `#f6f8fa` background, `#0969da` left border, inline `<span>` color styles for keywords (`#cf222e`), functions (`#8250df`), strings (`#0a3069`), numbers (`#0550ae`), comments (`#6e7781`)

## Deployment

Hosted on Vercel (free tier). Custom domain `iris-codes.com` configured in Vercel dashboard.

- Root `/` redirects to `/snippet` via React Router (client-side)
- Vercel `vercel.json` rewrites all paths to `index.html` for SPA routing
- SSL auto-provisioned by Vercel after domain verification
- DNS: A record → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com` (Namesquare)

Deploy commands:
```bash
vercel          # preview deploy
vercel --prod   # production deploy
```

## n8n Workflow Documentation

The backend workflows are documented in `docs/tasks/n8n-workflows/`:

- `workflow-subscription-double-optin.md` — subscribe endpoint
- `workflow-confirmation.md` — confirm endpoint
- `workflow-unsubscribe-token-based.md` — unsubscribe endpoint
- `google-sheets-subscribers-schema.md` — subscriber data schema (status: pending / confirmed / unsubscribed)

Token details: UUID v4, 48-hour expiration, single-use (cleared on confirmation).

## Key Decisions

- **Vercel over EC2** — free tier, automatic SSL, preview deployments, no ops overhead
- **React + Vite over plain HTML** — full startup homepage with multiple future product pages; component reuse and routing
- **Progressive disclosure signup** — email first, then language preferences after initial engagement (reduces form anxiety)
- **Double opt-in required** — GDPR Article 7 (explicit consent), CAN-SPAM compliance, list quality
- **Unsubscribe from email links only** — matches Substack/Mailchimp/ConvertKit convention; no footer link on landing page
- **English-only MVP** — simplified from planned bilingual (EN/KO) to single language; multi-language revisitable post-launch
- **3 content variants** — Python, JS/TS, C/C++ (one per programming language)
