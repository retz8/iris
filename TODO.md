# IRIS — Task Execution Plan

This document provides a high-level overview of parallel task execution. For detailed execution plans, see **`docs/tasks/`**.

## Parallel Execution Framework

Tasks are organized into 8 tracks (A-H) that run across 4 phases. See `docs/tasks/README.md` for workflow coordination rules.

### Phase Structure

**Phase 1: Launch simultaneously**
- Track H: Newsletter Design Discussion
- Track A: Extension UX Improvements
- Track B: Analysis Quality Testing
- Track C: Marketplace Preparation

**Phase 2: After Track H completes**
- Track E: Newsletter Landing Page
- Track F: Newsletter Subscriber Management

**Phase 3: After Track B completes**
- Track D: Backend Hardening

**Phase 4: After Tracks E and F complete**
- Track G: Newsletter Content Pipeline

### Dependency Graph

```
Phase 1:  H, A, B, C  (parallel)
            ↓     ↓
Phase 2:  E, F    D   (parallel after dependencies)
            ↓ ↓
Phase 4:    G
```

## Track Details

### IRIS Product Tracks

**Track A: Extension UX** → `docs/tasks/track-a-extension-ux.md`
- Error handling UX (timeout, 401, network errors)
- Multi-file caching (instant tab-switching)
- Analysis persistence across restarts
- Scope: `packages/iris-vscode/`, `packages/iris-core/src/state/`
- Dependencies: None

**Track B: Analysis Quality** → `docs/tasks/track-b-analysis-quality.md`
- Prompt quality evaluation and tuning
- Edge case handling (large files, empty files, minified code)
- Test coverage (backend unit + integration tests)
- Scope: `backend/src/prompts.py`, `backend/tests/`
- Dependencies: None
- Blocks: Track D (both modify backend/)

**Track C: Marketplace Preparation** → `docs/tasks/track-c-marketplace-prep.md`
- Publisher account and marketplace config
- Extension icon, screenshots, branding assets
- First-run experience (welcome, API key prompt)
- Language expansion (Go, Rust, Java, C#, C/C++)
- License selection and addition
- Scope: `packages/iris-vscode/package.json`, assets, license
- Dependencies: None

**Track D: Backend Hardening** → `docs/tasks/track-d-backend-hardening.md`
- Rate limiting middleware (per-key throttling)
- Fix CloudWatch EMF ingestion
- Delete legacy Lambda code (authorizer.py, lambda_handler.py)
- Scope: `backend/src/` (routes, middleware, infra config)
- Dependencies: Track B must complete first
- Blocks: None

### Newsletter Tracks

**Track H: Newsletter Design Discussion** → `docs/tasks/track-h-newsletter-design.md`
- Newsletter name, branding, visual identity
- Language support strategy (written + programming)
- Category system decision
- Content format, email structure, welcome email
- Landing page and signup form design
- Scope: Decision-making session (no code)
- Dependencies: None
- Blocks: Tracks E and F

**Track E: Newsletter Landing Page** → `docs/tasks/track-e-distribution-landing.md`
- Landing page design and implementation
- Subscription form UX
- Unsubscription flow
- Conversion optimization for mid-level engineers
- Scope: Landing page (iris-codes.com or subdomain)
- Dependencies: Track H must complete first
- Blocks: Track F

**Track F: Newsletter Subscriber Management** → `docs/tasks/track-f-newsletter-subscribers.md`
- n8n Workflow 3: webhook, validation, Google Sheets, welcome email
- Signup form integration
- Duplicate handling
- Welcome email template
- Scope: n8n workflow, Google Sheets, Gmail
- Dependencies: Track H must complete first
- Blocks: Track G

**Track G: Newsletter Content Pipeline** → `docs/tasks/track-g-newsletter-content-pipeline.md`
- n8n Workflow 1: GitHub trending, snippet extraction, Claude API, code images, Gmail drafts
- Automation of weekly content creation (3 issues per week)
- Human review workflow (approve drafts in Gmail)
- Scope: n8n workflow, GitHub API, Claude API, Carbon/ray.so, Gmail
- Dependencies: Tracks E and F must complete first
- Blocks: None

## Coordination

**Before starting a track:**
1. Read `docs/tasks/README.md` for workflow overview
2. Check `docs/tasks/UPDATES.md` for progress on other tracks
3. Verify dependencies are complete
4. Read your track plan: `docs/tasks/track-{letter}-{name}.md`

**After completing a track:**
1. Append summary to `docs/tasks/UPDATES.md`
2. Include: what was done, files modified, design decisions, blockers

## Post-MVP Growth

- [ ] **Expand language support**
  Go, Rust, Java, C#, C/C++. Mainly tree-sitter grammars + prompt tuning per language.

- [ ] **Scaling plan**
  `t3.micro` (1 GB RAM) won't hold under real load. Plan for vertical scaling or horizontal (load balancer, multiple instances).
