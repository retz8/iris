# IRIS Debug Report

**File:** `state_machine.js`  
**Language:** `javascript`  
**Execution Path:** 🔧 Tool-Calling with Signature Graph  

---

## Source Code Overview

### Stage 1: Original Source Code

**Total Lines:** 181  
**Size:** 2,851 bytes

```javascript
/**
 * State management
 */

const STATE_A = 0;
const STATE_B = 1;
const STATE_C = 2;

class Manager {
  constructor(config) {
    this.current = STAT...(truncated)
```

### Signature Graph Snapshot

**Entities:** 20

```json
{
  "entities": [
    {
      "id": "entity_0",
      "name": "Manager",
      "type": "class",
      "signature": "class Manager",
      "line_range": [
        9,
        179
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
        "entity_15",
        "entity_16",
        "entity_17"
      ],
      "calls": [],
      "leading_comment": "/**\n * State management\n */",
      "inline_comment": null,
      "trailing_comment": null,
      "docstring": null
    },
    {
      "id": "entity_1",
      "name": "constructor",
      "type": "method",
      "signature": "constructor(config)",
      "line_range": [
        10,
        15
      ],
  ...(truncated for readability)
```

---

## LLM Processing Metrics

### 🔧 Tool-Calling Execution

Single-stage analysis with dynamic source reading: LLM analyzes shallow AST and calls `refer_to_source_code()` tool when needed.

#### Summary

| Metric | Value |
|--------|-------|
| Total Input Tokens | 5,241 |
| Total Output Tokens | 325 |
| Total Tokens | 5,566 |
| Total Time | 6.34s |
| Stages | 1 |

#### Stage Details

**Tool Calling Analysis**

| Metric | Value |
|--------|-------|
| Input Tokens | 5,241 |
| Output Tokens | 325 |
| Total Tokens | 5,566 |
| Time | 6.34s |

**Throughput:**

- Tokens/Second: 877.9 tok/s
- Input: 5,241 tok | Output: 325 tok | Total: 5,566 tok

<details>
<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>

```json
{
  "file_intent": "State management system that orchestrates state transitions and updates based on input, ensuring consistent state behavior.",
  "initial_hypothesis": "The file defines a state management class with methods for updating, transitioning, and processing state changes.",
  "entity_count_validation": {
    "total_entities": 18,
    "responsibilities_count": 1,
    "required_range": "1-5",
    "passes_anti_collapse_rule": true
  },
  "verification_processes": [],
  "responsibilities": [
    {
      "id": "state-management",
      "label": "State Management Ecosystem",
      "description": "Manages state transitions and updates based on input, ensuring observers are notified of changes.",
      "elements": {
        "functions": [
          "constructor",
          "update",
          "_determine",
          "_transition",
          "_notify",
          "_check",
          "batch",
          "_prepare",
          "_handle",
          "_compute",
          "_filter",
          "_aggregate",
          "execute",
          "_setup",
          "_process",
          "_cleanup",
          "getState"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          9,
          179
        ]
      ]
    }
  ],
  "metadata": {
    "logical_depth": "Deep",
    "notes": "The class encapsulates various methods for state management, indicating a complex structure for handling state transitions."
  }
}
```

</details>

---

*Report generated for IRIS AST transformation analysis*