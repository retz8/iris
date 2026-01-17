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
  "type": "program",
  "line_range": [
    1,
    37
  ],
  "children": [
    {
      "type": "comment",
      "line_range": null
    },
    {
      "type": "import_statement",
      "line_range": null,
      "fields": {
        "source": [
          {
            "type": "string",
            "line_range": null,
            "extra_children_count": 1
          }
        ]
      },
      "children": [
        {
          "type": "import_clause",
          "line_range": null,
          "extra_children_count": 1
        }
      ]
    },
    {
      "type": "import_statement",
      "line_range": null,
      "fields": {
        "source": [
          {
            "type": "string",
            "line_range": null,
            "extra_children_count": 1
          }
        ]
      },
      "children": [
        {
          "type": "import_clause",
          "line_range": null,
          "extra_children_count": 1
        }
      ]
    },
    {
      "type": "comment",
      "line_range": null
    },
    {
      "type": "comment",
      "line_range": null,
      "leading_comment": "<Business Logic>"
    },
    {
      "type": "comment",
      "line_range": null,
      "leading_comment": "<Business Logic>\n1. Fetch the user's posts."
    },
    {
      "type": "comment",
      "line_range": null,
      "leading_comment": "<Business Logic>\n1. Fetch the user's posts.\n2. Fetch the user's comments."
    },
    {
      "type": "type_alias_declaration",
      "line_range": null,
      "name": "ActiveViewOptions",
      "fields": {
        "name": [
          {
            "type": "type_identifier",
            "line_range": null
          }
        ],
        "value": [
          {
            "type": "union_type",
            "line_range": null,
            "extra_children_count": 2
          }
        ]
      }
    },
    {
      "type": "lexical_declaration",
      "line_range": [
        13,
        35
      ],
      "children": [
        {
  ...(truncated for readability)
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
| Total Input Tokens | 1,805 |
| Total Output Tokens | 204 |
| Total Tokens | 2,009 |
| Total Time | 4.78s |
| Stages | 1 |

#### Stage Details

**Fast Path Analysis**

| Metric | Value |
|--------|-------|
| Input Tokens | 1,805 |
| Output Tokens | 204 |
| Total Tokens | 2,009 |
| Time | 4.78s |

**Throughput:**

- Tokens/Second: 420.3 tok/s
- Input: 1,805 tok | Output: 204 tok | Total: 2,009 tok

<details>
<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>

```json
{
  "file_intent": "Custom hook: manages user board data fetching and state management",
  "responsibilities": [
    {
      "id": "user-board-data-fetching",
      "label": "User Board Data Fetching",
      "description": "Fetches user posts and comments while managing the active view state.",
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
          37
        ]
      ]
    }
  ],
  "metadata": {
    "notes": "The file serves as a custom hook for managing user-related data, specifically posts and comments, and includes logic for toggling views."
  }
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