# n8n Workflow: Newsletter Subscription (Double Opt-In)

**Status:** ✅ COMPLETE - Implemented and tested (2026-02-17)

**Workflow Name:** Newsletter Subscription Double Opt-In
**Trigger Type:** Webhook (POST)
**Purpose:** Handle newsletter signups with email confirmation, token-based verification, and duplicate/re-subscription handling.

## Prerequisites

- Google Sheets spreadsheet: "Newsletter Subscribers" (see `../schema/google-sheets-subscribers-schema.md`)
- Google OAuth2 credentials configured in n8n
- Gmail/SMTP credentials configured in n8n
- n8n instance accessible at n8n.iris-codes.com

## Workflow Overview

```
Webhook POST /subscribe
    ↓
Code: Validate Email & Required Fields
    ↓
IF: Validation Passed?
    ├─ FALSE → Code: Format Error Response → Respond to Webhook (400)
    └─ TRUE → Google Sheets: Get Row(s) filtered by email
                  ↓
              Code: Check Duplicate Status & Determine Action
                  ↓
              Switch: Route by Action
                  ├─ "error_confirmed" → Code: Format Error → Respond to Webhook (409)
                  ├─ "error_pending"   → Code: Format Response → Respond to Webhook (200)
                  │
                  ├─ "create_new" → Code: Generate Token
                  │                       ↓
                  │                 Gmail: Send Confirmation Email [Continue on Error]
                  │                       ↓
                  │                 Code: Check Gmail Result
                  │                       ↓
                  │                 IF: Gmail Send Failed?
                  │                   ├─ TRUE  → Code: Format Email Error → Respond to Webhook (500)
                  │                   └─ FALSE → Google Sheets: Append New Subscriber
                  │                                   ↓
                  │                             Code: Format Success → Respond to Webhook (200)
                  │
                  └─ "update_resubscribe" → Code: Generate Token [copy]
                                                  ↓
                                            Gmail: Send Confirmation Email [copy, Continue on Error]
                                                  ↓
                                            Code: Check Gmail Result [copy]
                                                  ↓
                                            IF: Gmail Send Failed? [copy]
                                              ├─ TRUE  → Code: Format Email Error [copy] → Respond to Webhook (500)
                                              └─ FALSE → Google Sheets: Update Existing Subscriber
                                                              ↓
                                                        Code: Format Success [copy] → Respond to Webhook (200)
```

## Node-by-Node Configuration

### Node 1: Webhook (Trigger)

**Node Type:** `Webhook`
**Purpose:** Receive POST requests from landing page signup form

**Configuration:**
1. Add Webhook node to canvas
2. Configure parameters:
   - **HTTP Method:** POST
   - **Path:** `subscribe`
   - **Authentication:** None
   - **Response Mode:** "Using 'Respond to Webhook' Node"
   - **Response Data:** First Entry JSON

**Expected Input:**
```json
{
  "email": "user@example.com",
  "programming_languages": ["Python", "JS/TS"],
  "source": "landing_page",
  "subscribed_date": "2026-02-17T12:00:00Z"
}
```

**Webhook URL:** `https://retz8.app.n8n.cloud/webhook-test/subscribe`

---

### Node 2: Code - Validate Email & Required Fields

**Node Type:** `Code`
**Purpose:** Validate email format and ensure all required fields are present

**Configuration:**
1. Add Code node after Webhook
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const items = $input.all();
const results = [];

for (const item of items) {
  const email = item.json.email;
  const programming_languages = item.json.programming_languages;
  const source = item.json.source;
  const subscribed_date = item.json.subscribed_date;

  // Validate email format
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    results.push({
      json: {
        error: true,
        error_type: 'invalid_email',
        message: 'Invalid email format',
        statusCode: 400
      }
    });
    continue;
  }

  // Validate programming_languages
  if (!programming_languages || !Array.isArray(programming_languages) || programming_languages.length === 0) {
    results.push({
      json: {
        error: true,
        error_type: 'missing_programming_languages',
        message: 'At least one programming language is required',
        statusCode: 400
      }
    });
    continue;
  }

  // Validate programming_languages values
  const validLanguages = ['Python', 'JS/TS', 'C/C++'];
  const invalidLanguages = programming_languages.filter(lang => !validLanguages.includes(lang));
  if (invalidLanguages.length > 0) {
    results.push({
      json: {
        error: true,
        error_type: 'invalid_programming_languages',
        message: `Invalid programming languages: ${invalidLanguages.join(', ')}. Valid options: ${validLanguages.join(', ')}`,
        statusCode: 400
      }
    });
    continue;
  }

  // All validations passed
  results.push({
    json: {
      error: false,
      email: email.toLowerCase().trim(), // Normalize email
      programming_languages: programming_languages,
      source: source || 'landing_page',
      subscribed_date: subscribed_date || new Date().toISOString()
    }
  });
}

return results;
```

**Output:** Validation result with `error` flag

---

### Node 3: IF - Check Validation Result

**Node Type:** `IF`
**Purpose:** Route based on validation success/failure

**Configuration:**
1. Add IF node after validation Code node
2. Set condition:
   - **Condition 1:**
     - Value 1: `{{ $json.error }}`
     - Operation: `is equal to`
     - Value 2: `false`

**Outputs:**
- **TRUE branch:** Validation passed → proceed to duplicate check
- **FALSE branch:** Validation failed → return error

---

### Node 4: Code - Format Validation Error Response (FALSE branch)

**Node Type:** `Code`
**Purpose:** Format validation error into standardized response structure

**Configuration:**
1. Add Code node to FALSE branch (after IF node)
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();

return [
  {
    json: {
      success: false,
      error: item.json.message,
      error_type: item.json.error_type,
      statusCode: item.json.statusCode
    }
  }
];
```

**Output:** Formatted error response ready for webhook response

---

### Node 4a: Respond to Webhook - Validation Error

**Node Type:** `Respond to Webhook`
**Purpose:** Send validation error response back to frontend

**Configuration:**
1. Add "Respond to Webhook" node after Code formatting node
2. Set parameters:
   - **Respond With:** First Incoming Item
   - **Response Code:** `{{ $json.statusCode }}`
   - **Put Response in Field:** Leave empty (will auto-return the JSON from Code node)

**Note:** The response body is automatically formatted by the previous Code node, so no additional configuration needed.

---

### Node 5: Google Sheets - Get Row Filtered by Email (TRUE branch)

**Node Type:** `Google Sheets`
**Purpose:** Fetch only the subscriber row matching the incoming email — avoids reading all rows

**Configuration:**
1. Add Google Sheets node to TRUE branch
2. Configure parameters:
   - **Credential:** Select Google OAuth2 credential
   - **Operation:** Get Row(s)
   - **Document:** Select "Newsletter Subscribers" spreadsheet
   - **Sheet:** Select "Newsletter Subscribers" sheet
   - **Filters:**
     - Add filter: column `email` equals `{{ $json.email }}`
   - **Options:**
     - **Return All:** OFF (email is unique; first match is enough)
     - **RAW Data:** OFF

**Output:** 0 rows (new email) or 1 row (existing subscriber)

---

### Node 6: Code - Check Duplicate Status & Determine Action

**Node Type:** `Code`
**Purpose:** Inspect the filtered Google Sheets result and determine action based on existing subscriber status

**Note:** No iteration needed. Node 5's filter returns 0 or 1 rows; this node just checks the result.

**Configuration:**
1. Add Code node after Google Sheets filtered read
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
// Get validated data from validation node
const validatedData = $('Code').first().json;

// Get filtered result from Google Sheets (0 or 1 rows)
const rows = $input.all();
const duplicate = rows.length > 0 ? rows[0].json : null;

let action = 'create_new'; // Default: new subscriber
let errorMessage = null;
let statusCode = 200;

if (duplicate) {
  const status = duplicate.status;

  if (status === 'confirmed') {
    action = 'error_confirmed';
    errorMessage = 'Email already subscribed';
    statusCode = 409;
  } else if (status === 'pending') {
    action = 'error_pending';
    errorMessage = 'Confirmation email already sent. Please check your inbox.';
    statusCode = 200;
  } else if (status === 'unsubscribed' || status === 'expired') {
    action = 'update_resubscribe';
  }
}

return [
  {
    json: {
      action,
      email: validatedData.email,
      programming_languages: validatedData.programming_languages,
      source: validatedData.source,
      subscribed_date: validatedData.subscribed_date,
      errorMessage,
      statusCode,
      existingRowIndex: duplicate ? duplicate.row_index : null
    }
  }
];
```

**Output:** Action decision with all necessary data

---

### Node 7: IF - Route by Action

**Node Type:** `IF`
**Purpose:** Route based on duplicate check result

**Configuration:**
1. Add IF node after duplicate check code
2. **Multiple conditions** (use "Add Condition" button):

**Condition 1: Error - Already Confirmed**
- Value 1: `{{ $json.action }}`
- Operation: `is equal to`
- Value 2: `error_confirmed`

**Condition 2: Error - Already Pending**
- Value 1: `{{ $json.action }}`
- Operation: `is equal to`
- Value 2: `error_pending`

**Note:** For simplicity, use **Switch node** instead of nested IF nodes:

---

### Node 7 (Alternative): Switch - Route by Action

**Node Type:** `Switch`
**Purpose:** Route based on action type (cleaner than nested IFs)

**Configuration:**
1. Add Switch node instead of IF
2. Set **Mode:** Rules
3. Add routing rules:

**Rule 1: Error - Already Confirmed**
- **Rule 1:**
  - Value 1: `{{ $json.action }}`
  - Operation: `Equal`
  - Value 2: `error_confirmed`
- Output: Route to error response (409)

**Rule 2: Error - Already Pending**
- **Rule 1:**
  - Value 1: `{{ $json.action }}`
  - Operation: `Equal`
  - Value 2: `error_pending`
- Output: Route to informational response (200)

**Rule 3: Update for Re-subscription**
- **Rule 1:**
  - Value 1: `{{ $json.action }}`
  - Operation: `Equal`
  - Value 2: `update_resubscribe`
- Output: Route to token generation + update

**Rule 4 (Fallback): Create New Subscriber**
- **Otherwise (Fallback):** Route to token generation + create

---

### Node 8a: Code - Format Already Confirmed Error (Rule 1)

**Node Type:** `Code`
**Purpose:** Format error response for already confirmed subscribers

**Configuration:**
1. Add Code node to Switch Rule 1 output
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();

return [
  {
    json: {
      success: false,
      error: "Email already subscribed",
      email: item.json.email,
      statusCode: 409
    }
  }
];
```

**Output:** Formatted 409 error response

---

### Node 8a-1: Respond to Webhook - Already Confirmed Error

**Node Type:** `Respond to Webhook`
**Purpose:** Send 409 error response to frontend

**Configuration:**
1. Add "Respond to Webhook" node after Code formatting node
2. Set parameters:
   - **Respond With:** First Incoming Item
   - **Response Code:** `{{ $json.statusCode }}`
   - **Put Response in Field:** Leave empty

---

### Node 8b: Code - Format Already Pending Response (Rule 2)

**Node Type:** `Code`
**Purpose:** Format informational response for pending confirmations

**Configuration:**
1. Add Code node to Switch Rule 2 output
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();

return [
  {
    json: {
      success: true,
      status: "pending",
      message: "Confirmation email already sent. Please check your inbox.",
      email: item.json.email,
      statusCode: 200
    }
  }
];
```

**Output:** Formatted 200 informational response

---

### Node 8b-1: Respond to Webhook - Already Pending Info

**Node Type:** `Respond to Webhook`
**Purpose:** Send informational response to frontend

**Configuration:**
1. Add "Respond to Webhook" node after Code formatting node
2. Set parameters:
   - **Respond With:** First Incoming Item
   - **Response Code:** `{{ $json.statusCode }}`
   - **Put Response in Field:** Leave empty

---

## create_new path (Switch Rule 4)

---

### Node 9a: Code - Generate Confirmation Token (create_new)

**Node Type:** `Code`
**Purpose:** Generate UUID v4 token with 48-hour expiration for a new subscriber

**Configuration:**
1. Add Code node connected to Switch Rule 4 (create_new) output
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript
3. JavaScript code:

```javascript
const { randomUUID } = require('crypto');

const item = $input.first();
const now = new Date();
const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

return [
  {
    json: {
      email: item.json.email,
      programming_languages: item.json.programming_languages.join(','),
      status: 'pending',
      confirmation_token: randomUUID(),
      token_expires_at: expiresAt.toISOString(),
      unsubscribe_token: null,
      created_date: now.toISOString(),
      confirmed_date: null,
      unsubscribed_date: null,
      source: item.json.source,
      action: 'create_new'
    }
  }
];
```

**Output:** Complete row data with token

---

### Node 10a: Gmail - Send Confirmation Email (create_new)

**Node Type:** `Gmail`
**Purpose:** Attempt to send confirmation email before writing to Google Sheets. If delivery fails, no row is created and a proper error is returned to the frontend.

**Configuration:**
1. Add Gmail node after Node 9a
2. Configure parameters:
   - **Credential:** Gmail OAuth2
   - **Resource:** Message
   - **Operation:** Send
   - **To:** `{{ $json.email }}`
   - **Subject:** `Confirm your Snippet subscription`
   - **Email Type:** HTML
   - **Message (HTML):** See HTML template below
   - **Settings → On Error:** Continue

**HTML Email Template:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #24292f;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <h2 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600;">Confirm your subscription</h2>

    <p style="margin: 0 0 24px 0;">You're one click away.</p>

    <p style="margin: 0 0 24px 0;">Confirm your email to start receiving snippets:</p>

    <div style="margin: 0 0 24px 0;">
      <a href="https://iris-codes.com/snippet/confirm?token={{ $json.confirmation_token }}"
         style="display: inline-block; padding: 12px 32px; background-color: #24292f; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Confirm Subscription
      </a>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: #57606a;">
      Or copy and paste this link into your browser:<br>
      <a href="https://iris-codes.com/snippet/confirm?token={{ $json.confirmation_token }}"
         style="color: #0969da; text-decoration: none; word-break: break-all;">
        https://iris-codes.com/snippet/confirm?token={{ $json.confirmation_token }}
      </a>
    </p>

    <p style="margin: 0 0 16px 0; font-size: 14px; color: #57606a;">
      This link expires in 48 hours.
    </p>

    <hr style="margin: 32px 0; border: none; border-top: 1px solid #d0d7de;">

    <p style="margin: 0; font-size: 14px; color: #57606a;">
      Didn't sign up? You can safely ignore this email.
    </p>

  </div>
</body>
</html>
```

---

### Node 10a-check: Code - Check Gmail Result (create_new)

**Node Type:** `Code`
**Purpose:** Inspect the Gmail send result. When "Continue on Error" is enabled, a failed send still produces an output item but with an `error` property set.

**Configuration:**
1. Add Code node after Node 10a
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript
3. JavaScript code:

```javascript
const results = $('Gmail - Send Confirmation Email (create_new)').all().map(i => i.json);
const failed = results.some(r => !!r.error);

return [
  {
    json: {
      ...results[0],
      gmail_failed: failed
    }
  }
];
```

**Output:** Original token data plus `gmail_failed: true/false`

---

### Node 10a-if: IF - Gmail Send Failed? (create_new)

**Node Type:** `IF`
**Purpose:** Route based on whether Gmail delivery succeeded

**Configuration:**
1. Add IF node after Node 10a-check
2. Set condition:
   - **Value 1:** `{{ $json.gmail_failed }}`
   - **Operation:** is equal to
   - **Value 2:** `true`

**Outputs:**
- **TRUE branch:** Gmail failed → return error to frontend
- **FALSE branch:** Gmail succeeded → write to Google Sheets

---

### Node 10a-err: Code - Format Email Error (create_new)

**Node Type:** `Code`
**Purpose:** Format 500 error response when Gmail failed

**Configuration:**
1. Add Code node on the TRUE branch of Node 10a-if
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript
3. JavaScript code:

```javascript
return [
  {
    json: {
      success: false,
      error: "Failed to send confirmation email. Please double-check your email address and try again.",
      statusCode: 500
    }
  }
];
```

---

### Node 10a-err-resp: Respond to Webhook - Gmail Error (create_new)

**Node Type:** `Respond to Webhook`

**Configuration:**
1. Add "Respond to Webhook" node after Node 10a-err
2. Set parameters:
   - **Respond With:** First Incoming Item
   - **Response Code:** `{{ $json.statusCode }}`
   - **Put Response in Field:** Leave empty

---

### Node 11a: Google Sheets - Append New Subscriber

**Node Type:** `Google Sheets`
**Purpose:** Write the new pending subscriber row only after Gmail succeeded

**Configuration:**
1. Add Google Sheets node on the FALSE branch of Node 10a-if
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Append Row
   - **Document:** Newsletter Subscribers
   - **Sheet:** Newsletter Subscribers
   - **Data Mode:** Auto-Map Input Data to Columns

**Column Mapping:**
```
email               → {{ $json.email }}
programming_languages → {{ $json.programming_languages }}
status              → {{ $json.status }}
confirmation_token  → {{ $json.confirmation_token }}
token_expires_at    → {{ $json.token_expires_at }}
unsubscribe_token   → {{ $json.unsubscribe_token }}
created_date        → {{ $json.created_date }}
confirmed_date      → {{ $json.confirmed_date }}
unsubscribed_date   → {{ $json.unsubscribed_date }}
source              → {{ $json.source }}
```

---

### Node 12a: Code - Format Success Response (create_new)

**Node Type:** `Code`

**Configuration:**
1. Add Code node after Node 11a
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript
3. JavaScript code:

```javascript
const item = $input.first();

return [
  {
    json: {
      success: true,
      status: "pending",
      message: "Please check your email to confirm your subscription",
      email: item.json.email
    }
  }
];
```

---

### Node 12a-resp: Respond to Webhook - Success (create_new)

**Node Type:** `Respond to Webhook`

**Configuration:**
1. Add "Respond to Webhook" node after Node 12a
2. Set parameters:
   - **Respond With:** First Incoming Item
   - **Response Code:** 200
   - **Put Response in Field:** Leave empty

---

## update_resubscribe path (Switch Rule 3)

All nodes below are copies of the create_new path nodes. The only differences are noted.

---

### Node 9b: Code - Generate Confirmation Token (update_resubscribe)

**Node Type:** `Code`
**Purpose:** Generate UUID v4 token for a re-subscribing user. Same logic as Node 9a except `created_date` preserves the original signup date.

**Configuration:**
1. Add Code node connected to Switch Rule 3 (update_resubscribe) output
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript
3. JavaScript code:

```javascript
const { randomUUID } = require('crypto');

const item = $input.first();
const now = new Date();
const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

return [
  {
    json: {
      email: item.json.email,
      programming_languages: item.json.programming_languages.join(','),
      status: 'pending',
      confirmation_token: randomUUID(),
      token_expires_at: expiresAt.toISOString(),
      confirmed_date: null,
      unsubscribed_date: null,
      source: item.json.source,
      action: 'update_resubscribe',
      existingRowIndex: item.json.existingRowIndex
    }
  }
];
```

**Note:** `created_date` is intentionally omitted — the Update Row node will leave the original value unchanged.

---

### Node 10b: Gmail - Send Confirmation Email (update_resubscribe)

**Node Type:** `Gmail`
**Purpose:** Copy of Node 10a. Same HTML template, same "Continue on Error" setting.

**Configuration:** Identical to Node 10a. Connect after Node 9b.

- **Settings → On Error:** Continue

---

### Node 10b-check: Code - Check Gmail Result (update_resubscribe)

**Node Type:** `Code`
**Purpose:** Copy of Node 10a-check.

**Configuration:**
1. Add Code node after Node 10b
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript
3. JavaScript code:

```javascript
const results = $('Gmail - Send Confirmation Email (update_resubscribe)').all().map(i => i.json);
const failed = results.some(r => !!r.error);

return [
  {
    json: {
      ...results[0],
      gmail_failed: failed
    }
  }
];
```

---

### Node 10b-if: IF - Gmail Send Failed? (update_resubscribe)

**Node Type:** `IF`
**Purpose:** Copy of Node 10a-if. Same condition: `{{ $json.gmail_failed }}` equals `true`.

---

### Node 10b-err: Code - Format Email Error (update_resubscribe)

**Node Type:** `Code`
**Purpose:** Copy of Node 10a-err. Same error response body.

**Configuration:** Identical to Node 10a-err. Connect to TRUE branch of Node 10b-if.

---

### Node 10b-err-resp: Respond to Webhook - Gmail Error (update_resubscribe)

**Node Type:** `Respond to Webhook`
**Purpose:** Copy of Node 10a-err-resp.

**Configuration:** Identical to Node 10a-err-resp.

---

### Node 11b: Google Sheets - Update Existing Subscriber

**Node Type:** `Google Sheets`
**Purpose:** Update the existing row only after Gmail succeeded

**Configuration:**
1. Add Google Sheets node on the FALSE branch of Node 10b-if
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Update Row
   - **Document:** Newsletter Subscribers
   - **Sheet:** Newsletter Subscribers
   - **Column to Match On:** `row_index` (or use **Row Number:** `{{ $json.existingRowIndex }}`)
   - **Data Mode:** Auto-Map Input Data to Columns

**Column Mapping (updated fields only — do not map `created_date`):**
```
status             → {{ $json.status }}
confirmation_token → {{ $json.confirmation_token }}
token_expires_at   → {{ $json.token_expires_at }}
confirmed_date     → {{ $json.confirmed_date }}
unsubscribed_date  → {{ $json.unsubscribed_date }}
```

---

### Node 12b: Code - Format Success Response (update_resubscribe)

**Node Type:** `Code`
**Purpose:** Copy of Node 12a.

**Configuration:** Identical to Node 12a. Connect after Node 11b.

---

### Node 12b-resp: Respond to Webhook - Success (update_resubscribe)

**Node Type:** `Respond to Webhook`
**Purpose:** Copy of Node 12a-resp.

**Configuration:** Identical to Node 12a-resp.

---

## Workflow Testing

### Test 1: Valid New Subscriber

**Request:**
```bash
curl -X POST https://retz8.app.n8n.cloud/webhook-test/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jiohin@umich.edu",
      "programming_languages": ["Python", "JS/TS"],
    "source": "landing_page",
    "subscribed_date": "2026-02-17T12:00:00Z"
  }'
```

**Expected Result:**
- Status: 200
- Response: `{"success": true, "status": "pending", "message": "Please check your email to confirm your subscription", "email": "test@example.com"}`
- Google Sheets: New row with `status="pending"`, `confirmation_token` populated
- Email: Confirmation email sent to test@example.com with token link

---

### Test 2: Invalid Email Format

**Request:**
```bash
curl -X POST https://retz8.app.n8n.cloud/webhook-test/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
      "programming_languages": ["Python"]
  }'
```

**Expected Result:**
- Status: 400
- Response: `{"success": false, "error": "Invalid email format", "error_type": "invalid_email", "statusCode": 400}`
- No Google Sheets row added
- No email sent

---

### Test 3: Missing Programming Languages

**Request:**
```bash
curl -X POST https://retz8.app.n8n.cloud/webhook-test/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
      "programming_languages": []
  }'
```

**Expected Result:**
- Status: 400
- Response: `{"success": false, "error": "At least one programming language is required", "error_type": "missing_programming_languages", "statusCode": 400}`

---

### Test 4: Duplicate Email (Already Confirmed)

**Request:**
```bash
# First subscribe and confirm, then try subscribing again
curl -X POST https://retz8.app.n8n.cloud/webhook-test/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "confirmed@example.com",
      "programming_languages": ["Python"]
  }'
```

**Expected Result:**
- Status: 409
- Response: `{"success": false, "error": "Email already subscribed", "email": "confirmed@example.com", "statusCode": 409}`
- No new row added
- No email sent

---

### Test 5: Duplicate Email (Pending Confirmation)

**Request:**
```bash
# Submit same email twice before confirming
curl -X POST https://retz8.app.n8n.cloud/webhook-test/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pending@example.com",
      "programming_languages": ["Python"]
  }'
```

**Expected Result:**
- Status: 200
- Response: `{"success": true, "status": "pending", "message": "Confirmation email already sent. Please check your inbox.", "email": "pending@example.com"}`
- No new row added
- No new email sent

---

### Test 6: Re-subscription (Previously Unsubscribed)

**Request:**
```bash
# Email exists with status="unsubscribed", now re-subscribing
curl -X POST https://retz8.app.n8n.cloud/webhook-test/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unsubscribed@example.com",
      "programming_languages": ["JS/TS"]
  }'
```

**Expected Result:**
- Status: 200
- Response: `{"success": true, "status": "pending", "message": "Please check your email to confirm your subscription", "email": "unsubscribed@example.com"}`
- Existing row updated: `status="pending"`, new `confirmation_token`, `unsubscribed_date=null`
- Confirmation email sent

---

## Error Handling

**Gmail before Google Sheets:**
Gmail runs before writing to Google Sheets. If delivery fails, no row is created and the frontend receives a proper error response. Both paths (create_new and update_resubscribe) follow this same order.

**Gmail failure detection (matches send-newsletter pattern):**
- Gmail node runs with **Settings → On Error: Continue** — a failed send still produces an output item but with an `error` property set
- The following Code node inspects `$('Gmail - ...').all()` and sets `gmail_failed: true` if any result has `.error`
- The IF node routes `gmail_failed === true` to the error response path
- Response: `{ success: false, error: "Failed to send confirmation email. Please double-check your email address and try again.", statusCode: 500 }`
- Frontend `submitError` state is populated and displayed to the user via the existing `data.success === false` branch in `SignupForm.tsx`

**If Google Sheets fails after Gmail succeeds:**
- Unhandled — the workflow will error and n8n will log the execution failure
- Email was already sent so the user can retry (duplicate pending check handles re-sends gracefully)

**Token Generation:**
- Always import crypto: `const { randomUUID } = require('crypto');`
- Use `randomUUID()` for cryptographic randomness
- Never use `Math.random()` (not secure)

**Email Normalization:**
- Always lowercase and trim emails before comparison
- Prevents duplicates like "User@Example.com" vs "user@example.com"

---

## Workflow Activation

1. Save workflow
2. Click "Activate" toggle in top-right
3. Test webhook URL: `https://retz8.app.n8n.cloud/webhook-test/subscribe`
4. Provide URL to Track E frontend team
5. Monitor "Executions" tab for incoming signups

---

## Next Steps

After this workflow is complete:
1. Build confirmation workflow (see `workflow-confirmation.md`)
2. Test full flow: signup → email → click link → confirmed
3. Build unsubscribe workflow (see `workflow-unsubscribe.md`)
4. Set up cleanup job for expired tokens
