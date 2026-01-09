# IRIS Feature Specification Document
**Project Pivot: January 9, 2026**

---

## 1. What is this project?

**IRIS** helps developers read and understand code faster by providing **structural context** when viewing code on GitHub.

### The Problem
- Reading unfamiliar code is cognitively exhausting
- Large files (500+ lines) are overwhelming
- Hard to understand "what does this file do?" without reading everything
- Scrolling to find function definitions breaks concentration

### The Solution
**Side panel on GitHub** that shows:
1. File summary (what this file does)
2. List of all functions with descriptions
3. Click function → jump to code

**Goal**: Reduce **cognitive load** by showing structure before diving into details.

---

## 2. What to implement (MVP)

### Backend: Code Structure Analysis
**Input**: Source code + language (JavaScript, Python, Go, etc.)

**Output**: Structured JSON with:
```json
{
  "file_summary": {
    "total_lines": 150,
    "total_functions": 5,
    "main_purpose": "Handles 3D model loading and scene setup"
  },
  "functions": [
    {
      "name": "loadHumanModel",
      "start_line": 1,
      "end_line": 70,
      "params": ["modelFile", "posX", "posY", "posZ", "callback"],
      "summary": "Loads and positions 3D human model on wheelchair"
    },
    {
      "name": "loadWheelchair",
      "start_line": 72,
      "end_line": 120,
      "params": ["wheelchairType", "params"],
      "summary": "Loads wheelchair mesh and applies parameters"
    }
  ]
}
```

**Technical approach**: Use AST parsing (Tree-sitter) to extract function definitions.

**Note**: Do NOT use regex. AST gives accurate structure understanding.

---

### Frontend: Side Panel UI
**Chrome Extension** that adds a sidebar to GitHub code pages.

**UI Components**:
1. **Header**: "🤖 IRIS" with close button
2. **File Overview Section**: Lines count, function count, main purpose
3. **Functions List**: Each function shows:
   - Name + params
   - Line range
   - One-sentence summary
   - Click → scroll to that line in code

**Interaction**:
- Button on GitHub page: "Analyze Structure"
- Click button → Panel slides in from right
- Click function in panel → Jump to code + highlight
- Close button → Panel slides out

**Design**: Dark theme matching GitHub, smooth animations (300ms).

---

## 3. Implementation Order

### Phase 1: Backend Foundation
**Deliverable**: `/analyze-structure` API endpoint

**Steps**:
1. Install Tree-sitter (AST parser library) 
2. Create AST parser class supporting JavaScript, Python, Go `/backend/src/parser/ast_parser.py`
3. Create function extractor that finds all function definitions `/backend/src/analyzer/function_extractor.py`
4. Create Flask endpoint that accepts code and returns JSON
5. Test with real GitHub files

**Current Status**:
- AST parser module implemented [supports JS, TS, Python, Go, C, C++, Java]
- Function extraction module implemented (BUT has some problems with edge cases)
- Flask API endpoint created

---

### Phase 2: Frontend UI
**Deliverable**: Working Chrome extension with side panel

**Steps**:
1. Add feature flag system (disable old noise eraser code)
2. Create "Analyze Structure" button on GitHub pages
3. Create side panel component
4. Connect button → backend API → render panel
5. Implement click-to-jump interaction
6. Add smooth animations and styling

---

## 4. Examples

### Example Input (Source Code)
```javascript
// File: loader.js (150 lines)

function loadHumanModel(
  humanModelFile,
  humanPosX, humanPosY, humanPosZ,
  callback
) {
  const loader = new PLYLoader();
  loader.load(humanModelFile, function (geometry) {
    humanGeometry = geometry;
    
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
    
    // ... 60 more lines of mesh setup ...
    
    scene.add(humanMesh);
    if (callback) callback();
  });
}

function loadWheelchair(wheelchairType, wheelchairParams) {
  // ... 50 lines ...
}

function calculatePosition(mesh, params) {
  // ... 30 lines ...
}
```

---

### Example Output (API Response)
```json
{
  "success": true,
  "language": "javascript",
  "file_summary": {
    "total_lines": 150,
    "total_functions": 3,
    "main_purpose": "3D model loading and scene management"
  },
  "functions": [
    {
      "name": "loadHumanModel",
      "start_line": 3,
      "end_line": 70,
      "params": ["humanModelFile", "humanPosX", "humanPosY", "humanPosZ", "callback"],
      "summary": "Loads PLY model file and positions human mesh on wheelchair"
    },
    {
      "name": "loadWheelchair",
      "start_line": 72,
      "end_line": 120,
      "params": ["wheelchairType", "wheelchairParams"],
      "summary": "Creates wheelchair mesh based on type and parameters"
    },
    {
      "name": "calculatePosition",
      "start_line": 122,
      "end_line": 150,
      "params": ["mesh", "params"],
      "summary": "Calculates relative position between meshes"
    }
  ]
}
```

---

### Target UI (Side Panel)
```
┌──────────────────────────────────────────────────────────┐
│ GitHub: user/repo > blob > main > src/loader.js         │
├─────────────────┬────────────────────────────────────────┤
│                 │                                        │
│  🤖 IRIS        │  Code View                             │
│  ──────────     │                                        │
│                 │   1  function loadHumanModel(          │
│  📊 Overview    │   2    humanModelFile,                 │
│  ────────────   │   3    humanPosX, humanPosY,          │
│  150 lines      │   4    humanPosZ,                      │
│  3 functions    │   5    callback                        │
│                 │   6  ) {                               │
│  Purpose:       │   7    const loader = new PLY...      │
│  3D model       │   8    loader.load(humanModel...      │
│  loading and    │   9      // ... geometry setup        │
│  scene mgmt     │  10    });                             │
│                 │  11  }                                 │
│  ──────────     │  12                                    │
│                 │  13  function loadWheelchair(          │
│  📦 Functions   │  14    wheelchairType,                 │
│  ────────────   │  15    wheelchairParams               │
│                 │  16  ) {                               │
│  loadHumanModel │  17    // ...                          │
│  Lines 3-70     │  ...                                   │
│  Loads PLY file │                                        │
│  and positions  │                                        │
│  human mesh     │                                        │
│  [Click to jump]│                                        │
│                 │                                        │
│  loadWheelchair │                                        │
│  Lines 72-120   │                                        │
│  Creates chair  │                                        │
│  mesh based on  │                                        │
│  type & params  │                                        │
│  [Click to jump]│                                        │
│                 │                                        │
│  calculatePos   │                                        │
│  Lines 122-150  │                                        │
│  Calculates     │                                        │
│  relative pos   │                                        │
│  [Click to jump]│                                        │
│                 │                                        │
│  [×] Close      │                                        │
└─────────────────┴────────────────────────────────────────┘
```

**Key UI elements**:
- Fixed position sidebar (right side)
- Dark theme (#1e1e1e background)
- Scrollable content
- Hover effects on function items
- Smooth slide-in/out animation
- Clicking function → scroll code + highlight lines

---

## 5. Technical Constraints

### Must Use
- **Tree-sitter** for AST parsing (not regex)
- **Flask** for backend API
- **Chrome Extension Manifest V3** for frontend
- **Vanilla JavaScript** (no React/Vue)

### Must NOT
- Don't modify original source code on GitHub
- Don't break existing GitHub functionality
- Don't use complex build systems
- Don't add external dependencies in extension

### Performance Requirements
- API response < 2 seconds for 500 line files
- UI animation smooth (60fps)
- No memory leaks

---

## 6. Future Phases (Not Now)

After MVP is working:
- **Phase 2**: Variable tracking (click variable → highlight all uses)
- **Phase 3**: Section detection inside functions
- **Phase 4**: Noise dimming (AST-based)
- **Phase 5**: Execution path visualization

**Focus on MVP first.** Don't implement these yet.

---

## 7. Key Decisions

### Why AST over Regex?
- Regex: `function (\w+)\(` - breaks on complex syntax
- AST: Understands actual code structure
- Example: Arrow functions, nested functions, class methods

### Why Function-level (not Section-level)?
- Functions are natural boundaries
- Easier to understand: "This file has 5 functions"
- Section inside functions is advanced feature (later)

### Why Side Panel (not inline)?
- Doesn't modify original code
- Always visible while scrolling
- Can show more context

---

## 8. Development Context

- Remote development via VS Code tunnel
- Limited network access
- Simple architecture preferred
- Minimal dependencies

---

## Quick Reference

**Backend Entry**: `backend/src/server.py`
**Frontend Entry**: `extension/content.js`
**API Endpoint**: `POST /analyze-structure`
**Tree-sitter Docs**: https://tree-sitter.github.io/