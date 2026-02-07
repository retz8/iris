# VS Code Extension Current Status

## Summary
The VS Code extension provides a command-driven analysis workflow with a state-driven UI and editor overlays. It visualizes File Intent and Responsibility Blocks, supports interactive navigation, and maintains clear analysis freshness states.

## Current functionality
- **Manual analysis trigger** via command palette.
- **State model**: IDLE → ANALYZING → ANALYZED → STALE.
- **Sidebar webview**: File Intent (prominent, bold heading) and Responsibility Block list with color-coded dots.
- **Hover interaction**: Hovering a block reveals its description and highlights related lines in the editor; both collapse on hover-out.
- **Block selection**: Click to pin/unpin a block with persistent highlights; auto-scrolls editor to the block.
- **Segment navigation**: Keyboard shortcuts (Ctrl+Up/Down) to move between scattered ranges of a selected block.
- **Stale detection**: Any edit marks analysis as stale.

## User interactions
- Hover a block to reveal description and highlight related lines; both clear on hover-out.
- Click to select/unselect a block (persistent highlight, auto-scrolls editor to first segment).
- Navigate segments with keyboard shortcuts when a block is selected.
- Escape to deselect the current block.
- Refresh to re-run analysis.

## Supported languages
- Python
- JavaScript
- TypeScript
- React JSX/TSX

## Key components
- `extension.ts`: Command registration and lifecycle.
- `irisState.ts`: Single source of truth for analysis and selection state.
- `sidePanel.ts`: Webview rendering and message handling.
- `decorationManager.ts`: Editor decorations and color assignment.
- `segmentNavigator.ts`: Segment navigation state (UI indicator removed from webview).
- `irisClient.ts`: Backend API client.

## Known constraints
- No automatic analysis on file open.
- Single-file analysis only.
- Analysis does not persist across extension restarts.
- Best experience with moderate block counts (not extremely large files).

## Next likely work
- Further UI refinement for block selection and navigation.
- Improve resilience for very large files or many blocks.
- Add optional settings for user preferences.
