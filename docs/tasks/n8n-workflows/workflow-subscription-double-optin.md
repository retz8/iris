# n8n Workflow: Newsletter Subscription (Double Opt-In)

**Workflow Name:** Newsletter Subscription Double Opt-In
**Trigger Type:** Webhook (POST)
**Purpose:** Handle newsletter signups with email confirmation, token-based verification, and duplicate/re-subscription handling.

## Prerequisites

- Google Sheets spreadsheet: "Newsletter Subscribers" (see `google-sheets-subscribers-schema.md`)
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
    └─ TRUE → Google Sheets: Read All Subscribers
                  ↓
              Code: Check Duplicates & Determine Action
                  ↓
              Switch: Route by Action
                  ├─ "error_confirmed" → Respond to Webhook (409 Already Subscribed)
                  ├─ "error_pending" → Respond to Webhook (200 Already Sent)
                  ├─ "update_resubscribe" → Code: Generate Token → Google Sheets: Update Row
                  └─ "create_new" → Code: Generate Token → Google Sheets: Append Row
                                          ↓
                                      Gmail: Send Confirmation Email
                                          ↓
                                      Respond to Webhook (200 Success)
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

### Node 5: Google Sheets - Read All Subscribers (TRUE branch)

**Node Type:** `Google Sheets`
**Purpose:** Fetch all subscribers to check for duplicates

**Configuration:**
1. Add Google Sheets node to TRUE branch
2. Configure parameters:
   - **Credential:** Select Google OAuth2 credential
   - **Operation:** Get Row(s)
   - **Document:** Select "Newsletter Subscribers" spreadsheet
   - **Sheet:** Select "Newsletter Subscribers" sheet
   - **Options:**
     - **Return All:** ON (toggle enabled)
     - **RAW Data:** OFF

**Output:** All existing subscriber rows

---

### Node 6: Code - Check Duplicates & Determine Action

**Node Type:** `Code`
**Purpose:** Check if email exists and determine appropriate action based on current status

**Configuration:**
1. Add Code node after Google Sheets read
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
// Get validated data from validation node
const validatedData = $('Code').first().json;
const newEmail = validatedData.email; // Already normalized (lowercase, trimmed)

// Get all existing subscribers from Google Sheets
const existingSubscribers = $input.all();

// Find duplicate by email (case-insensitive)
const duplicate = existingSubscribers.find(subscriber => {
  const existingEmail = subscriber.json.email?.toLowerCase().trim();
  return existingEmail === newEmail;
});

let action = 'create_new'; // Default: new subscriber
let errorMessage = null;
let statusCode = 200;

if (duplicate) {
  const status = duplicate.json.status;

  if (status === 'confirmed') {
    // Already subscribed - return error
    action = 'error_confirmed';
    errorMessage = 'Email already subscribed';
    statusCode = 409;
  } else if (status === 'pending') {
    // Already sent confirmation email - inform user
    action = 'error_pending';
    errorMessage = 'Confirmation email already sent. Please check your inbox.';
    statusCode = 200; // Not an error, just informational
  } else if (status === 'unsubscribed') {
    // Re-subscription: update existing row
    action = 'update_resubscribe';
  } else if (status === 'expired') {
    // Expired confirmation: update existing row
    action = 'update_resubscribe';
  }
}

return [
  {
    json: {
      action: action,
      email: validatedData.email,
      programming_languages: validatedData.programming_languages,
      source: validatedData.source,
      subscribed_date: validatedData.subscribed_date,
      errorMessage: errorMessage,
      statusCode: statusCode,
      // If updating, pass existing row data
      existingRowIndex: duplicate ? duplicate.json.row_index : null
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

### Node 8a: Respond to Webhook - Already Confirmed Error (Rule 1)

**Node Type:** `Respond to Webhook`
**Purpose:** Return 409 error for already confirmed subscribers

**Configuration:**
- **Response Code:** 409
- **Response Body:**

```json
{
  "success": false,
  "error": "Email already subscribed",
  "email": "={{ $json.email }}",
  "statusCode": 409
}
```

---

### Node 8b: Respond to Webhook - Already Pending Info (Rule 2)

**Node Type:** `Respond to Webhook`
**Purpose:** Return informational message for pending confirmations

**Configuration:**
- **Response Code:** 200
- **Response Body:**

```json
{
  "success": true,
  "status": "pending",
  "message": "Confirmation email already sent. Please check your inbox.",
  "email": "={{ $json.email }}",
  "statusCode": 200
}
```

---

### Node 9: Code - Generate Confirmation Token

**Node Type:** `Code`
**Purpose:** Generate UUID v4 token with 48-hour expiration

**Configuration:**
1. Add Code node (connected to Rule 3 and Rule 4 outputs)
2. JavaScript code:

```javascript
const item = $input.first();
const action = item.json.action;

// Generate UUID v4 token
const confirmationToken = crypto.randomUUID();

// Calculate expiration (48 hours from now)
const now = new Date();
const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

// Prepare data for Google Sheets
const rowData = {
  email: item.json.email,
  programming_languages: item.json.programming_languages.join(','), // Convert array to comma-separated
  status: 'pending',
  confirmation_token: confirmationToken,
  token_expires_at: expiresAt.toISOString(),
  unsubscribe_token: null, // Generated after confirmation
  created_date: action === 'update_resubscribe' ? item.json.subscribed_date : now.toISOString(),
  confirmed_date: null,
  unsubscribed_date: null,
  source: item.json.source,
  // Include action and row index for routing
  action: action,
  existingRowIndex: item.json.existingRowIndex
};

return [
  {
    json: rowData
  }
];
```

**Output:** Complete row data with token

---

### Node 10a: Google Sheets - Append New Subscriber (Rule 4 path)

**Node Type:** `Google Sheets`
**Purpose:** Add new pending subscriber to Google Sheets

**Configuration:**
1. Add Google Sheets node for create action
2. Add IF/Filter before this node:
   - Condition: `{{ $json.action }}` equals `create_new`
3. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Append Row
   - **Document:** "Newsletter Subscribers"
   - **Sheet:** "Newsletter Subscribers"
   - **Data Mode:** Auto-Map Input Data to Columns
   - **Columns:** Map all fields from Code node output

**Column Mapping:**
```
email → {{ $json.email }}
programming_languages → {{ $json.programming_languages }}
status → {{ $json.status }}
confirmation_token → {{ $json.confirmation_token }}
token_expires_at → {{ $json.token_expires_at }}
unsubscribe_token → {{ $json.unsubscribe_token }}
created_date → {{ $json.created_date }}
confirmed_date → {{ $json.confirmed_date }}
unsubscribed_date → {{ $json.unsubscribed_date }}
source → {{ $json.source }}
```

---

### Node 10b: Google Sheets - Update Existing Subscriber (Rule 3 path)

**Node Type:** `Google Sheets`
**Purpose:** Update existing row for re-subscription

**Configuration:**
1. Add Google Sheets node for update action
2. Add IF/Filter before this node:
   - Condition: `{{ $json.action }}` equals `update_resubscribe`
3. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Update Row
   - **Document:** "Newsletter Subscribers"
   - **Sheet:** "Newsletter Subscribers"
   - **Data Mode:** Auto-Map Input Data to Columns
   - **Row Number:** `{{ $json.existingRowIndex }}`
   - **Columns:** Map updated fields only

**Column Mapping (Updated Fields Only):**
```
status → {{ $json.status }}
confirmation_token → {{ $json.confirmation_token }}
token_expires_at → {{ $json.token_expires_at }}
confirmed_date → {{ $json.confirmed_date }}
unsubscribed_date → {{ $json.unsubscribed_date }}
```

**Note:** Keep `created_date` unchanged (original signup date)

---

### Node 11: Gmail - Send Confirmation Email

**Node Type:** `Gmail`
**Purpose:** Send email with confirmation link

**Configuration:**
1. Add Gmail node after both Google Sheets operations (merge paths)
2. Configure parameters:
   - **Credential:** Gmail OAuth2
   - **Resource:** Message
   - **Operation:** Send
   - **To:** `{{ $json.email }}`
   - **Subject:** `Confirm your Snippet subscription`
   - **Email Type:** HTML
   - **Message (HTML):** See template below

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

    <p style="margin: 0 0 16px 0;">You signed up for Snippet, the code reading challenge newsletter.</p>

    <p style="margin: 0 0 24px 0;">Click the button below to confirm your email address and complete your subscription:</p>

    <!-- Confirmation Button -->
    <div style="margin: 0 0 24px 0;">
      <a href="https://iris-codes.com/confirm?token={{ $json.confirmation_token }}"
         style="display: inline-block; padding: 12px 32px; background-color: #24292f; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Confirm Subscription
      </a>
    </div>

    <!-- Fallback Link -->
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #57606a;">
      Or copy and paste this link into your browser:<br>
      <a href="https://iris-codes.com/confirm?token={{ $json.confirmation_token }}"
         style="color: #0969da; text-decoration: none; word-break: break-all;">
        https://iris-codes.com/confirm?token={{ $json.confirmation_token }}
      </a>
    </p>

    <!-- Expiration Notice -->
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #57606a;">
      This link expires in 48 hours.
    </p>

    <hr style="margin: 32px 0; border: none; border-top: 1px solid #d0d7de;">

    <!-- Footer -->
    <p style="margin: 0; font-size: 14px; color: #57606a;">
      Didn't sign up? You can safely ignore this email.
    </p>

  </div>
</body>
</html>
```

---

### Node 12: Respond to Webhook - Success

**Node Type:** `Respond to Webhook`
**Purpose:** Send success response back to frontend

**Configuration:**
1. Add "Respond to Webhook" node after Gmail node
2. Set parameters:
   - **Response Code:** 200
   - **Response Body:**

```json
{
  "success": true,
  "status": "pending",
  "message": "Please check your email to confirm your subscription",
  "email": "={{ $json.email }}"
}
```

---

## Workflow Testing

### Test 1: Valid New Subscriber

**Request:**
```bash
curl -X POST https://retz8.app.n8n.cloud/webhook-test/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
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

**Network Errors:**
- If Gmail fails to send: Log error, but still return success to user (email service degradation shouldn't block signup)
- If Google Sheets fails: Return 500 error to user (critical failure)

**Token Generation:**
- Always use `crypto.randomUUID()` for cryptographic randomness
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
