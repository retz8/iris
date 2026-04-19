# Breakdown Review — 2026-04-17 — JS/TS

Issue: #10
Date: 2026-04-17
Language: JS/TS
Status: PENDING_APPROVAL

## Repo 1 — thedotmack/claude-mem

- file_path: src/services/sync/ChromaSync.ts
- snippet_url: https://github.com/thedotmack/claude-mem/blob/main/src/services/sync/ChromaSync.ts

file_intent: Chroma vector search with SQLite ID deduplication
breakdown_what: Queries a Chroma vector database for the most similar documents to a search string, then deduplicates results by extracting the SQLite row ID embedded in each composite document ID before returning distances and metadata.
breakdown_responsibility: The retrieval layer in claude-mem's context injection pipeline: it fetches semantically relevant past observations and summaries from Chroma so the session-start hook can inject only the most pertinent memory into Claude's context window.
breakdown_clever: Chroma document IDs encode compound keys like `obs_42_narrative` or `summary_42_request` — the regex dedup collapses all vector chunks for the same database row into one result, preventing a single observation's multiple embedding variants from inflating its apparent relevance.
project_context: claude-mem is a Claude Code plugin that captures tool usage during coding sessions, compresses it via the Claude Agent SDK, and injects semantically relevant past context into future sessions, giving Claude a persistent memory layer across separate coding conversations.

### Reformatted Snippet

```typescript
async queryChroma(
  query: string,
  limit: number,
  whereFilter?: Record<string, any>
): Promise<{
  ids: number[];
  distances: number[];
  metadatas: any[];
}> {
  await this.ensureCollectionExists();

  const chromaMcp = ChromaMcpManager.getInstance();
  const results = await chromaMcp.callTool(
    'chroma_query_documents',
    {
      collection_name: this.collectionName,
      query_texts: [query],
      n_results: limit,
      ...(whereFilter && { where: whereFilter }),
      include: ['documents', 'metadatas', 'distances']
    }
  ) as any;

  const ids: number[] = [];
  const seen = new Set<number>();
  const docIds = results?.ids?.[0] || [];
  const rawMetadatas = results?.metadatas?.[0] || [];
  const rawDistances = results?.distances?.[0] || [];

  const metadatas: any[] = [];
  const distances: number[] = [];

  for (let i = 0; i < docIds.length; i++) {
    const docId = docIds[i];
    // Extract sqlite_id from compound document ID:
    //   obs_{id}_narrative, obs_{id}_fact_0
    //   summary_{id}_request, summary_{id}_learned
    //   prompt_{id}
    const obsMatch = docId.match(/obs_(\d+)_/);
    const summaryMatch = docId.match(/summary_(\d+)_/);
    const promptMatch = docId.match(/prompt_(\d+)/);

    let sqliteId: number | null = null;
    if (obsMatch) {
      sqliteId = parseInt(obsMatch[1], 10);
    } else if (summaryMatch) {
      sqliteId = parseInt(summaryMatch[1], 10);
    } else if (promptMatch) {
      sqliteId = parseInt(promptMatch[1], 10);
    }

    if (sqliteId !== null && !seen.has(sqliteId)) {
      seen.add(sqliteId);
      ids.push(sqliteId);
      metadatas.push(rawMetadatas[i] ?? null);
      distances.push(rawDistances[i] ?? 0);
    }
  }

  return { ids, distances, metadatas };
}
```

## Repo 2 — thedotmack/claude-mem

- file_path: src/services/domain/ModeManager.ts
- snippet_url: https://github.com/thedotmack/claude-mem/blob/main/src/services/domain/ModeManager.ts

file_intent: Mode inheritance loader with fallback chain
breakdown_what: Loads a named mode configuration by resolving its optional parent–override inheritance chain: base modes are loaded directly from disk, while compound modes deep-merge a parent config with a named override layer.
breakdown_responsibility: Controls which behavioral mode claude-mem runs in — modes define what observations to capture and inject; this function resolves the parent–override inheritance chain so users can extend built-in modes without duplicating config.
breakdown_clever: The function is mutually recursive: loading a child calls `loadMode(parentId)`, which may itself have a parent. The fallback to `'code'` is the base case, but a missing `code.json` deliberately throws instead of recursing — without this guard, any missing root mode would spin into infinite recursion.
project_context: claude-mem is a Claude Code plugin for persistent memory across coding sessions; its mode system lets teams switch between named behavioral presets that configure what gets captured, compressed, and surfaced at each session start.

### Reformatted Snippet

```typescript
loadMode(modeId: string): ModeConfig {
  const inheritance = this.parseInheritance(modeId);

  if (!inheritance.hasParent) {
    try {
      const mode = this.loadModeFile(modeId);
      this.activeMode = mode;
      logger.debug('SYSTEM',
        `Loaded mode: ${mode.name} (${modeId})`
      );
      return mode;
    } catch (error) {
      logger.warn('SYSTEM',
        `Mode file not found: ${modeId}, ` +
        `falling back to 'code'`
      );
      if (modeId === 'code') {
        throw new Error(
          'Critical: code.json mode file missing'
        );
      }
      return this.loadMode('code');
    }
  }

  const { parentId, overrideId } = inheritance;

  let parentMode: ModeConfig;
  try {
    parentMode = this.loadMode(parentId);
  } catch (error) {
    logger.warn('SYSTEM',
      `Parent mode '${parentId}' not found for ` +
      `${modeId}, falling back to 'code'`
    );
    parentMode = this.loadMode('code');
  }

  let overrideConfig: Partial<ModeConfig>;
  try {
    overrideConfig = this.loadModeFile(overrideId);
  } catch (error) {
    logger.warn('SYSTEM',
      `Override '${overrideId}' not found, ` +
      `using parent '${parentId}' only`
    );
    this.activeMode = parentMode;
    return parentMode;
  }

  const mergedMode = this.deepMerge(
    parentMode, overrideConfig
  );
  this.activeMode = mergedMode;
  return mergedMode;
}
```
