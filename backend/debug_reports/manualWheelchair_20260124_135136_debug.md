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
| Total Input Tokens | 673 |
| Total Output Tokens | 1,627 |
| Total Tokens | 2,300 |
| Total Time | 25.40s |
| Stages | 1 |

#### Stage Details

**Tool Calling Analysis**

| Metric | Value |
|--------|-------|
| Input Tokens | 673 |
| Output Tokens | 1,627 |
| Total Tokens | 2,300 |
| Time | 25.40s |

**Throughput:**

- Tokens/Second: 90.6 tok/s
- Input: 673 tok | Output: 1,627 tok | Total: 2,300 tok

<details>
<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>

```json
{
  "file_intent": "3D model generator for a manual wheelchair, creating various components and structures to ensure ergonomic design and functionality.",
  "responsibilities": [
    {
      "id": "create-seat-cushion",
      "label": "Seat Cushion Creator",
      "description": "Generates the 3D model of the seat cushion, ensuring proper dimensions and positioning.",
      "elements": {
        "functions": [
          "createSeatCushion"
        ],
        "state": [],
        "imports": [
          "import * as jscad from \"@jscad/modeling\";"
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
      "label": "Backrest Creator",
      "description": "Generates the 3D model of the backrest, ensuring ergonomic support and proper alignment.",
      "elements": {
        "functions": [
          "createBackrest"
        ],
        "state": [],
        "imports": [],
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
      "id": "create-backrest-structure",
      "label": "Backrest Structure Creator",
      "description": "Creates the structural components of the backrest for stability and support.",
      "elements": {
        "functions": [
          "createBackrestStructure"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          106,
          162
        ]
      ]
    },
    {
      "id": "create-seatrest",
      "label": "Seatrest Creator",
      "description": "Generates the 3D model of the seatrest, ensuring comfort and proper support.",
      "elements": {
        "functions": [
          "createSeatrest"
        ],
        "state": [],
        "imports": [],
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
      "id": "create-seatrest-structure",
      "label": "Seatrest Structure Creator",
      "description": "Creates the structural components of the seatrest for durability and support.",
      "elements": {
        "functions": [
          "createSeatrestStructure"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          209,
          245
        ]
      ]
    },
    {
      "id": "create-armrest",
      "label": "Armrest Creator",
      "description": "Generates the 3D model of the armrest, ensuring comfort and accessibility.",
      "elements": {
        "functions": [
          "createArmrest"
        ],
        "state": [],
        "imports": [],
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
      "id": "create-back-wheel",
      "label": "Back Wheel Creator",
      "description": "Generates the 3D model of the back wheel, ensuring functionality and aesthetic.",
      "elements": {
        "functions": [
          "createBackWheel"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          282,
          323
        ]
      ]
    },
    {
      "id": "create-back-wheel-structure",
      "label": "Back Wheel Structure Creator",
      "description": "Creates the structural components of the back wheel for stability and support.",
      "elements": {
        "functions": [
          "createBackWheelStructure"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          325,
          344
        ]
      ]
    },
    {
      "id": "create-wheel-handle",
      "label": "Wheel Handle Creator",
      "description": "Generates the 3D model of the wheel handle, ensuring ergonomic design.",
      "elements": {
        "functions": [
          "createWheelHandle"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          346,
          363
        ]
      ]
    },
    {
      "id": "create-front-wheel",
      "label": "Front Wheel Creator",
      "description": "Generates the 3D model of the front wheel, ensuring functionality and aesthetic.",
      "elements": {
        "functions": [
          "createFrontWheel"
        ],
        "state": [],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          365,
          555
        ]
      ]
    },
    {
      "id": "create-legrest-structure",
      "label": "Legrest Structure Creator",
      "description": "Creates the structural components of the legrest for comfort and support.",
      "elements": {
        "functions": [
          "createLegrestStructure"
        ],
        "state": [],
        "imports": [],
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
      "label": "Manual Wheelchair Assembler",
      "description": "Assembles all components into a complete 3D model of the manual wheelchair.",
      "elements": {
        "functions": [
          "createManualWheelchair"
        ],
        "state": [],
        "imports": [],
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
    "notes": "The file focuses on creating various components of a manual wheelchair, ensuring ergonomic design and functionality."
  }
}
```

</details>

---

## Tool Call Records

**Total Tool Calls:** 12

### Tool Call Summary

| # | Tool | Line Range | Size | Duration | Timestamp |
|---|------|-----------|------|----------|-----------|
| 1 | `refer_to_source_code` | 31-55 | 616B | 0.00s | 13:51:15 |
| 2 | `refer_to_source_code` | 57-104 | 1,242B | 0.00s | 13:51:15 |
| 3 | `refer_to_source_code` | 106-162 | 1,458B | 0.00s | 13:51:15 |
| 4 | `refer_to_source_code` | 164-207 | 1,150B | 0.00s | 13:51:15 |
| 5 | `refer_to_source_code` | 209-245 | 977B | 0.00s | 13:51:15 |
| 6 | `refer_to_source_code` | 247-280 | 935B | 0.00s | 13:51:15 |
| 7 | `refer_to_source_code` | 282-323 | 1,138B | 0.00s | 13:51:15 |
| 8 | `refer_to_source_code` | 325-344 | 579B | 0.00s | 13:51:15 |
| 9 | `refer_to_source_code` | 346-363 | 565B | 0.00s | 13:51:15 |
| 10 | `refer_to_source_code` | 365-555 | 5,104B | 0.00s | 13:51:15 |
| 11 | `refer_to_source_code` | 562-666 | 2,560B | 0.00s | 13:51:15 |
| 12 | `refer_to_source_code` | 668-917 | 7,448B | 0.00s | 13:51:15 |

### Tool Call Details

#### Call #1: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 31,
  "end_line": 55
}
```

**Result Size:** 616 bytes

**Source Code Retrieved:**

```javascript
function createSeatCushion(params, seatDepth, wheelBase) {
  /**
   * Creates the seat cushion 3D model.
   * @param {Object} params - The parameters for creating the seat cushion.
   * @returns {Object} The seat cushion 3D model.
   */

  const size = [
    seatDepth * inToMm,
    params.seatWidth * inToMm,
    params.seatCushThick * inToMm,
  ];
  const center = [
    (seatDepth / 2 + tubeRad) * inToMm,
    (wheelBase / 2) * inToMm,
    (params.seatPanHeight + params.seatCushThick / 2) * inToMm,
  ];

  return roundedCuboid({
    size,
    center,
    roundRadius: 1 * inToMm,
    segments: segments,
  });
}
```

#### Call #2: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 57,
  "end_line": 104
}
```

**Result Size:** 1,242 bytes

**Source Code Retrieved:**

```javascript
function createBackrest(params, backrestHeight, backrestWidth, wheelBase) {
  /**
   * Creates the backrest 3D model.
   * @param {Object} params - The parameters for creating the backrest.
   * @returns {Object} The backrest 3D model.
   */

  const size = [
    restThickness * inToMm,
    backrestWidth * inToMm,
    backrestHeight * inToMm,
  ];
  const center = [
    0 * inToMm,
    (wheelBase / 2) * inToMm,
    (params.seatBackHeight + backrestHeight / 2) * inToMm,
  ];

  return union(
    translate(
      [
        0,
        (wheelBase / 2 + backrestWidth / 2 + tubeRad) * inToMm,
        (params.seatBackHeight + backrestHeight / 2) * inToMm,
      ],
      cylinder({
        height: backrestHeight * inToMm,
        radius: (tubeRad + restThickness) * inToMm,
        segments: segments,
      })
    ),
    union(
      translate(
        [
          0,
          (wheelBase / 2 - backrestWidth / 2 - tubeRad) * inToMm,
          (params.seatBackHeight + backrestHeight / 2) * inToMm,
        ],
        cylinder({
          height: backrestHeight * inToMm,
          radius: (tubeRad + restThickness) * inToMm,
          segments: segments,
        })
      ),
      cuboid({ size, center, segments: segments })
    )
  );
}
```

#### Call #3: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 106,
  "end_line": 162
}
```

**Result Size:** 1,458 bytes

**Source Code Retrieved:**

```javascript
function createBackrestStructure(params, backrestHeight) {
  /**
   * Creates the structure of the backrest.
   * @param {Object} params - The parameters for creating the backrest structure.
   * @returns {Object} The backrest structure 3D model.
   */

  let structureBar = cylinder({
    height:
      (params.seatBackHeight + backrestHeight - params.wheelDiameter / 2) *
      inToMm,
    radius: tubeRad * inToMm,
    segments: segments,
  });
  let handleCurve = translate(
    [
      -tubeAngleRad * inToMm,
      0 * inToMm,
      ((params.seatBackHeight + backrestHeight - params.wheelDiameter / 2) /
        2) *
        inToMm,
    ],
    rotateX(
      degToRad(90),
      torus({
        innerRadius: tubeRad * inToMm,
        outerRadius: tubeAngleRad * inToMm,
        outerSegments: 128,
        outerRotation: degToRad(90),
      })
    )
  );
  let pushHandle = translate(
    [
      (0 - handleHeight / 2 - tubeAngleRad) * inToMm,
      0 * inToMm,
      ((params.seatBackHeight + backrestHeight - params.wheelDiameter / 2) / 2 +
        tubeAngleRad) *
        inToMm,
    ],
    rotateY(
      degToRad(90),
      roundedCylinder({
        height: handleHeight * inToMm,
        radius: (tubeRad + 0.15) * inToMm,
        segments: segments,
        roundRadius: 0.15 * inToMm,
      })
    )
  );

  if (params.showPushHandle == true) {
    return union(structureBar, handleCurve, pushHandle);
  } else {
    return structureBar;
  }
}
```

#### Call #4: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 164,
  "end_line": 207
}
```

**Result Size:** 1,150 bytes

**Source Code Retrieved:**

```javascript
function createSeatrest(params, seatDepth, backrestWidth, wheelBase) {
  /**
   * Creates the seatrest 3D model.
   * @param {Object} params - The parameters for creating the seatrest.
   * @returns {Object} The seatrest 3D model.
   */

  const size = [seatDepth * inToMm, params.seatWidth * inToMm, 0.1 * inToMm];
  const center = [
    (seatDepth / 2 + tubeRad) * inToMm,
    (wheelBase / 2) * inToMm,
    params.seatPanHeight * inToMm,
  ];
  let createCylinder = rotateY(
    degToRad(90),
    cylinder({
      height: params.seatWidth * inToMm,
      radius: (tubeRad + 0.1) * inToMm,
      segments: segments,
    })
  );

  return union(
    translate(
      [
        (seatDepth / 2 + tubeRad) * inToMm,
        (wheelBase / 2 + backrestWidth / 2 + tubeRad) * inToMm,
        params.seatPanHeight * inToMm,
      ],
      createCylinder
    ),
    union(
      translate(
        [
          (seatDepth / 2 + tubeRad) * inToMm,
          (wheelBase / 2 - backrestWidth / 2 - tubeRad) * inToMm,
          params.seatPanHeight * inToMm,
        ],
        createCylinder
      ),
      cuboid({ size, center, segments: segments })
    )
  );
}
```

#### Call #5: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 209,
  "end_line": 245
}
```

**Result Size:** 977 bytes

**Source Code Retrieved:**

```javascript
function createSeatrestStructure(params, seatDepth) {
  /**
   * Creates the structure of the seatrest.
   * @param {Object} params - The parameters for creating the seatrest structure.
   * @returns {Object} The seatrest structure 3D model.
   */

  let seatStructure = rotateY(
    degToRad(90),
    cylinder({
      height:
        (seatDepth +
          tubeRad +
          (params.wheelDiameter *
            Math.sin(degToRad(params.seatToBackrestAngle - 90))) /
            4) *
        inToMm,
      radius: tubeRad * inToMm,
      segments: segments,
    })
  );
  let seatrestCurve = translate(
    [((seatDepth + tubeRad) / 2) * inToMm, 0, -tubeAngleRad * inToMm],
    rotateX(
      degToRad(90),
      torus({
        innerRadius: tubeRad * inToMm,
        outerRadius: tubeAngleRad * inToMm,
        innerSegments: segments,
        outerSegments: segments,
        outerRotation: degToRad(90),
      })
    )
  );

  return union(seatStructure, seatrestCurve);
}
```

#### Call #6: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 247,
  "end_line": 280
}
```

**Result Size:** 935 bytes

**Source Code Retrieved:**

```javascript
function createArmrest(params, seatDepth, armrestLength) {
  /**
   * Creates the armrest 3D model.
   * @param {Object} params - The parameters for creating the armrest.
   * @returns {Object} The armrest 3D model.
   */

  let armStructure = rotateY(
    degToRad(90),
    cylinder({
      height:
        (seatDepth -
          tubeAngleRad +
          params.wheelDiameter *
            Math.sin(degToRad(params.seatToBackrestAngle - 90))) *
        inToMm,
      radius: tubeRad * inToMm,
      segments: segments,
    })
  );
  // let cushionPad = roundedCuboid({
  //   size: [armrestLength * inToMm, 2 * inToMm, armrestCushionHeight * inToMm],
  //   center: [(tubeAngleRad / 2) * inToMm, 0, tubeRad * inToMm],
  //   roundRadius: (tubeRad / 2) * inToMm,
  //   segments: segments,
  // });

  if (params.showArmrest == true) {
    return [armStructure];
    // return [armStructure, cushionPad];
  } else {
    return 0;
  }
}
```

#### Call #7: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 282,
  "end_line": 323
}
```

**Result Size:** 1,138 bytes

**Source Code Retrieved:**

```javascript
function createBackWheel(params) {
  /**
   * Creates the structure of the armrest.
   * @param {Object} params - The parameters for creating the armrest structure.
   * @returns {Object} The armrest structure 3D model.
   */

  let bigWheel = rotateX(
    degToRad(90),
    torus({
      innerRadius: (params.wheelThickness / 2) * inToMm,
      outerRadius:
        (params.wheelDiameter / 2 - params.wheelThickness / 2) * inToMm,
      outerSegments: whhelChairSegments*1.5,
    })
  );
  const wB = [];
  let wBf = 0;

  const wheelSegments = whhelChairSegments;
  for (let i = 0; i < wheelSegments; i++) {
    wB[i] = rotateY(
      degToRad((360 / wheelSegments) * i),
      translate(
        [0, 0, (params.wheelDiameter / 4) * inToMm],
        cylinder({
          height:
            (params.wheelDiameter / 2 - params.wheelThickness / 2) * inToMm,
          radius: 0.15 * inToMm,
          segments: segments,
        })
      )
    );
    if (i == 1) {
      wBf = union(wB[i], wB[i - 1]);
    } else if (i > 1) {
      wBf = union(wBf, wB[i]);
    }
  }

  return [bigWheel, colorize(colorNameToRgb("silver"), union(wBf))];
}
```

#### Call #8: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 325,
  "end_line": 344
}
```

**Result Size:** 579 bytes

**Source Code Retrieved:**

```javascript
function createBackWheelStructure(params, wheelBase) {
  /**
   * Creates the structure of the back wheel holder.
   * @param {Object} params - The parameters for creating the back wheel holder structure.
   * @returns {Object} The back wheel holder structure 3D model.
   */

  let wheelStructure = translate(
    [0, (wheelBase / 2) * inToMm, (params.wheelDiameter / 2) * inToMm],
    rotateX(
      degToRad(90),
      cylinder({
        height: (wheelBase + 2) * inToMm,
        radius: 0.5 * inToMm,
        segments: segments,
      })
    )
  );
  return wheelStructure;
}
```

#### Call #9: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 346,
  "end_line": 363
}
```

**Result Size:** 565 bytes

**Source Code Retrieved:**

```javascript
function createWheelHandle(params) {
  /**
   * Creates the structure of the back wheel handle.
   * @param {Object} params - The parameters for creating the back wheel handle.
   * @returns {Object} The back wheel handle structure 3D model.
   */
  const wheelHandleRad = (params.wheelDiameter - 1) / 2; // offset: 1

  let wheelHandle = rotateX(
    degToRad(90),
    torus({
      innerRadius: wheelHandleThick * inToMm,
      outerRadius: (wheelHandleRad - wheelHandleThick) * inToMm,
      outerSegments: whhelChairSegments,
    })
  );
  return wheelHandle;
}
```

#### Call #10: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 365,
  "end_line": 555
}
```

**Result Size:** 5,104 bytes

**Source Code Retrieved:**

```javascript
function createFrontWheel(params) {
  /**
   * Creates the front wheel 3D model.
   * @param {Object} params - The parameters for creating the front wheel.
   * @returns {Object} The front wheel 3D model.
   */

  const height =
    params.seatPanHeight -
    tubeAngleRad -
    (smallWheelRad * 2 + smallWheelThick * 2);
  const castorFolkMov =
    ((smallWheelRad + smallWheelThick * 2) *
      Math.cos(degToRad(params.castorForkAngle))) /
    2;
  let frontWheel = translate(
    [-castorFolkMov * inToMm, 0, 0],
    union(
      rotateX(
        degToRad(90),
        cylinder({ height: 0.1, radius: smallWheelRad * inToMm, segment: whhelChairSegments })
      ),
      rotateX(
        degToRad(90),
        torus({
          innerRadius: smallWheelThick * inToMm,
          outerRadius: (smallWheelRad - smallWheelThick) * inToMm,
          outerSegments: whhelChairSegments,
        })
      )
    )
  );
  let fwLowCirc = translate(
    [-castorFolkMov * inToMm, 0, 0],
    union(
      translate(
        [0, ((smallWheelThick * 3) / 2) * inToMm, 0],
        rotateX(
          degToRad(90),
          cylinder({ height: frontWheelGrabThick * inToMm, radius: 1 * inToMm })
        )
      ),
      translate(
        [0, ((smallWheelThick * 3) / 2) * inToMm, 0],
        rotateX(
          degToRad(90),
          cylinder({ height: frontWheelGrabThick * inToMm, radius: 1 * inToMm })
        )
      ),
      translate(
        [0, ((-smallWheelThick * 3) / 2) * inToMm, 0],
        rotateX(
          degToRad(90),
          cylinder({ height: frontWheelGrabThick * inToMm, radius: 1 * inToMm })
        )
      )
    )
  );
  let fwUpCirc = union(
    translate(
      [
        0,
        ((smallWheelThick * 3) / 2) * inToMm,
        (smallWheelRad / 2 +
          smallWheelThick -
          (1 * Math.cos(degToRad(params.castorForkAngle))) / 2) *
          inToMm,
      ],
      rotateX(
        degToRad(90),
        cylinder({ height: frontWheelGrabThick * inToMm, radius: 1 * inToMm })
      )
    ),
    translate(
      [
        0,
        ((-smallWheelThick * 3) / 2) * inToMm,
        (smallWheelRad / 2 +
          smallWheelThick -
          (1 * Math.cos(degToRad(params.castorForkAngle))) / 2) *
          inToMm,
      ],
      rotateX(
        degToRad(90),
        cylinder({ height: frontWheelGrabThick * inToMm, radius: 1 * inToMm })
      )
    )
  );
  let fwUpCube = union(
    cuboid({
      size: [
        (smallWheelRad / 2) * inToMm,
        smallWheelThick * 3 * inToMm,
        frontWheelGrabThick * inToMm,
      ],
      center: [
        0,
        0,
        (smallWheelRad + smallWheelThick * 2 - frontWheelGrabThick / 2) *
          inToMm,
      ],
    }),
    cuboid({
      size: [
        (smallWheelRad / 2) * inToMm,
        frontWheelGrabThick * inToMm,
        ((smallWheelRad +
          smallWheelThick * 2 +
          1 * Math.cos(degToRad(params.castorForkAngle))) /
          2) *
          inToMm,
      ],
      center: [
        0,
        ((smallWheelThick * 3) / 2) * inToMm,
        (((smallWheelRad / 2 + smallWheelThick) * 3) / 2 -
          (1 * Math.cos(degToRad(params.castorForkAngle))) / 3) *
          inToMm,
      ],
    }),
    cuboid({
      size: [
        2 * inToMm,
        frontWheelGrabThick * inToMm,
        ((smallWheelRad +
          smallWheelThick * 2 +
          1 * Math.cos(degToRad(params.castorForkAngle))) /
          2) *
          inToMm,
      ],
      center: [
        0,
        ((-smallWheelThick * 3) / 2) * inToMm,
        (((smallWheelRad / 2 + smallWheelThick) * 3) / 2 -
          (1 * Math.cos(degToRad(params.castorForkAngle))) / 3) *
          inToMm,
      ],
    })
  );
  let fwLowCube = translate(
    [-castorFolkMov * inToMm, 0, 0],
    rotateY(
      degToRad(90 - params.castorForkAngle),
      union(
        cuboid({
          size: [
            (smallWheelRad / 2) * inToMm,
            frontWheelGrabThick * inToMm,
            ((smallWheelRad + smallWheelThick * 2) / 2) * inToMm,
          ],
          center: [
            0,
            ((smallWheelThick * 3) / 2) * inToMm,
            ((smallWheelRad / 2 + smallWheelThick) / 2) * inToMm,
          ],
        }),
        cuboid({
          size: [
            2 * inToMm,
            frontWheelGrabThick * inToMm,
            ((smallWheelRad + smallWheelThick * 2) / 2) * inToMm,
          ],
          center: [
            0,
            ((-smallWheelThick * 3) / 2) * inToMm,
            ((smallWheelRad / 2 + smallWheelThick) / 2) * inToMm,
          ],
        })
      )
    )
  );
  let fwCil = translate(
    [-castorFolkMov * inToMm, 0, 0],
    rotateX(
      degToRad(90),
      cylinder({
        height: smallWheelThick * 3 * inToMm,
        radius: frontWheelGrabThick * inToMm,
      })
    )
  );
  let fwBar = cylinder({
    height: height * inToMm,
    radius: tubeRad * inToMm,
    center: [0, 0, (smallWheelRad + smallWheelThick * 2 + height / 2) * inToMm],
    segments: segments,
  });
  let fwGrab = union(fwLowCirc, fwUpCirc, fwUpCube, fwCil, fwLowCube);

  return [frontWheel, fwGrab, fwBar];
}
```

#### Call #11: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 562,
  "end_line": 666
}
```

**Result Size:** 2,560 bytes

**Source Code Retrieved:**

```javascript
function createLegrestStructure(params, side, legrestHeight) {
  let legrestPosY =
    side == 0
      ? params.legrestLength / 2 + tubeRad
      : -(params.legrestLength / 2 + tubeRad);

  let legStructure = union(
    translate(
      [-tubeAngleRad * inToMm, 0, (legrestHeight / 2) * inToMm],
      rotateX(
        degToRad(90),
        torus({
          innerRadius: tubeRad * inToMm,
          outerRadius: tubeAngleRad * inToMm,
          innerSegments: segments,
          outerSegments: segments,
          outerRotation: degToRad(params.legrestAngle),
        })
      )
    ),
    cylinder({
      height: legrestHeight * inToMm,
      radius: tubeRad * inToMm,
      segments: segments,
    })
  );

  let legLowStructure = translate(
    [(legrestHeight / 4) * inToMm, 0, -(legrestHeight / 2) * inToMm],
    rotateY(
      degToRad(90),
      cylinder({
        height: (legrestHeight / 2) * inToMm,
        radius: tubeRad * inToMm,
        segments: segments,
      })
    )
  );

  let legRestBase = union(
    roundedCuboid({
      size: [
        (legrestHeight / 2) * inToMm,
        (params.legrestLength + tubeRad) * inToMm,
        0.1 * inToMm,
      ],
      center: [
        (legrestHeight / 2 - tubeAngleRad / 2) * inToMm,
        legrestPosY * inToMm,
        -(legrestHeight / 2) * inToMm,
      ],
      roundRadius: 0.01 * inToMm,
      segments: segments,
    }),
    translate(
      [
        (legrestHeight / 2 - tubeAngleRad / 2) * inToMm,
        0,
        -(legrestHeight / 2) * inToMm,
      ],
      rotateY(
        degToRad(90),
        cylinder({
          height: (legrestHeight / 2) * inToMm,
          radius: (tubeRad + 0.1) * inToMm,
          segments: segments,
        })
      )
    )
  );

  const legrestZOffset =
    (legrestHeight / 2 + tubeAngleRad) *
    Math.sin(degToRad(params.legrestAngle));

  const tubeOffset = tubeRad * Math.cos(degToRad(params.legrestAngle)) * 2;

  let legrest = union(
    translate(
      [
        -(
          tubeAngleRad +
          1 +
          (legrestHeight * Math.cos(degToRad(params.legrestAngle))) / 2
        ) * inToMm,
        0,
        (legrestZOffset - tubeOffset) * inToMm,
      ],
      rotateY(
        degToRad(90),
        cylinder({
          height: (2 + 1 * Math.cos(degToRad(params.legrestAngle))) * inToMm,
          radius: tubeRad * inToMm,
          segments: segments,
        })
      )
    ),
    rotateY(
      degToRad(-(90 - params.legrestAngle)),
      union(legStructure, legLowStructure, legRestBase)
    )
  );

  return legrest;
}
```

#### Call #12: refer_to_source_code

**Timestamp:** 13:51:15.917  
**Arguments:**

```json
{
  "start_line": 668,
  "end_line": 917
}
```

**Result Size:** 7,448 bytes

**Source Code Retrieved:**

```javascript
function createManualWheelchair(params) {
  // Parameters relations as previously defined
  const wBClearance = 1;
  const seatWidth = params.seatWidth;
  const seatDepth = params.seatDepth;
  const backrestHeight = seatWidth;
  const backrestWidth = seatWidth;
  const armrestHeight = 0.5 * seatWidth;
  const armrestLength = 0.6 * seatDepth;
  const wheelBase =
    seatWidth +
    tubeRad * 4 +
    (params.wheelThickness / 2) * 2 +
    wBClearance +
    params.wheelDiameter * Math.sin(degToRad(params.camberAngle));

  const overallWidth = wheelBase + 2 * wheelHandleThick + wBClearance;
  const seatToArmrestHeight = 0.5 * seatWidth;
  const overallLength = 0;
  const overallHeight = 34;
  const pushHandleHeight = overallHeight;

  // Adjust the center point to be at the middle of the wheelchair
  const centerOffsetY = wheelBase / 2;
  const centerOffsetX = seatDepth / 2;

  // generate the parts of the 3d model with adjusted positions
  let seatCushion = colorize(
    colorNameToRgb("black"),
    translate(
      [-centerOffsetX * inToMm, -centerOffsetY * inToMm, 0],
      createSeatCushion(params, seatDepth, wheelBase)
    )
  );
  let seatrest = colorize(
    colorNameToRgb("silver"),
    translate(
      [-centerOffsetX * inToMm, -centerOffsetY * inToMm, 0],
      union(
        translate(
          [
            (seatDepth / 2 + tubeRad / 2) * inToMm,
            (wheelBase / 2 - backrestWidth / 2 - tubeRad) * inToMm,
            params.seatPanHeight * inToMm,
          ],
          createSeatrestStructure(params, seatDepth)
        ),
        translate(
          [
            (seatDepth / 2 + tubeRad / 2) * inToMm,
            (wheelBase / 2 + backrestWidth / 2 + tubeRad) * inToMm,
            params.seatPanHeight * inToMm,
          ],
          createSeatrestStructure(params, seatDepth)
        ),
        createBackWheelStructure(params, wheelBase),
        createSeatrest(params, seatDepth, backrestWidth, wheelBase)
      )
    )
  );
  let armrests = colorize(
    colorNameToRgb("silver"),
    translate(
      [-centerOffsetX * inToMm, -centerOffsetY * inToMm, 0],
      union(
        translate(
          [
            ((seatDepth - tubeAngleRad) / 2) * inToMm,
            (wheelBase / 2 - backrestWidth / 2 - tubeRad * 3 - 0.1) * inToMm,
            (armrestHeight + params.seatPanHeight) * inToMm,
          ],
          createArmrest(params, seatDepth, armrestLength)
        ),
        translate(
          [
            ((seatDepth - tubeAngleRad) / 2) * inToMm,
            (wheelBase / 2 + backrestWidth / 2 + tubeRad * 3 + 0.1) * inToMm,
            (armrestHeight + params.seatPanHeight) * inToMm,
          ],
          createArmrest(params, seatDepth, armrestLength)
        )
      )
    )
  );
  let backWheels = colorize(
    colorNameToRgb("silver"),
    translate(
      [-centerOffsetX * inToMm, -centerOffsetY * inToMm, 0],
      union(
        translate(
          [0, 0, (params.wheelDiameter / 2) * inToMm],
          rotateX(-degToRad(params.camberAngle), createBackWheel(params))
        ),
        translate(
          [0, wheelBase * inToMm, (params.wheelDiameter / 2) * inToMm],
          rotateX(degToRad(params.camberAngle), createBackWheel(params))
        )
      )
    )
  );
  let wheelHandles = colorize(
    colorNameToRgb("dimgrey"),
    translate(
      [-centerOffsetX * inToMm, -centerOffsetY * inToMm, 0],
      union(
        translate(
          [
            0,
            (0 - (overallWidth - wheelBase) / 2) * inToMm,
            (params.wheelDiameter / 2) * inToMm,
          ],
          rotateX(-degToRad(params.camberAngle), createWheelHandle(params))
        ),
        translate(
          [
            0,
            (overallWidth - 0.25 - (overallWidth - wheelBase) / 2) * inToMm,
            (params.wheelDiameter / 2) * inToMm,
          ],
          rotateX(degToRad(params.camberAngle), createWheelHandle(params))
        )
      )
    )
  );
  let frontWheels = colorize(
    colorNameToRgb("silver"),
    translate(
      [-centerOffsetX * inToMm, -centerOffsetY * inToMm, 0],
      union(
        translate(
          [
            (seatDepth + tubeAngleRad + tubeRad) * inToMm,
            (wheelBase / 2 - backrestWidth / 2 - tubeRad) * inToMm,
            smallWheelRad * inToMm,
          ],
          createFrontWheel(params)
        ),
        translate(
          [
            (seatDepth + tubeAngleRad + tubeRad) * inToMm,
            (wheelBase / 2 + backrestWidth / 2 + tubeRad) * inToMm,
            smallWheelRad * inToMm,
          ],
          createFrontWheel(params)
        )
      )
    )
  );
  let backrest = colorize(
    colorNameToRgb("silver"),
    translate(
      [-centerOffsetX * inToMm, -centerOffsetY * inToMm, 0],
      translate(
        [
          ((params.wheelDiameter *
            Math.sin(degToRad(params.seatToBackrestAngle - 90))) /
            2) *
            inToMm,
          0,
          0,
        ],
        rotateY(
          degToRad(90 - params.seatToBackrestAngle),
          union(
            createBackrest(params, backrestHeight, backrestWidth, wheelBase),
            translate(
              [
                0,
                (wheelBase / 2 - backrestWidth / 2 - tubeRad) * inToMm,
                ((params.seatBackHeight +
                  backrestHeight -
                  params.wheelDiameter / 2) /
                  2 +
                  params.wheelDiameter / 2) *
                  inToMm,
              ],
              createBackrestStructure(params, backrestHeight, wheelBase)
            ),
            translate(
              [
                0,
                (wheelBase / 2 + backrestWidth / 2 + tubeRad) * inToMm,
                ((params.seatBackHeight +
                  backrestHeight -
                  params.wheelDiameter / 2) /
                  2 +
                  params.wheelDiameter / 2) *
                  inToMm,
              ],
              createBackrestStructure(params, backrestHeight, wheelBase)
            )
          )
        )
      )
    )
  );

  const legrestHeight =
    params.seatPanHeight - (smallWheelRad * 2 + smallWheelThick * 2);

  let legrests = colorize(
    colorNameToRgb("silver"),
    translate(
      [-centerOffsetX * inToMm, -centerOffsetY * inToMm, 0],
      union(
        translate(
          [
            (seatDepth +
              (tubeAngleRad * 3) / 2 +
              tubeRad +
              (tubeAngleRad +
                1 +
                (legrestHeight * Math.cos(degToRad(params.legrestAngle))) /
                  2)) *
              inToMm,
            (wheelBase / 2 - backrestWidth / 2 - tubeRad) * inToMm,
            legrestHeight * inToMm,
          ],
          createLegrestStructure(params, 0, legrestHeight)
        ),
        translate(
          [
            (seatDepth +
              (tubeAngleRad * 3) / 2 +
              tubeRad +
              (tubeAngleRad +
                1 +
                (legrestHeight * Math.cos(degToRad(params.legrestAngle))) /
                  2)) *
              inToMm,
            (wheelBase / 2 + backrestWidth / 2 + tubeRad) * inToMm,
            legrestHeight * inToMm,
          ],
          createLegrestStructure(params, 1, legrestHeight)
        )
      )
    )
  );
  let model = union(
    seatCushion,
    seatrest,
    armrests,
    backWheels,
    wheelHandles,
    frontWheels,
    backrest,
    legrests
  );
  return model;
}
```

---

## Integrity Verification

**Integrity Score:** `0.0%`

**Checks:** 0/0 passed

### ✅ All Checks Passed

AST transformation quality is within acceptable ranges.

---

*Report generated for IRIS AST transformation analysis*