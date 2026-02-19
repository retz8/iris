# n8n Workflow: Gmail Drafts to Newsletter Drafts Sheet

**Workflow Name:** Gmail Drafts to Sheets
**Trigger Type:** Manual
**Purpose:** Fetch manually-written Gmail drafts matching the newsletter subject pattern and append one row per draft to the Newsletter Drafts Google Sheet, skipping any draft already present.

## Prerequisites

- Google Sheets spreadsheet: "Newsletter Drafts" (see `snippet/n8n-workflows/google-sheets-drafts-schema.md`)
- Google OAuth2 credentials configured in n8n
- Gmail OAuth2 credentials configured in n8n
- n8n instance accessible at retz8.app.n8n.cloud
- Gmail drafts written following the format in `snippet/n8n-workflows/manual-content-generation.md`

## Workflow Overview

```
Form Trigger (human enters issue_number, e.g. 42)
    ↓
Gmail: Get Drafts
(q: subject:"Can you read this #{{ issue_number }}")
    ↓
Code: Validate Draft Count
(throws error and halts if count ≠ 3)
    ↓
Google Sheets: Get Row(s)
(filter: gmail_draft_id = {{ $json.id }} — runs once per draft)
    ↓
IF: Row returned? (duplicate check)
    ├─ TRUE  → (end — draft already in sheet, skip)
    └─ FALSE → Code: Parse Draft
                    ↓
               Google Sheets: Append Row
```

## Node-by-Node Configuration

### Node 1: Form Trigger

**Node Type:** `Form Trigger`
**Purpose:** Present a form to the human before the workflow runs. The human enters the issue number for the current week's drafts (e.g. `42`). This scopes the Gmail search to only that issue's 3 drafts rather than all newsletter drafts ever written.

**Configuration:**
1. Add Form Trigger node to canvas
2. Configure parameters:
   - **Form Title:** `Gmail Drafts to Sheets`
   - **Form Description:** `Enter the issue number for this week's drafts.`
   - **Form Fields:**
     - **Field 1:**
       - **Field Label:** `Issue Number`
       - **Field Type:** Number
       - **Required:** ON
3. Set **Response Mode:** `On form submission`

**Output:** `{ "Issue Number": 42 }` (field name matches the label)

**Trigger URL:** Provided by n8n after saving — open this URL in the browser each Sunday to launch the form.

---

### Node 2: Gmail - Get Drafts

**Node Type:** `Gmail`
**Purpose:** Fetch all Gmail drafts for the specified issue number. Scoped to exactly the 3 drafts for that issue.

**Configuration:**
1. Add Gmail node after Form Trigger
2. Configure parameters:
   - **Credential:** Gmail OAuth2
   - **Resource:** Draft
   - **Operation:** Get Many
   - **Return All:** ON
   - **Filters > Query (q):** `subject:"Can you read this #{{ $json['Issue Number'] }}"`

**Output:** One item per matching draft. Each item contains:
- `id` — the draft ID (e.g. `r-9182736450198273`), used as `gmail_draft_id`
- `message.payload.headers` — array of `{name, value}` pairs; contains `Subject`
- `message.payload.body.data` — base64url-encoded body for simple messages
- `message.payload.parts` — array of MIME parts for multipart messages; `text/html` part holds the email body
- `message.internalDate` — milliseconds-since-epoch string; used as `created_date`

---

### Node 3: Code - Validate Draft Count

**Node Type:** `Code`
**Purpose:** Confirm exactly 3 drafts were returned for the given issue number. If the count is anything other than 3, throw an error to halt the workflow before touching the sheet. This catches missing drafts (e.g. one was not saved) or subject line typos before any writes happen.

**Configuration:**
1. Add Code node after Gmail node
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const drafts = $input.all();
const issueNumber = $('Form Trigger').first().json['Issue Number'];

if (drafts.length !== 3) {
  throw new Error(
    `Expected 3 drafts for issue #${issueNumber}, found ${drafts.length}. ` +
    `Check Gmail and ensure all 3 drafts have the correct subject format.`
  );
}

return drafts;
```

**Output:** Passes all 3 items through unchanged if count is exactly 3. Throws and halts otherwise.

---

### Node 4: Google Sheets - Get Row(s) by Draft ID

**Node Type:** `Google Sheets`
**Purpose:** Check whether the current draft is already in the sheet. Runs once per draft item.

**Configuration:**
1. Add Google Sheets node after Code - Validate Draft Count
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Get Many Rows
   - **Document:** "Newsletter Drafts"
   - **Sheet:** "Newsletter Drafts"
   - **Filters:**
     - Add filter: column `gmail_draft_id` equals `{{ $json.id }}`
   - **Return All:** OFF (first match is enough — IDs are unique)
   - **RAW Data:** OFF

**Output:** 0 rows (draft not in sheet) or 1 row (already present). The IF node uses this to decide whether to proceed.

---

### Node 5: IF - Duplicate Check

**Node Type:** `IF`
**Purpose:** Skip drafts already in the sheet; proceed only with new ones.

**Configuration:**
1. Add IF node after Google Sheets node
2. Set condition:
   - **Value 1:** `{{ $json.gmail_draft_id }}`
   - **Operation:** `Is Empty`

**Outputs:**
- **TRUE branch:** No row returned — draft is new, proceed to parse
- **FALSE branch:** Row returned — draft already in sheet, end branch (no further nodes)

---

### Node 6: Code - Parse Draft

**Node Type:** `Code`
**Purpose:** Parse `issue_number`, `file_intent`, repository fields, and `created_date` from the current draft. Runs once per new draft item.

**Configuration:**
1. Add Code node to TRUE branch of IF - Duplicate Check node
2. Set parameters:
   - **Mode:** Run Once for Each Item
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const draft = $('Gmail - Get Drafts').item.json;

// Extract subject from message headers
const headers = draft.message?.payload?.headers || [];
const subjectHeader = headers.find(h => h.name === 'Subject');
const subject = subjectHeader?.value || '';

// Parse issue_number and file_intent
// Subject format: "Can you read this #42: Bash command validation hook"
const subjectMatch = subject.match(/Can you read this #(\d+):\s*(.+)/);
if (!subjectMatch) {
  throw new Error(`Unexpected subject format: "${subject}"`);
}

const issueNumber = parseInt(subjectMatch[1], 10);
const fileIntent = subjectMatch[2].trim();

// Decode HTML body (may be in body.data or inside parts)
let htmlBody = '';
const payload = draft.message?.payload;

if (payload?.body?.data) {
  htmlBody = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
} else if (payload?.parts) {
  const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
  if (htmlPart?.body?.data) {
    htmlBody = Buffer.from(htmlPart.body.data, 'base64url').toString('utf-8');
  }
}

// Parse repository_url and repository_name from Project Context section
// HTML pattern: From <a href="https://github.com/owner/repo">owner/repo</a>
const repoMatch = htmlBody.match(
  /From\s+<a[^>]+href="(https:\/\/github\.com\/([^"]+))"[^>]*>[^<]+<\/a>/
);
const repositoryUrl = repoMatch ? repoMatch[1] : '';
const repositoryName = repoMatch ? repoMatch[2] : ''; // "owner/repo"

// Parse repository_description: text after the file_path anchor
// HTML pattern: ...file_path</a>. description text</p>
const descMatch = htmlBody.match(
  /href="https:\/\/github\.com\/[^"]+\/blob\/[^"]+">([^<]+)<\/a>\.\s*([^<]+)/
);
const repositoryDescription = descMatch ? descMatch[2].trim() : '';

// created_date from internalDate (ms since epoch as string)
const internalDate = draft.message?.internalDate;
const createdDate = internalDate
  ? new Date(parseInt(internalDate, 10)).toISOString()
  : new Date().toISOString();

return {
  json: {
    issue_number: issueNumber,
    status: 'draft',
    gmail_draft_id: draft.id,
    file_intent: fileIntent,
    repository_name: repositoryName,
    repository_url: repositoryUrl,
    repository_description: repositoryDescription,
    programming_language: '',
    source: 'manual',
    created_date: createdDate,
    scheduled_day: '',
    sent_date: ''
  }
};
```

**Output:** One item with all sheet columns populated.

**Parsing logic summary:**

| Sheet Column | Source | Method |
|---|---|---|
| `issue_number` | Subject line | Regex `#(\d+)` |
| `file_intent` | Subject line | Regex after `: ` |
| `gmail_draft_id` | Gmail API | `draft.id` |
| `repository_url` | HTML body | First GitHub href in Project Context |
| `repository_name` | HTML body | Path portion of GitHub URL (`owner/repo`) |
| `repository_description` | HTML body | Text after file_path anchor |
| `created_date` | Gmail API | `message.internalDate` → ISO 8601 |
| `status` | Hardcoded | `"draft"` |
| `source` | Hardcoded | `"manual"` |
| `programming_language` | — | Left blank (human fills during Sunday review) |
| `scheduled_day` | — | Left blank (human fills during Sunday review) |
| `sent_date` | — | Left blank (Workflow 2 fills after sending) |

---

### Node 7: Google Sheets - Append Row

**Node Type:** `Google Sheets`
**Purpose:** Append the parsed draft as a new row in the Newsletter Drafts sheet.

**Configuration:**
1. Add Google Sheets node after Code node
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Append Row
   - **Document:** "Newsletter Drafts"
   - **Sheet:** "Newsletter Drafts"
   - **Data Mode:** Map Each Column Manually

**Column Mapping:**

| Sheet Column | Value |
|---|---|
| `issue_number` | `{{ $json.issue_number }}` |
| `status` | `{{ $json.status }}` |
| `gmail_draft_id` | `{{ $json.gmail_draft_id }}` |
| `file_intent` | `{{ $json.file_intent }}` |
| `repository_name` | `{{ $json.repository_name }}` |
| `repository_url` | `{{ $json.repository_url }}` |
| `repository_description` | `{{ $json.repository_description }}` |
| `programming_language` | `{{ $json.programming_language }}` |
| `source` | `{{ $json.source }}` |
| `created_date` | `{{ $json.created_date }}` |
| `scheduled_day` | `{{ $json.scheduled_day }}` |
| `sent_date` | `{{ $json.sent_date }}` |

---

## Edge Cases

**Wrong number of drafts found (not 3):**
Node 3 throws an error and halts the entire workflow before any sheet writes. The error message states the issue number and actual count found. Human should check Gmail drafts, correct the subject lines, and re-run.

**No matching drafts found:**
Node 2 returns zero items. Node 3 immediately throws (0 ≠ 3). Workflow halts cleanly.

**All drafts already in sheet (duplicate run):**
Node 3 passes all 3 through. Every draft takes the FALSE branch at Node 5. Nodes 6 and 7 do not execute. Sheet unchanged.

**Subject line does not match expected format:**
Node 6 throws an error for that item. n8n marks the execution as failed for that item. Other drafts in the same run still process. Human should inspect the subject and correct it.

**HTML body cannot be decoded or parsed:**
Repository fields (`repository_name`, `repository_url`, `repository_description`) are set to empty string. The row is still appended with whatever was successfully parsed. Human can correct in the sheet during review.

**Multiple drafts with same `issue_number`:**
Expected — three drafts per Sunday share the same `issue_number`. Each gets its own row in the sheet, per the schema.

---

## Workflow Testing

### Test 1: First run with 3 new drafts

**Setup:**
1. Write 3 Gmail drafts following the format in `manual-content-generation.md` with subjects:
   - `Can you read this #1: Bash command validation hook`
   - `Can you read this #1: HTTP retry backoff scheduler`
   - `Can you read this #1: Memory arena allocator`

**Execute:** Click "Test workflow" in n8n

**Expected result:**
- Node 2 returns 3 items
- Node 3 passes all 3 through (count = 3)
- Node 4 returns 0 rows for each (no matches in sheet)
- Node 5 routes all 3 to TRUE branch
- Node 6 parses each draft
- Node 7 appends 3 rows to the sheet
- Rows have `status = "draft"`, `source = "manual"`, correct `issue_number`, `file_intent`, `repository_*` fields populated

### Test 2: Wrong draft count

**Setup:** Only 2 drafts exist in Gmail for the entered issue number (one was not saved or has a typo in the subject).

**Execute:** Submit form with the issue number

**Expected result:**
- Node 2 returns 2 items
- Node 3 throws: `"Expected 3 drafts for issue #X, found 2. Check Gmail..."`
- Workflow halts — no sheet writes

### Test 3: Re-run (idempotency check)

**Setup:** Sheet already has the 3 rows from Test 1. Same Gmail drafts still present.

**Execute:** Submit form again with the same issue number

**Expected result:**
- Node 2 returns 3 items
- Node 3 passes all 3 through
- Node 4 returns 1 row for each (ID found in sheet)
- Node 5 routes all 3 to FALSE branch
- Nodes 6 and 7 do not execute
- Sheet unchanged

### Test 4: Partial re-run (one new draft added)

**Setup:** Sheet has 3 rows. Human adds a 4th Gmail draft for the same issue number.

**Execute:** Submit form

**Expected result:**
- Node 2 returns 4 items
- Node 3 throws: `"Expected 3 drafts for issue #X, found 4"`
- Workflow halts — human should investigate the extra draft

---

## Workflow Activation

1. Save workflow
2. Click "Activate" toggle (required for Form Trigger to serve the form URL)
3. Copy the Form Trigger URL from the node settings
4. Each Sunday after writing drafts: open the form URL in the browser, enter the issue number, submit
5. Verify rows appear in Newsletter Drafts sheet before doing Sunday review
