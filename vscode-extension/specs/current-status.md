---

goal: IRIS VS Code Extension — Current Status
version: 1.0
date_created: 2026-01-31
date_updated: 2026-01-31
status: Current
---

## Summary
The IRIS VS Code extension MVP is implemented and functional. The extension provides a command-driven analysis flow, state-driven webview UI, deterministic block identity, semantic decorations, focus mode, and stale invalidation on edits. The implementation aligns with the plan phases and contracts described in [vscode-extension/specs/mvp-implementation-plan.md](vscode-extension/specs/mvp-implementation-plan.md).

## Implemented Functionality

### 1) Extension Activation and Command
- Command: `IRIS: Run Analysis` (`iris.runAnalysis`).
- Activation via command execution.
- Centralized logging to Output Channel `IRIS` with INFO/WARN/ERROR/DEBUG levels.
- Entry point: [vscode-extension/src/extension.ts](vscode-extension/src/extension.ts).

### 2) Editor Context Extraction
- Reads active editor file path, filename, language ID, line count, and full text.
- Adds line numbers in the format `LINE | CODE` for API requests.
- Supported languages: `python`, `javascript`, `javascriptreact`, `typescript`, `typescriptreact`.
- Unsupported language handling with user-facing warning.

### 3) Backend Integration
- POST request to `http://localhost:8080/api/iris/analyze`.
- Payload: `filename`, `language`, `source_code`, `metadata` (includes filepath, line_count).
- Error handling for HTTP failures, timeouts, invalid schema, and parsing errors.
- API client: [vscode-extension/src/api/irisClient.ts](vscode-extension/src/api/irisClient.ts).

### 4) State Model
- Centralized state manager with explicit transitions: `IDLE`, `ANALYZING`, `ANALYZED`, `STALE`.
- Normalized analysis data stored with raw response preserved.
- Read-only selectors for UI components.
- Focus state stored as `activeBlockId`.
- State manager: [vscode-extension/src/state/irisState.ts](vscode-extension/src/state/irisState.ts).

### 5) Webview Side Panel
- View container in Activity Bar (`iris`) with `iris.sidePanel` webview.
- State-driven rendering for `IDLE`, `ANALYZING`, `ANALYZED`, `STALE`.
- File Intent rendered prominently.
- Responsibility Blocks rendered as a vertical list.
- Stale analysis warning with prompt to re-run.
- Webview provider: [vscode-extension/src/webview/sidePanel.ts](vscode-extension/src/webview/sidePanel.ts).

### 6) Webview ↔ Extension Messaging
- Typed message contracts for readiness, hover, selection, clear, and focus clear.
- Extension-to-webview updates for state, analysis data, and stale indication.
- Message types: [vscode-extension/src/types/messages.ts](vscode-extension/src/types/messages.ts).

### 7) Deterministic blockId
- Canonical hashing (SHA-1) using normalized label, description, and ranges.
- Stable `blockId` assigned during normalization in analysis completion path.
- Utility: [vscode-extension/src/utils/blockId.ts](vscode-extension/src/utils/blockId.ts).

### 8) Editor Decorations
- Deterministic color per `blockId`.
- Hover highlights on block hover.
- Focus mode with stronger highlight and dimming of other blocks.
- One-based API ranges converted to zero-based VS Code ranges.
- Decorations manager: [vscode-extension/src/decorations/decorationManager.ts](vscode-extension/src/decorations/decorationManager.ts).

### 9) Focus Mode
- Selecting a block enters focus mode and disables hover highlight.
- Clear focus button returns to normal hover behavior.
- Focus mode resets on editor change or stale/idle transitions.

### 10) Stale State on File Change
- Any edit to the analyzed file immediately marks analysis as `STALE`.
- Decorations are cleared and focus mode exits.
- Webview displays outdated analysis warning.

### 11) Error Handling & Observability
- Global error boundary around analysis flow.
- User-facing notifications on failures and edge cases (no active editor, unsupported language, empty blocks).
- Structured logs routed to IRIS output channel.

## Extension Folder Structure (Current)
```
vscode-extension/
  package.json
  esbuild.js
  tsconfig.json
  eslint.config.mjs
  src/
    extension.ts
    api/
      irisClient.ts
    decorations/
      decorationManager.ts
    state/
      irisState.ts
    types/
      messages.ts
    utils/
      blockId.ts
      logger.ts
    webview/
      sidePanel.ts
  dist/
    extension.js
  specs/
    mvp-implementation-plan.md
    current-status.md
```

## Current Limitations (by design)
- Analysis is only triggered manually via command.
- Single-file analysis only (active editor).
- No auto-reanalysis or persistence across sessions.
- No user configuration or telemetry.

## Notes
- All core MVP behaviors are implemented directly in the extension runtime. No additional libraries were introduced beyond the existing build toolchain and VS Code API dependencies.
