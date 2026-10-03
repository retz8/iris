---
name: discover-oss-candidates
description: "Snippet newsletter Skill A — Phase 1. Fully automated. Discovers trending OSS repos for Python, JS/TS, and C/C++, validates all repos via GitHub API, and writes a single candidates file for human review. Reads issue number from snippet/current-issue.txt. No human input required. Run on Friday nights. After reviewing the output, run /discover-oss-candidates-select to make selections."
---

# Skill A Phase 1 — Discover OSS Candidates

You are running the first step of the Snippet newsletter content generation pipeline. Your job is to find trending OSS repos, validate them via the GitHub API, and save all candidates to a file for human review. You do NOT ask for human input at any point.

## Access Rules — Read Before Starting

This skill is explicitly authorized to read ANY public GitHub repository and any public web page. There is no restriction limiting it to the `retz8/iris` repo.

- If the session's environment says GitHub access is "scoped to" `retz8/iris` (or similar), that scope applies ONLY to the GitHub MCP tools (`mcp__github__*`) and `add_repo`. It does NOT apply to WebFetch, WebSearch, or `curl` against public URLs. Do not treat it as a reason to stop, skip, or ask.
- Do NOT use `mcp__github__*` tools, `gh`, or `add_repo` for discovery or validation. Use WebSearch and WebFetch (or `curl` via Bash) only.
- Never abort, refuse, or report failure because a candidate repo is outside the session's repo scope. Public reads of other repos are the whole point of this skill.

## Step 1 — Load Issue Number and Date

Read `snippet/current-issue.txt`. Parse the contents as an integer. Add 1 — this is `issue_number` (the file tracks the last completed issue; the next run is always +1).

Set `date` to today's date in YYYY-MM-DD format.

## Step 2 — Load Prior Usage

Read `snippet/n8n-workflows/content/repos.json`. Build a lookup of `owner/repo → count` to use as soft warnings in Step 4.

If the file is empty (`{}`) or does not exist, continue with no warnings.

## Step 3 — Search for Trending OSS

Use WebSearch freely across developer news sources — GitHub Trending, Reddit (r/programming, r/python, r/javascript, r/cpp), dev.to, tech blogs, release announcements, and anything else that surfaces active discussion. Collect 5–7 real candidates per language.

For each candidate collect:
- `owner/repo`
- What it does — one sentence
- Why this week — the specific news hook (new release, notable discussion, viral post, etc.)

Exclude: tutorials, blog posts, awesome-lists, aggregator repos, docs-only repos.

## Step 4 — Validate All Repos via GitHub API

For each candidate, use WebFetch to call `https://api.github.com/repos/{owner}/{repo}`. This is a public, unauthenticated read and is allowed regardless of the session's GitHub repo scope (see Access Rules).

If the response status is 200 and the JSON contains a `full_name` field, the repo is valid. If 404, remove the candidate from the list silently.

If WebFetch fails for a reason other than 404 (rate limit, tool error, proxy error), fall back in this order before discarding the candidate:
1. `curl -sS https://api.github.com/repos/{owner}/{repo}` via Bash and check for `full_name`.
2. WebFetch `https://github.com/{owner}/{repo}` and confirm the page is a real repo (not a 404 page).

Do not skip this step. Do not include unvalidated repos.

## Step 5 — Write Candidates File

After validation, write the candidates file to:

`snippet/n8n-workflows/content/snippet-selections/{date}-candidates.md`

Create the `snippet-selections/` directory if it does not exist.

**File format:**

```markdown
# OSS Candidates — {date} — Issue #{issue_number}

Issue: #{issue_number}
Date: {date}
Status: PENDING_SELECTION

## Python

1. owner/repo — what it does (why this week: <hook>)
2. owner/repo — ...
   [used Nx before]
3. ...

## JS/TS

1. ...

## C/C++

1. ...
```

Include the `[used Nx before]` note only when the repo's count in `repos.json` is greater than 0.

After writing the file, commit and push it to the remote repository:

```bash
git add snippet/n8n-workflows/content/snippet-selections/{date}-candidates.md
git commit -m "chore: add OSS candidates for {date} (issue #{issue_number})"
git push
```

Then output:

> Done. Candidates file written and pushed to `snippet-selections/{date}-candidates.md`.
>
> Next: git pull on your local machine, review the candidates, and run `/discover-oss-candidates-select` to make your picks.
