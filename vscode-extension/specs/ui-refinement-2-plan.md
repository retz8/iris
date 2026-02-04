---

goal: IRIS VS Code Extension — UI Refinement 2: Block Selection & Scattered Segment Navigation
version: 1.0
date_created: 2026-02-01
date_updated: 2026-02-01
status: Planned
tags: [ux, ui-refinement, interaction-design, vscode-extension]
---

Reference: [current-status.md](current-status.md)

## Overview

This implementation plan defines the second phase of UI refinements for the IRIS VS Code Extension. The refinement simplifies block interaction from a complex focus mode (with folding and dimming) to a cleaner **pin/unpin selection model** and adds **scattered segment navigation** for blocks spanning multiple non-contiguous code ranges.

### Key Changes from Current State

**Removed:**
- Focus mode with dimming other blocks
- Automatic folding of gaps between scattered ranges
- Focus-specific decorations (0.3 alpha)
- Double-click behavior for folding

**Added:**
- Pin/unpin block selection model (click toggles state)
- Persistent block highlighting across all segments
- Floating navigation buttons in editor (segment indicator + up/down arrows)
- Keyboard shortcuts: `Ctrl+Up`, `Ctrl+Down` for segment navigation
- Segment tracking state (current segment index per selected block)

---

## 1. Implementation Steps

### Implementation Phase 1 — State Management Refactor

**Goal**: Update state manager to support pin/unpin model and segment tracking instead of focus mode.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-001 | Remove `FocusState` interface from `irisState.ts` (lines 63-66 in current file) | ✅ | 2026-02-01 |
| REQ-002 | Remove `FoldState` interface from `irisState.ts` (lines 68-73 in current file) | ✅ | 2026-02-01 |
| REQ-003 | Add `SelectionState` interface to track: `selectedBlockId` (string \| null), `currentSegmentIndex` (number) | ✅ | 2026-02-01 |
| REQ-004 | Update `ExtensionState` container to use `selectionState` instead of `focusState` and `foldState` | ✅ | 2026-02-01 |
| REQ-005 | Add methods to `IRISStateManager`: `selectBlock(blockId: string)`, `deselectBlock()`, `getCurrentSegmentIndex()`, `setCurrentSegmentIndex(index: number)` | ✅ | 2026-02-01 |
| REQ-006 | Add getter: `getSelectedBlockId(): string \| null` for querying current selection | ✅ | 2026-02-01 |
| REQ-007 | Update `setError()` method to clear selection state when analysis fails | ✅ | 2026-02-01 |
| REQ-008 | Update `setStale()` method to clear selection state when analysis becomes stale | ✅ | 2026-02-01 |
| CON-001 | Ensure all state transitions log segment navigation and selection/deselection via structured logging | ✅ | 2026-02-01 |

---

### Implementation Phase 2 — Webview UI Interaction Refactor

**Goal**: Replace focus mode JavaScript logic with pin/unpin selection model. Simplify block interaction handlers.

#### Webview State Variables ([sidePanel.ts](../src/webview/sidePanel.ts) lines ~1080-1085)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-009 | Update webview `activeFocusedBlockId` variable to `selectedBlockId` (rename for semantic clarity) | ✅ | 2026-02-01 |
| REQ-010 | Remove `lastClickTime` and `lastClickedBlockId` variables (no more double-click detection needed) | ✅ | 2026-02-01 |
| REQ-011 | Remove `DOUBLE_CLICK_THRESHOLD_MS` constant | ✅ | 2026-02-01 |
| REQ-012 | Add `currentSegmentIndex` variable to track which segment is visible (default: 0) | ✅ | 2026-02-01 |
| REQ-013 | Add `segmentCount` variable for segment count of selected block (derived from block data) | ✅ | 2026-02-01 |

#### Block Hover Handler

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-014 | Keep `handleBlockHover()` unchanged: applies hover decoration only when no block is selected | ✅ | 2026-02-01 |
| REQ-015 | Keep `handleBlockClear()` unchanged: clears hover decoration when no block is selected | ✅ | 2026-02-01 |

#### Block Click Handler ([sidePanel.ts](../src/webview/sidePanel.ts) lines ~215-280)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-016 | Simplify `handleBlockClick(blockId)`: detect if `selectedBlockId === blockId` (pin/unpin toggle logic) | ✅ | 2026-02-01 |
| REQ-017 | **If block already selected** (pin/unpin toggle): call `executeDeselectBlock(blockId)` | ✅ | 2026-02-01 |
| REQ-018 | **If block not selected** (new selection): call `executeSelectBlock(blockId)` | ✅ | 2026-02-01 |
| REQ-019 | Remove all double-click detection logic from `handleBlockClick()` | ✅ | 2026-02-01 |
| REQ-020 | Remove folding logic entirely | ✅ | 2026-02-01 |

#### New Selection/Deselection Functions

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-021 | Implement `executeSelectBlock(blockId)`: (1) find block, (2) send `BLOCK_SELECTED` message to extension with blockId, (3) update DOM: set `active` class on clicked block, (4) reset segment index to 0, (5) show navigation buttons in webview | ✅ | 2026-02-01 |
| REQ-022 | Implement `executeDeselectBlock(blockId)`: (1) send `BLOCK_DESELECTED` message to extension with blockId, (2) remove `active` class from all blocks, (3) set `selectedBlockId = null`, (4) hide navigation buttons | ✅ | 2026-02-01 |
| REQ-023 | Implement `handleSegmentNavigation(direction: 'next' \| 'prev')`: update `currentSegmentIndex`, send `SEGMENT_NAVIGATED` message with new index, scroll editor to segment (via extension) | ✅ | 2026-02-01 |

#### Remove Focus Mode Functions

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-024 | Remove `handleBlockSelect()` function (legacy, subsumed by new pin/unpin model) | ✅ | 2026-02-01 |
| REQ-025 | Remove `handleBlockDoubleClick()` function entirely | ✅ | 2026-02-01 |
| REQ-026 | Remove `handleFocusClear()` function (simplified to `executeDeselectBlock()`) | ✅ | 2026-02-01 |
| REQ-027 | Remove `detectFoldGaps()` method from extension (lines ~480-510) | ✅ | 2026-02-01 |
| REQ-028 | Remove `foldRanges()` and `unfoldRanges()` methods from extension (lines ~520-570) | ✅ | 2026-02-01 |

#### Message Contract Update

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-029 | Replace `BLOCK_CLICK` with `BLOCK_SELECTED` (sent on first click to select/pin block) | ✅ | 2026-02-01 |
| REQ-030 | Replace `BLOCK_DOUBLE_CLICK` with `BLOCK_DESELECTED` (sent on repeat click to deselect/unpin block) | ✅ | 2026-02-01 |
| REQ-031 | Replace `BLOCK_SELECT` with `SEGMENT_NAVIGATED` (sent when user navigates segments with keyboard or buttons) | ✅ | 2026-02-01 |
| REQ-032 | Replace `FOCUS_CLEAR` with `ESCAPE_PRESSED` (simplified, sent when Esc key pressed while block selected) | ✅ | 2026-02-01 |
| REQ-033 | Update message type definitions in [messages.ts](../src/types/messages.ts) | ✅ | 2026-02-01 |

---

### Implementation Phase 3 — Floating Segment Navigation Component

**Goal**: Implement floating UI component (buttons + indicator) that appears in editor viewport when block is selected.

#### Component Design

**File**: Create new `src/decorations/segmentNavigator.ts`

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-034 | Create `SegmentNavigator` class to manage floating button decorations in editor | ✅ | 2026-02-01 |
| REQ-035 | Design decoration to render at bottom-right of viewport: vertical stack with 3 elements (up button, segment indicator "X/Y", down button) | ✅ | 2026-02-01 |
| REQ-036 | Use VS Code `DecorationRenderOption` with custom CSS for positioning and styling | ✅ | 2026-02-01 |
| REQ-037 | Implement method `showNavigator(blockId: string, currentSegment: number, totalSegments: number)` to display buttons | ✅ | 2026-02-01 |
| REQ-038 | Implement method `updateNavigator(currentSegment: number, totalSegments: number)` to refresh segment indicator | ✅ | 2026-02-01 |
| REQ-039 | Implement method `hideNavigator()` to remove floating buttons from editor | ✅ | 2026-02-01 |
| REQ-040 | Handle up/down button disabled states: disable up button at segment 0, disable down button at last segment | ✅ | 2026-02-01 |
| CON-002 | Buttons must not interfere with text editing (use `isWholeLine: false`, position above actual code) | ✅ | 2026-02-01 |

---

### Implementation Phase 4 — Extension Side: Selection & Navigation Handler

**Goal**: Update extension to handle new message types, manage selection state, and coordinate segment navigation.

#### Message Handlers in extension.ts

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-041 | Update webview message routing to handle: `BLOCK_SELECTED`, `BLOCK_DESELECTED`, `SEGMENT_NAVIGATED`, `ESCAPE_PRESSED` | ✅ | 2026-02-01 |
| REQ-042 | Implement handler for `BLOCK_SELECTED(blockId)`: (1) call `stateManager.selectBlock(blockId)`, (2) get block data, (3) count segments (distinct ranges), (4) show segment navigator with segment count, (5) apply highlighting decoration to all block segments | ✅ | 2026-02-01 |
| REQ-043 | Implement handler for `BLOCK_DESELECTED(blockId)`: (1) call `stateManager.deselectBlock()`, (2) clear all decorations for the block, (3) hide segment navigator, (4) reset segment index to 0 | ✅ | 2026-02-01 |
| REQ-044 | Implement handler for `SEGMENT_NAVIGATED(index)`: (1) call `stateManager.setCurrentSegmentIndex(index)`, (2) get block segments array, (3) scroll editor to target segment, (4) update navigator indicator to reflect new segment position | ✅ | 2026-02-01 |
| REQ-045 | Implement handler for `ESCAPE_PRESSED`: (1) call `executeDeselectBlock()` behavior (same as BLOCK_DESELECTED), (2) notify webview of deselection via `STATE_UPDATE` message | ✅ | 2026-02-01 |

#### Esc Key Command Handler

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-046 | Update `iris.exitFocusMode` command handler to support new pin/unpin model: if block is selected, send deselection message and clear state | ✅ | 2026-02-01 |
| REQ-047 | Update command context condition in `package.json` to only enable when `iris.blockSelected` context is true | ✅ | 2026-02-01 |
| REQ-048 | Set `iris.blockSelected` context via `setContext()` whenever block is selected/deselected | ✅ | 2026-02-01 |

#### Decoration Manager Updates

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-049 | Remove `applyFocusMode()` method and all focus-specific decoration logic from `DecorationManager` | ✅ | 2026-02-01 |
| REQ-050 | Remove `clearFocusMode()` method from `DecorationManager` | ✅ | 2026-02-01 |
| REQ-051 | Remove `getOrCreateFocusedDecorationType()` method from `DecorationManager` (focus decorations no longer needed) | ✅ | 2026-02-01 |
| REQ-052 | Remove `getOrCreateDimmingDecorationType()` method from `DecorationManager` (dimming removed) | ✅ | 2026-02-01 |
| REQ-053 | Add `applyBlockSelection(editor, block)` method: applies persistent highlighting to all segments with consistent color (same as hover but for selected block) | ✅ | 2026-02-01 |
| REQ-054 | Add `clearBlockSelection(editor, blockId)` method: clears selection highlights for a specific block | ✅ | 2026-02-01 |
| REQ-055 | Simplify alpha/opacity: use single 0.25 alpha for all block highlighting (remove distinction between hover and focus) | ✅ | 2026-02-01 |
| CON-003 | All decoration changes must maintain WCAG AA contrast compliance for both light and dark themes | ✅ | 2026-02-01 |

---

### Implementation Phase 5 — Webview HTML/CSS Updates

**Goal**: Update webview UI to hide focus controls and reflect pin/unpin selection state visually.

#### HTML Structure Changes ([sidePanel.ts](../src/webview/sidePanel.ts) lines ~720-755)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-056 | Remove "Clear Focus" button from `focus-controls` div (no longer needed for pin/unpin model) | ✅ | 2026-02-01 |
| REQ-057 | Remove entire `focus-controls` div if no buttons remain (keep structure clean) | ✅ | 2026-02-01 |
| REQ-058 | Keep block item structure unchanged: `block-item` div with `block-label` and `block-description-container` | ✅ | 2026-02-01 |

#### CSS State Styling Updates ([sidePanel.ts](../src/webview/sidePanel.ts) lines ~1000-1050)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-059 | Keep `.block-item.active` selector for selected (pinned) blocks visual styling unchanged | ✅ | 2026-02-01 |
| REQ-060 | Remove `.block-item:focus` pseudo-class styling (no focus mode distinctions needed) | ✅ | 2026-02-01 |
| REQ-061 | Keep description reveal animation on hover or active state (TASK-020, TASK-022 behavior unchanged) | ✅ | 2026-02-01 |

#### Floating Navigator CSS (new)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-062 | Add CSS for floating navigator positioning: `position: fixed; bottom: 20px; right: 20px; z-index: 1000` | ✅ | 2026-02-01 |
| REQ-063 | Add styling for up/down buttons: accessible, minimal visual weight, hover states with subtle color change | ✅ | 2026-02-01 |
| REQ-064 | Add styling for segment indicator text: centered, monospace font, subtle background | ✅ | 2026-02-01 |
| REQ-065 | Add `--navigator-visible` CSS class to toggle navigator display (opacity or display property) | ✅ | 2026-02-01 |

#### JavaScript Event Listeners Update ([sidePanel.ts](../src/webview/sidePanel.ts) lines ~1080-1250)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-066 | Update `onclick` handlers on block items to call `handleBlockClick(blockId)` | ✅ | 2026-02-01 |
| REQ-067 | Add event listener for `window.keydown` to detect `Ctrl+ArrowUp` and `Ctrl+ArrowDown` shortcuts | ✅ | 2026-02-01 |
| REQ-068 | Add `keydown` handler to call `handleSegmentNavigation('prev')` on Ctrl+Up | ✅ | 2026-02-01 |
| REQ-069 | Add `keydown` handler to call `handleSegmentNavigation('next')` on Ctrl+Down | ✅ | 2026-02-01 |
| REQ-070 | Add `keydown` handler to call `executeDeselectBlock()` on Escape key | ✅ | 2026-02-01 |
| REQ-071 | Ensure keyboard shortcuts are only active when a block is selected (`selectedBlockId !== null`) | ✅ | 2026-02-01 |
| REQ-072 | Update `STATE_UPDATE` message handler to clear `selectedBlockId` when state transitions to IDLE or STALE | ✅ | 2026-02-01 |

---

### Implementation Phase 6 — Keyboard Command Registration

**Goal**: Register keyboard shortcuts in VS Code extension manifest and commands.

#### package.json Updates

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-073 | Register new command: `iris.navigatePreviousSegment` (label: "IRIS: Previous Segment") in `contributes.commands` | ✅ | 2026-02-01 |
| REQ-074 | Register new command: `iris.navigateNextSegment` (label: "IRIS: Next Segment") in `contributes.commands` | ✅ | 2026-02-01 |
| REQ-075 | Add keybinding for `iris.navigatePreviousSegment`: `ctrl+up` with condition `iris.blockSelected && editorTextFocus` | ✅ | 2026-02-01 |
| REQ-076 | Add keybinding for `iris.navigateNextSegment`: `ctrl+down` with condition `iris.blockSelected && editorTextFocus` | ✅ | 2026-02-01 |
| REQ-077 | Update keybinding for `iris.exitFocusMode` (Esc key) to condition: `iris.blockSelected && editorTextFocus` | ✅ | 2026-02-01 |
| REQ-078 | Remove/deprecate obsolete context: `iris.focusModeActive` (replaced by `iris.blockSelected`) | ✅ | 2026-02-01 |

#### extension.ts Command Handlers

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-079 | Implement `iris.navigatePreviousSegment` command handler: send webview message to navigate to previous segment | ✅ | 2026-02-01 |
| REQ-080 | Implement `iris.navigateNextSegment` command handler: send webview message to navigate to next segment | ✅ | 2026-02-01 |
| REQ-081 | Update `iris.exitFocusMode` command handler to deselect block (send `ESCAPE_PRESSED` message to webview) | ✅ | 2026-02-01 |

---

### Implementation Phase 7 — Editor Scroll & Centering for Segments

**Goal**: Ensure smooth, reliable scrolling to segment positions when navigating.

#### Navigation Logic in sidePanel.ts Message Handler

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-082 | Implement segment scroll logic: get block by blockId, retrieve segment at `currentSegmentIndex`, extract segment range [startLine, endLine] | ✅ | 2026-02-01 |
| REQ-083 | Scroll editor to segment start line using `activeEditor.revealRange(..., vscode.TextEditorRevealType.InCenter)` | ✅ | 2026-02-01 |
| REQ-084 | Move cursor to segment start position: `activeEditor.selection = new vscode.Selection(position, position)` | ✅ | 2026-02-01 |
| REQ-085 | Update navigator indicator via `segmentNavigator.updateNavigator(currentSegmentIndex, segmentCount)` after scroll completes | ✅ | 2026-02-01 |
| CON-004 | Segment navigation must preserve block highlighting (decorations remain applied while navigating) | ✅ | 2026-02-01 |

---

### Implementation Phase 8 — Integration & Cleanup

**Goal**: Complete integration testing, remove obsolete code, and ensure all components work together.

#### Code Cleanup

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-086 | Verify all references to removed methods are updated (e.g., `applyFocusMode`, `clearFocusMode`, `foldRanges`, `unfoldRanges`) | ✅ | 2026-02-01 |
| REQ-087 | Update `logger.ts` to ensure all new selection/deselection/navigation events are logged with appropriate log levels | ✅ | 2026-02-01 |
| REQ-088 | Remove all comments and code related to Phase 5 focus mode behavior | ✅ | 2026-02-01 |
| REQ-089 | Remove all comments related to Phase 5 fold gap detection | ✅ | 2026-02-01 |
| CON-005 | All remaining code must include inline comments explaining block selection, segment navigation, and floating buttons | ✅ | 2026-02-01 |

#### Integration Verification

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| REQ-090 | Verify state manager properly transitions selection state on IDLE/STALE | ✅ | 2026-02-01 |
| REQ-091 | Verify decoration manager applies/clears selection decorations correctly | ✅ | 2026-02-01 |
| REQ-092 | Verify segment navigator shows/hides at correct times | ✅ | 2026-02-01 |
| REQ-093 | Verify keyboard shortcuts (Ctrl+Up/Down/Esc) work when block is selected | ✅ | 2026-02-01 |
| REQ-094 | Verify webview message handling completes full round-trip (webview → extension → decorations/scroll) | ✅ | 2026-02-01 |

---

## 2. Architecture Decisions

### State Model Simplification

**Decision**: Replace separate `FocusState` and `FoldState` with unified `SelectionState` containing `selectedBlockId` and `currentSegmentIndex`.

**Rationale**: 
- Simplifies state transitions (single selection, not focus + fold combinations)
- Easier to reason about (pin/unpin is binary)
- Reduces state manager complexity and potential for inconsistency

### Pin/Unpin vs Focus Mode

**Decision**: Use toggle-on-click (pin/unpin) instead of focus mode with dimming.

**Rationale**:
- More intuitive: first click pins, second click unpins
- No visual dimming complexity (all blocks equally visible when selected)
- Cleaner cognitive model: "selected block" vs "focus mode with context dimming"

### Floating Buttons Over Inline Navigation

**Decision**: Use floating buttons in editor corner rather than inline breadcrumb or tab system.

**Rationale**:
- Non-intrusive (doesn't consume editor gutter space)
- Accessible from any editor position
- Consistent with VS Code UI patterns (e.g., debug toolbar, folding regions)

### Segment Navigation via Keyboard Shortcuts

**Decision**: Primary navigation via `Ctrl+Up` / `Ctrl+Down` with clickable buttons as secondary.

**Rationale**:
- Keyboard-first for power users
- Faster than clicking for repeated navigation
- Aligns with VS Code's extensive keyboard shortcut system

---

## 3. Constraints & Edge Cases

### Constraint: Single Selection

**Constraint**: Only one block can be selected at a time.

**Rationale**: Simplifies state management, prevents conflicting decorations.

**Handling**: Selecting a new block automatically deselects the previous one.

### Constraint: Segment Index Reset

**Constraint**: When selecting a different block, segment index resets to 0.

**Rationale**: Prevents confusion from remembering segment positions across blocks.

**Handling**: Always initialize `currentSegmentIndex = 0` in `executeSelectBlock()`.

### Edge Case: Block with Single Segment

**Handling**: Show navigator with "1 / 1" indicator, both arrows disabled.

### Edge Case: Empty Block (No Ranges)

**Handling**: If block has no ranges, don't select it; log warning to user.

### Edge Case: Esc While Scrolling

**Constraint**: Esc key should immediately deselect even if scroll animation in progress.

**Handling**: Set `selectedBlockId = null` synchronously; scroll completes asynchronously.

---

## 4. Success Criteria

- [ ] All focus mode code (folding, dimming, double-click) successfully removed
- [ ] Pin/unpin toggle behavior working: single click selects, second click on same block deselects
- [ ] Block selection state persists correctly across editor operations
- [ ] Floating segment navigator appears/disappears at correct times
- [ ] Segment navigation via Ctrl+Up/Down scrolls editor to correct segment
- [ ] Segment indicator ("X / Y") accurately reflects current position
- [ ] Esc key deselects block and hides navigator
- [ ] Scattered blocks with 3+ segments navigate smoothly
- [ ] All decorations maintain WCAG AA contrast in light and dark themes
- [ ] No visual glitches during state transitions or segment navigation
- [ ] Extension Output Channel logs all selection/deselection/navigation events

---

## 5. Timeline & Phase Dependencies

- **Phase 1** (State): 1-2 hours — Independent, must complete first
- **Phase 2** (Webview): 2-3 hours — Depends on Phase 1
- **Phase 3** (Navigator Component): 1-2 hours — Parallel with Phase 4, depends on Phase 1
- **Phase 4** (Extension Handlers): 2-3 hours — Depends on Phase 1, can start with Phase 2
- **Phase 5** (CSS/HTML): 1 hour — Depends on Phase 2
- **Phase 6** (Keyboard Commands): 1 hour — Depends on Phase 4
- **Phase 7** (Scroll/Centering): 1 hour — Depends on Phase 4
- **Phase 8** (Integration): 2-3 hours — Final cleanup, depends on all prior phases

**Total Estimated Duration**: 11-15 hours of focused development

---

## 6. Files Modified/Created

| File | Type | Changes |
|------|------|---------|
| [irisState.ts](../src/state/irisState.ts) | Modified | Remove `FocusState`/`FoldState`, add `SelectionState`, new methods |
| [sidePanel.ts](../src/webview/sidePanel.ts) | Modified | Simplify block handlers, remove fold/double-click logic, add segment navigation |
| [extension.ts](../src/extension.ts) | Modified | Update message routing, add segment navigation handlers, remove fold logic |
| [decorationManager.ts](../src/decorations/decorationManager.ts) | Modified | Remove focus/dimming methods, add selection methods |
| [messages.ts](../src/types/messages.ts) | Modified | Update message type definitions |
| [segmentNavigator.ts](../src/decorations/segmentNavigator.ts) | **Created** | New floating navigator component |
| [package.json](../package.json) | Modified | Add keyboard commands and keybindings for segment navigation |

---

## 7. Risk Assessment & Mitigation

### Risk: Breaking Changes to State Model

**Severity**: High  
**Mitigation**: Comprehensive state transition testing; maintain backward-compatible state manager API where possible.

### Risk: Regression in Decoration Rendering

**Severity**: Medium  
**Mitigation**: Keep existing decoration logic intact; only remove focus-specific variants. Test with 5-15 block samples.

### Risk: Floating Navigator Z-Index Conflicts

**Severity**: Low  
**Mitigation**: Use `z-index: 1000` to ensure visibility above editor UI; test in nested dialogs/panels.

### Risk: Keyboard Shortcut Conflicts

**Severity**: Low  
**Mitigation**: Ctrl+Up/Down rarely used in VS Code; verify no conflict with common extensions via testing.

---

## 8. Notes & References

- **Current Focus Mode Implementation**: See lines 150-400 in [sidePanel.ts](../src/webview/sidePanel.ts) for existing double-click/fold logic to remove
- **Decoration Reference**: [decorationManager.ts](../src/decorations/decorationManager.ts) lines 200-300 show current hover decoration pattern to adapt for selection
- **Previous Refinements**: [ui-refinement-plan.md](ui-refinement-plan.md) documents Phases 1-8 (hover reveal, click/double-click, keyboard shortcuts) — build upon those foundations
- **Related Requirements**: REQ-003 (remove header), REQ-013 (description reveal), REQ-009 (Esc key) from earlier phases remain active

