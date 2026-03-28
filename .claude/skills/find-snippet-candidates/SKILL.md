---
name: find-snippet-candidates
description: "Snippet newsletter Skill B — Phase 1. Fully automated. Finds the 3 latest selection files written by Skill A, spawns 6 parallel snippet-repo-explorer sub-agents (2 per language) via GitHub API, and writes 3 snippet candidate files for human review. No human input required. Run on Saturday nights. After reviewing, run /find-snippet-candidates-select to make selections."
---

# Skill B Phase 1 — Find Snippet Candidates

You are running the second step of the Snippet newsletter content generation pipeline. Your job is to explore repos for each language and write snippet candidate files for human review. You do NOT ask for human input at any point.

## Step 1 — Find the Latest Selection Files

List all files in `snippet/n8n-workflows/content/snippet-selections/` matching the pattern `*-Python.md`, `*-JS_TS.md`, and `*-C_Cpp.md`. Sort by filename descending. Take the 3 most recent files (one per language) — they must all share the same date prefix.

For each file, check whether it already contains a `## Snippet Selections` section. If it does, that language has already been processed — skip it.

If no eligible files are found (all are already processed or none exist), output:
> No pending selection files found. Run `/discover-oss-candidates-select` first.

Then stop.

## Step 2 — Run 6 Parallel Sub-Agents

For each eligible language file:
- Read it and extract `Language`, `issue_number`, `date`, and the 2 repos (Repo 1, Repo 2) — their `repo` and `url`.

Spawn all sub-agents in parallel — 2 per language (one per repo), up to 6 total. For each sub-agent pass:
- `repo_url` — the full GitHub URL from the file
- `language` — the language from the file header

Wait for all sub-agents to complete before proceeding.

## Step 3 — Write Snippet Candidate Files

For each language, write a snippet candidates file to:

`snippet/n8n-workflows/content/snippet-selections/{date}-{Language}-snippet-candidates.md`

Where `{Language}` matches the language identifier used in the selection file name (`Python`, `JS_TS`, `C_Cpp`).

**File format:**

```markdown
# Snippet Candidates — {date} — {Language}

Issue: #{issue_number}
Date: {date}
Language: {Language}
Status: PENDING_SELECTION

## Repo 1 — owner/repo

### Candidate 1 (most important)

- file_path: path/to/file
- snippet_url: https://github.com/owner/repo/blob/{branch}/path/to/file
- reasoning: one sentence

```{language_lowercase}
<verbatim code>
```

### Candidate 2

- file_path: ...
- snippet_url: ...
- reasoning: ...

```{language_lowercase}
<verbatim code>
```

### Candidate 3 (least important)

- file_path: ...
- snippet_url: ...
- reasoning: ...

```{language_lowercase}
<verbatim code>
```

## Repo 2 — owner/repo

### Candidate 1 (most important)

...

### Candidate 2

...

### Candidate 3 (least important)

...
```

If a sub-agent returned fewer than 3 candidates, include however many it found.

After writing all files, commit and push them to the remote repository:

```bash
git add snippet/n8n-workflows/content/snippet-selections/{date}-Python-snippet-candidates.md snippet/n8n-workflows/content/snippet-selections/{date}-JS_TS-snippet-candidates.md snippet/n8n-workflows/content/snippet-selections/{date}-C_Cpp-snippet-candidates.md
git commit -m "chore: add snippet candidates for {date} (issue #{issue_number})"
git push
```

Then output:

> Done. Snippet candidate files written and pushed:
> - `snippet-selections/{date}-Python-snippet-candidates.md`
> - `snippet-selections/{date}-JS_TS-snippet-candidates.md`
> - `snippet-selections/{date}-C_Cpp-snippet-candidates.md`
>
> Next: git pull on your local machine, review the candidates, and run `/find-snippet-candidates-select` to make your picks.
