# Breakdown Review — 2026-05-01 — JS/TS

Issue: #12
Date: 2026-05-01
Language: JS/TS
Status: COMPLETED

## Repo 1 — abhigyanpatwari/GitNexus

- file_path: gitnexus/src/core/graph/graph.ts
- snippet_url: https://github.com/abhigyanpatwari/GitNexus/blob/main/gitnexus/src/core/graph/graph.ts

file_intent: In-memory graph relationship write/delete layer
breakdown_what: Writes and removes graph relationships while keeping three synchronized indexes consistent: a flat ID map, a type-bucketed map, and a per-node adjacency set — with self-loop deduplication in the adjacency updates.
breakdown_responsibility: Acts as the sole mutation layer for GitNexus's in-browser call graph — every function relationship (calls, imports, inherits) produced during AST parsing flows through `writeRel`/`deleteRel`, keeping all query indexes consistent for BM25 search and Graph RAG traversal.
breakdown_clever: The self-loop guard `rel.targetId !== rel.sourceId` prevents a node from appearing twice in its own adjacency bucket — without it, traversal algorithms would double-count recursive function calls, silently inflating relevance scores in Graph RAG queries.
project_context: GitNexus is a zero-server code intelligence engine that runs entirely in the browser — drop in a GitHub repo or ZIP file and get an interactive call graph with a built-in Graph RAG agent for exploring dependencies and execution flows. Developers and AI coding agents like Claude Code and Cursor use it to understand unfamiliar codebases without any backend setup.

### Reformatted Snippet

```typescript
const writeRel = (rel: GraphRelationship): void => {
  relationshipMap.set(rel.id, rel);
  let typeBucket = relationshipsByType.get(rel.type);
  if (typeBucket === undefined) {
    typeBucket = new Map();
    relationshipsByType.set(rel.type, typeBucket);
  }
  typeBucket.set(rel.id, rel);
  addToBucket(edgeIdsByNode, rel.sourceId, rel.id);
  if (rel.targetId !== rel.sourceId) {
    addToBucket(edgeIdsByNode, rel.targetId, rel.id);
  }
};

const deleteRel = (rel: GraphRelationship): void => {
  relationshipMap.delete(rel.id);
  const typeBucket = relationshipsByType.get(rel.type);
  if (typeBucket !== undefined) {
    typeBucket.delete(rel.id);
    if (typeBucket.size === 0) {
      relationshipsByType.delete(rel.type);
    }
  }
  removeFromBucket(edgeIdsByNode, rel.sourceId, rel.id);
  if (rel.targetId !== rel.sourceId) {
    removeFromBucket(
      edgeIdsByNode, rel.targetId, rel.id
    );
  }
};
```

## Repo 2 — lukilabs/craft-agents-oss

- file_path: packages/session-tools-core/src/runtime/filesystem-isolation.ts
- snippet_url: https://github.com/lukilabs/craft-agents-oss/blob/main/packages/session-tools-core/src/runtime/filesystem-isolation.ts

file_intent: macOS sandbox profile generator for agent sessions
breakdown_what: Generates a macOS `sandbox-exec` profile string that denies all writes by default, grants write access to a single session directory, and optionally appends a full network deny rule — joining all rules into a single-line profile.
breakdown_responsibility: Enforces the write perimeter for each AI agent session running on macOS in craft-agents-oss — any tool the agent executes is sandbox-jailed to its session directory, preventing runaway writes to the broader filesystem or home directory.
breakdown_clever: The profile allows `file-read*` globally but restricts `file-write*` to the session subpath — a read-anywhere, write-confined model that lets the agent read system libraries and config files without requiring an explicit allowlist of every path it might need to read.
project_context: Craft Agents is an open-source AI agent framework built on Anthropic's Claude Agent SDK that connects GitHub, Linear, Slack, and local files through a desktop app with a document-centric workflow. Released by Lukilabs in May 2026 under Apache 2.0, it supports Claude, GPT-4, and other LLM providers.

### Reformatted Snippet

```typescript
function escapeSandboxPath(path: string): string {
  return path
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

export function buildDarwinSandboxProfile(
  sessionDir: string,
  options?: FilesystemIsolationOptions,
): string {
  const escapedRoot =
    escapeSandboxPath(resolve(sessionDir));
  const profileParts = [
    '(version 1)',
    '(deny default)',
    '(allow process*)',
    '(allow sysctl-read)',
    '(allow file-read*)',
    '(deny file-write*)',
    `(allow file-write* (subpath "${escapedRoot}"))`,
  ];

  if (options?.includeNetworkDeny) {
    profileParts.push('(deny network*)');
  }

  return profileParts.join(' ');
}
```
