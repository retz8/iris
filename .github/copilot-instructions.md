# IRIS - Intelligent Review & Insight System
**AI Agent Instructions [Pivoted 1/4/26]**

---

## 🚨 PROJECT PIVOT NOTICE (January 4, 2026)
As of January 4, 2026, this project has pivoted from a simple syntax translation tool (C++ to Python) to a **Universal Cognitive Audit Lens**. The core objective is now focused on reducing the cognitive load for human developers when auditing and reviewing complex or AI-generated code.

**Current Codebase State:** The repository structure still contains legacy C++ to Python converter code. Active development is transitioning toward the Noise Eraser v1 milestone while preserving the proven Chrome Extension + Flask backend architecture.

---

## 1. Project Vision
**"The Auditor’s Lens: Optimizing Code Perception for the AI Era"**
This tool is designed to bridge the gap between high-speed AI code generation ("Vibe Coding") and the human bottleneck of code verification. It aims to innovate how humans perceive by mitigating "Cognitive Load" and process code by prioritizing "Signal" over "Noise."

## 2. Retrospective & Rationale
* **Initial Prototype:** Successfully built a "C++ to Python" lens for GitHub in 6 hours.
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

Currently transitioning from the C++ to Python converter prototype to the first milestone of the pivoted vision:

* **Primary Feature:** **Noise Eraser v1**
    * Implementing a pattern-matching engine to identify "Noise" (error handling, logging, imports, guard clauses).
    * Developing CSS injection logic to dim identified noise (e.g., `opacity: 0.2`) rather than replacing content.
    * Refining the "Focus Mode" toggle UI on the GitHub blob page.
* **Technical Implementation:** 
    * Transitioning `content.js` from "code replacement" to "visual hierarchy modification."
    * Defining initial noise patterns: `if (err != nil)`, `try-catch`, `console.log`, imports, etc.
    * Backend will analyze code structure and return noise line ranges for extension to dim.
* **Immediate Goal:** Achieve a 2x faster "Logic Scanning" experience on GitHub PR pages.

---

## Architecture Overview

Two-component system: a Chrome Extension (Manifest V3) and a Flask backend working together to analyze code on GitHub pages.

- **Extension** (`extension/`): Content scripts inject UI into GitHub blob pages, extract code from GitHub's DOM, and apply visual transformations inline
- **Backend** (`backend/src/`): Flask server that will provide noise detection and cognitive analysis services

**New data flow** (transitioning to):
GitHub DOM → Extension extracts code → POST to Flask for analysis → Pattern matching identifies noise → Extension applies CSS dimming to specific lines

**Legacy data flow** (being replaced):
GitHub DOM → Extension extracts C++ → POST to Flask `/convert` → Regex conversion → Extension replaces DOM content

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

## Noise Detection Logic Principles (Target Implementation)

The noise detector (`backend/src/converter/main.py` - to be refactored) will identify code patterns based on:

**Noise categories**:
- **Error handling**: try-catch blocks, error checking conditionals
- **Logging**: console.log, print statements, debug calls
- **Imports/Dependencies**: import statements, require calls
- **Guard clauses**: early returns, null checks, validation
- **Boilerplate**: getters/setters, basic constructors

**Line-level analysis**: Return line numbers/ranges for dimming rather than transformed code

**Language support priority**: JavaScript/TypeScript → Python → Go → Java

## Extension DOM Manipulation Strategy (New Approach)

**State management** (`extension/content.js`): Toggle between normal and focus mode via `lensState.active` flag

**DOM strategy**: 
- **OLD (C++ converter)**: Store original HTML, fully replace with Python, restore on toggle
- **NEW (Noise Eraser)**: Apply CSS classes/inline styles to dim specific lines, remove styles on toggle

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
- `window.TextareaHandler`: Manages GitHub's readonly textarea replacement (legacy)
- `window.EventHandlers`: Button clicks and focus mode state

Backend uses Python package structure with `converter/main.py` (to be renamed to `analyzer/main.py`) as entry point imported by `server.py`

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

## Legacy Code Notes (For Reference During Transition)

The current `backend/src/converter/main.py` contains C++ to Python conversion logic:
- Line-by-line regex-based conversion
- Whitespace preservation for GitHub DOM alignment
- Pattern matching for C++ constructs (for loops, if statements, etc.)

**Reusable patterns for noise detection:**
- Line-by-line processing approach
- Regex pattern matching engine
- Whitespace-aware parsing
- Result structure that preserves line numbers

**To be deprecated:**
- C++ specific syntax patterns
- Code transformation/replacement logic
- DOM content replacement strategy