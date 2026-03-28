# Breakdown Review — 2026-03-28 — JS/TS

Issue: #7
Date: 2026-03-28
Language: JS/TS
Status: PENDING_APPROVAL

## Repo 1 — supermemoryai/supermemory

- file_path: apps/web/hooks/use-document-mutations.ts
- snippet_url: https://github.com/supermemoryai/supermemory/blob/main/apps/web/hooks/use-document-mutations.ts

file_intent: Optimistic document mutation hook
breakdown_what: Cancels in-flight React Query fetches, snapshots the current cache, uploads files in batches of three concurrent requests, then restores the pre-mutation cache state for any entries that failed — collecting per-file error details without aborting the whole batch.
breakdown_responsibility: Manages the optimistic UI update cycle for adding documents to the Supermemory store — the snapshot-then-cancel pattern ensures the cache rollback target reflects the true pre-mutation state, not a stale value written by a racing background refetch.
breakdown_clever: `cancelAndSnapshotQueries` cancels inflight fetches before snapshotting — if the cancel were skipped, a background refetch completing between the snapshot and mutation would make the snapshot stale, causing rollback to restore an outdated cache state instead of the pre-mutation truth.
project_context: Supermemory is a memory API for AI agents that achieves ~99% on the LongMemEval benchmark, designed to give AI systems persistent, queryable memory across sessions — used by developers building AI assistants that need long-term coherence across conversations.

### Reformatted Snippet

```ts
const FILE_UPLOAD_CONCURRENCY = 3

async function cancelAndSnapshotQueries(
  queryClient: QueryClient,
): Promise<[unknown, unknown][]> {
  await queryClient.cancelQueries({
    queryKey: ["documents-with-memories"],
  })
  return queryClient.getQueriesData({
    queryKey: ["documents-with-memories"],
  })
}

function restoreQueriesFromSnapshot(
  queryClient: QueryClient,
  previousQueries: [unknown, unknown][] | undefined,
): void {
  if (!previousQueries) return
  for (const [queryKey, data] of previousQueries) {
    queryClient.setQueryData(
      queryKey as unknown[],
      data,
    )
  }
}

// inside fileMutation.mutationFn:
for (
  let i = 0;
  i < fileEntries.length;
  i += FILE_UPLOAD_CONCURRENCY
) {
  const slice = fileEntries.slice(
    i,
    i + FILE_UPLOAD_CONCURRENCY,
  )
  await Promise.all(
    slice.map(async (entry) => {
      try {
        await uploadOne(entry)
      } catch (e) {
        failures.push({
          id: entry.id,
          message:
            e instanceof Error
              ? e.message
              : "Upload failed",
        })
      }
    }),
  )
}
```

## Repo 2 — ruvnet/ruflo

- file_path: v3/src/task-execution/domain/Task.ts
- snippet_url: https://github.com/ruvnet/ruflo/blob/main/v3/src/task-execution/domain/Task.ts

file_intent: Dependency-aware task scheduler
breakdown_what: Performs an iterative topological sort: each pass collects tasks whose dependencies are already resolved, sorts them by priority, appends them to the output, and repeats — stopping when all tasks are ordered or no forward progress is possible.
breakdown_responsibility: Determines the safe execution sequence for Ruflo's agent swarms — since specialized agents declare data dependencies on each other's outputs, this ensures no agent runs before its required inputs are available, preventing undefined behavior in coordinated multi-agent workflows.
breakdown_clever: Cycle detection is implicit: if `ready` is empty but `remaining` is not, every remaining task is blocked by another remaining task — proving a cycle without DFS or graph coloring, though this approach provides no information about which specific tasks form the cycle.
project_context: Ruflo (formerly Claude Flow) is an enterprise multi-agent orchestration platform that coordinates 60+ specialized AI agents built on Claude, with self-learning swarm intelligence, fault-tolerant consensus, and native Claude Code MCP integration — used for autonomous software development workflows.

### Reformatted Snippet

```ts
static resolveExecutionOrder(tasks: Task[]): Task[] {
  const resolved: Task[] = [];
  const resolvedIds = new Set<string>();
  const remaining = [...tasks];

  while (remaining.length > 0) {
    const ready = remaining.filter(task =>
      task.areDependenciesResolved(resolvedIds)
    );

    if (ready.length === 0 && remaining.length > 0) {
      throw new Error(
        'Circular dependency detected in tasks'
      );
    }

    const sorted = Task.sortByPriority(ready);

    for (const task of sorted) {
      resolved.push(task);
      resolvedIds.add(task.id);
      const index = remaining.indexOf(task);
      if (index > -1) {
        remaining.splice(index, 1);
      }
    }
  }

  return resolved;
}
```
