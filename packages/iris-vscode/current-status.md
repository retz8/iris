# VS Code Extension Current Status

## Summary
The VS Code extension is a thin adapter layer over `@iris/core`. It provides the VS Code-specific UI — sidebar webview, editor decorations, commands, and keybindings — while delegating all domain logic (state machine, API client, types, block IDs) to the core package.

## Architecture

The extension follows an **adapter pattern**: `@iris/core` owns all platform-agnostic logic, and iris-vscode bridges it to VS Code APIs.

```
src/
  extension.ts                  # Entry point, command registration, lifecycle
  state/irisState.ts            # Adapter: wraps IRISCoreState → vscode.EventEmitter
  webview/sidePanel.ts          # Sidebar webview provider, renders state
  decorations/decorationManager.ts  # Editor text decorations, theme-aware colors
  decorations/segmentNavigator.ts   # Ctrl+Up/Down navigation between segments
  types/messages.ts             # Webview ↔ extension message protocol
  utils/logger.ts               # Logger implementation (OutputChannel-backed)
  utils/colorAssignment.ts      # WCAG AA compliant color generation
```

Key dependency flow:
- `extension.ts` imports `IRISAnalysisState`, `generateBlockId`, `IRISAPIClient` from `@iris/core`
- `irisState.ts` wraps `IRISCoreState` from `@iris/core`, bridges callbacks to `vscode.EventEmitter`
- All domain types (`AnalysisData`, `NormalizedResponsibilityBlock`, etc.) come from `@iris/core`
- Deleted from this package (now in core): `api/irisClient.ts`, `utils/blockId.ts`

## Current functionality
- **Auto-analysis on file switch**: Automatically analyzes supported files when the user switches editors (1s debounce). Controlled by `iris.autoAnalyze` setting (default: on). Runs silently — no toasts or output channel reveal.
- **Manual analysis trigger** via command palette (`iris.runAnalysis`) or **refresh icon** in panel header.
- **Settings icon** in panel header: Opens VS Code settings filtered to IRIS configuration.
- **State model**: IDLE → ANALYZING → ANALYZED → STALE (driven by `@iris/core`).
- **Sidebar webview**: File Intent heading and Responsibility Block list with color-coded dots.
- **Hover interaction**: Hovering a block reveals its description and highlights related lines in the editor.
- **Block selection**: Click to pin/unpin a block with persistent highlights; auto-scrolls to block. Decorations and selections are cleared when starting a new analysis.
- **Segment navigation**: Ctrl+Up/Down to move between scattered ranges of a selected block.
- **Stale detection**: Any edit to the analyzed file transitions to STALE.
- **Escape key**: Deselects the currently pinned block.

## Supported languages
- Python
- JavaScript / TypeScript
- React JSX / TSX

## Build
- `npm run compile` — type-check + lint + esbuild bundle to `dist/extension.js`
- Requires `@iris/core` to be built first (root `npm run build` enforces order)
- `npm run watch` — watch mode for development

## Authentication & endpoint
- **Production endpoint**: `https://api.iris-codes.com/api/iris/analyze` (configured in `@iris/core` — `endpoints.ts`).
- **API key setting**: `iris.apiKey` in VS Code settings. The extension reads the key and passes it to `IRISAPIClient`, which sends it as the `x-api-key` header on every request.
- **Hot-reload**: Changing `iris.apiKey` in settings recreates the API client immediately — no restart needed.
- If no API key is configured, the client still sends the request but logs a warning (backend will return 401 in production).

## Known constraints
- Single-file analysis only — no multi-file caching (switching back to a previously analyzed file re-triggers analysis).
- Analysis does not persist across extension restarts.
