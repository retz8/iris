---
goal: IRIS VS Code Extension UI Refinement
version: 1.0
date_created: 2026-02-01
last_updated: 2026-02-01
owner: IRIS Team
status: 'Planned'
tags: ['upgrade', 'ui', 'vscode-extension', 'frontend']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan outlines the UI refinement for the IRIS VS Code extension. The plan is divided into multiple phases, starting with pure visual/styling upgrades to match the target design (sample4.PNG), followed by removal of unnecessary UI elements, and concluding with functional enhancements including hover interactions, click/double-click behaviors, keyboard shortcuts, and code folding.

The current MVP implementation (documented in `vscode-extension/specs/current-status.md`) provides a functional foundation with command-driven analysis, state management, webview side panel, editor decorations, and focus mode. This upgrade plan preserves all existing functionality while modernizing the user interface and adding new interaction patterns.

## 1. Requirements & Constraints

### Visual Design Requirements
- **REQ-001**: UI must match the visual design shown in sample4.PNG reference image
- **REQ-002**: Sidebar must maintain same font family as code editor
- **REQ-003**: Color assignments for responsibility blocks must be visually distinct
- **REQ-004**: Highlight decorations must render behind text, not in front (background layer)
- **REQ-005**: Description text must appear smoothly below label on hover with animation

### Functional Requirements
- **REQ-006**: Single click on responsibility block must scroll editor to first line and enter focus mode without folding
- **REQ-007**: Double click on responsibility block must scroll editor to first line, enter focus mode, and fold gaps between scattered ranges
- **REQ-008**: Double click on already-focused block must toggle fold state (fold ↔ unfold)
- **REQ-009**: Esc key must exit focus mode and unfold any folded lines
- **REQ-010**: Clicking on currently selected block must exit focus mode
- **REQ-011**: Reload icon button must trigger re-analysis of current file

### UI Structure Requirements
- **REQ-012**: Remove "Code Navigator" header text from sidebar
- **REQ-013**: Remove "Responsibilities" section header
- **REQ-014**: Remove "FILE INTENT" header text (keep intent content)
- **REQ-015**: Sidebar header must only contain reload icon button aligned to right

### Technical Constraints
- **CON-001**: No changes to TypeScript logic, state management, or backend integration in Phase 1
- **CON-002**: All existing state transitions (IDLE → ANALYZING → ANALYZED → STALE) must be preserved
- **CON-003**: Deterministic blockId generation must remain unchanged
- **CON-004**: VS Code API usage for decorations and ranges must follow zero-based indexing
- **CON-005**: No new external dependencies or libraries may be added without explicit approval

### Design Guidelines
- **GUD-001**: Use CSS transitions/animations for smooth hover effects (description reveal)
- **GUD-002**: Maintain accessibility standards for color contrast and keyboard navigation
- **GUD-003**: Ensure responsive layout that adapts to sidebar width changes
- **GUD-004**: Use VS Code theme colors where appropriate for native look and feel

### Implementation Patterns
- **PAT-001**: HTML structure changes must be minimal in Phase 1 (focus on CSS)
- **PAT-002**: Use CSS custom properties (variables) for reusable color and spacing values
- **PAT-003**: Separate styling concerns from functional logic across all phases
- **PAT-004**: Message passing between webview and extension must use typed contracts

## 2. Implementation Steps

### Implementation Phase 1: Visual Styling Upgrade

- **GOAL-001**: Transform current UI appearance to match sample4.PNG design through CSS and HTML structure changes only, without modifying any functional TypeScript code

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Analyze sample4.PNG and document all visual differences from current UI (colors, spacing, typography, borders, shadows, layout) | ✅ | 2026-02-01 |
| TASK-002 | Update sidebar header styling: remove background color, adjust padding, ensure reload icon button is right-aligned with proper spacing | ✅ | 2026-02-01 |
| TASK-003 | Remove "FILE INTENT" header text while keeping intent content, adjust spacing and typography to match sample design | ✅ | 2026-02-01 |
| TASK-004 | Update responsibility block styling: adjust padding, margins, border styles, background colors to match sample design | ✅ | 2026-02-01 |
| TASK-005 | Implement hover state styling for responsibility blocks (background color change, subtle elevation/shadow) | ✅ | 2026-02-01 |
| TASK-006 | Implement selected/focus state styling for responsibility blocks (stronger highlight, different border or background) | ✅ | 2026-02-01 |
| TASK-007 | Update typography across sidebar: font sizes, weights, line heights, letter spacing to match sample design | ✅ | 2026-02-01 |
| TASK-008 | Adjust color scheme for responsibility block labels and descriptions to match sample design | ✅ | 2026-02-01 |
| TASK-009 | Update spacing and layout: adjust gaps between blocks, internal padding, margins to match sample design | ✅ | 2026-02-01 |
| TASK-010 | Ensure stale state warning styling is consistent with new design language | ✅ | 2026-02-01 |
| TASK-011 | Add CSS transitions for smooth hover effects (prepare for Phase 3 description reveal) | ✅ | 2026-02-01 |
| TASK-012 | Verify all state-driven views (IDLE, ANALYZING, ANALYZED, STALE) render correctly with new styles | ✅ | 2026-02-01 |
| TASK-013 | Test UI styling across different VS Code themes (light, dark, high contrast) | ✅ | 2026-02-01 |

### Implementation Phase 2: Remove Unnecessary UI Elements

- **GOAL-002**: Clean up UI by removing header texts and unnecessary labels to create a cleaner, more streamlined interface

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | Remove "Code Navigator" text from sidebar header HTML in `vscode-extension/src/webview/sidePanel.ts` | ✅ | 2026-02-01 |
| TASK-015 | Remove "Responsibilities" section header from HTML structure | ✅ | 2026-02-01 |
| TASK-016 | Update HTML generation logic to remove header text elements while preserving semantic structure | ✅ | 2026-02-01 |
| TASK-017 | Adjust spacing/padding after header removal to maintain visual balance | ✅ | 2026-02-01 |
| TASK-018 | Verify all state transitions still render correctly without removed headers | ✅ | 2026-02-01 |

### Implementation Phase 3: Hover Description Reveal

- **GOAL-003**: Implement smooth animated description reveal on responsibility block hover

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-019 | Modify HTML structure to wrap description in collapsible container with hidden-by-default state | ✅ | 2026-02-01 |
| TASK-020 | Add CSS for description container: max-height transition, opacity fade, padding animation | ✅ | 2026-02-01 |
| TASK-021 | Implement hover event listeners in webview JavaScript to toggle description visibility | ✅ | 2026-02-01 |
| TASK-022 | Add smooth CSS transition (0.2-0.3s ease) for description reveal animation | ✅ | 2026-02-01 |
| TASK-023 | Ensure description remains visible when block is in focus mode | ✅ | 2026-02-01 |
| TASK-024 | Test description animation performance and smoothness across different block sizes | ✅ | 2026-02-01 |

### Implementation Phase 4: Click and Scroll Behavior

- **GOAL-004**: Implement single-click behavior to scroll editor to block's first line and enter focus mode

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-025 | Add click event listener for responsibility blocks in webview JavaScript | ✅ | 2026-02-01 |
| TASK-026 | Define new message type `blockClick` in `vscode-extension/src/types/messages.ts` with `blockId` payload | ✅ | 2026-02-01 |
| TASK-027 | Update webview to send `blockClick` message on single click with block identifier | ✅ | 2026-02-01 |
| TASK-028 | Handle `blockClick` message in `vscode-extension/src/webview/sidePanel.ts` message handler | ✅ | 2026-02-01 |
| TASK-029 | Implement scroll-to-line logic: get block's first range start line, convert to zero-based index, use `vscode.TextEditorRevealType.InCenter` | ✅ | 2026-02-01 |
| TASK-030 | Integrate with existing focus mode logic in state manager to enter focus on click | ✅ | 2026-02-01 |
| TASK-031 | Update decoration manager to apply focus decorations after scroll completes | ✅ | 2026-02-01 |

### Implementation Phase 5: Double-Click and Fold Behavior

- **GOAL-005**: Implement double-click behavior to fold gaps between scattered block ranges and toggle fold state on subsequent double-clicks

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-032 | Add double-click detection logic in webview (track click timing, distinguish from single click) | ✅ | 2026-02-01 |
| TASK-033 | Define new message type `blockDoubleClick` in `vscode-extension/src/types/messages.ts` | ✅ | 2026-02-01 |
| TASK-034 | Implement fold gap detection algorithm: analyze block ranges, identify line gaps between non-contiguous ranges | ✅ | 2026-02-01 |
| TASK-035 | Store current fold state in state manager (track which blocks have folded ranges) | ✅ | 2026-02-01 |
| TASK-036 | Implement fold logic using VS Code folding API: create folding ranges for gaps between scattered block parts | ✅ | 2026-02-01 |
| TASK-037 | Implement unfold logic: restore expanded state for previously folded ranges | ✅ | 2026-02-01 |
| TASK-038 | Implement toggle behavior: if block already focused and folded, unfold; if focused and unfolded, fold | ✅ | 2026-02-01 |
| TASK-039 | Ensure fold state is cleared when analysis becomes stale or when file is edited | ✅ | 2026-02-01 |

### Implementation Phase 6: Esc Key and Click-to-Exit Focus

- **GOAL-006**: Implement Esc key handler to exit focus mode and unfold lines, plus click-to-toggle focus on already-selected blocks

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-040 | Add global keydown event listener for Esc key in extension (use `vscode.commands.registerCommand` with keybinding) | ✅ | 2026-02-01 |
| TASK-041 | Define Esc key command in `package.json` contributions with `"when": "editorTextFocus && iris.focusModeActive"` context | ✅ | 2026-02-01 |
| TASK-042 | Implement Esc handler: call state manager to exit focus mode, clear active block | ✅ | 2026-02-01 |
| TASK-043 | Unfold any previously folded ranges when Esc is pressed | ✅ | 2026-02-01 |
| TASK-044 | Update decoration manager to clear focus decorations and restore normal hover state | ✅ | 2026-02-01 |
| TASK-045 | Modify single-click handler to detect if clicked block is already focused (activeBlockId matches) | ✅ | 2026-02-01 |
| TASK-046 | Implement click-to-exit logic: if already focused, exit focus mode and unfold instead of re-entering focus | ✅ | 2026-02-01 |

### Implementation Phase 7: Smart Color Assignment

- **GOAL-007**: Implement intelligent color assignment algorithm to ensure visually distinct colors for each responsibility block

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-047 | Research and select color assignment algorithm (e.g., HSL color space distribution, golden ratio, or perceptually uniform color spaces) | ✅ | 2026-02-01 |
| TASK-048 | Create new utility function in `vscode-extension/src/utils/colorAssignment.ts` for deterministic color generation | ✅ | 2026-02-01 |
| TASK-049 | Implement algorithm to generate N visually distinct colors with good contrast against editor background | ✅ | 2026-02-01 |
| TASK-050 | Ensure colors maintain accessibility standards (WCAG AA contrast ratios for both light and dark themes) | ✅ | 2026-02-01 |
| TASK-051 | Update `vscode-extension/src/utils/blockId.ts` or decoration manager to use new color assignment function | ✅ | 2026-02-01 |
| TASK-052 | Test color distinctiveness with files containing 3, 5, 10, and 15+ responsibility blocks | ✅ | 2026-02-01 |
| TASK-053 | Verify colors remain consistent across sessions for same block structure (deterministic based on blockId) | ✅ | 2026-02-01 |

### Implementation Phase 8: Background Highlight Rendering

- **GOAL-008**: Fix decoration rendering to place highlights behind text rather than in front

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-054 | Review current decoration configuration in `vscode-extension/src/decorations/decorationManager.ts` | ✅ | 2026-02-01 |
| TASK-055 | Update `vscode.window.createTextEditorDecorationType` options to use `backgroundColor` instead of `overviewRulerColor` or foreground properties | ✅ | 2026-02-01 |
| TASK-056 | Remove any `before` or `after` decoration properties that might obscure text | ✅ | 2026-02-01 |
| TASK-057 | Adjust `rangeBehavior` to `vscode.DecorationRangeBehavior.ClosedClosed` for precise range highlighting | ✅ | 2026-02-01 |
| TASK-058 | Test highlight opacity values to ensure text remains readable (suggest 0.2-0.3 alpha for background) | ✅ | 2026-02-01 |
| TASK-059 | Verify hover highlights render correctly behind text in both light and dark themes | ✅ | 2026-02-01 |
| TASK-060 | Verify focus mode highlights with dimming render correctly behind text | ✅ | 2026-02-01 |

### Implementation Phase 9: Documentation Update

- **GOAL-009**: Update current-status.md to reflect all UI refinement changes and new functionality

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-061 | Update "Summary" section in `vscode-extension/specs/current-status.md` to reflect UI refinement completion | ✅ | 2026-02-01 |
| TASK-062 | Add new section "12) Hover Description Reveal" documenting smooth animation behavior | ✅ | 2026-02-01 |
| TASK-063 | Add new section "13) Click and Scroll Behavior" documenting single-click scroll-to-line and focus entry | ✅ | 2026-02-01 |
| TASK-064 | Add new section "14) Double-Click Fold Behavior" documenting fold/unfold toggle for scattered blocks | ✅ | 2026-02-01 |
| TASK-065 | Add new section "15) Keyboard Shortcuts" documenting Esc key to exit focus and unfold lines | ✅ | 2026-02-01 |
| TASK-066 | Add new section "16) Click-to-Exit Focus" documenting click on selected block to exit focus mode | ✅ | 2026-02-01 |
| TASK-067 | Add new section "17) Smart Color Assignment" documenting intelligent color distribution algorithm | ✅ | 2026-02-01 |
| TASK-068 | Update section "8) Editor Decorations" to document background rendering fix (highlights behind text) | ✅ | 2026-02-01 |
| TASK-069 | Update section "5) Webview Side Panel" to document removed headers (Code Navigator, Responsibilities, FILE INTENT) | ✅ | 2026-02-01 |
| TASK-070 | Update section "5) Webview Side Panel" to document new visual styling matching refined design | ✅ | 2026-02-01 |
| TASK-071 | Update section "6) Webview ↔ Extension Messaging" to document new message types (blockClick, blockDoubleClick) | ✅ | 2026-02-01 |
| TASK-072 | Update "Extension Folder Structure (Current)" if any new files were added (e.g., colorAssignment.ts) | ✅ | 2026-02-01 |
| TASK-073 | Remove or update "Current Limitations (by design)" section if any limitations were addressed | ✅ | 2026-02-01 |
| TASK-074 | Update version number and date_updated in front matter | ✅ | 2026-02-01 |
| TASK-075 | Add "Notes" entry documenting UI refinement completion and reference to this implementation plan | ✅ | 2026-02-01 |

### Implementation Phase 10: README Update

- **GOAL-010**: Rewrite README.md to accurately describe IRIS as a code comprehension tool with refined UI and complete feature set

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-076 | Read and analyze current project README.md structure and content | ✅ | 2026-02-01 |
| TASK-077 | Review philosophy.md to extract core IRIS concepts and value propositions | ✅ | 2026-02-01 |
| TASK-078 | Review current-status.md to understand complete feature set after UI refinement | ✅ | 2026-02-01 |
| TASK-079 | Rewrite README.md introduction to position IRIS as code comprehension tool (not just abstraction layer) | ✅ | 2026-02-01 |
| TASK-080 | Add "What is IRIS?" section explaining the core problem (code review bottleneck) and IRIS solution | ✅ | 2026-02-01 |
| TASK-081 | Add comprehensive "Features" section documenting all capabilities (analysis, navigation, focus, interaction) | ✅ | 2026-02-01 |
| TASK-082 | Add "Installation" section with prerequisites and quick start instructions for backend and extension | ✅ | 2026-02-01 |
| TASK-083 | Add "Usage" section with basic workflow, example output, and interaction patterns | ✅ | 2026-02-01 |
| TASK-084 | Add "Architecture" section with system overview diagram and key components description | ✅ | 2026-02-01 |
| TASK-085 | Add "Development" section with project structure, test commands, and build instructions | ✅ | 2026-02-01 |
| TASK-086 | Add "Philosophy" section summarizing progressive abstraction and three-phase vision | ✅ | 2026-02-01 |
| TASK-087 | Update "Current Limitations" section to reflect accurate constraints | ✅ | 2026-02-01 |
| TASK-088 | Add "Roadmap" section with Q1-Q3 2026 milestones and planned features | ✅ | 2026-02-01 |
| TASK-089 | Add "Contributing" section with development setup and code style guidelines | ✅ | 2026-02-01 |
| TASK-090 | Add "Support" and "Acknowledgments" sections | ✅ | 2026-02-01 |
| TASK-091 | Ensure consistent markdown formatting and proper section hierarchy throughout README | ✅ | 2026-02-01 |
| TASK-092 | Verify all internal document links are correct (relative paths to docs/, specs/) | ✅ | 2026-02-01 |
| TASK-093 | Rewrite vscode-extension/README.md as extension-specific documentation | ✅ | 2026-02-01 |
| TASK-094 | Add features, requirements, usage, troubleshooting, and release notes to extension README | ✅ | 2026-02-01 |
| TASK-095 | Ensure extension README is suitable for VS Code Marketplace publication | ✅ | 2026-02-01 |

## 3. Alternatives

- **ALT-001**: Instead of pure CSS transitions for description reveal (Phase 3), could use JavaScript-driven animations with requestAnimationFrame for more control, but CSS transitions are more performant and simpler to maintain

- **ALT-002**: For color assignment (Phase 7), considered using random color generation with collision detection, but deterministic hashing provides consistency across sessions and is more predictable

- **ALT-003**: For fold behavior (Phase 5), considered using custom viewport hiding instead of VS Code folding API, but native folding provides better integration with editor features and user expectations

- **ALT-004**: For Esc key handling (Phase 6), considered implementing listener in webview instead of extension command, but extension-level command provides better integration with VS Code keybinding system and "when" contexts

- **ALT-005**: For click vs double-click detection (Phases 4-5), considered using single click with modifier keys (Cmd/Ctrl+click for fold), but double-click is more intuitive and doesn't conflict with existing VS Code shortcuts

## 4. Dependencies

- **DEP-001**: VS Code Extension API (vscode module) - already present, version compatibility maintained by VS Code
- **DEP-002**: Existing state manager (`vscode-extension/src/state/irisState.ts`) - will be extended with fold state tracking
- **DEP-003**: Existing decoration manager (`vscode-extension/src/decorations/decorationManager.ts`) - will be modified for background rendering
- **DEP-004**: Existing message types (`vscode-extension/src/types/messages.ts`) - will be extended with new message contracts
- **DEP-005**: CSS in webview HTML generation (`vscode-extension/src/webview/sidePanel.ts`) - will be heavily modified in Phase 1

## 5. Files

### Files to Modify

- **FILE-001**: `vscode-extension/src/webview/sidePanel.ts` - Main file for webview HTML generation, CSS styling, and message handling (Phases 1, 2, 3, 4, 5, 6)
- **FILE-002**: `vscode-extension/src/types/messages.ts` - Add new message types for click, double-click, and focus exit (Phases 4, 5, 6)
- **FILE-003**: `vscode-extension/src/state/irisState.ts` - Add fold state tracking and toggle logic (Phase 5)
- **FILE-004**: `vscode-extension/src/decorations/decorationManager.ts` - Update decoration rendering options for background highlights (Phase 8)
- **FILE-005**: `vscode-extension/src/utils/blockId.ts` - Potentially integrate with new color assignment (Phase 7)
- **FILE-006**: `vscode-extension/package.json` - Add Esc key command binding (Phase 6)

### Files to Create

- **FILE-007**: `vscode-extension/src/utils/colorAssignment.ts` - New utility for intelligent color generation (Phase 7)

### Files for Reference

- **FILE-008**: `vscode-extension/specs/current-status.md` - Current implementation documentation
- **FILE-009**: `vscode-extension/specs/mvp-implementation-plan.md` - Original MVP plan for context

## 6. Testing

*Note: Testing section intentionally left minimal per user request. Manual testing will be performed by implementer.*

- **TEST-001**: Visual regression testing - Compare UI rendering before/after Phase 1 changes across light/dark themes
- **TEST-002**: Click behavior testing - Verify single click scrolls and enters focus without folding
- **TEST-003**: Double-click behavior testing - Verify double-click folds gaps and subsequent double-clicks toggle fold state
- **TEST-004**: Keyboard shortcut testing - Verify Esc key exits focus and unfolds lines
- **TEST-005**: Color assignment testing - Verify colors are distinct and accessible in files with varying numbers of blocks

## 7. Risks & Assumptions

### Risks

- **RISK-001**: CSS-only styling changes in Phase 1 may not fully replicate sample4.PNG design if structural HTML changes are needed - *Mitigation: Review HTML structure early and adjust plan if necessary*
- **RISK-002**: Double-click detection may conflict with VS Code's native double-click-to-select behavior - *Mitigation: Test thoroughly and consider debounce timing*
- **RISK-003**: Folding API behavior may vary across VS Code versions or with certain file types - *Mitigation: Test with supported languages only, document any limitations*
- **RISK-004**: Color distinctiveness algorithm may not work well with very large numbers of blocks (20+) - *Mitigation: Set practical limit, provide fallback to simpler hash-based colors*
- **RISK-005**: Animation performance may degrade with many responsibility blocks - *Mitigation: Use CSS transforms and opacity for GPU acceleration, limit animation complexity*

### Assumptions

- **ASSUMPTION-001**: The sample4.PNG image accurately represents the desired final UI design
- **ASSUMPTION-002**: Current VS Code API version supports all required folding and decoration features
- **ASSUMPTION-003**: Users will primarily work with files containing 3-15 responsibility blocks (not 50+)
- **ASSUMPTION-004**: Description text for responsibility blocks is short enough to reveal smoothly without scroll (< 200 characters)
- **ASSUMPTION-005**: Backend API response format will remain unchanged during UI refinement
- **ASSUMPTION-006**: Single-click and double-click behaviors can be reliably distinguished with standard timing thresholds (300ms)

## 8. Related Specifications / Further Reading

- [Current MVP Implementation Status](vscode-extension/specs/current-status.md)
- [Original MVP Implementation Plan](vscode-extension/specs/mvp-implementation-plan.md)
- [VS Code Extension API - Decorations](https://code.visualstudio.com/api/references/vscode-api#DecorationOptions)
- [VS Code Extension API - Folding](https://code.visualstudio.com/api/references/vscode-api#FoldingRange)
- [VS Code Extension API - Webview Communication](https://code.visualstudio.com/api/extension-guides/webview#scripts-and-message-passing)
- [CSS Transitions and Animations Best Practices](https://web.dev/animations-guide/)