# Hotfix — Automate Newsletter Content Generation

**Type:** Hotfix
**Scope:** Build a Claude Code skill that automates the Sunday manual content generation workflow (Steps 1–7 in `manual-content-generation.md`) and persists each draft's structured data as JSON for future archive use.

**Dependencies:** None

**Deliverables:**
- `.claude/skills/generate-snippet-drafts/` — a Claude Code skill that runs the full content generation pipeline and outputs Gmail-ready HTML per language
- `snippet/n8n-workflows/content/drafts.json` — append-only JSON archive recording structured data for every generated draft (one entry per language per week)

**Out of scope:**
- Automatically creating Gmail drafts via API — human still pastes HTML into Gmail
- Modifying the n8n send workflow
- Building the web app archive page — that is a future phase track
- Changing the Google Sheets schema or workflow

**Skills:**
- `claude-ecosystem` — for authoring the SKILL.md format correctly and understanding how Claude Code skills are structured
- `skill-creator` — for scaffolding the new `generate-snippet-drafts` skill following the canonical skill structure

---

## Phase 1 — Explore

Read the following files in order:

0. `./README.md` — understand the workflow
1. `snippet/n8n-workflows/content/manual-content-generation.md` — read all 7 steps carefully; this is the exact process the skill must automate
2. `snippet/schema/google-sheets-drafts-schema.md` — understand what structured fields already exist per draft row; the JSON archive must align with this schema
3. `snippet/n8n-workflows/content/drafts.json` — if it exists, read the current archive structure; if not, note that it must be created

After reading, answer these questions:

- What are the exact inputs the skill needs from the human at start (date, language list, issue number)?
- Which steps in the manual workflow require web search, and which are pure LLM inference over provided text?
- Steps 3–5 chain prompts in a single conversation — how should the skill structure these as sequential tool calls?
- What fields from Step 5's JSON output map directly to the `google-sheets-drafts-schema.md` columns?
- What additional fields (beyond the Sheets schema) are worth storing in the JSON archive for future archive page use?
- Where should `drafts.json` live and what should one entry look like?

---

## Phase 2 — Discuss

Surface findings to the human engineer and make decisions together:

1. Clarify the skill's entry point: does the human run it once for all 3 languages, or once per language? Discuss the UX tradeoff.
2. Discuss how Step 1 (repo discovery) is handled — the current process uses Claude.ai with web search enabled. In Claude Code, the `WebSearch` tool is available. Confirm this is the right approach and that the skill should run repo discovery autonomously.
3. Discuss what "record in JSON" means: append to `drafts.json` in the repo, or output a separate file per run? Agree on the schema for one archive entry.
4. Confirm whether the skill should produce the full HTML email (Step 6) or stop at the JSON (Step 5) and let the human run Step 6 manually in Claude.ai.
5. Confirm whether Step 7 (copy refinement) is part of the skill or remains manual.

Do not proceed to Plan until the human engineer confirms the skill's input/output contract and the JSON archive schema.

## Decisions

**Input contract:** The skill takes three inputs — `date`, `issue_number`, `language`. It runs once per language; the human runs it three times on Sunday (one invocation per language).

**`drafts.json` schema** (`snippet/n8n-workflows/content/drafts.json`, append-only array):

```json
[
  {
    "issue_number": 42,
    "language": "Python",
    "week_date": "2026-02-22",
    "repo_full_name": "owner/repo",
    "repository_url": "https://github.com/owner/repo",
    "repository_description": "Why this repo is trending this week",
    "source": "HN #39872345",
    "file_path": "src/core/parser.py",
    "snippet_url": "https://github.com/owner/repo/blob/main/src/core/parser.py",
    "file_intent": "Bash command validation hook",
    "snippet": "def parse_args(...):\n    ...",
    "breakdown_what": "...",
    "breakdown_responsibility": "...",
    "breakdown_clever": "...",
    "project_context": "...",
    "created_at": "2026-02-22T10:00:00Z"
  }
]
```

`snippet_url` is constructed by the skill from `repo_full_name` + `file_path`. Serves both Gmail HTML generation and the future React archive page.

**`repos.json` schema** (`snippet/n8n-workflows/content/repos.json`, keyed object):

```json
{
  "anthropics/claude-code": {
    "count": 2,
    "snippets": [
      "anthropics/claude-code/blob/main/src/commands/parse.ts",
      "anthropics/claude-code/blob/main/src/core/agent.ts"
    ]
  }
}
```

Key is `owner/repo` (no `github.com/` prefix). Snippets use the same format — no domain prefix. Used by the skill to avoid re-featuring repos. Deduplication behavior (hard exclusion vs. soft warning) TBD.

---

## Phase 3 — Plan

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/hotfix-automate-content-generation/`.

The plan should cover:
- SKILL.md definition: trigger phrase, required inputs, step-by-step instructions for the agent
- The repo discovery prompt (Step 1) adapted for autonomous execution with WebSearch
- The snippet extraction prompt (Step 2) adapted for Claude Code tool use
- The chained prompts for Steps 3–5 (reformat → breakdown → JSON export)
- The HTML generation step (Step 6) if confirmed in Phase 2
- The JSON archive append logic: reading `drafts.json`, appending the new entry, writing back
- What the skill outputs at the end (files written, what to copy into Gmail)

---

## Phase 4 — Execute

Use the `skill-creator` skill to scaffold `.claude/skills/generate-snippet-drafts/SKILL.md`, then fill in the content per the agreed plan.

Write or update `snippet/n8n-workflows/content/drafts.json` with the agreed schema (empty array `[]` if starting fresh).

Update `snippet/n8n-workflows/content/manual-content-generation.md` to note that this process is now automated via the skill, and link to the skill.

Verification:
- SKILL.md is readable top-to-bottom as a standalone agent prompt — a new session with no prior context should be able to start immediately
- The JSON archive schema covers all fields needed for a future archive page (language, repo, snippet metadata, issue number, date)
- The skill's output section clearly tells the human what to do next (paste HTML into Gmail, fill scheduled_day in Sheets)
