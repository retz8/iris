# Breakdown Review — 2026-06-12 — JS/TS

Issue: #18
Date: 2026-06-12
Language: JS/TS
Status: PENDING_APPROVAL

## Repo 1 — EveryInc/compound-engineering-plugin

- file_path: src/converters/claude-to-codex.ts
- snippet_url: https://github.com/EveryInc/compound-engineering-plugin/blob/main/src/converters/claude-to-codex.ts

file_intent: Claude-to-Codex agent name mapper
breakdown_what: Builds a lookup table mapping every possible name alias of each Claude agent — raw, normalized, prefix-stripped, and fully-qualified category-scoped variants — to its corresponding Codex agent target name.
breakdown_responsibility: When a user references a Claude plugin agent from within Codex, this converter ensures the reference resolves regardless of naming convention — raw name, normalized, category-prefixed, or fully plugin-scoped — making cross-platform agent invocation transparent.
breakdown_clever: Each agent can generate up to 7 distinct aliases, including 4 that only exist when a `category` is present. The `filter(Boolean)` at the end silently prunes empty-string entries produced by ternaries whose conditions didn't match, avoiding explicit conditional branching for each alias variant.
project_context: Compound Engineering Plugin is Every.to's official workflow system for AI coding agents, enforcing an 80% planning, 20% execution discipline across Claude Code, Cursor, Codex, and more. With 21,000+ stars and near-daily releases, it's become a widely adopted methodology for engineering teams scaling AI-assisted development.

### Reformatted Snippet

```typescript
function buildAgentTargets(
  plugin: ClaudePlugin,
  agents: CodexAgent[],
): Record<string, string> {
  const targets: Record<string, string> = {}
  plugin.agents.forEach((agent, index) => {
    const targetName = agents[index]?.name
    if (!targetName) return
    const category = getAgentCategory(agent)
    const aliases = [
      agent.name,
      normalizeCodexName(agent.name),
      agent.name.startsWith("ce-")
        ? agent.name.slice("ce-".length)
        : "",
      category ? `${category}:${agent.name}` : "",
      category && agent.name.startsWith("ce-")
        ? `${category}:${agent.name.slice("ce-".length)}`
        : "",
      category
        ? `${plugin.manifest.name}:${category}:${agent.name}`
        : "",
      category && agent.name.startsWith("ce-")
        ? `${plugin.manifest.name}:${category}` +
          `:${agent.name.slice("ce-".length)}`
        : "",
    ].filter(Boolean)

    for (const alias of aliases) {
      targets[normalizeCodexName(alias)] = targetName
    }
  })
  return targets
}

function getAgentCategory(agent: ClaudeAgent): string | null {
  const parts = agent.sourcePath.split(path.sep)
  const agentsIndex = parts.lastIndexOf("agents")
  if (agentsIndex === -1) return null
  const next = parts[agentsIndex + 1]
  if (!next || next.endsWith(".md")) return null
  return next
}
```

## Repo 2 — activeloopai/hivemind

- file_path: src/graph/extract/go.ts
- snippet_url: https://github.com/activeloopai/hivemind/blob/main/src/graph/extract/go.ts

file_intent: Go AST call-graph edge extractor
breakdown_what: Recursively walks a tree-sitter AST for Go source, identifies simple identifier call expressions, resolves both the callee and enclosing function against a declaration map, and appends a directed `"calls"` edge to the extraction result.
breakdown_responsibility: This is the call-graph construction pass in Hivemind's Go language extractor — the edges it emits define which functions invoke which others, forming the backbone of the cross-agent semantic memory that Hivemind uses to avoid duplicate work across sessions.
breakdown_clever: Edges are only recorded when both `target` and `caller` resolve in `declByName` — calls to external packages or anonymous functions are silently dropped. This keeps the graph to file-local relationships by design, meaning cross-package call chains are invisible to Hivemind's memory layer.
project_context: Hivemind is Activeloop's shared memory layer for multi-agent AI teams, giving every agent in a session access to a persistent call graph and context store backed by DeepLake embeddings to prevent duplicate work across Claude Code, Codex, and Cursor. At the LoCoMo benchmark it reduced costs by 25% and cut agent turns by 31%.

### Reformatted Snippet

```typescript
function collectCalls(
  node: TSNode,
  result: FileExtraction,
  declByName: Map<string, GraphNode>,
): void {
  if (node.type === "call_expression") {
    const fn = node.childForFieldName("function");
    if (fn !== null && fn.type === "identifier") {
      const target = declByName.get(fn.text);
      const caller = findEnclosingFn(node, declByName);
      if (target !== undefined && caller !== null) {
        result.edges.push({
          source: caller.id,
          target: target.id,
          relation: "calls",
          confidence: "EXTRACTED",
        });
      }
    }
  }
  for (let i = 0; i < node.namedChildCount; i++) {
    const child = node.namedChild(i);
    if (child !== null)
      collectCalls(child, result, declByName);
  }
}
```
