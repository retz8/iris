# n8n Workflow: Send Newsletter

**Workflow Name:** Newsletter Send
**Trigger Type:** Schedule (Cron)
**Purpose:** On Mon/Wed/Fri at 7am EST, read today's scheduled drafts and confirmed subscribers, build a one-email-per-subscriber send queue in a Code node, send directly via Gmail (no loop nodes), and mark drafts as sent.

## Prerequisites

- Google Sheets spreadsheet: "Newsletter Drafts" (see `../schema/google-sheets-drafts-schema.md`)
- Google Sheets spreadsheet: "Newsletter Subscribers" (see `../schema/google-sheets-subscribers-schema.md`)
- Google Sheets spreadsheet: "Send Errors" (see `../schema/google-sheets-send-errors-schema.md`)
- Google OAuth2 credentials configured in n8n
- Gmail OAuth2 credentials configured in n8n
- Gmail draft HTML contains the literal placeholder `UNSUBSCRIBE_TOKEN` (replaced per subscriber by Code node)
- n8n instance timezone set to `America/New_York`

## Workflow Overview

```text
Schedule Trigger (Mon/Wed/Fri 7:00 EST)
  ↓
Code: Get Today Key (mon|wed|fri)
  ├─→ Google Sheets: Get Confirmed Subscribers
  └─→ Google Sheets: Get Scheduled Drafts for Today
            ↓
         Gmail: Get Draft by ID (auto per draft item)
            ↓
         Code: Normalize Draft Content (auto per draft item)
            ↓
Code: Build Send Queue (Run Once for All Items)
  - reads all normalized drafts + all confirmed subscribers
  - matches by programming language
  - sends one email per eligible language per subscriber
  - injects UNSUBSCRIBE_TOKEN per subscriber
  - outputs one send item per subscriber
            ↓
Gmail: Send Email (auto per send item, Continue on Error)
            ↓
Code: Build Failed-Send Rows (Run Once for All Items)
            ↓
IF: Any Failed Sends?
  ├─ TRUE  → Google Sheets: Append Send Errors (gmail_send_failed)
  └─ FALSE → (skip)
            ↓
Code: Build Draft Update Rows (Run Once for All Items)
  - deduplicates drafts, sets status=sent, sent_date=now
            ↓
Google Sheets: Update Draft Rows to Sent (auto per draft item, Continue on Error)
            ↓
Code: Build Sheet-Update Failure Rows (Run Once for All Items)
            ↓
IF: Any Sheet Update Failures?
  ├─ TRUE  → Google Sheets: Append Send Errors (sheet_update_failed)
  └─ FALSE → End
```

**Design note:** No `Loop Over Items` or `Split In Batches` nodes are used. n8n executes most nodes once per incoming item automatically. Node 7 (Build Send Queue) runs once for all items and outputs one item per subscriber — Gmail Send then processes each item automatically.

## Node-by-Node Configuration

### Node 1: Schedule Trigger

**Node Type:** `Schedule Trigger`
**Purpose:** Fire on Mon/Wed/Fri at 7am EST

**Configuration:**
1. Add Schedule Trigger node to canvas
2. Configure parameters:
   - **Trigger Rule:** Cron
   - **Expression:** `0 7 * * 1,3,5`

---

### Node 2: Code - Get Today Key

**Node Type:** `Code`
**Purpose:** Produce the day key (`mon`, `wed`, or `fri`) used by the draft filter downstream

**Configuration:**
1. Add Code node after Node 1
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript
3. JavaScript code:

```javascript
const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const today = days[new Date().getDay()];
return [{ json: { today, run_ts: new Date().toISOString() } }];
```

**Output:** `{ today: "mon" | "wed" | "fri", run_ts: "<ISO timestamp>" }`

---

### Node 3: Google Sheets - Get Confirmed Subscribers

**Node Type:** `Google Sheets`
**Purpose:** Read all active confirmed subscribers once

**Configuration:**
1. Add Google Sheets node after Node 2
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Get Row(s)
   - **Document:** Newsletter Subscribers
   - **Sheet:** Newsletter Subscribers
   - **Filters:** `status` equals `confirmed`
   - **Options → Return All:** ON

**Output fields used:** `email`, `programming_languages`, `unsubscribe_token`

---

### Node 4: Google Sheets - Get Scheduled Drafts

**Node Type:** `Google Sheets`
**Purpose:** Read all drafts scheduled for today

**Configuration:**
1. Add Google Sheets node after Node 2 (parallel branch alongside Node 3)
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Get Row(s)
   - **Document:** Newsletter Drafts
   - **Sheet:** Newsletter Drafts
   - **Filters:**
     - `status` equals `scheduled`
     - `scheduled_day` equals `{{ $('Code - Get Today Key').first().json.today }}`
   - **Options → Return All:** ON

**Output fields used:** `issue_number`, `gmail_draft_id`, `programming_language`

---

### Node 5: Gmail - Get Draft by ID

**Node Type:** `Gmail`
**Purpose:** Fetch the HTML body and subject for each scheduled draft item (executes once per item from Node 4 automatically)

**Configuration:**
1. Add Gmail node after Node 4
2. Configure parameters:
   - **Credential:** Gmail OAuth2
   - **Resource:** Draft
   - **Operation:** Get
   - **Draft ID:** `{{ $json.gmail_draft_id }}`

---

### Node 6: Code - Normalize Draft Content

**Node Type:** `Code`
**Purpose:** Normalize Gmail API output into one clean draft object per item, matching back to the sheet row by `gmail_draft_id`

**Configuration:**
1. Add Code node after Node 5
2. Set parameters:
   - **Mode:** Run Once for Each Item
   - **Language:** JavaScript
3. JavaScript code:

```javascript
const inItem = $json;

const scheduledDrafts = $('Google Sheets - Get Scheduled Drafts').all().map(i => i.json);

const responseDraftId =
  inItem.id ||
  inItem.draftId ||
  inItem.draft_id ||
  inItem.gmail_draft_id ||
  inItem.message?.id ||
  '';

const matchedDraft = scheduledDrafts.find(d => d.gmail_draft_id === responseDraftId) || {};

const draftMeta = {
  issue_number: matchedDraft.issue_number ?? null,
  gmail_draft_id: matchedDraft.gmail_draft_id || responseDraftId,
  programming_language: matchedDraft.programming_language || null,
};

const html = inItem.html || '';

// Strip internal "#[N] [LANG]:" prefix — subscriber sees "Can you read this: {file_intent}"
const rawSubject = inItem.subject || 'Snippet';
const subjectPrefixMatch = rawSubject.match(/Can you read this #\d+ [^:]+:\s*(.+)/);
const subject = subjectPrefixMatch
  ? `Can you read this: ${subjectPrefixMatch[1].trim()}`
  : rawSubject;

if (!html) {
  return {
    json: {
      ...draftMeta,
      decode_success: false,
      decode_error: 'No HTML body found in Gmail draft'
    }
  };
}

return {
  json: {
    ...draftMeta,
    decode_success: true,
    subject,
    draftHtml: html
  }
};
```

**Output:** One item per draft with `decode_success`, `subject`, `draftHtml`, and draft metadata fields

---

### Node 7: Code - Build Send Queue

**Node Type:** `Code`
**Purpose:** Combine all normalized drafts and all confirmed subscribers into one send item per subscriber

**Note:** This node reads from both Node 6 (draft items) and Node 3 (subscriber items) using named-node references. It must be connected to Node 6 as its direct input.

**Configuration:**
1. Add Code node after Node 6
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript
3. JavaScript code:

```javascript
const draftsAll = $('Code - Normalize Draft Content').all().map(i => i.json);
const subscribers = $('Google Sheets - Get Confirmed Subscribers').all().map(i => i.json);

const validDrafts = draftsAll.filter(d => d.decode_success);

const sendItems = [];

for (const sub of subscribers) {
  const langs = (sub.programming_languages || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  const eligibleDrafts = validDrafts.filter(d => langs.includes(d.programming_language));
  if (eligibleDrafts.length === 0) continue;

  // One email per eligible language — subscriber may receive multiple emails per day
  for (const draft of eligibleDrafts) {
    const personalizedHtml = (draft.draftHtml || '').replace(
      /UNSUBSCRIBE_TOKEN/g,
      sub.unsubscribe_token || ''
    );

    sendItems.push({
      json: {
        subscriber_email: sub.email,
        unsubscribe_token: sub.unsubscribe_token || '',
        issue_number: draft.issue_number,
        gmail_draft_id: draft.gmail_draft_id,
        programming_language: draft.programming_language,
        subject: draft.subject,
        personalizedHtml
      }
    });
  }
}

return sendItems;
```

**Output:** One item per (subscriber × eligible language) pair. A subscriber with multiple selected languages receives one email per language that has a draft scheduled today.

---

### Node 8: Gmail - Send Email

**Node Type:** `Gmail`
**Purpose:** Send one personalized email per item from Node 7 (executes once per item automatically)

**Configuration:**
1. Add Gmail node after Node 7
2. Configure parameters:
   - **Credential:** Gmail OAuth2
   - **Resource:** Message
   - **Operation:** Send
   - **To:** `{{ $json.subscriber_email }}`
   - **Subject:** `{{ $json.subject }}`
   - **Email Type:** HTML
   - **Message:** `{{ $json.personalizedHtml }}`
   - **Settings → On Error:** Continue

---

### Node 9: Code - Build Failed-Send Rows

**Node Type:** `Code`
**Purpose:** Convert failed Gmail send items and draft decode failures into Send Errors sheet rows

**Configuration:**
1. Add Code node after Node 8
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript
3. JavaScript code:

```javascript
const sentResults = $('Gmail - Send Email').all().map(i => i.json);
const draftResults = $('Code - Normalize Draft Content').all().map(i => i.json);

const failedRows = sentResults
  .filter(r => !!r.error)
  .map(r => ({
    json: {
      timestamp: new Date().toISOString(),
      execution_id: $execution.id,
      issue_number: r.issue_number,
      gmail_draft_id: r.gmail_draft_id,
      programming_language: r.programming_language,
      subscriber_email: r.subscriber_email,
      error_type: 'gmail_send_failed',
      error_message: r.error?.message || JSON.stringify(r.error),
      resolved: ''
    }
  }));

const decodeFailureRows = draftResults
  .filter(d => !d.decode_success)
  .map(d => ({
    json: {
      timestamp: new Date().toISOString(),
      execution_id: $execution.id,
      issue_number: d.issue_number,
      gmail_draft_id: d.gmail_draft_id,
      programming_language: d.programming_language,
      subscriber_email: '',
      error_type: 'draft_decode_failed',
      error_message: d.decode_error || 'Unknown draft decode failure',
      resolved: ''
    }
  }));

return [...failedRows, ...decodeFailureRows];
```

**Output:** Zero or more Send Errors rows

---

### Node 10: IF - Any Failed Sends?

**Node Type:** `IF`
**Purpose:** Only route to the Append node if there are failure rows to write

**Configuration:**
1. Add IF node after Node 9
2. Set condition:
   - **Value 1:** `{{ $input.all().length }}`
   - **Operation:** Greater than
   - **Value 2:** `0`

**Outputs:**
- **TRUE branch:** Failure rows exist → append to Send Errors sheet
- **FALSE branch:** No failures → skip append

---

### Node 11: Google Sheets - Append Send Errors (gmail_send_failed)

**Node Type:** `Google Sheets`
**Purpose:** Persist per-subscriber send failures and draft decode failures for manual review

**Configuration:**
1. Add Google Sheets node to TRUE branch of Node 10
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Append Row
   - **Document:** Send Errors
   - **Sheet:** Send Errors
   - **Data Mode:** Auto-map input fields

---

### Node 12: Code - Build Draft Update Rows

**Node Type:** `Code`
**Purpose:** Produce one update item per unique valid draft used in today's send, deduplicating by `gmail_draft_id`

**Note:** Connect this node after the IF in Node 10 so it runs after both TRUE and FALSE branches resolve.

**Configuration:**
1. Add Code node after Node 10
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript
3. JavaScript code:

```javascript
const draftsAll = $('Code - Normalize Draft Content').all().map(i => i.json);
const now = new Date().toISOString();

const unique = new Map();
for (const d of draftsAll) {
  if (!d.decode_success) continue;
  unique.set(d.gmail_draft_id, {
    json: {
      gmail_draft_id: d.gmail_draft_id,
      status: 'sent',
      sent_date: now,
      issue_number: d.issue_number,
      programming_language: d.programming_language
    }
  });
}

return [...unique.values()];
```

**Output:** One item per unique draft that ran today

---

### Node 13: Google Sheets - Update Draft Rows to Sent

**Node Type:** `Google Sheets`
**Purpose:** Mark each today-draft as sent in the Newsletter Drafts sheet (executes once per item from Node 12 automatically)

**Configuration:**
1. Add Google Sheets node after Node 12
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Update Row
   - **Document:** Newsletter Drafts
   - **Sheet:** Newsletter Drafts
   - **Column to Match On:** `gmail_draft_id`
   - **Columns to update:**
     - `status` → `sent`
     - `sent_date` → `{{ $json.sent_date }}`
   - **Settings → On Error:** Continue

---

### Node 14: Code - Build Sheet-Update Failure Rows

**Node Type:** `Code`
**Purpose:** Convert draft sheet update failures into Send Errors rows for manual recovery

**Configuration:**
1. Add Code node after Node 13
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript
3. JavaScript code:

```javascript
const updateResults = $('Google Sheets - Update Draft Rows to Sent').all().map(i => i.json);

const rows = updateResults
  .filter(r => !!r.error)
  .map(r => ({
    json: {
      timestamp: new Date().toISOString(),
      execution_id: $execution.id,
      issue_number: r.issue_number,
      gmail_draft_id: r.gmail_draft_id,
      programming_language: r.programming_language,
      subscriber_email: '',
      error_type: 'sheet_update_failed',
      error_message: r.error?.message || JSON.stringify(r.error),
      resolved: ''
    }
  }));

return rows;
```

**Output:** Zero or more Send Errors rows

---

### Node 15: IF - Any Sheet Update Failures?

**Node Type:** `IF`
**Purpose:** Only append update failures if any exist

**Configuration:**
1. Add IF node after Node 14
2. Set condition:
   - **Value 1:** `{{ $input.all().length }}`
   - **Operation:** Greater than
   - **Value 2:** `0`

**Outputs:**
- **TRUE branch:** Sheet update failures exist → append to Send Errors
- **FALSE branch:** No failures → end

---

### Node 16: Google Sheets - Append Send Errors (sheet_update_failed)

**Node Type:** `Google Sheets`
**Purpose:** Persist sheet-update failures for manual recovery

**Configuration:**
1. Add Google Sheets node to TRUE branch of Node 15
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Append Row
   - **Document:** Send Errors
   - **Sheet:** Send Errors
   - **Data Mode:** Auto-map input fields

---

## Error Handling

- Gmail send failures are captured per subscriber with **Continue on Error** — a failed send for one subscriber does not stop the rest of the run. Check Send Errors for `error_type: gmail_send_failed`.
- Draft decode failures (no HTML body in Gmail response) are logged in Send Errors with `error_type: draft_decode_failed`. The affected draft's subscribers receive no email for that run.
- Sheet update failures are captured per draft with **Continue on Error**. Check Send Errors for `error_type: sheet_update_failed` and manually update the affected draft rows to `status=sent`.
- A subscriber receives one email per language they have selected that has a draft scheduled today — multiple emails per day is expected and intentional.

## Workflow Testing

1. Set one draft row in Newsletter Drafts to `status=scheduled` with today's `scheduled_day` value and a valid `gmail_draft_id`.
2. Confirm at least one subscriber row has `status=confirmed` with a `programming_language` matching the draft.
3. Trigger the workflow manually.
4. Verify Node 7 output count equals the number of eligible subscribers.
5. Verify Node 8 shows one send attempt per Node 7 item.
6. Verify no subscriber email appears more than once in Node 7 output.
7. Verify the draft row in Newsletter Drafts is updated to `status=sent` with a `sent_date`.
8. Verify Send Errors is empty (or contains only expected failures).
