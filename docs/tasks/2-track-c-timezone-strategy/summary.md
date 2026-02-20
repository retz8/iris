# Summary: Timezone Strategy

## Problem Statement

The newsletter send workflow (Workflow 2) fires a cron trigger at "7am" on Mon/Wed/Fri. The n8n Cloud instance defaults to UTC. No timezone is specified anywhere in the system — not in the cron config, not in subscriber data, not in subscriber-facing copy. This creates ambiguity: 7am UTC lands at 2am US Eastern, making the send time meaningless for the primary audience.

## Options Considered

| Option | Description | Complexity |
|--------|-------------|------------|
| A | Pick one timezone, accept tradeoff | Zero |
| B | Regional send waves based on subscriber timezone bucket | Medium |
| C | Subscriber picks preferred send time at signup | High |
| D | Document the tradeoff only, make no changes | Zero |

## Chosen Approach

**Option A — US Eastern (`America/New_York`)**

- Primary audience (personal network, early adopters) is EST-based in Michigan
- Developer audience broadly skews US-heavy, with a secondary EU cluster
- 7am ET = 12pm UTC = 1pm CET: hits US morning and EU lunch — both acceptable
- Zero infrastructure changes: no schema additions, no signup form changes, no new workflow logic
- n8n handles daylight saving automatically (EST in winter, EDT in summer)

## Changes Required

Three manual changes. See `action-plan.md` for step-by-step instructions.

1. **n8n instance timezone** — change from `UTC` to `America/New_York` in n8n Settings
2. **Welcome email copy** — `Every Mon/Wed/Fri, 7am:` → `Every Mon/Wed/Fri, 7am EST:` in Node 11 of the confirmation workflow
3. **Landing page copy** — `7am` → `7am EST` wherever the send schedule is mentioned

No schema changes. No workflow logic changes. No new nodes.

## Follow-up Condition

Revisit only if subscriber data shows a significant non-US cluster and there are actual delivery time complaints. Not before.
