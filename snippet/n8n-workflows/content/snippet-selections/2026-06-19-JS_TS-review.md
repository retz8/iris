# Breakdown Review — 2026-06-19 — JS/TS

Issue: #19
Date: 2026-06-19
Language: JS/TS
Status: COMPLETED

## Repo 1 — withastro/flue

- file_path: packages/runtime/src/session-history.ts
- snippet_url: https://github.com/withastro/flue/blob/main/packages/runtime/src/session-history.ts

file_intent: Agent session history context window assembler
breakdown_what: Reconstructs the model's context window by locating the latest compaction checkpoint in the history path, then stitching together the compaction's summary message, entries from before the checkpoint that were explicitly kept, and all entries recorded after it.
breakdown_responsibility: Acts as the gating function between the session's persistent history tree and the messages array sent to the model — every agent turn routes through this method, making it the sole control point for what the model can see and reason about from past interactions.
breakdown_clever: When `firstKeptEntryId` is absent from the active path (e.g., after a branch rewind), `findIndex` returns `-1` and `keptStart` silently skips the pre-compaction window entirely — preventing double-inclusion of the compaction entry itself, but also quietly dropping context with no signal to the caller that history was lost.
project_context: Flue is a TypeScript framework from the Astro team for building headless, programmable AI agents that deploy identically to Node, Cloudflare, and GitHub Actions — teams use it to write agents as code-driven workflows rather than chat-first interfaces.

### Reformatted Snippet

```typescript
buildContextEntries(): ContextEntry[] {
  const path = this.getActivePath();
  const latestCompactionIndex =
    findLatestCompactionIndex(path);
  if (latestCompactionIndex === -1) {
    return pathToContextEntries(path);
  }

  const compaction =
    path[latestCompactionIndex] as CompactionEntry;
  const firstKeptIndex = path.findIndex(
    (entry) =>
      entry.id === compaction.firstKeptEntryId,
  );
  const keptStart =
    firstKeptIndex >= 0
      ? firstKeptIndex
      : latestCompactionIndex + 1;
  const context: ContextEntry[] = [
    {
      message: createContextSummaryMessage(
        compaction.summary,
        compaction.timestamp,
      ),
      entry: compaction,
    },
  ];
  context.push(
    ...pathToContextEntries(
      path.slice(keptStart, latestCompactionIndex),
    ),
  );
  context.push(
    ...pathToContextEntries(
      path.slice(latestCompactionIndex + 1),
    ),
  );
  return context;
}
```

## Repo 2 — makeplane/plane

- file_path: packages/editor/src/core/extensions/keymap.ts
- snippet_url: https://github.com/makeplane/plane/blob/preview/packages/editor/src/core/extensions/keymap.ts

file_intent: Two-stage select-all keyboard shortcut
breakdown_what: Overrides Cmd+A to check whether the selection already spans the current node's full boundaries — selecting within the node first if not, then falling through to a full-document select-all on a subsequent press or when the cursor is already at the node's edges.
breakdown_responsibility: Enables the two-stage select-all convention expected in documents with nested blocks — without this, Cmd+A inside a list item or table cell immediately selects the entire document, bypassing the ability to grab just the current block's text first.
breakdown_clever: The boundary check uses ProseMirror document positions from `$from.start()` and `$to.end()` — integer offsets into the flat ProseMirror doc tree, not DOM coordinates. This makes the check correct across nested node types (tables, list items, callouts) whose visual boundaries don't map 1:1 to DOM character ranges.
project_context: Plane is an open-source Jira and Linear alternative built on ProseMirror/Tiptap, used by engineering teams to manage issues, sprints, and docs in self-hosted environments — its rich-text editor is a first-class feature across issues, pages, and cycle notes.

### Reformatted Snippet

```typescript
addKeyboardShortcuts() {
  return {
    "Mod-a": ({ editor }) => {
      const { state } = editor;
      const { tr } = state;
      const startSelectionPos = tr.selection.from;
      const endSelectionPos = tr.selection.to;
      const startNodePos = tr.selection.$from.start();
      const endNodePos = tr.selection.$to.end();
      const isNotAtNodeBoundaries =
        startSelectionPos > startNodePos ||
        endSelectionPos < endNodePos;

      if (isNotAtNodeBoundaries) {
        editor.chain()
          .selectTextWithinNodeBoundaries()
          .run();
        return true;
      } else {
        editor.commands.selectAll();
        return true;
      }
    },
  };
},
```
