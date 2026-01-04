# LeetCode C++ to Python Converter - AI Agent Instructions

## Architecture Overview

Two-component system: a Chrome Extension (Manifest V3) and a Flask backend that work together to convert C++ code to Python directly on GitHub pages.

- **Extension** (`extension/`): Content scripts inject UI into GitHub blob pages, extract C++ code from GitHub's DOM, and display converted Python inline
- **Backend** (`backend/src/`): Flask server with `/convert` endpoint that performs regex-based C++ → Python transformation

**Critical data flow**: GitHub DOM → Extension extracts code → POST to Flask `/convert` → Regex conversion → Extension replaces DOM content inline

## Development Context & Constraints

Developed remotely via VS Code Tunnel from a military service computer lab (사이버지식정보방) with limited access. This drives architecture toward:
- Simple, self-contained components (no complex build systems)
- Minimal dependencies (see `requirements.txt`: Flask, flask-cors only)
- Offline-capable workflows where possible

**Backend URL**: Currently uses VS Code dev tunnel `https://vnw20xbg-8080.asse.devtunnels.ms` (see `extension/config.js`)

## Critical Developer Workflows

**Start backend server**: Run `./scripts/start-server.sh` which activates venv and starts Flask on port 8080

**Load extension in Chrome**:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. "Load unpacked" → select `extension/` directory

**No build step required** - extension files load directly, backend runs with `python src/server.py`

## Conversion Logic Principles

The converter (`backend/src/converter/main.py`) preserves **exact whitespace** from source - this is critical for GitHub DOM alignment:

```python
# CRITICAL: Use original leading whitespace, don't recalculate indent
original_leading_ws = get_leading_whitespace(line)
result.append(f'{original_leading_ws}{converted}')
```

**Key patterns**:
- Single-pass line-by-line conversion (no AST yet - Stage 2 future feature)
- Regex patterns for C++ constructs: `for` loops, `if` statements, method declarations
- Comments: `//` → `#`, block comments `/* */` → `# ...`
- Braces/access modifiers become empty lines (preserve line numbers for DOM sync)

**Known limitations** (from README TODO):
- Long C++ comments should convert to `"""` docstrings but currently use `#`
- Global keywords like `INT_MAX` not yet handled

## Extension DOM Manipulation

**State management** (`extension/content.js`): Toggle between C++ and Python via `lensState.active` flag

**DOM strategy**: Store original HTML, fully replace with Python, restore on toggle - no overlays or complex syncing

```javascript
// Original state stored per-line for restoration
lensState.originalState.lineElements = lineElements.map(el => ({
  element: el,
  originalHTML: el.innerHTML,
  // ...
}));
```

**Line extraction**: `DOMHelpers.getLineNumber()` handles multiple GitHub DOM patterns (React IDs like `LC123`, data attributes, table rows)

**Selectors** (`LENS_CONFIG.selectors`): Targets GitHub's code textarea `#read-only-cursor-text-area` and React line elements `.react-code-line-contents-no-virtualization`

## Module Organization

Extension uses module pattern with global namespaces:
- `window.DOMHelpers`: GitHub DOM queries and code extraction
- `window.TextareaHandler`: Manages GitHub's readonly textarea replacement
- `window.EventHandlers`: Button clicks and conversion state

Backend uses Python package structure with `converter/main.py` as entry point imported by `server.py`

## CORS Configuration

Backend allows GitHub origins only:
```python
CORS(app, resources={r"/*": {"origins": ["https://github.com"]}})
```

Extension requests permissions for `https://github.com/*` and backend tunnel URL in `manifest.json`

## Testing & Validation

Target validation repo: https://github.com/neetcode-gh/leetcode

Test by:
1. Navigate to any C++ file in a GitHub repo
2. Extension should inject "Convert to Python" button
3. Click to see inline Python conversion
4. Verify indentation matches GitHub's rendering exactly

좋습니다. copilot-instructions.md 파일은 AI 가이드라인 역할을 하므로, 프로젝트의 바뀐 철학과 목표를 명확히 명시하는 것이 중요합니다. 아래 내용을 그대로 복사해서 사용하시면 됩니다.

Markdown

# Copilot Instructions [Pivoted 1/4/26]

## 🚨 PROJECT PIVOT NOTICE (January 4, 2026)
As of January 4, 2026, this project has pivoted from a simple syntax translation tool (C++ to Python) to a **Universal Cognitive Audit Lens**. The core objective is now focused on reducing the cognitive load for human developers when auditing and reviewing complex or AI-generated code.

---

## 1. Project Vision
**"The Auditor’s Lens: Optimizing Code Perception for the AI Era"**
This tool is designed to bridge the gap between high-speed AI code generation ("Vibe Coding") and the human bottleneck of code verification. It aims to innovate how humans perceive and process code by prioritizing "Signal" over "Noise."

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
* **Main Target Audience:** * **PR Reviewers:** Auditing AI-generated or peer code on GitHub.
    * **Open-Source Explorers:** Analyzing unfamiliar codebases for learning or integration.
* **Target Environment:** Primarily **Chrome Extension** for GitHub, allowing maximum UI flexibility for cognitive experiments.

---

## 🚀 CURRENT DEVELOPMENT FOCUS (Work-in-Progress)

Currently, we are building the first milestone of the pivoted vision:

* **Primary Feature:** **Noise Eraser v1**
    * Implementing a Regex-based engine to identify "Noise" (Error handling, logging, imports, guard clauses).
    * Developing CSS injection logic to dim the identified noise (e.g., `opacity: 0.2`).
    * Refining the "Focus Mode" toggle UI on the GitHub blob page.
* **Technical Implementation:** * Transitioning `content.js` from "code replacement" to "visual hierarchy modification."
    * Defining initial noise patterns: `if (err != nil)`, `try-catch`, `console.log`, etc.
* **Immediate Goal:** Achieve a 2x faster "Logic Scanning" experience on GitHub PR pages.