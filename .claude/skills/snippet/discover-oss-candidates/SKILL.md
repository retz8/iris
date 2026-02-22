---
name: discover-oss-candidates
description: "Snippet newsletter Skill A. Discovers trending OSS repos for Python, JS/TS, and C/C++ and asks the human to select one repo per language for the upcoming week's newsletter. Reads repos.json to show prior usage counts as soft warnings. Validates all repo URLs via browser before presenting. Writes OSS decisions to snippet/n8n-workflows/content/snippet-selections/YYYY-MM-DD.md for Skill B to consume. Use when starting the Sunday Snippet newsletter content generation workflow."
---

# Skill A — Discover OSS Candidates

You are running Steps 1–2 of the Snippet newsletter content generation workflow. Your job is to find trending OSS repos, validate them, present candidates to the human, and save the selections.

## Inputs

Before doing anything, ask the human for:

- `date` — today's date in YYYY-MM-DD format
- `issue_number` — the sequential issue number for this week's newsletter

## Step 1 — Load Prior Usage

Read `snippet/n8n-workflows/content/repos.json`. Build a lookup of `owner/repo → count` to use as soft warnings in Step 3.

If the file is empty (`{}`) or does not exist, continue with no warnings.

## Step 2 — Search for Trending OSS

Use WebSearch to find trending OSS repos for each language. Run multiple targeted queries across Hacker News, Reddit r/programming, GitHub Trending, and dev.to. Collect 5–7 real candidates per language.

Use WebSearch freely across developer news sources — GitHub Trending, Reddit (r/programming, r/python, r/javascript, r/cpp), dev.to, tech blogs, release announcements, and anything else that surfaces active discussion. Do not limit yourself to a fixed list of sources.

For each candidate collect:
- `owner/repo`
- What it does — one sentence
- Why this week — the specific news hook (new release, notable discussion, viral post, etc.)

Exclude: tutorials, blog posts, awesome-lists, aggregator repos, docs-only repos.

## Step 3 — Validate All URLs

Before presenting any candidate, navigate to `https://github.com/{owner}/{repo}` in the browser and confirm the page loads as a real GitHub repository. Remove any candidate that does not resolve.

Do not skip this step. Do not present unvalidated URLs.

## Step 4 — Present Candidates and Ask for Selection

Group validated candidates by language. For each candidate show:

```
N. owner/repo — what it does (why this week: <hook>)
   [used Nx before]  ← only when count > 0 in repos.json
```

Example:

```
## Python (pick 1)

1. astral-sh/uv — fast Python package manager in Rust (new v0.5 release, trending on HN)
2. pydantic/pydantic — data validation library (v2.6 with performance improvements)
   [used 1x before]
3. ...

## JS/TS (pick 1)

1. ...

## C/C++ (pick 1)

1. ...
```

Then ask:

> Which repo do you want to feature for each language this week? Reply with the numbers (e.g. "Python: 2, JS/TS: 1, C/C++: 3").

## Step 5 — Write Snippet Selections File

After the human confirms their picks, write:

**Path:** `snippet/n8n-workflows/content/snippet-selections/{date}.md`

Create the `snippet-selections/` directory if it does not exist.

**Format:**

```markdown
# Snippet Selections — {date}

Issue: {issue_number}
Date: {date}

## Python

- repo: owner/repo
- url: https://github.com/owner/repo
- description: one sentence — what it does and why it's trending this week
- source: HN #39872345

## JS/TS

- repo: owner/repo
- url: https://github.com/owner/repo
- description: ...
- source: github_trending

## C/C++

- repo: owner/repo
- url: https://github.com/owner/repo
- description: ...
- source: HN #39812345
```

`source` is a short freeform note on where the repo surfaced (e.g. `GitHub Trending`, `Reddit r/python`, `release announcement`, etc.). It is informational only — no fixed format required.

After writing, tell the human:

> Done. OSS selections saved to `snippet/n8n-workflows/content/snippet-selections/{date}.md`
> Next: run Skill B (`find-snippet-candidates`) with this file path to find snippet candidates from each repo.
