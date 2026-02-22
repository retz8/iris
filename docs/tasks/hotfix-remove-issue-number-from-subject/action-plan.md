# Action Plan: Remove Issue Number from Subscriber-Facing Email Subject

## Design decisions locked

- Gmail draft subjects keep `#[ISSUE_NUMBER] [LANGUAGE]` — used internally by workflow to filter and parse
- Subscriber-facing removal happens at send time (workflow-send-newsletter.md strips it before sending)
- `issue_number` remains a full internal field in Google Sheets — no schema changes
- The Gmail Drafts to Sheets workflow runs once per language per Sunday (3 runs × 3 drafts = 9 total)
- Node 3 count validation stays at exactly 3, scoped by both issue number AND language

## Status

| Step | Description | Status |
|---|---|---|
| 1 | Update draft subject template in manual-content-generation.md | Done |
| 2 | Update landing page preview in FormatPreview.tsx | Done |
| 3 | Add Language field to n8n Form Trigger (Gmail Drafts to Sheets) | Manual |
| 4 | Update Node 3 in Gmail Drafts to Sheets workflow | Manual |
| 5 | Update Node 6 in Gmail Drafts to Sheets workflow | Manual |
| 6 | Update workflow-send-newsletter.md doc (subject stripping) | Done |
| 7 | Update workflow-gmail-drafts-to-sheet.md doc to match live nodes | Done |
| 8 | Update Node 6 in Newsletter Send workflow (live n8n UI) | Manual |

---

## Step 1 — Update draft subject template in manual-content-generation.md (DONE)

File: `snippet/n8n-workflows/content/manual-content-generation.md`

Line 115 now reads:
```
Subject: Can you read this #[ISSUE_NUMBER] [LANGUAGE]: {{file_intent}}
```

Line 155 instruction now reads:
```
Replace `[ISSUE_NUMBER]` with the issue number and `[LANGUAGE]` with the language (Python, JS/TS, or C/C++) in the subject, then paste your syntax-highlighted snippet over `PASTE_SNIPPET_HERE`.
```

Result: Gmail drafts now encode both issue number and language in the subject — e.g. `Can you read this #42 Python: Bash command validation hook`. The workflow can scope to exactly 3 drafts per language per run.

---

## Step 2 — Update landing page preview in FormatPreview.tsx (DONE)

File: `web/src/components/snippet/FormatPreview.tsx`

Line 9 now reads:
```
Can you read this: Bash command validation
```

This reflects what subscribers will see after the send workflow strips the internal prefix.

---

## Step 3 — Add Language field to n8n Form Trigger [DONE]

Workflow: **Gmail Drafts to Sheets**
Node: **n8n Form Trigger** (Node 1)

**Steps in n8n UI (retz8.app.n8n.cloud):**

1. Open the workflow **Gmail Drafts to Sheets**
2. Click the **n8n Form Trigger** node
3. Under **Form Fields**, click **Add Field** to add a second field:
   - **Field Label:** `Language`
   - **Field Type:** `Dropdown List`
   - **Required:** ON
   - **Field Options:** Add three options:
     - `Python`
     - `JS/TS`
     - `C/C++`
4. Click **Save**

After this change, the form will ask for both Issue Number and Language before running. The `Language` value is referenced in subsequent nodes as `$json['Language']`.

---

## Step 4 — Update Node 3 in the live n8n workflow [DONE]

Workflow: **Gmail Drafts to Sheets**
Node: **Filter by Issue & Validate Count** (Node 3, Code node)

**Steps in n8n UI:**

1. Click the **Filter by Issue & Validate Count** node
2. Click inside the JavaScript code editor
3. Select all (`Cmd+A`) and delete
4. Paste the following code exactly:

```javascript
const allDrafts = $input.all();
const issueNumber = $('n8n Form Trigger').first().json['Issue Number'];
const language = $('n8n Form Trigger').first().json['Language'];
const pattern = new RegExp(
  `Can you read this #${issueNumber} ${language}:`
);

const issueDrafts = allDrafts.filter(item => {
  const subject = item.json.subject || '';
  return pattern.test(subject);
});

if (issueDrafts.length !== 3) {
  throw new Error(
    `Expected 3 drafts for issue #${issueNumber} (${language}), ` +
    `found ${issueDrafts.length}. ` +
    `Check Gmail and ensure all 3 drafts have the correct subject format.`
  );
}

return issueDrafts;
```

5. Click **Save**

**What changed and why:**
- Old pattern: `` new RegExp(`Can you read this #${issueNumber}:`) `` — scoped by issue only, expected 3 total
- New pattern: `` new RegExp(`Can you read this #${issueNumber} ${language}:`) `` — scoped by issue AND language, still expects exactly 3
- With 9 drafts per Sunday (3 languages × 3 days), each workflow run is now language-specific and finds the correct 3

---

## Step 5 — Update Node 6 in the live n8n workflow [DONE]

Workflow: **Gmail Drafts to Sheets**
Node: **Dedup & Parse** (Node 6, Code node)

**Steps in n8n UI:**

1. Click the **Dedup & Parse** node
2. Click inside the JavaScript code editor
3. Select all (`Cmd+A`) and delete
4. Paste the following code exactly:

```javascript
const allItems = $input.all();

// Gmail draft items have an `html` field; Sheets rows do not
const gmailDrafts = allItems.filter(
  item => item.json.html !== undefined
);
const sheetsRows = allItems.filter(
  item => item.json.html === undefined
);

// Build set of already-processed draft IDs from existing Sheets rows
const existingIds = new Set(
  sheetsRows
    .filter(r => r.json.gmail_draft_id)
    .map(r => String(r.json.gmail_draft_id))
);

// Read issue_number and language from Form Trigger
const issueNumber = $('n8n Form Trigger').first().json['Issue Number'];
const programmingLanguage = $('n8n Form Trigger').first().json['Language'];

const newRows = [];

for (const item of gmailDrafts) {
  const draft = item.json;

  // Skip if already in sheet
  if (existingIds.has(String(draft.id))) continue;

  const subject = draft.subject || '';
  const htmlBody = draft.html || '';

  // Parse file_intent from subject
  // Format: "Can you read this #42 Python: Bash command validation hook"
  const subjectMatch = subject.match(
    /Can you read this #\d+ [^:]+:\s*(.+)/
  );
  if (!subjectMatch) {
    throw new Error(`Unexpected subject format: "${subject}"`);
  }

  const fileIntent = subjectMatch[1].trim();

  // Parse repository URL and name from Project Context section
  // HTML pattern: From <a href="https://github.com/owner/repo">owner/repo</a>
  const repoMatch = htmlBody.match(
    /From\s+<a[^>]+href="(https:\/\/github\.com\/([^"]+))"[^>]*>[^<]+<\/a>/
  );
  const repositoryUrl = repoMatch ? repoMatch[1] : '';
  const repositoryName = repoMatch ? repoMatch[2] : '';

  // Parse description: text after the repo anchor, strip any remaining HTML tags
  const descMatch = htmlBody.match(
    /From\s+<a[^>]*>[^<]+<\/a>[^.]*\.\s*([\s\S]+?)<\/p>/
  );
  const repositoryDescription = descMatch
    ? descMatch[1].replace(/<[^>]+>/g, '').trim()
    : '';

  // created_date from draft.date (n8n provides ISO 8601 string directly)
  const createdDate = draft.date
    ? new Date(draft.date).toISOString()
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
      programming_language: programmingLanguage,
      source: 'manual',
      created_date: createdDate,
      scheduled_day: '',
      sent_date: ''
    }
  });
}

return newRows;
```

5. Click **Save**

**What changed and why:**
- `issueNumber`: was parsed from subject regex group 1; now read from Form Trigger — simpler and still correct since Form Trigger already has it
- `programmingLanguage`: was left blank for manual fill; now auto-populated from Form Trigger Language field — no longer needs manual entry during Sunday review
- Subject regex changed from `/Can you read this #(\d+):\s*(.+)/` to `/Can you read this #\d+ [^:]+:\s*(.+)/` to match the new format with language in the subject; `file_intent` is still capture group 1

---

## Step 6 — Update workflow-send-newsletter.md to strip issue number at send time (DONE)

File: `snippet/n8n-workflows/workflow-send-newsletter.md`

Updated **Node 6: Code - Normalize Draft Content**. The `subject` variable is now derived by stripping the internal `#[N] [LANG]:` prefix before it flows to Node 7 (Build Send Queue) and ultimately to Node 8 (Gmail Send).

Code change applied (inside the Node 6 code block, replacing the single `const subject` line):

```javascript
// Strip internal "#[N] [LANG]:" prefix — subscriber sees "Can you read this: {file_intent}"
const rawSubject = inItem.subject || 'Snippet';
const subjectPrefixMatch = rawSubject.match(/Can you read this #\d+ [^:]+:\s*(.+)/);
const subject = subjectPrefixMatch
  ? `Can you read this: ${subjectPrefixMatch[1].trim()}`
  : rawSubject;
```

Node 8 (`- **Subject:** {{ $json.subject }}`) is unchanged — it receives the already-cleaned subject from Node 7.

## Step 8 — Update Node 6 in the live Newsletter Send workflow

Workflow: **Newsletter Send**
Node: **Normalize Draft Content** (Node 6, Code node, Mode: Run Once for Each Item)

**Steps in n8n UI (retz8.app.n8n.cloud):**

1. Open the workflow **Newsletter Send**
2. Click the **Normalize Draft Content** node
3. Click inside the JavaScript code editor
4. Find this line:
   ```javascript
   const subject = inItem.subject || 'Snippet';
   ```
5. Replace it with:
   ```javascript
   // Strip internal "#[N] [LANG]:" prefix — subscriber sees "Can you read this: {file_intent}"
   const rawSubject = inItem.subject || 'Snippet';
   const subjectPrefixMatch = rawSubject.match(/Can you read this #\d+ [^:]+:\s*(.+)/);
   const subject = subjectPrefixMatch
     ? `Can you read this: ${subjectPrefixMatch[1].trim()}`
     : rawSubject;
   ```
6. Click **Save**

**What changed and why:**
- The Gmail draft subject `Can you read this #42 Python: Bash command validation hook` is transformed to `Can you read this: Bash command validation hook` before being passed to Node 7 and ultimately to Node 8 Gmail Send
- The fallback (`rawSubject`) is preserved if the subject doesn't match the expected format — no hard failure on format mismatch

---

## Step 7 — Update workflow-gmail-drafts-to-sheet.md doc to match live nodes

File: `snippet/n8n-workflows/workflow-gmail-drafts-to-sheet.md`

**Change 1 — Node 1 Form Trigger description:** Add the Language dropdown field to the configuration section. Add `Language` to the Output example.

**Change 2 — Node 2 output example (line 81):** Update subject example:

Find:
```
- `subject` — email subject string (e.g. `"Can you read this #1: Bash command validation hook"`)
```
Replace with:
```
- `subject` — email subject string (e.g. `"Can you read this #1 Python: Bash command validation hook"`)
```

**Change 3 — Node 3 JavaScript code block:** Replace with the full code from Step 4 above.

**Change 4 — Node 3 Purpose line:** Update to mention language-scoped filtering.

**Change 5 — Node 6 JavaScript code block:** Replace with the full code from Step 5 above.

**Change 6 — Node 6 parsing logic summary table:**

| Sheet Column | Old source | New source |
|---|---|---|
| `issue_number` | Subject regex `#(\d+)` | Form Trigger `$json['Issue Number']` |
| `programming_language` | Blank (manual fill) | Form Trigger `$json['Language']` |
| `file_intent` | Subject regex group 2 | Subject regex `/Can you read this #\d+ [^:]+:\s*(.+)/` group 1 |

**Change 7 — Test 1 setup subjects:** Update to new subject format with language:
```
- `Can you read this #1 Python: Bash command validation hook`
- `Can you read this #1 Python: HTTP retry backoff scheduler`
- `Can you read this #1 Python: Memory arena allocator`
```
And note that Form Trigger should be submitted with Issue Number = 1, Language = Python.

---

## Verification checklist

After completing all steps:

- [ ] Gmail draft subject format: `Can you read this #[N] [LANG]: {{file_intent}}`
- [ ] `manual-content-generation.md:115` reflects new format
- [ ] `manual-content-generation.md:155` instruction mentions replacing both `[ISSUE_NUMBER]` and `[LANGUAGE]`
- [ ] `FormatPreview.tsx:9` shows `Can you read this: Bash command validation` (no number)
- [ ] n8n Form Trigger has Language dropdown with options: Python, JS/TS, C/C++
- [ ] n8n Node 3 filters by both issue number and language; throws if count ≠ 3
- [ ] n8n Node 6 reads `issue_number` and `programming_language` from Form Trigger; `file_intent` from updated subject regex
- [ ] `programming_language` column in sheet is auto-populated after each workflow run (no longer blank)
- [ ] workflow-send-newsletter.md strips `#[N] [LANG]` from subject before sending
- [ ] Write one test Gmail draft `Can you read this #99 Python: Test file intent` and run the workflow with Issue Number=99, Language=Python — verify Node 3 finds it and Node 6 parses `file_intent = "Test file intent"`, `programming_language = "Python"`, `issue_number = 99`
