# 2-Track-C — Timezone Strategy

**Phase:** 2
**Track:** C
**Scope:** Investigate the timezone problem for scheduled newsletter sends and decide on a strategy.

**Dependencies:** 2-Track-A (send email workflow) should be complete or in progress — the decision made here may affect the send workflow design.

**Deliverables:**
- A decision written into `docs/tasks/2-track-c-timezone-strategy/summary.md` — chosen approach with rationale
- If the decision requires workflow or schema changes: those changes are specified clearly for implementation (either in this track or as a follow-up)

**Out of scope:**
- Implementing complex infrastructure (geo-IP, real-time timezone detection)
- Changes to the frontend signup flow (unless decided in Discuss)

---

## Phase 1 — Explore

Read the following files in order:

1. `snippet/n8n-workflows/google-sheets-subscribers-schema.md` — does the subscribers schema have any timezone or location field?
2. `snippet/n8n-workflows/google-sheets-drafts-schema.md` — review the `scheduled_day` field and how Workflow 2 uses it
3. `snippet/n8n-workflows/workflow-confirmation.md` — check the signup and confirmation flow for any timezone signal from the subscriber

After reading, answer these questions:

- Does the current system capture any timezone or location data from subscribers?
- What timezone does the n8n instance (`retz8.app.n8n.cloud`) operate in by default?
- If the send runs at 7am in one timezone, what time does that translate to for subscribers in UTC, US Pacific, and Central Europe?
- What are the realistic options? (examples: pick one global timezone, send in regional waves, let subscriber pick, accept the tradeoff and document it)
- What is the cost/complexity of each option?

---

## Phase 2 — Discuss

Present findings to the human engineer:

1. Show the current effective send time across major subscriber timezones.
2. Present each realistic option with its tradeoffs — complexity, subscriber experience, infrastructure required.
3. Make a recommendation and explain why.
4. Agree on the chosen approach.

The output of this discussion is a decision. If the decision requires no workflow changes (e.g. "pick UTC, accept the tradeoff"), the track ends here with a summary. If it requires changes, define what needs to change.

---

## Phase 3 — Plan

Only needed if the decision requires changes to the workflow, subscriber schema, or signup flow.

If no changes are needed, skip to Phase 4.

Use the `create-implementation-plan` skill to write a plan to `docs/tasks/2-track-c-timezone-strategy/`.

---

## Phase 4 — Execute

Write `docs/tasks/2-track-c-timezone-strategy/summary.md` documenting:
- The problem statement
- Options considered
- The chosen approach and rationale
- Any follow-up implementation required

If changes were agreed: apply them and verify.
