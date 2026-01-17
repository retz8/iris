# IRIS Debug Report

**File:** `useUserBoard.ts`  
**Language:** `typescript`  
**Execution Path:** 🚀 Fast-Path (Single-Stage)  
**Status:** ⚠️ FAIR ![Fast-Path](https://img.shields.io/badge/Execution-Fast--Path-blue)

---

## Transformation Pipeline Visualization

### Stage 1: Original Source Code

**Total Lines:** 37  
**Size:** 946 bytes

```typescript
// Custom hook to fetch data for UserBoard

import { useUserComments, useUserPosts } from "@/apis/users/swrHooks";
import { useState } from "react";

// <Business Logic>
// 1. Fetch the user's posts.
// 2. Fetch the user's comments.
// 3. Create a toggle switch for opening and closing posts.

type ActiveViewOptions = "posts" | "comments";

const useUserBoard = (email: string, token: string | null) => {
  const [activeView, setActiveView] = useState<ActiveViewOptions>("posts");

  const {
    pos...(truncated)
```

### Stage 2: Full AST (Before Compression)

**Total Nodes:** 108  
**Structure:** Complete Tree-sitter parse tree

**Key Characteristics:**
- All implementation details are present
- Nested bodies and statements fully expanded
- Comprehensive but verbose JSON structure
- Ready for detailed analysis but heavy for transmission

```json
{
  "type": "root",
  "children": [
    {
      "type": "declaration",
      "children": [
        { "type": "identifier", "value": "..." },
        { "type": "body", "children": [
          { "type": "statement", "children": [...] },
          { "type": "statement", "children": [...] }
        ] }
      ]
    },
    { "type": "declaration", "children": [...] },
    { "type": "statement", "children": [...] }
  ]
}
```

### Stage 3: Shallow AST (After Compression)

**Total Nodes:** 19  
**Compression:** 5.68x reduction  
**Size:** 1,457 bytes

**Key Characteristics:**
- Implementation bodies collapsed to `line_range` references
- Function signatures and declarations preserved
- Comments extracted and attached to nodes
- Lightweight JSON for semantic analysis

```json
{
  "type": "module/program",
  "children": [
    {
      "type": "function_declaration",
      "name": "exampleFunction",
      "line_range": [10, 25],
      "leading_comment": "// Documentation...",
      "children": [...]
    },
    {
      "type": "class_declaration",
      "name": "ExampleClass",
      "line_range": [27, 50],
      "fields": {
        "methods": [
          {
            "type": "method_definition",
            "name": "exampleMethod",
            "line_range": [30, 40]
          }
        ]
      }
    }
  ]
}
```

### Transformation Summary

| Stage | Nodes | Size | Purpose |
|-------|-------|------|---------|
| Full AST | 108 | 946B | Complete parse tree |
| Shallow AST | 19 | 1,457B | Semantic analysis |
| **Reduction** | **5.68x** | **0.65x** | **Efficiency gain** |

### Transformation Summary

| Stage | Nodes | Size | Purpose |
|-------|-------|------|---------|
| Full AST | 108 | 946B | Complete parse tree |
| Shallow AST | 19 | 1,457B | Semantic analysis |
| **Reduction** | **5.68x** | **0.65x** | **Efficiency gain** |

---

## Compression Metrics (AST Transformation)

| Metric | Value |
|--------|-------|
| Node Reduction Ratio | 5.68x |
| Context Compression Ratio | 0.65x |
| Comment Retention Score | 0.0% |
| Full AST Nodes | 108 |
| Shallow AST Nodes | 19 |
| Full AST Estimated Tokens | 378 |
| Shallow AST Estimated Tokens | 66 |
| Source Bytes | 946 |
| JSON Bytes | 1,457 |

---

## LLM Processing Metrics

### 🚀 Fast-Path Execution

Single-stage analysis using shallow AST + full source code.

#### Summary

| Metric | Value |
|--------|-------|
| Total Input Tokens | 1,657 |
| Total Output Tokens | 184 |
| Total Tokens | 1,841 |
| Total Time | 3.54s |
| Stages | 1 |

#### Stage Details

**Fast Path Analysis**

| Metric | Value |
|--------|-------|
| Input Tokens | 1,657 |
| Output Tokens | 184 |
| Total Tokens | 1,841 |
| Time | 3.54s |

<details>
<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>

```json
{
  "file_intent": "Custom hook for managing user-related data fetching and view state in a user board interface.",
  "responsibilities": [
    {
      "id": "fetch-user-data",
      "label": "Fetch User Data",
      "description": "Handles fetching user posts and comments based on provided email and token.",
      "elements": {
        "functions": [
          "useUserBoard"
        ],
        "state": [
          "activeView"
        ],
        "imports": [
          "useUserComments",
          "useUserPosts",
          "useState"
        ],
        "types": [
          "ActiveViewOptions"
        ],
        "constants": []
      },
      "ranges": [
        [
          1,
          10
        ],
        [
          13,
          37
        ]
      ]
    }
  ],
  "metadata": {}
}
```

</details>

---

## Integrity Verification

**Integrity Score:** `66.7%`

**Checks:** 2/3 passed

### ⚠️ Quality Warning

Integrity score is below 100%. Some structural elements may not have been fully verified.

---

*Report generated for IRIS AST transformation analysis*