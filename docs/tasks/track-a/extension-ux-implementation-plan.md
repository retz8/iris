---
goal: Extension UX Improvements - Error Handling, Multi-file Caching, and Persistence
version: 1.0
date_created: 2026-02-16
last_updated: 2026-02-16
owner: Track A Team
status: Planned
tags: [feature, ux, error-handling, caching, persistence, vscode-extension]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan transforms the IRIS VS Code extension from "basic analysis working" to "production-ready UX" by implementing three critical improvements:

1. **Visible Error Handling**: Replace dismissable toast-only errors with persistent sidebar error UI that provides actionable guidance
2. **Multi-file Caching**: Implement in-memory LRU cache (10 files) for instant file-switching without re-analysis
3. **Persistence Across Reloads**: Save/restore analysis cache to VS Code workspaceState so extension reload doesn't lose work

**Current Pain Points:**
- Users see error toasts that disappear, no persistent error feedback in sidebar
- Switching between files triggers full re-analysis every time (slow, wasteful API calls)
- Extension reload loses all analysis results (frustrating UX)

**Expected Outcome:**
- Clear, actionable error messages with retry and configuration buttons
- Instant display of previously analyzed files (no network delay)
- Analysis results persist across extension reloads (seamless workflow)

## 1. Requirements & Constraints

### Functional Requirements

- **REQ-001**: Error state must be visible in sidebar (not just dismissable toasts)
- **REQ-002**: Error messages must differentiate between error types (TIMEOUT, NETWORK, AUTH, PARSE, VALIDATION)
- **REQ-003**: 401/auth errors must show "Configure API Key" button that opens VS Code settings
- **REQ-004**: All errors must show large, explicit "Retry Analysis" button
- **REQ-005**: Cache must support at least 10 recently analyzed files without memory issues
- **REQ-006**: Cache invalidation must occur immediately on file content change
- **REQ-007**: Switching to previously analyzed file must show instant results (no re-analysis)
- **REQ-008**: Manual "Run Analysis" command must bypass cache (force refresh)
- **REQ-009**: Auto-analysis must check cache first before API call
- **REQ-010**: Persistence must use VS Code workspaceState (per-workspace scope)
- **REQ-011**: Stale persisted data (file edited outside VS Code) must be detected via content hash and discarded on restore
- **REQ-012**: Extension activation must not slow down noticeably due to cache restore

### Technical Constraints

- **CON-001**: Must not modify `@iris/core` state machine enum (keep IDLE, ANALYZING, ANALYZED, STALE states)
- **CON-002**: Cache must use LRU eviction when size exceeds 10 files
- **CON-003**: Content hash must be computed before each analysis and stored with data
- **CON-004**: Serialized cache size must be reasonable (exclude rawResponse to save space)
- **CON-005**: All changes must be in `packages/iris-vscode/` adapter layer (not in core)

### Design Guidelines

- **GUD-001**: Follow existing VS Code extension patterns in codebase (check CLAUDE.md)
- **GUD-002**: Error UI should use VS Code theme colors (warning yellow, error red, info blue)
- **GUD-003**: API key configuration is temporary (will be replaced with GitHub OAuth - add comments)
- **GUD-004**: Prefer Edit tool over Write tool for existing files
- **GUD-005**: Use deterministic content hashing (SHA-256 or FNV-1a)

### Architecture Patterns

- **PAT-001**: Adapter pattern - all caching/persistence logic in VS Code adapter layer (`iris-vscode`), not in platform-agnostic core (`@iris/core`)
- **PAT-002**: Error details stored in state but not as new state enum value (IDLE + errorDetails field)
- **PAT-003**: Cache manager as separate module with clean interface (get, set, invalidate, clear)
- **PAT-004**: Content hash utility as pure function (no side effects)

### Security Requirements

- **SEC-001**: API key must never be logged or serialized to disk
- **SEC-002**: Cache must not store sensitive file content, only analysis results

## 2. Implementation Steps

### Phase 1: Error Handling Infrastructure

**GOAL-001**: Add error state tracking to core state machine and expose to VS Code adapter

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `errorDetails: { type: APIErrorType; message: string; statusCode?: number } \| null` field to `CoreState` interface in `packages/iris-core/src/state/analysisState.ts:20` | | |
| TASK-002 | Modify `setError(error: string, fileUri?: string)` method in `packages/iris-core/src/state/analysisState.ts:118` to accept structured error: `setError(errorDetails: { type: APIErrorType; message: string; statusCode?: number }, fileUri?: string)` | | |
| TASK-003 | Store `errorDetails` in state instead of just transitioning to IDLE in `setError()` method | | |
| TASK-004 | Add getter `getErrorDetails(): { type: APIErrorType; message: string; statusCode?: number } \| null` to `IRISCoreState` class in `packages/iris-core/src/state/analysisState.ts` | | |
| TASK-005 | Clear `errorDetails` in `startAnalysis()`, `setAnalyzed()`, and `reset()` methods | | |
| TASK-006 | Export `APIErrorType` from `packages/iris-core/src/index.ts` if not already exported | | |
| TASK-007 | Add `getErrorDetails()` method to `IRISStateManager` adapter in `packages/iris-vscode/src/state/irisState.ts:82` | | |

### Phase 2: Sidebar Error UI

**GOAL-002**: Render error state in webview sidebar with actionable buttons

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Add `ErrorDetailsMessage` interface to `packages/iris-vscode/src/types/messages.ts` with fields: `type: 'ERROR_DETAILS'`, `errorType: APIErrorType`, `message: string`, `statusCode?: number` | | |
| TASK-009 | Update `ExtensionMessage` union type in `packages/iris-vscode/src/types/messages.ts:136` to include `ErrorDetailsMessage` | | |
| TASK-010 | Update `isExtensionMessage()` type guard in `packages/iris-vscode/src/types/messages.ts:181` to validate `ERROR_DETAILS` messages | | |
| TASK-011 | Add `renderErrorState()` method to `IRISSidePanelProvider` class in `packages/iris-vscode/src/webview/sidePanel.ts` after `renderStaleState()` method | | |
| TASK-012 | In `renderErrorState()`, render HTML with: error icon, error message, error type badge, large "Retry Analysis" button, conditional "Configure API Key" button (only for 401 errors) | | |
| TASK-013 | Add CSS styling for error state: `.error-banner` (red background), `.error-icon`, `.error-message`, `.error-type-badge`, `.retry-button` (large, prominent), `.configure-key-button` in `getHtmlTemplate()` method | | |
| TASK-014 | Modify `renderCurrentState()` switch statement in `packages/iris-vscode/src/webview/sidePanel.ts:446` to check `stateManager.getErrorDetails()` and call `renderErrorState()` when error exists (even if state is IDLE) | | |
| TASK-015 | Add `RETRY_ANALYSIS` message type to `WebviewMessage` union in `packages/iris-vscode/src/types/messages.ts` | | |
| TASK-016 | Add `CONFIGURE_API_KEY` message type to `WebviewMessage` union in `packages/iris-vscode/src/types/messages.ts` | | |
| TASK-017 | Add handlers in `handleWebviewMessage()` in `packages/iris-vscode/src/webview/sidePanel.ts:105` for `RETRY_ANALYSIS` (trigger `iris.runAnalysis` command) and `CONFIGURE_API_KEY` (execute `vscode.commands.executeCommand('workbench.action.openSettings', 'iris.apiKey')`) | | |
| TASK-018 | Add JavaScript in webview HTML template to handle retry button click → post `RETRY_ANALYSIS` message | | |
| TASK-019 | Add JavaScript in webview HTML template to handle configure key button click → post `CONFIGURE_API_KEY` message | | |
| TASK-020 | Add TODO comment above API key configuration code: `// TODO: Replace with GitHub OAuth flow (future work) - This API key configuration is temporary` | | |

### Phase 3: Update Extension Error Propagation

**GOAL-003**: Modify extension.ts to send structured error details instead of simple strings

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | In `runAnalysisOnActiveFile()` catch block in `packages/iris-vscode/src/extension.ts:335`, change `stateManager.setError(error.message, fileUri)` to `stateManager.setError({ type: error.type, message: error.message, statusCode: error.statusCode }, fileUri)` for `APIError` instances | | |
| TASK-022 | For unexpected errors (non-APIError) in same catch block, create error object: `stateManager.setError({ type: APIErrorType.NETWORK_ERROR, message: message, statusCode: undefined }, fileUri)` | | |
| TASK-023 | In top-level catch block in `packages/iris-vscode/src/extension.ts:357`, update to pass structured error object | | |
| TASK-024 | Send `ERROR_DETAILS` message to webview after `stateManager.setError()` is called | | |

### Phase 4: Multi-file Cache Infrastructure

**GOAL-004**: Implement in-memory LRU cache with content hashing

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-025 | Create `packages/iris-vscode/src/utils/contentHash.ts` file | | |
| TASK-026 | Implement `computeContentHash(content: string): string` function using SHA-256 or FNV-1a hash algorithm (deterministic, fast) | | |
| TASK-027 | Export `computeContentHash` from `packages/iris-vscode/src/utils/contentHash.ts` | | |
| TASK-028 | Create `packages/iris-vscode/src/cache/analysisCache.ts` file | | |
| TASK-029 | Define `CacheEntry` interface in cache file: `{ fileUri: string; contentHash: string; data: AnalysisData; timestamp: number }` | | |
| TASK-030 | Implement `AnalysisCache` class with private fields: `cache: Map<string, CacheEntry>`, `maxSize: number = 10`, `logger: Logger` | | |
| TASK-031 | Implement `get(fileUri: string, contentHash: string): AnalysisData \| null` method - returns data if hash matches, null otherwise | | |
| TASK-032 | Implement `set(fileUri: string, contentHash: string, data: AnalysisData): void` method - stores entry, evicts LRU entry if size exceeds maxSize | | |
| TASK-033 | Implement `invalidate(fileUri: string): void` method - removes entry for given fileUri | | |
| TASK-034 | Implement `clear(): void` method - clears entire cache | | |
| TASK-035 | Implement `getAll(): CacheEntry[]` method - returns all entries (for serialization) | | |
| TASK-036 | Implement `restore(entries: CacheEntry[]): void` method - populates cache from serialized entries (for persistence) | | |
| TASK-037 | Implement LRU eviction logic in `set()`: track access order, evict oldest entry when size exceeds maxSize | | |
| TASK-038 | Add logging in cache methods (cache hit, cache miss, eviction, invalidation) | | |

### Phase 5: Cache Integration in Extension

**GOAL-005**: Integrate cache into analysis workflow with auto-analysis and manual analysis behavior

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-039 | In `activate()` function in `packages/iris-vscode/src/extension.ts:31`, instantiate `AnalysisCache` after `stateManager` initialization: `const analysisCache = new AnalysisCache(createLogger(outputChannel, 'AnalysisCache'))` | | |
| TASK-040 | Add `analysisCache` to `context.subscriptions` for cleanup | | |
| TASK-041 | In `runAnalysisOnActiveFile()` before `stateManager.startAnalysis()` in `packages/iris-vscode/src/extension.ts:281`, compute content hash: `const contentHash = computeContentHash(sourceCode)` | | |
| TASK-042 | Add cache check after content hash computation: `const cachedData = analysisCache.get(fileUri, contentHash); if (cachedData && silent) { /* cache hit logic */ }` | | |
| TASK-043 | On cache hit for auto-analysis (silent=true): transition to ANALYZED state with cached data, skip API call, skip progress notification, log cache hit | | |
| TASK-044 | On cache miss or manual analysis (silent=false): proceed with API call as normal | | |
| TASK-045 | After successful API call and `stateManager.setAnalyzed()` in `packages/iris-vscode/src/extension.ts:313`, store result in cache: `analysisCache.set(fileUri, contentHash, analysisData)` | | |
| TASK-046 | In `onDidChangeTextDocument` listener in `packages/iris-vscode/src/extension.ts:378`, call `analysisCache.invalidate(analyzedFileUri)` when transitioning to STALE state | | |
| TASK-047 | Ensure manual "Run Analysis" command (silent=false) always bypasses cache by checking `!silent` condition before cache lookup | | |

### Phase 6: Persistence to workspaceState

**GOAL-006**: Serialize cache to VS Code workspaceState and restore on activation

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-048 | Define `SerializedCacheEntry` interface in `packages/iris-vscode/src/cache/analysisCache.ts`: `{ fileUri: string; contentHash: string; fileIntent: string; metadata: AnalysisMetadata; responsibilityBlocks: NormalizedResponsibilityBlock[]; analyzedAt: string }` (exclude rawResponse) | | |
| TASK-049 | Add `serialize(): SerializedCacheEntry[]` method to `AnalysisCache` class - converts cache entries to serializable format | | |
| TASK-050 | Add `deserialize(entries: SerializedCacheEntry[]): void` method to `AnalysisCache` class - reconstructs cache from serialized entries | | |
| TASK-051 | In `activate()` function after cache instantiation in `packages/iris-vscode/src/extension.ts`, attempt to restore cache from workspaceState: `const serialized = context.workspaceState.get<SerializedCacheEntry[]>('iris.analysisCache', []); analysisCache.deserialize(serialized)` | | |
| TASK-052 | Add validation during deserialization: for each entry, compute current file content hash and compare with stored hash; if mismatch, skip that entry (file was edited) | | |
| TASK-053 | Create `persistCache()` helper function in extension.ts: `function persistCache() { const serialized = analysisCache.serialize(); context.workspaceState.update('iris.analysisCache', serialized) }` | | |
| TASK-054 | In `onDidChangeActiveTextEditor` listener in `packages/iris-vscode/src/extension.ts:415`, debounce and call `persistCache()` after file switch (e.g., 500ms delay) | | |
| TASK-055 | In `deactivate()` function in `packages/iris-vscode/src/extension.ts:468`, call `persistCache()` synchronously before cleanup | | |
| TASK-056 | Add size limit check in `serialize()`: if serialized size exceeds threshold (e.g., 10 entries), keep only 10 most recent entries | | |
| TASK-057 | Add logging for persistence operations (saved X entries, restored Y entries, discarded Z stale entries) | | |

### Phase 7: Testing & Validation

**GOAL-007**: Manual testing to verify all acceptance criteria

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-058 | Test error handling: Trigger timeout error (mock slow backend), verify sidebar shows error banner with retry button and timeout badge | | |
| TASK-059 | Test error handling: Trigger 401 error (remove API key), verify "Configure API Key" button appears and opens settings | | |
| TASK-060 | Test error handling: Trigger network error (stop backend), verify error distinguishable from timeout with appropriate message | | |
| TASK-061 | Test error handling: Click "Retry Analysis" button, verify it triggers new analysis and clears error state on success | | |
| TASK-062 | Test caching: Analyze file A, switch to file B, analyze B, switch back to A, verify instant display (no loading, no API call in logs) | | |
| TASK-063 | Test cache invalidation: Analyze file A, edit file A content, verify state transitions to STALE and cache is invalidated | | |
| TASK-064 | Test LRU eviction: Analyze 11 files sequentially, verify cache size stays at 10 and oldest file re-analyzed when revisited | | |
| TASK-065 | Test manual analysis bypass: Analyze file A (cached), run manual "Run Analysis" command, verify API call is made (cache bypassed) | | |
| TASK-066 | Test persistence: Analyze 3 files, reload extension (Developer: Reload Window), verify all 3 results are preserved and displayed instantly | | |
| TASK-067 | Test stale persistence detection: Analyze file, edit in external editor, reload extension, verify stale data is discarded (not restored) | | |
| TASK-068 | Test activation performance: Reload extension with 10 cached files, verify activation completes without noticeable delay | | |
| TASK-069 | Test auto-analysis with cache: Enable auto-analysis, switch between 3 previously analyzed files, verify instant display for all | | |

## 3. Alternatives

- **ALT-001**: Add ERROR state to state machine enum instead of storing errorDetails in IDLE state
  - **Rejected**: Avoids modifying core state machine enum (CON-001), keeps platform-agnostic core simpler

- **ALT-002**: Use globalState instead of workspaceState for persistence
  - **Rejected**: File paths are workspace-specific; globalState would mix files from different workspaces

- **ALT-003**: Implement time-based cache TTL (e.g., 1 hour expiration)
  - **Rejected**: Content hash provides more accurate invalidation; TTL adds complexity without clear benefit

- **ALT-004**: Cache unlimited files (no LRU eviction)
  - **Rejected**: Risk of memory bloat with large codebases; 10-file limit is reasonable for UX without memory concerns

- **ALT-005**: Show API key input inline in sidebar instead of opening settings
  - **Rejected**: Temporary solution (will be replaced with GitHub OAuth); not worth implementing custom input UI

- **ALT-006**: Use crypto.createHash() for SHA-256 content hashing
  - **Accepted if available**: Deterministic and standard; fallback to simpler FNV-1a if crypto not available

- **ALT-007**: Store full rawResponse in persisted cache
  - **Rejected**: Wastes disk space; normalized blocks already contain all needed data for display

## 4. Dependencies

- **DEP-001**: `@iris/core` package must export `APIErrorType` enum and `APIError` class (likely already exported from `packages/iris-core/src/index.ts`)
- **DEP-002**: VS Code API `context.workspaceState` for persistence (already available via ExtensionContext)
- **DEP-003**: Node.js `crypto` module for SHA-256 hashing (built-in, no installation needed)
- **DEP-004**: Existing `Logger` interface from `packages/iris-core/src/types/logger.ts`
- **DEP-005**: Existing `AnalysisData` type from `packages/iris-core/src/models/types.ts`

## 5. Files

### New Files

- **FILE-001**: `packages/iris-vscode/src/utils/contentHash.ts` - Content hashing utility with `computeContentHash()` function
- **FILE-002**: `packages/iris-vscode/src/cache/analysisCache.ts` - LRU cache manager with get, set, invalidate, serialize, deserialize methods

### Modified Files

- **FILE-003**: `packages/iris-core/src/state/analysisState.ts` - Add errorDetails field to CoreState, modify setError() signature, add getErrorDetails() getter
- **FILE-004**: `packages/iris-vscode/src/state/irisState.ts` - Add getErrorDetails() method to IRISStateManager adapter
- **FILE-005**: `packages/iris-vscode/src/types/messages.ts` - Add ErrorDetailsMessage, RETRY_ANALYSIS, CONFIGURE_API_KEY message types
- **FILE-006**: `packages/iris-vscode/src/webview/sidePanel.ts` - Add renderErrorState() method, modify renderCurrentState(), add message handlers for retry/configure
- **FILE-007**: `packages/iris-vscode/src/extension.ts` - Instantiate cache, integrate cache checks, add persistence logic, update error propagation
- **FILE-008**: `packages/iris-core/src/index.ts` - Ensure APIErrorType and APIError are exported (verify/update if needed)

## 6. Testing

### Manual Testing Scenarios

- **TEST-001**: Error handling - timeout error shows clear message in sidebar with large retry button
- **TEST-002**: Error handling - 401 error shows "Configure API Key" button that opens VS Code settings to iris.apiKey
- **TEST-003**: Error handling - network error distinguishable from timeout (different badge/message)
- **TEST-004**: Error handling - retry button triggers new analysis and clears error on success
- **TEST-005**: Caching - analyze file A → switch to file B → analyze B → switch to A (instant, no re-analysis)
- **TEST-006**: Cache invalidation - edit file → cache invalidates → shows STALE → re-analysis needed
- **TEST-007**: LRU eviction - analyze 11 files → verify 11th file evicts oldest → verify oldest re-analyzed when revisited
- **TEST-008**: Manual bypass - cached file → manual "Run Analysis" command → bypasses cache (force refresh)
- **TEST-009**: Persistence - analyze 3 files → reload extension → all 3 preserved and display instantly
- **TEST-010**: Stale detection - analyze file → edit in external editor → reload extension → stale data discarded
- **TEST-011**: Activation performance - reload with 10 cached files → no noticeable delay
- **TEST-012**: Auto-analysis + cache - switch between 3 previously analyzed files → instant display for all

### Validation Commands

- **TEST-013**: Build command: `npm run build` from project root - must succeed with no errors
- **TEST-014**: Compile command: `npm run compile` from `packages/iris-vscode/` - must succeed with no TypeScript errors
- **TEST-015**: Extension host launch: Press F5 in VS Code - extension must activate without errors in Debug Console
- **TEST-016**: Output channel inspection: Open "IRIS" output channel - verify cache hit/miss logs, persistence logs

## 7. Risks & Assumptions

### Risks

- **RISK-001**: Content hash computation may slow down analysis startup for very large files (>100k lines)
  - **Mitigation**: Use fast hashing algorithm (FNV-1a if needed); test with large files; consider caching hash per document

- **RISK-002**: workspaceState has no official size limit but very large caches (>1MB) may cause performance issues
  - **Mitigation**: Limit to 10 files, exclude rawResponse, serialize only essential data

- **RISK-003**: Race condition if user rapidly switches files during auto-analysis (multiple analyses in flight)
  - **Mitigation**: Existing `isAnalyzing()` check prevents duplicate triggers; cache handles concurrent sets gracefully

- **RISK-004**: Cache may become stale if user edits file outside VS Code and doesn't reload extension
  - **Mitigation**: Content hash validation on restore detects external edits; stale data discarded

- **RISK-005**: Error state UI may not align with all VS Code themes (color contrast issues)
  - **Mitigation**: Use standard VS Code theme variables (--vscode-inputValidation-errorBackground, etc.)

### Assumptions

- **ASSUMPTION-001**: 10-file cache limit is sufficient for typical user workflows (editing 3-5 files actively)
- **ASSUMPTION-002**: Content hash computation is fast enough to not noticeably delay analysis (<10ms for typical files)
- **ASSUMPTION-003**: Users will primarily use auto-analysis (silent mode) for cache benefits
- **ASSUMPTION-004**: GitHub OAuth replacement will happen within 3-6 months, making API key UI temporary
- **ASSUMPTION-005**: VS Code workspaceState is reliable for persistence (no data loss on crashes)
- **ASSUMPTION-006**: LRU eviction policy aligns with user access patterns (older files less likely to be revisited)

## 8. Related Specifications / Further Reading

- **Track A Task Plan**: `docs/tasks/track-a-extension-ux.md` - Original task definition and acceptance criteria
- **Phase 0 Exploration Summary**: Available in conversation history - detailed codebase analysis findings
- **VS Code Extension API - ExtensionContext**: https://code.visualstudio.com/api/references/vscode-api#ExtensionContext
- **VS Code Extension API - Memento (workspaceState)**: https://code.visualstudio.com/api/references/vscode-api#Memento
- **IRIS Architecture**: `README.md` - System architecture and monorepo structure
- **CLAUDE.md**: Project-specific development rules and patterns
