# n8n Workflow: Send Newsletter (Simplified)

**Workflow Name:** Newsletter Send (Simplified)
**Trigger Type:** Schedule (Cron)
**Purpose:** On Mon/Wed/Fri at 7am, read today’s scheduled drafts and confirmed subscribers, build a safe one-email-per-subscriber send queue in JavaScript, send emails directly (no loop nodes), then mark today’s drafts as sent.

## Core Design Decision

This version uses **no `Loop Over Items` and no `Split In Batches`**.

Why this works:
- n8n already executes most nodes once per incoming item automatically
- We use one **Code (Run Once for All Items)** node to build the final send queue
- Gmail Send then processes that queue item-by-item automatically

---

## Prerequisites

- Google Sheets: "Newsletter Drafts" (`../schema/google-sheets-drafts-schema.md`)
- Google Sheets: "Newsletter Subscribers" (`../schema/google-sheets-subscribers-schema.md`)
- Google Sheets: "Send Errors" (`../schema/google-sheets-send-errors-schema.md`)
- Google OAuth2 credentials in n8n
- Gmail OAuth2 credentials in n8n
- Gmail draft HTML contains literal placeholder: `UNSUBSCRIBE_TOKEN`

---

## Workflow Overview

```text
Schedule Trigger (Mon/Wed/Fri 7:00)
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
  - reads all normalized drafts
  - reads all confirmed subscribers
  - matches by language
  - randomly picks one eligible draft per subscriber (exactly 1/day)
  - injects unsubscribe token
  - outputs send items (count = subscribers to email)
            ↓
Gmail: Send Email (auto per send item, Continue On Error)
            ↓
Code: Build Failed-Send Rows (Run Once for All Items)
            ↓
IF: Any Failed Sends?
  ├─ TRUE  → Google Sheets: Append Send Errors (gmail_send_failed)
  └─ FALSE → (skip)
            ↓
Code: Build Draft Update Rows (Run Once for All Items)
  - unique drafts used today
  - status=sent, sent_date=now
            ↓
Google Sheets: Update Draft Rows to Sent (auto per draft item, Continue On Error)
            ↓
Code: Build Sheet-Update Failure Rows (Run Once for All Items)
            ↓
IF: Any Sheet Update Failures?
  ├─ TRUE  → Google Sheets: Append Send Errors (sheet_update_failed)
  └─ FALSE → End
```

---

## Node-by-Node Configuration

### Node 1: Schedule Trigger

**Node Type:** `Schedule Trigger`
**Purpose:** Fire on Mon/Wed/Fri at 7am (EST already configured in your instance)

**Configuration:**
- Trigger Rule: Cron
- Expression: `0 7 * * 1,3,5`

---

### Node 2: Code - Get Today Key

**Node Type:** `Code`
**Mode:** Run Once for All Items
**Purpose:** Produce day key used by draft filter

```javascript
const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const today = days[new Date().getDay()];
return [{ json: { today, run_ts: new Date().toISOString() } }];
```

---

### Node 3: Google Sheets - Get Confirmed Subscribers

**Node Type:** `Google Sheets`
**Purpose:** Read all active subscribers once

**Configuration:**
- Operation: Get Row(s)
- Document: Newsletter Subscribers
- Sheet: Newsletter Subscribers
- Filter: `status = confirmed`
- Return All: ON

**Output fields used:** `email`, `programming_languages`, `unsubscribe_token`

---

### Node 4: Google Sheets - Get Scheduled Drafts

**Node Type:** `Google Sheets`
**Purpose:** Read drafts scheduled for today

**Configuration:**
- Operation: Get Row(s)
- Document: Newsletter Drafts
- Sheet: Newsletter Drafts
- Filters:
  - `status = scheduled`
  - `scheduled_day = {{ $('Code - Get Today Key').first().json.today }}`
- Return All: ON

**Output fields used:** `issue_number`, `gmail_draft_id`, `programming_language`

---

### Node 5: Gmail - Get Draft by ID

**Node Type:** `Gmail`
**Purpose:** Fetch draft body + subject for each scheduled draft item

**Configuration:**
- Resource: Draft
- Operation: Get
- Draft ID: `{{ $json.gmail_draft_id }}`

---

### Node 6: Code - Normalize Draft Content

**Node Type:** `Code`
**Mode:** Run Once for Each Item
**Purpose:** Normalize Gmail output to one clean draft object per item

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
const subject = inItem.subject || 'Snippet';

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

---

### Node 7: Code - Build Send Queue (One Email Per Subscriber)

**Node Type:** `Code`
**Mode:** Run Once for All Items
**Purpose:** Build final safe send items with exactly one draft per subscriber for this day

**Inputs read inside node:**
- all draft items from Node 6
- all subscribers from Node 3

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

  // Exactly one email per subscriber per day
  const selectedDraft = eligibleDrafts[Math.floor(Math.random() * eligibleDrafts.length)];

  const personalizedHtml = (selectedDraft.draftHtml || '').replace(
    /UNSUBSCRIBE_TOKEN/g,
    sub.unsubscribe_token || ''
  );

  sendItems.push({
    json: {
      subscriber_email: sub.email,
      unsubscribe_token: sub.unsubscribe_token || '',
      issue_number: selectedDraft.issue_number,
      gmail_draft_id: selectedDraft.gmail_draft_id,
      programming_language: selectedDraft.programming_language,
      subject: selectedDraft.subject,
      personalizedHtml
    }
  });
}

return sendItems;
```

**Result:** Output count equals number of subscribers selected for today’s send.

---

### Node 8: Gmail - Send Email

**Node Type:** `Gmail`
**Purpose:** Send one email per item from Node 7 (automatic per-item execution)

**Configuration:**
- Resource: Message
- Operation: Send
- To: `{{ $json.subscriber_email }}`
- Subject: `{{ $json.subject }}`
- Email Type: HTML
- Message: `{{ $json.personalizedHtml }}`
- Settings → On Error: Continue

---

### Node 9: Code - Build Failed-Send Rows

**Node Type:** `Code`
**Mode:** Run Once for All Items
**Purpose:** Convert failed Gmail send items into rows for Send Errors

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

---

### Node 10: IF - Any Failed Sends?

**Node Type:** `IF`
**Purpose:** Only append rows if there are failures

**Configuration:**
- Condition: `{{ $items().length > 0 }}` is true

---

### Node 11: Google Sheets - Append Send Errors (gmail_send_failed)

**Node Type:** `Google Sheets`
**Purpose:** Persist per-subscriber send failures

**Configuration:**
- Operation: Append Row
- Document: Send Errors
- Sheet: Send Errors
- Data Mode: Auto-map input fields

---

### Node 12: Code - Build Draft Update Rows

**Node Type:** `Code`
**Mode:** Run Once for All Items
**Purpose:** Create unique update items for all valid drafts that were in today’s run

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

---

### Node 13: Google Sheets - Update Draft Rows to Sent

**Node Type:** `Google Sheets`
**Purpose:** Mark each today-draft as sent once batch completes

**Configuration:**
- Operation: Update Row
- Document: Newsletter Drafts
- Sheet: Newsletter Drafts
- Column to Match On: `gmail_draft_id`
- Mapping:
  - `gmail_draft_id` ← input
  - `status` ← `sent`
  - `sent_date` ← input
- Settings → On Error: Continue

---

### Node 14: Code - Build Sheet-Update Failure Rows

**Node Type:** `Code`
**Mode:** Run Once for All Items
**Purpose:** Convert draft update failures into Send Errors rows

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

---

### Node 15: IF - Any Sheet Update Failures?

**Node Type:** `IF`
**Purpose:** Only append update failures if any exist

**Configuration:**
- Condition: `{{ $items().length > 0 }}` is true

---

### Node 16: Google Sheets - Append Send Errors (sheet_update_failed)

**Node Type:** `Google Sheets`
**Purpose:** Persist sheet-update failures for manual recovery

**Configuration:**
- Operation: Append Row
- Document: Send Errors
- Sheet: Send Errors
- Data Mode: Auto-map input fields

---

## Critical Guarantees

- No loop nodes are used.
- Exactly one email per subscriber per day is enforced in Node 7.
- Item count into Gmail Send equals send count.
- Failures are logged without stopping the whole run.

---

## Quick Validation Checklist

1. Node 7 output count equals expected daily recipients.
2. Node 8 execution shows one send attempt per Node 7 item.
3. No subscriber appears more than once in Node 7 output.
4. Newsletter Drafts rows for today become `sent` with `sent_date`.
5. Send Errors contains only real failures.
