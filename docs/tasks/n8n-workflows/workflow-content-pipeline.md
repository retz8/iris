# n8n Workflow: Newsletter Content Pipeline

**Workflow Name:** Newsletter Content Pipeline
**Trigger Type:** Schedule (Sunday 8pm)
**Purpose:** Discover trending IT topics via Perplexity, find relevant GitHub repos, extract code snippets, generate breakdowns via Claude Haiku, compose HTML emails, save as Gmail drafts for human review, and write tracking rows to Google Sheets. Runs every Sunday to produce 3 Gmail drafts (Python, JS/TS, C/C++) ready for Mon/Wed/Fri send.

## Prerequisites

- Google Sheets document `Newsletter` with sheet `Newsletter Drafts` (see `google-sheets-drafts-schema.md`)
- Google OAuth2 credentials configured in n8n
- Gmail OAuth2 credentials configured in n8n
- Perplexity API key added as n8n credential (`perplexityApiKey`)
- GitHub Personal Access Token added as n8n credential (`githubToken`)
- Anthropic API key added as n8n credential (`anthropicApiKey`)
- n8n instance: `retz8.app.n8n.cloud`

## Workflow Overview

```
Schedule Trigger (Sunday 8pm)
       |
       v
Google Sheets ── Read all rows from Newsletter Drafts
       |          (to compute next issue_number)
       v
Code ─────────── Compute next issue_number (max + 1)
       |
       v
HTTP Request ─── Perplexity API (sonar-pro, web search)
       |          "6 trending IT topics, 2 per language, return JSON"
       v
Code ─────────── Parse Perplexity response
       |          Emit 3 items: { language, primary, secondary }
       |          (one item per language: Python / JS/TS / C/C++)
       v
HTTP Request ─── GitHub Search API
       |          GET /search/repositories?q={primary.github_search_query}
       v
Code ─────────── Select best repo (score by stars + recency)
       |          If no results → search_failed: true
       v
IF ───────────── Needs fallback?
       ├─ TRUE  → HTTP Request: GitHub Search (secondary query)
       └─ FALSE → continue
       v
Merge ────────── Merge primary + fallback streams
       v
HTTP Request ─── GitHub API: Get file tree (recursive)
       |          GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
       v
Code ─────────── Filter candidate files
       |          (by extension, blocklist tests/configs/generated)
       v
HTTP Request ─── GitHub: Fetch raw file content
       |          GET raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
       v
Code ─────────── Extract best 8-12 line snippet
       |          (sliding window scoring — function defs, logic density, line length)
       v
HTTP Request ─── Claude Haiku API
       |          Generate: file_intent + 3-bullet breakdown (JSON)
       v
Code ─────────── Parse Claude response
       v
Code ─────────── Compose HTML email
       |          (inline CSS, syntax highlighting, mobile-first)
       v
Gmail ────────── Create Draft (NOT send)
       |          Returns gmail_draft_id
       v
Code ─────────── Extract draft ID
       v
Google Sheets ── Append row to Newsletter Drafts
                  [issue_number, status: "draft", gmail_draft_id,
                   programming_language, repo metadata, file_intent]
```

**Manual step after this runs**: Open Gmail every Sunday, review 3 drafts. Edit tone/content directly in Gmail if needed. Then in Google Sheets, set `status` to `"scheduled"` and `scheduled_date` to the target Mon/Wed/Fri 7am. Workflow 2 picks up scheduled rows automatically.

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

### Node 2: Google Sheets - Read Drafts Sheet

**Node Type:** `Google Sheets`
**Purpose:** Fetch all existing rows to compute the next issue_number

**Configuration:**
1. Add Google Sheets node after Schedule Trigger
2. Configure parameters:
   - **Credential:** Google OAuth2
   - **Operation:** Get Rows
   - **Document:** `Newsletter`
   - **Sheet:** `Newsletter Drafts`
   - **Return All:** ON

**Output:** All existing rows (may be empty on first run)

---

### Node 3: Code - Compute Issue Number

**Node Type:** `Code`
**Purpose:** Find max issue_number across all rows and increment by 1

**Configuration:**
1. Add Code node after Google Sheets read
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const rows = $input.all();
let maxIssue = 0;
for (const row of rows) {
  const n = parseInt(row.json.issue_number || '0', 10);
  if (n > maxIssue) maxIssue = n;
}
return [{ json: { next_issue_number: maxIssue + 1 } }];
```

**Output:** `{ next_issue_number: N }` — referenced later by `$('Compute Issue Number').first().json.next_issue_number`

---

### Node 4: HTTP Request - Perplexity API

**Node Type:** `HTTP Request`
**Purpose:** Identify 6 trending IT topics (2 per language) with GitHub search queries via web-search-enabled LLM

**Configuration:**
1. Add HTTP Request node after Code node
2. Configure parameters:
   - **Method:** POST
   - **URL:** `https://api.perplexity.ai/chat/completions`
   - **Authentication:** Header Auth
     - **Name:** `Authorization`
     - **Value:** `Bearer {{ $credentials.perplexityApiKey }}`
   - **Body Content Type:** JSON
   - **Body:**

```json
{
  "model": "sonar-pro",
  "messages": [
    {
      "role": "system",
      "content": "You are a tech trend analyst for a developer newsletter. Always respond with valid JSON only. No markdown, no explanation — raw JSON."
    },
    {
      "role": "user",
      "content": "Identify the top trending IT topics from the past 7 days that have notable open-source GitHub repositories with clean, readable code.\n\nReturn exactly 6 topics as a JSON object — 2 topics per programming language category.\n\n{\n  \"topics\": [\n    {\n      \"language\": \"Python\",\n      \"topic\": \"DeepSeek R2\",\n      \"description\": \"New open-source LLM achieving strong benchmark performance\",\n      \"github_search_query\": \"deepseek-ai/DeepSeek-R2\",\n      \"fallback_query\": \"language:python sort:stars pushed:>2026-01-01\"\n    }\n  ]\n}\n\nRules:\n- language must be exactly: \"Python\", \"JS/TS\", or \"C/C++\"\n- 2 entries per language (6 total)\n- github_search_query: the specific repo slug (owner/repo) if known, otherwise a search string\n- fallback_query: a broader GitHub search string if the primary query fails\n- For C/C++: if no recent trending topic found this week, use a well-known active project (LLVM, CPython, Linux kernel, Redis, SQLite) — never leave C/C++ empty\n- topic and description must reflect actual events from the past 7 days"
    }
  ]
}
```

**Output:** Perplexity chat completion response

---

### Node 5: Code - Parse Topics

**Node Type:** `Code`
**Purpose:** Parse Perplexity JSON response and emit 3 items — one per language variant

**Configuration:**
1. Add Code node after Perplexity HTTP Request
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();
const content = item.json.choices[0].message.content;

let parsed;
try {
  parsed = JSON.parse(content);
} catch (e) {
  // Fallback: extract JSON from markdown code block if LLM wrapped it
  const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) parsed = JSON.parse(match[1]);
  else throw new Error('Failed to parse Perplexity response as JSON: ' + content);
}

const topics = parsed.topics;
const languages = ['Python', 'JS/TS', 'C/C++'];
return languages.map(lang => {
  const candidates = topics.filter(t => t.language === lang);
  return {
    json: {
      language: lang,
      primary: candidates[0] || null,
      secondary: candidates[1] || null
    }
  };
});
```

**Output:** 3 items — all subsequent nodes run once per item (once per language)

---

### Node 6: HTTP Request - GitHub Search Repos

**Node Type:** `HTTP Request`
**Purpose:** Search GitHub for the trending repo matching the primary topic query

**Configuration:**
1. Add HTTP Request node after Parse Topics Code node
2. Configure parameters:
   - **Method:** GET
   - **URL:** `https://api.github.com/search/repositories`
   - **Query Parameters:**
     - `q`: `{{ $json.primary.github_search_query }}`
     - `sort`: `stars`
     - `order`: `desc`
     - `per_page`: `5`
   - **Headers:**
     - `Authorization`: `Bearer {{ $credentials.githubToken }}`
     - `Accept`: `application/vnd.github.v3+json`
   - **Options → On Error:** Continue

**Output:** GitHub search results with `items` array

---

### Node 7: Code - Select Best Repo

**Node Type:** `Code`
**Purpose:** Score search results and pick the best repo. Set `search_failed: true` if no results.

**Configuration:**
1. Add Code node after GitHub Search
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();
const results = item.json.items || [];

if (results.length === 0) {
  return [{ json: { ...item.json, search_failed: true } }];
}

const now = Date.now();
const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

const scored = results.map(repo => {
  let score = 0;
  if (repo.stargazers_count > 1000) score += 3;
  else if (repo.stargazers_count > 100) score += 1;
  if (now - new Date(repo.updated_at).getTime() < ninetyDaysMs) score += 2;
  if (repo.description && repo.description.length > 10) score += 1;
  return { repo, score };
});

scored.sort((a, b) => b.score - a.score);
const best = scored[0].repo;

return [{
  json: {
    language: item.json.language,
    search_failed: false,
    repo_full_name: best.full_name,
    repo_url: best.html_url,
    repo_description: best.description || '',
    default_branch: best.default_branch || 'main',
    repo_stars: best.stargazers_count,
    primary: item.json.primary,
    secondary: item.json.secondary
  }
}];
```

---

### Node 8: IF - Needs Fallback?

**Node Type:** `IF`
**Purpose:** Route items with no primary search results to the fallback GitHub search

**Configuration:**
1. Add IF node after Select Best Repo
2. Set condition:
   - **Value 1:** `{{ $json.search_failed }}`
   - **Operation:** is equal to
   - **Value 2:** `true`

**Outputs:**
- **TRUE branch:** No primary results → fallback search
- **FALSE branch:** Repo found → continue to file tree

---

### Node 8a: HTTP Request - GitHub Fallback Search (TRUE branch)

**Node Type:** `HTTP Request`
**Purpose:** Search GitHub using the secondary topic query

**Configuration:**
1. Add HTTP Request node on TRUE branch
2. Same configuration as Node 6, except:
   - **Query Parameter `q`:** `{{ $json.secondary.github_search_query }}`

---

### Node 8b: Code - Select Best Repo (Fallback)

**Node Type:** `Code`
**Purpose:** Select best repo from fallback results (same logic as Node 7)

**Configuration:** Identical to Node 7 code.

---

### Node 9: Merge - Combine Streams

**Node Type:** `Merge`
**Purpose:** Reunite the primary-success and fallback streams into one

**Configuration:**
1. Add Merge node
2. Connect Node 7 FALSE branch output → Merge input 1
3. Connect Node 8b output → Merge input 2
4. Set **Mode:** Combine

---

### Node 10: HTTP Request - GitHub Get File Tree

**Node Type:** `HTTP Request`
**Purpose:** Fetch the full recursive file tree for the selected repo

**Configuration:**
1. Add HTTP Request node after Merge
2. Configure parameters:
   - **Method:** GET
   - **URL:** `https://api.github.com/repos/{{ $json.repo_full_name }}/git/trees/{{ $json.default_branch }}?recursive=1`
   - **Headers:**
     - `Authorization`: `Bearer {{ $credentials.githubToken }}`
     - `Accept`: `application/vnd.github.v3+json`
   - **Options → On Error:** Continue

**Output:** `{ tree: [{ path, type, sha }, ...] }`

---

### Node 11: Code - Filter Candidate Files

**Node Type:** `Code`
**Purpose:** Filter tree by language extension, apply blocklist, rank by file quality, output top 1 file path

**Configuration:**
1. Add Code node after Get File Tree
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();
const tree = item.json.tree || [];

const extensionMap = {
  'Python': ['.py'],
  'JS/TS': ['.ts', '.tsx', '.js', '.jsx'],
  'C/C++': ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp']
};

const lang = item.json.language;
const validExts = extensionMap[lang] || [];

const blocklistPatterns = [
  /test[s]?[_\/]/, /_test\./, /\.test\./, /\.spec\./,
  /__init__\.py$/, /setup\.py$/, /conftest\.py$/,
  /index\.(ts|js)$/, /\.d\.ts$/,
  /generated/, /auto_/, /pb\./, /\.min\.js$/,
  /config[s]?\./i, /\.config\./
];

const isBlocked = (path) => blocklistPatterns.some(p => p.test(path));
const hasValidExt = (path) => validExts.some(ext => path.endsWith(ext));

const candidates = tree
  .filter(f => f.type === 'blob' && hasValidExt(f.path) && !isBlocked(f.path))
  .map(f => {
    let score = 0;
    if (/^src\//.test(f.path) || /^lib\//.test(f.path)) score += 2;
    score -= f.path.split('/').length;
    if (f.path.endsWith('.ts') || f.path.endsWith('.tsx')) score += 1;
    return { path: f.path, score };
  })
  .sort((a, b) => b.score - a.score);

if (candidates.length === 0) {
  return [{ json: { ...item.json, extraction_failed: true, file_path: null } }];
}

return [{ json: { ...item.json, extraction_failed: false, file_path: candidates[0].path } }];
```

---

### Node 12: HTTP Request - GitHub Fetch File Content

**Node Type:** `HTTP Request`
**Purpose:** Download the raw source file content

**Configuration:**
1. Add HTTP Request node after Filter Candidate Files
2. Configure parameters:
   - **Method:** GET
   - **URL:** `https://raw.githubusercontent.com/{{ $json.repo_full_name }}/{{ $json.default_branch }}/{{ $json.file_path }}`
   - **Response Format:** Text
   - **Options → On Error:** Continue

**Note:** `raw.githubusercontent.com` is public — no auth header needed.

---

### Node 13: Code - Extract Snippet

**Node Type:** `Code`
**Purpose:** Find the best 8-12 line self-contained snippet using sliding window scoring

**Configuration:**
1. Add Code node after Fetch File Content
2. Set parameters:
   - **Mode:** Run Once for All Items
   - **Language:** JavaScript

3. JavaScript code:

```javascript
const item = $input.first();
const rawBody = item.json.body || item.json.data || '';
const content = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
const lines = content.split('\n');

if (lines.length < 8) {
  const fallback = lines.slice(0, Math.min(10, lines.length));
  return [{ json: { ...item.json, snippet: fallback.join('\n'), snippet_start_line: 1 } }];
}

let bestWindow = null;
let bestScore = -Infinity;

for (let windowSize = 8; windowSize <= 12; windowSize++) {
  for (let start = 0; start <= lines.length - windowSize; start++) {
    const window = lines.slice(start, start + windowSize);
    let score = 0;

    // Must contain a function/class definition
    const hasDef = window.some(l =>
      /^\s*(def |class |function |const |export (function|const|class)|async function|public |private |template )/.test(l)
    );
    if (!hasDef) continue;

    // Penalize long lines (mobile readability)
    const longLines = window.filter(l => l.length > 60).length;
    score -= longLines * 2;

    // Reward logic density
    const logicLines = window.filter(l =>
      l.trim().length > 3 &&
      !/^(import|from|#|\/\/|\/\*)/.test(l.trim()) &&
      !/^(pass|return None)$/.test(l.trim())
    ).length;
    score += logicLines;

    // Prefer code near top of file
    score -= start * 0.01;

    if (score > bestScore) {
      bestScore = score;
      bestWindow = { lines: window, startLine: start + 1 };
    }
  }
}

if (!bestWindow) {
  bestWindow = { lines: lines.slice(0, 10), startLine: 1 };
}

return [{ json: { ...item.json, snippet: bestWindow.lines.join('\n'), snippet_start_line: bestWindow.startLine } }];
```

---

### Node 14: HTTP Request - Claude Haiku API

**Node Type:** `HTTP Request`
**Purpose:** Generate file_intent and 3-bullet breakdown for the extracted snippet

**Configuration:**
1. Add HTTP Request node after Extract Snippet
2. Configure parameters:
   - **Method:** POST
   - **URL:** `https://api.anthropic.com/v1/messages`
   - **Headers:**
     - `x-api-key`: `{{ $credentials.anthropicApiKey }}`
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

### Node 15: Code - Parse Breakdown

**Node Type:** `Code`
**Purpose:** Extract the JSON breakdown from Claude's response

**Configuration:**
1. Add Code node after Claude HTTP Request
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
  else throw new Error('Failed to parse Claude response: ' + text);
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

### Node 16: Code - Compose HTML Email

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
        breakdown_what, breakdown_responsibility, breakdown_clever } = item.json;

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
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span style="color:#0a3069;">$1</span>');
  } else if (lang === 'JS/TS') {
    h = h
      .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|new|this|typeof|instanceof|true|false|null|undefined)\b/g,
        '<span style="color:#cf222e;">$1</span>')
      .replace(/(\/\/[^\n]*)/g, '<span style="color:#6e7781;">$1</span>')
      .replace(/(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span style="color:#0a3069;">$1</span>');
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
      From <a href="${repo_url}" style="color:#0969da;text-decoration:none;">${repo_full_name}</a>. ${repo_description}
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

### Node 17: Gmail - Create Draft

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

### Node 18: Code - Extract Draft ID

**Node Type:** `Code`
**Purpose:** Pull `id` from Gmail response and attach as `gmail_draft_id` alongside item fields

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

### Node 19: Google Sheets - Append Draft Row

**Node Type:** `Google Sheets`
**Purpose:** Write one tracking row per language variant with status "draft" and the gmail_draft_id

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
| `content_variant` | `{{ $json.language }}` |
| `programming_language` | `{{ $json.language }}` |
| `file_intent` | `{{ $json.file_intent }}` |
| `repository_name` | `{{ $json.repo_full_name }}` |
| `repository_url` | `{{ $json.repo_url }}` |
| `repository_description` | `{{ $json.repo_description }}` |
| `gmail_draft_id` | `{{ $json.gmail_draft_id }}` |
| `created_date` | `{{ $now.toISO() }}` |
| `source` | `perplexity_trending` |

**Note:** `scheduled_date` and `sent_date` are left empty — human sets `scheduled_date` and changes `status` to `"scheduled"` during Sunday review.

---

## Workflow Testing

### Test 1: Full Run (Manual Trigger)

**Setup:**
- Activate workflow
- Click "Execute Workflow" (do not wait for Sunday)

**Expected Result:**
- "Parse Topics" output: 3 items, each with `language`, `primary`, `secondary` populated
- "Select Best Repo" output: `repo_full_name` present, `search_failed: false`
- "Extract Snippet" output: `snippet` is 8-12 lines
- "Parse Breakdown" output: `file_intent`, `breakdown_what`, `breakdown_responsibility`, `breakdown_clever` all present
- Gmail: 3 new drafts appear in inbox
- Google Sheets: 3 new rows with `status: "draft"`, same `issue_number`, `gmail_draft_id` populated

---

### Test 2: Verify Email Rendering

**Setup:**
- After Test 1 completes, open Gmail
- Open each of the 3 drafts

**Expected Result:**
- Subject line: `Can you read this #001: <file_intent>`
- Code block: styled with light background, left border, syntax coloring for keywords/strings/comments
- Challenge text: italic, visible before breakdown
- Three thinking dots separator
- Breakdown list: 3 bullets with bold labels
- Project Context: repo link clickable
- Layout readable on mobile (max-width 600px)

---

### Test 3: Verify Human Review Handoff

**Setup:**
- In Google Sheets Newsletter Drafts sheet, find one of the 3 new rows
- Set `status` to `scheduled`
- Set `scheduled_date` to a past Mon/Wed/Fri 7am timestamp (e.g., `2026-02-16T07:00:00Z`)
- Trigger Workflow 2 manually

**Expected Result:**
- Workflow 2 finds the row (status = scheduled, scheduled_date <= now)
- Workflow 2 fetches the Gmail draft by `gmail_draft_id`
- Workflow 2 sends to matched subscribers
- Row `status` updated to `sent`

---

### Test 4: Fallback Path (Simulated)

**Setup:**
- In "Select Best Repo" Code node, temporarily override `results` to `[]` for one language
- Run workflow

**Expected Result:**
- IF node routes that item to TRUE branch
- Fallback HTTP Request runs with `secondary.github_search_query`
- Merge node combines the result back into main stream
- Workflow continues normally for that language

---

## Error Handling

**Perplexity API failure:**
- If response is not valid JSON: Code node catches parse error and throws — execution stops for all 3 items. Check Executions tab for error message. Retry manually.

**GitHub Search returns 0 results:**
- Primary query: `search_failed: true` set, falls through to secondary query via IF node
- Secondary query also returns 0: item outputs empty repo fields. Subsequent nodes will fail gracefully (On Error: Continue). That language draft is skipped for this run.

**GitHub file tree truncated:**
- GitHub truncates trees > 100,000 blobs. For very large repos, some files may be missing. Heuristic will still find a candidate among available files.

**Claude API failure:**
- On Error: Continue — item passes through with empty breakdown fields
- Email will be composed with blank breakdown bullets — visible in draft review. Edit manually in Gmail before approving.

**Gmail Draft creation failure:**
- If Gmail node fails, `gmail_draft_id` will be null — Sheets row will be written without an ID
- Check Executions tab, manually create the draft and update the Sheets row

---

## Workflow Activation

1. Configure all credentials in n8n: `perplexityApiKey`, `githubToken`, `anthropicApiKey`
2. Create `Newsletter Drafts` sheet with all columns from the field mapping table
3. Save workflow
4. Click "Activate" toggle in top-right
5. Run Test 1 (manual execute) to verify end-to-end before first Sunday trigger
6. Monitor "Executions" tab each Sunday to check for errors

---

## Next Steps

After this workflow is operational:
1. Monitor first 3-4 Sunday runs — check snippet quality and breakdown accuracy
2. Tune Perplexity prompt if topics are off-target for any language
3. Tune snippet extraction heuristics if consistently picking boilerplate files
4. Add cleanup job for old `draft` rows not promoted to `scheduled` within 14 days
