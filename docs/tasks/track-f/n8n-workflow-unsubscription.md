# n8n Workflow 4: Newsletter Unsubscribe

**Workflow Name:** Newsletter Unsubscribe
**Trigger Type:** Webhook (GET)
**Purpose:** Handle unsubscribe requests from email footer links, update subscriber status in Google Sheets, and show confirmation page.

## Prerequisites

Before building this workflow, ensure you have:
- [ ] Google Sheets "Newsletter" spreadsheet with "Subscribers" tab already created
- [ ] Workflow 3 (Subscriber Signup) is complete and tested
- [ ] Google OAuth2 credentials configured in n8n
- [ ] At least one test subscriber in Google Sheets for testing

## Workflow Overview

```
Webhook (GET /webhook/unsubscribe?email=xxx)
    ↓
Code: Extract & Validate Email
    ↓
Google Sheets: Read Subscribers (find by email)
    ↓
IF: Email Found?
    ├─ TRUE → Code: Prepare Update Data
    │            ↓
    │         Google Sheets: Update Row (set status="unsubscribed")
    │            ↓
    │         Respond to Webhook: Success HTML
    │
    └─ FALSE → Respond to Webhook: Not Found HTML
```

## Node-by-Node Configuration

### Node 1: Webhook (Trigger)

**Node Type:** `Webhook`
**Purpose:** Receive GET requests from email unsubscribe links

**Configuration:**
1. Add Webhook node to canvas
2. Configure parameters:
   - **HTTP Method:** GET
   - **Path:** `unsubscribe` (full URL: https://n8n.iris-codes.com/webhook/unsubscribe)
   - **Authentication:** None
   - **Response Mode:** "Using 'Respond to Webhook' Node"
   - **Response Data:** First Entry JSON

3. After saving, note the webhook URL for email template

**Expected Request:**
```
GET https://n8n.iris-codes.com/webhook/unsubscribe?email=user@example.com
```

**Query Parameters:**
- `email` (required): Email address to unsubscribe

---

### Node 2: Code - Extract & Validate Email

**Node Type:** `Code`
**Purpose:** Extract email from query parameters and validate format

**Configuration:**
1. Add Code node after Webhook
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. Paste this JavaScript code:

```javascript
// Extract email from query parameters
const item = $input.first();
const queryParams = item.json.query || {};
const email = queryParams.email;

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate email
if (!email) {
  return [
    {
      json: {
        error: true,
        message: "Email parameter is missing",
        email: null
      }
    }
  ];
}

if (!emailRegex.test(email)) {
  return [
    {
      json: {
        error: true,
        message: "Invalid email format",
        email: email
      }
    }
  ];
}

// Valid email - pass through
return [
  {
    json: {
      error: false,
      email: email.toLowerCase().trim(),
      timestamp: new Date().toISOString()
    }
  }
];
```

**Output:** Validated email or error flag

---

### Node 3: IF - Check Validation Result

**Node Type:** `IF`
**Purpose:** Route based on email validation success/failure

**Configuration:**
1. Add IF node after Code node
2. Set condition:
   - **Condition 1:**
     - Value 1: `{{ $json.error }}`
     - Operation: `is equal to`
     - Value 2: `false`

**Outputs:**
- **TRUE branch:** Email valid, continue to search in Google Sheets
- **FALSE branch:** Email invalid, return error page

---

### Node 4a: Respond to Webhook - Invalid Email (FALSE branch)

**Node Type:** `Respond to Webhook`
**Purpose:** Show error page for invalid email

**Configuration:**
1. Add "Respond to Webhook" node to FALSE branch
2. Set parameters:
   - **Response Code:** 400
   - **Respond With:** Text
   - **Response Body:** Paste HTML below

**HTML Template:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invalid Request - Snippet</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background-color: #f6f8fa;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      background: white;
      padding: 48px 32px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      text-align: center;
    }
    h1 {
      margin: 0 0 16px 0;
      font-size: 24px;
      font-weight: 600;
      color: #24292f;
    }
    p {
      margin: 0 0 24px 0;
      font-size: 16px;
      line-height: 1.6;
      color: #57606a;
    }
    a {
      display: inline-block;
      padding: 12px 24px;
      background-color: #0969da;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    a:hover {
      background-color: #0550ae;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Invalid Request</h1>
    <p>The unsubscribe link is invalid or malformed. Please use the unsubscribe link from your email.</p>
    <a href="https://iris-codes.com/snippet">Return to Homepage</a>
  </div>
</body>
</html>
```

---

### Node 4b: Google Sheets - Read Subscribers (TRUE branch)

**Node Type:** `Google Sheets`
**Purpose:** Read all subscribers to find the email

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

**Output:** Returns all subscriber rows

---

### Node 5: Code - Find Email & Prepare Update

**Node Type:** `Code`
**Purpose:** Find subscriber by email and prepare update data

**Configuration:**
1. Add Code node after Google Sheets read
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. Paste this code:

```javascript
// Get the email to unsubscribe from the validation node
const validatedEmail = $('Code').first().json.email;

// Get all subscribers from Google Sheets
const allSubscribers = $input.all();

// Find the subscriber by email
let foundSubscriber = null;
let rowIndex = -1;

for (let i = 0; i < allSubscribers.length; i++) {
  const subscriber = allSubscribers[i].json;
  const subscriberEmail = subscriber.email?.toLowerCase().trim();

  if (subscriberEmail === validatedEmail) {
    foundSubscriber = subscriber;
    // Row index in Google Sheets (adding 2: 1 for 0-based to 1-based, 1 for header row)
    rowIndex = i + 2;
    break;
  }
}

if (!foundSubscriber) {
  return [
    {
      json: {
        found: false,
        email: validatedEmail
      }
    }
  ];
}

// Check if already unsubscribed
const isAlreadyUnsubscribed = foundSubscriber.status === "unsubscribed";

return [
  {
    json: {
      found: true,
      email: validatedEmail,
      rowIndex: rowIndex,
      alreadyUnsubscribed: isAlreadyUnsubscribed,
      currentStatus: foundSubscriber.status,
      timestamp: new Date().toISOString()
    }
  }
];
```

---

### Node 6: IF - Email Found?

**Node Type:** `IF`
**Purpose:** Route based on whether email exists in subscriber list

**Configuration:**
1. Add IF node after find email code
2. Set condition:
   - **Condition 1:**
     - Value 1: `{{ $json.found }}`
     - Operation: `is equal to`
     - Value 2: `true`

**Outputs:**
- **TRUE branch:** Email found, proceed to update
- **FALSE branch:** Email not found, show not found page

---

### Node 7a: Respond to Webhook - Not Found (FALSE branch)

**Node Type:** `Respond to Webhook`
**Purpose:** Show page when email not found

**Configuration:**
1. Add "Respond to Webhook" node to FALSE branch
2. Set parameters:
   - **Response Code:** 404
   - **Respond With:** Text
   - **Response Body:** Paste HTML below

**HTML Template:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Not Found - Snippet</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background-color: #f6f8fa;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      background: white;
      padding: 48px 32px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      text-align: center;
    }
    h1 {
      margin: 0 0 16px 0;
      font-size: 24px;
      font-weight: 600;
      color: #24292f;
    }
    p {
      margin: 0 0 24px 0;
      font-size: 16px;
      line-height: 1.6;
      color: #57606a;
    }
    a {
      display: inline-block;
      padding: 12px 24px;
      background-color: #0969da;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    a:hover {
      background-color: #0550ae;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Email Not Found</h1>
    <p>This email address is not in our subscriber list. You may have already unsubscribed or never subscribed.</p>
    <a href="https://iris-codes.com/snippet">Visit Snippet</a>
  </div>
</body>
</html>
```

---

### Node 7b: Google Sheets - Update Row (TRUE branch)

**Node Type:** `Google Sheets`
**Purpose:** Update subscriber status to "unsubscribed"

**Configuration:**
1. Add Google Sheets node to TRUE branch
2. Configure parameters:
   - **Credential:** Select your Google OAuth2 credential
   - **Operation:** Update Row
   - **Document:** Select "Newsletter" spreadsheet
   - **Sheet:** Select "Subscribers" sheet
   - **Row Number:** `={{ $json.rowIndex }}`
   - **Columns:** Map fields to update:
     - status → `unsubscribed`
     - unsubscribed_date → `={{ $json.timestamp }}`

**Note:** Only update status and unsubscribed_date columns. Leave other columns unchanged.

**Alternative Configuration (using Append or Update):**
If "Update Row" doesn't work as expected, use "Append or Update Row" operation:
   - **Operation:** Append or Update Row
   - **Document:** Select "Newsletter" spreadsheet
   - **Sheet:** Select "Subscribers" sheet
   - **Columns to Match On:** email
   - **Columns to Update:**
     - status → `unsubscribed`
     - unsubscribed_date → `={{ $json.timestamp }}`

---

### Node 8: Respond to Webhook - Success

**Node Type:** `Respond to Webhook`
**Purpose:** Show confirmation page after successful unsubscribe

**Configuration:**
1. Add "Respond to Webhook" node after Google Sheets update
2. Set parameters:
   - **Response Code:** 200
   - **Respond With:** Text
   - **Response Body:** Paste HTML below

**HTML Template:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - Snippet</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background-color: #f6f8fa;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      background: white;
      padding: 48px 32px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      text-align: center;
    }
    h1 {
      margin: 0 0 16px 0;
      font-size: 24px;
      font-weight: 600;
      color: #24292f;
    }
    p {
      margin: 0 0 24px 0;
      font-size: 16px;
      line-height: 1.6;
      color: #57606a;
    }
    .success-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 24px;
      background-color: #1a7f37;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
    }
    a {
      display: inline-block;
      padding: 12px 24px;
      background-color: #0969da;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: background-color 0.2s;
      margin-right: 12px;
    }
    a:hover {
      background-color: #0550ae;
    }
    a.secondary {
      background-color: transparent;
      color: #0969da;
      border: 1px solid #d0d7de;
    }
    a.secondary:hover {
      background-color: #f6f8fa;
      border-color: #0969da;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✓</div>
    <h1>You're unsubscribed from Snippet</h1>
    <p>You won't receive any more emails from us. We're sorry to see you go.</p>
    <div>
      <a href="https://iris-codes.com/snippet" class="secondary">Changed your mind? Resubscribe</a>
    </div>
  </div>
</body>
</html>
```

---

## Testing the Workflow

### Test 1: Valid Unsubscribe (Existing Subscriber)

**Prerequisites:**
- Add test subscriber to Google Sheets manually or via Workflow 3:
  - email: test@example.com
  - status: active

**Test Request:**
```bash
# Visit in browser or use curl
curl "https://n8n.iris-codes.com/webhook/unsubscribe?email=test@example.com"
```

**Expected Result:**
- Status: 200
- Response: Success HTML page with "You're unsubscribed from Snippet"
- Google Sheets: Row updated with status="unsubscribed" and unsubscribed_date=current timestamp
- Browser: Shows confirmation page with resubscribe option

### Test 2: Email Not Found

**Test Request:**
```bash
curl "https://n8n.iris-codes.com/webhook/unsubscribe?email=nonexistent@example.com"
```

**Expected Result:**
- Status: 404
- Response: "Email Not Found" HTML page
- Google Sheets: No changes
- Browser: Shows not found page

### Test 3: Invalid Email Format

**Test Request:**
```bash
curl "https://n8n.iris-codes.com/webhook/unsubscribe?email=invalid-email"
```

**Expected Result:**
- Status: 400
- Response: "Invalid Request" HTML page
- Google Sheets: No changes
- Browser: Shows error page

### Test 4: Missing Email Parameter

**Test Request:**
```bash
curl "https://n8n.iris-codes.com/webhook/unsubscribe"
```

**Expected Result:**
- Status: 400
- Response: "Invalid Request" HTML page (email parameter missing)
- Google Sheets: No changes

### Test 5: Already Unsubscribed

**Prerequisites:**
- Subscriber already has status="unsubscribed"

**Test Request:**
```bash
curl "https://n8n.iris-codes.com/webhook/unsubscribe?email=test@example.com"
```

**Expected Result:**
- Status: 200
- Response: Success HTML page (same as first unsubscribe)
- Google Sheets: Row remains with status="unsubscribed" (idempotent operation)
- Note: You may want to modify the HTML to show "You're already unsubscribed" message

---

## Optional Enhancement: Detect Already Unsubscribed

To show a different message for already-unsubscribed users, add this node:

### Optional Node: IF - Already Unsubscribed?

Insert this between Node 6 (IF - Email Found?) and Node 7b (Google Sheets Update):

**Configuration:**
1. Add IF node after "Email Found?" TRUE branch
2. Set condition:
   - **Condition 1:**
     - Value 1: `{{ $json.alreadyUnsubscribed }}`
     - Operation: `is equal to`
     - Value 2: `true`

**TRUE branch:** Skip update, show "already unsubscribed" page
**FALSE branch:** Proceed to update Google Sheets

Then add a "Respond to Webhook" node on TRUE branch with custom HTML:

```html
<h1>You're already unsubscribed</h1>
<p>This email address was previously unsubscribed from Snippet.</p>
```

---

## Email Template Integration

The unsubscribe link should be included in all newsletter emails. The link format is:

```html
<a href="https://iris-codes.com/snippet/unsubscribe?email={{ subscriber_email }}" style="color: #0969da; text-decoration: none;">Unsubscribe</a>
```

**For Workflow 2 (Send Newsletter):**
Update the newsletter email template footer to include:

```html
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #d0d7de; font-size: 14px; color: #57606a;">
  <p style="margin: 0;">
    Python, JS/TS, C/C++ |
    <a href="https://iris-codes.com/snippet/unsubscribe?email={{ $json.email }}" style="color: #0969da; text-decoration: none;">Unsubscribe</a>
  </p>
</div>
```

**Note:** Replace `{{ $json.email }}` with the actual subscriber email field from your workflow context.

---

## URL Redirect Configuration (Optional)

If you want cleaner URLs like `iris-codes.com/unsubscribe` instead of `n8n.iris-codes.com/webhook/unsubscribe`, configure URL redirect:

### Option 1: Nginx Reverse Proxy

On your web server (iris-codes.com), add this Nginx configuration:

```nginx
location /snippet/unsubscribe {
    proxy_pass https://n8n.iris-codes.com/webhook/unsubscribe;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Then the unsubscribe link becomes:
```
https://iris-codes.com/snippet/unsubscribe?email=user@example.com
```

### Option 2: Vercel Redirect (if using Vercel for web/)

Add to `web/vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/snippet/unsubscribe",
      "destination": "https://n8n.iris-codes.com/webhook/unsubscribe",
      "permanent": false
    }
  ]
}
```

---

## Workflow Activation

1. Click "Activate" button in top-right corner
2. Test with all test cases listed above
3. Verify webhook URL is accessible publicly
4. Copy webhook URL: `https://n8n.iris-codes.com/webhook/unsubscribe`
5. Update email templates in Workflow 2 to include unsubscribe link
6. Update welcome email in Workflow 3 footer with unsubscribe link

---

## Monitoring & Analytics

### Tracking Unsubscribe Rate

To calculate unsubscribe rate, query Google Sheets:

**Formula:**
```
Unsubscribe Rate = (Count of status="unsubscribed") / (Total subscribers) × 100
```

**In Google Sheets:**
```
=COUNTIF(F:F, "unsubscribed") / COUNTA(A:A) * 100
```

Where F:F is the status column and A:A is the email column.

### Unsubscribe Rate Benchmarks

- **< 0.5%:** Excellent (industry-leading)
- **0.5-1%:** Good (acceptable for newsletters)
- **1-2%:** Average (monitor for trends)
- **> 2%:** High (investigate content/frequency issues)
- **> 5%:** Critical (major changes needed)

### When to Review

- After first 10 newsletter sends (establish baseline)
- Monthly trend analysis (compare month-over-month)
- Spike detection (if any single issue > 2% unsubscribe rate)

---

## Troubleshooting

### Issue: Webhook returns 404

**Solution:**
- Verify workflow is activated
- Check webhook path matches email link
- Test webhook URL directly in browser

### Issue: Email not found but subscriber exists

**Solution:**
- Check email comparison logic (case-insensitive, trimmed)
- Verify Google Sheets read returns all rows
- Check for extra spaces in email addresses in Google Sheets

### Issue: Row not updating in Google Sheets

**Solution:**
- Verify rowIndex calculation is correct (header row + 0-based to 1-based)
- Check Google Sheets credentials have write permissions
- Try "Append or Update Row" operation instead of "Update Row"
- Verify column names match exactly (case-sensitive)

### Issue: HTML page not rendering correctly

**Solution:**
- Check "Respond With" is set to "Text" not "JSON"
- Verify HTML template has no syntax errors
- Test HTML in local HTML file first
- Check browser developer console for errors

### Issue: Unsubscribe link not working in email

**Solution:**
- Verify email address is properly URL-encoded
- Check for line breaks in the unsubscribe URL
- Test clicking link from actual email (not just browser)
- Verify webhook URL is publicly accessible (not localhost)

---

## Legal Compliance Notes

### CAN-SPAM Act (US)

- ✅ Unsubscribe link required in all emails
- ✅ Unsubscribe must be processed within 10 business days
- ✅ Unsubscribe mechanism must be simple (one-click, no login required)
- ✅ Physical mailing address required in footer (add to email template if needed)

### GDPR (EU)

- ✅ Unsubscribe must be as easy as subscribe
- ✅ User data must be removable upon request
- ✅ Clear privacy policy required (link in email footer)

**Note:** Current workflow sets status to "unsubscribed" but keeps email in database for compliance logging. If user requests data deletion (GDPR "right to be forgotten"), manually delete the row from Google Sheets.

---

## Next Steps

After Workflow 4 is complete:

1. Test thoroughly with all test cases
2. Update Workflow 2 (Send Newsletter) email template to include unsubscribe link
3. Update Workflow 3 (Subscriber Signup) welcome email to include unsubscribe link
4. Configure URL redirect (optional) for cleaner URLs
5. Set up monitoring for unsubscribe rate tracking
6. Document unsubscribe webhook URL for Track E team (for /snippet/unsubscribe page)
