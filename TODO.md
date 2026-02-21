# IRIS — Task Execution Plan

## TODO (RIGHT NOW)
- **PHASE 4**
- deployment...

## TODO (AFTER release NEWSLETTER)
- VSCode Extension Full UX Check
- Agent Response Quality Check with Track B
- Deploy Flask Server on EC2 & Track D (BE pipeline strengthen)
- Track C: VSCode Marketplace setup
- Release VSCode Extension

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
