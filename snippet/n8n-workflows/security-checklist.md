# n8n Workflows Security Checklist

**Review date:** 2026-02-21
**Reviewer:** 3-Track-A Security Review
**Scope:** All five n8n workflows before live deployment

---

## Surface Areas Reviewed

| Surface | Workflows Covered |
|---|---|
| Webhook authentication | Subscription, Confirmation, Unsubscribe |
| Rate limiting | Subscription, Confirmation, Unsubscribe |
| Input validation | Subscription |
| Data exposure in responses | Subscription, Confirmation, Unsubscribe |
| Credential storage | All five workflows |
| Token security | Subscription, Confirmation, Unsubscribe |
| Injection risk | Subscription |

---

## Findings & Resolutions

### C1 — No rate limiting on `/subscribe` webhook

**Severity:** Critical
**Workflow:** Subscription
**Node:** Webhook - subscription (trigger), Code - Validate Email & Required Fields

No protection on the public subscribe endpoint. Enabled Gmail quota exhaustion via scripted unique-email signups and Google Sheets pollution.

**Resolution:** Fixed
- **n8n (manual):** Added Origin header check and `api_key` body field validation at the top of `Code - Validate Email & Required Fields`. Requests with an Origin not matching `https://iris-codes.com` or a missing/incorrect `api_key` are rejected with 403 before any processing.
- **Frontend:** Added `api_key: import.meta.env.VITE_WEBHOOK_SECRET` to the POST payload in `web/src/components/snippet/SignupForm.tsx`. Secret stored as `VITE_WEBHOOK_SECRET` env variable on the frontend and `WEBHOOK_SECRET` variable in n8n Variables.

---

### H1 — Email enumeration via 409 on `/subscribe`

**Severity:** High
**Workflow:** Subscription
**Node:** Code - Format Already Confirmed Error, Respond to Webhook - Already Confirmed Error

The 409 `"Email already subscribed"` response explicitly confirmed whether an email was in the subscriber list. Combined with no rate limiting, bulk enumeration of the subscriber list was possible.

**Resolution:** Fixed
- **n8n (manual):** `Code - Format Already Confirmed Error` now returns a 200 with a status-neutral message: `"Thanks! If you're not already subscribed, a confirmation email is on its way."` — identical in shape to the new signup success response. The 409 status code is gone.

---

### H2 — User-controlled `source` and `subscribed_date` written to Sheets

**Severity:** High
**Workflow:** Subscription
**Node:** Code - Validate Email & Required Fields

Both fields were read from the request body and written directly to Google Sheets, allowing arbitrary string injection into internal records and corrupting analytics data.

**Resolution:** Fixed
- **n8n (manual):** Both fields are now hard-coded server-side in the Code node: `source: 'landing_page'`, `subscribed_date: new Date().toISOString()`. Client-supplied values for these fields are ignored.

---

### L1 — Email echoed in `already_confirmed` and `already_unsubscribed` responses

**Severity:** Low
**Workflows:** Confirmation, Unsubscribe
**Nodes:** Code - Format Already Confirmed Response, Code - Format Already Unsubscribed Response

Both nodes returned `{ email: item.json.email }` in their response body. Unnecessary — confirms the email associated with a token to any caller holding the token.

**Resolution:** Fixed
- **n8n (manual):** `email` field removed from both response bodies.

---

### L2 — Unsubscribe token has no expiration

**Severity:** Low
**Workflow:** Unsubscribe
**Node:** Code - Validate Subscriber Status

The `unsubscribe_token` (UUID v4) is valid indefinitely — no expiration is set. If leaked (e.g. via forwarded email), it remains exploitable permanently.

**Resolution:** Accepted risk
- UUID v4 token space (2^122) makes brute-force infeasible.
- Tokens are only present in emails sent to the subscriber themselves.
- At current scale, the risk is minimal.
- Deferred: consider adding token rotation on each newsletter send in a future hardening pass.

---

### L3 — No CORS restriction on webhooks

**Severity:** Low
**Workflows:** Subscription, Confirmation, Unsubscribe
**Node:** All Webhook trigger nodes

n8n webhooks do not enforce CORS by default. Any origin can call the endpoints.

**Resolution:** Accepted risk
- Browser CORS only applies to cross-origin browser requests, not server-to-server or curl.
- The endpoints are designed to be called from browsers — restricting origin is defense-in-depth only.
- C1 fix (Origin header check in the Code node) provides equivalent protection for the subscribe endpoint.

---

## Credential Storage Audit

| Credential | Type | Storage | Hardcoded in Code nodes? |
|---|---|---|---|
| Gmail | OAuth2 | n8n credential manager | No |
| Google Sheets (subscribers) | OAuth2 | n8n credential manager | No |
| Google Sheets (drafts) | OAuth2 | n8n credential manager | No |
| WEBHOOK_SECRET | Variable | n8n Variables | No (read via `$vars.WEBHOOK_SECRET`) |

All credentials are stored in n8n's credential manager or Variables. No secrets found hardcoded in any Code node.

---

## Token Security Audit

| Token | Generation | Expiration | Single-use |
|---|---|---|---|
| Confirmation token | `crypto.randomUUID()` | 48 hours (enforced server-side) | Yes — cleared from Sheets on use |
| Unsubscribe token | `crypto.randomUUID()` | None | Yes — cleared from Sheets on use |

Both tokens use `crypto.randomUUID()` (cryptographically secure, UUID v4, 2^122 space). No use of `Math.random()` for security-relevant token generation.
