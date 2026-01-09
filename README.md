# IRIS

<p align="center">
  <img width="251" height="116" alt="iris_no_background" src="https://github.com/user-attachments/assets/9da5e421-12d5-41e5-bc48-bb85e345cc4b" />
</p>

> **The Auditor's Lens: Optimizing Code Perception for the AI Era**

A Chrome extension that reduces cognitive load during code review by intelligently dimming non-essential code patterns (error handling, logging, imports, guards) on GitHub. Focus on what matters - the core logic.

---

## 🎯 Project Vision

IRIS bridges the gap between high-speed AI code generation and the human bottleneck of code verification. Instead of syntax translation, IRIS prioritizes **Signal over Noise** by making code review faster and less mentally exhausting.

**Current Status:** ✅ **Noise Eraser v1 Complete** (Phase 5 - Polish & Enhancement)

---

## ✨ Features

### 🎨 Noise Eraser v1 (Complete)

- **Heuristic-Based Smart Dimming**: Uses multi-factor scoring system with high precision:
  - **Pattern Matching**: Weighted confidence levels (high/medium/low)
  - **Context Analysis**: Considers nearby comments, code density, nesting depth
  - **Precision-Focused**: Only dims code with confidence score ≥ 60/100
  - **Smart Detection**:
    - 🐛 Debug logging (console.log, print statements)
    - 📝 TODO/FIXME comments
    - 📦 Import/export declarations
    - 🛡️ Simple guard clauses
    - ⚠️ Empty error handlers

- **Context-Aware Protection**:
  - ✅ Preserves critical error handling with nearby comments
  - ✅ Protects deeply nested logic (core business logic)
  - ✅ Reduces false positives through semantic analysis
  - ✅ Adjustable threshold for custom sensitivity

- **Customizable Intensity**: 
  - Adjustable opacity slider (10%-50%)
  - Per-noise-type toggles (enable/disable specific categories)
  - Settings accessible via gear icon or right-click

- **Usage Analytics**:
  - Total activations counter
  - Per-language usage statistics
  - Average noise score and percentage
  - Detailed statistics for debugging

- **Multi-Language Support**:
  - JavaScript/TypeScript
  - Python
  - Go
  - Java

- **Performance Optimized**:
  - Context-window analysis (3 lines before/after)
  - Compiled regex pattern caching
  - WeakMap for memory-efficient DOM tracking
  - Efficient scoring algorithm

---

## 🚀 Installation

### Prerequisites
- Chrome/Chromium-based browser
- Python 3.7+ (for backend)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start the server
./scripts/start-server.sh  # Or: python src/server.py
```

Backend runs on `http://localhost:8080` by default.



## Architecture Overview

### Data Flow

```
GitHub Page Load
    ↓
initSectionPanel() called
    ↓
SectionPanel instance created
    ↓
"Analyze Structure" button added
    ↓
User clicks button
    ↓
sectionPanel.analyze()
    ↓
Extract code from DOM (DOMHelpers)
    ↓
Send to background script
    ↓
POST /analyze-structure to backend
    ↓
Backend: AST → Functions → Sections
    ↓
Return structured JSON
    ↓
sectionPanel.render()
    ↓
Display sidebar panel
    ↓
User clicks section
    ↓
Scroll to line + Highlight
```

### Component Interaction

```
┌─────────────────────────────────────────────────┐
│            GitHub Web Page (DOM)                │
│  ┌───────────────────────────────────────────┐  │
│  │         content.js                        │  │
│  │  • initSectionPanel()                     │  │
│  │  • createAnalyzeButton()                  │  │
│  └─────────────┬─────────────────────────────┘  │
│                │                                 │
│  ┌─────────────▼─────────────────────────────┐  │
│  │      section-panel.js                     │  │
│  │  • SectionPanel class                     │  │
│  │  • analyze() → API call                   │  │
│  │  • render() → UI creation                 │  │
│  │  • Event handlers                         │  │
│  └─────────────┬─────────────────────────────┘  │
└────────────────┼────────────────────────────────┘
                 │
                 │ chrome.runtime.sendMessage
                 │
       ┌─────────▼──────────────────────┐
       │   background.js                │
       │  • handleAnalyzeStructure()    │
       │  • POST to backend API         │
       └─────────┬──────────────────────┘
                 │
                 │ HTTP POST /analyze-structure
                 │
       ┌─────────▼──────────────────────┐
       │   Backend (Flask)              │
       │  ┌──────────────────────────┐  │
       │  │  ast_parser.parse()      │  │
       │  └──────────┬───────────────┘  │
       │             │                  │
       │  ┌──────────▼───────────────┐  │
       │  │  function_extractor      │  │
       │  └──────────┬───────────────┘  │
       │             │                  │
       │  ┌──────────▼───────────────┐  │
       │  │  section_detector        │  │
       │  └──────────┬───────────────┘  │
       │             │                  │
       │             ▼                  │
       │      Structured JSON           │
       └────────────────────────────────┘
```

---

## UI Design

### Panel Layout

```
┌────────────────────────────────────────┐
│ 🤖 IRIS  Structure View            × │ ← Header (sticky)
├────────────────────────────────────────┤
│ 📊 File Overview                       │
│ 150 lines • 3 functions • medium       │ ← File Summary
├────────────────────────────────────────┤
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ loadHumanModel(...)                │ │ ← Function Card
│ │ Lines 1-70 • 7 sections            │ │
│ ├────────────────────────────────────┤ │
│ │ 📦 Setup                           │ │ ← Section Items
│ │ Lines 6-7 • 2 lines                │ │
│ ├────────────────────────────────────┤ │
│ │ ✅ Validation                      │ │
│ │ Lines 10-12 • 3 lines              │ │
│ ├────────────────────────────────────┤ │
│ │ 🔧 Processing                      │ │
│ │ Lines 14-23 • 10 lines             │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ anotherFunction(...)               │ │
│ │ Lines 72-120 • 4 sections          │ │
│ └────────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

