# Snippet Newsletter Pipeline

Automated content generation for the Snippet newsletter. Heavy work (repo discovery, code exploration, breakdown generation) runs unattended at night. Human decisions (picking repos, picking snippets, approving breakdowns) happen in the morning as quick interactions.

## Weekly Schedule

```
Fri 11pm KST   AUTO   /discover-oss-candidates runs in cloud
                       → searches trending repos, validates via GitHub API
                       → writes candidates file, pushes to GitHub

Sat morning    YOU    git pull → run /discover-oss-candidates-select (~2 min)
                       → review candidates, pick 2 repos per language
                       → selection files written

Sat 11pm KST   MANUAL run /find-snippet-candidates before bed
               (AUTO when on Max plan)
                       → 6 sub-agents explore repos via GitHub API
                       → writes snippet candidate files, pushes to GitHub

Sun morning    YOU    git pull → run /find-snippet-candidates-select (~5 min)
                       → review ranked snippet candidates for all 3 languages
                       → selections appended to files

Sun 11pm KST   MANUAL run /generate-snippet-draft before bed
               (AUTO when on Max plan)
                       → reformats snippets, researches repos, generates breakdowns
                       → writes review files, pushes to GitHub

Mon morning    YOU    git pull → run /generate-snippet-draft-select (~5 min)
                       → approve or give feedback on breakdowns
                       → HTML drafts written to html-drafts/
```

## Skills Reference

### Phase 1 — Automated (run at night)

| Skill | When | What it does |
|-------|------|--------------|
| `/discover-oss-candidates` | Friday night | Searches GitHub Trending + dev news, validates repos via GitHub API, writes `{date}-candidates.md` |
| `/find-snippet-candidates` | Saturday night | Spawns 6 parallel sub-agents to explore 6 repos via GitHub API, writes `{date}-{Lang}-snippet-candidates.md` for each language |
| `/generate-snippet-draft` | Sunday night | Reformats snippets for mobile, researches repos, generates and self-refines breakdowns, writes `{date}-{Lang}-review.md` |

### Phase 2 — Interactive (run in the morning, takes minutes)

| Skill | When | What it does |
|-------|------|--------------|
| `/discover-oss-candidates-select` | Saturday morning | Reads candidates file, you pick 2 repos per language, writes 3 selection files, increments issue counter |
| `/find-snippet-candidates-select` | Sunday morning | Shows all candidates (3 languages at once), you pick 1 snippet per repo, appends selections to files |
| `/generate-snippet-draft-select` | Monday morning | Shows breakdowns for all 6 repos, you approve or give feedback, writes to `drafts.json`, `repos.json`, and `html-drafts/` |

## File Flow

```
snippet/current-issue.txt               ← last completed issue number
                                          (auto-incremented by /discover-oss-candidates-select)

snippet/n8n-workflows/content/
├── snippet-selections/
│   ├── {date}-candidates.md            ← Skill A P1 output (your picks go here)
│   ├── {date}-Python.md                ← Skill A P2 output → B reads this
│   ├── {date}-JS_TS.md
│   ├── {date}-C_Cpp.md
│   ├── {date}-Python-snippet-candidates.md   ← Skill B P1 output
│   ├── {date}-JS_TS-snippet-candidates.md
│   ├── {date}-C_Cpp-snippet-candidates.md
│   ├── {date}-Python-review.md         ← Skill C P1 output (your approval goes here)
│   ├── {date}-JS_TS-review.md
│   └── {date}-C_Cpp-review.md
├── repos.json                          ← tracks which repos have been used and how many times
├── drafts.json                         ← archive of all generated drafts (gitignored)
└── html-drafts/                        ← final Gmail-ready HTML files (gitignored)
    └── {date}-{Language}-Repo-{1,2}.html
```

## Scheduled Triggers

| Trigger | Cron | Next Steps |
|---------|------|------------|
| `snippet-discover` (active) | Fri 11pm KST | Running — first fire: 2026-04-03 |
| `snippet-find-candidates` | Sat 11pm KST | Create when upgrading to Max plan |
| `snippet-generate-drafts` | Sun 11pm KST | Create when upgrading to Max plan |

Manage triggers: https://claude.ai/code/scheduled

## After Generating HTML Drafts

1. Copy each `.html` file's contents into a new Gmail compose window
2. Open Google Sheets → Newsletter Drafts tab
3. Set `scheduled_day` and `status` for completed drafts

## Notes

- The pipeline has zero Chrome/browser dependency — everything uses GitHub API and WebSearch
- Phase 1 skills automatically commit and push output to GitHub when done
- After each Phase 1 run, do `git pull` before running the corresponding Phase 2 skill
- If a Phase 1 run fails silently, check https://claude.ai/code/scheduled for run logs
- `repos.json` tracks prior usage — repos used before get a soft warning during discovery
- `current-issue.txt` tracks the last completed issue number (currently: `7`)
