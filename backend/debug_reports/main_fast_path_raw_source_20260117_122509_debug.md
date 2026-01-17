# IRIS Debug Report

**File:** `main.js`  
**Language:** `javascript`  
**Execution Path:** 🚀 Fast-Path (Single-Stage)  
**Status:** ❌ POOR ![Fast-Path](https://img.shields.io/badge/Execution-Fast--Path-blue)

---

## Source Code Overview

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

### Stage 3: Shallow AST (After Compression)

**Total Nodes:** 0  
**Compression:** 0.00x reduction  
**Size:** 0 bytes

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

---

## LLM Processing Metrics

### 🚀 Fast-Path Execution

Single-stage analysis using shallow AST + full source code.

#### Summary

| Metric | Value |
|--------|-------|
| Total Input Tokens | 10,356 |
| Total Output Tokens | 748 |
| Total Tokens | 11,104 |
| Total Time | 15.61s |
| Stages | 1 |

#### Stage Details

**Fast Path Analysis**

| Metric | Value |
|--------|-------|
| Input Tokens | 10,356 |
| Output Tokens | 748 |
| Total Tokens | 11,104 |
| Time | 15.61s |

<details>
<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>

```json
{
  "file_intent": "3D modeling and simulation of human and wheelchair interactions for ergonomic assessments.",
  "responsibilities": [
    {
      "id": "model-loading",
      "label": "Model Loading",
      "description": "Load and manage 3D models of human and wheelchair.",
      "elements": {
        "functions": [
          "loadHumanModel",
          "loadWheelchairModel",
          "loadHumanAndWheelchairModels"
        ],
        "state": [
          "humanMesh",
          "wheelchairMesh",
          "humanGeometry",
          "wheelchairGeometry"
        ],
        "imports": [
          "PLYLoader",
          "OBJExporter"
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
          200,
          300
        ]
      ]
    },
    {
      "id": "parameter-management",
      "label": "Parameter Management",
      "description": "Manage and update human and wheelchair parameters.",
      "elements": {
        "functions": [
          "setWheelchairParams",
          "updateWheelchairParams",
          "refreshGUIWheelchairParams"
        ],
        "state": [
          "wheelchairParams",
          "anth"
        ],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          1,
          10
        ],
        [
          400,
          500
        ]
      ]
    },
    {
      "id": "geometry-updating",
      "label": "Geometry Updating",
      "description": "Update human and wheelchair geometries based on parameters.",
      "elements": {
        "functions": [
          "updateHumanGeometry",
          "updateWheelchairGeometry",
          "updateHumanGeometryFromWheelchair"
        ],
        "state": [
          "geometryZero",
          "humanParameterChanged",
          "wheelchairParameterChanged"
        ],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          1,
          10
        ],
        [
          600,
          700
        ]
      ]
    },
    {
      "id": "alignment-optimization",
      "label": "Alignment Optimization",
      "description": "Ensure proper alignment of human model on wheelchair.",
      "elements": {
        "functions": [
          "optimizeHumanAlignment",
          "measureBackGap",
          "measureCalfCushionOverlap"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": [
          "BACK_GAP_MIN",
          "BACK_GAP_MAX"
        ]
      },
      "ranges": [
        [
          1,
          10
        ],
        [
          800,
          900
        ]
      ]
    },
    {
      "id": "gui-integration",
      "label": "GUI Integration",
      "description": "Integrate GUI for user interaction with parameters.",
      "elements": {
        "functions": [
          "createGUIWithAnth"
        ],
        "state": [
          "gui"
        ],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          1,
          10
        ],
        [
          1000,
          1100
        ]
      ]
    }
  ],
  "metadata": {
    "notes": "This file serves as the main entry point for the 3D modeling application."
  }
}
```

</details>

---

## Integrity Verification

**Integrity Score:** `0.0%`

**Checks:** 0/0 passed

### ⚠️ Quality Warning

Integrity score is below 100%. Some structural elements may not have been fully verified.

---

*Report generated for IRIS AST transformation analysis*