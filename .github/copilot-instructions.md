# IRIS - Intelligent Review & Insight System
**AI Agent Instructions [Pivoted 1/4/26]**

---

## 🚨 PROJECT PIVOT NOTICE (January 4, 2026)
As of January 4, 2026, this project has pivoted from a simple syntax translation tool to a **Universal Cognitive Audit Lens**. The core objective is focused on reducing the cognitive load for human developers when auditing and reviewing complex or AI-generated code.

**Current Codebase State:** The repository contains the Noise Eraser v1 implementation using Chrome Extension + Flask backend architecture. Legacy converter code has been fully removed.

---

## 1. Project Vision
**"The Auditor’s Lens: Optimizing Code Perception for the AI Era"**
This tool is designed to bridge the gap between high-speed AI code generation ("Vibe Coding") and the human bottleneck of code verification. It aims to innovate how humans perceive by mitigating "Cognitive Load" and process code by prioritizing "Signal" over "Noise."

## 2. Retrospective & Rationale
* **Initial Prototype:** Successfully built an initial syntax translation lens for GitHub in 6 hours to validate the Chrome Extension approach.
* **Key Insight:** Syntax translation is secondary to the real problem: **Information Overload** and **Context Switching**.
* **Pivot Goal:** To build a tool that helps reviewers and open-source explorers understand "The Why" and "The Core Logic" faster than ever.

## 3. Core Cognitive Load Factors & Solution Ideas
* **Low Signal-to-Noise Ratio:** Crucial logic is buried under boilerplate.
    * *Solution:* **Noise Eraser** (Dimming/hiding non-essential code).
* **Hidden Intent:** Understanding "How" is easy, but "Why" is hard.
    * *Solution:* **Semantic Intent Overlay** (LLM-generated intent chips).
* **Mental State Simulation:** Tracking variable changes across files is exhausting.
    * *Solution:* **Variable Life-cycle Highlight** (Focusing on a variable's journey).
* **Control Flow Complexity:** Deep nesting leads to losing track of logic branches.
    * *Solution:* **Flow Breadcrumbs** (Visual path of conditions).

## 4. Operational Context (Developer Experience)
* **Main Target Audience:** 
    * **PR Reviewers:** Auditing AI-generated or peer code on GitHub.
    * **Open-Source Explorers:** Analyzing unfamiliar codebases for learning or integration.
* **Target Environment:** Primarily **Chrome Extension** for GitHub, allowing maximum UI flexibility for cognitive experiments.

---

## 🚀 CURRENT DEVELOPMENT FOCUS (Milestone: Noise Eraser v1)

Noise Eraser v1 is now **complete**. The current implementation includes:

* **Primary Feature:** **Noise Eraser v1**
    * Pattern-matching engine to identify "Noise" (error handling, logging, imports, guard clauses).
    * CSS injection logic to dim identified noise (e.g., `opacity: 0.2`).
    * "Focus Mode" toggle UI on the GitHub blob page.
* **Technical Implementation:** 
    * Visual hierarchy modification through CSS opacity in `content.js`.
    * Noise patterns defined for JavaScript, Python, Go, Java, C/C++, Rust, Ruby, PHP.
    * Backend analyzes code structure and returns noise line ranges for extension to dim.
* **Current Status:** Phase 5 (Polish & Enhancement) complete with settings panel, analytics, and multi-language support.

**New data flow:**
GitHub DOM → Extension extracts code → POST to Flask for analysis → Pattern matching identifies noise → Extension applies CSS dimming to specific lines

## Architecture Overview

Two-component system: a Chrome Extension (Manifest V3) and a Flask backend working together to analyze code on GitHub pages.

- **Extension** (`extension/`): Content scripts inject UI into GitHub blob pages, extract code from GitHub's DOM, and apply visual transformations inline
- **Backend** (`backend/src/`): Flask server that provides noise detection and cognitive analysis services

**Data flow:**
GitHub DOM → Extension extracts code → POST to Flask for analysis → Pattern matching identifies noise → Extension applies CSS dimming to specific lines

## Development Context & Constraints

Developed remotely via VS Code Tunnel from a military service computer lab (사이버지식정보방) with limited access. This drives architecture toward:
- Simple, self-contained components (no complex build systems)
- Minimal dependencies (see `requirements.txt`: Flask, flask-cors only)
- Offline-capable workflows where possible

**Backend URL**: Currently uses VS Code dev tunnel (see `extension/config.js`)

## Critical Developer Workflows

**Start backend server**: Run `./scripts/start-server.sh` which activates venv and starts Flask on port 8080

**Load extension in Chrome**:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. "Load unpacked" → select `extension/` directory

**No build step required** - extension files load directly, backend runs with `python src/server.py`

## Noise Detection Logic Principles

The noise detector (`backend/src/analyzer/noise_detector.py`) identifies code patterns based on:

**Noise categories**:
- **Error handling**: try-catch blocks, error checking conditionals
- **Logging**: console.log, print statements, debug calls
- **Imports/Dependencies**: import statements, require calls
- **Guard clauses**: early returns, null checks, validation
- **Boilerplate**: getters/setters, basic constructors

**Line-level analysis**: Return line numbers/ranges for dimming rather than transformed code

**Language support priority**: JavaScript/TypeScript → Python → Go → Java

## Extension DOM Manipulation Strategy

**State management** (`extension/content.js`): Toggle between normal and focus mode via `lensState.active` flag

**DOM strategy**: 
- Apply CSS classes/inline styles to dim specific lines
- Remove styles on toggle to restore full visibility

```javascript
// Target approach for noise dimming
noiseLineNumbers.forEach(lineNum => {
  const lineElement = document.querySelector(`[data-line-number="${lineNum}"]`);
  lineElement.style.opacity = '0.2';
  lineElement.classList.add('iris-noise-dimmed');
});
```

**Line extraction**: `DOMHelpers.getLineNumber()` handles multiple GitHub DOM patterns (React IDs like `LC123`, data attributes, table rows)

**Selectors** (`LENS_CONFIG.selectors`): Targets GitHub's code textarea `#read-only-cursor-text-area` and React line elements `.react-code-line-contents-no-virtualization`

## Module Organization

Extension uses module pattern with global namespaces:
- `window.DOMHelpers`: GitHub DOM queries and code extraction
- `window.EventHandlers`: Button clicks and focus mode state

Backend uses Python package structure with `analyzer/` as the main module imported by `server.py`

## CORS Configuration

Backend allows GitHub origins only:
```python
CORS(app, resources={r"/*": {"origins": ["https://github.com"]}})
```

Extension requests permissions for `https://github.com/*` and backend tunnel URL in `manifest.json`

## Testing & Validation

Test by:
1. Navigate to any code file in a GitHub repo (JavaScript/Python preferred)
2. Extension should inject "Focus Mode" button
3. Click to see noise dimmed inline
4. Verify only boilerplate/logging/error-handling is dimmed, core logic remains prominent
5. Toggle off to restore full visibility

---

## [IMPORTANT] Noise Eraser V1 Implementation Plan
# IRIS - Noise Eraser v1 Development Plan

## 📋 Phase 1: Backend Analyzer Construction

### 1.1 Code Structure Refactoring
```
backend/src/
├── analyzer/          # New creation
│   ├── __init__.py
│   ├── noise_detector.py    # Core logic
│   ├── patterns.py          # Noise pattern definitions
│   └── language_support.py  # Language-specific branching
└── converter/         # Legacy (maintain for now)
    └── main.py
```

**Tasks:**
- Create `analyzer/` directory
- Extract reusable utilities from `converter/main.py` (line parsing, whitespace handling, etc.)

### 1.2 Noise Pattern Definition System
**File: `backend/src/analyzer/patterns.py`**

```python
NOISE_PATTERNS = {
    'javascript': {
        'error_handling': [
            r'try\s*{',
            r'catch\s*\(',
            r'finally\s*{',
            r'if\s*\(.*error.*\)',
        ],
        'logging': [
            r'console\.(log|error|warn|info)',
            r'logger\.',
        ],
        'imports': [
            r'^import\s+',
            r'^require\(',
        ],
        'guards': [
            r'if\s*\(!.*\)\s*return',
            r'if\s*\(.*==\s*null\)',
        ]
    },
    'python': {...},
    'go': {...},
}
```

**Tasks:**
- Build language-specific regex pattern dictionaries
- Priority: JavaScript > Python > Go

### 1.3 Noise Detector Engine
**File: `backend/src/analyzer/noise_detector.py`**

**Core Function:**
```python
def detect_noise(code: str, language: str) -> Dict:
    """
    Returns:
    {
        "noise_lines": [3, 4, 5, 12, 13],  # Line numbers
        "noise_ranges": [
            {"start": 3, "end": 5, "type": "error_handling"},
            {"start": 12, "end": 13, "type": "logging"}
        ],
        "language": "javascript"
    }
    """
```

**Tasks:**
1. Split code into line-by-line segments
2. Apply pattern matching to each line
3. Group consecutive noise lines into ranges
4. Classify noise types (error_handling, logging, etc.)

### 1.4 API Endpoint Modification
**File: `backend/src/server.py`**

```python
@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Request: {"code": "...", "language": "javascript"}
    Response: {
        "success": true,
        "noise_lines": [3, 4, 5],
        "noise_ranges": [...],
        "language": "javascript"
    }
    """
```

**Tasks:**
- Add new `/analyze` endpoint
- Maintain legacy `/convert` (backward compatibility)
- Add language auto-detection logic (based on URL extension)

---

## 📋 Phase 2: Extension Transition (DOM Replacement → CSS Dimming)

### 2.1 Config Update
**File: `extension/config.js`**

```javascript
API_ENDPOINTS: {
  CONVERT: '/convert',  // Legacy
  ANALYZE: '/analyze',  // New
  HEALTH: '/health'
}
```

### 2.2 State Management Modification
**File: `extension/content.js`**

**Current:**
```javascript
lensState = {
    active: false,
    pythonLines: [],
    pythonFullCode: "",
    originalState: {...}
}
```

**New:**
```javascript
lensState = {
    active: false,
    noiseLines: [],           // [3, 4, 5, 12, 13]
    noiseRanges: [],          // [{start, end, type}]
    dimmedElements: new WeakMap(),  // element -> originalOpacity
    language: null
}
```

### 2.3 Dimming Logic Implementation
**Add New Functions:**

```javascript
function applyNoiseDimming(noiseLines) {
    const lineElements = DOMHelpers.getCodeLineElements();
    
    lineElements.forEach(el => {
        const lineNum = DOMHelpers.getLineNumber(el);
        
        if (noiseLines.includes(lineNum)) {
            // Store original opacity
            lensState.dimmedElements.set(el, {
                opacity: el.style.opacity || '1',
                className: el.className
            });
            
            // Apply dimming
            el.style.opacity = '0.2';
            el.classList.add('iris-noise-dimmed');
        }
    });
}

function removeDimming() {
    const lineElements = DOMHelpers.getCodeLineElements();
    
    lineElements.forEach(el => {
        const original = lensState.dimmedElements.get(el);
        if (original) {
            el.style.opacity = original.opacity;
            el.classList.remove('iris-noise-dimmed');
        }
    });
    
    lensState.dimmedElements = new WeakMap();
}
```

### 2.4 Backend Communication Modification
**File: `extension/content.js`**

```javascript
async function analyzeCode(code, language) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { 
                action: "analyzeCode",  // Changed
                code: code,
                language: language 
            },
            (response) => {...}
        );
    });
}
```

**File: `extension/background.js`**

```javascript
async function handleAnalyzeCode(code, language) {
    const apiUrl = `${CONFIG.BACKEND_URL}${CONFIG.API_ENDPOINTS.ANALYZE}`;
    
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ code, language })
    });
    
    return await response.json();
}
```

### 2.5 Button & UI Modification
**Button Text Changes:**
- "Convert to Python" → "Focus Mode"
- "Show Original (C++)" → "Show All Code"

**CSS Addition (extension/styles.css):**
```css
.iris-noise-dimmed {
    opacity: 0.2 !important;
    transition: opacity 0.3s ease;
}

.iris-noise-dimmed:hover {
    opacity: 0.6 !important;  /* Slightly visible on hover */
}
```

---

## 📋 Phase 3: Integration & Core Flow

### 3.1 Language Detection Logic
**File: `extension/modules/dom-helpers.js`**

```javascript
DOMHelpers.detectLanguage = function() {
    const path = window.location.pathname;
    
    const langMap = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'javascript',
        '.tsx': 'javascript',
        '.py': 'python',
        '.go': 'go',
        '.java': 'java'
    };
    
    for (const [ext, lang] of Object.entries(langMap)) {
        if (path.endsWith(ext)) return lang;
    }
    
    return 'javascript';  // default
}
```

### 3.2 Main Flow Reconstruction
**File: `extension/content.js`**

```javascript
async function handleButtonClick() {
    if (lensState.active) {
        // Deactivate: remove dimming
        removeDimming();
        lensState.active = false;
    } else {
        // Activate: analyze & apply dimming
        const code = DOMHelpers.extractCode();
        const language = DOMHelpers.detectLanguage();
        
        const result = await analyzeCode(code, language);
        
        lensState.noiseLines = result.noise_lines;
        lensState.noiseRanges = result.noise_ranges;
        lensState.language = result.language;
        
        applyNoiseDimming(result.noise_lines);
        
        lensState.active = true;
    }
    
    eventHandlers.updateButtonState();
}
```

### 3.3 MutationObserver Adaptation
**Apply dimming to dynamically loaded lines:**

```javascript
function handleNewLines() {
    if (!lensState.active) return;
    
    applyNoiseDimming(lensState.noiseLines);
}
```

---

## 📋 Phase 4: Testing & Validation

### 4.1 Test Case Preparation
**File: `backend/tests/test_noise_detector.py`**

Sample code for each language:
- JavaScript: React component (with try-catch, console.log)
- Python: FastAPI endpoint (with error handling)
- Go: HTTP handler (if err != nil pattern)

### 4.2 Manual Testing Scenarios
1. Select a complex file from a public GitHub repository
2. Activate Focus Mode
3. Verification points:
   - [ ] Are error handling blocks dimmed?
   - [ ] Are logging statements dimmed?
   - [ ] Are import statements dimmed?
   - [ ] Is core logic kept clear?
   - [ ] Is content slightly visible on hover?
   - [ ] Does it restore on toggle?

### 4.3 Edge Case Handling
- Empty files
- Files with only noise (all dimmed)
- Files with no noise at all
- Very long files (1000+ lines)
- GitHub code view lazy loading

---

## 📋 Phase 5: Polish & Enhancement

### 5.1 Noise Intensity Control UI
**Options:**
- Right-click button → context menu
- Opacity slider (0.1 ~ 0.5)
- Per-noise-type on/off toggle

### 5.2 Performance Optimization
- Large files: chunk-based processing
- WeakMap memory management verification
- Regex pattern optimization (compilation caching)

### 5.3 Analytics Preparation
```javascript
// Track usage patterns (local storage)
{
    totalActivations: 142,
    languageUsage: {
        javascript: 89,
        python: 42,
        go: 11
    },
    avgNoisePercentage: 34.2  // Average % that is noise
}
```

### 5.4 Documentation Update
- README.md: New feature description, screenshots
- .github/copilot-instructions.md: Mark Noise Eraser as complete
- Next milestone (Semantic Intent Overlay) preparation docs

---

## 📋 Phase 6: Next Milestone Preparation

### 6.1 LLM Integration Design
**Preliminary work for Semantic Intent Overlay:**
- Review OpenAI API / Claude API integration
- Code block segmentation strategy (function-level vs file-level)
- Caching strategy (prevent re-analysis of same files)

### 6.2 UI/UX Experimentation
- Intent chip design mockups
- Display position (above code? side? hover?)
- Color system (noise=gray, intent=blue, core=white)

---

## ✅ Development Completion Checklist

### Backend
- [ ] Create `analyzer/` package structure
- [ ] Define language-specific noise patterns (JS, Python, Go)
- [ ] Implement `detect_noise()` function
- [ ] Add `/analyze` API endpoint
- [ ] Language auto-detection logic

### Extension
- [ ] Transition state management (pythonLines → noiseLines)
- [ ] Implement `applyNoiseDimming()` function
- [ ] Implement `removeDimming()` function
- [ ] Modify background script message handler
- [ ] Add language detection helper
- [ ] Add CSS styles (hover effects)
- [ ] Change button text

### Testing
- [ ] Test with sample code in 3 languages
- [ ] Verify edge cases
- [ ] Check for memory leaks (WeakMap)
- [ ] Performance test with large files

### Documentation
- [ ] Update README
- [ ] Reflect status in copilot-instructions.md
- [ ] Create next milestone planning document

---

## 🎯 Success Criteria

**Quantitative Goals:**
- Reduce time to understand core logic in PR reviews by **50%**
- Noise detection accuracy **85%+** (based on manual verification)

**Qualitative Goals:**
- User reaction on button click: "Ah, now I only see what matters"
- Confidence that hovering reveals details when needed
- Works across various coding styles

---

## 🎯 Success Criteria

**Quantitative Goals:**
- Reduce time to understand core logic in PR reviews by **50%**
- Noise detection accuracy **85%+** (based on manual verification)

**Qualitative Goals:**
- User reaction on button click: "Ah, now I only see what matters"
- Confidence that hovering reveals details when needed
- Works across various coding styles


---

## 📝 Implementation Status

**✅ All phases (1-5) completed as of January 4, 2026**

The development plan outlined above has been fully implemented. Legacy C++ to Python converter code has been removed. The codebase now contains only the Noise Eraser v1 implementation with all features complete:
- Backend analyzer with multi-language support
- Extension with CSS-based dimming
- Settings panel with customizable opacity
- Analytics tracking
- Full test coverage

Next milestone: Semantic Intent Overlay (Phase 6)
