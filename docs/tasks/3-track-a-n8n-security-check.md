# 3-Track-A — n8n Security Check

**Phase:** 3
**Track:** A
**Scope:** Full security review of all n8n workflows before live deployment — covering node authentication, webhook endpoint security, credentials storage, rate limiting, input validation, and data exposure.

**Dependencies:** Phase 1 and Phase 2 all tracks must be complete (all workflows must exist before auditing).

**Deliverables:**
- `snippet/n8n-workflows/security-checklist.md` — findings and resolutions for every security concern identified
- All critical issues resolved in n8n before this track closes

**Out of scope:**
- Backend (Python/Flask) security — separate concern
- Frontend security — covered in 3-Track-B

**Skills:**
- `sequential-thinking` — for systematically working through each security surface area without missing anything
- `n8n-skills-2.2.0` — for understanding node capabilities, credential options, and webhook configuration

---

## Phase 1 — Explore

Read the following files in order:

0. `./README.md` - understand the workflow
1. `snippet/n8n-workflows/workflow-subscription-double-optin.md` — map all nodes, identify which are public-facing, which require credentials
2. `snippet/n8n-workflows/workflow-confirmation.md` — same
3. `snippet/n8n-workflows/workflow-unsubscribe-token-based.md` — same
4. `snippet/n8n-workflows/workflow-gmail-drafts-to-sheets.md` — same (Phase 1 Track B output)
5. `snippet/n8n-workflows/workflow-send-email.md` — same (Phase 2 Track A output)

After reading all workflows, answer these questions for each:

**Webhook security:**
- Which webhooks are publicly accessible with no authentication?
- What stops a bad actor from calling these endpoints repeatedly or with malformed input?
- Is there any token or signature validation on incoming requests?

**Node authentication:**
- Which nodes use OAuth2 or API key credentials? Are those credentials scoped minimally (read-only where possible)?
- Are there any nodes that access external services without authentication where auth is available?

**Input validation:**
- What user-supplied input enters each workflow (email, token, etc.)? Is it validated before being used in downstream nodes?
- Is there any risk of injection (e.g. user input written directly to Google Sheets without sanitization)?

**Data exposure:**
- What data does each webhook response return? Is any sensitive data (email, tokens) returned unnecessarily?
- Are error responses leaking internal state?

**Credentials and secrets:**
- Are credentials stored in n8n's credential manager, or hardcoded anywhere in Code nodes?

**Rate limiting:**
- Are any public webhook endpoints rate-limited?

---

## Phase 2 — Discuss

Present a structured findings report to the human engineer:

1. List every issue found, grouped by: Critical / High / Low.
   - Critical: an issue that could allow unauthorized access, data breach, or abuse
   - High: an issue that weakens security but requires specific conditions to exploit
   - Low: best-practice gaps with minimal real-world risk at current scale
2. For each Critical and High issue, propose a specific fix.
3. Agree on which issues to fix before deploy and which are acceptable to defer.

Do not proceed to Plan until the human engineer confirms which issues to fix.

### Phase 2 Findings & Decisions (2026-02-21)

#### Critical

**C1 — No rate limiting on `/subscribe` webhook**
Public endpoint with no protection. Enables Gmail quota exhaustion and Sheets pollution via scripted abuse.
**Decision: Fix before deploy.**
Fix: Add origin header check (validate `Origin` matches `iris-codes.com`) in the Code - Validate Name node, AND require a shared `api_key` field in the POST body (static secret known to the frontend). Requests missing either are rejected before any processing.

#### High

**H1 — Email enumeration via 409 on `/subscribe`**
The `409 "Email already subscribed"` response confirms whether an email is in the subscriber list. No rate limiting makes bulk enumeration trivial.
**Decision: Fix before deploy.**
Fix: Return a status-neutral 200 response for both new signups and already-confirmed emails. Message: "Thanks! If you're not already subscribed, a confirmation email is on its way." This eliminates the enumeration vector while giving users a reasonable UX signal. The confirmed-subscriber UX distinction is accepted as lost.

**H2 — User-controlled `source` and `subscribed_date` written to Sheets**
Frontend sends both fields; both are written to Sheets without override. Allows arbitrary string injection into internal records.
**Decision: Fix before deploy.**
Fix: In the Code - Validate Name node, ignore both fields from the request body. Hard-code `source: 'landing_page'` and set `subscribed_date: new Date().toISOString()` server-side.

#### Low

**L1 — Email echoed in `already_confirmed` and `already_unsubscribed` responses**
Unnecessary data exposure — confirms the email associated with a token to the caller.
**Decision: Fix before deploy.**
Fix: Remove `email` field from the response bodies in the Format Already Confirmed Response and Format Already Unsubscribed Response Code nodes.

**L2 — Unsubscribe token has no expiration**
Token remains valid indefinitely. Low real-world risk at current scale.
**Decision: Accepted risk. No fix.**

**L3 — No CORS restriction on webhooks**
n8n doesn't enforce CORS natively. Minimal practical impact since the endpoint is designed for browser calls.
**Decision: Accepted risk. No fix.**

---

## Phase 3 — Plan

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/3-track-a-n8n-security-check/`.

The plan must list every agreed fix with:
- Which workflow and node it applies to
- Exact change to make in n8n

---

## Phase 4 — Execute

Apply all agreed fixes in n8n.

Then write `snippet/n8n-workflows/security-checklist.md` documenting:
- Each surface area reviewed
- Issues found (all severity levels)
- Resolution status: Fixed / Accepted risk / Deferred

Verification:
- Re-test each public webhook after changes to confirm it still works correctly
- Confirm no credentials are hardcoded in any Code node
