# @iris/core

Platform-agnostic domain layer for IRIS. Contains all pure logic — domain types, state machine, API client, and block ID generation — with zero platform dependencies. Adapters (VS Code, browser, CLI) consume this package.

## Installation

This is a private workspace package. It's consumed via npm workspaces:

```json
"dependencies": {
  "@iris/core": "*"
}
```

Build before consuming:

```bash
npm run build
```

## Usage

```ts
import {
  IRISCoreState,
  IRISAnalysisState,
  IRISAPIClient,
  generateBlockId,
  type Logger,
  type AnalysisData,
  type NormalizedResponsibilityBlock
} from '@iris/core';

// Provide a platform-specific logger
const logger: Logger = { info: console.log, warn: console.warn, error: console.error, debug: console.log, errorWithException: console.error };

// State machine
const state = new IRISCoreState(logger);
const unsubscribe = state.onStateChange((newState) => {
  console.log('State:', newState);
});

// API client
const client = new IRISAPIClient({ endpoint: 'http://localhost:8080/api/iris/analyze', timeout: 15000 }, logger);
const response = await client.analyze({ filename: 'app.ts', language: 'typescript', source_code: '...' });

// Block IDs
const block = response.responsibility_blocks[0];
const blockId = generateBlockId(block);
```

## API

### Types

| Export | Description |
|---|---|
| `FileIntent` | String describing file purpose |
| `ResponsibilityBlock` | Block with label, description, and ONE-based line ranges |
| `NormalizedResponsibilityBlock` | Block with attached `blockId` |
| `AnalysisMetadata` | Extensible metadata from analysis response |
| `IRISAnalysisResponse` | Raw server response structure |
| `AnalysisData` | Internal analysis data with normalized blocks |
| `SelectionState` | Pin/unpin block selection state |
| `Logger` | 5-method logging contract (`info`, `warn`, `error`, `debug`, `errorWithException`) |

### State Machine — `IRISCoreState`

States: `IDLE` → `ANALYZING` → `ANALYZED` → `STALE`

| Method | Description |
|---|---|
| `onStateChange(listener)` | Subscribe to state changes. Returns unsubscribe function. |
| `startAnalysis(fileUri)` | Transition to ANALYZING |
| `setAnalyzed(data)` | Transition to ANALYZED with analysis data |
| `setError(error, fileUri?)` | Transition to IDLE with error |
| `setStale()` | Transition to STALE |
| `reset()` | Transition to IDLE, clear all data |
| `getCurrentState()` | Current `IRISAnalysisState` |
| `getAnalysisData()` | Full analysis data or null |
| `getResponsibilityBlocks()` | Normalized blocks or null |
| `selectBlock(blockId)` | Pin a block |
| `deselectBlock()` | Unpin current block |
| `dispose()` | Clear all listeners |

### API Client — `IRISAPIClient`

| Export | Description |
|---|---|
| `IRISAPIClient` | HTTP client with configurable endpoint and timeout |
| `APIError` | Typed error with `type`, `statusCode`, `message` |
| `APIErrorType` | Enum: `NETWORK`, `TIMEOUT`, `SERVER_ERROR`, `PARSE_ERROR`, `VALIDATION_ERROR` |

### Utilities

| Export | Description |
|---|---|
| `generateBlockId(block)` | SHA-1 hash from block label + ranges |
| `generateBlockIds(blocks)` | Batch version returning `NormalizedResponsibilityBlock[]` |

## Architecture

```
src/
  index.ts              # Barrel export
  models/types.ts       # Domain type definitions
  state/analysisState.ts # State machine (IRISAnalysisState + IRISCoreState)
  api/irisClient.ts     # HTTP client with structured errors
  utils/blockId.ts      # Deterministic block ID generation
  types/logger.ts       # Logger interface
```

## Design Decisions

- **Callback + unsubscribe** for events — zero runtime dependencies, trivially wrappable by any platform event system.
- **Logger as interface only** — adapters provide the implementation (OutputChannel, console, etc.).
- **No `vscode` dependency** — the entire package is platform-agnostic.
- **Node `crypto`** for block ID hashing — browser adapters would need a polyfill.
