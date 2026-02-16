# Track A: Extension UX Improvements

**Stream:** 1 (from TODO.md)
**Scope:** `packages/iris-vscode/`, `packages/iris-core/src/state/`
**Dependencies:** None
**Blocks:** None


## Objective

Improve VS Code extension user experience by implementing proper error handling, client-side caching for multi-file workflows, and persistence across extension reloads.

**Current Pain Points:**
- Users see no clear feedback when analysis fails (timeout, auth error, network error)
- Switching between files triggers full re-analysis every time (slow, wasteful)
- Extension reload loses all analysis results (frustrating for users)


## Context

The extension currently has basic analysis working but lacks production-ready UX polish. The state machine in `@iris/core` handles `IDLE → ANALYZING → ANALYZED → STALE` transitions, and the VS Code adapter wraps this in `vscode.EventEmitter`. Error states exist in the state machine but aren't surfaced to the user visibly.

**Key Architecture:**
- `packages/iris-core/src/state/` - Platform-agnostic state machine
- `packages/iris-vscode/src/state/` - VS Code adapter (wraps core state)
- `packages/iris-vscode/src/webview/` - Sidebar UI
- `packages/iris-vscode/src/decorations/` - Editor highlights


## Phase 0: Exploration

Follow these steps to understand the current state:

1. Read `packages/iris-core/src/state/` to understand current state machine
2. Read `packages/iris-vscode/src/state/` to see how errors are currently handled
3. Check `packages/iris-vscode/src/webview/` for UI error display capabilities
4. Identify where analysis is triggered (file open, file switch, manual command)
5. Search for existing error handling patterns (Grep for "error", "catch", "try")
6. Check VS Code API docs for storage options (globalState, workspaceState)

## Phase 1: Discovery/Discussion (with human engineer)

### Topics to Discuss

Based on Phase 0 exploration, discuss and generate specific questions for:

1. **Error Handling** - Current error states, display strategy, user experience
2. **Multi-file Caching** - Re-analysis behavior, cache key strategy, storage, invalidation
3. **Persistence Across Restarts** - Storage scope, data to persist, stale data handling

Document specific questions and design decisions here after discussion.


## Phase 2: Implementation Planning

**Will be filled in after Phase 1 discussion.** Should include:
- Specific files to modify
- New files to create (if any)
- Step-by-step implementation approach
- Testing strategy


## Phase 3: Execution

**Will be filled in after Phase 2 planning.** Should include:
- Detailed implementation steps
- Code changes and modifications

## Phase 4: Testing & Verification

**Will be filled in after Phase 3 execution.** Should include:
- Manual testing steps in VS Code extension development host
- Test commands to run
- Verification checklist against acceptance criteria

## Acceptance Criteria

- [ ] **Error Handling:**
  - Analysis timeout shows clear user-facing message
  - 401 (missing/bad API key) shows actionable error with link to settings
  - Network errors are distinguishable from timeout errors
  - Errors are visible in sidebar (not just console logs)

- [ ] **Multi-file Caching:**
  - Switching back to previously analyzed file shows instant results (no re-analysis)
  - Cache correctly invalidates when file content changes
  - Cache handles at least 10 recently analyzed files without memory issues

- [ ] **Persistence:**
  - Reloading VS Code extension preserves analysis results for open files
  - Stale persisted data is detected and cleared (content hash mismatch)
  - Persistence doesn't noticeably slow down extension activation


## Files Likely to Modify

Based on architecture, expect to touch:
- `packages/iris-core/src/state/state-machine.ts` (error state handling)
- `packages/iris-vscode/src/state/adapter.ts` (error propagation to VS Code)
- `packages/iris-vscode/src/webview/` (error UI display)
- `packages/iris-vscode/src/extension.ts` (caching layer, persistence hooks)
- `packages/iris-vscode/src/utils/` (cache utilities, persistence helpers)


## Claude Code Session Instructions

### Skills to Use
- **ui-ux-pro-max** - For designing error display and user feedback
- **vscode-extension-expert** - For VS Code API patterns, state management, storage APIs
- **vscode-extension-debugger** - If runtime errors occur during testing

### Recommended Agents
- **General-purpose agent** - For implementation (has access to Edit, Write, Bash)
- **Explore agent** - For initial codebase exploration if needed

### Tools Priority
- **Read** - Explore current state machine, adapter, webview code
- **Grep** - Search for error handling patterns, state transitions
- **Edit** - Modify existing files (prefer over Write for existing code)
- **Bash** - Build and test (`npm run compile`, `npm run watch`)

### Coordination
- **Before starting:** Read `docs/tasks/UPDATES.md` to check for relevant updates
- **After completing:** Append summary to `docs/tasks/UPDATES.md` with:
  - What was implemented
  - Files modified
  - Design decisions made
  - Any issues or blockers


## Notes

- This track is independent - can run in parallel with Tracks B, C, H
- Does NOT depend on or block any other tracks
- Focus on user experience improvements, not new features
- Follow existing VS Code extension patterns (check CLAUDE.md and README.md for architecture)
