# 4-Track-A — Deployment Guide

**Phase:** 4
**Track:** A
**Scope:** Produce a clear, step-by-step deployment guide for the n8n workflows and web app so the human engineer can execute the deployment independently.

**Dependencies:** Phase 3 all tracks must be complete (security cleared, UX/UI finalized).

**Deliverables:**
- `snippet/deployment-guide.md` — step-by-step instructions for deploying n8n workflows to production and the web app to Vercel

**Out of scope:**
- Executing the deployment (human does this)
- Infrastructure setup (already done — EC2, Vercel, n8n cloud are live)
- Backend deployment (IRIS backend is a separate concern)

**Skills:**
- `sequential-thinking` — for ordering deployment steps correctly and identifying dependencies between them
- `devops-engineer` — for deployment best practices, environment variable handling, and go-live checklist structure

---

## Phase 1 — Explore

Read the following to understand the current deployment setup:

1. `web/` — check for any existing deployment config (vercel.json, .env.example, build scripts)
2. `snippet/n8n-workflows/` — review all workflow docs to understand which are new vs already live, and what activation steps each requires
3. `docs/ai-agent-workflow-2026-02.md` — check the Infrastructure section for what is already running

After reading, answer these questions:

- What is the current Vercel deployment setup for `web/`? Is it connected to git (auto-deploy on push) or manual?
- Which n8n workflows are already active and which are new (built in Phase 1/2)?
- What environment variables or credentials need to be set before activation?
- Are there any ordering dependencies between workflow activations (e.g. must Workflow 1 be active before Workflow 2)?
- What is the smoke test for each workflow after activation — how do you confirm it works?

---

## Phase 2 — Discuss

Present findings to the human engineer and build the guide together:

1. Walk through the deployment sequence — web app first or workflows first? Why?
2. Confirm which workflows are already live and which need activation.
3. Confirm any environment variables or credential checks needed before go-live.
4. Agree on the smoke test for each component.

The output of this discussion is the content of the deployment guide.

---

## Phase 3 — Plan

Not needed. This track produces a guide, not an implementation plan.

---

## Phase 4 — Execute

Write `snippet/deployment-guide.md` covering:

- Pre-deployment checklist (credentials, env vars, dependencies)
- n8n workflow activation steps in the correct order
- Web app deployment steps (Vercel)
- Smoke tests for each component after activation
- Rollback notes if something goes wrong

Verification:
- Human engineer reads the guide and confirms it is clear and complete enough to follow without assistance
