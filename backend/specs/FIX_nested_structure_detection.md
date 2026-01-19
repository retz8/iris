---
goal: Fix IRIS nested structure detection to handle container files with internal subsystems
version: 1.0
date_created: 2026-01-19
last_updated: 2026-01-19
owner: IRIS Team
status: 'Planned'
tags: ['bug', 'architecture', 'ast', 'prompts']
---

# Fix Nested Structure Detection in IRIS

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

## Introduction

IRIS currently fails on files with **nested structure** (single large container with internal logic), producing a single monolithic responsibility block instead of extracting internal subsystems. This breaks the core IRIS philosophy on a large class of real-world files including React components, classes with methods, IIFE module patterns, and nested function architectures.

**Root Cause:** Shallow AST stops at `max_depth=2`, hiding nested declarations below that level. The agent cannot extract responsibility blocks from structure it cannot see.

**Problem Example:**
```javascript
function createManualWheelchair(params) {
  // 11+ helper functions nested inside:
  function createSeatCushion() { ... }
  function createBackrest() { ... }
  function createBackWheel() { ... }
  // ... 8 more functions
  
  // Assembly logic
  return union(seatCushion, backrest, backWheel, ...);
}
```

**Current Shallow AST (depth=2):**
```json
{
  "type": "function_declaration",
  "name": "createManualWheelchair",
  "line_range": [31, 919],
  "extra_children_count": 150  // ← All nested functions collapsed
}
```

**Current Agent Behavior:**
- Sees only the parent function
- Cannot see nested functions (hidden below depth 2)
- Produces ONE responsibility block: "Wheelchair Model Generator" [lines 31-919]

**Expected Shallow AST (adaptive depth 4-5 for containers):**
```json
{
  "type": "function_declaration",
  "name": "createManualWheelchair",
  "line_range": [31, 919],
  "children": [
    {"type": "function_declaration", "name": "createSeatCushion", "line_range": [34, 55]},
    {"type": "function_declaration", "name": "createBackrest", "line_range": [57, 120]},
    {"type": "function_declaration", "name": "createBackWheel", "line_range": [310, 350]},
    // ... 8 more nested functions now visible
  ]
}
```

**Expected Agent Behavior:**
- Sees nested function declarations in AST
- Groups related functions into logical ecosystems
- Produces 4-5 responsibility blocks:
  - "Seat Component Generator" (createSeatCushion, createSeatrest, ...)
  - "Wheel Assembly System" (createBackWheel, createFrontWheel, ...)
  - "Structural Framework" (createBackrestStructure, createLegrestStructure, ...)
  - "Final Assembly Orchestrator" (main createManualWheelchair logic)

**Solution Philosophy (Option A: AST-First):**
> Provide better structured data (deeper AST for containers), not workarounds (reading full source code).
> Aligns with IRIS principle: "The Shallow AST IS the Table of Contents."

---

## 1. Requirements & Constraints

**REQ-001**: AST processor must detect "container" nodes (functions/classes with nested declarations) and extend depth scanning selectively to make nested structure visible

**REQ-002**: Container detection must use conservative heuristics (nested declaration count, extra_children_count) to avoid over-scanning flat files

**REQ-003**: Extended depth must expose nested function/method declarations with full metadata (name, line_range, comments)

**REQ-004**: Solution must work across languages: JavaScript, TypeScript, Python (classes with methods), Java (classes), C++ (classes)

**REQ-005**: Maintain backward compatibility - flat files must behave exactly as before (depth=2)

**REQ-006**: Prompt adjustments must help agent interpret nested AST structure, NOT bypass AST by reading full source code

**CON-001**: Cannot increase global max_depth (would explode token usage on flat files)

**CON-002**: Must preserve existing Shallow AST structure and fields - only adding deeper nesting where needed

**CON-003**: Container detection must be conservative - prefer false positives (extra depth) over false negatives (hidden structure)

**CON-004**: Extended depth must not exceed 5 levels (to prevent exponential token growth)

**GUD-001**: Follow existing AST processor architecture (recursive _build_node pattern)

**GUD-002**: Use existing Tree-sitter node types and fields

**GUD-003**: Align with IRIS philosophy: "Provide structured metadata (AST), don't make agent parse raw source"

**PAT-001**: Use adaptive depth policy instead of global depth limit

---

## 2. Implementation Steps

**IMPLEMENTATION STRATEGY:**
- **Phase 1 (PRIMARY)**: AST processor enhancement - makes nested structure visible
- **Phase 2 (OPTIONAL)**: Minimal prompt guidance - helps agent interpret nested AST
- **Phase 3 (DOCUMENTATION)**: Update docs and examples

**PHASE DEPENDENCY:**
- Phase 1 must complete first (changes data structure)
- Phase 2 depends on Phase 1 (interprets new data)
- Phase 3 can run after Phase 1 is tested

**NOT PARALLEL-SAFE**: Phase 2 requires Phase 1's AST changes to be meaningful.

### Implementation Phase 1: AST Processor Container Detection

**GOAL-001**: Add container detection logic to Shallow AST processor

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `_count_nested_declarations(node)` helper method to count function/method/class declarations inside a node | | |
| TASK-002 | Add `_should_extend_depth(node, current_depth)` method with container detection heuristics | | |
| TASK-003 | Modify `_build_node()` to use adaptive depth stopping based on `_should_extend_depth()` | | |
| TASK-004 | Add debug logging for container detection decisions | | |
| TASK-005 | Update `ShallowASTProcessor.__init__()` docstring to document adaptive depth behavior | | |

### Implementation Phase 2: Minimal Prompt Guidance for Nested AST

**GOAL-002**: Add minimal guidance to help agent interpret nested structure in enhanced AST

**NOTE:** This phase is optional and minimal. Phase 1 (AST enhancement) does the heavy lifting. Phase 2 just adds interpretive guidance.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Add brief note to `TOOL_CALLING_SYSTEM_PROMPT` Phase 1 about container files | | |
| TASK-007 | Add guidance: "If you see a node with many nested `children`, these may represent logical subsystems" | | |
| TASK-008 | Add example showing nested AST structure and how to group into responsibility blocks | | |
| TASK-009 | Update `build_tool_calling_prompt()` function documentation to mention nested structure support | | |

### Implementation Phase 3: Documentation Updates

**GOAL-003**: Document the nested structure handling for future maintainers

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Add section to `.github/copilot-instructions.md` about container file handling | | |
| TASK-011 | Update `README.md` with example of nested structure support | | |
| TASK-012 | Add inline code comments explaining adaptive depth logic in `ast_processor.py` | | |

---

## 3. Alternatives

**ALT-001**: Global depth increase (max_depth=4 for all files)
- **Rejected**: Would explode token usage on flat files, violating CON-001

**ALT-002**: Two-pass AST processing (first pass detects containers, second pass re-scans)
- **Rejected**: Too complex, doubles processing time, violates simplicity principle

**ALT-003**: Prompt-only solution - guide agent to read full source code for containers (Option B)
- **Rejected for primary strategy** because:
  1. Higher token usage (full source text vs compressed AST)
  2. Agent must parse structure from unstructured text
  3. Violates IRIS principle: "Provide structured metadata, don't make agent infer it"
  4. Less efficient tool calling (must read entire container instead of surgical calls)
  5. AST should be the "Table of Contents" - if it doesn't show structure, we've failed
- **Why Option A (AST-First) is better:**
  ```
  Option A (Chosen): Enhanced AST shows nested declarations
  - Agent sees: createSeatCushion [34, 55], createBackrest [57, 120]
  - Behavior: Groups functions naturally from metadata
  - Tokens: ~10-20 per nested function (compressed)
  
  Option B (Rejected): Prompt tells agent to read full source
  - Agent sees: createManualWheelchair [31, 919] extra_children_count: 150
  - Behavior: Calls refer_to_source_code(31, 919), parses manually
  - Tokens: ~500-1000 for entire container (uncompressed)
  ```

**ALT-004**: Add manual "depth_policy" parameter to API
- **Rejected**: Should be automatic based on file structure, not user-configurable

---

## 4. Dependencies

**DEP-001**: Tree-sitter Python bindings (already installed via `tree-sitter`)

**DEP-002**: Existing `ast_processor.py` module structure

**DEP-003**: Existing `prompts.py` system prompt templates

**DEP-004**: No new external dependencies required

---

## 5. Files

**FILE-001**: `backend/src/iris_agent/ast_processor.py`
- Primary implementation file for container detection logic
- Modify: `ShallowASTProcessor` class
- Add methods: `_count_nested_declarations()`, `_should_extend_depth()`
- Modify method: `_build_node()`

**FILE-002**: `backend/src/iris_agent/prompts.py`
- Add "PHASE 1.5" section to `TOOL_CALLING_SYSTEM_PROMPT`
- Update prompt documentation

**FILE-003**: `.github/copilot-instructions.md`
- Add container file handling guidance

**FILE-004**: `README.md`
- Add nested structure support example

---

## 6. Testing

Testing will be conducted separately after implementation. Key test scenarios identified:

- Nested function files (like wheelchair example)
- Class-based files with many methods
- IIFE module patterns
- React components with internal handlers
- Python classes with nested methods

---

## 7. Risks & Assumptions

**RISK-001**: Container detection heuristics may not work perfectly across all languages
- **Mitigation**: Use conservative thresholds (high false positive tolerance)

**RISK-002**: Extended depth scanning may increase token usage on some files
- **Mitigation**: Only extend depth for confirmed containers (extra_children_count > threshold)

**RISK-003**: Prompt changes may confuse agent on flat files
- **Mitigation**: Make container detection explicit ("IF container pattern THEN..." conditional logic)

**ASSUMPTION-001**: Tree-sitter node types are consistent across language parsers for container detection

**ASSUMPTION-002**: Helper function count > 3 is a reasonable container threshold

**ASSUMPTION-003**: Agent will correctly use `refer_to_source_code()` when prompted for container analysis

---

## 8. Related Specifications / Further Reading

- [IRIS Philosophy](../docs/philosophy.md) - Core principles (Ecosystem Principle, Scatter Rule)
- [Single-Stage Tool Calling Spec](../backend/specs/single_stage_tool_calling_spec.md) - Agent architecture
- [AST Fix Spec](../backend/specs/ast_fix_spec.md) - Previous AST processor improvements
- [Shallow AST Debugger Spec](../backend/specs/debugger_implementation.md) - Debugging tools for AST verification

---

*End of Implementation Plan*