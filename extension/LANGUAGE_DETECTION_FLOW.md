# IRIS Language Detection Flow

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Page                              │
│                     (e.g., /blob/main/app.ts)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ User clicks "Analyze Structure"
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXTENSION: section-panel.js                        │
│                                                                 │
│  1. Extract code from DOM                                       │
│     → DOMHelpers.extractCode()                                  │
│                                                                 │
│  2. Detect language from URL                                    │
│     → DOMHelpers.detectLanguage()                               │
│     → Reads window.location.pathname                            │
│     → Matches file extension against langMap                    │
│     → Returns: 'javascript', 'typescript', 'python', etc.       │
│                                                                 │
│  3. Validate language                                           │
│     → Check if in supportedLanguages array                      │
│     → If not supported: Alert user and abort                    │
│                                                                 │
│  4. Log detection                                               │
│     → Console: "✅ Detected language: TYPESCRIPT"               │
│                                                                 │
│  5. Send to backend                                             │
│     → chrome.runtime.sendMessage({                              │
│         action: "analyzeStructure",                             │
│         code: "...",                                            │
│         language: "typescript",                                 │
│         filepath: "/user/repo/blob/main/app.ts"                 │
│       })                                                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP POST /analyze-structure
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXTENSION: background.js                           │
│                                                                 │
│  Relay message to backend (avoid CORS)                          │
│  → fetch(BACKEND_URL/analyze-structure, {                       │
│      body: JSON.stringify({                                     │
│        code: "...",                                             │
│        language: "typescript",  ← Must match backend parser     │
│        filepath: "..."                                          │
│      })                                                          │
│    })                                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP POST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND: server.py                                 │
│                                                                 │
│  @app.route('/analyze-structure')                               │
│  def analyze_structure():                                       │
│    data = request.get_json()                                    │
│    language = data.get('language', 'javascript')                │
│    ↓                                                             │
└────┼────────────────────────────────────────────────────────────┘
     │
     │ language = 'typescript'
     ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND: ast_parser.py                             │
│                                                                 │
│  class ASTParser:                                               │
│    def __init__(self):                                          │
│      self.parsers = {                                           │
│        'javascript': self._init_js_parser(),                    │
│        'typescript': self._init_ts_parser(),  ← MATCH!          │
│        'python': self._init_py_parser(),                        │
│        'go': self._init_go_parser(),                            │
│        'java': self._init_java_parser(),                        │
│        'c': self._init_c_parser(),                              │
│        'cpp': self._init_cpp_parser(),                          │
│      }                                                           │
│                                                                 │
│    def parse(self, code, language):                             │
│      parser = self.parsers.get(language.lower())                │
│      if not parser:                                             │
│        raise ValueError(f"Unsupported: {language}")             │
│      tree = parser.parse(bytes(code, "utf8"))                   │
│      return tree                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ AST Tree
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          BACKEND: function_extractor.py                         │
│                                                                 │
│  Extract all functions from AST                                 │
│  → For each function node:                                      │
│    - Get name, params, line numbers                             │
│    - Pass to section_detector                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Function objects
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          BACKEND: section_detector.py                           │
│                                                                 │
│  Detect sections within each function                           │
│  → Classify statements (setup, validation, etc.)                │
│  → Group into sections                                          │
│  → Generate descriptions                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Structured JSON
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Response JSON                                      │
│  {                                                              │
│    "success": true,                                             │
│    "language": "typescript",                                    │
│    "filepath": "/user/repo/blob/main/app.ts",                   │
│    "file_summary": {                                            │
│      "total_lines": 150,                                        │
│      "total_functions": 3,                                      │
│      "complexity": "medium"                                     │
│    },                                                            │
│    "functions": [                                               │
│      {                                                           │
│        "name": "fetchUser",                                     │
│        "start_line": 10,                                        │
│        "end_line": 45,                                          │
│        "params": ["userId"],                                    │
│        "sections": [                                            │
│          {                                                       │
│            "type": "validation",                                │
│            "icon": "✅",                                         │
│            "start_line": 11,                                    │
│            "end_line": 14,                                      │
│            "description": "Validates input parameters..."       │
│          },                                                      │
│          ...                                                     │
│        ]                                                         │
│      },                                                          │
│      ...                                                         │
│    ]                                                             │
│  }                                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ chrome.runtime.sendMessage callback
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXTENSION: section-panel.js                        │
│                                                                 │
│  if (response.success) {                                        │
│    this.data = response.data;                                   │
│    this.render();                                               │
│  }                                                              │
│                                                                 │
│  render() {                                                     │
│    1. Create panel container                                    │
│    2. Show language badge (with color)                          │
│    3. Show file summary                                         │
│    4. List functions with sections                              │
│    5. Add click handlers for navigation                         │
│  }                                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              USER SEES                                          │
│                                                                 │
│  ╔════════════════════════════╗                                │
│  ║ 🤖 IRIS Structure View     ║                                │
│  ╠════════════════════════════╣                                │
│  ║ 🔵 TypeScript              ║  ← Language badge              │
│  ║                            ║                                │
│  ║ 📊 File Overview           ║                                │
│  ║ 150 lines | 3 functions    ║                                │
│  ║                            ║                                │
│  ║ fetchUser(userId)          ║                                │
│  ║   Lines 10-45 • 3 sections ║                                │
│  ║   ✅ Validation (11-14)    ║  ← Clickable                   │
│  ║   🌐 API Call (16-22)      ║  ← Clickable                   │
│  ║   ↩️ Return (24-26)        ║  ← Clickable                   │
│  ╚════════════════════════════╝                                │
└─────────────────────────────────────────────────────────────────┘
```

## Critical Language Mapping Points

### ⚠️ MUST MATCH Exactly

```
Frontend Detection    →    Backend Parser Key
────────────────────       ──────────────────
'javascript'          →    'javascript'      ✅
'typescript'          →    'typescript'      ✅
'python'              →    'python'          ✅
'go'                  →    'go'              ✅
'java'                →    'java'            ✅
'c'                   →    'c'               ✅
'cpp'                 →    'cpp'             ✅
```

### ❌ Common Mistakes

```
Frontend sends        Backend expects       Result
──────────────        ───────────────       ──────
'javascript'     →    'typescript'          ❌ WRONG PARSER
'js'             →    'javascript'          ❌ NOT FOUND
'JS'             →    'javascript'          ⚠️ OK (case-insensitive)
'typescript'     →    'javascript'          ❌ WRONG PARSER
```

## File Extension to Language Mapping

```
Extension  →  Language ID  →  Backend Parser
─────────      ───────────     ──────────────
.js        →   javascript  →   tree-sitter-javascript
.jsx       →   javascript  →   tree-sitter-javascript
.mjs       →   javascript  →   tree-sitter-javascript
.cjs       →   javascript  →   tree-sitter-javascript

.ts        →   typescript  →   tree-sitter-typescript
.tsx       →   typescript  →   tree-sitter-typescript

.py        →   python      →   tree-sitter-python
.pyw       →   python      →   tree-sitter-python
.pyi       →   python      →   tree-sitter-python

.go        →   go          →   tree-sitter-go

.java      →   java        →   tree-sitter-java

.c         →   c           →   tree-sitter-c
.h         →   c           →   tree-sitter-c

.cpp       →   cpp         →   tree-sitter-cpp
.cc        →   cpp         →   tree-sitter-cpp
.cxx       →   cpp         →   tree-sitter-cpp
.hpp       →   cpp         →   tree-sitter-cpp
.hxx       →   cpp         →   tree-sitter-cpp
.hh        →   cpp         →   tree-sitter-cpp
```

## Error Handling Flow

```
┌─────────────────────────────────────────────┐
│  User visits file with unsupported extension│
│  (e.g., .rb, .php, .rs)                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  detectLanguage()                           │
│  → No match in langMap                      │
│  → Returns 'javascript' (default)           │
│  → Logs warning to console                  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Validation in analyze()                    │
│  → 'javascript' is supported                │
│  → Proceeds with analysis                   │
│  → But may fail if syntax incompatible      │
└─────────────────────────────────────────────┘

Alternative: Add to unsupported list
┌─────────────────────────────────────────────┐
│  detectLanguage()                           │
│  → Add '.rb': 'ruby' to langMap             │
│  → But DON'T add to supportedLanguages      │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Validation in analyze()                    │
│  → 'ruby' not in supportedLanguages         │
│  → Alert user with clear message            │
│  → Abort gracefully                         │
└─────────────────────────────────────────────┘
```

## Language Detection Code Locations

```
📁 Extension (Frontend)
├── modules/dom-helpers.js
│   └── detectLanguage()           ← Main detection logic
│       - Reads window.location.pathname
│       - Matches against langMap
│       - Returns language identifier
│
├── modules/section-panel.js
│   ├── analyze()                  ← Validation
│   │   - Checks supportedLanguages array
│   │   - Shows error if unsupported
│   ├── _createLanguageBadge()     ← UI display
│   │   - Shows language name
│   │   - Color-coded
│   └── render()                   ← Uses badge
│
└── content.js
    ├── initSectionPanel()         ← Calls detectLanguage()
    └── handleButtonClick()        ← Calls detectLanguage()

📁 Backend (Python)
├── src/parser/ast_parser.py
│   ├── __init__()                 ← Initializes parsers dict
│   └── parse()                    ← Validates language
│
└── src/server.py
    └── /analyze-structure         ← Receives language param
```

---

**Last Updated:** January 9, 2026  
**Status:** ✅ All language flows verified and documented
