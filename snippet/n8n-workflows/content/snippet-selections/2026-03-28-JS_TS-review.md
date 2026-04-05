# Breakdown Review — 2026-03-28 — JS/TS

Issue: #7
Date: 2026-03-28
Language: JS/TS
Status: PENDING_APPROVAL

## Repo 1 — supermemoryai/supermemory

- file_path: apps/web/hooks/use-document-mutations.ts
- snippet_url: https://github.com/supermemoryai/supermemory/blob/main/apps/web/hooks/use-document-mutations.ts

file_intent: Optimistic document upload mutation hook
breakdown_what: Cancels in-flight React Query document fetches and snapshots their current cache state, then uploads files in controlled batches of 3 using Promise.all, collecting per-file failures without interrupting the overall batch.
breakdown_responsibility: Manages the UI consistency contract for file uploads in the memory app — prevents stale server responses from overwriting optimistic updates mid-flight and gives the mutation handler a safe, known-good cache state to roll back to on failure.
breakdown_clever: `cancelAndSnapshotQueries` cancels queries and then immediately reads the cache — the snapshot captures whatever the cache held at the moment of cancellation, which is the last confirmed server state, not any optimistic local update. This is what makes the rollback safe rather than restoring corrupt data.
project_context: A memory infrastructure layer for AI apps that gives LLMs persistent, personalized memory across sessions via a single API, without requiring developers to build their own vector DB pipelines or embedding logic; backed by Google executives after rapid adoption among AI app builders.

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
  previousQueries:
    | [unknown, unknown][]
    | undefined,
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

file_intent: Task dependency topological sorter
breakdown_what: Iteratively pulls all tasks whose dependencies are fully resolved, sorts them by priority, appends them to the output list, and repeats until the queue empties — throwing an error when a full pass yields no ready tasks, indicating a cycle.
breakdown_responsibility: Ensures agents in Ruflo's swarm execute in dependency order — a coding agent cannot run before the planning agent it depends on finishes — without requiring the caller to pre-sort or pre-validate the task graph.
breakdown_clever: Rather than building an explicit adjacency graph or in-degree map (standard Kahn's algorithm), the code re-scans remaining tasks each iteration via `areDependenciesResolved`. This is O(n²) but keeps the implementation stateless — it remains correct even if tasks mutate or are added at runtime, which matters in a live agent swarm.
project_context: A multi-agent orchestration layer built around Claude that solves the practical limits of single-agent coding workflows — context window size and serial execution — by spawning parallel swarms of specialized agents coordinated through shared memory; cited at roughly 100,000 monthly active users.

### Reformatted Snippet

```ts
static resolveExecutionOrder(
  tasks: Task[]
): Task[] {
  const resolved: Task[] = [];
  const resolvedIds = new Set<string>();
  const remaining = [...tasks];

  while (remaining.length > 0) {
    const ready = remaining.filter(task =>
      task.areDependenciesResolved(resolvedIds)
    );

    if (
      ready.length === 0 &&
      remaining.length > 0
    ) {
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
