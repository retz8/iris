# IRIS Debug Report

**File:** `useUserBoard.ts`  
**Language:** `typescript`  
**Execution Path:** 🚀 Fast-Path (Single-Stage)  
**Status:** ✅ GOOD ![Fast-Path](https://img.shields.io/badge/Execution-Fast--Path-blue)

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

**Total Nodes:** 14  
**Compression:** 7.71x reduction  
**Size:** 1,461 bytes

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
      "type": "import_statement",
      "line_range": [
        3,
        3
      ],
      "import_details": {
        "import_type": "named",
        "namespace_import": null,
        "default_import": null,
        "named_imports": [
          "useUserComments",
          "useUserPosts"
        ],
        "source": "@/apis/users/swrHooks"
      },
      "fields": {
        "source": [
          {
            "type": "string",
            "line_range": [
              3,
              3
            ],
            "extra_children_count": 1
          }
        ]
      },
      "children": [
        {
          "type": "import_clause",
          "line_range": [
            3,
            3
          ],
          "extra_children_count": 1
        }
      ]
    },
    {
      "type": "import_statement",
      "line_range": [
        4,
        4
      ],
      "import_details": {
        "import_type": "named",
        "namespace_import": null,
        "default_import": null,
        "named_imports": [
          "useState"
        ],
        "source": "react"
      },
      "fields": {
        "source": [
          {
            "type": "string",
            "line_range": [
              4,
              4
            ],
            "extra_children_count": 1
          }
        ]
      },
      "children": [
        {
          "type": "import_clause",
          "line_range": [
            4,
            4
          ],
          "extra_children_count": 1
        }
      ]
    },
    {
      "type": "type_alias_declaration",
      "line_range": [
        11,
        11
      ],
      "name": "ActiveViewOptions",
      "fields": {
        "name": [
          {
            "type": "type_identifier",
            "line_range": [
              11,
              11
            ]
          }
        ],
        "value": [
          {
            "type": "union_type",
            "line_range": [
  ...(truncated for readability)
```

### Transformation Summary

| Stage | Nodes | Size | Purpose |
|-------|-------|------|---------|
| Full AST | 108 | 946B | Complete parse tree |
| Shallow AST | 14 | 1,461B | Semantic analysis |
| **Reduction** | **7.71x** | **0.65x** | **Efficiency gain** |

### Transformation Summary

| Stage | Nodes | Size | Purpose |
|-------|-------|------|---------|
| Full AST | 108 | 946B | Complete parse tree |
| Shallow AST | 14 | 1,461B | Semantic analysis |
| **Reduction** | **7.71x** | **0.65x** | **Efficiency gain** |

---

## Compression Metrics (AST Transformation)

| Metric | Value |
|--------|-------|
| Node Reduction Ratio | 7.71x |
| Context Compression Ratio | 0.65x |
| Comment Retention Score | 0.0% |
| Full AST Nodes | 108 |
| Shallow AST Nodes | 14 |
| Full AST Estimated Tokens | 378 |
| Shallow AST Estimated Tokens | 49 |
| Source Bytes | 946 |
| JSON Bytes | 1,461 |

---

## LLM Processing Metrics

### 🚀 Fast-Path Execution

Single-stage analysis using shallow AST + full source code.

#### Summary

| Metric | Value |
|--------|-------|
| Total Input Tokens | 1,892 |
| Total Output Tokens | 208 |
| Total Tokens | 2,100 |
| Total Time | 4.10s |
| Stages | 1 |

#### Stage Details

**Fast Path Analysis**

| Metric | Value |
|--------|-------|
| Input Tokens | 1,892 |
| Output Tokens | 208 |
| Total Tokens | 2,100 |
| Time | 4.10s |

**Throughput:**

- Tokens/Second: 512.2 tok/s
- Input: 1,892 tok | Output: 208 tok | Total: 2,100 tok

<details>
<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>

```json
{
  "file_intent": "Custom hook: manages user data fetching for posts and comments",
  "responsibilities": [
    {
      "id": "user-board-hook",
      "label": "User Board Data Fetching",
      "description": "Fetches user posts and comments, manages active view state",
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
  "metadata": {
    "notes": "The hook encapsulates the logic for fetching and managing user-related data, providing a clean interface for components."
  }
}
```

</details>

---

## Integrity Verification

**Integrity Score:** `92.9%`

**Checks:** 13/14 passed

### ⚠️ Quality Warning

Integrity score is below 100%. Some structural elements may not have been fully verified.

---

*Report generated for IRIS AST transformation analysis*