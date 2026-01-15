# Copilot Instruction for Iris Project

## 0. Rules for Copilot when assisting with the Iris project.
1. Don't generate ".MD" files. Don't generate tests files. Until explicitly asked.
2. Do not make use of any new libraries, platforms, or packages unless I explicitly tell you to.
3. Fast iteration: Prioritize working prototype over perfect code
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
2. **Agent reasoning (paid)**: Agent uses shallow AST + selective source code access tool

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
```

**Key Points:**
- Original AST structure is preserved
- Easy to navigate (type, id, params, etc.)
- Only the **nested body/implementation** is replaced with line_range
- Comments provide semantic hints without reading code

---

## 6. Development Guidelines
### Project Structure

```
backend/
├── src/
│   ├── iris_agent/
|   |   ├── specs: documents decribing the plan for implementations  
│   │   ├── __init__.py
│   │   ├── ast_processor.py
│   │   ├── source_store.py
│   │   ├── agent.py
│   │   ├── routes.py
│   │   ├── cache.py
│   │   ├── tools/
│   │   │   └── source_reader.py
│   │   └── prompts.py

extension/
├── src/
│   ├── components/
│   │   └── iris/            # ← NEW: IRIS UI components
│   └── content.js           # Modify to integrate IRIS
```
---

**Remember:**  
> The goal is NOT perfect accuracy.  
> The goal is to validate whether this approach reduces cognitive load.

