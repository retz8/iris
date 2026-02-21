# Action Plan: n8n Security Fixes

**Track:** 3-A
**Status:** Ready to execute
**Scope:** n8n workflow changes only. C1 frontend implementation is tracked separately.

All fixes are applied inside the single "My workflow" canvas at `retz8.app.n8n.cloud`.

---

## Fix 1 — C1: Webhook protection on `/subscribe` (n8n side)

**Node:** `Code - Validate Email & Required Fields` in the **Subscription Workflow** section

**What to change:** Add two security checks at the very top of the existing code — before any email/language validation runs. Requests that fail either check are rejected with a 403 immediately.

**Check 1 — Origin header**
Verifies the request came from the production frontend. Blocks requests from unknown origins.

**Check 2 — api_key in request body**
Verifies the request includes the shared secret the frontend sends. Blocks unauthenticated callers who aren't using the frontend.

### Step-by-step

**Step 1 — Create the secret variable in n8n**

1. Go to **Home → Variables** (left sidebar)
2. Click **Add variable**
3. Name: `WEBHOOK_SECRET`
4. Value: generate a strong random string — use a password manager or run `openssl rand -hex 32` in terminal. Copy it — you'll need it for the frontend later.
5. Save

**Step 2 — Update the Code node**

1. Open the workflow canvas
2. Click once on the **`Code - Validate Email & Required Fields`** node in the Subscription Workflow section to select it, then click the pencil/edit icon to open its settings panel
3. Prepend the following block to the **very top** of the existing JavaScript, before any other code:

```javascript
// --- Security checks ---
const secItem = $input.first();
const headers = secItem.json.headers || {};
const origin = headers['origin'] || headers['Origin'] || '';

const allowedOrigins = ['https://iris-codes.com'];
if (!allowedOrigins.includes(origin)) {
  return [{
    json: {
      error: true,
      error_type: 'unauthorized',
      message: 'Unauthorized',
      statusCode: 403
    }
  }];
}

const bodyApiKey = secItem.json.body?.api_key || secItem.json.api_key || '';
const expectedKey = $vars.WEBHOOK_SECRET;
if (!bodyApiKey || bodyApiKey !== expectedKey) {
  return [{
    json: {
      error: true,
      error_type: 'unauthorized',
      message: 'Unauthorized',
      statusCode: 403
    }
  }];
}
// --- End security checks ---
```

4. The rest of the existing code (email regex, language validation, etc.) stays unchanged below this block
5. Click **Save** in the node panel

**Step 3 — Ensure the IF node handles 403 responses**

The existing IF node checks `$json.error === false`. A 403 from the new check will have `error: true`, so it will route to the FALSE branch — which already responds with a 400 error. The status code returned will be whatever `$json.statusCode` is, which is now 403. No IF node change is needed.

> Note: During local frontend development, temporarily add `'http://localhost:5173'` (or your dev tunnel URL) to `allowedOrigins`. Remove it before the final production deploy.

---

## Fix 2 — H1: Status-neutral response for already-confirmed subscribers

**Node:** `Code - Format Already Confirmed Error` in the **Subscription Workflow** section
(This is the node on the Switch Rule 1 output — the "error_confirmed" branch)

**What to change:** Replace the 409 "Email already subscribed" response with the same neutral message given to new signups. This removes the ability to enumerate whether an email is subscribed.

### Step-by-step

1. Open the **`Code - Format Already Confirmed Error`** node
2. Replace the entire code with:

```javascript
const item = $input.first();

return [
  {
    json: {
      success: true,
      status: "pending",
      message: "Thanks! If you're not already subscribed, a confirmation email is on its way.",
      statusCode: 200
    }
  }
];
```

3. Save

**Step 2 — Update the corresponding Respond to Webhook node**

The `Respond to Webhook - Already Confirmed Error` node currently sends a 409. Since the Code node now returns `statusCode: 200`, the dynamic `{{ $json.statusCode }}` expression will automatically send 200. No further change is needed here.

---

## Fix 3 — H2: Hard-code source and subscribed_date server-side

**Node:** `Code - Validate Email & Required Fields` in the **Subscription Workflow** section
(Same node as Fix 1 — do this in the same editing session)

**What to change:** The node currently reads `source` and `subscribed_date` from the request body and passes them downstream. Both fields should be ignored from the client and set server-side instead.

### Step-by-step

In the same Code node as Fix 1, find the block that reads these fields:

```javascript
const source = item.json.source;
const subscribed_date = item.json.subscribed_date;
```

And the block that passes them to the output:

```javascript
source: source || 'landing_page',
subscribed_date: subscribed_date || new Date().toISOString()
```

Replace those two output lines with:

```javascript
source: 'landing_page',
subscribed_date: new Date().toISOString()
```

And remove the two `const source` / `const subscribed_date` extraction lines above — they're no longer needed.

Save the node.

---

## Fix 4 — L1: Remove email from already-confirmed and already-unsubscribed responses

Two separate nodes need this change.

### Fix 4a — Confirmation Workflow

**Node:** `Code - Format Already Confirmed Response` in the **Confirmation Workflow** section
(Switch Rule 2 output — the "already_confirmed" branch)

Find this line in the return object:

```javascript
email: item.json.email,
```

Delete it. Save.

### Fix 4b — Unsubscribe Workflow

**Node:** `Code - Format Already Unsubscribed Response` in the **Unsubscription Workflow** section
(Switch Rule 2 output — the "already_unsubscribed" branch)

Find this line in the return object:

```javascript
email: item.json.email,
```

Delete it. Save.

---

## Verification checklist

After applying all fixes, test each change:

**C1 — Origin check**
```bash
# Should return 403
curl -X POST https://retz8.app.n8n.cloud/webhook/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","programming_languages":["Python"]}'

# Should proceed normally (reach email validation)
curl -X POST https://retz8.app.n8n.cloud/webhook/subscribe \
  -H "Content-Type: application/json" \
  -H "Origin: https://iris-codes.com" \
  -d '{"email":"test@example.com","programming_languages":["Python"],"api_key":"<YOUR_WEBHOOK_SECRET>"}'
```

**C1 — api_key check**
```bash
# Should return 403 (wrong key)
curl -X POST https://retz8.app.n8n.cloud/webhook/subscribe \
  -H "Content-Type: application/json" \
  -H "Origin: https://iris-codes.com" \
  -d '{"email":"test@example.com","programming_languages":["Python"],"api_key":"wrongkey"}'
```

**H1 — No enumeration**
```bash
# Submit a confirmed email — should return 200 with neutral message, not 409
curl -X POST https://retz8.app.n8n.cloud/webhook/subscribe \
  -H "Content-Type: application/json" \
  -H "Origin: https://iris-codes.com" \
  -d '{"email":"<already_confirmed_email>","programming_languages":["Python"],"api_key":"<YOUR_WEBHOOK_SECRET>"}'
# Expected: {"success":true,"status":"pending","message":"Thanks! If you're not already subscribed..."}
```

**H2 — source/subscribed_date overridden**
```bash
# Send with malicious source field — check Google Sheets row has 'landing_page', not the injected value
curl -X POST https://retz8.app.n8n.cloud/webhook/subscribe \
  -H "Content-Type: application/json" \
  -H "Origin: https://iris-codes.com" \
  -d '{"email":"newtest@example.com","programming_languages":["Python"],"source":"<script>","subscribed_date":"bad","api_key":"<YOUR_WEBHOOK_SECRET>"}'
# Check Sheets: source column should be 'landing_page', subscribed_date should be a real ISO timestamp
```

**L1 — No email in responses**
```bash
# already_confirmed on confirm endpoint — response should NOT contain email field
curl https://retz8.app.n8n.cloud/webhook/confirm?token=<already_confirmed_token>
```

---

## C1 — Frontend implementation

The frontend needs to:
1. Include the `WEBHOOK_SECRET` value (stored as an environment variable, not hardcoded) in every POST to `/subscribe` as `api_key` in the request body
2. Ensure all requests include the `Origin` header (browsers do this automatically for cross-origin fetch calls — no explicit code needed)

Frontend implementation details are tracked separately. See discussion in Phase 2 notes.
