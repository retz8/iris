# Manual Newsletter Content Generation

Sunday workflow for writing the week's three newsletter drafts (Python, JS/TS, C/C++).

## Step 1: Find Repo Candidates

Copy the prompt below into Claude.ai (enable web search). Replace `[DATE]` with today's date. Review the results and pick one repo per language to feature this week — the one with the strongest news hook and a codebase likely to have something interesting to read.

```
Today is [DATE]. Search developer news sources (Hacker News, Reddit r/programming, dev.to, tech blogs) and GitHub trending for open-source projects engineers are actively talking about this week.

Return 3–5 candidates per language for these three categories: Python, JS/TS, C/C++.

For each candidate:
- Repo: owner/repo
- What it does: one sentence
- Why this week: the specific news hook (new release, viral post, notable discussion, etc.)

Avoid: tutorials, blog posts, awesome-lists, aggregator repos, docs-only repos.
```

After getting results, pick one repo per language to feature this week, then move to Step 2.

## Step 2: Find Snippet Candidates

For each repo you picked, copy the prompt below into Claude.ai (enable web search). Replace `[REPO_URL]` with the GitHub URL. You'll get 5 raw snippet candidates to read through — no interpretation yet, just code to evaluate yourself.

```
Repo: https://github.com/[REPO_URL]

Scan this GitHub repository using these exact steps:

1. Browse the directory structure to identify candidate files — prefer implementation files (src/, lib/, core/, internal/) over tests, configs, entry points that only wire things together, or auto-generated code.
2. For each candidate file, navigate to and open the file on GitHub before extracting anything. Do not guess or reconstruct content from memory.
3. Extract the snippet directly from the file content you see.

Return 5 candidates spread across different files. For each:
- file_path: path as it appears in the repo. MUST be real file path.
- snippet: a complete logical unit copied verbatim from the file (a single function, method, or tightly coupled block)

Strict rule: only extract snippets that would take a developer at least 1 minute to fully understand — skip anything trivially obvious at a glance.

Prefer snippets where no line exceeds 65 characters and nesting depth stays at 3 levels or fewer — these read cleanly on mobile without wrapping.

No interpretation. No explanation of what the code does. File path and raw code only.
```

Read through the 5 candidates and pick the one you want to feature. Then move to Step 3.

## Step 3: Reformat for Mobile

Copy the snippet you picked and paste it into a new conversation. Send this prompt with the snippet pasted in place of `[PASTE SNIPPET]`.

```
Here is a code snippet:

[PASTE SNIPPET]

Reformat this snippet for mobile readability. Do NOT change any logic, variable names, function names, or comments. You may only: add or remove line breaks, adjust indentation, and break long lines across multiple lines. Target: no line exceeds 65 characters, nesting depth 3 levels or fewer where possible. Return only the reformatted code with no explanation.
```

Copy the reformatted snippet. Use this version in all subsequent steps. Then move to Step 4.

## Step 4: Generate Breakdown

In the same conversation as Step 3, send this follow-up.

```
Break down the snippet above.

Return exactly four fields:
- file_intent: 3-5 word noun phrase describing what this file/component is (e.g. "Bash command validation hook", "HTTP retry backoff scheduler")
- breakdown_what: what this code does, starting with a verb, 30-40 words
- breakdown_responsibility: its role in the broader codebase, 30-40 words
- breakdown_clever: a non-obvious insight a mid-level engineer would miss — not a restatement of what the code visibly does, 30-40 words
```

## Step 5: Export as JSON

In the same conversation as Step 4, send this to get a clean JSON object ready to paste into the email template.

```
Summarize this conversation into two parts:

1. The selected snippet as a code block.

2. A JSON object with the remaining fields:

{
  "language": "",
  "repo_full_name": "",
  "repo_description": "",
  "file_path": "",
  "file_intent": "",
  "breakdown_what": "",
  "breakdown_responsibility": "",
  "breakdown_clever": ""
}

Use only values established in this conversation. No placeholders. language must be exactly one of: Python, JS/TS, C/C++ (case sensitive). Respond JSON output in copyable format.
```

Copy the JSON output and use it to compose the Gmail draft.

## Step 6: Generate HTML Email

In the same conversation as Step 4, send this prompt. The template is fixed — the LLM only fills in the placeholders from the JSON.

```
Fill in the HTML template below using the JSON from this conversation.
Replace each {{FIELD}} with the corresponding value. Do not modify any HTML, CSS, or structure — only replace the placeholders. Only return html code that is easy to copy and paste. Reference image attached.

Strict rule: do not fill in the code snippet. Remove the <pre> and <code> tags entirely and replace that block with exactly: <!-- PASTE_SNIPPET_HERE -->

Subject: Can you read this #[ISSUE_NUMBER]: {{file_intent}}

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#24292f;background:#ffffff;">
  <div style="max-width:600px;margin:0 auto;padding:20px 20px;">

    <pre style="font-family:Consolas,Monaco,'Courier New',monospace;font-size:14px;line-height:1.6;background-color:#f6f8fa;padding:16px;border-left:3px solid #0969da;border-radius:6px;overflow-x:auto;color:#24292f;margin:0 0 24px 0;white-space:pre-wrap;word-wrap:break-word;"><code>PASTE_SNIPPET_HERE</code></pre>

    <p style="margin:32px 0;font-size:20px;font-style:italic;text-align:center;">Before scrolling: what does this do?</p>

    <div style="margin:24px 0;text-align:center;letter-spacing:8px;color:#d0d7de;font-size:20px;">• • •</div>

    <h2 style="margin:0 0 16px 0;font-size:16px;font-weight:600;">The Breakdown</h2>
    <ul style="margin:0 0 24px 0;padding-left:24px;line-height:1.8;">
      <li style="margin-bottom:12px;font-size:16px;"><strong>What it does:</strong> {{breakdown_what}}</li>
      <li style="margin-bottom:12px;font-size:16px;"><strong>Key responsibility:</strong> {{breakdown_responsibility}}</li>
      <li style="margin-bottom:12px;font-size:16px;"><strong>The clever part:</strong> {{breakdown_clever}}</li>
    </ul>

    <hr style="margin:32px 0;border:none;border-top:1px solid #d0d7de;">

    <h3 style="margin:0 0 8px 0;font-size:16px;font-weight:600;">Project Context</h3>
    <p style="margin:0 0 32px 0;font-size:15px;color:#57606a;">
      From <a href="https://github.com/{{repo_full_name}}" style="color:#0969da;text-decoration:none;">{{repo_full_name}}</a> — <a href="https://github.com/{{repo_full_name}}/blob/main/{{file_path}}" style="color:#0969da;text-decoration:none;">{{file_path}}</a>. {{repo_description}}
    </p>

    <div style="padding-top:20px;border-top:1px solid #d0d7de;font-size:13px;color:#57606a;">
      Python, JS/TS, C/C++ | <a href="https://iris-codes.com/snippet/unsubscribe?token=UNSUBSCRIBE_TOKEN" style="color:#0969da;text-decoration:none;">Unsubscribe</a>
    </div>

  </div>
</body>
</html>
```

Copy the HTML output, open Gmail, create a new draft, switch to HTML mode, and paste. Replace `[ISSUE_NUMBER]` in the subject and paste your syntax-highlighted snippet over `PASTE_SNIPPET_HERE`.
