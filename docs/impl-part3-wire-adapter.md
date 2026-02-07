# Implementation Plan: Part 3 — Wire iris-vscode as Adapter

## Goal

Rewire all imports in `iris-vscode` to consume `@iris/core`. Delete moved files. Extension compiles and behaves identically to before the restructuring.

## Import Rewiring Map

Every file in `iris-vscode/src/` and what changes:

### Files that need import changes

| File | Import before | Import after |
|---|---|---|
| `extension.ts` | `IRISAnalysisState` from `./state/irisState` | from `@iris/core` |
| `extension.ts` | `generateBlockId` from `./utils/blockId` | from `@iris/core` |
| `extension.ts` | `IRISAPIClient, APIError, APIErrorType` from `./api/irisClient` | from `@iris/core` |
| `extension.ts` | `IRISStateManager` from `./state/irisState` | from `./state/irisState` (adapter wrapper) |
| `decorations/decorationManager.ts` | `NormalizedResponsibilityBlock` from `../state/irisState` | from `@iris/core` |
| `webview/sidePanel.ts` | `IRISAnalysisState, AnalysisData` from `../state/irisState` | from `@iris/core` |
| `webview/sidePanel.ts` | `IRISStateManager` from `../state/irisState` | from `../state/irisState` (adapter wrapper) |
| `types/messages.ts` | `IRISAnalysisState, AnalysisMetadata, NormalizedResponsibilityBlock` from `../state/irisState` | from `@iris/core` |

### Files with NO changes needed

| File | Reason |
|---|---|
| `decorations/segmentNavigator.ts` | Only imports `vscode` and local `logger` |
| `utils/colorAssignment.ts` | Pure utility, no cross-package imports |
| `utils/logger.ts` | Keep as-is (see step 2 below) |

## Steps

### 1. Rewrite `state/irisState.ts` as adapter wrapper

This is the key file. The current file contains both domain types and the `IRISStateManager` class. After Part 2, the domain types and pure state logic live in `@iris/core`. This file becomes a thin VS Code adapter.

**New `state/irisState.ts`:**

```ts
import * as vscode from 'vscode';
import { IRISCoreState, IRISAnalysisState, type AnalysisData, type Logger } from '@iris/core';
import { createLogger } from '../utils/logger';

// Re-export core types so existing local imports don't break during migration
export { IRISAnalysisState } from '@iris/core';
export type { FileIntent, ResponsibilityBlock, ... } from '@iris/core';

export class IRISStateManager {
  private core: IRISCoreState;
  private stateChangeEmitter: vscode.EventEmitter<IRISAnalysisState>;
  public readonly onStateChange: vscode.Event<IRISAnalysisState>;

  constructor(outputChannel: vscode.OutputChannel) {
    const logger = createLogger(outputChannel, 'StateManager');
    this.core = new IRISCoreState(logger);

    this.stateChangeEmitter = new vscode.EventEmitter<IRISAnalysisState>();
    this.onStateChange = this.stateChangeEmitter.event;

    // Bridge core callbacks → vscode.EventEmitter
    this.core.onStateChange((state) => {
      this.stateChangeEmitter.fire(state);
    });
  }

  // Delegate all methods to core
  startAnalysis(fileUri: string) { this.core.startAnalysis(fileUri); }
  setAnalyzed(data: AnalysisData) { this.core.setAnalyzed(data); }
  setError(error: string, fileUri?: string) { this.core.setError(error, fileUri); }
  setStale() { this.core.setStale(); }
  reset() { this.core.reset(); }

  // Delegate all selectors
  getCurrentState() { return this.core.getCurrentState(); }
  getAnalysisData() { return this.core.getAnalysisData(); }
  // ... all other getters delegate to this.core

  // Delegate selection methods
  selectBlock(blockId: string) { this.core.selectBlock(blockId); }
  deselectBlock() { this.core.deselectBlock(); }
  // ... etc

  dispose() {
    this.core.dispose();
    this.stateChangeEmitter.dispose();
  }
}
```

The adapter's only job: bridge `IRISCoreState`'s callback listener to `vscode.EventEmitter`/`vscode.Event`, and inject the VS Code logger.

### 2. Update `utils/logger.ts`

Add the `Logger` interface import so the VS Code implementation explicitly satisfies the core contract:

```ts
import type { Logger as ILogger } from '@iris/core';

export class Logger implements ILogger {
  // ... existing implementation unchanged
}
```

No behavior changes. This just makes the contract explicit.

### 3. Delete moved files from iris-vscode

These files now live in `@iris/core`:

- Delete `src/api/irisClient.ts` (and `src/api/` directory if empty)
- Delete `src/utils/blockId.ts`

### 4. Update imports in `extension.ts`

```ts
// Before
import { IRISStateManager, IRISAnalysisState } from './state/irisState';
import { generateBlockId } from './utils/blockId';
import { IRISAPIClient, APIError, APIErrorType } from './api/irisClient';

// After
import { IRISAnalysisState, generateBlockId, IRISAPIClient, APIError, APIErrorType } from '@iris/core';
import { IRISStateManager } from './state/irisState';  // adapter wrapper
```

All other imports in `extension.ts` stay unchanged (`createLogger`, `DecorationManager`, `SegmentNavigator`, `IRISSidePanelProvider`).

### 5. Update imports in `decorations/decorationManager.ts`

```ts
// Before
import type { NormalizedResponsibilityBlock } from '../state/irisState';

// After
import type { NormalizedResponsibilityBlock } from '@iris/core';
```

All other imports stay unchanged (`vscode`, local `logger`, local `colorAssignment`).

### 6. Update imports in `webview/sidePanel.ts`

```ts
// Before
import { IRISStateManager, IRISAnalysisState, AnalysisData } from '../state/irisState';

// After
import { IRISAnalysisState } from '@iris/core';
import type { AnalysisData } from '@iris/core';
import { IRISStateManager } from '../state/irisState';  // adapter wrapper
```

All other imports stay unchanged (`vscode`, local `logger`, local `decorationManager`, etc.).

### 7. Update imports in `types/messages.ts`

```ts
// Before
import { IRISAnalysisState, AnalysisMetadata, NormalizedResponsibilityBlock } from '../state/irisState';

// After
import { IRISAnalysisState } from '@iris/core';
import type { AnalysisMetadata, NormalizedResponsibilityBlock } from '@iris/core';
```

### 8. Verify esbuild resolves `@iris/core`

The current `esbuild.js` already bundles everything except `vscode`:

```js
external: ['vscode'],
```

npm workspaces creates a symlink at `node_modules/@iris/core` → `packages/iris-core`. esbuild follows symlinks and resolves TypeScript via the package's `main`/`types` fields. **No esbuild config changes needed** — as long as `iris-core` is built first (`npm run build` in iris-core).

### 9. Update build order

Add a root-level script or document the build order:

```bash
# From repo root
cd packages/iris-core && npm run build      # Must build first (emits .js + .d.ts)
cd packages/iris-vscode && npm run compile  # Consumes @iris/core
```

Optionally add to root `package.json`:

```json
"scripts": {
  "build": "npm -w @iris/core run build && npm -w iris run compile"
}
```

### 10. Verify and smoke test

```bash
npm run build              # Full build from root
```

Verification:
- [ ] `iris-core` builds cleanly
- [ ] `iris-vscode` compiles with zero errors
- [ ] No `import ... from '../api/irisClient'` or `'../utils/blockId'` remain in iris-vscode
- [ ] No duplicate type definitions (all domain types come from `@iris/core`)
- [ ] Extension launches in VS Code dev host
- [ ] Run Analysis command works end-to-end
- [ ] Block hover highlights code
- [ ] Block select/deselect works
- [ ] Segment navigation works
- [ ] File edit → STALE transition works
- [ ] Escape key deselects block

## Files Changed Summary

| Action | Path |
|---|---|
| Rewrite | `packages/iris-vscode/src/state/irisState.ts` → adapter wrapper |
| Modify | `packages/iris-vscode/src/utils/logger.ts` → add `implements Logger` |
| Modify | `packages/iris-vscode/src/extension.ts` → update imports |
| Modify | `packages/iris-vscode/src/decorations/decorationManager.ts` → update imports |
| Modify | `packages/iris-vscode/src/webview/sidePanel.ts` → update imports |
| Modify | `packages/iris-vscode/src/types/messages.ts` → update imports |
| Delete | `packages/iris-vscode/src/api/irisClient.ts` |
| Delete | `packages/iris-vscode/src/utils/blockId.ts` |
| Modify | root `package.json` → add build script |

## Risks

- **Build order dependency** — `iris-core` must be built before `iris-vscode` compiles. If someone runs `npm run compile` in iris-vscode without building core first, TypeScript will fail to find `@iris/core` types. The root build script enforces this.
- **Re-exports in adapter** — The adapter `irisState.ts` re-exports core types for a smoother migration. These re-exports can be removed later once all consumers import directly from `@iris/core`.
- **esbuild symlink resolution** — If esbuild has trouble following the workspace symlink, the fallback is adding `@iris/core` to esbuild's `nodePaths` or using `tsconfig` paths. This is unlikely but noted.

## Implementation Notes (from codebase review)

### Adapter wrapper must delegate all 21 public methods

The adapter `IRISStateManager` in Step 1 uses `// ...` shortcuts. The actual class has 21 public methods that must all be delegated to `IRISCoreState`:

**State transitions (5):** `startAnalysis`, `setAnalyzed`, `setError`, `setStale`, `reset`

**Selectors (11):** `getCurrentState`, `getAnalysisData`, `getFileIntent`, `getResponsibilityBlocks`, `getMetadata`, `getAnalyzedFileUri`, `getActiveFileUri`, `hasAnalysisData`, `isAnalyzing`, `isStale`, `getRawResponse`

**Selection (5):** `selectBlock`, `deselectBlock`, `getCurrentSegmentIndex`, `setCurrentSegmentIndex`, `getSelectedBlockId`, `isBlockSelected`

Missing a delegation will cause a runtime crash. Systematically verify every method during implementation.

### `ExtensionState` interface is absorbed into core

`irisState.ts` currently defines a private `ExtensionState` interface (the internal state container). After extraction, this interface is absorbed into `IRISCoreState`'s private internals in iris-core. It does not need to be re-exported from the adapter and should not appear in the new `irisState.ts`.

### `decorationManager.ts` has an unused `crypto` import

Line 2: `import * as crypto from 'crypto'` is present but unused. Not related to the restructuring, but may trigger a lint warning after the import changes. Consider removing it during this pass.

### Part 2 barrel export must include API response types

`extension.ts` implicitly depends on `AnalysisResponse` and `APIResponsibilityBlock` types from `irisClient.ts` (via `apiClient.analyze()` return type). Part 2's barrel export in `iris-core/src/index.ts` must export these types, not just `IRISAPIClient`, `APIError`, and `APIErrorType`.
