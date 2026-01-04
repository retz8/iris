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

### Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension/` directory
5. Update `extension/config.js` with your backend URL if needed

## 📖 Usage

1. Navigate to any code file on GitHub (e.g., `https://github.com/user/repo/blob/main/src/file.js`)
2. Click the **"Focus Mode"** button (bottom right) to activate
3. Non-essential code patterns will be dimmed based on confidence scores:
   - High confidence noise (score ≥ 80): Very faint dimming
   - Medium confidence (score 60-79): Standard dimming
   - Lines with scores below 60 are NOT dimmed (precision-focused)
4. Hover over dimmed lines to see them more clearly
5. Click **"Show All Code"** to toggle back to normal view

### Settings Panel

- Click the **⚙️ icon** on the Focus Mode button
- Or **right-click** the Focus Mode button
- Adjust opacity, toggle noise types, view usage stats

### Keyboard Shortcut

- `Alt + P` - Toggle Focus Mode on/off


## 🏗️ Architecture

```
iris/
├── extension/           # Chrome Extension (Manifest V3)
│   ├── content.js      # Main injection script
│   ├── background.js   # Service worker for API calls
│   ├── config.js       # Backend URL configuration
│   ├── styles.css      # UI styling
│   └── modules/        # Modular helper functions
│       ├── dom-helpers.js
│       └── event-handlers.js
│
├── backend/            # Flask REST API
│   ├── src/
│   │   ├── server.py           # Main Flask server
│   │   └── analyzer/           # Noise detection engine
│   │       ├── noise_detector.py
│   │       └── patterns.py
│   └── tests/                  # Test suite
│
└── scripts/            # Utility scripts
    ├── start-server.sh
    └── run-tests.sh
```

### Data Flow

```
GitHub Page → Extension extracts code → POST to /analyze endpoint
→ Backend detects noise patterns → Returns line numbers + types
→ Extension applies CSS dimming to specific lines → User sees focused code
```

---

## 🧪 Testing

```bash
# Run all tests
./scripts/run-tests.sh

# Or manually
cd backend
python -m pytest tests/ -v

# Manual validation on real GitHub files
python tests/manual_validation.py
```

## 🛠️ Development Roadmap

### ✅ Phase 1-5: Noise Eraser v1 (Complete)
- Backend analyzer with pattern matching
- Extension dimming logic with CSS
- Settings panel with opacity control
- Analytics tracking
- Performance optimizations

### 🔜 Phase 6: Semantic Intent Overlay (Next Milestone)
- LLM integration for intent analysis
- Code block segmentation strategy
- Intent chip UI design
- Hover overlays with "why" explanations

### 🔮 Future Features
- **Variable Life-cycle Highlight**: Track variable usage across file
- **Flow Breadcrumbs**: Visual path of control flow conditions
- **Multi-file support**: Context preservation across PR files
- **Diff mode**: Focus on changed lines in PR views

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built during military service in South Korea (사이버지식정보방)
- Inspired by the "Vibe Coding" phenomenon and the need for better AI-code auditing tools
- GitHub Copilot for development assistance


## 📧 Contact
- Project maintained by @retz8

