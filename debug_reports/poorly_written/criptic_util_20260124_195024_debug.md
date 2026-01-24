# IRIS Debug Report

**File:** `criptic_util.js`  
**Language:** `javascript`  
**Execution Path:** 🔧 Tool-Calling with Signature Graph  

---

## Source Code Overview

### Stage 1: Original Source Code

**Total Lines:** 170  
**Size:** 2,801 bytes

```javascript
/**
 * Utility functions
 */

class Utils {
  constructor() {
    this.cache = new Map();
    this.counter = 0;
  }

  /**
   * Process data
   * @par...(truncated)
```

### Signature Graph Snapshot

**Entities:** 18

```json
{
  "entities": [
    {
      "id": "entity_0",
      "name": "Utils",
      "type": "class",
      "signature": "class Utils",
      "line_range": [
        5,
        168
      ],
      "depth": 0,
      "scope": "module",
      "parent_id": null,
      "children_ids": [
        "entity_1",
        "entity_2",
        "entity_3",
        "entity_4",
        "entity_5",
        "entity_6",
        "entity_7",
        "entity_8",
        "entity_9",
        "entity_10",
        "entity_11",
        "entity_12",
        "entity_13",
        "entity_14",
        "entity_15"
      ],
      "calls": [],
      "leading_comment": "/**\n * Utility functions\n */",
      "inline_comment": null,
      "trailing_comment": null,
      "docstring": null
    },
    {
      "id": "entity_1",
      "name": "constructor",
      "type": "method",
      "signature": "constructor()",
      "line_range": [
        6,
        9
      ],
      "depth": 1,
      "scope": "class",
  ...(truncated for readability)
```

---

## LLM Processing Metrics

### 🔧 Tool-Calling Execution

Single-stage analysis with dynamic source reading: LLM analyzes shallow AST and calls `refer_to_source_code()` tool when needed.

#### Summary

| Metric | Value |
|--------|-------|
| Total Input Tokens | 4,994 |
| Total Output Tokens | 309 |
| Total Tokens | 5,303 |
| Total Time | 6.70s |
| Stages | 1 |

#### Stage Details

**Tool Calling Analysis**

| Metric | Value |
|--------|-------|
| Input Tokens | 4,994 |
| Output Tokens | 309 |
| Total Tokens | 5,303 |
| Time | 6.70s |

**Throughput:**

- Tokens/Second: 791.5 tok/s
- Input: 4,994 tok | Output: 309 tok | Total: 5,303 tok

<details>
<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>

```json
{
  "file_intent": "Utility class that processes and transforms data inputs into validated outputs with consistent constraints.",
  "initial_hypothesis": "The file contains a class with methods for data processing, transformation, and validation.",
  "entity_count_validation": {
    "total_entities": 17,
    "responsibilities_count": 1,
    "required_range": "1-3",
    "passes_anti_collapse_rule": true
  },
  "verification_processes": [],
  "responsibilities": [
    {
      "id": "data-processing-transformation",
      "label": "Data Processing and Transformation",
      "description": "Provides methods to process, transform, and validate data inputs.",
      "elements": {
        "functions": [
          "constructor",
          "process",
          "_prepare",
          "_apply",
          "_finalize",
          "handle",
          "_generateKey",
          "_compute",
          "exec",
          "_transform",
          "_validate",
          "run",
          "_processItem",
          "_normalize",
          "_adjust"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          5,
          168
        ]
      ]
    }
  ],
  "metadata": {
    "logical_depth": "Deep",
    "notes": "The class encapsulates various private methods for internal processing, indicating a focus on data integrity and transformation."
  }
}
```

</details>

---

*Report generated for IRIS AST transformation analysis*