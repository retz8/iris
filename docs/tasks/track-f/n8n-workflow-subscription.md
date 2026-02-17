# n8n Workflow 3: Newsletter Subscriber Signup

**Workflow Name:** Newsletter Subscriber Signup
**Trigger Type:** Webhook (POST)
**Purpose:** Handle new subscriber signups from landing page, validate email, check duplicates, store in Google Sheets, and send welcome email.

## Prerequisites

Before building this workflow, ensure you have:
- [ ] Google Sheets spreadsheet created with name "Newsletter"
- [ ] Sheet tab named "Subscribers" with columns: email, written_language, programming_languages, subscribed_date, source, status, unsubscribed_date
- [ ] Google OAuth2 credentials configured in n8n
- [ ] Gmail credentials configured in n8n (same Google account)
- [ ] n8n instance accessible at n8n.iris-codes.com

## Workflow Overview

```
Webhook (POST)
    ↓
Code: Validate Email
    ↓
Google Sheets: Read (check duplicates)
    ↓
IF: Is Duplicate?
    ├─ TRUE → Code: Format Error Response → Webhook Response (Error)
    └─ FALSE → Code: Prepare Row Data
                  ↓
              Google Sheets: Append Row
                  ↓
              Gmail: Send Welcome Email
                  ↓
              Webhook Response (Success)
```

## Node-by-Node Configuration

### Node 1: Webhook (Trigger)

**Node Type:** `Webhook`
**Purpose:** Receive POST requests from landing page signup form

**Configuration:**
1. Add Webhook node to canvas
2. Configure parameters:
   - **HTTP Method:** POST
   - **Path:** `subscribe` (full URL will be: https://n8n.iris-codes.com/webhook/subscribe)
   - **Authentication:** None
   - **Response Mode:** "Using 'Respond to Webhook' Node"
   - **Response Data:** First Entry JSON

3. After saving, copy the webhook URL for Track E to use in the signup form

**Expected Input:**
```json
{
  "email": "user@example.com",
  "written_language": "en",
  "programming_languages": ["Python", "JS/TS"],
  "source": "landing_page",
  "subscribed_date": "2026-02-17T12:00:00Z"
}
```

---

### Node 2: Code - Validate Email

**Node Type:** `Code`
**Purpose:** Validate email format and extract data from webhook

**Configuration:**
1. Add Code node after Webhook
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. Paste this JavaScript code:

```javascript
// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const items = $input.all();
const results = [];

for (const item of items) {
  const email = item.json.email;
  const written_language = item.json.written_language;
  const programming_languages = item.json.programming_languages;
  const source = item.json.source;
  const subscribed_date = item.json.subscribed_date;

  // Validate email format
  if (!email || !emailRegex.test(email)) {
    results.push({
      json: {
        error: true,
        message: "Invalid email format",
        email: email
      }
    });
    continue;
  }

  // Validate required fields
  if (!written_language || !programming_languages || programming_languages.length === 0) {
    results.push({
      json: {
        error: true,
        message: "Missing required fields",
        email: email
      }
    });
    continue;
  }

  // Valid data - pass through
  results.push({
    json: {
      error: false,
      email: email,
      written_language: written_language,
      programming_languages: programming_languages,
      source: source,
      subscribed_date: subscribed_date
    }
  });
}

return results;
```

**Output:** Passes through validated data or error flag

---

### Node 3: IF - Check Validation Result

**Node Type:** `IF`
**Purpose:** Route based on validation success/failure

**Configuration:**
1. Add IF node after Code node
2. Set condition:
   - **Condition 1:**
     - Value 1: `{{ $json.error }}`
     - Operation: `is equal to`
     - Value 2: `false`

**Outputs:**
- **TRUE branch:** Validation passed, continue to duplicate check
- **FALSE branch:** Validation failed, return error response

---

### Node 4a: Code - Format Error Response (FALSE branch)

**Node Type:** `Code`
**Purpose:** Format error response for failed validation

**Configuration:**
1. Add Code node to FALSE branch
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. Paste this code:

```javascript
const item = $input.first();

return [
  {
    json: {
      success: false,
      error: item.json.message || "Validation failed",
      statusCode: 400
    }
  }
];
```

---

### Node 4b: Respond to Webhook - Error (FALSE branch)

**Node Type:** `Respond to Webhook`
**Purpose:** Send error response back to landing page

**Configuration:**
1. Add "Respond to Webhook" node after error formatting code
2. Set parameters:
   - **Response Code:** 400
   - **Response Body:** `{{ $json }}`

---

### Node 5: Google Sheets - Read Subscribers (TRUE branch)

**Node Type:** `Google Sheets`
**Purpose:** Read all subscribers to check for duplicates

**Configuration:**
1. Add Google Sheets node to TRUE branch
2. Configure parameters:
   - **Credential:** Select your Google OAuth2 credential
   - **Operation:** Get Row(s)
   - **Document:** Select "Newsletter" spreadsheet
   - **Sheet:** Select "Subscribers" sheet
   - **Options:**
     - **Return All:** ON (toggle enabled)
     - **RAW Data:** OFF

**Output:** Returns all existing subscriber rows

---

### Node 6: Code - Check Duplicates

**Node Type:** `Code`
**Purpose:** Check if email already exists in subscriber list

**Configuration:**
1. Add Code node after Google Sheets read
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. Paste this code:

```javascript
// Get validated data from webhook validation node
const validatedData = $('Code').first().json;
const newEmail = validatedData.email.toLowerCase().trim();

// Get all existing subscribers from Google Sheets
const existingSubscribers = $input.all();

// Check for duplicate
const isDuplicate = existingSubscribers.some(subscriber => {
  const existingEmail = subscriber.json.email?.toLowerCase().trim();
  return existingEmail === newEmail;
});

return [
  {
    json: {
      isDuplicate: isDuplicate,
      email: validatedData.email,
      written_language: validatedData.written_language,
      programming_languages: validatedData.programming_languages,
      source: validatedData.source,
      subscribed_date: validatedData.subscribed_date
    }
  }
];
```

---

### Node 7: IF - Is Duplicate?

**Node Type:** `IF`
**Purpose:** Route based on duplicate check result

**Configuration:**
1. Add IF node after duplicate check code
2. Set condition:
   - **Condition 1:**
     - Value 1: `{{ $json.isDuplicate }}`
     - Operation: `is equal to`
     - Value 2: `true`

**Outputs:**
- **TRUE branch:** Email already exists, return error
- **FALSE branch:** New subscriber, continue to append

---

### Node 8a: Code - Duplicate Error Response (TRUE branch)

**Node Type:** `Code`
**Purpose:** Format error response for duplicate email

**Configuration:**
1. Add Code node to TRUE branch
2. Paste this code:

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

---

### Node 8b: Respond to Webhook - Duplicate Error (TRUE branch)

**Node Type:** `Respond to Webhook`
**Purpose:** Send duplicate error response

**Configuration:**
1. Add "Respond to Webhook" node
2. Set parameters:
   - **Response Code:** 409
   - **Response Body:** `{{ $json }}`

---

### Node 9: Code - Prepare Row Data (FALSE branch)

**Node Type:** `Code`
**Purpose:** Format data for Google Sheets insertion

**Configuration:**
1. Add Code node to FALSE branch (new subscriber path)
2. Paste this code:

```javascript
const item = $input.first();

// Join programming languages array to comma-separated string
const programmingLanguagesStr = item.json.programming_languages.join(',');

return [
  {
    json: {
      email: item.json.email,
      written_language: item.json.written_language,
      programming_languages: programmingLanguagesStr,
      subscribed_date: item.json.subscribed_date,
      source: item.json.source,
      status: "active",
      unsubscribed_date: null
    }
  }
];
```

---

### Node 10: Google Sheets - Append Row

**Node Type:** `Google Sheets`
**Purpose:** Add new subscriber to Google Sheets

**Configuration:**
1. Add Google Sheets node after row preparation
2. Configure parameters:
   - **Credential:** Select your Google OAuth2 credential
   - **Operation:** Append Row
   - **Document:** Select "Newsletter" spreadsheet
   - **Sheet:** Select "Subscribers" sheet
   - **Data Mode:** Auto-Map Input Data to Columns
   - **Columns:** Map fields:
     - email → `{{ $json.email }}`
     - written_language → `{{ $json.written_language }}`
     - programming_languages → `{{ $json.programming_languages }}`
     - subscribed_date → `{{ $json.subscribed_date }}`
     - source → `{{ $json.source }}`
     - status → `{{ $json.status }}`
     - unsubscribed_date → `{{ $json.unsubscribed_date }}`

**Output:** Returns the appended row data

---

### Node 11: Gmail - Send Welcome Email

**Node Type:** `Gmail`
**Purpose:** Send welcome email to new subscriber

**Configuration:**
1. Add Gmail node after Google Sheets append
2. Configure parameters:
   - **Credential:** Select your Gmail OAuth2 credential
   - **Resource:** Message
   - **Operation:** Send
   - **To:** `{{ $json.email }}`
   - **Subject:** `You merge it. Can you read it fast enough?`
   - **Email Type:** HTML
   - **Message (HTML):** Paste the HTML template below

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
        <a href="https://iris-codes.com/snippet/unsubscribe?email={{ $json.email }}" style="color: #0969da; text-decoration: none;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>
```

**Note:** The unsubscribe link includes the email as a query parameter for the unsubscribe workflow.

---

### Node 12: Respond to Webhook - Success

**Node Type:** `Respond to Webhook`
**Purpose:** Send success response back to landing page

**Configuration:**
1. Add "Respond to Webhook" node after Gmail node
2. Set parameters:
   - **Response Code:** 200
   - **Response Body:** Create this JSON:

```json
{
  "success": true,
  "message": "Successfully subscribed! First Snippet arrives Monday 7am.",
  "email": "={{ $json.email }}"
}
```

---

## Testing the Workflow

### Test 1: Valid New Subscriber

**Test Data:**
```bash
curl -X POST https://n8n.iris-codes.com/webhook/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "written_language": "en",
    "programming_languages": ["Python", "JS/TS"],
    "source": "landing_page",
    "subscribed_date": "2026-02-17T12:00:00Z"
  }'
```

**Expected Result:**
- Status: 200
- Response: `{"success": true, "message": "Successfully subscribed! First Snippet arrives Monday 7am.", "email": "test@example.com"}`
- Google Sheets: New row added with status "active"
- Email: Welcome email received at test@example.com

### Test 2: Invalid Email Format

**Test Data:**
```bash
curl -X POST https://n8n.iris-codes.com/webhook/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "written_language": "en",
    "programming_languages": ["Python"],
    "source": "landing_page",
    "subscribed_date": "2026-02-17T12:00:00Z"
  }'
```

**Expected Result:**
- Status: 400
- Response: `{"success": false, "error": "Invalid email format", "statusCode": 400}`
- Google Sheets: No row added
- Email: No email sent

### Test 3: Duplicate Email

**Test Data:**
```bash
# Submit the same email twice
curl -X POST https://n8n.iris-codes.com/webhook/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "written_language": "en",
    "programming_languages": ["Python"],
    "source": "landing_page",
    "subscribed_date": "2026-02-17T12:00:00Z"
  }'
```

**Expected Result:**
- Status: 409
- Response: `{"success": false, "error": "Email already subscribed", "email": "test@example.com", "statusCode": 409}`
- Google Sheets: No duplicate row added
- Email: No email sent

### Test 4: Missing Required Fields

**Test Data:**
```bash
curl -X POST https://n8n.iris-codes.com/webhook/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "written_language": "en",
    "source": "landing_page",
    "subscribed_date": "2026-02-17T12:00:00Z"
  }'
```

**Expected Result:**
- Status: 400
- Response: `{"success": false, "error": "Missing required fields", "statusCode": 400}`
- Google Sheets: No row added
- Email: No email sent

---

## Workflow Activation

1. Click "Activate" button in top-right corner
2. Verify webhook URL is accessible
3. Copy webhook URL: `https://n8n.iris-codes.com/webhook/subscribe`
4. Provide URL to Track E team to replace placeholder in signup form
5. Monitor executions tab for incoming signups

---

## Troubleshooting

### Issue: Webhook not receiving requests

**Solution:**
- Check n8n instance is running and accessible
- Verify webhook path matches signup form URL
- Check firewall/security group settings

### Issue: Google Sheets authentication error

**Solution:**
- Re-authenticate Google OAuth2 credentials
- Verify credentials have access to the "Newsletter" spreadsheet
- Check spreadsheet ID and sheet name are correct

### Issue: Gmail not sending emails

**Solution:**
- Re-authenticate Gmail credentials
- Check Gmail daily sending limits (500 emails/day for free accounts)
- Verify HTML template has no syntax errors
- Check spam folder of test email

### Issue: Duplicate detection not working

**Solution:**
- Verify Google Sheets read operation returns all rows
- Check email comparison logic (case-insensitive, trimmed)
- Ensure "status" column doesn't filter out unsubscribed users

---

## Next Steps

After Workflow 3 is complete:
1. Test thoroughly with all test cases
2. Provide webhook URL to Track E team
3. Build unsubscribe workflow (see separate documentation)
4. Monitor for first real signups from landing page
