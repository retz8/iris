# IRIS MVP Instructions
**Project Reset: January 11, 2026**

---

## 1. What is IRIS?

IRIS is a code comprehension tool that provides **semantic context** for unfamiliar source code.

When developers open a file in a repository, they typically already understand the project's overall purpose (from README, documentation, etc.). However, they lack context about **the specific file** they're looking at.

IRIS solves this by providing:
- **WHY**: Why does this file exist? (File Intent)
- **WHAT**: What are the major logical components? (Responsibility Blocks)

This context is presented **before** the developer reads the code, similar to seeing a presentation's table of contents before diving into details.

**Design Philosophy:**
> IRIS does not explain code.  
> IRIS prepares the developer to read code.

---

## 2. MVP Goal

Validate whether showing high-level semantic context (WHY + WHAT) can significantly reduce cognitive load when reading unfamiliar code.

**Success Criteria:**
- A developer can explain what a file does without reading all the code
- A developer can identify which parts are most important
- A developer feels more confident choosing where to start reading

**Explicit Non-Goals:**
- Execution flow analysis
- Variable tracking
- Line-by-line code summarization
- Handling all edge cases or languages

---

## 3. File Intent

### Definition

File Intent answers the question: **"Why does this file exist in the system?"**

It should:
- Describe the file's **conceptual role** at an architectural level
- Be readable in under 5 seconds
- Consist of 1-4 short lines
- Focus on purpose, not implementation details

### Examples

#### Good File Intents:

```
File: UserAuthService.ts
Intent: "User authentication and session lifecycle management"
```

```
File: MenuList.tsx
Intent: "Menu list data orchestration and view state management for pocha display"
```

```
File: useDashboardOrders.ts
Intent: "Real-time order state management and filtered view generation for pocha dashboard"
```

#### Bad File Intents (too implementation-focused):

```
❌ "Implements React hooks for fetching data"
❌ "Contains helper functions for API calls"
❌ "Uses SWR for caching"
```

---

## 4. Responsibility Blocks

### Definition

A **Responsibility Block** represents a distinct conceptual role the file plays in the system.

**CRITICAL:** A Responsibility Block is NOT just a group of functions.

It is a **complete ecosystem** of code elements needed to fulfill that responsibility:
- Functions (execution logic)
- Constants (configuration values)
- State/Variables (runtime data)
- Types (data structures)
- Imports (external dependencies)

**Mental Model:**  
> If you were to extract this responsibility into a separate file,  
> what would you need to take with you?

### Characteristics

- **3-6 responsibilities per file** (avoid fragmentation)
- **Can be scattered** across the file (not necessarily contiguous)
- **Self-contained**: Each block should be understandable independently
- **Peers, not hierarchical**: Responsibilities are at the same conceptual level

### Example

```typescript
// Source: useDashboardOrders.ts

// Responsibility: "Order Data Initialization"
{
  "id": "order-data-initialization",
  "label": "Order Data Initialization",
  "description": "Fetches order data from API and transforms it into Map structure for efficient lookup",
  "elements": {
    "functions": ["usePochaOrdersMap", "convertOrdersToMap"],
    "state": ["ordersMap", "status"],
    "imports": [
      "getPochaOrders from @/apis/pocha/queries",
      "useState, useEffect from react"
    ],
    "types": ["Map<number, OrderItem>", "Orders"],
    "constants": []
  },
  "ranges": [[14, 21], [42, 59]]  // Scattered across lines
}

// Responsibility: "Filtered View Generation"
{
  "id": "filtered-view-generation",
  "label": "Filtered View Generation",
  "description": "Splits orders into immediate-prep and normal-prep views based on menu configuration",
  "elements": {
    "functions": ["filterOrdersByStatus"],
    "state": ["immediatePrepOrders", "notImmediatePrepOrders"],
    "imports": ["useMemo from react"],
    "types": ["Orders"],
    "constants": ["statuses array (lines 28-32)"]
  },
  "ranges": [[23, 40], [95, 103]]  // Also scattered
}
```

### Why This Matters

When refactoring or understanding dependencies:
- **Wrong approach**: "This function does X, that function does Y"
- **Right approach**: "This responsibility requires these 5 functions, these 2 state variables, these 3 imports"

---

## 5. Agent Architecture: AST + Tool-Based Approach

### Core Idea

Instead of feeding the entire source code to an LLM, we use a **two-stage approach**:

1. **Preprocessing (free)**: Convert code to shallow AST with line references
2. **Agent reasoning (paid)**: Agent uses shallow AST + selective source code access

### Why AST?

**Hypothesis:**  
> If code has good comments, clear function names, and proper variable names,  
> we can extract File Intent and Responsibility Blocks from structure alone (AST).

**Reality:**  
Code quality exists on a spectrum:

```
Clean Code ────────────────────── Dirty Code
     ↓                                  ↓
AST sufficient                   Need implementations
(100 tokens)                     (2000 tokens)
```

### Shallow AST Processing

**Key Concept:** We don't reconstruct or transform the AST. We make it **shallow**.

**Process:**
1. Parse code into full AST (using existing Python AST parser)
2. Keep the **first-level body declarations** (imports, functions, classes, etc.)
3. Replace **nested body content** with line references
4. Add **comment information** to each node

**Example Transformation:**

```javascript
// Original Full AST
{
  "type": "FunctionDeclaration",
  "start": 550,
  "end": 780,
  "id": { "name": "calculateOrderTotal" },
  "params": [...],
  "body": {
    "type": "BlockStatement",
    "body": [
      // Deeply nested structure with all implementation details
      {...}, {...}, {...}
    ]
  }
}

// Shallow Processed AST
{
  "type": "FunctionDeclaration",
  "start": 550,
  "end": 780,
  "id": { "name": "calculateOrderTotal" },
  "params": [...],
  "line_range": [15, 28],              // ← Body replaced with line reference
  "leading_comment": "// Calculate total including tax and discounts",
  "trailing_comment": null,
  "inline_comment": null
}
```

### Comment Extraction

For each AST node, we extract three types of comments from the source code:

1. **Leading comment**: Comment block immediately before the declaration
2. **Trailing comment**: Comment after the declaration on the same line
3. **Inline comment**: Comment inside but on first line of declaration

**Example:**

```typescript
// This handles user authentication
// Validates credentials against database
function loginUser(username, password) {  // Entry point for login flow
  // Implementation...
}
```

```json
{
  "type": "FunctionDeclaration",
  "id": { "name": "loginUser" },
  "line_range": [3, 5],
  "leading_comment": "// This handles user authentication\n// Validates credentials against database",
  "trailing_comment": "// Entry point for login flow",
  "inline_comment": null
}
```

### The Tool: `refer_to_source_code`

The agent receives:
- **Input**: Shallow processed AST (structure + comments, no implementations)
- **Tool**: `refer_to_source_code(start_line, end_line)`

The agent decides:
- "Function name `validateUser` + leading comment is clear" → No tool call needed
- "Function name `process` with no comment" → Call tool to read implementation

### Shallow AST Structure

The processed AST maintains the original structure but with replacements:

```json
{
  "type": "Program",
  "body": [
    {
      "type": "ImportDeclaration",
      "start": 0,
      "end": 45,
      "source": { "value": "@/apis/orders" },
      "specifiers": [...],
      "leading_comment": null
    },
    {
      "type": "FunctionDeclaration",
      "start": 100,
      "end": 250,
      "id": { "name": "fetchOrders" },
      "params": [...],
      "line_range": [10, 18],           // ← Instead of full body
      "leading_comment": "// Fetches active orders from API",
      "trailing_comment": null
    },
    {
      "type": "VariableDeclaration",
      "start": 300,
      "end": 450,
      "declarations": [
        {
          "id": { "name": "orderCache" },
          "line_range": [25, 35],       // ← Instead of init value
          "leading_comment": "// Cache for reducing API calls"
        }
      ]
    }
  ]
}
```

**Key Points:**
- Original AST structure is preserved
- Easy to navigate (type, id, params, etc.)
- Only the **nested body/implementation** is replaced with line_range
- Comments provide semantic hints without reading code

### Benefits

**Token Efficiency:**
- Clean code: Shallow AST only (~500 tokens) → 94% reduction
- Dirty code: Shallow AST + selective reads (~1500 tokens) → 81% reduction

**Adaptive Processing:**
- Agent learns which patterns need implementation details
- No wasted tokens on obvious code
- Comments guide when to skip tool calls

**Natural Scatter Detection:**
- Agent can trace references across nodes
- Groups scattered code into cohesive responsibilities
- Line ranges make it easy to identify code location

---

## 6. Implementation Steps

### Phase 1: AST Processing (Backend)

1. **existing AST parser** (`backend/src/iris_agent/ast_parser.py`)
   - Already implemented with Python AST parser module (`backend/src/parser`)

2. **Build shallow AST processor** (`backend/src/iris_agent/ast_processor.py`)
   - **Keep first-level body declarations** (don't remove anything)
   - **Replace nested body content** with line_range references
   - Traverse AST and identify nodes with nested bodies
   - Calculate line numbers from start/end positions

3. **Build comment extractor** (`backend/src/iris_agent/comment_extractor.py`)
   - Parse source code for comments
   - Associate comments with AST nodes:
     - Leading: Comment block immediately before node
     - Trailing: Comment on same line after node
     - Inline: Comment inside node on first line
   - Attach comment info to each processed AST node

4. **Create source code storage** (`backend/src/iris_agent/source_store.py`)
   - Store original source indexed by line numbers
   - Provide fast line range retrieval for tool
   - Cache by file hash

### Phase 2: Agent System (Backend)

4. **Define tool interface** (`backend/src/iris_agent/tools/source_reader.py`)
   - Tool: `refer_to_source_code(start_line, end_line, reason)`
   - Return: Raw source code for specified range
   - Log: Track which parts agent needed to read

5. **Build agent orchestrator** (`backend/src/iris_agent/agent.py`)
   - Input: Processed AST + filename
   - Output: File Intent + Responsibility Blocks
   - Use LangChain or similar for tool calling
   - Model: gpt-4o-mini (cost efficiency)

6. **Design prompt template** (`backend/src/iris_agent/prompts/iris.py`)
   - System prompt: Explain task, tool usage rules
   - Input format: How to interpret processed AST
   - Output format: Structured JSON schema
   - Examples: Show good vs bad responsibility blocks

### Phase 3: API Integration (Backend)

7. **Create API endpoint** (`backend/src/iris_agent/routes.py`)
   - `POST /api/iris/analyze`
   - Request: `{ filename, source_code }`
   - Response: `{ file_intent, responsibilities, metadata }`
   - Error handling for parsing failures, LLM errors

8. **Add caching layer** (`backend/src/iris_agent/cache.py`)
   - Cache key: `file_hash + model_version`
   - Store: Analysis results
   - Invalidation: On file change

### Phase 4: Frontend Integration (Extension)

9. **Build UI components** (`extension/src/components/iris/`)
   - FileIntent display (sticky header)
   - ResponsibilityList (collapsible blocks)
   - CodeHighlighter (range highlighting)

10. **Implement bidirectional interaction** (`extension/content.js`)
    - Hover responsibility → highlight code ranges
    - Hover code → show related responsibility
    - Click responsibility → scroll to first range

### Phase 5: Testing & Validation

11. **Test with real codebases**
    - Clean code (well-commented)
    - Mid-quality code (partial comments)
    - Dirty code (no comments, unclear names)

12. **Measure metrics**
    - Token usage per file
    - Tool call frequency
    - Analysis accuracy (manual validation)
    - Latency (end-to-end time)

---

## 7. Development Guidelines

### Code Organization

**Backend:**
- **Isolated module**: All new code goes in `backend/src/iris_agent/`
- **Existing code**: Everything else (`exp_single_llm/`, `exp_multi_agents/`) is experimental
- **Do NOT refactor** existing experimental code
- **Do NOT modify** existing endpoints unless necessary

**Frontend:**
- **Extension directory**: `extension/`
- **Create new components**: Don't modify existing structure unnecessarily

### Project Structure

```
backend/
├── src/
│   ├── iris_agent/          # ← NEW: All MVP code here
│   │   ├── __init__.py
│   │   ├── ast_processor.py
│   │   ├── source_store.py
│   │   ├── agent.py
│   │   ├── routes.py
│   │   ├── cache.py
│   │   ├── tools/
│   │   │   └── source_reader.py
│   │   └── prompts/
│   │       └── iris.py
│   ├── exp_single_llm/      # Old experiments (ignore)
│   └── exp_multi_agents/    # Old experiments (ignore)

extension/
├── src/
│   ├── components/
│   │   └── iris/            # ← NEW: IRIS UI components
│   └── content.js           # Modify to integrate IRIS
```

### Development Constraints

- **Remote development**: VS Code tunnel
- **Limited network**: Keep dependencies minimal
- **Simple architecture**: Avoid over-engineering
- **Fast iteration**: Prioritize working prototype over perfect code

### Key Principles

1. **Measure everything**: Track token usage, tool calls, latency
2. **Test with real code**: Not just clean examples
3. **Document decisions**: Why did agent need to read implementation?
4. **Iterate based on data**: Let metrics guide next steps

---

**Remember:**  
> The goal is NOT perfect accuracy.  
> The goal is to validate whether this approach reduces cognitive load.

