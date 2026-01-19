# IRIS Code Representation Redesign: Signature Graph

## Problem Statement

### The Nested Structure Problem

IRIS currently fails on files with **nested structure** (single large container with internal logic), producing a single monolithic responsibility block instead of extracting internal subsystems. This breaks the core IRIS philosophy on a large class of real-world files.

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

**Current Behavior:**
- Agent sees ONE responsibility block: "Wheelchair Model Generator" [lines 31-919, almost the entire file]
- All 11 helper functions hidden due to Shallow AST depth limit (max_depth=2)
- Shallow AST collapses nested functions into `extra_children_count: 11` - a black box

**Expected Behavior:**
- Agent extracts 4-5 responsibility blocks:
  - "Seat Component Generator" (createSeatCushion, createSeatrest, ...)
  - "Wheel Assembly System" (createBackWheel, createFrontWheel, ...)
  - "Structural Framework" (createBackrestStructure, createLegrestStructure, ...)
  - "Final Assembly Orchestrator" (main createManualWheelchair logic)

### Why Shallow AST Fails

**The Depth Limit Problem:**
- Shallow AST uses `max_depth=2` to reduce token count
- Level 0: File root
- Level 1: Top-level declarations (classes, functions, vars)
- Level 2: Function parameters, return types, immediate children
- **Level 3+: COLLAPSED** to line_range only

**Impact on Nested Architectures:**
When code uses factory functions, class methods, or IIFE patterns where the "real work" happens 3+ levels deep, the agent only sees:
```json
{
  "type": "function_declaration",
  "name": "createManualWheelchair", 
  "line_range": [31, 919],
  "extra_children_count": 11,  // <-- Black box! No visibility into helpers
  "leading_comment": "Creates wheelchair model"
}
```

**The Philosophical Contradiction:**
- **IRIS Philosophy**: "Extract logical ecosystems regardless of physical scatter"
- **Reality**: The agent CAN'T extract what it CAN'T SEE
- **Current Workaround**: Agent must call `refer_to_source_code(31, 919)` to read 900 lines just to discover the 11 helper functions - defeating the entire purpose of Shallow AST

### Affected Code Patterns (Large Scale)

This affects a HUGE class of real-world code:
- React components with nested hooks/handlers
- Class-based OOP with methods containing helper functions
- Factory pattern implementations
- IIFE module patterns (very common in older JS)
- Nested closure architectures
- Test suites with nested describe/it blocks
- Any file where main logic is encapsulated in container functions

---

## Solution: Signature Graph with Hierarchy Metadata

### Core Concept

Replace Shallow AST with a **flat, signature-based representation** that exposes ALL nested functions while preserving hierarchy context.

**Key Insight:**
> "Well-written code doesn't require full implementation for developers to understand."

We don't need AST tree structure. We need:
- **Signatures** (function names, params, return types)
- **Comments** (leading, trailing, inline)
- **Relationships** (what calls what, what's nested where)
- **NO depth limits** - extract everything

---

## What We Need to Build

### 1. Signature Extractor

Extract ALL named entities from source code, **regardless of nesting depth**:

**Entities to Extract:**
- **Functions**: name, signature (params + return type), line range
- **Classes**: name, methods, line range
- **Variables**: name, initializer type (if simple), line range
- **Imports/Exports**: what's being imported/exported

**Critical Requirement:**
- **No depth limit** - extract everything, even functions nested 5+ levels deep
- Signatures only - no implementation bodies

---

### 2. Comment Capture System

For each entity, capture **three types of comments**:

#### Leading Comment (Block Above)
Comment block(s) immediately preceding the entity:
```javascript
// This is a leading comment
// It can span multiple lines
function createSeatCushion() { ... }
```

#### Inline Comment (Same Line)
Comment on the same line as the entity declaration:
```javascript
function createBackWheel() { ... }  // Inline comment here
```

#### Trailing Comment (Block Below)
Comment block(s) immediately following the entity (rare but exists):
```javascript
function createSeatCushion() { ... }
// Trailing comment explaining something
// about the function above
```

#### Docstring (Bonus)
For languages that support it:
```python
def create_seat_cushion():
    """Docstring explaining the function."""
    pass
```

**Comment Extraction Rules:**
- Capture raw text (preserve formatting)
- Handle multi-line comment blocks
- Support both `//` and `/* */` styles
- Language-specific: Python `#`, JSDoc `/** */`, etc.

---

### 3. Hierarchy Metadata Tracker

For each entity, record:

**`id`**: Sequential unique identifier
- Format: `func_0`, `func_1`, `func_2`, ...
- Guarantees uniqueness even with duplicate names
- Enables unambiguous references in call graph

**`depth`**: Nesting level
- 0 = file-level (top-level declarations)
- 1 = nested once (inside a function/class)
- 2 = nested twice (inside a nested function)
- No limit on depth tracking

**`parent_id`**: Reference to containing entity
- `null` for file-level entities
- ID of parent function/class for nested entities

**`children_ids`**: Array of IDs for nested entities
- Empty array `[]` if no nested entities
- Enables top-down traversal of hierarchy

**`scope`**: Scope type
- `"module"` - file-level
- `"function"` - inside function body
- `"class"` - inside class definition
- `"block"` - inside code block (if, while, etc.)

---

### 4. Call Graph Builder

For each function entity, track what it calls:

**`calls`**: Array of entity IDs and external references

**Internal Calls** (to entities in same file):
```javascript
function createManualWheelchair() {
  createSeatCushion();  // ← Track this as call to func_1
  createBackWheel();    // ← Track this as call to func_2
}
```

**External Calls** (imports, library functions):
```javascript
function createSeatCushion() {
  CSG.cube();      // ← Track as external call
  translate();     // ← Track as external call (if imported)
}
```

**Call Graph Format:**
```json
{
  "calls": [
    "func_1",              // Internal entity reference
    "func_2",              // Internal entity reference
    "CSG.cube",            // External library call
    "externalLib.method"   // External import call
  ]
}
```

---

### 5. JSON Output Format

**Complete Entity Structure:**
```json
{
  "entities": [
    {
      "id": "func_0",
      "name": "functionName",
      "type": "function",
      "signature": "(param1: Type1, param2: Type2) => ReturnType",
      "line_range": [start, end],
      "depth": 0,
      "scope": "module",
      "parent_id": null,
      "children_ids": ["func_1", "func_2"],
      "calls": ["func_1", "externalLib.method"],
      "leading_comment": "// Comment block above function\n// Can be multi-line",
      "inline_comment": "// Comment on same line",
      "trailing_comment": "// Comment block below function",
      "docstring": "Docstring if applicable"
    },
    {
      "id": "func_1",
      "name": "nestedHelper",
      "type": "function",
      "signature": "(param: Type) => void",
      "line_range": [start, end],
      "depth": 1,
      "scope": "function",
      "parent_id": "func_0",
      "children_ids": [],
      "calls": ["CSG.cube", "translate"],
      "leading_comment": "// Helper function comment",
      "inline_comment": null,
      "trailing_comment": null,
      "docstring": null
    }
  ]
}
```

**Field Rules:**
- All fields required except comments (can be `null`)
- `children_ids` can be empty array `[]`
- `calls` can be empty array `[]` if function doesn't call anything
- `parent_id` is `null` only for depth-0 entities

---

### 6. Integration with IRIS Agent

**How Agent Uses Signature Graph:**

1. **Receives flat entity array** - easy to parse, no recursion needed
2. **Sees ALL functions** regardless of nesting depth
3. **Traverses hierarchy** via `parent_id`/`children_ids` when needed
4. **Understands relationships** via `calls` field
5. **Groups entities into Responsibility Blocks** based on:
   - Naming patterns (createSeat*, createWheel*)
   - Call relationships (functions that call each other)
   - Depth/scope context (parent-child groupings)
   - Comments (semantic hints about purpose)

**Example Agent Reasoning:**
```
Agent sees 12 entities:
- func_0: createManualWheelchair (depth=0, children_ids=[func_1...func_11])
- func_1: createSeatCushion (depth=1, parent=func_0, calls=[CSG.cube])
- func_2: createBackrest (depth=1, parent=func_0, calls=[CSG.cube])
- func_3: createSeatrest (depth=1, parent=func_0, calls=[CSG.cylinder])
- func_4: createBackWheel (depth=1, parent=func_0, calls=[createSpoke])
- func_5: createFrontWheel (depth=1, parent=func_0, calls=[CSG.sphere])
...

Agent groups by naming patterns:
- Seat Components: func_1, func_2, func_3
- Wheel Assembly: func_4, func_5
- Orchestration: func_0

Agent generates 3 Responsibility Blocks instead of 1 monolithic block!
```

---

## Pipeline Transformation

### Before (Current Shallow AST)
```
Raw Source Code 
  → Tree-sitter Parser 
  → Shallow AST Processor (depth=2, bodies collapsed)
  → IRIS Agent (struggles with nested structures)
  → Monolithic responsibility blocks
```

**Problems:**
- ❌ Nested functions invisible (collapsed to `extra_children_count`)
- ❌ Agent must call `refer_to_source_code()` for 900-line ranges
- ❌ Defeats purpose of abstraction layer
- ❌ Slow, token-heavy, unreliable

### After (New Signature Graph)
```
Raw Source Code
  → Signature Extractor (all entities, no depth limit)
  → Comment Capture (leading, inline, trailing)
  → Hierarchy Tracker (parent-child, depth, scope)
  → Call Graph Builder (internal + external calls)
  → Signature Graph JSON
  → IRIS Agent (sees everything, groups intelligently)
  → Precise responsibility blocks
```

**Benefits:**
- ✅ All nested functions visible
- ✅ No forced tool calls for discovery
- ✅ Lightweight (signatures only, no bodies)
- ✅ Preserves hierarchy context
- ✅ Enables intelligent grouping

---

## Success Criteria

We know this works when:

1. **Nested functions are visible**: Agent can see all 11 helpers inside `createManualWheelchair` without calling `refer_to_source_code()`

2. **Grouping works**: Agent correctly groups helpers into 3-4 responsibility blocks (not 1 monolithic block):
   - Seat Components (createSeatCushion, createSeatrest)
   - Wheel Assembly (createBackWheel, createFrontWheel)
   - Structural Framework (createBackrestStructure, createLegrestStructure)
   - Orchestration (main assembly logic)

3. **No forced tool calls**: Agent doesn't need to read 900 lines just to discover what's inside a parent function

4. **Hierarchy preserved**: Agent can still understand "these helpers are nested inside parent" via `parent_id` and `depth`

5. **Language agnostic**: Works for JavaScript, Python, TypeScript (initially)

6. **Comment preservation**: All three comment types (leading, inline, trailing) captured and accessible to agent

7. **Call graph works**: Agent can trace "createManualWheelchair calls createSeatCushion, which calls CSG.cube"

---

## Key Design Decisions

### ✅ Flat Structure with Hierarchy Metadata
- Flat array of entities (not nested JSON)
- Hierarchy preserved via `parent_id`, `children_ids`, `depth`
- Easier to parse, query, and group than nested trees

### ✅ Sequential IDs for Unambiguous References
- Format: `func_0`, `func_1`, `func_2`, ...
- Handles duplicate names across scopes
- Shortest possible reference (token-efficient)
- Stable for call graph references

### ✅ Include `calls` Field
- Enables call graph analysis
- Critical for understanding relationships
- Helps agent group by data flow

### ✅ Track `depth` for Scope Understanding
- Shows nesting level clearly
- Helps agent understand encapsulation
- Distinguishes file-level from nested entities

### ✅ No Depth Limit on Extraction
- Extract ALL entities regardless of nesting
- Solves the core problem directly
- No arbitrary cutoffs

### ✅ Signatures + Comments Only
- No implementation bodies
- Keeps representation lightweight
- Sufficient for intent understanding
- Agent can call `refer_to_source_code()` for specific functions if needed

### ✅ Three Comment Types
- Leading (block above)
- Inline (same line)
- Trailing (block below)
- Docstring (bonus for supported languages)

---

## Implementation Scope

**In Scope:**
- Build Signature Extractor (no depth limit)
- Build Comment Capture System (3 types)
- Build Hierarchy Tracker (id, depth, parent_id, children_ids, scope)
- Build Call Graph Builder (internal + external calls)
- Replace Shallow AST with Signature Graph in IRIS pipeline
- Test on nested structure files (createManualWheelchair.js)

**Out of Scope (for now):**
- Language-specific optimizations
- Advanced call graph analysis (transitive calls, cycle detection)
- Type inference for untyped languages
- Integration with existing Shallow AST (complete replacement)

---

*This document defines the architecture for replacing Shallow AST with Signature Graph to solve the nested structure problem in IRIS.*