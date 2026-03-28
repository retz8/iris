---
name: generate-snippet-draft-select
description: "Snippet newsletter Skill C — Phase 2. Interactive. Reads the latest review files written by /generate-snippet-draft, presents breakdowns to the human for approval, handles revision feedback, writes to drafts.json and repos.json, spawns snippet-html-generator sub-agents, and saves HTML draft files. Run Monday morning after reviewing the Sunday night review files."
---

# Skill C Phase 2 — Approve Breakdowns and Generate HTML Drafts

You are completing the third step of the Snippet newsletter content generation pipeline. Phase 1 has already generated breakdowns and written review files. Your job is to get human approval, persist the data, and generate HTML draft files.

## Step 1 — Find Pending Review Files

List all files in `snippet/n8n-workflows/content/snippet-selections/` matching `*-review.md`. Sort descending. Find the 3 most recent files that contain `Status: PENDING_APPROVAL` — they should share the same date prefix.

If no pending review files are found, tell the human:
> No pending review files found. Run `/generate-snippet-draft` first.

Then stop.

Extract `date`, `issue_number`, and `Language` from each file.

## Step 2 — Present Breakdowns for All 3 Languages

Display all 3 review files together. For each language, show:

```
## {Language}

### Repo 1 — owner/repo

file_intent: ...
breakdown_what: ...
breakdown_responsibility: ...
breakdown_clever: ...
project_context: ...

---

### Repo 2 — owner/repo

...
```

Then ask:

> Do these breakdowns read well? Reply "go ahead" to proceed with all 3 languages, or give feedback on specific repos (e.g. "Python Repo 1 breakdown_clever feels too obvious").

## Step 3 — Handle Feedback

If the human gives feedback, revise only the specified fields and re-present the affected repos. Repeat until the human replies "go ahead".

## Step 4 — Build JSON Draft Objects

For each of the 6 repos (2 per language × 3 languages), construct one JSON object:

```json
{
  "issue_number": <integer>,
  "language": "Python" | "JS/TS" | "C/C++",
  "week_date": "YYYY-MM-DD",
  "repo_full_name": "owner/repo",
  "repository_url": "https://github.com/owner/repo",
  "repository_description": "<from selections file>",
  "source": "<from selections file>",
  "file_path": "path/to/file",
  "snippet_url": "https://github.com/owner/repo/blob/{branch}/path/to/file",
  "file_intent": "<generated>",
  "snippet": "<reformatted snippet — plain text, no markdown fences>",
  "breakdown_what": "<generated>",
  "breakdown_responsibility": "<generated>",
  "breakdown_clever": "<generated>",
  "project_context": "<generated>",
  "created_at": "<current ISO 8601 timestamp>"
}
```

## Step 5 — Write JSON Archives

### 5a — Append to drafts.json

Read `snippet/n8n-workflows/content/drafts.json`. Append all 6 new entries to the array. Write the file back.

### 5b — Update repos.json

Read `snippet/n8n-workflows/content/repos.json`. For each of the 6 repos:
- If `owner/repo` key exists: increment `count`, append the snippet path to `snippets` (format: `owner/repo/blob/{branch}/path/to/file` — no `https://github.com/` prefix)
- If key does not exist: create it with `count: 1` and `snippets: ["owner/repo/blob/{branch}/path/to/file"]`

Write the file back.

## Step 6 — Generate HTML Emails

Spawn 6 `snippet-html-generator` sub-agents in parallel — one per repo. Pass each agent:
- `draft` — the full JSON object for that repo
- `snippet` — the reformatted snippet (plain text, no markdown fences)

Wait for all 6 to complete. Each returns a subject line and complete HTML body.

## Step 7 — Write HTML Draft Files

For each repo, write the HTML to:

`snippet/n8n-workflows/content/html-drafts/{date}-{Language}-Repo-{N}.html`

Where `{N}` is 1 for Repo 1, 2 for Repo 2. `{Language}` matches the identifier used in selection filenames (`Python`, `JS_TS`, `C_Cpp`).

## Step 8 — Mark Review Files Complete

For each of the 3 review files, update `Status: PENDING_APPROVAL` to `Status: COMPLETED`.

## Step 9 — Report

Tell the human:

> Done. 6 HTML drafts written to `html-drafts/`:
> - {date}-Python-Repo-1.html — "{subject line}"
> - {date}-Python-Repo-2.html — "{subject line}"
> - {date}-JS_TS-Repo-1.html — "{subject line}"
> - {date}-JS_TS-Repo-2.html — "{subject line}"
> - {date}-C_Cpp-Repo-1.html — "{subject line}"
> - {date}-C_Cpp-Repo-2.html — "{subject line}"
>
> Copy each HTML file's contents into a new Gmail compose window to create drafts, then open Google Sheets → Newsletter Drafts tab to set `scheduled_day` and `status`.
