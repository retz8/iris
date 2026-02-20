# n8n Workflow: Send Newsletter

**Workflow Name:** Newsletter Send
**Trigger Type:** Schedule (Cron)
**Purpose:** On Mon/Wed/Fri at 7am, pick up all scheduled drafts for today, send each draft to eligible confirmed subscribers with a personalized unsubscribe link, and mark each draft as sent.

## Prerequisites

- Google Sheets spreadsheet: "Newsletter Drafts" (see `google-sheets-drafts-schema.md`)
- Google Sheets spreadsheet: "Newsletter Subscribers" (see `google-sheets-subscribers-schema.md`)
- Google Sheets spreadsheet: "Send Errors" (see `google-sheets-send-errors-schema.md`)
- Google OAuth2 credentials configured in n8n
- Gmail OAuth2 credentials configured in n8n
- Gmail drafts contain `{{unsubscribe_token}}` as a literal placeholder in the HTML body (Code node replaces this per subscriber — n8n's expression engine does not process this directly)
- n8n instance accessible at retz8.app.n8n.cloud

## Workflow Overview

```
Schedule Trigger (Mon/Wed/Fri at 7am)
    ↓
Code: Get Today's Day Abbreviation
    ↓
Google Sheets: Get Confirmed Subscribers (once per run)
  ↓
Google Sheets: Get Scheduled Drafts
(filter: status = "scheduled" AND scheduled_day = today)
    ↓
Loop Over Items: Loop Over Drafts (batchSize: 1)
    ↓ [loop output — one draft at a time]
Gmail: Get Draft by ID
    ↓
Code: Decode Draft HTML & Extract Metadata
    ↓
IF: Draft Decode Failed?
  ├─ TRUE  → Google Sheets: Append to Send Errors (error_type=draft_decode_failed) → (continue outer loop)
  └─ FALSE → Code: Filter by Language & Random Pick
    ↓
Loop Over Items: Loop Over Subscribers (batchSize: 1)
    ↓ [loop output — one subscriber at a time]
Code: Inject Unsubscribe Token
    ↓
Gmail: Send Email (Continue on Error: ON)
    ↓
IF: Send Failed?
  ├─ TRUE  → Google Sheets: Append to Send Errors (error_type=gmail_send_failed) → Loop Over Items (Subscribers): Next
  └─ FALSE → Loop Over Items (Subscribers): Next
    ↓ [done output — all subscribers processed]
Google Sheets: Update Draft Row to Sent
  ↓
IF: Draft Update Failed?
  ├─ TRUE  → Google Sheets: Append to Send Errors (error_type=sheet_update_failed) → Loop Over Items (Drafts): Next
  └─ FALSE → Loop Over Items (Drafts): Next
    ↓ [done output — all drafts processed]
(workflow ends)
```

## Node-by-Node Configuration

### Node 1: Schedule Trigger

**Node Type:** `nodes-base.scheduleTrigger`
**Purpose:** Fire the workflow on Mon, Wed, Fri at 7am

**Configuration:**
1. Add Schedule Trigger node to canvas
2. Configure parameters:
   - **Trigger Rule:** Cron Expression
   - **Expression:** `0 7 * * 1,3,5`
     - `0 7` = 7:00am
     - `* * 1,3,5` = Monday (1), Wednesday (3), Friday (5)

**Note:** The workflow relies on this schedule being correct — no secondary day check is needed.

---

### Node 2: Code - Get Today's Day Abbreviation

**Node Type:** `Code`
**Purpose:** Produce the lowercase day abbreviation (`mon`, `wed`, `fri`) that matches the `scheduled_day` values in Newsletter Drafts

**Configuration:**
1. Add Code node after Schedule Trigger
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const today = days[new Date().getDay()];

return [{ json: { today } }];
```

**Output:** `{ today: "mon" }` (or `wed` or `fri`)

---

### Node 3: Google Sheets - Get Confirmed Subscribers

**Node Type:** `nodes-base.googleSheets`
**Purpose:** Fetch all active subscribers once per execution so each draft can filter in-memory without repeated sheet reads

**Configuration:**
1. Add Google Sheets node after Node 3
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Get Row(s)
   - **Document:** "Newsletter Subscribers"
   - **Sheet:** "Newsletter Subscribers"
   - **Filters:**
     - Filter 1: column `status` equals `confirmed`
   - **Options:**
     - **Return All:** ON

**Output:** All confirmed subscribers with `email`, `programming_languages`, `unsubscribe_token`

---

### Node 4: Google Sheets - Get Scheduled Drafts

**Node Type:** `nodes-base.googleSheets`
**Purpose:** Fetch all Newsletter Drafts rows where status is `scheduled` and `scheduled_day` matches today

**Configuration:**
1. Add Google Sheets node after Code node
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Get Row(s)
   - **Document:** "Newsletter Drafts"
   - **Sheet:** "Newsletter Drafts"
   - **Filters:**
     - Filter 1: column `status` equals `scheduled`
     - Filter 2: column `scheduled_day` equals `{{ $('Code - Get Today\'s Day Abbreviation').first().json.today }}`
   - **Options:**
     - **Return All:** ON

**Output:** 0 to 3 rows (one per language scheduled for today). If 0 rows, the outer loop immediately exits via its done output and the workflow ends cleanly.

---

### Node 5: Loop Over Items - Loop Over Drafts

**Node Type:** `Loop Over Items` (modern replacement for legacy Split In Batches)
**Purpose:** Process one draft at a time through the send pipeline

**Configuration:**
1. Add Loop Over Items node after Google Sheets
2. Configure parameters:
   - **Batch Size:** `1`

**Outputs:**
- **loop** (output 0): Current draft row — connect to Node 6
- **done** (output 1): All drafts processed — workflow ends here

---

### Node 6: Gmail - Get Draft by ID

**Node Type:** `nodes-base.gmail`
**Purpose:** Fetch the full Gmail draft content (HTML body, subject, headers) using the stored `gmail_draft_id`

**Configuration:**
1. Add Gmail node connected to **loop** output of Node 5
2. Configure parameters:
   - **Credential:** Gmail OAuth2
   - **Resource:** Draft
   - **Operation:** Get
   - **Draft ID:** `{{ $json.gmail_draft_id }}`

**Output:** Gmail API draft object containing `message.payload` with base64-encoded body parts and headers

---

### Node 7: Code - Decode Draft HTML & Extract Metadata

**Node Type:** `Code`
**Purpose:** Decode the base64-encoded Gmail draft body to raw HTML, extract the subject line, and carry forward draft metadata needed later in the subscriber loop

**Configuration:**
1. Add Code node after Gmail Get Draft
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const { Buffer } = require('buffer'); // Buffer is not a global in n8n's Code node sandbox

const item = $input.first();
const draftResponse = item.json;

// Carry forward metadata from the outer loop
const draftMeta = $('Loop Over Items - Loop Over Drafts').first().json;
const gmailDraftId = draftMeta.gmail_draft_id;
const issueNumber = draftMeta.issue_number;
const programmingLanguage = draftMeta.programming_language;

// Navigate to message payload
const message = draftResponse.message || draftResponse;
const payload = message.payload || {};
const headers = payload.headers || [];

// Extract subject from headers
const subjectHeader = headers.find(h => h.name && h.name.toLowerCase() === 'subject');
const subject = subjectHeader ? subjectHeader.value : 'Snippet';

// Recursively find HTML part in potentially multipart payload
const findHtmlPart = (parts) => {
  if (!parts) return null;
  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body && part.body.data) {
      return part.body.data;
    }
    if (part.parts) {
      const found = findHtmlPart(part.parts);
      if (found) return found;
    }
  }
  return null;
};

// Handle single-part (body.data) or multipart (parts[])
let rawBase64 = '';
if (payload.body && payload.body.data) {
  rawBase64 = payload.body.data;
} else {
  rawBase64 = findHtmlPart(payload.parts) || '';
}

if (!rawBase64) {
  return [{
    json: {
      decode_success: false,
      decode_error: 'Draft HTML part not found in Gmail payload',
      subject,
      gmail_draft_id: gmailDraftId,
      issue_number: issueNumber,
      programming_language: programmingLanguage
    }
  }];
}

try {
  // Decode base64url → UTF-8 string
  const draftHtml = Buffer.from(
    rawBase64.replace(/-/g, '+').replace(/_/g, '/'),
    'base64'
  ).toString('utf-8');

  if (!draftHtml || draftHtml.trim() === '') {
    return [{
      json: {
        decode_success: false,
        decode_error: 'Draft HTML decoded to empty content',
        subject,
        gmail_draft_id: gmailDraftId,
        issue_number: issueNumber,
        programming_language: programmingLanguage
      }
    }];
  }

  return [{
    json: {
      decode_success: true,
      draftHtml,
      subject,
      gmail_draft_id: gmailDraftId,
      issue_number: issueNumber,
      programming_language: programmingLanguage
    }
  }];
} catch (error) {
  return [{
    json: {
      decode_success: false,
      decode_error: error.message || 'Unknown decode error',
      subject,
      gmail_draft_id: gmailDraftId,
      issue_number: issueNumber,
      programming_language: programmingLanguage
    }
  }];
}
```

**Output:** Either decoded draft payload (`decode_success = true`) or a structured decode failure (`decode_success = false`)

---

### Node 7a: IF - Draft Decode Failed?

**Node Type:** `IF`
**Purpose:** Route decode failures to Send Errors logging and continue with next draft, while successful decodes continue to subscriber filtering

**Configuration:**
1. Add IF node after Node 7
2. Set condition:
   - **Condition 1:**
     - Value 1: `{{ $json.decode_success }}`
     - Operation: `is equal to`
     - Value 2: `false`

**Outputs:**
- **TRUE branch:** Decode failed — connect to Node 7b
- **FALSE branch:** Decode succeeded — connect to Node 8

---

### Node 7b: Google Sheets - Append Decode Error (TRUE branch)

**Node Type:** `nodes-base.googleSheets`
**Purpose:** Log decode failures to Send Errors and continue to the next draft

**Configuration:**
1. Add Google Sheets node to TRUE branch of Node 7a
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Append Row
   - **Document:** "Send Errors"
   - **Sheet:** "Send Errors"
   - **Data Mode:** Define Below

**Column Mapping:**
```
timestamp            → {{ new Date().toISOString() }}
execution_id         → {{ $execution.id }}
issue_number         → {{ $json.issue_number }}
gmail_draft_id       → {{ $json.gmail_draft_id }}
programming_language → {{ $json.programming_language }}
subscriber_email     → (leave empty)
error_type           → draft_decode_failed
error_message        → {{ $json.decode_error }}
resolved             → (leave empty)
```

**Output:** Connect back to Node 5 (Loop Over Items - Loop Over Drafts) to continue with next draft

---

### Node 8: Code - Filter by Language & Random Pick

**Node Type:** `Code`
**Purpose:** Keep only subscribers eligible for the current draft's language. For subscribers with multiple language preferences, randomly select one language per run — if the random pick does not land on this draft's language, the subscriber is excluded (they will be covered by the draft matching their random pick on its scheduled day).

**Configuration:**
1. Add Code node to FALSE branch of Node 7a
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
// Draft metadata from earlier Code node
const draftData = $('Code - Decode Draft HTML & Extract Metadata').first().json;
const draftLang = draftData.programming_language;
const draftHtml = draftData.draftHtml;
const subject = draftData.subject;
const gmailDraftId = draftData.gmail_draft_id;
const issueNumber = draftData.issue_number;

const subscribers = $('Google Sheets - Get Confirmed Subscribers').all();
const eligible = [];

for (const item of subscribers) {
  const langs = (item.json.programming_languages || '')
    .split(',')
    .map(l => l.trim())
    .filter(Boolean);

  // Subscriber did not select this language at all
  if (!langs.includes(draftLang)) continue;

  if (langs.length > 1) {
    // Randomly pick one language for this subscriber this run
    const randomLang = langs[Math.floor(Math.random() * langs.length)];
    if (randomLang !== draftLang) continue;
  }

  eligible.push({
    json: {
      email: item.json.email,
      unsubscribe_token: item.json.unsubscribe_token,
      draftHtml,
      subject,
      gmail_draft_id: gmailDraftId,
      issue_number: issueNumber,
      programming_language: draftLang
    }
  });
}

return eligible;
```

**Output:** One item per eligible subscriber, each carrying the draft HTML and their `unsubscribe_token`. If 0 items, the subscriber loop exits via its done output immediately.

**Note on multi-language subscribers:** A subscriber who selected `Python,JS/TS` has an equal probability of being assigned to either language per run. This ensures they are not double-emailed when both drafts are sent on the same day. Improvement to a deterministic assignment strategy can be made in a later workflow version.

---

### Node 9: Loop Over Items - Loop Over Subscribers

**Node Type:** `Loop Over Items` (modern replacement for legacy Split In Batches)
**Purpose:** Send to one subscriber at a time to allow per-subscriber error handling

**Configuration:**
1. Add Loop Over Items node after Code Filter node
2. Configure parameters:
   - **Batch Size:** `1`

**Outputs:**
- **loop** (output 0): Current subscriber item — connect to Node 10
- **done** (output 1): All subscribers processed — connect to Node 13

---

### Node 10: Code - Inject Unsubscribe Token

**Node Type:** `Code`
**Purpose:** Replace the literal `{{unsubscribe_token}}` placeholder in the draft HTML with the current subscriber's actual token before sending

**Note:** Gmail draft HTML uses `{{unsubscribe_token}}` as a plain string placeholder. This replacement is done here in JavaScript — n8n's expression engine does not process the draft body content.

**Configuration:**
1. Add Code node connected to **loop** output of Node 9
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();
const html = item.json.draftHtml;
const token = item.json.unsubscribe_token || '';

// Replace all occurrences of the placeholder
const personalizedHtml = html.replace(/\{\{unsubscribe_token\}\}/g, token);

return [{
  json: {
    ...item.json,
    personalizedHtml
  }
}];
```

**Output:** All subscriber fields plus `personalizedHtml` with the token injected

---

### Node 11: Gmail - Send Email to Subscriber

**Node Type:** `nodes-base.gmail`
**Purpose:** Send the personalized newsletter email to the subscriber

**Configuration:**
1. Add Gmail node after Code Inject node
2. Configure parameters:
   - **Credential:** Gmail OAuth2
   - **Resource:** Message
   - **Operation:** Send
   - **To:** `{{ $json.email }}`
   - **Subject:** `{{ $json.subject }}`
   - **Email Type:** HTML
   - **Message:** `{{ $json.personalizedHtml }}`
3. Under node **Settings**:
   - **On Error:** Continue (allows the workflow to log the failure and continue to the next subscriber rather than stopping)

**Output:** Gmail send confirmation on success, or error data appended to the item on failure (due to Continue on Error setting)

---

### Node 12: IF - Send Failed?

**Node Type:** `IF`
**Purpose:** Route to error logging if Gmail send failed, or continue loop silently on success

**Configuration:**
1. Add IF node after Gmail Send node
2. Set condition:
   - **Condition 1:**
     - Value 1: `{{ $json.error }}`
     - Operation: `is not empty`

**Outputs:**
- **TRUE branch:** Send failed — connect to Node 12a (error log)
- **FALSE branch:** Send succeeded — explicitly connect back to Node 9 (Loop Over Items - Loop Over Subscribers) to continue

---

### Node 12a: Google Sheets - Append Send Error (TRUE branch)

**Node Type:** `nodes-base.googleSheets`
**Purpose:** Log the failed send to the Send Errors sheet for manual recovery

**Configuration:**
1. Add Google Sheets node to TRUE branch of Node 12
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Append Row
   - **Document:** "Send Errors"
   - **Sheet:** "Send Errors"
   - **Data Mode:** Define Below

**Column Mapping:**
```
timestamp          → {{ new Date().toISOString() }}
execution_id       → {{ $execution.id }}
issue_number       → {{ $json.issue_number }}
gmail_draft_id     → {{ $json.gmail_draft_id }}
programming_language → {{ $json.programming_language }}
subscriber_email   → {{ $json.email }}
error_type         → gmail_send_failed
error_message      → {{ $json.error.message || JSON.stringify($json.error) }}
resolved           → (leave empty)
```

**Output:** Row appended to Send Errors sheet; explicitly connect output back to Node 9 (Loop Over Items - Loop Over Subscribers) to continue

---

### Node 13: Google Sheets - Update Draft Row to Sent

**Node Type:** `nodes-base.googleSheets`
**Purpose:** Mark the draft as sent and record the send timestamp after all subscribers have been processed

**Connected to:** **done** output (output 1) of Node 9 (Loop Over Items - Loop Over Subscribers)

**Configuration:**
1. Add Google Sheets node connected to done output of Node 9
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Update Row
   - **Document:** "Newsletter Drafts"
   - **Sheet:** "Newsletter Drafts"
   - **Column to Match On:** `gmail_draft_id`
   - **Data Mode:** Define Below
3. Under node **Settings**:
   - **On Error:** Continue (required for Node 14 IF check to detect failures — without this, a GSheets failure stops the workflow before Node 14 can route it)

**Column Mapping:**
```
gmail_draft_id  → {{ $('Code - Decode Draft HTML & Extract Metadata').first().json.gmail_draft_id }}
status          → sent
sent_date       → {{ new Date().toISOString() }}
```

**Note:** Only `status` and `sent_date` are updated. All other columns remain unchanged. This update happens once per draft after all subscriber sends complete, regardless of how many individual send errors occurred.

**Output:** Connect to Node 14 (IF - Draft Update Failed?)

---

### Node 14: IF - Draft Update Failed?

**Node Type:** `IF`
**Purpose:** Detect Newsletter Drafts status update failures and log them without stopping the overall run

**Configuration:**
1. Add IF node after Node 13
2. Set condition:
  - **Condition 1:**
    - Value 1: `{{ $json.error }}`
    - Operation: `is not empty`

**Outputs:**
- **TRUE branch:** Update failed — connect to Node 14a
- **FALSE branch:** Update succeeded — connect to Node 5 (Loop Over Items - Loop Over Drafts) to continue next draft

---

### Node 14a: Google Sheets - Append Draft Update Error (TRUE branch)

**Node Type:** `nodes-base.googleSheets`
**Purpose:** Log Newsletter Drafts update failures with `sheet_update_failed` for manual recovery

**Configuration:**
1. Add Google Sheets node to TRUE branch of Node 14
2. Configure parameters:
  - **Credential:** Google OAuth2
  - **Operation:** Append Row
  - **Document:** "Send Errors"
  - **Sheet:** "Send Errors"
  - **Data Mode:** Define Below

**Column Mapping:**
```
timestamp            → {{ new Date().toISOString() }}
execution_id         → {{ $execution.id }}
issue_number         → {{ $('Code - Decode Draft HTML & Extract Metadata').first().json.issue_number }}
gmail_draft_id       → {{ $('Code - Decode Draft HTML & Extract Metadata').first().json.gmail_draft_id }}
programming_language → {{ $('Code - Decode Draft HTML & Extract Metadata').first().json.programming_language }}
subscriber_email     → (leave empty)
error_type           → sheet_update_failed
error_message        → {{ $json.error.message || JSON.stringify($json.error) }}
resolved             → (leave empty)
```

**Output:** Connect back to Node 5 (Loop Over Items - Loop Over Drafts) to continue processing remaining drafts

---

## Workflow Testing

### Test 1: Single Draft, Single Language Subscriber

**Setup:**
1. Newsletter Drafts: one row with `status = "scheduled"`, `scheduled_day = today's abbreviation`, HTML body containing `{{unsubscribe_token}}`
2. Newsletter Subscribers: one confirmed subscriber with `programming_languages` matching the draft's language

**Expected Result:**
- Subscriber receives email with their `unsubscribe_token` injected into the HTML
- Newsletter Drafts row updated: `status = "sent"`, `sent_date` populated
- No rows added to Send Errors

---

### Test 2: No Drafts Scheduled Today

**Setup:**
1. Newsletter Drafts: no rows with `status = "scheduled"` AND `scheduled_day = today`

**Expected Result:**
- Google Sheets returns 0 rows
- Loop Over Items (draft loop) exits immediately via done output
- No emails sent, no sheet updates

---

### Test 3: Multi-Language Subscriber Random Pick

**Setup:**
1. One Python draft and one JS/TS draft both scheduled today
2. One subscriber with `programming_languages = "Python,JS/TS"`

**Expected Result:**
- Subscriber receives exactly one email (either Python or JS/TS, chosen randomly)
- Both draft rows updated to `status = "sent"`

---

### Test 4: Gmail Send Failure

**Setup:**
1. Simulate Gmail send failure (e.g., temporarily revoke Gmail credential mid-run)

**Expected Result:**
- Workflow continues to next subscriber (does not stop)
- Failed subscriber's row appended to Send Errors: `error_type = "gmail_send_failed"`, `resolved` empty
- Draft still marked `status = "sent"` after loop completes
- Successful subscribers receive their email normally

---

### Test 5: Multiple Drafts Scheduled (Full Run)

**Setup:**
1. Three rows in Newsletter Drafts: Python, JS/TS, C/C++ — all `status = "scheduled"`, all `scheduled_day = today`
2. Multiple confirmed subscribers with varying language preferences

**Expected Result:**
- All three drafts processed sequentially
- Each subscriber receives at most one email per draft that matches their language (multi-language subscribers random-picked)
- All three Newsletter Drafts rows updated to `status = "sent"` with `sent_date`

---

## Error Handling

**Gmail Send Failure:**
- Node 11 has Continue on Error enabled — workflow never stops mid-batch due to a send failure
- Node 12 IF routes failed items to Send Errors sheet
- Draft is still marked sent after the batch completes

**Google Sheets Read Failure (Nodes 3 or 4):**
- If either read fails, the workflow stops at that node
- No emails sent, no sheet updates
- n8n "Executions" tab shows the failure node for investigation

**Draft Decode Failure (Node 7):**
- IF node (7a) detects `decode_success = false`
- Decode failure is appended to Send Errors with `error_type = "draft_decode_failed"`
- Workflow continues to next draft without stopping the full run

**Google Sheets Update Failure (Node 13):**
- If the draft status update fails, the draft remains `status = "scheduled"`
- The workflow will re-process this draft on the next matching send day, causing duplicate sends
- Node 14 routes failed updates to Send Errors with `error_type = "sheet_update_failed"`
- Workflow continues to next draft after logging

**Draft HTML Missing Placeholder:**
- If `{{unsubscribe_token}}` is absent from the draft HTML, `personalizedHtml` will be identical to the draft HTML (no replacement occurs)
- Email is still sent, but the unsubscribe link will be broken
- Always verify draft HTML contains the placeholder before scheduling

---

## Workflow Activation

1. Save workflow
2. Click "Activate" toggle
3. Verify cron expression in n8n: `0 7 * * 1,3,5`
4. Test manually with a single scheduled draft before the first live run
5. Monitor "Executions" tab after each Mon/Wed/Fri 7am run
6. Check Send Errors sheet after each run for any `resolved` = empty rows

---

## Gmail Draft Placeholder Convention

The HTML body of every Gmail draft created by Workflow 1 must include the unsubscribe footer with the exact placeholder string:

```html
<a href="https://iris-codes.com/snippet/unsubscribe?token={{unsubscribe_token}}" style="color: #0969da; text-decoration: none;">Unsubscribe</a>
```

Node 10 (Code - Inject Unsubscribe Token) replaces `{{unsubscribe_token}}` with the subscriber's actual `unsubscribe_token` value before sending. If the placeholder is missing or misspelled, the unsubscribe link will not be personalized.
