# Snippet Newsletter Pipeline

Since issue #39 (2026-11), each weekly issue is made in one chat with Claude using the `snippet-weekly` skill, and sending runs on Google Apps Script. The old Friday/Saturday/Sunday routines, the six discover/find/generate skills and n8n are retired.

## Weekly flow

```
Weekend (chat)   snippet-weekly
  1. Claude finds repo candidates          → YOU pick 2 repos per language
  2. Claude finds 3 snippets per repo,
     shows each one's code in chat         → YOU pick 1 snippet per repo
  3. Claude writes breakdowns + HTML,
     adds 6 rows to the drafts sheet
     (status=draft), archives to this repo
  4. "All written. Schedule?"              → YOU say yes / not yet
        yes → rows become status=ready

Tue 21:00 KST    Apps Script sendScheduled → sends ready rows with scheduled_day=tue
Thu 21:00 KST    Apps Script sendScheduled → sends ready rows with scheduled_day=thu
                 (row status becomes sent, or failed with a row in send_errors)
```

Only three answers are needed each week: repos, snippets, schedule. There is no breakdown review and no HTML preview.

## Pieces

| Piece | Where | Role |
|---|---|---|
| `snippet-weekly` skill | `.claude/skills/snippet-weekly/SKILL.md` | The whole weekly flow above |
| `snippet-repo-explorer` agent | `.claude/agents/` | Finds 3 snippet candidates in one repo |
| `snippet-html-generator` agent | `.claude/agents/` | Email HTML template, colors and subject rule |
| Google Sheet `snippet newsletter` | Google Drive | `drafts` (issues, HTML, status), `subscribers`, `send_errors` |
| Apps Script project `snippet` | newsletter Gmail account | Web app for subscribe / confirm / unsubscribe (the site calls it), and the Tue/Thu send trigger |

`drafts` columns are read by header name, so don't rename, move or delete them: `issue_number, status, gmail_draft_id, file_intent, repository_name, repository_url, repository_description, programming_language, source, created_date, scheduled_day, sent_date, subject, html`.

## Archive in this repo

History only; nothing here is read for sending.

```
snippet/current-issue.txt                       ← last issue made
snippet/n8n-workflows/content/
├── snippet-selections/{date}-{Lang}.md        ← picks, breakdowns, snippet per language
├── html-drafts/{date}-{Lang}-Repo-{1,2}.html  ← final emails (Repo 1 = Tue, Repo 2 = Thu)
├── drafts.json                                ← all drafts as JSON
└── repos.json                                 ← repos used and how many times
```

Older weeks also have `*-candidates.md`, `*-snippet-candidates.md` and `*-review.md` files from the retired flow.

## Retired

- Skills `discover-oss-candidates`, `find-snippet-candidates`, `generate-snippet-draft` are now stubs that do nothing, so the old routines `snippet-discover`, `snippet-find-candidates` and `snippet-generate-drafts` stop cleanly if they still fire. Turn those routines off at https://claude.ai/code/routines, then delete the three stub folders.
- The three `-select` skills are deleted.
- n8n workflows (subscription, confirmation, unsubscribe, Gmail drafts → sheet, Tue/Thu send) are replaced by the Apps Script project. Their docs stay in `snippet/n8n-workflows/` for reference.
