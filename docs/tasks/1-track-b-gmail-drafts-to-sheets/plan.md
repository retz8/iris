# n8n Workflow: Gmail Drafts to Newsletter Drafts Sheet

**Workflow Name:** Gmail Drafts to Sheets
**Trigger Type:** Manual (n8n Form Trigger)
**Purpose:** Fetch manually-written Gmail drafts matching the newsletter subject pattern and append one row per draft to the Newsletter Drafts Google Sheet, skipping any draft already present.

## Prerequisites

- Google Sheets spreadsheet: "Newsletter Drafts" (see `snippet/n8n-workflows/google-sheets-drafts-schema.md`)
- Google OAuth2 credentials configured in n8n
- Gmail OAuth2 credentials configured in n8n
- n8n instance accessible at retz8.app.n8n.cloud
- Gmail drafts written following the format in `snippet/n8n-workflows/manual-content-generation.md`

## Workflow Overview

The workflow fans out from the Form Trigger into two parallel branches that rejoin at a Merge node. This is required because when a draft is not yet in the sheet, Google Sheets returns 0 items — making it impossible to use a simple IF node (0 items means the branch never executes). The Merge node appends both inputs together so Node 6 always receives the Gmail items regardless of whether Sheets returned anything.

```
n8n Form Trigger (issue_number)
    │
    ├─── Branch A ──→ Gmail: Get All Drafts ──→ Code: Filter by Issue & Validate ──→ Merge (Input 1)
    │                                                                                       │
    └─── Branch B ──→ Google Sheets: Get Rows for Issue ──────────────────────────→ Merge (Input 2)
                      (filter: issue_number = form value)                                  │
                                                                          Merge (append both inputs)
                                                                           3 Gmail items + 0–3 Sheets rows
                                                                                           │
                                                                              Code: Dedup & Parse
                                                                           (separates by structure,
                                                                            skips known IDs, parses new)
                                                                                           │
                                                                               Google Sheets: Append Row
```

## Node-by-Node Configuration

### Node 1: n8n Form Trigger

**Node Type:** `n8n Form Trigger`
**Purpose:** Present a form to the human before the workflow runs. The human enters the issue number for the current week's drafts (e.g. `42`). This scopes the Gmail search to exactly that issue's 3 drafts.

**Configuration:**
1. Add n8n Form Trigger node to canvas
2. Configure parameters:
   - **Form Title:** `Gmail Drafts to Sheets`
   - **Form Description:** `Enter the issue number for this week's drafts.`
   - **Form Fields:**
     - **Field 1:**
       - **Field Label:** `Issue Number`
       - **Field Type:** Number
       - **Required:** ON
   - **Response Mode:** `Form Is Submitted` (value: `onReceived`)

**Output:** `{ "Issue Number": 42 }` (field name matches the label exactly — use `$json['Issue Number']` to reference it)

**Fan-out:** This node connects to two downstream nodes simultaneously — Node 2 (Branch A) and Node 4 (Branch B).

**Trigger URL:** Provided by n8n after activation — open in browser each Sunday to run.

---

### Node 2: Gmail - Get All Drafts (Branch A)

**Node Type:** `Gmail`
**Purpose:** Fetch all Gmail drafts in the account. The Draft resource's Get Many operation does not support a subject filter — filtering happens in Node 3.

**Configuration:**
1. Add Gmail node connected from n8n Form Trigger (Branch A)
2. Configure parameters:
   - **Credential:** Gmail OAuth2
   - **Resource:** Draft
   - **Operation:** Get Many
   - **Return All:** ON
   - **Additional Fields → Format:** `Full`

**Note on `Format: Full`:** Without this, `message.payload` (headers, body, internalDate) will not be populated in the response. Required for Node 3 to read subjects and for Node 6 to parse the HTML body.

**Output:** One item per draft in the account. Each item contains:
- `id` — the draft ID (e.g. `r-9182736450198273`), used as `gmail_draft_id`
- `message.payload.headers` — array of `{name, value}` pairs; contains `Subject`
- `message.payload.body.data` — base64url-encoded body (simple messages)
- `message.payload.parts` — MIME parts array (multipart messages); `text/html` part holds the email body
- `message.internalDate` — milliseconds-since-epoch string; used as `created_date`

---

### Node 3: Code - Filter by Issue & Validate Count (Branch A)

**Node Type:** `Code`
**Purpose:** Filter the full drafts list down to only the current issue's 3 drafts by matching the subject pattern, then validate exactly 3 were found. Combines filtering (since the Gmail node has no subject filter) and count validation into one step.

**Configuration:**
1. Add Code node connected after Gmail node
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const allDrafts = $input.all();
const issueNumber = $('n8n Form Trigger').first().json['Issue Number'];
const pattern = new RegExp(`Can you read this #${issueNumber}:`);

// Filter to only this issue's drafts by subject
const issueDrafts = allDrafts.filter(item => {
  const headers = item.json.message?.payload?.headers || [];
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  return pattern.test(subject);
});

if (issueDrafts.length !== 3) {
  throw new Error(
    `Expected 3 drafts for issue #${issueNumber}, found ${issueDrafts.length}. ` +
    `Check Gmail and ensure all 3 drafts have the correct subject format.`
  );
}

return issueDrafts;
```

**Output:** Exactly 3 Gmail draft items for the given issue number. Throws and halts if count is not 3.

**Connects to:** Merge node as **Input 1**.

---

### Node 4: Google Sheets - Get Rows for Issue (Branch B)

**Node Type:** `Google Sheets`
**Purpose:** Fetch only the rows already in the sheet for the current issue number. Used by the Merge node to detect duplicates. Filtering by `issue_number` avoids reading the entire sheet.

**Configuration:**
1. Add Google Sheets node connected from n8n Form Trigger (Branch B — separate connection from Node 1, NOT from the Gmail branch)
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** `Get Row(s)` (value: `read`)
   - **Document:** "Newsletter Drafts"
   - **Sheet:** "Newsletter Drafts"
   - **Filters:**
     - Add filter: column `issue_number` equals `{{ $json['Issue Number'] }}`
   - **Options → Return All:** ON

**Output:** 0–3 rows for the current issue number. Returns 0 items on first run (nothing in sheet yet) — handled correctly in Node 6.

**Connects to:** Merge node as **Input 2**.

---

### Node 5: Merge

**Node Type:** `Merge`
**Purpose:** Combine the 3 Gmail draft items (Input 1) with the 0–3 existing Sheets rows (Input 2) into a single stream. Node 6 then separates and processes them. Since Merge just appends all items, the combined output always contains the Gmail items regardless of whether Sheets returned anything — this is what allows Node 6 to always execute even when the sheet has no rows for this issue yet.

**Configuration:**
1. Add Merge node to canvas
2. Connect **Node 3** (Filter by Issue & Validate Count) to **Input 1**
3. Connect **Node 4** (Sheets Get Rows for Issue) to **Input 2**
4. Set **Number of Inputs:** `2`

**Output:** 3–6 items: 3 Gmail draft items plus 0–3 Sheets rows, all in one list.

---

### Node 6: Code - Dedup & Parse

**Node Type:** `Code`
**Purpose:** Separate Gmail draft items from Sheets rows (distinguishable by structure), build the set of already-processed draft IDs, skip duplicates, and parse the remaining new drafts into sheet-ready rows.

**Configuration:**
1. Add Code node after Merge node
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const allItems = $input.all();

// Gmail draft items have a `message` field; Sheets rows do not
const gmailDrafts = allItems.filter(
  item => item.json.message !== undefined
);
const sheetsRows = allItems.filter(
  item => item.json.message === undefined
);

// Build set of already-processed draft IDs from existing Sheets rows
const existingIds = new Set(
  sheetsRows
    .filter(r => r.json.gmail_draft_id)
    .map(r => String(r.json.gmail_draft_id))
);

const newRows = [];

for (const item of gmailDrafts) {
  const draft = item.json;

  // Skip if already in sheet
  if (existingIds.has(String(draft.id))) continue;

  // Extract subject from message headers
  const headers = draft.message?.payload?.headers || [];
  const subjectHeader = headers.find(h => h.name === 'Subject');
  const subject = subjectHeader?.value || '';

  // Parse issue_number and file_intent
  const subjectMatch = subject.match(/Can you read this #(\d+):\s*(.+)/);
  if (!subjectMatch) {
    throw new Error(`Unexpected subject format: "${subject}"`);
  }

  const issueNumber = parseInt(subjectMatch[1], 10);
  const fileIntent = subjectMatch[2].trim();

  // Decode HTML body (may be in body.data or inside parts)
  // Pure JS base64url decoder — Buffer and atob() are not available
  // in n8n's Code node sandbox.
  const decodeBase64Url = str => {
    const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    let out = '';
    for (let i = 0; i < b64.length; i += 4) {
      const [a, b, c, d] = [b64[i], b64[i+1], b64[i+2], b64[i+3]]
        .map(ch => ch ? table.indexOf(ch) : 0);
      const n = (a << 18) | (b << 12) | (c << 6) | d;
      out += String.fromCharCode((n >> 16) & 0xFF);
      if (b64[i+2] && b64[i+2] !== '=') out += String.fromCharCode((n >> 8) & 0xFF);
      if (b64[i+3] && b64[i+3] !== '=') out += String.fromCharCode(n & 0xFF);
    }
    try { return decodeURIComponent(escape(out)); } catch { return out; }
  };

  let htmlBody = '';
  const payload = draft.message?.payload;

  if (payload?.body?.data) {
    htmlBody = decodeBase64Url(payload.body.data);
  } else if (payload?.parts) {
    const htmlPart = payload.parts.find(p => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      htmlBody = decodeBase64Url(htmlPart.body.data);
    }
  }

  // Parse repository fields from Project Context section
  // HTML pattern: From <a href="https://github.com/owner/repo">owner/repo</a>
  const repoMatch = htmlBody.match(
    /From\s+<a[^>]+href="(https:\/\/github\.com\/([^"]+))"[^>]*>[^<]+<\/a>/
  );
  const repositoryUrl = repoMatch ? repoMatch[1] : '';
  const repositoryName = repoMatch ? repoMatch[2] : '';

  // Parse description: text after the file_path anchor
  const descMatch = htmlBody.match(
    /href="https:\/\/github\.com\/[^"]+\/blob\/[^"]+">([^<]+)<\/a>\.\s*([^<]+)/
  );
  const repositoryDescription = descMatch ? descMatch[2].trim() : '';

  // created_date from internalDate (ms since epoch as string)
  const internalDate = draft.message?.internalDate;
  const createdDate = internalDate
    ? new Date(parseInt(internalDate, 10)).toISOString()
    : new Date().toISOString();

  newRows.push({
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
  });
}

return newRows;
```

**Output:** 0–3 items, one per new draft that is not already in the sheet. Returns 0 items if all drafts are already present — Node 7 does not execute.

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
   - **Operation:** `Append Row` (value: `append`)
   - **Document:** "Newsletter Drafts"
   - **Sheet:** "Newsletter Drafts"
   - **Columns > Mapping Mode:** `Define Below` (value: `defineBelow`)

**Column Mapping (under Define Below):**

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
Node 3 throws and halts the entire workflow before any sheet writes. The error message states the issue number and actual count. Human should check Gmail drafts, fix subject lines, and re-run.

**No matching drafts found:**
Node 2 returns zero items. Node 3 immediately throws (0 ≠ 3). Workflow halts cleanly.

**All drafts already in sheet (duplicate run):**
Node 6 builds a set of all 3 existing IDs and skips all Gmail drafts. Returns 0 items. Node 7 does not execute. Sheet unchanged.

**Sheet is empty (first run):**
Node 4 returns 0 rows. Merge still receives 3 Gmail items from Node 3. Node 6 builds an empty existing-ID set, processes all 3 drafts, returns 3 new rows. ✓

**Subject line does not match expected format:**
Node 6 throws for that item. n8n marks it as failed. Human should inspect and correct the subject line.

**HTML body cannot be decoded or parsed:**
Repository fields are set to empty string. The row is still appended with what was successfully parsed. Human corrects in sheet during Sunday review.

**Multiple drafts with same `issue_number`:**
Expected — three drafts per Sunday share the same `issue_number`. Each gets its own row, per the schema.

---

## Workflow Testing

### Test 1: First run with 3 new drafts (empty sheet)

**Setup:** Write 3 Gmail drafts with subjects:
- `Can you read this #1: Bash command validation hook`
- `Can you read this #1: HTTP retry backoff scheduler`
- `Can you read this #1: Memory arena allocator`

**Execute:** Open Form Trigger URL, enter `1`, submit.

**Expected result:**
- Node 2 returns 3 items
- Node 3 passes all 3 (count = 3)
- Node 4 returns 0 rows (empty sheet)
- Merge returns all 3 (no matches in empty Input 2)
- Node 6 parses each draft
- Node 7 appends 3 rows
- Rows have `status = "draft"`, `source = "manual"`, correct `issue_number`, `file_intent`, `repository_*` populated

### Test 2: Wrong draft count

**Setup:** Only 2 drafts exist for the issue number (one not saved or subject typo).

**Execute:** Submit form with the issue number.

**Expected result:**
- Node 2 returns 2 items
- Node 3 throws: `"Expected 3 drafts for issue #1, found 2..."`
- Workflow halts — no sheet writes

### Test 3: Re-run (idempotency check)

**Setup:** Sheet has 3 rows from Test 1. Same Gmail drafts still present.

**Execute:** Submit form again with the same issue number.

**Expected result:**
- Node 2 returns 3 items
- Node 4 returns 3 rows (all 3 IDs match)
- Merge returns 0 items
- Nodes 6 and 7 do not execute
- Sheet unchanged

### Test 4: Partial run (1 draft already in sheet)

**Setup:** Sheet has 1 row from a partial previous run. 2 drafts remain unprocessed.

**Execute:** Submit form.

**Expected result:**
- Merge returns 2 items (1 matched, 2 didn't)
- Node 7 appends 2 rows
- Sheet has 3 rows total

---

## Workflow Activation

1. Save workflow
2. Click "Activate" toggle (required for Form Trigger URL to be served)
3. Copy the Form Trigger URL from the node settings
4. Each Sunday after writing drafts: open URL in browser, enter the issue number, submit
5. Verify rows appear in Newsletter Drafts sheet before Sunday review
