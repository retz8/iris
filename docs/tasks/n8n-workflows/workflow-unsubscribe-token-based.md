# n8n Workflow: Newsletter Unsubscription (Token-Based)

**Workflow Name:** Newsletter Unsubscription Token-Based
**Trigger Type:** Webhook (GET/POST)
**Purpose:** Handle newsletter unsubscription with secure token verification to prevent unauthorized unsubscribe attacks.

## Prerequisites

- Google Sheets spreadsheet: "Newsletter Subscribers" (see `google-sheets-subscribers-schema.md`)
- Google OAuth2 credentials configured in n8n
- n8n instance accessible at n8n.iris-codes.com

## Workflow Overview

```
Webhook GET/POST /unsubscribe?token=xyz
    ↓
Code: Extract & Validate Token Parameter
    ↓
IF: Token Provided?
    ├─ FALSE → Respond to Webhook (400 Missing Token)
    └─ TRUE → Google Sheets: Read All Subscribers
                  ↓
              Code: Find Subscriber by unsubscribe_token
                  ↓
              Switch: Route by Validation Result
                  ├─ "not_found" → Respond (404 Invalid Token)
                  ├─ "already_unsubscribed" → Respond (200 Already Unsubscribed)
                  ├─ "not_confirmed" → Respond (400 Not Confirmed)
                  └─ "valid" → Google Sheets: Update Row (status=unsubscribed)
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
GET https://n8n.iris-codes.com/webhook/unsubscribe?token=a7b3c4d5-e6f7-8901-2345-6789abcdef01
```

**Expected Input (POST):**
```json
{
  "token": "a7b3c4d5-e6f7-8901-2345-6789abcdef01"
}
```

**Webhook URL:** `https://n8n.iris-codes.com/webhook/unsubscribe`

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

### Node 4a: Respond to Webhook - Missing Token (FALSE branch)

**Node Type:** `Respond to Webhook`
**Purpose:** Return error for missing token

**Configuration:**
- **Response Code:** 400
- **Response Body:**

```json
{
  "success": false,
  "error": "Invalid unsubscribe link. Token is missing.",
  "error_type": "missing_token",
  "statusCode": 400
}
```

---

### Node 5: Google Sheets - Read All Subscribers (TRUE branch)

**Node Type:** `Google Sheets`
**Purpose:** Fetch all subscribers to find matching token

**Configuration:**
1. Add Google Sheets node to TRUE branch
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Get Row(s)
   - **Document:** "Newsletter Subscribers"
   - **Sheet:** "Newsletter Subscribers"
   - **Options:**
     - **Return All:** ON
     - **RAW Data:** OFF

**Output:** All subscriber rows

---

### Node 6: Code - Find Subscriber by Token & Validate

**Node Type:** `Code`
**Purpose:** Look up subscriber by unsubscribe_token and validate status

**Configuration:**
1. Add Code node after Google Sheets read
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
// Get token from extraction node
const tokenData = $('Code').first().json;
const token = tokenData.token;

// Get all subscribers from Google Sheets
const subscribers = $input.all();

// Find subscriber by unsubscribe_token
const subscriber = subscribers.find(sub => {
  return sub.json.unsubscribe_token === token;
});

// Determine validation result and action
let validationResult = 'not_found';
let email = null;
let rowIndex = null;
let errorMessage = null;
let statusCode = 404;

if (!subscriber) {
  // Token not found in database
  validationResult = 'not_found';
  errorMessage = 'Invalid unsubscribe token. This link may have expired or been used already.';
  statusCode = 404;
} else {
  email = subscriber.json.email;
  rowIndex = subscriber.json.row_index; // Google Sheets row number
  const status = subscriber.json.status;

  if (status === 'unsubscribed') {
    // Already unsubscribed
    validationResult = 'already_unsubscribed';
    errorMessage = null; // Not an error, just informational
    statusCode = 200;
  } else if (status === 'pending' || status === 'expired') {
    // Not confirmed yet, cannot unsubscribe
    validationResult = 'not_confirmed';
    errorMessage = 'Cannot unsubscribe. Your subscription was never confirmed.';
    statusCode = 400;
  } else if (status === 'confirmed') {
    // Valid for unsubscription
    validationResult = 'valid';
    errorMessage = null;
    statusCode = 200;
  } else {
    // Unknown status
    validationResult = 'invalid_status';
    errorMessage = `Invalid subscription status: ${status}`;
    statusCode = 500;
  }
}

return [
  {
    json: {
      validationResult: validationResult,
      email: email,
      rowIndex: rowIndex,
      token: token,
      errorMessage: errorMessage,
      statusCode: statusCode
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
  "error": "Invalid unsubscribe token. This link may have expired or been used already.",
  "error_type": "token_not_found",
  "statusCode": 404
}
```

---

### Node 8b: Respond to Webhook - Already Unsubscribed (Rule 2)

**Node Type:** `Respond to Webhook`
**Purpose:** Return informational message for already unsubscribed users

**Configuration:**
- **Response Code:** 200
- **Response Body:**

```json
{
  "success": true,
  "message": "You're already unsubscribed from Snippet.",
  "email": "={{ $json.email }}",
  "statusCode": 200
}
```

---

### Node 8c: Respond to Webhook - Not Confirmed (Rule 3)

**Node Type:** `Respond to Webhook`
**Purpose:** Return error for unconfirmed subscriptions

**Configuration:**
- **Response Code:** 400
- **Response Body:**

```json
{
  "success": false,
  "error": "Cannot unsubscribe. Your subscription was never confirmed.",
  "error_type": "not_confirmed",
  "statusCode": 400
}
```

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
   - **Row Number:** `{{ $json.rowIndex }}`

**Columns to Update:**
```javascript
// Prepare update data
const now = new Date().toISOString();

return [
  {
    json: {
      status: 'unsubscribed',
      unsubscribed_date: now,
      confirmation_token: null,      // Clear confirmation token
      token_expires_at: null,        // Clear expiration
      unsubscribe_token: null        // Clear unsubscribe token (single-use)
    }
  }
];
```

**Column Mapping:**
```
status → unsubscribed
unsubscribed_date → {{ $json.unsubscribed_date }}
confirmation_token → {{ $json.confirmation_token }}
token_expires_at → {{ $json.token_expires_at }}
unsubscribe_token → {{ $json.unsubscribe_token }}
```

**Note:** Keep these fields unchanged:
- `email`
- `written_language`
- `programming_languages`
- `created_date`
- `confirmed_date`
- `source`

This preserves subscription history for analytics.

---

### Node 10: Respond to Webhook - Unsubscribe Success (After Update)

**Node Type:** `Respond to Webhook`
**Purpose:** Return success response after unsubscribing

**Configuration:**
- **Response Code:** 200
- **Response Body:**

```json
{
  "success": true,
  "message": "You're unsubscribed from Snippet. Sorry to see you go.",
  "email": "={{ $('Code1').first().json.email }}",
  "statusCode": 200
}
```

**Note:** Reference the email from the validation Code node using `$('Code1').first().json.email`

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
  const response = await fetch('https://n8n.iris-codes.com/webhook/unsubscribe', {
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

### Test 1: Valid Unsubscribe

**Setup:**
1. Create subscriber with status="confirmed" and unsubscribe_token populated
2. Copy the unsubscribe_token

**Request (GET):**
```bash
curl https://n8n.iris-codes.com/webhook/unsubscribe?token=a7b3c4d5-e6f7-8901-2345-6789abcdef01
```

**Request (POST):**
```bash
curl -X POST https://n8n.iris-codes.com/webhook/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"token": "a7b3c4d5-e6f7-8901-2345-6789abcdef01"}'
```

**Expected Result:**
- Status: 200
- Response: `{"success": true, "message": "You're unsubscribed from Snippet. Sorry to see you go.", "email": "user@example.com", "statusCode": 200}`
- Google Sheets: Row updated with `status="unsubscribed"`, `unsubscribed_date=NOW()`, tokens cleared

---

### Test 2: Missing Token

**Request:**
```bash
curl https://n8n.iris-codes.com/webhook/unsubscribe
```

**Expected Result:**
- Status: 400
- Response: `{"success": false, "error": "Invalid unsubscribe link. Token is missing.", "error_type": "missing_token", "statusCode": 400}`
- No Google Sheets changes

---

### Test 3: Invalid Token (Not Found)

**Request:**
```bash
curl https://n8n.iris-codes.com/webhook/unsubscribe?token=invalid-random-token-12345
```

**Expected Result:**
- Status: 404
- Response: `{"success": false, "error": "Invalid unsubscribe token. This link may have expired or been used already.", "error_type": "token_not_found", "statusCode": 404}`
- No Google Sheets changes

---

### Test 4: Already Unsubscribed

**Setup:**
1. Subscriber already has status="unsubscribed"

**Request:**
```bash
curl https://n8n.iris-codes.com/webhook/unsubscribe?token=<existing-unsubscribe-token>
```

**Expected Result:**
- Status: 200
- Response: `{"success": true, "message": "You're already unsubscribed from Snippet.", "email": "user@example.com", "statusCode": 200}`
- No Google Sheets changes (already unsubscribed)

---

### Test 5: Not Confirmed (Pending Status)

**Setup:**
1. Subscriber has status="pending" (never confirmed)

**Request:**
```bash
curl https://n8n.iris-codes.com/webhook/unsubscribe?token=<unsubscribe-token-from-pending-user>
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
3. Test webhook URL: `https://n8n.iris-codes.com/webhook/unsubscribe`
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
