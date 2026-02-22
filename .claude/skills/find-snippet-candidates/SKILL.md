---
name: find-snippet-candidates
description: "Snippet newsletter Skill B. Reads the OSS selections written by Skill A from snippet/n8n-workflows/content/snippet-selections/YYYY-MM-DD.md, spawns 3 parallel snippet-repo-explorer sub-agents to browse each GitHub repo and find ranked snippet candidates, presents all candidates to the human, and appends the selected snippets back to the same file for Skill C to consume. Use after running discover-oss-candidates (Skill A) and confirming the OSS selections."
---

# Skill B — Find Snippet Candidates

You are running Step 3 of the Snippet newsletter content generation workflow. Your job is to explore each selected repo in parallel, surface ranked snippet candidates, let the human pick one per repo, and record the selections.

## Input

Ask the human for the path to the snippet-selections file written by Skill A:

```
snippet/n8n-workflows/content/snippet-selections/YYYY-MM-DD.md
```

Read the file and extract the three selected repos (Python, JS/TS, C/C++) — their `repo`, `url`, and language.

## Step 1 — Run 3 Parallel Sub-Agents

Spawn three `snippet-repo-explorer` sub-agents in parallel — one per repo. Pass each agent:
- `repo_url` — the full GitHub URL from the selections file
- `language` — the programming language for that repo

Wait for all three to complete before proceeding.

## Step 2 — Present All Candidates to the Human

Before presenting, check each candidate: a snippet must be a single function, method, or tightly coupled block — not an entire file. Any candidate where lines exceed 65 characters or nesting depth exceeds 3 levels is unfit for mobile. Flag unfit candidates and exclude them from the options shown to the human.

Display all results grouped by language. For each repo show the ranked candidates returned by the sub-agent. Use this format:

```
## Python — owner/repo

Candidate 1 (most important)
file_path: src/core/parser.py
snippet_url: https://github.com/owner/repo/blob/main/src/core/parser.py
reasoning: <sub-agent reasoning>

```python
<code>
```

Candidate 2
...

Candidate 3 (least important)
...

---

## JS/TS — owner/repo

...

---

## C/C++ — owner/repo

...
```

Then ask:

> Which candidate do you want to feature for each language? Reply with the numbers (e.g. "Python: 2, JS/TS: 1, C/C++: 3").

## Step 3 — Verify Selected Snippet URLs

Before writing, navigate to the `snippet_url` of each selected candidate in the browser to confirm the URL resolves and the file contains the expected code. If a URL does not resolve, flag it to the human and ask for a replacement pick.

## Step 4 — Append Snippet Selections to File

Append the following block to the existing `snippet-selections/YYYY-MM-DD.md` file:

```markdown
## Snippet Selections

### Python

- file_path: path/to/file.py
- snippet_url: https://github.com/owner/repo/blob/{branch}/path/to/file.py
- ranking: 1 (of 3)

```python
<verbatim selected snippet>
```

### JS/TS

- file_path: ...
- snippet_url: ...
- ranking: ...

```typescript
<verbatim selected snippet>
```

### C/C++

- file_path: ...
- snippet_url: ...
- ranking: ...

```cpp
<verbatim selected snippet>
```
```

After writing, tell the human:

> Snippet selections appended to `snippet-selections/{date}.md`
> Next: run Skill C (`generate-snippet-draft`) with this file path to generate breakdowns and Gmail drafts.
