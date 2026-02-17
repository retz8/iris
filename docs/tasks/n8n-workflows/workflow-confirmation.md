# n8n Workflow: Newsletter Confirmation

**Workflow Name:** Newsletter Email Confirmation
**Trigger Type:** Webhook (GET/POST)
**Purpose:** Verify confirmation tokens, update subscriber status from pending to confirmed, and generate unsubscribe tokens.

## Prerequisites

- Google Sheets spreadsheet: "Newsletter Subscribers" (see `google-sheets-subscribers-schema.md`)
- Google OAuth2 credentials configured in n8n
- Gmail/SMTP credentials configured in n8n (for welcome email)
- n8n instance accessible at retz8.app.n8n.cloud

## Workflow Overview

```
Webhook GET/POST /webhook-test/confirm?token=xyz
    ↓
Code: Extract & Validate Token Parameter
    ↓
IF: Token Provided?
    ├─ FALSE → Code: Format Error Response → Respond to Webhook (400 Missing Token)
    └─ TRUE → Google Sheets: Get Row(s) filtered by confirmation_token
                  ↓
              Code: Validate Subscriber Status & Expiration
                  ↓
              Switch: Route by Validation Result
                  ├─ "not_found" → Respond (404 Invalid Token)
                  ├─ "already_confirmed" → Respond (200 Already Confirmed)
                  ├─ "expired" → Respond (400 Token Expired)
                  └─ "valid" → Code: Generate unsubscribe_token
                                    ↓
                                Google Sheets: Update Row (status=confirmed)
                                    ↓
                                Gmail: Send Welcome Email
                                    ↓
                                Respond (200 Success)
```

## Node-by-Node Configuration

### Node 1: Webhook (Trigger)

**Node Type:** `Webhook`
**Purpose:** Receive confirmation requests from email links or frontend

**Configuration:**
1. Add Webhook node to canvas
2. Configure parameters:
   - **HTTP Method:** GET, POST (both allowed)
   - **Path:** `confirm`
   - **Authentication:** None
   - **Response Mode:** "Using 'Respond to Webhook' Node"
   - **Response Data:** First Entry JSON

**Expected Input (GET):**
```
GET https://retz8.app.n8n.cloud/webhook-test/confirm?token=a7b3c4d5-e6f7-8901-2345-6789abcdef01
```

**Expected Input (POST):**
```json
{
  "token": "a7b3c4d5-e6f7-8901-2345-6789abcdef01"
}
```

**Webhook URL:** `https://retz8.app.n8n.cloud/webhook-test/confirm`

**Note:** Supporting both GET and POST allows:
- GET: Direct click from email confirmation links
- POST: Frontend confirmation page with better error handling

---

### Node 2: Code - Extract & Validate Token

**Node Type:** `Code`
**Purpose:** Extract token from query parameter or request body

**Configuration:**
1. Add Code node after Webhook
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();

// Extract token from query parameter (GET) or body (POST)
let token = null;

// Check query parameters first (GET request from email)
if (item.json.query && item.json.query.token) {
  token = item.json.query.token;
}
// Check body (POST request from frontend)
else if (item.json.body && item.json.body.token) {
  token = item.json.body.token;
}
// Direct JSON (POST with JSON body)
else if (item.json.token) {
  token = item.json.token;
}

// Validate token is not empty
if (!token || typeof token !== 'string' || token.trim() === '') {
  return [
    {
      json: {
        error: true,
        error_type: 'missing_token',
        message: 'Invalid confirmation link. Token is missing.',
        statusCode: 400
      }
    }
  ];
}

// Token exists - pass through
return [
  {
    json: {
      error: false,
      token: token.trim()
    }
  }
];
```

**Output:** Token or error flag

---

### Node 3: IF - Token Provided?

**Node Type:** `IF`
**Purpose:** Route based on token validation

**Configuration:**
1. Add IF node after token extraction
2. Set condition:
   - **Condition 1:**
     - Value 1: `{{ $json.error }}`
     - Operation: `is equal to`
     - Value 2: `false`

**Outputs:**
- **TRUE branch:** Token provided → proceed to lookup
- **FALSE branch:** No token → return error

---

### Node 4: Code - Format Missing Token Error (FALSE branch)

**Node Type:** `Code`
**Purpose:** Format the missing token error into a standardized response structure

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

### Node 4a: Respond to Webhook - Missing Token (FALSE branch)

**Node Type:** `Respond to Webhook`
**Purpose:** Return error for missing token

**Configuration:**
1. Add "Respond to Webhook" node after Code formatting node
2. Set parameters:
   - **Respond With:** First Incoming Item
   - **Response Code:** `{{ $json.statusCode }}`
   - **Put Response in Field:** Leave empty

---

### Node 5: Google Sheets - Get Row Filtered by Token (TRUE branch)

**Node Type:** `Google Sheets`
**Purpose:** Fetch only the subscriber row matching the confirmation token — avoids reading all rows

**Configuration:**
1. Add Google Sheets node to TRUE branch
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Get Row(s)
   - **Document:** "Newsletter Subscribers"
   - **Sheet:** "Newsletter Subscribers"
   - **Filters:**
     - Add filter: column `confirmation_token` equals `{{ $json.token }}`
   - **Options:**
     - **Return All:** OFF (token is unique; first match is enough)
     - **RAW Data:** OFF

**Output:** 0 rows (token not found) or 1 row (matching subscriber)

---

### Node 6: Code - Validate Subscriber Status & Expiration

**Node Type:** `Code`
**Purpose:** Validate the filtered Google Sheets result — check if row exists, status, and token expiration

**Note:** No iteration needed. Node 5's filter returns 0 or 1 rows; this node just inspects the result.

**Configuration:**
1. Add Code node after Google Sheets filtered read
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
// Get token from extraction node
const tokenData = $('Code').first().json;
const token = tokenData.token;

// Get filtered result from Google Sheets (0 or 1 rows)
const rows = $input.all();

let validationResult = 'not_found';
let email = null;
let rowIndex = null;
let errorMessage = null;
let statusCode = 404;

if (rows.length === 0 || !rows[0].json.email) {
  // No matching row — token doesn't exist in database
  validationResult = 'not_found';
  errorMessage = 'Invalid confirmation token. This link may have expired or been used already.';
  statusCode = 404;
} else {
  const subscriber = rows[0].json;
  email = subscriber.email;
  rowIndex = subscriber.row_index;
  const status = subscriber.status;
  const tokenExpiresAt = subscriber.token_expires_at;

  if (status === 'confirmed') {
    validationResult = 'already_confirmed';
    errorMessage = null;
    statusCode = 200;
  } else if (status === 'pending') {
    const now = new Date();
    const expirationDate = new Date(tokenExpiresAt);

    if (now > expirationDate) {
      validationResult = 'expired';
      errorMessage = 'This confirmation link has expired. Please sign up again.';
      statusCode = 400;
    } else {
      validationResult = 'valid';
      errorMessage = null;
      statusCode = 200;
    }
  } else {
    validationResult = 'invalid_status';
    errorMessage = `Cannot confirm subscription. Current status: ${status}`;
    statusCode = 400;
  }
}

return [
  {
    json: {
      validationResult,
      email,
      rowIndex,
      token,
      errorMessage,
      statusCode
    }
  }
];
```

**Output:** Validation result with subscriber data

---

### Node 7: Switch - Route by Validation Result

**Node Type:** `Switch`
**Purpose:** Route to appropriate handler based on validation

**Configuration:**
1. Add Switch node after validation code
2. Set **Mode:** Rules
3. Add routing rules:

**Rule 1: Token Not Found**
- **Rule 1:**
  - Value 1: `{{ $json.validationResult }}`
  - Operation: `Equal`
  - Value 2: `not_found`
- Output: Route to 404 error response

**Rule 2: Already Confirmed**
- **Rule 1:**
  - Value 1: `{{ $json.validationResult }}`
  - Operation: `Equal`
  - Value 2: `already_confirmed`
- Output: Route to informational response

**Rule 3: Token Expired**
- **Rule 1:**
  - Value 1: `{{ $json.validationResult }}`
  - Operation: `Equal`
  - Value 2: `expired`
- Output: Route to 400 error response

**Rule 4: Valid for Confirmation**
- **Rule 1:**
  - Value 1: `{{ $json.validationResult }}`
  - Operation: `Equal`
  - Value 2: `valid`
- Output: Route to confirmation flow

**Rule 5 (Fallback): Unknown Error**
- **Otherwise (Fallback):** Route to 500 error response

---

### Node 8a: Respond to Webhook - Token Not Found (Rule 1)

**Node Type:** `Respond to Webhook`
**Purpose:** Return 404 error for invalid token

**Configuration:**
- **Response Code:** 404
- **Response Body:**

```json
{
  "success": false,
  "error": "Invalid confirmation token. This link may have expired or been used already.",
  "error_type": "token_not_found",
  "statusCode": 404
}
```

---

### Node 8b: Respond to Webhook - Already Confirmed (Rule 2)

**Node Type:** `Respond to Webhook`
**Purpose:** Return informational message for already confirmed users

**Configuration:**
- **Response Code:** 200
- **Response Body:**

```json
{
  "success": true,
  "message": "You're already subscribed to Snippet!",
  "email": "={{ $json.email }}",
  "statusCode": 200
}
```

---

### Node 8c: Respond to Webhook - Token Expired (Rule 3)

**Node Type:** `Respond to Webhook`
**Purpose:** Return error for expired tokens

**Configuration:**
- **Response Code:** 400
- **Response Body:**

```json
{
  "success": false,
  "error": "This confirmation link has expired. Please sign up again.",
  "error_type": "token_expired",
  "statusCode": 400
}
```

---

### Node 9: Code - Generate Unsubscribe Token (Rule 4)

**Node Type:** `Code`
**Purpose:** Generate new unsubscribe token for confirmed subscriber

**Configuration:**
1. Add Code node for valid confirmation path
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();

// Generate unsubscribe token (UUID v4)
const unsubscribeToken = crypto.randomUUID();

// Current timestamp
const now = new Date().toISOString();

return [
  {
    json: {
      email: item.json.email,
      rowIndex: item.json.rowIndex,
      unsubscribeToken: unsubscribeToken,
      confirmedDate: now
    }
  }
];
```

**Output:** Unsubscribe token and confirmation timestamp

---

### Node 10: Google Sheets - Update Row to Confirmed

**Node Type:** `Google Sheets`
**Purpose:** Mark subscriber as confirmed and add unsubscribe token

**Configuration:**
1. Add Google Sheets node for confirmation path
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Update Row
   - **Document:** "Newsletter Subscribers"
   - **Sheet:** "Newsletter Subscribers"
   - **Data Mode:** Auto-Map Input Data to Columns
   - **Row Number:** `{{ $json.rowIndex }}`

**Columns to Update:**
```javascript
{
  status: 'confirmed',
  confirmed_date: '={{ $json.confirmedDate }}',
  unsubscribe_token: '={{ $json.unsubscribeToken }}',
  confirmation_token: null,        // Clear (single-use)
  token_expires_at: null           // Clear
}
```

**Column Mapping:**
```
status → confirmed
confirmed_date → {{ $json.confirmedDate }}
unsubscribe_token → {{ $json.unsubscribeToken }}
confirmation_token → (empty/null)
token_expires_at → (empty/null)
```

**Note:** Keep these fields unchanged:
- `email`
- `programming_languages`
- `created_date`
- `source`

---

### Node 11: Gmail - Send Welcome Email

**Node Type:** `Gmail`
**Purpose:** Send welcome email to confirmed subscriber

**Configuration:**
1. Add Gmail node after Google Sheets update
2. Configure parameters:
   - **Credential:** Gmail OAuth2
   - **Resource:** Message
   - **Operation:** Send
   - **To:** `{{ $json.email }}`
   - **Subject:** `Welcome to Snippet - Code Reading Challenge`
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

    <div style="margin-bottom: 32px;">
      <p style="margin: 0 0 16px 0;">You signed up for Snippet. Smart move.</p>

      <p style="margin: 0 0 16px 0;">AI generates code faster than you can read it.<br>
      But you're still the one who reviews it, merges it, owns it.</p>

      <p style="margin: 0 0 16px 0;">Can you read it well enough to trust it?</p>

      <p style="margin: 0 0 8px 0; font-weight: 600;">Every Mon/Wed/Fri, 7am:</p>
      <ul style="margin: 0 0 16px 0; padding-left: 24px;">
        <li>One code snippet from a trending OSS project (8–12 lines)</li>
        <li>Challenge: What's this actually doing?</li>
        <li>Breakdown: The pattern you need to see faster</li>
      </ul>

      <p style="margin: 0 0 16px 0;">Copyable code. 2-minute read. Real skill-building.</p>

      <p style="margin: 0 0 16px 0;">First one Monday.</p>

      <p style="margin: 0 0 16px 0; font-weight: 600;">Train your eye. Ship with confidence.<br>
      Snippet</p>
    </div>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #d0d7de; font-size: 14px; color: #57606a;">
      <p style="margin: 0;">
        Python, JS/TS, C/C++ |
        <a href="https://iris-codes.com/unsubscribe?token={{ $json.unsubscribeToken }}" style="color: #0969da; text-decoration: none;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>
```

**Note:** The unsubscribe link includes the newly generated `unsubscribeToken`.

---

### Node 12: Respond to Webhook - Confirmation Success

**Node Type:** `Respond to Webhook`
**Purpose:** Send success response after confirmation

**Configuration:**
- **Response Code:** 200
- **Response Body:**

```json
{
  "success": true,
  "message": "You're confirmed! Welcome to Snippet.",
  "email": "={{ $json.email }}",
  "statusCode": 200
}
```

---

## Frontend Integration Flow

**Confirmation Link from Email:**
```html
<a href="https://iris-codes.com/confirm?token={{ confirmation_token }}">
  Confirm Subscription
</a>
```

**Frontend Confirmation Page (`/confirm?token=xyz`):**
1. Extract token from URL query parameter
2. Show loading state: "Confirming your subscription..."
3. Send GET or POST to n8n webhook with token
4. Display response:
   - Success: "You're confirmed! First Snippet arrives [Monday|Wednesday|Friday] 7am"
   - Error: Display error message with retry or signup link

**Example Frontend Flow:**
```typescript
// ConfirmationPage.tsx
const [searchParams] = useSearchParams();
const token = searchParams.get('token');

useEffect(() => {
  const verifyToken = async () => {
    const response = await fetch(`https://retz8.app.n8n.cloud/webhook-test/confirm?token=${token}`);
    const data = await response.json();

    if (data.success) {
      // Show success with next delivery day
    } else {
      // Show error message
    }
  };

  if (token) verifyToken();
}, [token]);
```

---

## Workflow Testing

### Test 1: Valid Confirmation

**Setup:**
1. Create subscriber with status="pending", confirmation_token populated, token_expires_at in future

**Request (GET):**
```bash
curl https://retz8.app.n8n.cloud/webhook-test/confirm?token=a7b3c4d5-e6f7-8901-2345-6789abcdef01
```

**Expected Result:**
- Status: 200
- Response: `{"success": true, "message": "You're confirmed! Welcome to Snippet.", "email": "user@example.com"}`
- Google Sheets: Row updated with `status="confirmed"`, `confirmed_date=NOW()`, `unsubscribe_token` generated, confirmation_token cleared
- Email: Welcome email sent

---

### Test 2: Missing Token

**Request:**
```bash
curl https://retz8.app.n8n.cloud/webhook-test/confirm
```

**Expected Result:**
- Status: 400
- Response: `{"success": false, "error": "Invalid confirmation link. Token is missing.", "error_type": "missing_token"}`
- No Google Sheets changes
- No email sent

---

### Test 3: Invalid Token (Not Found)

**Request:**
```bash
curl https://retz8.app.n8n.cloud/webhook-test/confirm?token=invalid-random-token-12345
```

**Expected Result:**
- Status: 404
- Response: `{"success": false, "error": "Invalid confirmation token. This link may have expired or been used already.", "error_type": "token_not_found"}`
- No Google Sheets changes
- No email sent

---

### Test 4: Already Confirmed

**Setup:**
1. Subscriber already has status="confirmed"

**Request:**
```bash
curl https://retz8.app.n8n.cloud/webhook-test/confirm?token=<old-confirmation-token>
```

**Expected Result:**
- Status: 200
- Response: `{"success": true, "message": "You're already subscribed to Snippet!", "email": "user@example.com"}`
- No Google Sheets changes
- No email sent

---

### Test 5: Expired Token

**Setup:**
1. Subscriber has status="pending" but token_expires_at < NOW()

**Request:**
```bash
curl https://retz8.app.n8n.cloud/webhook-test/confirm?token=<expired-token>
```

**Expected Result:**
- Status: 400
- Response: `{"success": false, "error": "This confirmation link has expired. Please sign up again.", "error_type": "token_expired"}`
- No Google Sheets changes
- No email sent

---

## Token Lifecycle

**Created (Subscription):**
- Generated in subscription workflow
- Stored in `confirmation_token` field
- 48-hour expiration set in `token_expires_at`

**Verified (Confirmation):**
- Looked up by token value
- Expiration checked
- If valid: status updated, token cleared

**Single-Use Enforcement:**
- After confirmation: `confirmation_token` set to null
- Subsequent clicks return "already confirmed"

---

## Security Considerations

**Token Security:**
- UUID v4 format (128-bit random)
- Cannot be guessed or brute-forced
- Single-use (cleared after confirmation)
- 48-hour expiration enforced server-side

**Rate Limiting (Optional):**
- Add rate limiting to prevent token brute-force
- Example: Max 10 confirmation attempts per IP per hour
- Can be implemented with n8n Rate Limit node or external service

**Audit Logging (Optional):**
- Log all confirmation attempts (success and failure)
- Track: timestamp, token, IP address, result
- Useful for detecting abuse or troubleshooting

---

## Error Handling

**Google Sheets Connection Failure:**
- If read fails: Return 500 error
- If update fails: Return 500 error
- Log error for investigation

**Email Sending Failure:**
- If Gmail fails: Log error but still return success to user
- Confirmation is complete (subscriber is marked confirmed)
- Can manually resend welcome email if needed

**Token Format Validation:**
- Accept any string format (don't validate UUID format)
- Lookup in database will naturally fail for invalid formats
- Return "token not found" rather than "invalid format"

---

## Workflow Activation

1. Save workflow
2. Click "Activate" toggle
3. Test webhook URL: `https://retz8.app.n8n.cloud/webhook-test/confirm`
4. Provide URL to Track E frontend team
5. Update confirmation email template with correct confirmation link
6. Monitor "Executions" tab for confirmation requests

---

## Email Link Structure

**Confirmation Email (from subscription workflow):**
```html
<a href="https://iris-codes.com/confirm?token={{ confirmation_token }}">
  Confirm Your Subscription
</a>
```

**Welcome Email (from confirmation workflow):**
```html
<a href="https://iris-codes.com/unsubscribe?token={{ unsubscribe_token }}">
  Unsubscribe
</a>
```

**Note:** Both emails link to frontend routes, which then call n8n webhooks.

---

## Next Steps

After this workflow is complete:
1. Test full flow: signup → confirmation email → click link → confirmed → welcome email
2. Verify Google Sheets updates correctly
3. Test all edge cases (expired, invalid, already confirmed)
4. Update subscription workflow confirmation email template with correct link
5. Monitor "Executions" tab for confirmation funnel metrics
6. Track confirmation rate (should be 60-80% industry standard)
