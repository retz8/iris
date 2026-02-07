# Implementation Plan: Part 2 — Extract Pure Logic into iris-core

## Goal

Move all platform-agnostic code from `iris-vscode` into `@iris/core`. After this part, iris-core is a real package exporting domain models, state machine, API client, and block ID generation. No source code behavior changes.

## Current State (verified)

After Part 1, the repo has:
- `packages/iris-core/` with an empty `src/index.ts` (`export {}`) that builds successfully.
- `packages/iris-vscode/` with all original source unchanged.
- Both packages compile independently.

Source files involved in extraction (all paths relative to `packages/iris-vscode/src/`):

- **`state/irisState.ts`** — Contains domain types (lines 7-82) AND `IRISStateManager` class (lines 88-403). The types are pure; the class uses `vscode.EventEmitter` and `vscode.OutputChannel`.
- **`api/irisClient.ts`** — Already platform-agnostic. Only VS Code dependency is `import { Logger } from '../utils/logger'` where `Logger` is the concrete class, but the file only uses the interface-compatible methods (`info`, `warn`, `error`, `debug`, `errorWithException`).
- **`utils/blockId.ts`** — Pure Node.js. Uses `crypto.createHash` and imports `ResponsibilityBlock` from `../state/irisState`.
- **`utils/logger.ts`** — VS Code specific (uses `vscode.OutputChannel`, `vscode.window.showErrorMessage`). Only the **interface shape** moves to core, not the implementation.

## Extraction Map

| Source (iris-vscode) | Destination (iris-core) | What moves |
|---|---|---|
| `state/irisState.ts` lines 7-82 | `models/types.ts` | All type/interface definitions (7 exports) |
| `state/irisState.ts` lines 7-12, 88-403 | `state/analysisState.ts` | `IRISAnalysisState` enum + new `IRISCoreState` class |
| `api/irisClient.ts` entire file | `api/irisClient.ts` | Entire file (already platform-agnostic) |
| `utils/logger.ts` method signatures | `types/logger.ts` | Logger interface only (extracted from class shape) |
| `utils/blockId.ts` entire file | `utils/blockId.ts` | Entire file (pure Node.js) |

## Steps

### 1. Define Logger interface in iris-core

Create `packages/iris-core/src/types/logger.ts`:

```ts
/**
 * Platform-agnostic logger interface.
 * iris-core internals and adapters program against this contract.
 * VS Code adapter implements this via OutputChannel.
 * Future browser adapter would use console.
 */
export interface Logger {
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
  debug(message: string, context?: Record<string, any>): void;
  errorWithException(message: string, error: unknown, context?: Record<string, any>): void;
}
```

This matches the method signatures of the VS Code `Logger` class exactly (lines 31-68 of `utils/logger.ts`). The VS Code class also has a `show()` method (line 90) — this is **intentionally excluded** from the core interface because `show()` is VS Code specific (it reveals the output channel panel). Core code never calls `show()`.

### 2. Extract domain models to iris-core

Create `packages/iris-core/src/models/types.ts` by copying the type definitions from `irisState.ts` lines 14-82. These are pure types with zero imports.

The complete list of exports (copy exactly as they appear in the source):

```ts
/**
 * File Intent is a simple string describing file purpose
 */
export type FileIntent = string;

/**
 * Responsibility Block structure matching API response format
 */
export interface ResponsibilityBlock {
  description: string;
  label: string;
  ranges: Array<[number, number]>;  // ONE-based line numbers from API
}

/**
 * Analysis metadata with optional standard fields and extensibility
 */
export interface AnalysisMetadata {
  filepath?: string;
  url?: string;
  [key: string]: any;  // Allow arbitrary additional fields
}

/**
 * Normalized responsibility block with extension-generated blockId
 * Used internally after API response normalization
 */
export interface NormalizedResponsibilityBlock extends ResponsibilityBlock {
  blockId: string;
}

/**
 * Raw server response structure matching API contract
 */
export interface IRISAnalysisResponse {
  file_intent: string;
  metadata: AnalysisMetadata;
  responsibility_blocks: ResponsibilityBlock[];
}

/**
 * Internal analysis data structure storing both raw and normalized data
 */
export interface AnalysisData {
  fileIntent: FileIntent;
  metadata: AnalysisMetadata;
  responsibilityBlocks: NormalizedResponsibilityBlock[];
  rawResponse: IRISAnalysisResponse;  // Preserve original server response
  analyzedFileUri: string;             // URI of the analyzed file
  analyzedAt: Date;                    // Timestamp of analysis completion
}

/**
 * Selection state for pin/unpin block selection
 */
export interface SelectionState {
  selectedBlockId: string | null;  // null = no block selected
  currentSegmentIndex: number;      // Current segment being viewed (0-based)
}
```

Note: `ExtensionState` (line 77 of `irisState.ts`) is **not** extracted. It's a private internal container that gets absorbed into `IRISCoreState`'s private implementation.

### 3. Extract state machine to iris-core

Create `packages/iris-core/src/state/analysisState.ts`.

This is the most complex extraction. The current `IRISStateManager` class (88-403 of `irisState.ts`) becomes `IRISCoreState` with these changes:

**What changes:**
- Constructor takes `Logger` interface instead of `vscode.OutputChannel`
- No `vscode.EventEmitter` / `vscode.Event` — uses callback + unsubscribe pattern
- `dispose()` clears listeners array instead of disposing emitter
- No `outputChannel` field (just `logger`)

**What stays identical:**
- All state transition logic (guards, validation, same order)
- All selector return types
- All selection state methods
- The private `logStateTransition()` helper

**Event system replacement:**

```ts
import type { Logger } from '../types/logger';
import type { AnalysisData, FileIntent, NormalizedResponsibilityBlock,
  AnalysisMetadata, IRISAnalysisResponse, SelectionState } from '../models/types';

export { IRISAnalysisState };

type StateChangeListener = (state: IRISAnalysisState) => void;

export class IRISCoreState {
  private listeners: StateChangeListener[] = [];
  private logger: Logger;
  // ... private state fields (same as ExtensionState shape)

  constructor(logger: Logger) {
    this.logger = logger;
    // ... initialize state (same as current constructor minus vscode parts)
  }

  onStateChange(listener: StateChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(state: IRISAnalysisState): void {
    this.listeners.forEach(l => l(state));
  }

  dispose(): void {
    this.listeners = [];
  }

  // ... all methods below, replacing this.stateChangeEmitter.fire() with this.emit()
}
```

**Complete list of public methods that must be ported** (all from `irisState.ts`):

State transitions (5):
- `startAnalysis(fileUri: string): void` — line 126
- `setAnalyzed(data: AnalysisData): void` — line 145
- `setError(error: string, fileUri?: string): void` — line 170
- `setStale(): void` — line 187
- `reset(): void` — line 209

Selectors (11):
- `getCurrentState(): IRISAnalysisState` — line 230
- `getAnalysisData(): Readonly<AnalysisData> | null` — line 237
- `getFileIntent(): FileIntent | null` — line 244
- `getResponsibilityBlocks(): readonly NormalizedResponsibilityBlock[] | null` — line 251
- `getMetadata(): Readonly<AnalysisMetadata> | null` — line 258
- `getAnalyzedFileUri(): string | null` — line 265
- `getActiveFileUri(): string | null` — line 272
- `hasAnalysisData(): boolean` — line 279
- `isAnalyzing(): boolean` — line 286
- `isStale(): boolean` — line 293
- `getRawResponse(): Readonly<IRISAnalysisResponse> | null` — line 300

Selection state (6):
- `selectBlock(blockId: string): void` — line 311
- `deselectBlock(): void` — line 327
- `getCurrentSegmentIndex(): number` — line 345
- `setCurrentSegmentIndex(index: number): void` — line 352
- `getSelectedBlockId(): string | null` — line 368
- `isBlockSelected(): boolean` — line 375

Private (1):
- `logStateTransition(from, to, fileUri?, metadata?): void` — line 386

Lifecycle (1):
- `dispose(): void` — clears listeners array

**Total: 23 methods ported from `IRISStateManager`, with only the event emission and constructor changing.**

In every method body, replace `this.stateChangeEmitter.fire(X)` with `this.emit(X)`. Everything else is identical.

### 4. Copy API client to iris-core

Copy `packages/iris-vscode/src/api/irisClient.ts` → `packages/iris-core/src/api/irisClient.ts`.

**Single change** — update the Logger import (line 1):

```ts
// Before (in iris-vscode)
import { Logger } from '../utils/logger';

// After (in iris-core)
import type { Logger } from '../types/logger';
```

This is a within-package relative import, NOT `@iris/core`. The file is now inside iris-core, so it imports from its sibling directory.

Also use `import type` since `Logger` is only used as a type annotation in this file (constructor parameter type and field type).

Everything else in the file stays identical — it already uses standard `fetch`, `AbortController`, `setTimeout`, `clearTimeout`. No VS Code imports.

### 5. Copy blockId utility to iris-core

Copy `packages/iris-vscode/src/utils/blockId.ts` → `packages/iris-core/src/utils/blockId.ts`.

**Single change** — update the `ResponsibilityBlock` import (line 2):

```ts
// Before (in iris-vscode)
import { ResponsibilityBlock } from '../state/irisState';

// After (in iris-core)
import type { ResponsibilityBlock } from '../models/types';
```

Again, within-package relative import. Use `import type` since `ResponsibilityBlock` is only used as a type.

Everything else stays identical — `crypto.createHash('sha1')` is standard Node.js.

### 6. Create barrel export

Replace `packages/iris-core/src/index.ts` with explicit re-exports of everything:

```ts
// Models
export type {
  FileIntent,
  ResponsibilityBlock,
  AnalysisMetadata,
  NormalizedResponsibilityBlock,
  IRISAnalysisResponse,
  AnalysisData,
  SelectionState
} from './models/types';

// State
export { IRISAnalysisState, IRISCoreState } from './state/analysisState';

// API
export { IRISAPIClient, APIError, APIErrorType } from './api/irisClient';
export type {
  AnalysisRequest,
  AnalysisResponse,
  APIResponsibilityBlock,
  APIClientConfig
} from './api/irisClient';

// Utils
export { generateBlockId, generateBlockIds } from './utils/blockId';

// Types
export type { Logger } from './types/logger';
```

Note: `AnalysisResponse`, `APIResponsibilityBlock`, and `APIClientConfig` from `irisClient.ts` must be exported. `extension.ts` uses `apiClient.analyze()` which returns `AnalysisResponse`, and consumers need the types for the return value.

### 7. Build and verify iris-core

```bash
cd packages/iris-core && npm run build
```

Expected output:
- `dist/index.js` + `dist/index.d.ts`
- `dist/types/logger.js` + `dist/types/logger.d.ts`
- `dist/models/types.js` + `dist/models/types.d.ts`
- `dist/state/analysisState.js` + `dist/state/analysisState.d.ts`
- `dist/api/irisClient.js` + `dist/api/irisClient.d.ts`
- `dist/utils/blockId.js` + `dist/utils/blockId.d.ts`

Zero errors.

Then verify iris-vscode still compiles independently:

```bash
cd packages/iris-vscode && npm run compile
```

Must pass — no iris-vscode source files were modified.

## Files Created/Modified

| Action | Path | Description |
|---|---|---|
| Create | `packages/iris-core/src/types/logger.ts` | Logger interface (5 methods) |
| Create | `packages/iris-core/src/models/types.ts` | 7 domain type definitions |
| Create | `packages/iris-core/src/state/analysisState.ts` | `IRISAnalysisState` enum + `IRISCoreState` class (24 methods) |
| Create | `packages/iris-core/src/api/irisClient.ts` | API client copied from iris-vscode, Logger import updated |
| Create | `packages/iris-core/src/utils/blockId.ts` | blockId copied from iris-vscode, ResponsibilityBlock import updated |
| Modify | `packages/iris-core/src/index.ts` | Barrel export with all public API |

## Files NOT Touched in iris-vscode

No `iris-vscode` source files are modified in Part 2. The old files still exist and work. Part 3 rewires the imports and deletes the duplicates.

## Verification Checklist

- [ ] `iris-core` builds cleanly with `npm run build`
- [ ] `dist/` contains `.js` and `.d.ts` for every source file (6 pairs)
- [ ] No `vscode` import anywhere in `iris-core/src/` — verify with `grep -r "from 'vscode'" packages/iris-core/src/`
- [ ] `iris-vscode` still compiles independently with `npm run compile` (old files untouched)
- [ ] State machine transition logic is identical — same guards, same validation order, same log messages
- [ ] All 24 methods from `IRISStateManager` are present in `IRISCoreState`
- [ ] Barrel export includes all types from `irisClient.ts` (`AnalysisResponse`, `APIResponsibilityBlock`, `APIClientConfig`, `AnalysisRequest`)

## Design Decisions

**Why callback pattern over EventEmitter?**
A generic `EventEmitter` class (like Node's) would add a Node runtime dependency to core. The callback + unsubscribe pattern is the simplest thing that works, has zero dependencies, and is trivially wrappable by any platform's event system (vscode.EventEmitter, DOM EventTarget, etc.).

**Why move blockId to core?**
It depends only on `ResponsibilityBlock` type and Node `crypto`. It's domain logic (identity generation), not rendering. Any future adapter will need block IDs.

**Why keep Logger as interface-only in core?**
The VS Code logger writes to `OutputChannel` and calls `vscode.window.showErrorMessage`. A browser adapter would use `console`. Core shouldn't dictate the output mechanism — it just needs to call `logger.info(...)`. The `show()` method on the VS Code Logger is intentionally excluded from the interface since it's a VS Code-specific UI action.

**Why copy files instead of moving them?**
Part 2 creates files in iris-core. Part 3 deletes the originals from iris-vscode and rewires imports. This two-step approach ensures iris-vscode remains compilable between Part 2 and Part 3. If we moved files in Part 2, iris-vscode would break until Part 3 is complete.
