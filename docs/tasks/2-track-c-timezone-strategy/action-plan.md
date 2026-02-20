# Action Plan: Timezone — US Eastern (EST)

**Decision:** Send at 7am EST. Single timezone, no subscriber schema changes.

There are 3 things to do: change the n8n instance timezone, update the welcome email copy, and update the landing page copy.

---

## Step 1 — Change n8n Instance Timezone

**Where:** n8n Cloud dashboard at `retz8.app.n8n.cloud`

1. Log in to n8n
2. Click your avatar or the menu icon in the bottom-left corner
3. Go to **Settings**
4. Find the **Timezone** field (it will currently show `UTC`)
5. Change it to `America/New_York`
6. Save

**What this does:** All cron triggers in all workflows will now interpret "7am" as 7am Eastern. The cron expression itself (`0 7 * * 1,3,5`) does not need to change. n8n handles daylight saving automatically — EST in winter, EDT in summer.

**Verify:** Open the send newsletter workflow (Workflow 2) and confirm the Schedule Trigger shows the next run time in Eastern time, not UTC.

---

## Step 2 — Update Welcome Email Copy

**Where:** n8n > Workflow: Newsletter Email Confirmation > Node 11 (Gmail - Send Welcome Email)

1. Open the confirmation workflow in n8n
2. Double-click **Node 11: Gmail - Send Welcome Email**
3. Find the HTML body in the Message field
4. Locate this line:

```
Every Mon/Wed/Fri, 7am:
```

5. Change it to:

```
Every Mon/Wed/Fri, 7am EST:
```

6. Save the node and save the workflow

---

## Step 3 — Update Landing Page Copy

**Where:** The Snippet landing page (frontend codebase, signup section)

Find wherever the send schedule is mentioned on the landing page — typically in the hero section, the value proposition text, or near the signup form. It will say something like "7am" or "Mon/Wed/Fri at 7am".

Change every instance of `7am` in that context to `7am EST`.

Example:
- Before: `Every Mon/Wed/Fri at 7am`
- After: `Every Mon/Wed/Fri at 7am EST`

No other changes to the landing page are needed.
