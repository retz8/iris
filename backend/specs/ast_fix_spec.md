# Shallow AST Fix - Implementation Planning Document
---

TO COPILOT:
BEFORE OPENING TERMINAL, run `cd backend && source venv/bin/activate` 

## Executive Summary

This document outlines the implementation plan to fix five critical issues in the shallow AST generation system

### Root Cause Analysis

#### Issue 1: Inconsistent Line Range Data

**Root Cause:**
- Tree-sitter parser provides line/column information via node properties
- Current implementation only extracts line ranges for certain node types
- Generic node processing doesn't consistently capture positional data
- Conditional logic determines which nodes get line ranges vs null

**Impact:**
- 42% of integrity checks fail due to missing positional data
- Code navigation tools cannot function properly
- Error reporting lacks precise location information

**Why it happens:**
- Tree-sitter nodes have `.start_point` and `.end_point` properties (row, column)
- Some processing paths extract this data, others don't
- Likely a path-specific issue in the AST processor or parser module

---

#### Issue 2: Missing Import Details

**Root Cause:**
- Import statements are being processed generically
- Only structural information captured (type, source field exists)
- Actual import specifiers and source strings not extracted

**Impact:**
- Cannot determine what's being imported
- Cannot distinguish namespace imports from named imports
- Dependency analysis impossible from shallow AST alone

**Why it happens:**
- Import handling likely uses generic node processing
- Specific import clause details (namespace specifier, named imports) not extracted
- String literal values from source not being read

---

#### Issue 3: Variable Declaration Values Missing

**Root Cause:**
- Shallow AST intentionally collapses expression trees
- Variable initializers treated as "extra children" and counted but not expanded
- No differentiation between simple literals and complex expressions

**Impact:**
- Cannot see initialization patterns (constants, empty arrays, etc.)
- Cannot distinguish initialized vs uninitialized variables
- Reduced utility for code analysis

**Why it happens:**
- Design decision to reduce AST size
- Current implementation doesn't extract "shallow value" for simple cases
- No special handling for primitive/simple initializers

---

#### Issue 4: Function Parameter Details Hidden

**Root Cause:**
- Formal parameters treated as a single collapsed node
- Individual parameter identifiers not extracted
- Only parameter count available via `extra_children_count`

**Impact:**
- Function signatures incomplete
- Cannot generate function documentation from AST
- API analysis requires full AST

**Why it happens:**
- Parameters processed as generic node with children
- No special extraction of parameter names
- Collapsed to save space without preserving essential info

---

#### Issue 5: Inconsistent Comment Attribution

**Root Cause:**
- **Two separate comment sources:**
  1. Comment extractor - extracts comments from source text
  2. AST parser - generates comment nodes during tree parsing
- Comments appear both as node metadata AND as separate nodes
- No deduplication or source preference logic

**Impact:**
- Duplicate comments in output
- Inconsistent representation
- Increased AST size unnecessarily

**Why it happens:**
- Comment extractor runs independently and attaches to nodes
- Parser also creates comment nodes from tree-sitter
- No reconciliation between the two sources
- Both sources preserved in final output

---

## Architectural Overview

### Current Architecture

```
Source Code
    ↓
[Comment Extractor] ──→ Comments metadata
    ↓
[Tree-sitter Parser] ──→ Full AST + Comment nodes
    ↓
[AST Processor] ────────→ Shallow AST
    ↓              ↓
Comments metadata  Comment nodes
    ↓              ↓
[JSON Serializer] ──────→ Final AST JSON
                          (duplicates!)
```

### Target Architecture

```
Source Code
    ↓
[Comment Extractor] ──→ Comments metadata (KEEP)
    ↓
[Tree-sitter Parser] ──→ Full AST
    ↓
[AST Processor] ────────→ Shallow AST
  - Extract line ranges for ALL nodes
  - Extract import details specifically
  - Extract simple variable values
  - Extract parameter names
  - IGNORE parser comment nodes
  - PRESERVE extractor comments
    ↓
[JSON Serializer] ──────→ Final AST JSON
                          (clean, no duplicates)
```

### Key Architectural Changes

1. **Centralized Line Range Extraction**
   - Every node processing path must extract positional data
   - Create utility function: `extract_position_info(node)`
   - Mandatory for all node types, no exceptions

2. **Specialized Import Handler**
   - Create dedicated import statement processor
   - Extract import specifiers, source strings
   - Preserve import type (namespace, named, default)

3. **Simple Value Extraction**
   - Identify "simple" initializers (primitives, literals, empty collections)
   - Extract shallow representation
   - Still collapse complex expressions

4. **Parameter Name Extraction**
   - Extract parameter names from formal_parameters
   - Store as array of strings
   - Preserve parameter order

5. **Single Comment Source**
   - Use ONLY comment extractor output
   - Filter out tree-sitter comment nodes
   - Prevent duplication
---

## Detailed Implementation Plans

---

## ISSUE 1: Inconsistent Line Range Data

### Objective
Ensure every node in the shallow AST has accurate `line_range` data extracted from tree-sitter.

### Analysis

**Tree-sitter Position API:**
- Every node has `.start_point` → (row, column) tuple
- Every node has `.end_point` → (row, column) tuple
- Row is 0-indexed in tree-sitter, needs conversion to 1-indexed

**Current State:**
- Some nodes get line ranges extracted
- Others default to `null`
- Inconsistent behavior across node types

### Design

**Solution: Centralized Position Extraction**

Create a utility function that:
1. Accepts any tree-sitter node
2. Extracts start_point and end_point
3. Converts 0-indexed to 1-indexed line numbers
4. Returns `[start_line, end_line]` tuple
5. Never returns `null` (unless node is truly invalid)

**Call this function for every node processed**, regardless of type.

### Implementation Steps

#### Step 1: Create Position Extraction Utility

**Location:** `ast_processor.py` or new `ast_utils.py`

**Function Specification:**
- Name: `extract_line_range(node)`
- Input: Tree-sitter node object
- Output: `[start_line, end_line]` as list of integers
- Behavior:
  - Extract `node.start_point[0]` and `node.end_point[0]`
  - Add 1 to each (convert to 1-indexed)
  - Return as list
  - Handle edge cases (empty nodes, invalid nodes)

#### Step 2: Update Node Processing Functions

**In ast_processor.py:**

Identify all functions that create node dictionaries. Common patterns:
- `process_node(node)` - main generic processor
- `process_import_statement(node)` - specific handlers
- `process_function_declaration(node)` - specific handlers
- Any other node type handlers

**For each function:**
1. Add call to `extract_line_range(node)` at the beginning
2. Store result in `line_range` field of output dictionary
3. Ensure this happens BEFORE any conditional logic that might skip it

#### Step 3: Verify Generic Node Handler

**In parser module:**

The generic node processing path must:
1. Call position extraction for every node
2. Not have conditional logic that skips position extraction
3. Apply to all node types without exception

#### Step 4: Update Node Dictionary Constructor

If there's a central function that creates node dictionaries:
1. Make `line_range` a required parameter (not optional)
2. This forces all callers to provide it
3. Makes it impossible to forget

### Affected Files

**Primary:**
- `ast_processor.py` - Main implementation
- `parser.py` or parser module - Generic node handling
---

## ISSUE 2: Missing Import Details

### Objective
Extract and expose import statement details: what's being imported, import type, and source path.

### Analysis

**JavaScript Import Types:**
```
1. Namespace import: import * as name from "source"
2. Named import: import { a, b } from "source"
3. Default import: import name from "source"
4. Mixed: import name, { a, b } from "source"
5. Side-effect: import "source"
```

**Current State:**
- Only captures that it's an import_statement
- Only captures that a source exists (as a field)
- Does not extract:
  - Namespace identifier
  - Named import identifiers
  - Default import identifier
  - Source string value

### Design

**Target Structure:**

```
import_statement node should include:
{
  "type": "import_statement",
  "line_range": [1, 1],
  "import_details": {
    "import_type": "namespace" | "named" | "default" | "mixed" | "side_effect",
    "namespace_import": "THREE" | null,
    "default_import": "name" | null,
    "named_imports": ["PLYLoader", "OBJExporter"] | null,
    "source": "three" | "./module.js" | etc.
  },
  "fields": { ... },
  "children": [ ... ]
}
```

This preserves all existing structure while adding semantic details.

### Implementation Steps

#### Step 1: Create Import Details Extractor

**Location:** `ast_processor.py` or new `import_handler.py`

**Function Specification:**
- Name: `extract_import_details(import_node)`
- Input: Tree-sitter import_statement node
- Output: Dictionary with import details

**Logic Flow:**
1. Extract source string from string literal node
2. Check for namespace_import clause (has star and identifier)
3. Check for default import (identifier in import_clause)
4. Check for named_imports clause (has named_imports)
5. Determine import_type based on what's present
6. Return structured details dictionary

#### Step 2: Tree-sitter Query Patterns

**In parser module:**

Use tree-sitter queries or node navigation to find:

**For namespace import:**
- Navigate to import_clause → namespace_import → identifier
- Extract identifier text

**For named imports:**
- Navigate to import_clause → named_imports
- Iterate over import_specifier children
- Extract each identifier text

**For default import:**
- Navigate to import_clause → identifier (not in named_imports)
- Extract identifier text

**For source:**
- Navigate to source field → string node
- Extract string text (remove quotes)

#### Step 3: Integrate into Node Processing

**In ast_processor.py:**

When processing import_statement nodes:
1. Call `extract_import_details(node)`
2. Add result to node dictionary as `import_details` field
3. Preserve existing fields and children
4. Ensure line_range is also extracted

#### Step 4: Handle Edge Cases

- Multiple named imports (list)
- Mixed default + named imports
- Import with only side effects (no imports)
- String sources with various quote types
- Relative vs absolute paths

### Affected Files

**Primary:**
- `ast_processor.py` - Main processing logic
- `parser.py` or parser module - Tree-sitter navigation

**New Files (optional):**
- `import_handler.py` - Dedicated import processing

---

## ISSUE 3: Variable Declaration Values Missing

### Objective
Extract simple variable initializer values while still collapsing complex expressions.

### Analysis

**Variable Initializer Types:**

**Simple (should extract):**
- Primitives: `true`, `false`, `null`, `undefined`
- Numbers: `42`, `3.14`, `0`
- Strings: `"manual"`, `'test'`
- Empty collections: `[]`, `{}`
- Simple identifiers: `undefined` (but not function calls)

**Complex (should collapse):**
- Function calls: `new THREE.Vector3()`
- Object literals with properties: `{ a: 1, b: 2 }`
- Array literals with elements: `[1, 2, 3]`
- Binary expressions: `10 + 20`
- Complex expressions: `anth.SEATWIDTH`

**Current State:**
- All initializers collapsed to `extra_children_count`
- No differentiation between simple and complex

### Design

**Target Structure:**

```
variable_declarator node should include:
{
  "type": "variable_declarator",
  "name": "wheelchairType",
  "line_range": [59, 59],
  "simple_value": "manual",  // NEW: for simple initializers
  "value_type": "string",    // NEW: type hint
  "extra_children_count": 2  // EXISTING: for complex or as backup
}

OR for complex:

{
  "type": "variable_declarator",
  "name": "anth",
  "line_range": [79, 293],
  "simple_value": null,      // No simple value
  "value_type": "object_expression",  // What it is
  "extra_children_count": 2
}
```

### Implementation Steps

#### Step 1: Create Simple Value Detector

**Location:** `ast_processor.py`

**Function Specification:**
- Name: `detect_simple_value(initializer_node)`
- Input: Tree-sitter node (the initializer/value)
- Output: Dictionary `{ "is_simple": bool, "value": any, "type": str }`

**Logic:**
1. Check node type
2. If simple type (see list below), extract text/value
3. Return is_simple=True with value
4. Otherwise return is_simple=False

**Simple Node Types:**
- `true` → boolean true
- `false` → boolean false
- `null` → null
- `undefined` → undefined
- `number` → parse number
- `string` → extract string (with quotes removed)
- `array` with no children → empty array
- `object` with no properties → empty object

#### Step 2: Create Value Extractor

**Location:** `ast_processor.py`

**Function Specification:**
- Name: `extract_simple_value(node)`
- Input: Simple-valued node
- Output: Python primitive (str, int, float, bool, None, list, dict)

**By Node Type:**
- `true` → return Python `True`
- `false` → return Python `False`
- `null` → return Python `None`
- `number` → parse and return int or float
- `string` → extract text, remove quotes, return string
- `array` (empty) → return empty list `[]`
- `object` (empty) → return empty dict `{}`

#### Step 3: Integrate into Variable Declarator Processing

**In ast_processor.py:**

When processing variable_declarator nodes:
1. Get the initializer child node (if exists)
2. Call `detect_simple_value(initializer)`
3. If simple:
   - Extract value with `extract_simple_value(initializer)`
   - Add to node dict as `simple_value`
   - Add type hint as `value_type`
4. If not simple:
   - Set `simple_value` to `null`
   - Set `value_type` to node type name
5. Always include `extra_children_count` as backup

#### Step 4: Handle Uninitialized Variables

For variables without initializers:
- `simple_value`: `null`
- `value_type`: `"uninitialized"`
- `extra_children_count`: appropriate count

### Affected Files

**Primary:**
- `ast_processor.py` - Main implementation
---

## ISSUE 4: Function Parameter Details Hidden

### Objective
Extract and expose function parameter names from formal_parameters nodes.

### Analysis

**Parameter Patterns:**

```
// Simple
function foo(a, b, c)

// With defaults
function foo(a, b = 10, c = "test")

// Destructuring
function foo({ x, y }, arr)

// Rest parameters
function foo(a, ...rest)
```

**Current State:**
- `formal_parameters` collapsed to single node
- Only `extra_children_count` available
- Parameter names not accessible

### Design

**Target Structure:**

```
formal_parameters node should include:
{
  "type": "formal_parameters",
  "line_range": [475, 481],
  "parameters": [  // NEW: extracted parameter info
    {
      "name": "humanModelFile",
      "type": "identifier",
      "has_default": false
    },
    {
      "name": "humanPosX", 
      "type": "identifier",
      "has_default": false
    },
    {
      "name": "callback",
      "type": "identifier", 
      "has_default": false
    }
  ],
  "parameter_count": 5,  // NEW: explicit count
  "extra_children_count": 5  // EXISTING: preserved
}
```

**For Complex Parameters:**

```
{
  "name": "{ x, y }",  // Stringified representation
  "type": "object_pattern",
  "has_default": false
}
```

### Implementation Steps

#### Step 1: Create Parameter Extractor

**Location:** `ast_processor.py` or new `function_handler.py`

**Function Specification:**
- Name: `extract_parameters(formal_parameters_node)`
- Input: Tree-sitter formal_parameters node
- Output: List of parameter info dictionaries

**Logic:**
1. Iterate over children of formal_parameters
2. For each child (parameter):
   - Identify parameter type (identifier, pattern, rest)
   - Extract name/representation
   - Check for default value
   - Create parameter info dict
3. Return list of all parameters

#### Step 2: Handle Parameter Types

**Simple Identifier:**
- Extract identifier text directly
- Type: "identifier"
- No default (or check for optional_parameter)

**With Default:**
- Node type: `optional_parameter` or `assignment_pattern`
- Extract identifier from left side
- Has_default: true

**Destructuring Pattern:**
- Object pattern: `{ x, y }`
- Array pattern: `[a, b]`
- Extract stringified representation
- Type: "object_pattern" or "array_pattern"

**Rest Parameter:**
- Node type: `rest_pattern`
- Extract identifier after `...`
- Type: "rest_parameter"

#### Step 3: Integrate into Function Processing

**In ast_processor.py:**

When processing function_declaration or function nodes:
1. Find formal_parameters child
2. Call `extract_parameters(formal_parameters_node)`
3. Add result to formal_parameters node dict
4. Add `parameter_count` field
5. Preserve `extra_children_count`

#### Step 4: Handle Arrow Functions

Arrow functions also have parameters:
- Single parameter without parens: `x => x * 2`
- Multiple parameters: `(x, y) => x + y`

Ensure parameter extraction works for:
- `arrow_function` nodes
- Both parenthesized and non-parenthesized parameters

### Affected Files

**Primary:**
- `ast_processor.py` - Main implementation

**New Files (optional):**
- `function_handler.py` - Dedicated function processing


---

## ISSUE 5: Inconsistent Comment Attribution

### Objective
Use only comment extractor output, remove duplicate comments from tree-sitter parser.

### Analysis

**Two Comment Sources:**

**Source 1: Comment Extractor** (KEEP)
- Standalone module that parses source text
- Extracts comments with context
- Attaches as metadata: `leading_comment`, `trailing_comment`
- Provides rich comment information

**Source 2: Tree-sitter Parser** (REMOVE)
- Tree-sitter includes comment nodes in AST
- Type: `comment`
- Contains comment text
- Creates duplicate representation

**Current Behavior:**
- Both sources preserved
- Same comment appears twice:
  1. As metadata on associated node
  2. As separate comment node

### Design

**Single Source Strategy:**

```
Comment Extractor → Attach to nodes → Final AST
                                       ✓ Comments as metadata
                                       ✗ No comment nodes

Tree-sitter Parser → Filter out → NOT in final AST
```

**Why Keep Extractor, Remove Parser Comments:**
- Extractor provides context (leading vs trailing)
- Extractor associates comments with relevant nodes
- Extractor is intentional, configurable
- Parser comments are generic, less useful

### Implementation Steps

#### Step 1: Identify Comment Node Creation

**In parser module:**

Find where comment nodes are being created and added to AST:
- During tree-sitter traversal
- When processing generic nodes
- In node type dispatch

**Likely location:**
- Generic node processor checks node type
- If type is `comment`, creates comment node
- Adds to children or top-level

#### Step 2: Filter Comment Nodes

**In ast_processor.py:**

**Option A: Filter During Processing**
- In node processing loop
- Skip nodes where `node.type == "comment"`
- Don't create node dict for comments
- Don't add to children lists

**Option B: Filter as Post-Process**
- Process all nodes normally
- After AST built, recursively filter
- Remove all nodes with `type: "comment"`
- Clean children arrays

**Recommendation:** Option A (filter during processing)
- More efficient
- Prevents unnecessary processing
- Cleaner implementation

#### Step 3: Preserve Extractor Comments

**Ensure comment extractor still runs:**
- Comment extractor should run before/during parsing
- Attach leading_comment and trailing_comment to nodes
- These metadata fields preserved in all nodes
- No changes needed to extractor

#### Step 4: Update Node Processing

**In ast_processor.py:**

**Node processing function:**
1. Check if node type is `comment`
2. If yes, return None or skip (don't create node dict)
3. If no, process normally
4. When building children lists, filter out None/skipped entries

**Children processing:**
1. Iterate over child nodes
2. Process each child
3. If child is comment, skip
4. Add non-comment children to list

#### Step 5: Validate No Comment Loss

**Ensure legitimate comments preserved:**
- Check that extractor comments still attached
- Verify leading_comment and trailing_comment fields populated
- No comments lost, just duplicates removed

### Affected Files

**Primary:**
- `ast_processor.py` - Node filtering logic
- `parser.py` or parser module - Node dispatch

---

## File Modification Matrix

### Files and Changes Summary

| File | Issue 1 | Issue 2 | Issue 3 | Issue 4 | Issue 5 | Priority |
|------|---------|---------|---------|---------|---------|----------|
| `ast_processor.py` | ✓✓✓ | ✓✓✓ | ✓✓✓ | ✓✓✓ | ✓✓✓ | **CRITICAL** |
| `parser.py` / parser module | ✓✓ | ✓✓ | ✓ | ✓ | ✓✓ | **HIGH** |
| `ast_utils.py` (new) | ✓✓✓ | ✓ | ✓ | - | - | **MEDIUM** |
| `import_handler.py` (new, optional) | - | ✓✓✓ | - | - | - | **OPTIONAL** |
| `function_handler.py` (new, optional) | - | - | - | ✓✓✓ | - | **OPTIONAL** |
| Comment extractor | - | - | - | - | ✓ | **LOW** |
| Test files | ✓ | ✓ | ✓ | ✓ | ✓ | **HIGH** |
| Documentation | ✓ | ✓ | ✓ | ✓ | ✓ | **MEDIUM** |

Legend: ✓ = Minor changes, ✓✓ = Moderate changes, ✓✓✓ = Major changes

### Detailed File Modifications

#### `ast_processor.py` (CRITICAL - Most changes)

**Modifications:**

1. **Issue 1 - Line Ranges:**
   - Add `extract_line_range(node)` utility function
   - Update all node processing to call it
   - Ensure every node dict has `line_range` field

2. **Issue 2 - Import Details:**
   - Add `extract_import_details(node)` function
   - Update import_statement processor
   - Add import_details to node dict

3. **Issue 3 - Variable Values:**
   - Add `detect_simple_value(node)` function
   - Add `extract_simple_value(node)` function
   - Update variable_declarator processor
   - Add simple_value and value_type fields

4. **Issue 4 - Parameters:**
   - Add `extract_parameters(node)` function
   - Update formal_parameters processor
   - Add parameters list and parameter_count fields

5. **Issue 5 - Comments:**
   - Add comment node filtering
   - Skip nodes with type == "comment"
   - Filter from children lists

**Estimated Changes:** 200-300 lines added/modified

---

#### `parser.py` / Parser Module (HIGH)

**Modifications:**

1. **Issue 1 - Line Ranges:**
   - Ensure generic node handler calls position extraction
   - Remove conditional logic that skips line ranges
   - Make position extraction mandatory

2. **Issue 2 - Import Details:**
   - Add tree-sitter navigation for import components
   - Query for namespace_import, named_imports
   - Extract source string values

3. **Issue 5 - Comments:**
   - Filter comment nodes during traversal
   - Don't dispatch comment nodes to processor
   - Keep extractor comments untouched

**Estimated Changes:** 100-150 lines modified

---

#### `ast_utils.py` (NEW - MEDIUM)

**Purpose:** Shared utility functions

**Contents:**

1. **Line Range Utilities:**
   - `extract_line_range(node)` - position extraction
   - `convert_to_one_indexed(row)` - index conversion
   - `validate_line_range(line_range)` - validation

2. **Value Type Detection:**
   - `is_simple_value(node)` - simple value detection
   - `get_node_type_category(node)` - categorization

3. **String Utilities:**
   - `extract_string_value(node)` - remove quotes
   - `stringify_node(node)` - for complex patterns

**Estimated Lines:** 100-150 lines

---

#### `import_handler.py` (OPTIONAL - NEW)

**Purpose:** Dedicated import processing (alternative to putting in ast_processor)

**Contents:**

1. `extract_import_details(node)` - main function
2. `extract_namespace_import(clause)` - namespace handling
3. `extract_named_imports(clause)` - named imports list
4. `extract_default_import(clause)` - default import
5. `extract_source_string(node)` - source path
6. `determine_import_type(details)` - classification

**Estimated Lines:** 150-200 lines

---

#### `function_handler.py` (OPTIONAL - NEW)

**Purpose:** Dedicated function processing (alternative to putting in ast_processor)

**Contents:**

1. `extract_parameters(formal_params)` - main function
2. `extract_identifier_parameter(node)` - simple params
3. `extract_pattern_parameter(node)` - destructuring
4. `extract_rest_parameter(node)` - rest params
5. `check_has_default(node)` - default detection

**Estimated Lines:** 150-200 lines

---

