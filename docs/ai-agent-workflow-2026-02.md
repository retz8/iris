# AI Agent Workflow — February 2026

A record of how parallel Claude Code sessions were used to ship IRIS MVP and the Snippet newsletter infrastructure over roughly three days (2026-02-16 to 2026-02-18).

## The Pattern

Each major workstream was assigned to an independent Claude Code session (a "track"). Sessions ran in parallel where possible, coordinated through a shared file (`docs/tasks/UPDATES.md`) as the single source of truth for progress. No real-time inter-session communication — each session read UPDATES.md on startup and appended its summary on completion.

Each session followed the same internal structure:
1. **Exploration** — read relevant files, understand current state, build context
2. **Discussion** — review findings with human engineer, make design decisions
3. **Planning** — write a detailed implementation plan to `docs/tasks/track-{x}/`
4. **Execution** — implement the plan, test, commit
5. **Handoff** — append completion summary to `UPDATES.md`

## Track Dependency Graph

```
Phase 1 (parallel):  H ─── A ─── B ─── C
                     ↓           ↓
Phase 2 (parallel):  E, F        D
                     ↓ ↓
Phase 3:             G
```

Phase 1 launched simultaneously. Phase 2 tracks started as their dependencies completed — E and F waited for H (branding decisions), D waited for B (test infrastructure). G was the final integration track.

## Tracks

| Track | Scope | Outcome |
|-------|-------|---------|
| H | Newsletter design decisions (branding, email format, audience) | Completed — became `docs/snippet-prd.md` |
| A | VS Code extension UX (error handling, LRU cache, persistence) | Completed — shipped to codebase |
| B | Backend analysis quality (prompt tuning, test infrastructure, 129 tests) | Completed — shipped to codebase |
| C | VS Code Marketplace prep | Not started (deprioritized) |
| D | Backend hardening (rate limiting, monitoring) | Not started (deprioritized) |
| E | Distribution landing page (React/Vite, signup flow, unsubscribe page) | Completed — shipped to `web/` |
| F | Newsletter subscriber management (3 n8n workflows: subscribe, confirm, unsubscribe) | Completed — live on n8n |
| G | Automated content pipeline (n8n, AI agents, Gmail drafts) | Built then abandoned — replaced by manual workflow |

## What Worked Well

**Dependency coordination via flat file.** UPDATES.md as the handoff mechanism was simple and effective. Sessions didn't need to know anything about each other — just read the file, check your dependencies, proceed or wait.

**Implementation plans as session memory.** Writing a detailed plan before execution gave each session a clear contract. Plans lived in `docs/tasks/track-{x}/` and served as both a pre-execution checklist and a post-execution reference.

**Parallel phases compressed calendar time.** Tracks H, A, B, and E ran simultaneously. Work that would have been sequential (design → frontend → backend → workflows) happened in parallel across sessions.

**Exploration phase prevented wasted work.** Each session started by reading the codebase before writing a line. Decisions made in Phase 1 discussion often changed the plan significantly from the initial spec.

## What Didn't Work

**Track G (automated content pipeline) was over-engineered.** The n8n workflow was built and worked, but the complexity (AI agents, GitHub API, OpenAI, Gmail, Google Sheets all wired together) wasn't justified for a newsletter that currently has zero subscribers. Replaced by a 5-step manual Claude/Gemini prompt workflow. Lesson: validate demand before automating.

**Tracks C and D were never started.** Marketplace prep and backend hardening kept getting deprioritized as newsletter infrastructure took priority. This was the right call — but it reflects that 8 parallel tracks was more ambition than capacity.

**UPDATES.md grew verbose.** The coordination file worked well for short entries but Track B and E entries grew into full documentation. Better practice: keep UPDATES.md entries to 5-10 lines with a pointer to a summary file.

## Coordination Artifacts (now cleaned up)

The `docs/tasks/` folder was the coordination layer during execution. After completion, most of it was cleaned up:

- Track definition files (`track-x-name.md`) — deleted after completion
- Implementation plans — deleted after completion (code is the artifact)
- Track summaries — moved to where they're useful (`backend/tests/README.md`, `backend/tests/TESTING_GUIDE.md`)
- Track H summary — converted into `docs/snippet-prd.md` (the authoritative newsletter reference)
- n8n workflow docs — kept in `docs/tasks/n8n-workflows/` as operational references
- `UPDATES.md` and `README.md` — kept in `docs/tasks/` as historical record

## Infrastructure Used

- **Claude Code** — all implementation sessions
- **n8n** (`retz8.app.n8n.cloud`) — newsletter workflow automation
- **Vercel** — landing page hosting
- **Google Sheets** — subscriber and draft tracking database
- **Gmail OAuth2** — transactional email via n8n
