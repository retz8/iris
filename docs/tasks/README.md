# Task Workflow - Parallel Execution Plan

This folder coordinates parallel work across multiple Claude Code sessions to ship IRIS MVP and newsletter infrastructure.

## Structure

```
docs/tasks/
├── README.md              ← You are here (workflow overview)
├── UPDATES.md             ← Single source of truth for all session progress
├── track-a-extension-ux.md
├── track-b-analysis-quality.md
├── track-c-marketplace-prep.md
├── track-d-backend-hardening.md
├── track-e-distribution-landing.md
├── track-f-newsletter-subscribers.md
├── track-g-newsletter-content-pipeline.md
└── track-h-newsletter-design.md
```

---

## Execution Phases

### Phase 1: Launch simultaneously
- **Track H:** Newsletter Design Discussion (design format, branding, decisions)
- **Track A:** Extension UX (error handling, caching, persistence) - Stream 1 from TODO.md
- **Track B:** Analysis Quality (prompt testing, edge cases, tests) - Stream 3 from TODO.md
- **Track C:** Marketplace Prep (publisher config, publish) - Stream 4 from TODO.md

### Phase 2: After Track H completes
- **Track E:** Distribution & Landing (landing page, API key system) - Stream 4 from TODO.md
- **Track F:** Newsletter Subscriber Management (Workflow 3 - webhook, validation, welcome email)

### Phase 3: After Track B completes
- **Track D:** Backend Hardening (rate limiting, CloudWatch, cleanup) - Stream 2 from TODO.md

### Phase 4: After Tracks E AND F complete
- **Track G:** Newsletter Content Pipeline (Workflow 1 - GitHub, Claude, Carbon, Gmail automation)

**Dependency Graph:**
```
Phase 1 (parallel):  H, A, B, C
                     ↓     ↓
Phase 2 (parallel):  E, F  D
                     ↓ ↓
Phase 4:             G
```

---

## Session Workflow

Each session is run by independent Claude Code session.
Each task session follows this structure:

### 1. Discovery/Discussion Phase with human engineer
- Read current state (code, docs, UPDATES.md)
- Identify requirements and pain points
- Make design decisions
- Document findings

### 2. Implementation Planning
- Based on Phase 1, create detailed steps
- Identify files to modify
- Define acceptance criteria

### 3. Execution
- Implement the plan
- Test changes
- **Record work summary in `UPDATES.md`**

---

## Coordination Rules

### Before Starting a Session
1. **Read `UPDATES.md`** to see what other sessions have completed
2. **Check your track's dependencies** - don't start if blocked
3. **Read your track plan** (`track-{letter}-{name}.md`)
4. **Check TODO.md** (source of truth for MVP requirements)

### After Completing a Session
1. **Append summary to `UPDATES.md`** (see format below)
2. **Update your track plan** if scope changed
3. **Flag blockers** in UPDATES.md if something blocks another track

### UPDATES.md Entry Format
```markdown
## YYYY-MM-DD - Track X: Task Name

**Status:** Complete | In Progress | Blocked

### What Was Done
- Bullet points of accomplishments
- Files modified: `path/to/file.ts`, `path/to/other.py`

### Decisions Made
- Key design/implementation decisions

### What's Next / Blockers
- What this unlocks for other tracks
- Or: what's blocking progress
```

---

## Key Principles

1. **TODO.md is source of truth** for MVP requirements
2. **UPDATES.md is source of truth** for session progress
3. **Auto-analyze stays `true`** (users see analysis as they read)
4. **NO verification prompt for MVP** (focus on current prompt quality only)
5. **Streams 1, 3, 4 can run in parallel** (Stream 2 runs after Stream 3)
6. **Newsletter work is independent** (can run parallel to everything)

---

## Questions?

Read the full context in:
- `TODO.md` (root) - MVP requirements and stream definitions
- `docs/strategy-2026-02-10.md` - Product vision
- `docs/newsletter-n8n-plan.md` - Newsletter architecture
