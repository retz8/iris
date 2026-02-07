# VS Code Extension Current Status

## Summary
The VS Code extension provides a command-driven analysis workflow with a state-driven UI and editor overlays. It visualizes File Intent and Responsibility Blocks, supports interactive navigation, and maintains clear analysis freshness states.

## Current functionality
- **Manual analysis trigger** via command palette.
- **State model**: IDLE → ANALYZING → ANALYZED → STALE.
- **Sidebar webview**: File Intent and Responsibility Block list.
- **Hover highlighting**: Preview block coverage in the editor.
- **Block selection**: Pin a block to keep highlights active.
- **Segment navigation**: Move between scattered ranges via controls/shortcuts.
- **Stale detection**: Any edit marks analysis as stale.

## User interactions
- Hover a block to highlight related lines.
- Click to select/unselect a block (persistent highlight).
- Navigate segments with keyboard shortcuts when a block is selected.
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
- `segmentNavigator.ts`: Segment navigation UI.
- `irisClient.ts`: Backend API client.

## Known constraints
- No automatic analysis on file open.
- Single-file analysis only.
- Analysis does not persist across extension restarts.
- Best experience with moderate block counts (not extremely large files).

## Next likely work
- Continue UI refinement for block selection and navigation.
- Improve resilience for very large files or many blocks.
- Add optional settings for user preferences.
