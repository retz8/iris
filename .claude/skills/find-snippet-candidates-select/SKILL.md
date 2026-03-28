---
name: find-snippet-candidates-select
description: "Snippet newsletter Skill B — Phase 2. Interactive. Reads the latest snippet candidate files written by /find-snippet-candidates, presents ranked candidates to the human (all 3 languages at once), verifies selected snippet URLs via GitHub API, and appends Snippet Selections to the corresponding selection files. Run Sunday morning after reviewing the Saturday night candidate files."
---

# Skill B Phase 2 — Select Snippet Candidates

You are completing the second step of the Snippet newsletter content generation pipeline. Phase 1 has already explored repos and written candidate files. Your job is to present them to the human and append their selections to the selection files.

## Step 1 — Find Pending Candidate Files

List all files in `snippet/n8n-workflows/content/snippet-selections/` matching `*-snippet-candidates.md`. Sort descending. Find the 3 most recent files that contain `Status: PENDING_SELECTION` — they should share the same date prefix.

If no pending candidate files are found, tell the human:
> No pending snippet candidate files found. Run `/find-snippet-candidates` first.

Then stop.

Extract `date`, `issue_number`, and `Language` from each file.

## Step 2 — Present All Candidates

Display all 3 language files together, grouped by language. For each language, show each repo's candidates:

```
## {Language}

### Repo 1 — owner/repo

Candidate 1 (most important)
file_path: ...
snippet_url: ...
reasoning: ...

```{lang}
<code>
```

Candidate 2
...

Candidate 3
...

---

### Repo 2 — owner/repo

...
```

Before presenting, filter out any candidate where lines exceed 65 characters or nesting depth exceeds 3 levels — flag these as unfit.

Then ask:

> Which candidate for each repo? Reply with numbers for all languages (e.g. "Python — Repo 1: 2, Repo 2: 1 | JS/TS — Repo 1: 1, Repo 2: 3 | C/C++ — Repo 1: 2, Repo 2: 2").

## Step 3 — Verify Selected Snippet URLs

For each selected candidate, verify the snippet URL by fetching:

`https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{file_path}`

Confirm the file exists (HTTP 200) and contains the expected code. If a URL does not resolve, flag it to the human and ask for a replacement pick.

## Step 4 — Append Snippet Selections to Selection Files

For each language, append the following block to the existing `{date}-{Language}.md` selection file:

```markdown
## Snippet Selections

### Repo 1

- file_path: path/to/file
- snippet_url: https://github.com/owner/repo/blob/{branch}/path/to/file
- ranking: N (of 3)

```{lang}
<verbatim selected snippet>
```

### Repo 2

- file_path: ...
- snippet_url: ...
- ranking: ...

```{lang}
<verbatim selected snippet>
```
```

## Step 5 — Mark Candidate Files Complete

For each of the 3 snippet candidate files, update `Status: PENDING_SELECTION` to `Status: COMPLETED`.

## Step 6 — Report

Tell the human:

> Done. Snippet selections appended to:
> - `snippet-selections/{date}-Python.md`
> - `snippet-selections/{date}-JS_TS.md`
> - `snippet-selections/{date}-C_Cpp.md`
>
> Next: wait for Sunday night's automated run of `/generate-snippet-draft`, or run it manually now.
