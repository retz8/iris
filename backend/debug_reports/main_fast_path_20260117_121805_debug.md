# IRIS Debug Report

**File:** `main.js`  
**Language:** `javascript`  
**Execution Path:** 🚀 Fast-Path (Single-Stage)  
**Status:** ❌ POOR ![Fast-Path](https://img.shields.io/badge/Execution-Fast--Path-blue)

---

## Transformation Pipeline Visualization

### Stage 1: Original Source Code

**Total Lines:** 1154  
**Size:** 34,674 bytes

```javascript
import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import rotatingFrameTransformation from "./rotation_of_the_frame.js";

// modeling modules
import { createGUIWithAnth } from "./modules/guiManager.js";
import { createManualWheelchair } from "./modules/manualWheelchair.js";
import { createPoweredWheelchair } from "./modules/poweredWheelchair.js";

// side modules
import Li...(truncated)
```

### Stage 2: Full AST (Before Compression)

**Total Nodes:** 3657  
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

**Total Nodes:** 424  
**Compression:** 8.62x reduction  
**Size:** 46,828 bytes

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
| Full AST | 3657 | 34,674B | Complete parse tree |
| Shallow AST | 424 | 46,828B | Semantic analysis |
| **Reduction** | **8.62x** | **0.74x** | **Efficiency gain** |

---

## Compression Metrics (AST Transformation)

| Metric | Value |
|--------|-------|
| Node Reduction Ratio | 8.62x |
| Context Compression Ratio | 0.74x |
| Comment Retention Score | 91.3% |
| Full AST Nodes | 3657 |
| Shallow AST Nodes | 424 |
| Full AST Estimated Tokens | 12,799 |
| Shallow AST Estimated Tokens | 1,484 |
| Source Bytes | 34,674 |
| JSON Bytes | 46,828 |

---

## LLM Processing Metrics

### 🚀 Fast-Path Execution

Single-stage analysis using shallow AST + full source code.

#### Summary

| Metric | Value |
|--------|-------|
| Total Input Tokens | 26,525 |
| Total Output Tokens | 780 |
| Total Tokens | 27,305 |
| Total Time | 20.52s |
| Stages | 1 |

#### Stage Details

**Fast Path Analysis**

| Metric | Value |
|--------|-------|
| Input Tokens | 26,525 |
| Output Tokens | 780 |
| Total Tokens | 27,305 |
| Time | 20.52s |

<details>
<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>

```json
{
  "file_intent": "3D modeling and simulation of human and wheelchair interactions for ergonomic analysis.",
  "responsibilities": [
    {
      "id": "human-modeling",
      "label": "Human Model Management",
      "description": "Handles loading, updating, and positioning of the human model in the scene.",
      "elements": {
        "functions": [
          "loadHumanModel",
          "updateHumanGeometry",
          "calculateHumanPositionOnWheelchair",
          "optimizeHumanAlignment"
        ],
        "state": [
          "humanMesh",
          "humanGeometry",
          "humanMaterial",
          "humanRotation"
        ],
        "imports": [
          "PLYLoader",
          "THREE"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          1,
          10
        ],
        [
          475,
          641
        ]
      ]
    },
    {
      "id": "wheelchair-modeling",
      "label": "Wheelchair Model Management",
      "description": "Handles loading, updating, and positioning of the wheelchair model in the scene.",
      "elements": {
        "functions": [
          "loadWheelchairModel",
          "updateWheelchairGeometry",
          "createWheelchairMesh",
          "updateWheelchairMesh"
        ],
        "state": [
          "wheelchairMesh",
          "wheelchairGeometry",
          "wheelchairMaterial",
          "wheelchairParams"
        ],
        "imports": [
          "createManualWheelchair",
          "createPoweredWheelchair",
          "THREE"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          848,
          894
        ],
        [
          900,
          978
        ]
      ]
    },
    {
      "id": "parameter-calculation",
      "label": "Parameter Calculation",
      "description": "Calculates optimal parameters for human and wheelchair based on user input.",
      "elements": {
        "functions": [
          "calculateOptimalSeatWidth",
          "calculateOptimalBackHeight",
          "calculateOptimalWheelchairParams",
          "validateWheelchairParams"
        ],
        "state": [
          "anth",
          "wheelchairParams"
        ],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          311,
          388
        ],
        [
          390,
          409
        ]
      ]
    },
    {
      "id": "gui-management",
      "label": "GUI Management",
      "description": "Creates and manages the GUI for user interaction with human and wheelchair parameters.",
      "elements": {
        "functions": [
          "createGUIWithAnth"
        ],
        "state": [
          "gui"
        ],
        "imports": [
          "createGUIWithAnth"
        ],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          79,
          293
        ]
      ]
    },
    {
      "id": "animation-and-init",
      "label": "Animation and Initialization",
      "description": "Handles the initialization of the scene and the animation loop.",
      "elements": {
        "functions": [
          "init",
          "animate"
        ],
        "state": [
          "scene",
          "controls"
        ],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          1020,
          1145
        ]
      ]
    }
  ],
  "metadata": {
    "notes": "This file integrates various modules for 3D modeling and ergonomic analysis."
  }
}
```

</details>

---

## Integrity Verification

**Integrity Score:** `57.6%`

**Checks:** 57/99 passed

### ⚠️ Quality Warning

Integrity score is below 100%. Some structural elements may not have been fully verified.

---

*Report generated for IRIS AST transformation analysis*