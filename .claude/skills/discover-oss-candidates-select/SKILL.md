---
name: discover-oss-candidates-select
description: "Snippet newsletter Skill A — Phase 2. Interactive. Reads the latest candidates file written by /discover-oss-candidates, presents repo options to the human, writes 3 selection files (one per language), increments the issue counter. Run Saturday morning after reviewing the Friday night candidates file."
---

# Skill A Phase 2 — Select OSS Candidates

You are completing the first step of the Snippet newsletter content generation pipeline. The automated Phase 1 has already discovered and validated repo candidates. Your job is to present them to the human, record their picks, and write the selection files.

## Step 1 — Find the Latest Candidates File

List all files in `snippet/n8n-workflows/content/snippet-selections/` matching the pattern `*-candidates.md`. Sort by filename descending. Read the first (most recent) file.

Extract `issue_number` and `date` from the file header.

If no candidates file exists or the file `Status:` line is `COMPLETED`, tell the human:
> No pending candidates file found. Run `/discover-oss-candidates` first.

Then stop.

## Step 2 — Present Candidates and Ask for Selection

Display the full contents of the candidates file to the human. Then ask:

> Pick 2 repos for each language. Reply with the numbers (e.g. "Python: 1, 3 — JS/TS: 2, 4 — C/C++: 1, 2").

## Step 3 — Write Selection Files

After the human confirms their picks, write 3 separate files — one per language.

**File paths:**
- `snippet/n8n-workflows/content/snippet-selections/{date}-Python.md`
- `snippet/n8n-workflows/content/snippet-selections/{date}-JS_TS.md`
- `snippet/n8n-workflows/content/snippet-selections/{date}-C_Cpp.md`

**File format (same structure for all 3):**

```markdown
# Snippet Selections — {date} — {Language}

Issue: #{issue_number}
Date: {date}
Language: {Language}

## Repo 1

- repo: owner/repo
- url: https://github.com/owner/repo
- description: one sentence — what it does and why it's trending this week
- source: <where it surfaced>

## Repo 2

- repo: owner/repo
- url: https://github.com/owner/repo
- description: ...
- source: ...
```

Extract `description` and `source` from the candidates file entry for each selected repo.

## Step 4 — Increment Issue Counter and Mark Complete

Read `snippet/current-issue.txt`. Increment the integer by 1. Write it back to the file.

Update the candidates file: change `Status: PENDING_SELECTION` to `Status: COMPLETED`.

## Step 5 — Report

Tell the human:

> Done. 3 selection files written:
> - `snippet-selections/{date}-Python.md`
> - `snippet-selections/{date}-JS_TS.md`
> - `snippet-selections/{date}-C_Cpp.md`
>
> Issue counter incremented to {new_issue_number}.
>
> Next: wait for Saturday night's automated run of `/find-snippet-candidates`, or run it manually now.
