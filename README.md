# IRIS

<p align="center">
  <img width="251" height="116" alt="iris_no_background" src="https://github.com/user-attachments/assets/9da5e421-12d5-41e5-bc48-bb85e345cc4b" />
</p>

> **"IRIS prepares developers to read code, not explains code."**

IRIS is an intelligent code comprehension tool that transforms source code into a progressive abstraction layer—a high-fidelity "Table of Contents" that establishes a mental framework before you dive into implementation. Unlike traditional documentation tools or AI chat assistants that provide passive summaries, IRIS enables **code skimming**, allowing developers to understand unfamiliar code quickly through structured navigation.

---

## What is IRIS?

IRIS bridges the gap between raw source code and natural language by providing **intermediate abstractions** that reduce cognitive load while maintaining technical accuracy. It's designed for the modern development workflow where engineers increasingly spend time reviewing AI-generated code, unfamiliar codebases, and complex pull requests.

### The Core Problem

As AI tools generate more code, **code review has become the new bottleneck**:
- More time reviewing AI-generated code
- More unfamiliar codebases to understand
- Increased cognitive load from context switching

### The IRIS Solution

IRIS provides two layers of abstraction that work together:

**1. File Intent (WHY)**
- The "title and abstract" of a code file
- Answers: "Why does this file exist in the system?"
- Establishes mental framework before diving into code
- Example: *"Menu category flattening utility"*

**2. Responsibility Blocks (WHAT)**
- Major logical components within the file
- Shows organizational structure, not just function lists
- Each block = complete conceptual unit (functions + state + types + constants)
- Ordered by comprehension flow, not code order
- Example: *"Menu list flattening"* with functions, state, and description

**Result**: You understand the file's purpose and structure before reading any implementation—enabling code skimming.

---

## Features

### 📊 Intelligent Code Analysis
- AST-based parsing for Python, JavaScript, TypeScript (JSX/TSX supported)
- Extracts File Intent and Responsibility Blocks automatically
- Preserves semantic relationships and code structure

### 🎨 Visual Code Navigation
- Side panel view with clean, streamlined UI
- Hover to reveal detailed descriptions
- Visually distinct colors for each responsibility block
- Editor highlighting with background decorations

### 🎯 Focus Mode
- **Single click**: Scroll to block and highlight it
- **Double click**: Fold gaps between scattered code sections
- **Esc key**: Exit focus and unfold all sections
- **Click again**: Toggle focus off

### 🔄 Smart Interaction
- Smooth animations for description reveal
- Instant stale detection on file edits
- One-click reload for re-analysis
- Theme-aware colors (light/dark mode)

### ⌨️ Keyboard-Driven Workflow
- `Cmd+Shift+P` → "IRIS: Run Analysis" to analyze file
- `Esc` to exit focus mode
- Native VS Code folding integration

---

## Installation

### Prerequisites
- **VS Code**: Version 1.85.0 or higher
- **Python**: 3.8+ (for backend server)
- **Node.js**: 16+ (for extension development)

### Quick Start

1. **Install the Backend Server**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Start the Backend**
```bash
./scripts/start-server.sh
# Server runs on http://localhost:8080
```

3. **Install the VS Code Extension**
```bash
cd vscode-extension
npm install
npm run compile
```

4. **Run Extension (Development)**
- Press `F5` in VS Code to launch Extension Development Host
- Or install packaged `.vsix` file for production use

---

## Usage

### Basic Workflow

1. **Open a supported file** (`.py`, `.js`, `.ts`, `.jsx`, `.tsx`)
2. **Run analysis**: `Cmd+Shift+P` → "IRIS: Run Analysis"
3. **View results**: Check the IRIS sidebar in Activity Bar
4. **Navigate code**:
   - Hover over blocks to see descriptions
   - Single-click to focus and scroll
   - Double-click to fold gaps
   - Press `Esc` to exit focus

### Example Output

**File Intent:**
```
Menu category flattening utility
```

**Responsibility Blocks:**
```
1. Menu list flattening
   └─ Functions: convertMenuByCategoryToRawList, mapMenuItem
   └─ State: menuRawList
   └─ Description: Transforms grouped menu items into a flat list

2. Checkout session bootstrap
   └─ Functions: createSession, attachLineItems
   └─ State: sessionId, cartSnapshot
   └─ Description: Initializes payment context and locks pricing
```

---

## Architecture

### System Overview
```
┌─────────────────────────────────────────┐
│          VS Code Extension              │
│  ┌────────────────────────────────────┐ │
│  │  Webview Side Panel (UI)           │ │
│  │  - File Intent Display             │ │
│  │  - Responsibility Block List       │ │
│  │  - Hover/Click Interactions        │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Decoration Manager                │ │
│  │  - Editor Highlighting             │ │
│  │  - Focus Mode Decorations          │ │
│  │  - Color Assignment                │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  State Manager                     │ │
│  │  - Analysis State (IDLE/ANALYZING  │ │
│  │    /ANALYZED/STALE)                │ │
│  │  - Focus State & Fold Tracking     │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
              │ HTTP API
              ▼
┌─────────────────────────────────────────┐
│       Python Backend Server             │
│  ┌────────────────────────────────────┐ │
│  │  IRIS Agent (LLM-powered)          │ │
│  │  - Prompt Engineering              │ │
│  │  - Tool-calling Integration        │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  AST Parser                        │ │
│  │  - Tree-sitter Integration         │ │
│  │  - Python/JavaScript Support       │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Key Components

**Frontend (VS Code Extension)**
- `extension.ts`: Command registration, activation
- `sidePanel.ts`: Webview UI generation and messaging
- `decorationManager.ts`: Editor highlighting and focus mode
- `irisState.ts`: Centralized state management
- `colorAssignment.ts`: Perceptually uniform color generation

**Backend (Python Server)**
- `server.py`: Flask server with `/api/iris/analyze` endpoint
- `agent.py`: LLM agent with tool-calling for analysis
- `ast_parser.py`: Tree-sitter based code parsing
- `prompts.py`: Structured prompts for File Intent and Responsibility extraction

---

## Development

### Project Structure
```
iris/
├── backend/              # Python backend server
│   ├── src/
│   │   ├── agent.py      # LLM agent logic
│   │   ├── prompts.py    # Analysis prompts
│   │   ├── parser/       # AST parsing
│   │   └── utils/        # Utilities
│   ├── tests/            # Backend tests
│   └── requirements.txt
├── vscode-extension/     # VS Code extension
│   ├── src/
│   │   ├── extension.ts
│   │   ├── api/          # Backend API client
│   │   ├── decorations/  # Editor decorations
│   │   ├── state/        # State management
│   │   ├── webview/      # Side panel UI
│   │   └── utils/        # Utilities
│   ├── specs/            # Implementation docs
│   └── package.json
├── docs/                 # Documentation
│   └── philosophy.md     # Core concepts
└── scripts/              # Build scripts
```

### Running Tests
```bash
# Backend tests
cd backend
source venv/bin/activate
pytest tests/

# Extension tests
cd vscode-extension
npm test
```

### Building Extension Package
```bash
cd vscode-extension
npm run package
# Creates iris-<version>.vsix
```

---

## Philosophy

IRIS is built on the principle of **Progressive Abstraction**: the idea that we need intermediate layers between raw code and natural language, not a radical leap.

### The Vision: Three Phases

**Phase 1: The Table of Contents (Current)**
- File Intent + Responsibility Blocks
- Enables code skimming
- Reduces cognitive load

**Phase 2: Dynamic Exploration (Mid-term)**
- Data flow visualization
- Call graph integration
- Intelligent folding based on relevance

**Phase 3: New Programming Paradigm (Long-term)**
- The missing link between code and natural language
- Optimized for human comprehension
- The paradigm right before natural language programming

Read more in [docs/philosophy.md](docs/philosophy.md)

---

## Current Limitations

- **Manual Trigger**: Analysis requires command execution (no auto-analysis on file open)
- **Single File**: Only analyzes active editor file (no project-wide analysis)
- **No Persistence**: Analysis cleared on extension restart
- **Optimal Scale**: Works best with 3-15 responsibility blocks per file
- **Description Length**: Best with concise descriptions (< 200 characters)

---

## Roadmap

### Q1 2026 ✅
- [x] MVP backend with AST parsing
- [x] VS Code extension with basic UI
- [x] Focus mode and editor decorations
- [x] UI refinement with hover/click interactions
- [x] Smart color assignment
- [x] Keyboard shortcuts

### Q2 2026
- [ ] Auto-analysis on file open
- [ ] Multi-file project analysis
- [ ] Data flow visualization
- [ ] Performance optimization for large files
- [ ] Chrome extension for GitHub code review

### Q3 2026
- [ ] Call graph integration
- [ ] Intelligent code folding
- [ ] User configuration options
- [ ] Telemetry and analytics
- [ ] JetBrains IDE support

---

## Contributing

IRIS is in active development. Contributions are welcome!

### Development Setup
1. Fork the repository
2. Follow Installation instructions above
3. Make changes and test locally
4. Submit pull request with description

### Code Style
- **Python**: PEP 8, type hints, docstrings
- **TypeScript**: ESLint configuration, JSDoc for exports
- **Commits**: Conventional commits format

---

## License

[Add license information]

---

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/iris/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/iris/discussions)

---

## Acknowledgments

IRIS is inspired by the need for better code comprehension tools in an AI-augmented development world. Special thanks to the Tree-sitter community and VS Code extension developers for their excellent tools and documentation.

---

*Built with ❤️ for developers who need to understand code quickly*
