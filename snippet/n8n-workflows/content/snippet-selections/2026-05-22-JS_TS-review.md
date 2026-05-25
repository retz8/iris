# Breakdown Review — 2026-05-22 — JS/TS

Issue: #15
Date: 2026-05-22
Language: JS/TS
Status: COMPLETED

## Repo 1 — colbymchenry/codegraph

- file_path: src/search/query-parser.ts
- snippet_url: https://github.com/colbymchenry/codegraph/blob/main/src/search/query-parser.ts

file_intent: Bounded edit distance calculator
breakdown_what: Computes edit distance between two strings with Wagner-Fischer DP, short-circuiting early when the length delta alone exceeds the bound or the row minimum surpasses the threshold — skipping full O(n×m) work on clearly distant pairs.
breakdown_responsibility: Powers fuzzy symbol matching in codegraph's query parser, letting AI agents find code symbols by approximate name when exact lookups fail — critical for handling typos, partial matches, and casing variations in natural-language queries.
breakdown_clever: The destructured `[prev, cur] = [cur, prev]` swap reuses two pre-allocated row arrays without copying, keeping allocations at O(n) instead of O(n×m). The `rowMin > maxDist` early exit then avoids finishing rows that can't possibly produce a match.
project_context: codegraph is a local code knowledge graph that pre-indexes a project into SQLite and exposes it to AI coding tools like Claude Code and Cursor via an MCP server. Teams use it to cut token costs and tool calls by letting agents query structured symbol data instead of repeatedly scanning files.

### Reformatted Snippet

```typescript
export function boundedEditDistance(
  a: string,
  b: string,
  maxDist: number
): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (Math.abs(al - bl) > maxDist) return maxDist + 1;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prev = new Array<number>(bl + 1);
  let cur  = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;

  for (let i = 1; i <= al; i++) {
    cur[0] = i;
    let rowMin = cur[0]!;
    for (let j = 1; j <= bl; j++) {
      const cost =
        a.charCodeAt(i - 1) === b.charCodeAt(j - 1)
          ? 0 : 1;
      const insertion    = cur[j - 1]!  + 1;
      const deletion     = prev[j]!     + 1;
      const substitution = prev[j - 1]! + cost;
      cur[j] = Math.min(
        insertion, deletion, substitution
      );
      if (cur[j]! < rowMin) rowMin = cur[j]!;
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prev, cur] = [cur, prev];
  }
  return prev[bl]!;
}
```

## Repo 2 — can1357/oh-my-pi

- file_path: packages/agent/src/compaction/compaction.ts
- snippet_url: https://github.com/can1357/oh-my-pi/blob/main/packages/agent/src/compaction/compaction.ts

file_intent: Session history cut-point selector
breakdown_what: Scans valid cut boundaries in a session window, walks backwards accumulating token estimates until a recency budget is met, then picks the earliest valid cut point at or after that position — adjusting for mid-turn splits and compaction markers.
breakdown_responsibility: Decides exactly where to truncate session history when oh-my-pi's context window fills, balancing recency against the constraint that cuts must land on clean message or compaction boundaries rather than mid-turn.
breakdown_clever: Token accumulation walks backward to find the minimum cut depth, but the cut-point selection then scans forward to the earliest valid boundary at that depth — recovering as much early context as possible while still honoring the recency budget.
project_context: oh-my-pi is a terminal AI coding agent with hash-anchored edits and LSP integration, designed to eliminate the whitespace conflicts and string-not-found loops common in other agents. Engineers use it as a drop-in alternative to Claude Code or Codex CLI with stronger edit reliability.

### Reformatted Snippet

```typescript
export function findCutPoint(
  entries: SessionEntry[],
  startIndex: number,
  endIndex: number,
  keepRecentTokens: number,
): CutPointResult {
  const cutPoints = findValidCutPoints(
    entries, startIndex, endIndex
  );

  if (cutPoints.length === 0) {
    return {
      firstKeptEntryIndex: startIndex,
      turnStartIndex: -1,
      isSplitTurn: false,
    };
  }

  let accumulatedTokens = 0;
  let cutIndex = cutPoints[0];

  for (let i = endIndex - 1; i >= startIndex; i--) {
    const entry = entries[i];
    if (entry.type !== "message") continue;

    const messageTokens =
      estimateTokens(entry.message);
    accumulatedTokens += messageTokens;

    if (accumulatedTokens >= keepRecentTokens) {
      for (let c = 0; c < cutPoints.length; c++) {
        if (cutPoints[c] >= i) {
          cutIndex = cutPoints[c];
          break;
        }
      }
      break;
    }
  }

  while (cutIndex > startIndex) {
    const prevEntry = entries[cutIndex - 1];
    if (prevEntry.type === "compaction") break;
    if (prevEntry.type === "message") break;
    cutIndex--;
  }

  const cutEntry = entries[cutIndex];
  const isUserMessage =
    cutEntry.type === "message" &&
    cutEntry.message.role === "user";
  const turnStartIndex = isUserMessage
    ? -1
    : findTurnStartIndex(
        entries, cutIndex, startIndex
      );

  return {
    firstKeptEntryIndex: cutIndex,
    turnStartIndex,
    isSplitTurn:
      !isUserMessage && turnStartIndex !== -1,
  };
}
```
