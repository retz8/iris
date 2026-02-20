# n8n Workflow: Newsletter Unsubscription (Token-Based)

**Workflow Name:** Newsletter Unsubscription Token-Based
**Trigger Type:** Webhook (GET/POST)
**Purpose:** Handle newsletter unsubscription with secure token verification to prevent unauthorized unsubscribe attacks.

## Prerequisites

- Google Sheets spreadsheet: "Newsletter Subscribers" (see `../schema/google-sheets-subscribers-schema.md`)
- Google OAuth2 credentials configured in n8n
- n8n instance accessible at n8n.iris-codes.com

## Workflow Overview

```
Webhook GET/POST /unsubscribe?token=xyz
    ↓
Code: Extract & Validate Token Parameter
    ↓
IF: Token Provided?
    ├─ FALSE → Code: Format Error Response → Respond to Webhook (400 Missing Token)
    └─ TRUE → Google Sheets: Read All Subscribers
                  ↓
              Code: Find Subscriber by unsubscribe_token
                  ↓
              Switch: Route by Validation Result
                  ├─ "not_found" → Code: Format Error → Respond (404 Invalid Token)
                  ├─ "already_unsubscribed" → Code: Format Response → Respond (200 Already Unsubscribed)
                  ├─ "not_confirmed" → Code: Format Error → Respond (400 Not Confirmed)
                  ├─ "invalid_status" → Code: Format Error → Respond (500 Invalid Status)
                  └─ "valid" → Google Sheets: Update Row (status=unsubscribed)
                                    ↓
                                Code: Format Success Response
                                    ↓
                                Respond (200 Success)
```

## Security Benefits of Token-Based Unsubscribe

**Why Use Tokens Instead of Email Parameters?**

1. **Prevents Malicious Unsubscribe Attacks:**
   - Without tokens: Anyone can unsubscribe others using `?email=victim@example.com`
   - With tokens: Must have access to subscriber's email to get unique token

2. **Token is Unique and Unpredictable:**
   - UUID v4 format (128-bit random)
   - Cannot be guessed or brute-forced
   - Each subscriber has unique token

3. **No PII in URL:**
   - Email address not exposed in URL
   - Better privacy compliance

4. **Audit Trail:**
   - Token links to specific subscriber
   - Can track who initiated unsubscribe

## Node-by-Node Configuration

### Node 1: Webhook (Trigger)

**Node Type:** `Webhook`
**Purpose:** Receive unsubscribe requests from email links or frontend confirmation page

**Configuration:**
1. Add Webhook node to canvas
2. Configure parameters:
   - **HTTP Method:** GET, POST (both allowed)
   - **Path:** `unsubscribe`
   - **Authentication:** None
   - **Response Mode:** "Using 'Respond to Webhook' Node"
   - **Response Data:** First Entry JSON

**Expected Input (GET):**
```
GET https://retz8.app.n8n.cloud/webhook-test/unsubscribe?token=a7b3c4d5-e6f7-8901-2345-6789abcdef01
```

**Expected Input (POST):**
```json
{
  "token": "a7b3c4d5-e6f7-8901-2345-6789abcdef01"
}
```

**Webhook URL:** `https://retz8.app.n8n.cloud/webhook-test/unsubscribe`

**Note:** Supporting both GET and POST allows:
- GET: Direct click from email links
- POST: Frontend confirmation page submission

---

### Node 2: Code - Extract & Validate Token

**Node Type:** `Code`
**Purpose:** Extract token from query parameter or request body and validate presence

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

// Check query parameters first (GET request)
if (item.json.query && item.json.query.token) {
  token = item.json.query.token;
}
// Check body (POST request)
else if (item.json.body && item.json.body.token) {
  token = item.json.body.token;
}
// Direct JSON (POST request with JSON body)
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
        message: 'Invalid unsubscribe link. Token is missing.',
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
**Purpose:** Fetch only the subscriber row matching the unsubscribe token — avoids reading all rows

**Configuration:**
1. Add Google Sheets node to TRUE branch
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Get Row(s)
   - **Document:** "Newsletter Subscribers"
   - **Sheet:** "Newsletter Subscribers"
   - **Filters:**
     - Add filter: column `unsubscribe_token` equals `{{ $json.token }}`
   - **Options:**
     - **Return All:** OFF (token is unique; first match is enough)
     - **RAW Data:** OFF

**Output:** 0 rows (token not found) or 1 row (matching subscriber)

---

### Node 6: Code - Validate Subscriber Status

**Node Type:** `Code`
**Purpose:** Inspect the filtered Google Sheets result and validate subscriber status

**Note:** No iteration needed. Node 5's filter returns 0 or 1 rows; this node just checks the result.

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
let errorMessage = null;
let statusCode = 404;

if (rows.length === 0 || !rows[0].json.email) {
  validationResult = 'not_found';
  errorMessage = 'Invalid unsubscribe token. This link may have expired or been used already.';
  statusCode = 404;
} else {
  const subscriber = rows[0].json;
  email = subscriber.email;
  const status = subscriber.status;

  if (status === 'unsubscribed') {
    validationResult = 'already_unsubscribed';
    errorMessage = null;
    statusCode = 200;
  } else if (status === 'pending' || status === 'expired') {
    validationResult = 'not_confirmed';
    errorMessage = 'Cannot unsubscribe. Your subscription was never confirmed.';
    statusCode = 400;
  } else if (status === 'confirmed') {
    validationResult = 'valid';
    errorMessage = null;
    statusCode = 200;
  } else {
    validationResult = 'invalid_status';
    errorMessage = `Invalid subscription status: ${status}`;
    statusCode = 500;
  }
}

return [
  {
    json: {
      validationResult,
      email,
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

**Rule 2: Already Unsubscribed**
- **Rule 1:**
  - Value 1: `{{ $json.validationResult }}`
  - Operation: `Equal`
  - Value 2: `already_unsubscribed`
- Output: Route to informational response

**Rule 3: Not Confirmed**
- **Rule 1:**
  - Value 1: `{{ $json.validationResult }}`
  - Operation: `Equal`
  - Value 2: `not_confirmed`
- Output: Route to 400 error response

**Rule 4: Valid for Unsubscription**
- **Rule 1:**
  - Value 1: `{{ $json.validationResult }}`
  - Operation: `Equal`
  - Value 2: `valid`
- Output: Route to Google Sheets update

**Rule 5: Invalid Status**
- Value 1: `{{ $json.validationResult }}`
- Operation: `Equal`
- Value 2: `invalid_status`
- Output: Route to 500 error response

---

### Node 8a: Code - Format Token Not Found Error (Rule 1)

**Node Type:** `Code`
**Purpose:** Format 404 error response for invalid token

**Configuration:**
1. Add Code node to Rule 1 output
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
return [
  {
    json: {
      success: false,
      error: 'Invalid unsubscribe token. This link may have expired or been used already.',
      error_type: 'token_not_found',
      statusCode: 404
    }
  }
];
```

**Output:** Formatted 404 error response

---

### Node 8a-1: Respond to Webhook - Token Not Found (Rule 1)

**Node Type:** `Respond to Webhook`
**Purpose:** Return 404 error for invalid token

**Configuration:**
1. Add "Respond to Webhook" node after Code formatting node
2. Set parameters:
   - **Respond With:** First Incoming Item
   - **Response Code:** `{{ $json.statusCode }}`
   - **Put Response in Field:** Leave empty

---

### Node 8b: Code - Format Already Unsubscribed Response (Rule 2)

**Node Type:** `Code`
**Purpose:** Format 200 informational response for already unsubscribed users

**Configuration:**
1. Add Code node to Rule 2 output
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
      message: "You're already unsubscribed from Snippet.",
      email: item.json.email,
      statusCode: 200
    }
  }
];
```

**Output:** Formatted 200 informational response

---

### Node 8b-1: Respond to Webhook - Already Unsubscribed (Rule 2)

**Node Type:** `Respond to Webhook`
**Purpose:** Return informational message for already unsubscribed users

**Configuration:**
1. Add "Respond to Webhook" node after Code formatting node
2. Set parameters:
   - **Respond With:** First Incoming Item
   - **Response Code:** `{{ $json.statusCode }}`
   - **Put Response in Field:** Leave empty

---

### Node 8c: Code - Format Not Confirmed Error (Rule 3)

**Node Type:** `Code`
**Purpose:** Format 400 error response for unconfirmed subscriptions

**Configuration:**
1. Add Code node to Rule 3 output
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
return [
  {
    json: {
      success: false,
      error: 'Cannot unsubscribe. Your subscription was never confirmed.',
      error_type: 'not_confirmed',
      statusCode: 400
    }
  }
];
```

**Output:** Formatted 400 error response

---

### Node 8c-1: Respond to Webhook - Not Confirmed (Rule 3)

**Node Type:** `Respond to Webhook`
**Purpose:** Return error for unconfirmed subscriptions

**Configuration:**
1. Add "Respond to Webhook" node after Code formatting node
2. Set parameters:
   - **Respond With:** First Incoming Item
   - **Response Code:** `{{ $json.statusCode }}`
   - **Put Response in Field:** Leave empty

---

### Node 8d: Code - Format Invalid Status Error (Rule 5)

**Node Type:** `Code`
**Purpose:** Format 500 error response for unexpected subscriber status

**Configuration:**
1. Add Code node to Rule 5 output
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
      error: item.json.errorMessage,
      error_type: 'invalid_status',
      statusCode: 500
    }
  }
];
```

**Output:** Formatted 500 error response

---

### Node 8d-1: Respond to Webhook - Invalid Status (Rule 5)

**Node Type:** `Respond to Webhook`
**Purpose:** Return 500 error for unexpected subscriber status

**Configuration:**
1. Add "Respond to Webhook" node after Code formatting node
2. Set parameters:
   - **Respond With:** First Incoming Item
   - **Response Code:** `{{ $json.statusCode }}`
   - **Put Response in Field:** Leave empty

---

### Node 9: Google Sheets - Update Row to Unsubscribed (Rule 4)

**Node Type:** `Google Sheets`
**Purpose:** Mark subscriber as unsubscribed and clear tokens

**Configuration:**
1. Add Google Sheets node for valid unsubscription path
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Update Row
   - **Document:** "Newsletter Subscribers"
   - **Sheet:** "Newsletter Subscribers"
   - **Data Mode:** Auto-Map Input Data to Columns
   - **Column to Match On:** `email`

**Column Mapping:**
```
email (match key) → {{ $json.email }}
status → unsubscribed
unsubscribed_date → {{ new Date().toISOString() }}
confirmation_token → (empty/null)
token_expires_at → (empty/null)
unsubscribe_token → (empty/null)
```

**Note:** Keep these fields unchanged:
- `programming_languages`
- `created_date`
- `confirmed_date`
- `source`

This preserves subscription history for analytics.

---

### Node 10: Code - Format Unsubscribe Success Response

**Node Type:** `Code`
**Purpose:** Format success response after unsubscribing

**Configuration:**
1. Add Code node after Google Sheets update
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
      message: "You're unsubscribed from Snippet. Sorry to see you go.",
      email: item.json.email,
      statusCode: 200
    }
  }
];
```

**Output:** Formatted success response

---

### Node 10a: Respond to Webhook - Unsubscribe Success

**Node Type:** `Respond to Webhook`
**Purpose:** Return success response after unsubscribing

**Configuration:**
1. Add "Respond to Webhook" node after Code formatting node
2. Set parameters:
   - **Respond With:** First Incoming Item
   - **Response Code:** `{{ $json.statusCode }}`
   - **Put Response in Field:** Leave empty

---

## Frontend Integration Flow

**Email Unsubscribe Link:**
```html
<a href="https://iris-codes.com/unsubscribe?token={{ unsubscribe_token }}">
  Unsubscribe
</a>
```

**Frontend Confirmation Page (`/unsubscribe?token=xyz`):**
1. Extract token from URL query parameter
2. Show confirmation UI: "Unsubscribe from Snippet?"
3. User clicks "Confirm Unsubscribe" button
4. Frontend sends POST to n8n webhook with token
5. Display response message to user

**Example Frontend Flow:**
```typescript
// UnsubscribePage.tsx
const [searchParams] = useSearchParams();
const token = searchParams.get('token');

const handleUnsubscribe = async () => {
  const response = await fetch('https://retz8.app.n8n.cloud/webhook-test/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  const data = await response.json();
  // Show success or error message
};
```

---

## Workflow Testing

### Test 1: Valid Unsubscribe [DONE]

**Setup:**
1. Create subscriber with status="confirmed" and unsubscribe_token populated
2. Copy the unsubscribe_token

**Request (GET):**
```bash
curl https://retz8.app.n8n.cloud/webhook-test/unsubscribe?token=a7b3c4d5-e6f7-8901-2345-6789abcdef01
```

**Request (POST):**
```bash
curl -X POST https://retz8.app.n8n.cloud/webhook-test/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"token": "a7b3c4d5-e6f7-8901-2345-6789abcdef01"}'
```

**Expected Result:**
- Status: 200
- Response: `{"success": true, "message": "You're unsubscribed from Snippet. Sorry to see you go.", "email": "user@example.com", "statusCode": 200}`
- Google Sheets: Row updated with `status="unsubscribed"`, `unsubscribed_date=NOW()`, tokens cleared

---

### Test 2: Missing Token [DONE]

**Request:**
```bash
curl https://retz8.app.n8n.cloud/webhook-test/unsubscribe
```

**Expected Result:**
- Status: 400
- Response: `{"success": false, "error": "Invalid unsubscribe link. Token is missing.", "error_type": "missing_token", "statusCode": 400}`
- No Google Sheets changes

---

### Test 3: Invalid Token (Not Found) [DONE]

**Request:**
```bash
curl https://retz8.app.n8n.cloud/webhook-test/unsubscribe?token=invalid-random-token-12345
```

**Expected Result:**
- Status: 404
- Response: `{"success": false, "error": "Invalid unsubscribe token. This link may have expired or been used already.", "error_type": "token_not_found", "statusCode": 404}`
- No Google Sheets changes

---

### Test 4: Already Unsubscribed [DONE]

**Setup:**
1. Subscriber already has status="unsubscribed"

**Request:**
```bash
curl https://retz8.app.n8n.cloud/webhook-test/unsubscribe?token=<existing-unsubscribe-token>
```

**Expected Result:**
- Status: 200
- Response: `{"success": true, "message": "You're already unsubscribed from Snippet.", "email": "user@example.com", "statusCode": 200}`
- No Google Sheets changes (already unsubscribed)

---

### Test 5: Not Confirmed (Pending Status) [DONE]

**Setup:**
1. Subscriber has status="pending" (never confirmed)

**Request:**
```bash
curl https://retz8.app.n8n.cloud/webhook-test/unsubscribe?token=<unsubscribe-token-from-pending-user>
```

**Expected Result:**
- Status: 400
- Response: `{"success": false, "error": "Cannot unsubscribe. Your subscription was never confirmed.", "error_type": "not_confirmed", "statusCode": 400}`
- No Google Sheets changes

---

## Token Generation (For Reference)

Unsubscribe tokens are generated in the **confirmation workflow** (not this workflow).

**When Generated:**
- After user confirms email (clicks confirmation link)
- Status changes from "pending" to "confirmed"
- `unsubscribe_token` is populated with UUID v4

**Code Example (from confirmation workflow):**
```javascript
const unsubscribeToken = crypto.randomUUID();

// Update row
{
  status: 'confirmed',
  confirmed_date: new Date().toISOString(),
  confirmation_token: null,        // Clear (single-use)
  token_expires_at: null,          // Clear
  unsubscribe_token: unsubscribeToken  // Generate new
}
```

---

## Security Considerations

**Token Security:**
- Tokens are UUID v4 (128-bit random, cryptographically secure)
- Cannot be guessed or brute-forced
- Single-use: cleared after unsubscription
- No expiration (remains valid until used)

**Rate Limiting (Optional):**
- Add rate limiting to prevent token brute-force attempts
- Example: Max 5 invalid token attempts per IP per hour
- Can be implemented with n8n Rate Limit node or external service

**Audit Logging (Optional):**
- Log all unsubscribe attempts (success and failure)
- Track: timestamp, token, IP address, result
- Useful for detecting abuse or troubleshooting

---

## Error Handling

**Google Sheets Connection Failure:**
- If Google Sheets read fails: Return 500 error
- If Google Sheets update fails: Return 500 error
- Log error for investigation

**Invalid Token Format:**
- If token is not UUID format: Still perform lookup (fail gracefully)
- Return "token not found" rather than "invalid format"
- Prevents information disclosure about token format

**Network Timeouts:**
- Set reasonable timeout (10 seconds)
- Return error if Google Sheets operation times out

---

## Workflow Activation

1. Save workflow
2. Click "Activate" toggle
3. Test webhook URL: `https://retz8.app.n8n.cloud/webhook-test/unsubscribe`
4. Provide URL to Track E frontend team
5. Update email template to include token in unsubscribe link

---

## Email Template Update

**Newsletter Email Footer (with token):**
```html
<p style="font-size: 14px; color: #57606a;">
  <a href="https://iris-codes.com/unsubscribe?token={{ unsubscribe_token }}"
     style="color: #0969da; text-decoration: none;">
    Unsubscribe
  </a>
</p>
```

**Note:** The `unsubscribe_token` is unique per subscriber and generated when they confirm their subscription.

---

## Next Steps

After this workflow is complete:
1. Test full unsubscribe flow: email link → frontend confirmation → n8n webhook → success
2. Verify Google Sheets updates correctly
3. Test all edge cases (invalid token, already unsubscribed, etc.)
4. Update newsletter email templates with token-based unsubscribe links
5. Monitor "Executions" tab for unsubscribe requests
