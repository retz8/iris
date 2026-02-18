# n8n Workflow: Newsletter Content Pipeline

**Workflow Name:** Newsletter Content Pipeline
**Trigger Type:** Schedule (Sunday 8pm)
**Purpose:** Use an AI agent with web search to discover trending OSS repos for each language, extract clever code snippets via a Code Hunter agent, generate breakdowns via Claude Haiku, compose HTML emails, save as Gmail drafts for human review, and write tracking rows to Google Sheets. Runs every Sunday to produce 3 Gmail drafts (Python, JS/TS, C/C++) ready for Mon/Wed/Fri send.

## Prerequisites

- Google Sheets document `Newsletter` with sheet `Newsletter Drafts` (see `google-sheets-drafts-schema.md`)
- Google OAuth2 credentials configured in n8n
- Gmail OAuth2 credentials configured in n8n
- GitHub token: create a **Header Auth** credential (Name: `Authorization`, Value: `Bearer <token>`) — used in Nodes 6a and 8
- Anthropic API key: create a **Header Auth** credential (Name: `x-api-key`, Value: `<key>`) — used in Node 10
- OpenAI API key added as n8n **OpenAI** credential (`openAiAccount`) — used in Node 4

**Note:** `$credentials.xxx` is not accessible in n8n expressions. API keys must be set via the node's **Authentication** field using `Generic Credential Type → Header Auth`.
- n8n instance: `retz8.app.n8n.cloud`

## Workflow Overview

```
Schedule Trigger (Sunday 8pm)
       |
       v
Google Sheets ── Read all rows from Newsletter Drafts
       |          (to determine current max issue_number)
       v
Code ─────────── Compute next issue_number (max + 1)
       |
       v
AI Agent ─────── Trending OSS Finder
       |          Tool: web_search (Tavily API)
       |          - Searches "trending open source <language> projects this week"
       |          - Selects 1 notable GitHub repo per language (Python, JS/TS, C/C++)
       |          - Flags C/C++ as not_found if no strong match exists
       v
Code ─────────── Parse Repo Selections
       |          Emits 3 items: { language, repo_full_name, trend_source, needs_fallback }
       v
IF ───────────── needs_fallback == true? (agent couldn't find C/C++ repo)
       ├─ TRUE  → HTTP Request: GitHub Search C/C++
       │               ↓
       │          Code: Select Best C/C++ Repo
       │               ↓
       └─ FALSE → (continue)
       v
Merge ────────── Combine both branches (3 language items)
       v
AI Agent ─────── Code Hunter  [runs once per language item]
       |          Tools:
       |           - GitHub Get Tree (explores repo structure)
       |           - GitHub Read File (inspects candidate files)
       |          Mission: find an 8-12 line self-contained snippet
       |          with a non-obvious insight. Retries files if needed.
       v
HTTP Request ─── Claude Haiku API
       |          Generates: file_intent + 3-bullet breakdown (JSON)
       v
Code ─────────── Parse Breakdown
       v
Code ─────────── Compose HTML Email
       |          (inline CSS, syntax highlighting, mobile-first)
       v
Gmail ────────── Create Draft (NOT send)
       |          Returns gmail_draft_id
       v
Code ─────────── Extract Draft ID
       v
Google Sheets ── Append row to Newsletter Drafts
                  [issue_number, status: "draft", gmail_draft_id,
                   programming_language, repo metadata, trend_source]
```

**Manual step after this runs**: Open Gmail every Sunday, review 3 drafts. Edit tone/content directly in Gmail if needed. Then in Google Sheets, set `status` to `"scheduled"` and `scheduled_day` to `mon`, `wed`, or `fri`. Workflow 2 picks up scheduled rows automatically.

## Node-by-Node Configuration

### Node 1: Schedule Trigger

**Node Type:** `Schedule Trigger`
**Purpose:** Fire the workflow every Sunday at 8pm

**Configuration:**
1. Add Schedule Trigger node to canvas
2. Set parameters:
   - **Trigger Interval:** Weeks
   - **Trigger at Day:** Sunday (0)
   - **Trigger at Hour:** 20

---

### Node 2: Google Sheets - Read All Draft Rows

**Node Type:** `Google Sheets`
**Purpose:** Read all rows from Newsletter Drafts to determine the current max issue_number

**Configuration:**
1. Add Google Sheets node after Schedule Trigger
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Get Row(s)
   - **Document:** `Newsletter`
   - **Sheet:** `Newsletter Drafts`

**Note:** No Limit or Sort options exist on the Google Sheets node — it always returns all rows. The Code node extracts the last row. On first run the sheet is empty and returns 0 rows — handled in Node 3.

**Output:** All rows from the sheet (0 rows on first run, otherwise all appended rows in order)

---

### Node 3: Code - Compute Issue Number

**Node Type:** `Code`
**Purpose:** Grab the last row (highest issue_number) and add 1. Defaults to 1 if the sheet is empty.

**Configuration:**
1. Add Code node after Google Sheets read
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const items = $input.all();
const maxIssue = items.reduce((max, item) => {
  const n = parseInt(item.json.issue_number || '0', 10);
  return n > max ? n : max;
}, 0);
return [{ json: { next_issue_number: maxIssue + 1 } }];
```

**Output:** `{ next_issue_number: N }` — referenced later by `$('Compute Issue Number').first().json.next_issue_number`

---

### Node 4: AI Agent - Trending OSS Finder

**Node Type:** `AI Agent`
**Purpose:** Use OpenAI GPT with built-in web search to find trending OSS repos for each language this week. Returns structured JSON guaranteed by JSON Schema response format.

**Configuration:**
1. Add AI Agent node after Compute Issue Number
2. Connect an **OpenAI Chat Model** sub-node:
   - Node Type: `OpenAI Chat Model`
   - Credential: `openAiAccount`
   - Model: `gpt-5-nano-2025-08-07`
   - **Use Responses API:** ON (toggle)
   - **Built-in Tools → Web Search:** add, set Search Context Size to `Medium`
   - **Options → Response Format:** `JSON Schema (recommended)`
   - **Schema:**
     ```json
     {
       "type": "object",
       "properties": {
         "python": {
           "type": "object",
           "properties": {
             "repo_full_name": { "type": "string" },
             "trend_source": { "type": "string" }
           },
           "required": ["repo_full_name", "trend_source"],
           "additionalProperties": false
         },
         "js_ts": {
           "type": "object",
           "properties": {
             "repo_full_name": { "type": "string" },
             "trend_source": { "type": "string" }
           },
           "required": ["repo_full_name", "trend_source"],
           "additionalProperties": false
         },
         "cpp": {
           "type": "object",
           "properties": {
             "repo_full_name": { "type": ["string", "null"] },
             "trend_source": { "type": ["string", "null"] },
             "not_found": { "type": "boolean" }
           },
           "required": ["repo_full_name", "trend_source", "not_found"],
           "additionalProperties": false
         }
       },
       "required": ["python", "js_ts", "cpp"],
       "additionalProperties": false
     }
     ```
3. No tool sub-nodes needed — web search is built-in on the OpenAI Chat Model
4. Set **System Message** field:

```
You are a tech curator for a developer newsletter targeting mid-level engineers (2-5 YoE).
Your job is to find ONE notable open-source GitHub repository per language category (Python, JS/TS, C/C++) that engineers are talking about this week.

Selection rules:
- Must be a real GitHub repo in owner/repo format
- Prefer: new releases, tools engineers are actively using, clever libraries, OSS with notable activity this week
- Avoid: tutorials, blog posts, awesome-lists, aggregator repos, docs-only repos
- For C/C++: set not_found to true if no strong match exists after searching
```

5. Set **Prompt** field:

```
Today is {{ $now.toFormat('yyyy-MM-dd') }}. Search the web for trending open-source projects from the past 7 days and return one repo per language.
```

**Note:** The JSON Schema response format guarantees structured output — no markdown wrapping, no parse failures.

**Output:** `{ output: { python: {...}, js_ts: {...}, cpp: {...} } }` — already a parsed object, not a string.

---

### Node 5: Code - Parse Repo Selections

**Node Type:** `Code`
**Purpose:** Parse the Trending OSS Finder agent output and emit 3 items — one per language. Sets `needs_fallback: true` on the C/C++ item if not found.

**Configuration:**
1. Add Code node after AI Agent - Trending OSS Finder
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();
// JSON Schema response format guarantees a parsed object, not a string.
// Defensive fallback: handle string output if model wraps in markdown.
let parsed = item.json.output;
if (typeof parsed === 'string') {
  const match = parsed.match(/```(?:json)?\s*([\s\S]*?)```/);
  parsed = JSON.parse(match ? match[1] : parsed);
}

const langMap = [
  { key: 'python',  language: 'Python' },
  { key: 'js_ts',   language: 'JS/TS'  },
  { key: 'cpp',     language: 'C/C++'  }
];

return langMap.map(({ key, language }) => {
  const selection = parsed[key] || {};
  return {
    json: {
      language,
      repo_full_name: selection.repo_full_name || null,
      trend_source: selection.trend_source || null,
      needs_fallback: selection.not_found === true || !selection.repo_full_name
    }
  };
});
```

**Output:** 3 items, each with `{ language, repo_full_name, trend_source, needs_fallback }`

---

### Node 6: IF - Needs GitHub Fallback?

**Node Type:** `IF`
**Purpose:** Route items where the agent couldn't find a repo (typically C/C++) to the GitHub Search fallback

**Configuration:**
1. Add IF node after Parse Topic Selections
2. Set condition:
   - **Value 1:** `{{ $json.needs_fallback }}`
   - **Operation:** is equal to
   - **Value 2:** `true`

**Outputs:**
- **TRUE branch:** No repo found by agent → GitHub Search fallback
- **FALSE branch:** Repo found → skip to Merge

---

### Node 6a: HTTP Request - GitHub Search C/C++ (TRUE branch)

**Node Type:** `HTTP Request`
**Purpose:** Search GitHub for a well-known, active C/C++ project as fallback

**Configuration:**
1. Add HTTP Request node on TRUE branch
2. Configure parameters:
   - **Authentication:** `Generic Credential Type`
   - **Generic Auth Type:** `Header Auth`
   - **Credential:** select your GitHub Header Auth credential (Name: `Authorization`, Value: `Bearer <token>`)
   - **Method:** GET
   - **URL:** `https://api.github.com/search/repositories`
   - **Query Parameters:**
     - `q`: `language:c++ stars:>5000 pushed:>{{ $now.minus({ days: 90 }).toFormat('yyyy-MM-dd') }}`
     - `sort`: `stars`
     - `order`: `desc`
     - `per_page`: `10`
   - **Headers:**
     - `Accept`: `application/vnd.github.v3+json`

---

### Node 6b: Code - Select Best C/C++ Repo (TRUE branch)

**Node Type:** `Code`
**Purpose:** Pick the highest-scored C/C++ repo from GitHub Search results

**Configuration:**
1. Add Code node after GitHub Search C/C++
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();
const results = item.json.items || [];

if (results.length === 0) {
  throw new Error('GitHub Search returned no C/C++ repos — check query');
}

// Prefer: high stars, recently pushed, has description
const best = results
  .map(r => ({
    repo: r,
    score: (r.stargazers_count > 10000 ? 3 : 1) +
           (new Date(r.pushed_at) > new Date(Date.now() - 90*86400000) ? 2 : 0) +
           (r.description ? 1 : 0)
  }))
  .sort((a, b) => b.score - a.score)[0].repo;

return [{
  json: {
    language: 'C/C++',
    repo_full_name: best.full_name,
    trend_source: 'github_fallback',
    needs_fallback: false
  }
}];
```

---

### Node 7: Merge - Combine Language Items

**Node Type:** `Merge`
**Purpose:** Reunite HN-sourced items (FALSE branch) and GitHub-fallback item (TRUE branch) into one stream of 3 language items

**Configuration:**
1. Add Merge node
2. Connect Node 6 FALSE branch output → Merge input 1
3. Connect Node 6b output → Merge input 2
4. Set **Mode:** Append

**Output:** 3 items (Python, JS/TS, C/C++) — all with valid `repo_full_name`

---

### Node 8: AI Agent - Code Hunter

**Node Type:** `AI Agent`
**Purpose:** Explore the selected GitHub repo using tools and find a self-contained 8-12 line snippet with a non-obvious insight. Can retry different files if the first candidate is not good enough.

**Configuration:**
1. Add AI Agent node after Merge
2. Connect a **Chat Model** sub-node:
   - Node Type: `Anthropic Chat Model`
   - Credential: `anthropicApiKey`
   - Model: `claude-haiku-4-5-20251001`
   - **Options → Response Format:** `JSON Schema`
   - **Schema:**
     ```json
     {
       "type": "object",
       "properties": {
         "snippet": { "type": "string" },
         "file_path": { "type": "string" },
         "selection_reason": { "type": "string" }
       },
       "required": ["snippet", "file_path", "selection_reason"],
       "additionalProperties": false
     }
     ```
3. Connect two **HTTP Request Tool** sub-nodes (see Tool 1 and Tool 2 below)
4. Set **System Message**:

```
You are a senior engineer curating code snippets for a developer newsletter.
Your job is to find ONE self-contained, clever code snippet (8-12 lines) from a GitHub repo.

What makes a good snippet:
- Has one clear "aha" moment — a non-obvious trick, pattern, or design choice
- Self-contained: can be read and understood without surrounding context
- 8-12 lines maximum, max 60 characters per line
- Shows real logic — not getters/setters, imports, configs, or boilerplate

What to avoid:
- Test files, configuration files, auto-generated code
- Files with only imports or re-exports
- Utility functions that are trivially obvious

Strategy:
1. Call get_repo_tree to see the file structure
2. Identify 2-3 candidate files (prefer src/, lib/, core/)
3. Call read_file on your top candidate
4. If the file has no interesting snippet, try your next candidate
5. Return the best snippet you found
```

5. Set **Prompt** field:

```
Repository: {{ $json.repo_full_name }}
Language: {{ $json.language }}

Explore this repository and find the best code snippet.
```

**Tool 1: get_repo_tree**

1. Add HTTP Request Tool sub-node to the AI Agent
2. Configure:
   - **Name:** `get_repo_tree`
   - **Description:** `Get the full recursive file tree of a GitHub repository. Returns a list of all file paths. Use this first to understand the repo structure before reading files.`
   - **Authentication:** `Generic Credential Type` → `Header Auth` → select GitHub Header Auth credential
   - **Method:** GET
   - **URL:** `https://api.github.com/repos/{{ $fromAI('repo_full_name', 'Repository in owner/repo format, e.g. vercel/next.js', 'string') }}/git/trees/HEAD?recursive=1`
   - **Headers:**
     - `Accept`: `application/vnd.github.v3+json`

**Tool 2: read_file**

1. Add a second HTTP Request Tool sub-node to the AI Agent
2. Configure:
   - **Name:** `read_file`
   - **Description:** `Read the raw source code of a file from a GitHub repository. Input: repo_full_name (owner/repo format) and file_path (relative path from repo root, e.g. src/utils.py).`
   - **Method:** GET
   - **URL:** `https://github.com/{{ $fromAI('repo_full_name', 'Repository in owner/repo format, e.g. vercel/next.js', 'string') }}/raw/HEAD/{{ $fromAI('file_path', 'Relative file path from repo root, e.g. src/utils.py', 'string') }}`

**Output:** `{ output: { snippet: "...", file_path: "...", selection_reason: "..." } }` — parsed object guaranteed by JSON Schema.

---

### Node 9: Code - Parse Code Hunter Output

**Node Type:** `Code`
**Purpose:** Extract snippet and file_path from the Code Hunter agent output

**Configuration:**
1. Add Code node after AI Agent - Code Hunter
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();
// JSON Schema response format returns a parsed object. Defensive fallback for string output.
let parsed = item.json.output;
if (typeof parsed === 'string') {
  const match = parsed.match(/```(?:json)?\s*([\s\S]*?)```/);
  parsed = JSON.parse(match ? match[1] : parsed);
}

return [{
  json: {
    ...item.json,
    snippet: parsed.snippet,
    file_path: parsed.file_path,
    selection_reason: parsed.selection_reason
  }
}];
```

---

### Node 10: HTTP Request - Claude Haiku API

**Node Type:** `HTTP Request`
**Purpose:** Generate the 3-bullet breakdown and file_intent label for the extracted snippet

**Configuration:**
1. Add HTTP Request node after Parse Code Hunter Output
2. Configure parameters:
   - **Authentication:** `Generic Credential Type` → `Header Auth` → select an Anthropic Header Auth credential (Name: `x-api-key`, Value: `<your_anthropic_key>`)
   - **Method:** POST
   - **URL:** `https://api.anthropic.com/v1/messages`
   - **Headers:**
     - `anthropic-version`: `2023-06-01`
     - `Content-Type`: `application/json`
   - **Body Content Type:** JSON
   - **Body:**

```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 400,
  "messages": [
    {
      "role": "user",
      "content": "Analyze this code snippet from {{ $json.repo_full_name }}:\n\n```{{ $json.language }}\n{{ $json.snippet }}\n```\n\nReturn ONLY a JSON object:\n{\n  \"file_intent\": \"[3-5 words, noun phrase, e.g. 'Bash command validation hook']\",\n  \"breakdown_what\": \"[30-40 words: what this code does, starting with a verb]\",\n  \"breakdown_responsibility\": \"[30-40 words: its role in the codebase]\",\n  \"breakdown_clever\": \"[30-40 words: the non-obvious insight, NOT a restatement of visible code]\"\n}\n\nRules:\n- file_intent: 3-5 words, noun phrase\n- Each breakdown field: 30-40 words\n- breakdown_clever must reveal something non-obvious to a mid-level engineer (2-5 YoE)\n- JSON only, no markdown, no explanation"
    }
  ]
}
```

   - **Options → On Error:** Continue

---

### Node 11: Code - Parse Breakdown

**Node Type:** `Code`
**Purpose:** Extract the JSON breakdown from Claude's response

**Configuration:**
1. Add Code node after Claude Haiku HTTP Request
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();
const text = item.json.content[0].text;

let parsed;
try {
  parsed = JSON.parse(text);
} catch (e) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) parsed = JSON.parse(match[1]);
  else throw new Error('Failed to parse Claude breakdown: ' + text);
}

return [{
  json: {
    ...item.json,
    file_intent: parsed.file_intent,
    breakdown_what: parsed.breakdown_what,
    breakdown_responsibility: parsed.breakdown_responsibility,
    breakdown_clever: parsed.breakdown_clever
  }
}];
```

---

### Node 12: Code - Compose HTML Email

**Node Type:** `Code`
**Purpose:** Build the full mobile-first HTML email with inline CSS and syntax-highlighted code block

**Configuration:**
1. Add Code node after Parse Breakdown
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();
const { language, snippet, file_intent, repo_full_name, repo_url, repo_description,
        breakdown_what, breakdown_responsibility, breakdown_clever, trend_source } = item.json;

const issueNumber = $('Compute Issue Number').first().json.next_issue_number;
const paddedIssue = String(issueNumber).padStart(3, '0');
const subject = `Can you read this #${paddedIssue}: ${file_intent}`;

// Syntax highlighting per Track H spec
// Keywords: #cf222e | Strings: #0a3069 | Comments: #6e7781
function highlight(code, lang) {
  let h = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (lang === 'Python') {
    h = h
      .replace(/\b(def|class|import|from|return|if|else|elif|for|while|with|as|in|not|and|or|True|False|None|raise|try|except|finally|pass|yield|lambda)\b/g,
        '<span style="color:#cf222e;">$1</span>')
      .replace(/(#[^\n]*)/g, '<span style="color:#6e7781;">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
        '<span style="color:#0a3069;">$1</span>');
  } else if (lang === 'JS/TS') {
    h = h
      .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|this|typeof|instanceof|true|false|null|undefined)\b/g,
        '<span style="color:#cf222e;">$1</span>')
      .replace(/(\/\/[^\n]*)/g, '<span style="color:#6e7781;">$1</span>')
      .replace(/(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g,
        '<span style="color:#0a3069;">$1</span>');
  } else if (lang === 'C/C++') {
    h = h
      .replace(/\b(int|char|void|return|if|else|for|while|struct|class|template|typename|const|static|inline|auto|bool|true|false|nullptr|new|delete|public|private|protected|virtual|override)\b/g,
        '<span style="color:#cf222e;">$1</span>')
      .replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span style="color:#6e7781;">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span style="color:#0a3069;">$1</span>');
  }
  return h;
}

const highlightedCode = highlight(snippet, language);

const html_body = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#24292f;background:#ffffff;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <pre style="font-family:Consolas,Monaco,'Courier New',monospace;font-size:14px;line-height:1.6;background-color:#f6f8fa;padding:16px;border-left:3px solid #0969da;border-radius:6px;overflow-x:auto;color:#24292f;margin:0 0 24px 0;white-space:pre-wrap;word-wrap:break-word;"><code>${highlightedCode}</code></pre>

    <p style="margin:0 0 16px 0;font-size:15px;color:#57606a;font-style:italic;">Before scrolling: what does this do?</p>

    <div style="margin:24px 0;text-align:center;letter-spacing:8px;color:#d0d7de;font-size:20px;">• • •</div>

    <h2 style="margin:0 0 16px 0;font-size:18px;font-weight:600;">The Breakdown</h2>
    <ul style="margin:0 0 24px 0;padding-left:24px;line-height:1.8;">
      <li style="margin-bottom:12px;"><strong>What it does:</strong> ${breakdown_what}</li>
      <li style="margin-bottom:12px;"><strong>Key responsibility:</strong> ${breakdown_responsibility}</li>
      <li style="margin-bottom:12px;"><strong>The clever part:</strong> ${breakdown_clever}</li>
    </ul>

    <hr style="margin:32px 0;border:none;border-top:1px solid #d0d7de;">

    <h3 style="margin:0 0 8px 0;font-size:15px;font-weight:600;">Project Context</h3>
    <p style="margin:0 0 32px 0;font-size:14px;color:#57606a;">
      From <a href="https://github.com/${repo_full_name}" style="color:#0969da;text-decoration:none;">${repo_full_name}</a>. ${repo_description || ''}
    </p>

    <div style="padding-top:20px;border-top:1px solid #d0d7de;font-size:13px;color:#57606a;">
      Python, JS/TS, C/C++ | <a href="https://iris-codes.com/unsubscribe?token=UNSUBSCRIBE_TOKEN" style="color:#0969da;text-decoration:none;">Unsubscribe</a>
    </div>

  </div>
</body>
</html>`;

return [{ json: { ...item.json, subject, html_body, issue_number: issueNumber } }];
```

---

### Node 13: Gmail - Create Draft

**Node Type:** `Gmail`
**Purpose:** Save the composed email as a Gmail draft for human review

**Configuration:**
1. Add Gmail node after Compose HTML Email
2. Configure parameters:
   - **Credential:** Gmail OAuth2
   - **Resource:** Draft
   - **Operation:** Create
   - **Subject:** `{{ $json.subject }}`
   - **Message:** `{{ $json.html_body }}`
   - **Email Type:** HTML
   - **To:** *(leave empty — no recipient on draft)*

**Output:** Gmail draft object including `id` (the gmail_draft_id)

---

### Node 14: Code - Extract Draft ID

**Node Type:** `Code`
**Purpose:** Pull `id` from Gmail response and attach as `gmail_draft_id`

**Configuration:**
1. Add Code node after Create Gmail Draft
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();
return [{ json: { ...item.json, gmail_draft_id: item.json.id } }];
```

---

### Node 15: Google Sheets - Append Draft Row

**Node Type:** `Google Sheets`
**Purpose:** Write one tracking row per language variant. Full email content lives in the Gmail draft — this row is metadata only.

**Configuration:**
1. Add Google Sheets node after Extract Draft ID
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Append Row
   - **Document:** `Newsletter`
   - **Sheet:** `Newsletter Drafts`
   - **Data Mode:** Define Fields Below
3. Add field mappings:

| Field Name | Value |
|---|---|
| `issue_number` | `{{ $json.issue_number }}` |
| `status` | `draft` |
| `gmail_draft_id` | `{{ $json.gmail_draft_id }}` |
| `file_intent` | `{{ $json.file_intent }}` |
| `repository_name` | `{{ $json.repo_full_name }}` |
| `repository_url` | `https://github.com/{{ $json.repo_full_name }}` |
| `repository_description` | `{{ $json.repo_description }}` |
| `programming_language` | `{{ $json.language }}` |
| `source` | `{{ $json.trend_source }}` |
| `created_date` | `{{ $now.toISO() }}` |
| `scheduled_day` | *(leave empty — human fills during Sunday review)* |
| `sent_date` | *(leave empty — Workflow 2 fills after send)* |

**Note:** Human sets `scheduled_day` to `mon`, `wed`, or `fri` and changes `status` to `"scheduled"` during Sunday review.

---

## Workflow Testing

### Test 1: Full Run (Manual Trigger)

**Setup:**
- Activate workflow
- Click "Execute Workflow" (do not wait for Sunday)

**Expected Result:**
- Node 4 (Trending OSS Finder): `output` field contains valid JSON with python/js_ts/cpp repo selections
- Node 5 (Parse Repo Selections): emits 3 items with `repo_full_name` populated
- Node 6 (IF): C/C++ item routes to TRUE branch if `needs_fallback: true`, FALSE otherwise
- Node 8 (Code Hunter): each item's `output` contains `snippet`, `file_path`, `selection_reason`
- Node 10 (Claude Haiku): `content[0].text` is valid JSON with all 4 breakdown fields
- Gmail: 3 new drafts appear in inbox
- Google Sheets: 3 new rows with `status: "draft"`, same `issue_number`, `gmail_draft_id` and `trend_source` populated

---

### Test 2: Verify Email Rendering

**Setup:**
- After Test 1, open Gmail and open each of the 3 drafts

**Expected Result:**
- Subject: `Can you read this #001: <file_intent>`
- Code block: syntax-colored keywords, readable on mobile (max-width 600px)
- Snippet: 8-12 lines, not config or boilerplate
- Breakdown: 3 bullets with bold labels, ~30-40 words each
- Project Context: repo link renders correctly
- Unsubscribe link present in footer

---

### Test 3: C/C++ Fallback Path

**Setup:**
- In Node 5 (Parse Repo Selections), temporarily force `needs_fallback: true` for the C/C++ item
- Run workflow

**Expected Result:**
- C/C++ item routes to Node 6a (GitHub Search)
- Node 6b selects a high-star C/C++ repo
- `trend_source` is `"github_fallback"` in the Sheets row
- Rest of pipeline (Code Hunter → breakdown → draft) completes normally

---

### Test 4: Human Review Handoff

**Setup:**
- In Google Sheets, find one of the 3 new rows
- Set `status` to `scheduled`
- Set `scheduled_day` to `mon`, `wed`, or `fri`
- Trigger Workflow 2 manually

**Expected Result:**
- Workflow 2 finds the row
- Fetches the Gmail draft by `gmail_draft_id`
- Sends to matched subscribers
- Row `status` updated to `sent`

---

## Error Handling

**Trending OSS Finder outputs malformed JSON:**
- Node 5 (Parse Repo Selections) catches the parse error and throws. Check the raw `output` field in Node 4's execution log to see what the agent returned. Adjust the system message JSON example if the model is wrapping with markdown.

**OpenAI web search returns no useful results:**
- The agent will retry with different queries autonomously. If it still can't find a C/C++ repo, it sets `not_found: true` and the IF node routes to the GitHub Search fallback. For Python/JS/TS it always returns a best-effort pick.

**Code Hunter can't find a good snippet:**
- Agent returns a suboptimal snippet rather than failing — it always returns something. Review the draft in Gmail. If snippet quality is poor, edit directly in Gmail before approving.

**Code Hunter tool call fails (GitHub 404):**
- Happens if the repo's default branch isn't `HEAD` or if the repo is private. Agent will see the error in the tool response and attempt a different file. If all calls fail, the agent returns a best-effort snippet from whatever it received.

**Claude Haiku returns malformed breakdown:**
- Node 11 (Parse Breakdown) catches the error and throws. Set `On Error: Continue` on Node 10 to allow the other 2 language items to complete. The failed draft is skipped — check Executions tab and create manually.

**Gmail draft creation fails:**
- `gmail_draft_id` will be null in the Sheets row. Manually create the draft and update the Sheets row with the correct ID.

---

## Workflow Activation

1. Configure credentials in n8n: `githubToken`, `anthropicApiKey`, Gmail OAuth2, Google Sheets OAuth2
2. Create `Newsletter Drafts` sheet with all columns from the field mapping table above, plus `trend_source`
3. Save workflow
4. Click "Activate" toggle in top-right
5. Run Test 1 (manual execute) before the first Sunday trigger
6. Monitor "Executions" tab each Sunday — pay attention to Code Hunter execution time (it may take 30-60 seconds per language as the agent iterates through files)

---

## Next Steps

After this workflow is operational:
1. Monitor first 3-4 Sunday runs — evaluate Code Hunter snippet quality vs manual selection
2. Tune Topic Analyzer prompt if it selects tutorials or non-code repos
3. Tune Code Hunter system message if it consistently picks boilerplate
4. Add cleanup job for `draft` rows not promoted to `scheduled` within 14 days
