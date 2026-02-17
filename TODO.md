# IRIS — Task Execution Plan

## For Tomorrow

### Manual Testing & Verification
- **Track A (Extension UX)** - ✅ Implementation complete, needs manual testing
  - Test error handling flows in VS Code
  - Test caching behavior
  - Test state persistence
  - Verify all UX improvements work as expected

### Continue Track B (Analysis Quality)
- **Phase 3 Verification** - Review and verify Phase 1-3 completeness
  - Check generated snapshots quality
  - Review baseline snapshot data
  - Validate snapshot generation script
- **Phase 4 Implementation** - Core Test Suite
  - TASK-012: Create `test_analysis_quality.py` with snapshot-based quality tests
  - TASK-013: Create `test_edge_cases.py` for empty/minified/comments-only/barrel files
  - TASK-014: Create `test_prompt_builder.py` for prompt builder unit tests
  - TASK-015: Create `test_range_processing.py` for `_merge_ranges()` unit tests

### Update Track E, F Doc to reflect decisions made from Track H
then, start E

### Completed
- **Track H (Newsletter Design)** - ✅ Complete
- **Track A (Extension UX)** - ✅ Implementation complete (testing pending)
- **Track B (Analysis Quality)** - 🔄 Phase 1-3 complete

## Quick Start

All task execution is now organized under **`docs/tasks/`**. Start there.

**Key files:**
- `docs/tasks/README.md` - Workflow overview, phases, dependencies, coordination rules
- `docs/tasks/UPDATES.md` - Progress tracking across all sessions
- `docs/tasks/track-{a-h}*.md` - Individual execution plans for each track

## Tracks Overview

**IRIS Product:**
- **Track A:** Extension UX (error handling, caching, persistence)
- **Track B:** Analysis Quality (prompt testing, edge cases)
- **Track C:** Marketplace Prep (publish to VS Code Marketplace)
- **Track D:** Backend Hardening (rate limiting, CloudWatch, cleanup)

**Newsletter:**
- **Track H:** Design Discussion (branding, format decisions) - **Start here**
- **Track E:** Landing Page (subscription UX)
- **Track F:** Subscriber Management (n8n Workflow 3)
- **Track G:** Content Pipeline (n8n Workflow 1)

See `docs/tasks/README.md` for full dependency graph and coordination rules.

## Post-MVP Growth

- [ ] **Expand language support** - Go, Rust, Java, C#, C/C++
- [ ] **Scaling plan** - Vertical or horizontal scaling beyond t3.micro
