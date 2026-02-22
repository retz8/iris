---
name: generate-snippet-draft
description: "Snippet newsletter Skill C. Reads the completed snippet-selections/YYYY-MM-DD.md file (written by Skills A and B), reformats snippets for mobile, researches repos for project context, generates and self-refines breakdowns for all three languages, asks human to confirm, then writes drafts.json and repos.json, generates HTML emails via sub-agent, and creates 3 Gmail drafts via browser automation. Use after running find-snippet-candidates (Skill B). Precondition: Gmail must be open in a browser tab."
---

# Skill C — Generate Snippet Drafts

You are running Steps 4–9 of the Snippet newsletter content generation workflow. You take the completed snippet selections, generate all content, get human approval, and write 3 Gmail drafts.

**Precondition:** Gmail must already be open in a browser tab before starting Step 9.

## Input

Ask the human for the path to the snippet-selections file:

```
snippet/n8n-workflows/content/snippet-selections/YYYY-MM-DD.md
```

Read the file. Extract for each language (Python, JS/TS, C/C++):
- `repo_full_name`, `repository_url`, `repository_description`, `source` — from the OSS section
- `file_path`, `snippet_url`, `snippet` (verbatim code) — from the Snippet Selections section

The `issue_number` and `date` (`week_date`) are also in the file header.

## Step 4 — Reformat Snippets for Mobile

For each of the 3 snippets, reformat for mobile readability. Rules:
- Do NOT change any logic, variable names, function names, or comments
- You may only: add or remove line breaks, adjust indentation, break long lines
- Target: no line exceeds 65 characters, nesting depth 3 levels or fewer where possible

Work through all 3 snippets before moving on.

## Step 5 — Research Repos for Project Context

For each repo, use WebSearch to understand what it does in the real world — who uses it, in what contexts, what problem it solves. Do not fabricate. Generate a 1-2 sentence `project_context` per repo.

Run searches for all 3 repos before moving on.

## Step 6 — Generate Breakdowns

For each snippet, generate all four fields:

- `file_intent` — 3-5 word noun phrase describing what this file/component is (e.g. "Bash command validation hook", "HTTP retry backoff scheduler")
- `breakdown_what` — what this code does, starting with a verb, 30-40 words
- `breakdown_responsibility` — its role in the broader codebase, 30-40 words
- `breakdown_clever` — a non-obvious insight a mid-level engineer would miss — not a restatement of what the code visibly does, 30-40 words

## Step 7 — Self-Refine and Ask Human to Confirm

Before showing the human, run this quality check on every breakdown:

- `breakdown_what`: starts with a strong verb? Tells you something the code doesn't already say at a glance?
- `breakdown_responsibility`: places this code in real context, or just restates what it does?
- `breakdown_clever`: is the insight genuinely non-obvious, or would a mid-level engineer immediately notice it?
- `project_context`: reads as a natural sentence, or does it feel copy-pasted from a README?

Also ask yourself: **by only looking at this email without knowing anything about the project before, is it fully understandable?**

Rewrite any field that fails these checks. Then present all 3 breakdowns to the human:

```
## Python — owner/repo

file_intent: ...
breakdown_what: ...
breakdown_responsibility: ...
breakdown_clever: ...
project_context: ...

---

## JS/TS — owner/repo
...

---

## C/C++ — owner/repo
...
```

Then ask:

> Do these breakdowns read well? Reply "go ahead" to proceed, or give feedback to revise specific fields.

If the human gives feedback, revise and re-present. Repeat until they confirm.

## Step 8 — Write JSON Archives

After human confirmation, do the following in order:

### 8a — Build draft objects

Construct one JSON object per language using this schema:

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
  "snippet": "<reformatted snippet — plain text>",
  "breakdown_what": "<generated>",
  "breakdown_responsibility": "<generated>",
  "breakdown_clever": "<generated>",
  "project_context": "<generated>",
  "created_at": "<ISO 8601 timestamp — now>"
}
```

### 8b — Append to drafts.json

Read `snippet/n8n-workflows/content/drafts.json`. Append all 3 new entries to the array. Write the file back.

### 8c — Update repos.json

Read `snippet/n8n-workflows/content/repos.json`. For each repo:
- If `owner/repo` key exists: increment `count`, append the snippet path to `snippets` (format: `owner/repo/blob/{branch}/path/to/file` — no `https://github.com/` prefix)
- If key does not exist: create it with `count: 1` and `snippets: ["owner/repo/blob/{branch}/path/to/file"]`

Write the file back.

## Step 9 — Generate HTML Emails

Spawn 3 `snippet-html-generator` sub-agents in parallel — one per language. Pass each agent:
- `draft` — the full JSON object for that language
- `snippet` — the reformatted snippet (plain text)

Wait for all 3 to complete. Each returns a subject line and complete HTML body.

## Step 10 — Write Gmail Drafts

For each of the 3 languages (Python → JS/TS → C/C++), do the following in sequence:

1. In the Gmail tab, click the Compose button
2. In the Subject field, type the subject line returned by the sub-agent
3. Click into the email body area
4. Use the browser JavaScript tool to inject the HTML directly into Gmail's compose body:
   ```javascript
   document.querySelector('.Am.Al.editable').innerHTML = `<HTML_CONTENT_HERE>`;
   ```
   Replace `<HTML_CONTENT_HERE>` with the full HTML from the sub-agent.
5. Click the X to close the compose window — Gmail saves it as a draft automatically

Repeat for all 3 languages.

## Completion

After all 3 drafts are saved, report:

> Done. 3 Gmail drafts created:
> - Can you read this #{issue_number} Python: {file_intent}
> - Can you read this #{issue_number} JS/TS: {file_intent}
> - Can you read this #{issue_number} C/C++: {file_intent}
