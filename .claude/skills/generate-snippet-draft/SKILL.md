---
name: generate-snippet-draft
description: "Snippet newsletter Skill C — Phase 1. Fully automated. Finds the 3 latest completed selection files (with Snippet Selections), reformats snippets for mobile, researches repos, generates and self-refines breakdowns, and writes 3 review files for human approval. No human input required. Run on Sunday nights. After reviewing, run /generate-snippet-draft-select to approve and generate HTML."
---

# Skill C Phase 1 — Generate Breakdown Drafts

You are running the third step of the Snippet newsletter content generation pipeline. Your job is to reformat snippets, research repos, generate breakdowns, and write review files for human approval. You do NOT ask for human input at any point.

## Step 1 — Find Completed Selection Files

List all files in `snippet/n8n-workflows/content/snippet-selections/` matching `*-Python.md`, `*-JS_TS.md`, and `*-C_Cpp.md`. Sort descending. Find the 3 most recent files that:
1. Contain a `## Snippet Selections` section (Phase B is complete)
2. Do NOT have a corresponding `{date}-{Language}-review.md` file already present

If no eligible files exist, output:
> No pending selection files found. Run `/find-snippet-candidates-select` first.

Then stop.

## Step 2 — Process All 3 Languages in Parallel

For each of the 3 language files, run Steps 3–7 in parallel.

## Step 3 — Reformat Snippets for Mobile

Read the file. Extract `Language`, `issue_number`, `date`, and for each of the 2 repos:
- `repo_full_name`, `url`, `description`, `source` — from the Repo sections
- `file_path`, `snippet_url`, the verbatim snippet — from the `## Snippet Selections` section

For each snippet, reformat for mobile readability:
- Do NOT change any logic, variable names, function names, or comments
- You may only: add or remove line breaks, adjust indentation, break long lines
- Target: no line exceeds 65 characters, nesting depth 3 levels or fewer where possible

## Step 4 — Research Repos for Project Context

For each of the 2 repos, use WebSearch to understand what it does in the real world — who uses it, in what contexts, what problem it solves. Do not fabricate. Generate a 1–2 sentence `project_context` per repo.

## Step 5 — Generate Breakdowns

For each of the 2 snippets, generate:

- `file_intent` — 3–5 word noun phrase describing what this file/component is (e.g. "Bash command validation hook", "HTTP retry backoff scheduler")
- `breakdown_what` — what this code does, starting with a verb, 30–40 words
- `breakdown_responsibility` — its role in the broader codebase, 30–40 words
- `breakdown_clever` — a non-obvious insight a mid-level engineer would miss — not a restatement of what the code visibly does, 30–40 words

## Step 6 — Self-Refine

Before writing, run this quality check on every breakdown:

- `breakdown_what`: starts with a strong verb? Tells you something the code doesn't already say at a glance?
- `breakdown_responsibility`: places this code in real context, or just restates what it does?
- `breakdown_clever`: is the insight genuinely non-obvious, or would a mid-level engineer immediately notice it?
- `project_context`: reads as a natural sentence, or does it feel copy-pasted from a README?

Also ask yourself: by only looking at this email without knowing anything about the project before, is it fully understandable?

Rewrite any field that fails these checks before writing the review file.

## Step 7 — Write Review File

Write a review file to:

`snippet/n8n-workflows/content/snippet-selections/{date}-{Language}-review.md`

**File format:**

```markdown
# Breakdown Review — {date} — {Language}

Issue: #{issue_number}
Date: {date}
Language: {Language}
Status: PENDING_APPROVAL

## Repo 1 — owner/repo

- file_path: path/to/file
- snippet_url: https://github.com/owner/repo/blob/{branch}/path/to/file

file_intent: ...
breakdown_what: ...
breakdown_responsibility: ...
breakdown_clever: ...
project_context: ...

### Reformatted Snippet

```{language_lowercase}
<reformatted snippet — verbatim from Step 3>
```

## Repo 2 — owner/repo

- file_path: ...
- snippet_url: ...

file_intent: ...
breakdown_what: ...
breakdown_responsibility: ...
breakdown_clever: ...
project_context: ...

### Reformatted Snippet

```{language_lowercase}
<reformatted snippet>
```
```

After writing all 3 review files, commit and push them to the remote repository:

```bash
git add snippet/n8n-workflows/content/snippet-selections/{date}-Python-review.md snippet/n8n-workflows/content/snippet-selections/{date}-JS_TS-review.md snippet/n8n-workflows/content/snippet-selections/{date}-C_Cpp-review.md
git commit -m "chore: add breakdown reviews for {date} (issue #{issue_number})"
git push
```

Then output:

> Done. Review files written and pushed:
> - `snippet-selections/{date}-Python-review.md`
> - `snippet-selections/{date}-JS_TS-review.md`
> - `snippet-selections/{date}-C_Cpp-review.md`
>
> Next: git pull on your local machine, review the breakdowns, and run `/generate-snippet-draft-select` to approve and generate HTML drafts.
