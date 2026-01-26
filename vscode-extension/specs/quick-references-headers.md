# IRIS MVP - Quick Reference Headers for Each Phase

Copy and paste the appropriate quick reference block at the start of your coding session with AI copilots.

---

## Phase 0 - Development Environment Setup

```markdown
## Quick Reference - Phase 0: Development Environment Setup
- **Current Phase**: Phase 0 - Development Environment Setup
- **Goal**: GOAL-000 - Establish reproducible local development environment
- **Tasks**: TASK-0001 through TASK-0005
- **Active Files**: N/A (system setup)
- **Key Constraints**: N/A
- **Dependencies**: DEP-001 (Node.js LTS), DEP-002 (VS Code Stable)
- **Related Phases**: → Phase 1
- **Completion Criteria**: Extension launches in VS Code Extension Development Host (F5)
```

---

## Phase 1 - Minimal Extension Skeleton

```markdown
## Quick Reference - Phase 1: Minimal Extension Skeleton
- **Current Phase**: Phase 1 - Minimal Extension Skeleton
- **Goal**: GOAL-001 - Create minimal, runnable VS Code Extension
- **Tasks**: TASK-0011 through TASK-0015
- **Active Files**: 
  - `package.json`
  - `src/extension.ts`
- **Key Constraints**: LOG-001, LOG-002
- **Dependencies**: DEP-003 (TypeScript), DEP-004 (VS Code Extension API)
- **Related Phases**: Phase 0 ← | → Phase 2
- **Completion Criteria**: Command appears in Command Palette and logs to Output Channel
```

---

## Phase 2 - Editor Context Access

```markdown
## Quick Reference - Phase 2: Editor Context Access
- **Current Phase**: Phase 2 - Editor Context Access
- **Goal**: GOAL-002 - Read active editor context and extract file information
- **Tasks**: TASK-0021 through TASK-0025
- **Active Files**: 
  - `src/extension.ts`
- **Key Constraints**: REQ-002 (Single-File Scope), LOG-001
- **Dependencies**: DEP-004 (VS Code Extension API)
- **Related Phases**: Phase 1 ← | → Phase 3
- **Completion Criteria**: File path, language, content, and metadata logged to Output Channel
```

---

## Phase 3 - Explicit Analysis Trigger & Server Integration

```markdown
## Quick Reference - Phase 3: Analysis Trigger & Server Integration
- **Current Phase**: Phase 3 - Explicit Analysis Trigger & Server Integration
- **Goal**: GOAL-003 - Trigger analysis via command and integrate with IRIS server
- **Tasks**: TASK-0031 through TASK-0038
- **Active Files**: 
  - `src/extension.ts`
  - `src/api/irisClient.ts` (new)
- **Key Constraints**: 
  - REQ-001 (Explicit Analysis Trigger)
  - API-001, API-002, API-004 (Backend Contract)
  - LOG-001, LOG-003 (Error Handling)
- **Dependencies**: DEP-005 (IRIS Analysis Server)
- **API Contract**: POST `/api/iris/analyze` - see Phase 3 section for full schema
- **Related Phases**: Phase 2 ← | → Phase 4
- **Completion Criteria**: Successful request/response with server, errors handled gracefully
```

---

## Phase 4 - Extension State Model Definition

```markdown
## Quick Reference - Phase 4: Extension State Model Definition
- **Current Phase**: Phase 4 - Extension State Model Definition
- **Goal**: GOAL-004 - Define centralized state model as single source of truth
- **Tasks**: TASK-0041 through TASK-0049
- **Active Files**: 
  - `src/state/irisState.ts` (new)
  - `src/extension.ts`
- **Key Constraints**: 
  - STATE-001 (Single Source of Truth)
  - STATE-002 (Explicit Transitions)
  - STATE-003 (STALE Until Reanalysis)
  - REQ-004 (State-Driven UI)
  - API-002 (Failure Handling)
- **State Enum**: IDLE, ANALYZING, ANALYZED, STALE
- **Related Phases**: Phase 3 ← | → Phase 5, 6, 7, 8, 9
- **Completion Criteria**: State transitions logged, data persisted, read-only selectors exposed
```

---

## Phase 5 - Webview Side Panel (Read-only)

```markdown
## Quick Reference - Phase 5: Webview Side Panel (Read-only)
- **Current Phase**: Phase 5 - Webview Side Panel (Read-only)
- **Goal**: GOAL-005 - Render analysis results in VS Code side panel
- **Tasks**: TASK-0051 through TASK-0059
- **Active Files**: 
  - `src/webview/sidePanel.ts` (new)
  - `package.json` (view contribution)
- **Key Constraints**: 
  - REQ-003 (Read-Only Semantics)
  - REQ-004 (State-Driven UI)
  - UX-001 (Honest State)
  - LOG-001
- **Display States**: IDLE (empty), ANALYZING (loading), ANALYZED (content), STALE (warning)
- **Related Phases**: Phase 4 ← | → Phase 6
- **Completion Criteria**: File Intent and Responsibility Blocks render correctly, state-responsive
```

---

## Phase 6 - Webview ↔ Extension Messaging

```markdown
## Quick Reference - Phase 6: Webview ↔ Extension Messaging
- **Current Phase**: Phase 6 - Webview ↔ Extension Messaging
- **Goal**: GOAL-006 - Define typed messaging protocol using blockId
- **Tasks**: TASK-0061 through TASK-0068
- **Active Files**: 
  - `src/utils/blockId.ts` (new)
  - `src/webview/sidePanel.ts`
  - `src/state/irisState.ts`
- **Key Constraints**: 
  - REQ-005 (Deterministic blockId)
  - LOG-001, LOG-003 (Message Logging)
- **Dependencies**: DEP-006 (SHA-1 Hash Utility)
- **blockId Format**: `rb_${sha1(canonical_signature).slice(0, 12)}`
- **Message Types**: 
  - Webview → Extension: WEBVIEW_READY, BLOCK_HOVER, BLOCK_SELECT, BLOCK_CLEAR
  - Extension → Webview: STATE_UPDATE, ANALYSIS_DATA, ERROR
- **Related Phases**: Phase 5 ← | → Phase 7, 8
- **Completion Criteria**: blockId generated deterministically, messages typed and logged
```

---

## Phase 7 - Editor Decorations (Semantic Highlighting)

```markdown
## Quick Reference - Phase 7: Editor Decorations (Semantic Highlighting)
- **Current Phase**: Phase 7 - Editor Decorations (Semantic Highlighting)
- **Goal**: GOAL-007 - Visually highlight code regions using decorations
- **Tasks**: TASK-0071 through TASK-0077
- **Active Files**: 
  - `src/decorations/decorationManager.ts` (new)
  - `src/extension.ts`
- **Key Constraints**: 
  - ED-001 (Overlay-Only)
  - ED-002 (Deterministic Colors)
  - ED-003 (Immediate Disposal)
  - REQ-005 (blockId-driven)
- **Interaction Triggers**: 
  - BLOCK_HOVER → apply decorations
  - BLOCK_CLEAR → remove decorations
  - STALE/IDLE → dispose all
- **Related Phases**: Phase 6 ← | → Phase 8, 9
- **Completion Criteria**: Decorations appear/clear on hover, colors deterministic per blockId
```

---

## Phase 8 - Focus Mode (Responsibility Block Selection)

```markdown
## Quick Reference - Phase 8: Focus Mode (Responsibility Block Selection)
- **Current Phase**: Phase 8 - Focus Mode (Responsibility Block Selection)
- **Goal**: GOAL-008 - Allow explicit focus on single responsibility block
- **Tasks**: TASK-0081 through TASK-0086
- **Active Files**: 
  - `src/state/irisState.ts`
  - `src/decorations/decorationManager.ts`
  - `src/webview/sidePanel.ts`
- **Key Constraints**: 
  - UX-002 (No Implicit Actions)
  - UX-003 (Predictable Reset)
  - ED-003 (Disposal on state change)
- **Focus State**: `activeBlockId: string | null`
- **Visual Behavior**: 
  - Active block: enhanced decoration
  - Inactive blocks: reduced opacity
  - Hover disabled while focused
- **Exit Triggers**: FOCUS_CLEAR, STALE, IDLE, editor switch
- **Related Phases**: Phase 7 ← | → Phase 9
- **Completion Criteria**: Focus mode visually distinct, exits on state transitions
```

---

## Phase 9 - File Change Handling & STALE State Transition

```markdown
## Quick Reference - Phase 9: File Change Handling & STALE State
- **Current Phase**: Phase 9 - File Change Handling & STALE State Transition
- **Goal**: GOAL-009 - Invalidate analysis immediately on file modification
- **Tasks**: TASK-0091 through TASK-0096
- **Active Files**: 
  - `src/extension.ts`
  - `src/state/irisState.ts`
  - `src/decorations/decorationManager.ts`
  - `src/webview/sidePanel.ts`
- **Key Constraints**: 
  - STATE-003 (STALE Until Reanalysis)
  - UX-001 (Honest State)
  - UX-003 (Predictable Reset)
  - ED-003 (Clear decorations)
  - LOG-001
- **Core Rule**: ANY edit invalidates analysis (no diffing/heuristics)
- **Change Detection**: `onDidChangeTextDocument` for analyzed file URI
- **STALE Transition Sequence**:
  1. State → STALE
  2. Clear all decorations
  3. Exit Focus Mode
  4. Notify Webview (ANALYSIS_STALE)
  5. Ignore subsequent edits (single-shot)
- **Related Phases**: Phase 8 ← | → Phase 10
- **Completion Criteria**: File edits trigger immediate STALE transition, decorations cleared
```

---

## Phase 10 - UX Polish, Error Handling & Stability

```markdown
## Quick Reference - Phase 10: UX Polish, Error Handling & Stability
- **Current Phase**: Phase 10 - UX Polish, Error Handling & Stability
- **Goal**: GOAL-010 - Make MVP robust, debuggable, and predictable
- **Tasks**: TASK-0101 through TASK-0106
- **Active Files**: 
  - All files (comprehensive review)
  - Focus: error boundaries, loading states, cleanup
- **Key Constraints**: 
  - LOG-001, LOG-002, LOG-003 (Structured Logging)
  - API-002 (Failure Handling)
  - ED-003 (Resource Disposal)
  - GUD-001 (Predictability Over Cleverness)
- **Error Categories**: 
  - Server failures
  - Invalid API responses
  - Unsupported languages
  - Webview initialization failures
- **UX Improvements**:
  - Loading states during analysis
  - Disable duplicate triggers
  - Empty state handling
- **Stability Checklist**:
  - Decorations disposed on deactivation
  - No stale editor references
  - Message handling when state invalid
- **Related Phases**: Phase 9 ← | Final phase
- **Completion Criteria**: Manual test pass across all phases, no crashes, all errors logged/surfaced
```

---

## How to Use These Quick References

1. **At Session Start**: Copy the relevant phase's quick reference block
2. **In Your Prompt**: Paste it before your specific request
3. **Example**:
   ```
   [Quick Reference - Phase 7: Editor Decorations]
   
   I need to implement TASK-0072: deterministic color generation from blockId.
   The color should be stable across sessions and visually distinct.
   ```

4. **Benefits**:
   - AI immediately knows current context
   - Reminds AI of relevant constraints
   - Shows which files to focus on
   - Prevents scope creep into other phases

---

## Notes

- Keep the main `mvp-implementation-plan.md` open as reference
- Update "Current Phase" as you progress
- Quick references are **navigation aids**, not replacements for full documentation
- Cross-reference codes (REQ-*, STATE-*, etc.) link back to main document