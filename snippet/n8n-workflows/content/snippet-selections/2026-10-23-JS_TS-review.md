# Breakdown Review — 2026-10-23 — JS/TS

Issue: #36
Date: 2026-10-23
Language: JS/TS
Status: PENDING_APPROVAL

## Repo 1 — elie222/rakazo

- file_path: packages/adapters/src/pi-runtime.ts
- snippet_url: https://github.com/elie222/rakazo/blob/main/packages/adapters/src/pi-runtime.ts#L2542-L2557

file_intent: Per-run tool-call budget allocator
breakdown_what: Retrieves or creates a mutable budget object tracking tool-call count, limit, and in-flight calls for a given agent run ID, resetting the in-flight count and refreshing the limit on every call, even for an existing budget.
breakdown_responsibility: Enforces per-turn tool-call caps in rakazo's agent runtime, preventing a single bot turn from making unbounded tool calls; the returned budget object is read elsewhere to block or allow further tool invocations mid-turn.
breakdown_clever: When maxToolCallsPerTurn() returns zero or negative, the new budget is never cached, so every later call for that run allocates a fresh, immediately-discarded budget — silently disabling enforcement instead of blocking all tool calls as you might expect.
project_context: Rakazo is an open-source, Apache-licensed alternative to Grok Bot where you pick your own model and sandbox, giving persistent bots their own memory, voice mode, and sandboxed browser, terminal, and file access.

### Reformatted Snippet

```typescript
function toolCallBudgetFor(
  runId: string,
): ToolCallBudget {
  const existing =
    toolCallBudgetsByRun.get(runId);
  if (existing) {
    existing.inFlight = 0;
    existing.limit = maxToolCallsPerTurn();
    return existing;
  }
  const budget: ToolCallBudget = {
    count: 0,
    exceeded: false,
    limit: maxToolCallsPerTurn(),
    inFlight: 0,
  };
  if (budget.limit > 0) {
    toolCallBudgetsByRun.set(runId, budget);
  }
  return budget;
}
```

## Repo 2 — citrolabs/ego-lite

- file_path: package/ego-browser/src/snapshot-result.ts
- snippet_url: https://github.com/citrolabs/ego-lite/blob/main/package/ego-browser/src/snapshot-result.ts#L147-L173

file_intent: Quote-aware ref-marker scanner
breakdown_what: Scans a snapshot text string character by character, tracking quoted-string and escape state, to find the first occurrence of a "[ref=" marker that sits outside quotes and is preceded by whitespace or the start of the string.
breakdown_responsibility: Lets ego-lite's browser-snapshot parser locate where element-reference metadata begins within a page snapshot dump, distinguishing real ref markers from the literal text "[ref=" if it happens to appear inside quoted string content.
breakdown_clever: Escape tracking only activates while inside quotes (`quoted && character === "\\"`), so a backslash outside any quoted string never suppresses a quote toggle — an easy mistake to make when writing a naive quote-aware scanner from scratch.
project_context: Ego-lite is a macOS Chromium-based browser from citrolabs that lets a human and AI agents share one browser session, with the user's own tabs kept separate from the agent-run automation spaces.

### Reformatted Snippet

```typescript
function findSnapshotMetadataStart(
  text: string,
): number {
  let quoted = false;
  let escaped = false;
  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quoted && character === "\\") {
      escaped = true;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (
      !quoted &&
      text.startsWith("[ref=", index) &&
      (index === 0 ||
        /\s/.test(text[index - 1]))
    ) {
      return index;
    }
  }
  return -1;
}
```
