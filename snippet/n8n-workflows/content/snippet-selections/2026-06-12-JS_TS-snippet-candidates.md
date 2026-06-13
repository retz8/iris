# Snippet Candidates — 2026-06-12 — JS_TS

Issue: #18
Date: 2026-06-12
Language: JS_TS
Status: COMPLETED

## Repo 1 — EveryInc/compound-engineering-plugin

### Candidate 1 (most important)

- file_path: src/parsers/claude.ts
- snippet_url: https://github.com/EveryInc/compound-engineering-plugin/blob/main/src/parsers/claude.ts
- reasoning: This is the entry point to the plugin's core parsing pipeline — it loads, resolves, and assembles every structural component (agents, commands, skills, hooks, MCP servers) from the filesystem, making it the foundational function that everything else in the converter chain depends on.

```typescript
export async function loadClaudePlugin(
  inputPath: string,
): Promise<ClaudePlugin> {
  const root = await resolveClaudeRoot(inputPath)
  const manifestPath = path.join(root, PLUGIN_MANIFEST)
  const manifest = await readJson<ClaudeManifest>(manifestPath)

  const agents = await loadAgents(
    resolveComponentDirs(root, "agents", manifest.agents),
  )
  const commands = await loadCommands(
    resolveComponentDirs(root, "commands", manifest.commands),
  )
  const skills = await loadSkills(
    resolveComponentDirs(root, "skills", manifest.skills),
  )
  const hooks = await loadHooks(root, manifest.hooks)
  const mcpServers = await loadMcpServers(root, manifest)

  return { root, manifest, agents, commands, skills, hooks, mcpServers }
}

function resolveWithinRoot(
  root: string,
  entry: string,
  label: string,
): string {
  const resolvedRoot = path.resolve(root)
  const resolvedPath = path.resolve(root, entry)
  if (
    resolvedPath === resolvedRoot ||
    resolvedPath.startsWith(resolvedRoot + path.sep)
  ) {
    return resolvedPath
  }
  throw new Error(
    `Invalid ${label}: ${entry}. ` +
    `Paths must stay within the plugin root.`,
  )
}
```

### Candidate 2

- file_path: src/targets/managed-artifacts.ts
- snippet_url: https://github.com/EveryInc/compound-engineering-plugin/blob/main/src/targets/managed-artifacts.ts
- reasoning: This function implements a two-layer path-traversal defense for the install manifest — dropping unsafe entries at read time with a warning, then re-checking at cleanup time — revealing how the plugin prevents a corrupted or tampered manifest from deleting files outside the managed root.

```typescript
export async function readManagedInstallManifest(
  managedDir: string,
  pluginName: string,
): Promise<ManagedInstallManifest | null> {
  const manifestPath = path.join(managedDir, MANAGED_INSTALL_MANIFEST)
  try {
    const raw = await readText(manifestPath)
    const parsed = JSON.parse(raw) as Partial<ManagedInstallManifest>
    if (
      parsed.version === 1 &&
      parsed.pluginName === pluginName &&
      parsed.groups &&
      typeof parsed.groups === "object" &&
      !Array.isArray(parsed.groups) &&
      Object.values(parsed.groups).every(
        (entries) => Array.isArray(entries),
      )
    ) {
      const safeGroups: Record<string, string[]> = {}
      for (const [group, entries] of Object.entries(parsed.groups)) {
        const safe: string[] = []
        for (const entry of entries as unknown[]) {
          if (isSafeManagedPath(managedDir, entry)) {
            safe.push(entry)
          } else {
            console.warn(
              `Dropping unsafe install-manifest entry ` +
              `in ${manifestPath} ` +
              `(group "${group}"): ${JSON.stringify(entry)}`,
            )
          }
        }
        safeGroups[group] = safe
      }
      return { version: 1, pluginName, groups: safeGroups }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(
        `Ignoring unreadable install manifest at ${manifestPath}.`,
      )
    }
  }
  return null
}
```

### Candidate 3 (least important)

- file_path: src/converters/claude-to-codex.ts
- snippet_url: https://github.com/EveryInc/compound-engineering-plugin/blob/main/src/converters/claude-to-codex.ts
- reasoning: This function shows how the plugin builds a multi-alias invocation routing table for Codex agents, accounting for name normalization, `ce-` prefix stripping, category namespacing, and plugin-scoped paths — a non-obvious mapping that is worth understanding to see how cross-tool name resolution works.

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

### Candidate 1 (most important)

- file_path: src/graph/extract/shared.ts
- snippet_url: https://github.com/activeloopai/hivemind/blob/main/src/graph/extract/shared.ts
- reasoning: Every language extractor (TypeScript, Python, Go, Rust, etc.) calls `findEnclosingDecl` to attribute a call site to its nearest enclosing callable declaration, making it the shared foundation on which all "calls" edges in the dependency graph rest.

```typescript
export function findEnclosingDecl(
  node: TSNode,
  declTypes: string[],
  getName: (n: TSNode) => string | null,
  declByName: Map<string, GraphNode>,
): GraphNode | null {
  let cur: TSNode | null = node.parent;
  while (cur !== null) {
    if (declTypes.includes(cur.type)) {
      const name = getName(cur);
      if (name !== null) {
        const found = declByName.get(name);
        if (found !== undefined) return found;
      }
    }
    cur = cur.parent;
  }
  return null;
}
```

### Candidate 2

- file_path: src/graph/extract/go.ts
- snippet_url: https://github.com/activeloopai/hivemind/blob/main/src/graph/extract/go.ts
- reasoning: `collectCalls` is the recursive AST traversal that produces "calls" edges for Go files — it shows the full pattern (walk the tree, resolve the callee name, find the enclosing caller, push an edge) that all language extractors follow to build the call graph.

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
    if (child !== null) collectCalls(child, result, declByName);
  }
}
```

### Candidate 3 (least important)

- file_path: src/skillify/skill-edits.ts
- snippet_url: https://github.com/activeloopai/hivemind/blob/main/src/skillify/skill-edits.ts
- reasoning: These constants and `protectedRange` encode the SkillOpt "slow update" concept — a longitudinal protected section of a skill document that bounded fast edits must never touch, which is the architectural guard that prevents the optimizer from destabilizing hard-won long-term guidance.

```typescript
export const SU_START = "<!-- SLOW_UPDATE_START -->";
export const SU_END = "<!-- SLOW_UPDATE_END -->";

function protectedRange(
  skill: string
): [number, number] | null {
  const a = skill.indexOf(SU_START);
  const b = skill.indexOf(SU_END);
  if (a === -1 || b === -1 || b < a) return null;
  return [a, b + SU_END.length];
}
```
