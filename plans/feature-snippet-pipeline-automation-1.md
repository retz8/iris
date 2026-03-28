---
goal: Automate Snippet Newsletter Pipeline — Phase-Split Skills + Scheduled Triggers
version: 1.0
date_created: 2026-03-28
status: Planned
tags: [feature, automation, skills, scheduling]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Automate the Snippet newsletter content generation pipeline so that token-heavy work (web search, repo exploration, HTML generation) runs unattended at night, and human decisions (repo picks, snippet picks, breakdown approval) happen in the morning as quick file-edit interactions. This eliminates Chrome browser dependencies by rewriting the `snippet-repo-explorer` agent to use the GitHub API, splits all 3 skills into Phase 1 (automated) and Phase 2 (human interaction), and creates scheduled cron triggers for Friday/Saturday/Sunday nights.

## 1. Requirements & Constraints

- **REQ-001**: All Phase 1 skills must run fully unattended with zero human interaction
- **REQ-002**: All Phase 1 skills must have zero Chrome/browser dependency
- **REQ-003**: Phase 2 skills must complete in under 5 minutes of human interaction
- **REQ-004**: Issue numbers auto-increment from a counter file (`snippet/current-issue.txt`)
- **REQ-005**: Date is auto-computed as the current Friday's date (the week's anchor date)
- **REQ-006**: Skill C must skip Gmail automation entirely — write HTML files as the only output
- **REQ-007**: Skill B Phase 1 must run 3 language files in parallel
- **REQ-008**: Skill C Phase 1 must run 3 language files in parallel
- **CON-001**: GitHub API unauthenticated rate limit is 60 requests/hour — `snippet-repo-explorer` must stay within this budget per repo (typically ~5-10 requests per repo: 1 tree + 3-8 file reads)
- **CON-002**: Existing file formats (`{date}-{Language}.md`, `drafts.json`, `repos.json`) must remain unchanged so Phase 2 outputs are compatible with downstream consumers
- **CON-003**: Scheduled triggers run via `claude` CLI subprocess — must use `--dangerously-skip-permissions` flag
- **GUD-001**: Intermediate files (candidates, snippet-candidates, review files) use a consistent naming convention under `snippet-selections/`
- **GUD-002**: Each skill SKILL.md is self-contained — no shared helper scripts between Phase 1 and Phase 2
- **PAT-001**: The existing output format for selection files (as seen in `2026-03-28-Python.md`) is the contract between skills and must not change

## 2. Implementation Steps

### Phase 1 — Rewrite `snippet-repo-explorer` Agent (Remove Chrome Dependency)

- GOAL-001: Replace browser navigation in the `snippet-repo-explorer` agent with GitHub API calls via `WebFetch`, eliminating the Chrome dependency entirely.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Rewrite `.claude/agents/snippet-repo-explorer.md` Step 1 (identify default branch): Replace browser navigation with `WebFetch` to `https://api.github.com/repos/{owner}/{repo}` — extract `default_branch` field from the JSON response. | | |
| TASK-002 | Rewrite `.claude/agents/snippet-repo-explorer.md` Step 2 (browse directory structure): Replace browser file tree browsing with `WebFetch` to `https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1` — parse the JSON `tree` array, filter by `type: "blob"` and target file extensions (`.py`, `.js`, `.ts`, `.tsx`, `.jsx`, `.c`, `.cpp`, `.h`, `.hpp`), apply the existing include/exclude rules (prefer `src/`, `lib/`, `core/`; skip tests, config, entry points). | | |
| TASK-003 | Rewrite `.claude/agents/snippet-repo-explorer.md` Step 3 (extract snippets): Replace "navigate to and open the actual file on GitHub" with `WebFetch` to `https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{file_path}` for each candidate file. Parse the raw file content and extract snippet following existing rules (complete logical unit, >1 min to understand, max 65 chars/line, max 3 nesting levels). | | |
| TASK-004 | Keep Steps 4 (ranking) and Output Format unchanged — they have no browser dependency. | | |
| TASK-005 | Update the agent frontmatter description: remove "Browses a GitHub repository via the browser" and replace with "Explores a GitHub repository via the GitHub API". | | |

### Phase 2 — Update Skill A URL Validation (Remove Chrome Dependency)

- GOAL-002: Replace browser-based URL validation in `discover-oss-candidates` with GitHub API validation.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | In `.claude/skills/discover-oss-candidates/SKILL.md` Step 3, replace "Navigate to `https://github.com/{owner}/{repo}` in the browser and confirm the page loads" with: "Use `WebFetch` to call `https://api.github.com/repos/{owner}/{repo}`. If the response status is 200 and the JSON contains a `full_name` field, the repo is valid. If 404 or error, remove the candidate." | | |

### Phase 3 — Create `current-issue.txt` Counter File

- GOAL-003: Establish an auto-incrementing issue counter so scheduled Phase 1 runs can determine the issue number without human input.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Create `snippet/current-issue.txt` containing the single integer `8` (next issue, since issue 7 is the most recent completed). No trailing newline, no formatting — just the number. | | |

### Phase 4 — Split Skill A into Phase 1 + Phase 2

- GOAL-004: Split `discover-oss-candidates` into a fully automated Phase 1 (discovery + validation + write candidates file) and a quick interactive Phase 2 (read picks + write selection files).

**Phase 1 skill: `.claude/skills/discover-oss-candidates/SKILL.md` (replace existing)**

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Rewrite Skill A as Phase 1 only. The skill: (1) reads `snippet/current-issue.txt` for `issue_number`, (2) computes `date` as current date in YYYY-MM-DD format, (3) loads `repos.json` for usage warnings, (4) searches for trending OSS repos (5-7 per language) via `WebSearch`, (5) validates all repos via GitHub API (TASK-006 logic), (6) writes a single candidates file to `snippet/n8n-workflows/content/snippet-selections/{date}-candidates.md`. The skill does NOT ask the human for any input. It does NOT ask for date or issue_number. It does NOT ask for repo picks. It writes the candidates file and stops. | | |
| TASK-009 | Define the candidates file format. File: `{date}-candidates.md`. Contents: | | |

Candidates file format for TASK-009:

```markdown
# OSS Candidates — {date} — Issue #{issue_number}

Issue: #{issue_number}
Date: {date}
Status: PENDING_SELECTION

## Python

1. owner/repo — what it does (why this week: <hook>)
   [used Nx before]
2. owner/repo — ...
3. ...

## JS/TS

1. ...

## C/C++

1. ...
```

**Phase 2 skill: `.claude/skills/discover-oss-candidates-select/SKILL.md` (new file)**

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Create a new skill `discover-oss-candidates-select`. The skill: (1) finds the latest `*-candidates.md` file in `snippet-selections/` by sorting filenames descending, (2) reads it and displays the candidates to the human, (3) asks "Pick 2 repos for each language", (4) writes 3 selection files (`{date}-Python.md`, `{date}-JS_TS.md`, `{date}-C_Cpp.md`) using the existing format (PAT-001), (5) increments `snippet/current-issue.txt` by 1, (6) updates the candidates file `Status:` line from `PENDING_SELECTION` to `COMPLETED`. | | |

### Phase 5 — Split Skill B into Phase 1 + Phase 2

- GOAL-005: Split `find-snippet-candidates` into a fully automated Phase 1 (sub-agents explore repos + write snippet candidate files) and a quick interactive Phase 2 (read picks + append to selection files).

**Phase 1 skill: `.claude/skills/find-snippet-candidates/SKILL.md` (replace existing)**

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Rewrite Skill B as Phase 1 only. The skill: (1) finds the 3 latest selection files (`{date}-Python.md`, `{date}-JS_TS.md`, `{date}-C_Cpp.md`) in `snippet-selections/` that do NOT yet contain a `## Snippet Selections` section (i.e., Phase 2 hasn't run yet), (2) for each language file, reads it and extracts the 2 repos, (3) spawns 2 `snippet-repo-explorer` sub-agents per language (6 total, in parallel — all 3 languages at once per REQ-007), (4) for each language, writes a snippet candidates file to `snippet/n8n-workflows/content/snippet-selections/{date}-{Language}-snippet-candidates.md`, (5) stops without asking the human anything. | | |
| TASK-012 | Define the snippet candidates file format. File: `{date}-{Language}-snippet-candidates.md`. | | |

Snippet candidates file format for TASK-012:

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

```{language}
<verbatim code>
```

### Candidate 2

...

### Candidate 3 (least important)

...

## Repo 2 — owner/repo

### Candidate 1 (most important)

...
```

**Phase 2 skill: `.claude/skills/find-snippet-candidates-select/SKILL.md` (new file)**

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Create a new skill `find-snippet-candidates-select`. The skill: (1) finds the latest `*-snippet-candidates.md` files in `snippet-selections/` with `Status: PENDING_SELECTION`, (2) for each language, displays the candidates grouped by repo, (3) asks "Which candidate for each repo?", (4) verifies each selected snippet_url via `WebFetch` to `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}` — confirms the file exists and contains the expected code, (5) appends `## Snippet Selections` to the corresponding `{date}-{Language}.md` selection file using the existing format (PAT-001), (6) updates the snippet candidates file `Status:` line from `PENDING_SELECTION` to `COMPLETED`. | | |

### Phase 6 — Split Skill C into Phase 1 + Phase 2

- GOAL-006: Split `generate-snippet-draft` into a fully automated Phase 1 (reformat + research + generate breakdowns + write review files) and a quick interactive Phase 2 (confirm breakdowns + write JSON + generate HTML).

**Phase 1 skill: `.claude/skills/generate-snippet-draft/SKILL.md` (replace existing)**

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | Rewrite Skill C as Phase 1 only. The skill: (1) finds the 3 latest selection files (`{date}-{Language}.md`) in `snippet-selections/` that contain a `## Snippet Selections` section but do NOT yet have a corresponding review file, (2) for each language file, reads it and extracts repos, snippets, and metadata, (3) reformats snippets for mobile (max 65 chars/line, max 3 nesting levels — logic changes only: line breaks, indentation, long line breaks), (4) researches each repo via `WebSearch` for project context, (5) generates breakdowns (`file_intent`, `breakdown_what`, `breakdown_responsibility`, `breakdown_clever`, `project_context`), (6) runs self-refinement quality check (existing Step 7 logic), (7) writes a review file to `snippet/n8n-workflows/content/snippet-selections/{date}-{Language}-review.md`, (8) stops without asking the human anything. Runs all 3 languages in parallel per REQ-008. | | |
| TASK-015 | Define the review file format. File: `{date}-{Language}-review.md`. | | |

Review file format for TASK-015:

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

```{language}
<reformatted snippet>
```

## Repo 2 — owner/repo

...
```

**Phase 2 skill: `.claude/skills/generate-snippet-draft-select/SKILL.md` (new file)**

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Create a new skill `generate-snippet-draft-select`. The skill: (1) finds the latest `*-review.md` files in `snippet-selections/` with `Status: PENDING_APPROVAL`, (2) for each language, displays the breakdowns to the human, (3) asks "Do these breakdowns read well? Reply 'go ahead' or give feedback", (4) if feedback, revises and re-presents until approved, (5) builds JSON draft objects (existing Step 8a schema), (6) appends to `drafts.json` (Step 8b), (7) updates `repos.json` (Step 8c), (8) spawns 2 `snippet-html-generator` sub-agents per language (Step 9), (9) writes HTML files to `html-drafts/{date}-{Language}-Repo-{1,2}.html` (Step 10 fallback path — no Gmail), (10) updates the review file `Status:` line from `PENDING_APPROVAL` to `COMPLETED`. | | |

### Phase 7 — Create Scheduled Cron Triggers

- GOAL-007: Set up 3 cron-scheduled triggers that run Phase 1 skills on Friday, Saturday, and Sunday nights at 11pm KST.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Create a scheduled trigger for Friday 11pm KST: runs `claude --dangerously-skip-permissions -p "Run /discover-oss-candidates"` in the `/Users/jiohin/Desktop/Projects/iris` project directory. Cron expression: `0 23 * * 5` (Asia/Seoul timezone). | | |
| TASK-018 | Create a scheduled trigger for Saturday 11pm KST: runs `claude --dangerously-skip-permissions -p "Run /find-snippet-candidates"` in the `/Users/jiohin/Desktop/Projects/iris` project directory. Cron expression: `0 23 * * 6` (Asia/Seoul timezone). | | |
| TASK-019 | Create a scheduled trigger for Sunday 11pm KST: runs `claude --dangerously-skip-permissions -p "Run /generate-snippet-draft"` in the `/Users/jiohin/Desktop/Projects/iris` project directory. Cron expression: `0 23 * * 0` (Asia/Seoul timezone). | | |
| TASK-020 | Verify all 3 triggers are registered by running `/schedule list`. | | |

## 3. Alternatives

- **ALT-001**: Single-session approach (no skill split) — schedule skills to run at night, stay alive waiting for mobile input. Rejected because RemoteTrigger sessions may timeout after hours of inactivity.
- **ALT-002**: Keep Chrome dependency, require Chrome to be running on schedule nights. Rejected because it adds a manual dependency (remembering to open Chrome) and is fragile for headless/remote execution.
- **ALT-003**: Modify skills to accept parameters via CLI args instead of asking. Rejected because Phase 1/Phase 2 split is cleaner and supports the file-based review workflow that lets you read candidates at your own pace.
- **ALT-004**: Use `gh` CLI instead of GitHub REST API. Rejected because `gh` requires authentication setup while the REST API works unauthenticated for public repos.

## 4. Dependencies

- **DEP-001**: `WebFetch` tool must support calling `https://api.github.com/` and `https://raw.githubusercontent.com/` endpoints
- **DEP-002**: `WebSearch` tool must be available in scheduled sessions (no Chrome dependency — WebSearch uses a dedicated search API, not the browser)
- **DEP-003**: `snippet-html-generator` agent has zero browser dependency (confirmed: it only generates HTML strings) — no changes needed
- **DEP-004**: `snippet-persona` agent is unused in the automated pipeline — no changes needed
- **DEP-005**: Claude Code `/schedule` feature must support cron expressions with timezone

## 5. Files

**Modified files:**

- **FILE-001**: `.claude/agents/snippet-repo-explorer.md` — rewrite Steps 1-3 to use GitHub API (TASK-001 through TASK-005)
- **FILE-002**: `.claude/skills/discover-oss-candidates/SKILL.md` — replace with Phase 1 version (TASK-006, TASK-008, TASK-009)
- **FILE-003**: `.claude/skills/find-snippet-candidates/SKILL.md` — replace with Phase 1 version (TASK-011, TASK-012)
- **FILE-004**: `.claude/skills/generate-snippet-draft/SKILL.md` — replace with Phase 1 version (TASK-014, TASK-015)

**New files:**

- **FILE-005**: `.claude/skills/discover-oss-candidates-select/SKILL.md` — Phase 2 for Skill A (TASK-010)
- **FILE-006**: `.claude/skills/find-snippet-candidates-select/SKILL.md` — Phase 2 for Skill B (TASK-013)
- **FILE-007**: `.claude/skills/generate-snippet-draft-select/SKILL.md` — Phase 2 for Skill C (TASK-016)
- **FILE-008**: `snippet/current-issue.txt` — issue counter, initial value `8` (TASK-007)

## 6. Testing

- **TEST-001**: After TASK-005 — manually invoke `snippet-repo-explorer` agent with a known repo (e.g., `https://github.com/astral-sh/uv`, language `Python`) and verify it returns 3 ranked candidates with valid `snippet_url` values, all without launching Chrome
- **TEST-002**: After TASK-009 — manually run `/discover-oss-candidates` and verify it writes a valid `{date}-candidates.md` file without asking for any human input, and without launching Chrome
- **TEST-003**: After TASK-010 — manually run `/discover-oss-candidates-select`, verify it reads the candidates file, accepts picks, and writes 3 valid selection files in the existing format
- **TEST-004**: After TASK-012 — manually run `/find-snippet-candidates` and verify it reads selection files, spawns sub-agents, and writes 3 snippet candidate files without asking for human input
- **TEST-005**: After TASK-013 — manually run `/find-snippet-candidates-select`, verify it reads snippet candidates, accepts picks, and appends `## Snippet Selections` to the selection files
- **TEST-006**: After TASK-015 — manually run `/generate-snippet-draft` and verify it reads completed selection files, generates breakdowns, and writes 3 review files without asking for human input
- **TEST-007**: After TASK-016 — manually run `/generate-snippet-draft-select`, verify it reads review files, accepts approval, writes to `drafts.json`, `repos.json`, and generates HTML files
- **TEST-008**: After TASK-020 — run `/schedule list` and verify all 3 cron triggers are registered with correct cron expressions and timezone

## 7. Risks & Assumptions

- **RISK-001**: GitHub API unauthenticated rate limit (60 req/hr) may be insufficient if `snippet-repo-explorer` needs to read many files to find good candidates. Mitigation: the agent reads ~5-10 files per repo (1 tree + 3-8 file reads), totaling ~30-60 requests across all 6 repos — within the limit. If exceeded, the agent should log a warning and skip remaining candidates gracefully.
- **RISK-002**: Some repos may have very large file trees that exceed the GitHub API response size. Mitigation: the `?recursive=1` tree endpoint truncates at 100K entries and returns `truncated: true` — the agent should handle this by falling back to non-recursive tree traversal of target directories (`src/`, `lib/`, etc.).
- **RISK-003**: `WebFetch` may add headers or handle responses differently than raw HTTP. Assumption: `WebFetch` returns the full response body for API JSON endpoints and raw file content.
- **ASSUMPTION-001**: The Mac at home stays awake and connected at 11pm Fri/Sat/Sun for scheduled triggers to fire. The existing VS Code tunnel infrastructure handles this.
- **ASSUMPTION-002**: `WebSearch` works in scheduled sessions without Chrome — it uses a dedicated search API, not the browser.
- **ASSUMPTION-003**: `/schedule` supports `Asia/Seoul` timezone or equivalent UTC offset (`UTC+9`, meaning `0 14 * * 5` UTC for Friday 11pm KST).

## 8. Related Specifications / Further Reading

- Existing skill files: `.claude/skills/discover-oss-candidates/SKILL.md`, `.claude/skills/find-snippet-candidates/SKILL.md`, `.claude/skills/generate-snippet-draft/SKILL.md`
- Existing agent files: `.claude/agents/snippet-repo-explorer.md`, `.claude/agents/snippet-html-generator.md`
- Content state: `.claude/projects/-Users-jiohin-Desktop-Projects-iris/memory/snippet-newsletter.md`
- GitHub REST API docs: https://docs.github.com/en/rest/repos/repos, https://docs.github.com/en/rest/git/trees
