# Breakdown Review — 2026-05-29 — JS_TS

Issue: #16
Date: 2026-05-29
Language: JS_TS
Status: COMPLETED

## Repo 1 — Lum1104/Understand-Anything

- file_path: understand-anything-plugin/packages/core/src/staleness.ts
- snippet_url: https://github.com/Lum1104/Understand-Anything/blob/main/understand-anything-plugin/packages/core/src/staleness.ts

file_intent: Incremental knowledge graph patch engine
breakdown_what: Removes all graph nodes tied to a set of changed file paths, prunes every edge whose source or target was removed, then splices in the freshly analyzed replacement nodes and edges, returning the updated graph stamped with the new commit hash.
breakdown_responsibility: Keeps the codebase knowledge graph in sync with git HEAD after each commit, replacing only the stale portion rather than re-analyzing the full project — every unchanged node and its cross-file relationships is preserved and immediately queryable.
breakdown_clever: The removal filter matches nodes by `filePath` string, not by node ID — so if a file is moved and the caller omits the old path from `changedFilePaths`, the stale nodes from the old location survive in the graph alongside the freshly analyzed ones at the new path.
project_context: Understand-Anything is an open-source developer tool that turns any codebase into an interactive knowledge graph you can explore, search, and ask questions about in plain English — it crossed 25,000 GitHub stars in May 2026 after going viral across the AI coding community.

### Reformatted Snippet

```typescript
export function mergeGraphUpdate(
  existingGraph: KnowledgeGraph,
  changedFilePaths: string[],
  newNodes: GraphNode[],
  newEdges: GraphEdge[],
  newCommitHash: string,
): KnowledgeGraph {
  const changedSet = new Set(changedFilePaths);

  // Collect IDs of nodes belonging to changed files
  const removedNodeIds = new Set(
    existingGraph.nodes
      .filter(
        (node) =>
          node.filePath !== undefined &&
          changedSet.has(node.filePath),
      )
      .map((node) => node.id),
  );

  // Keep nodes that don't belong to changed files
  const retainedNodes = existingGraph.nodes.filter(
    (node) => !removedNodeIds.has(node.id),
  );

  // Keep edges not touching removed nodes
  const retainedEdges = existingGraph.edges.filter(
    (edge) =>
      !removedNodeIds.has(edge.source) &&
      !removedNodeIds.has(edge.target),
  );

  return {
    ...existingGraph,
    project: {
      ...existingGraph.project,
      gitCommitHash: newCommitHash,
      analyzedAt: new Date().toISOString(),
    },
    nodes: [...retainedNodes, ...newNodes],
    edges: [...retainedEdges, ...newEdges],
  };
}
```

## Repo 2 — twentyhq/twenty

- file_path: packages/twenty-server/src/engine/api/graphql/graphql-query-runner/helpers/object-records-to-graphql-connection.helper.ts
- snippet_url: https://github.com/twentyhq/twenty/blob/main/packages/twenty-server/src/engine/api/graphql/graphql-query-runner/helpers/object-records-to-graphql-connection.helper.ts

file_intent: Composite CRM field deserializer
breakdown_what: Looks up the composite type definition for a structured CRM field, iterates its raw sub-field values, validates each sub-field key against the type's property registry, and formats every value via a per-type formatter before assembling the final typed object.
breakdown_responsibility: Converts flat database column values back into their structured GraphQL composite field shape on every API response — without this step, complex CRM field types like FULL_NAME, ADDRESS, and LINKS would return as raw untyped JSON instead of the typed nested objects the frontend depends on.
breakdown_clever: The `__typename` key is explicitly skipped rather than looked up in the composite type registry — this lets a GraphQL `__typename` annotation from a previous cached query round-trip through the backend without triggering the "sub field not found" error that any unregistered key would otherwise throw.
project_context: Twenty is a fully open-source CRM alternative to Salesforce with 44,000 GitHub stars, backed by Y Combinator and built with React, NestJS, and PostgreSQL — used by technical teams who want a customizable, self-hosted CRM without per-seat licensing costs.

### Reformatted Snippet

```typescript
private processCompositeField(
  fieldMetadata: FlatFieldMetadata,
  fieldValue: any,
): Record<string, any> {
  const compositeType = compositeTypeDefinitions.get(
    fieldMetadata.type as CompositeFieldMetadataType,
  );

  if (!compositeType) {
    throw new Error(
      `Composite type definition not found` +
      ` for type: ${fieldMetadata.type}`,
    );
  }

  return Object.entries(fieldValue).reduce(
    (acc, [subFieldKey, subFieldValue]) => {
      if (subFieldKey === '__typename') return acc;

      const subFieldMetadata = compositeType.properties.find(
        (property) => property.name === subFieldKey,
      );

      if (!subFieldMetadata) {
        throw new Error(
          `Sub field metadata not found for` +
          ` composite type: ${fieldMetadata.type}`,
        );
      }

      acc[subFieldKey] = this.formatFieldValue(
        subFieldValue,
        subFieldMetadata.type,
      );

      return acc;
    },
    {} as Record<string, any>,
  );
}
```
