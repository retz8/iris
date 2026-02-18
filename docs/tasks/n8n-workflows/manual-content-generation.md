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

Scan this GitHub repository. First explore the directory structure to understand the codebase layout. Then identify files that contain core logic worth reading — prefer implementation files (src/, lib/, core/, internal/) over tests, configs, entry points that only wire things together, or auto-generated code.

From those files, return 5 snippet candidates spread across different files. For each:
- file_path: path within the repo
- snippet: a complete logical unit copied verbatim from the file (a single function, method, or tightly coupled block)

No interpretation. No explanation of what the code does. File path and raw code only.
```

Read through the 5 candidates and pick the one you want to feature. Then move to Step 3.

## Step 3: Generate Breakdown

In the same conversation as Step 2, send this follow-up. Replace `[N]` with the number of the snippet you picked.

```
Break down snippet [N].

Return exactly four fields:
- file_intent: 3-5 word noun phrase describing what this file/component is (e.g. "Bash command validation hook", "HTTP retry backoff scheduler")
- breakdown_what: what this code does, starting with a verb, 30-40 words
- breakdown_responsibility: its role in the broader codebase, 30-40 words
- breakdown_clever: a non-obvious insight a mid-level engineer would miss — not a restatement of what the code visibly does, 30-40 words
```

## Step 4: Export as JSON

In the same conversation, send this to get a clean JSON object ready to paste into the email template.

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

Use only values established in this conversation. No placeholders. language must be exactly one of: Python, JS/TS, C/C++ (case sensitive).
```

Copy the JSON output and use it to compose the Gmail draft.
