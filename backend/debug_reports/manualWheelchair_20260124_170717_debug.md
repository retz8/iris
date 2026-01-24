# IRIS Debug Report

**File:** `manualWheelchair.js`  
**Language:** `javascript`  
**Execution Path:** 🔧 Tool-Calling (Single-Stage with Dynamic Source Reading)  

---

## Source Code Overview

### Stage 1: Original Source Code

*Source code not available in snapshots*

### Signature Graph Snapshot

**Entities:** 15

```json
{
  "entities": [
    {
      "id": "entity_0",
      "name": "* as jscad",
      "type": "import",
      "signature": "import * as jscad from \"@jscad/modeling\";",
      "line_range": [
        4,
        4
      ],
      "depth": 0,
      "scope": "module",
      "parent_id": null,
      "children_ids": [],
      "calls": [],
      "leading_comment": "/**\n * Import the needed libraries of jscad\n */",
      "inline_comment": null,
      "trailing_comment": null,
      "docstring": null
    },
    {
      "id": "entity_1",
      "name": "createSeatCushion",
      "type": "function",
      "signature": "createSeatCushion(params, seatDepth, wheelBase)",
      "line_range": [
        31,
        55
      ],
      "depth": 0,
      "scope": "module",
      "parent_id": null,
      "children_ids": [],
      "calls": [
        "roundedCuboid"
      ],
      "leading_comment": "/**\n * Create various 3D primitives and color utilities from jscad\n */\n/**\n * Establish the constants for the measurements.\n */\n// conversion as measures are given in inches but mm are needed.\n// radius for the thickness of the small wheel.\n//radius for the small wheel.\n// radius for the metal tubes.\n// radius of the torus for the angle tube curves.\n// Length of the push handle\n// thickness for the back and seatrests.\n// thickness for the diameter of the wheel handle.\n// armrest cushion height\n// thickness of the front wheels holding structure\n// Default number of segments for curved surfaces. Higher = smoother but slower loading",
      "inline_comment": null,
      "trailing_comment": "/**\n   * Creates the seat cushion 3D model.\n   * @param {Object} params - The parameters for creating the seat cushion.\n   * @returns {Object} The seat cushion 3D model.\n   */",
      "docstring": null
    },
    {
      "id": "entity_2",
      "name": "createBackrest",
      "type": "function",
      "signature": "createBackrest(params, backrestHeight, backrestWidth, wheelBase)",
  ...(truncated for readability)
```

---

## LLM Processing Metrics

### 🔧 Tool-Calling Execution

Single-stage analysis with dynamic source reading: LLM analyzes shallow AST and calls `refer_to_source_code()` tool when needed.

#### Summary

| Metric | Value |
|--------|-------|
| Total Input Tokens | 4,981 |
| Total Output Tokens | 944 |
| Total Tokens | 5,925 |
| Total Time | 29.85s |
| Stages | 1 |

#### Stage Details

**Tool Calling Analysis**

| Metric | Value |
|--------|-------|
| Input Tokens | 4,981 |
| Output Tokens | 944 |
| Total Tokens | 5,925 |
| Time | 29.85s |

**Throughput:**

- Tokens/Second: 198.5 tok/s
- Input: 4,981 tok | Output: 944 tok | Total: 5,925 tok

<details>
<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>

```json
{
  "file_intent": "3D model creator for manual wheelchairs that assembles various components into a cohesive wheelchair design with precise measurements.",
  "initial_hypothesis": "The file contains functions to create different parts of a manual wheelchair, including seat, backrest, wheels, and structure.",
  "entity_count_validation": {
    "total_entities": 14,
    "responsibilities_count": 8,
    "required_range": "8-12",
    "passes_anti_collapse_rule": true
  },
  "verification_processes": [],
  "responsibilities": [
    {
      "id": "create-seat-cushion",
      "label": "Seat Cushion Creation",
      "description": "Creates the 3D model of the seat cushion with specified parameters.",
      "elements": {
        "functions": [
          "createSeatCushion"
        ],
        "state": [],
        "imports": [
          "jscad"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          31,
          55
        ]
      ]
    },
    {
      "id": "create-backrest",
      "label": "Backrest Creation",
      "description": "Generates the 3D model of the backrest using defined parameters.",
      "elements": {
        "functions": [
          "createBackrest"
        ],
        "state": [],
        "imports": [
          "jscad"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          57,
          104
        ]
      ]
    },
    {
      "id": "create-seatrest",
      "label": "Seatrest Creation",
      "description": "Constructs the 3D model of the seatrest based on given parameters.",
      "elements": {
        "functions": [
          "createSeatrest"
        ],
        "state": [],
        "imports": [
          "jscad"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          164,
          207
        ]
      ]
    },
    {
      "id": "create-armrest",
      "label": "Armrest Creation",
      "description": "Creates the 3D model of the armrest with specified dimensions.",
      "elements": {
        "functions": [
          "createArmrest"
        ],
        "state": [],
        "imports": [
          "jscad"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          247,
          280
        ]
      ]
    },
    {
      "id": "create-wheels",
      "label": "Wheel Creation",
      "description": "Generates the 3D models for the front and back wheels of the wheelchair.",
      "elements": {
        "functions": [
          "createBackWheel",
          "createFrontWheel"
        ],
        "state": [],
        "imports": [
          "jscad"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          282,
          555
        ]
      ]
    },
    {
      "id": "create-legrest",
      "label": "Legrest Structure Creation",
      "description": "Constructs the 3D model of the legrest structure based on parameters.",
      "elements": {
        "functions": [
          "createLegrestStructure"
        ],
        "state": [],
        "imports": [
          "jscad"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          562,
          666
        ]
      ]
    },
    {
      "id": "create-manual-wheelchair",
      "label": "Manual Wheelchair Assembly",
      "description": "Assembles all components into a complete manual wheelchair model.",
      "elements": {
        "functions": [
          "createManualWheelchair"
        ],
        "state": [],
        "imports": [
          "jscad"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          668,
          917
        ]
      ]
    }
  ],
  "metadata": {
    "logical_depth": "Shallow",
    "notes": "Each function is focused on creating a specific part of the wheelchair, ensuring modularity and clarity."
  }
}
```

</details>

---

*Report generated for IRIS AST transformation analysis*