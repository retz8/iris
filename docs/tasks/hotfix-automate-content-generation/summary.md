# Summary — Hotfix: Automate Newsletter Content Generation

## What Was Built

Replaced the Sunday manual content generation workflow with three Claude Code skills and two sub-agents. The process previously required copy-pasting 7 prompts across Claude.ai sessions. It is now fully automated from repo discovery through Gmail draft creation.

## Architecture

Three separate sessions with human decision gates between each:

**Skill A** (`discover-oss-candidates`) — Runs Steps 1–2. Takes `(date, issue_number)` as input. Uses WebSearch to find trending OSS repos for Python, JS/TS, and C/C++, validates all URLs via browser, shows prior usage counts from `repos.json`, and asks the human to pick one repo per language. Creates `snippet/n8n-workflows/content/snippet-selections/YYYY-MM-DD.md`.

**Skill B** (`find-snippet-candidates`) — Runs Step 3. Reads the selections file, spawns 3 parallel `snippet-repo-explorer` sub-agents to browse each GitHub repo and return 3 ranked snippet candidates per language, verifies selected URLs, and appends the chosen snippets to the same file.

**Skill C** (`generate-snippet-draft`) — Runs Steps 4–9. Reads the completed selections file, reformats all 3 snippets for mobile, researches repos via WebSearch for project context, generates and self-refines breakdowns (including the subscriber comprehension check), asks human to confirm, writes `drafts.json` and `repos.json`, spawns 3 parallel `snippet-html-generator` sub-agents, then writes 3 Gmail drafts via browser JS injection.

## Sub-Agents

**`snippet-repo-explorer`** — Browser-based. Navigates GitHub, detects the default branch, opens actual files before extracting, returns 3 verbatim snippet candidates ranked by importance. Used by Skill B.

**`snippet-html-generator`** — Text-based. Applies VS Code Light theme syntax highlighting token-by-token, fills the fixed HTML email template, and returns subject + complete HTML. Used by Skill C.

## Data Files

| File | Purpose |
|---|---|
| `snippet/n8n-workflows/content/snippet-selections/YYYY-MM-DD.md` | Handoff file — Skill A creates, Skill B appends, Skill C reads |
| `snippet/n8n-workflows/content/drafts.json` | Append-only archive of all generated drafts (one entry per language per issue) |
| `snippet/n8n-workflows/content/repos.json` | Repo usage map — soft warning deduplication, keyed by `owner/repo` |

## Key Decisions

- One skill per session, not all-in-one — keeps context clean and allows independent re-runs
- `snippet-selections/YYYY-MM-DD.md` is a single progressively-written file shared across A, B, C
- `repos.json` deduplication is soft warning only — usage count shown to human, no hard exclusion
- `drafts.json` and `repos.json` written after human confirms breakdowns in Skill C (Step 7)
- Gmail drafts written via `document.querySelector('.Am.Al.editable').innerHTML` JS injection

## Files Created or Modified

- `.claude/skills/snippet/discover-oss-candidates/SKILL.md` — new
- `.claude/skills/snippet/find-snippet-candidates/SKILL.md` — new
- `.claude/skills/snippet/generate-snippet-draft/SKILL.md` — new
- `.claude/agents/snippet-repo-explorer.md` — new
- `.claude/agents/snippet-html-generator.md` — new
- `snippet/n8n-workflows/content/drafts.json` — new (empty array)
- `snippet/n8n-workflows/content/repos.json` — new (empty object)
- `snippet/n8n-workflows/content/manual-content-generation.md` — marked as automated
- `docs/tasks/hotfix-automate-content-generation.md` — phase 2 decisions recorded
