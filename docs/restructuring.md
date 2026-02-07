# Repository Restructuring: Monorepo with iris-core

## Why Restructure

IRIS's vision is to be a universal code reading layer — not tied to any single platform (see `vision.md`). The current codebase has all logic inside `vscode-extension/`, which means:

- **Domain models** (File Intent, Responsibility Blocks) live inside a VS Code-specific package
- **State management** and **API communication** are coupled to VS Code imports by proximity, even though they are conceptually platform-agnostic
- When Phase 2 (browser extension) begins, extracting shared logic will require painful untangling

The restructuring separates what is universal from what is platform-specific — **before** accidental coupling makes it expensive.

## Core Principle

> If it imports from `vscode`, it stays in the adapter. If it doesn't, it belongs in `iris-core`.

## Target Structure

```
iris/
  packages/
    iris-core/          # Pure TypeScript, zero platform dependencies
      src/
        models/         # FileIntent, ResponsibilityBlock, block ranges
        state/          # State machine (IDLE → ANALYZING → ANALYZED → STALE)
        api/            # API client, request/response contracts
        types/          # Shared type definitions
    iris-vscode/        # VS Code adapter (renamed from vscode-extension/)
      src/
        decorations/    # Line decorations, color assignment
        webview/        # Side panel rendering
        utils/          # VS Code-specific utilities
        extension.ts    # Entry point
  backend/              # Unchanged
  docs/
  package.json          # Root — npm workspaces config
```

## What Moves to iris-core

| Module | Current Location | Reason |
|---|---|---|
| State machine logic | `state/irisState.ts` | State transitions are platform-agnostic |
| API client | `api/irisClient.ts` | HTTP calls and response parsing have no VS Code dependency |
| Domain types | Scattered across files | FileIntent, ResponsibilityBlock are core abstractions |

## What Stays in iris-vscode

Everything that directly interfaces with VS Code APIs: decoration rendering, webview panel, segment navigation, editor commands, and the extension entry point.

## Tooling Choice

**npm workspaces** — zero migration cost (already using npm), minimal config, no compatibility issues with VS Code extension tooling (`vsce`, esbuild). Sufficient for a 2-package monorepo.

## Guiding Constraints

- **No abstract adapter interfaces yet.** We don't design a plugin contract until we have two real consumers to validate it against.
- **iris-core has zero platform dependencies.** Not even Node-specific APIs where avoidable — keep it portable.
- **The VS Code extension must keep working throughout.** Every step should leave `npm run compile` passing.
