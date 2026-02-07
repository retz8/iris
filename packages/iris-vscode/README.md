# IRIS for VS Code

> **"IRIS prepares developers to read code, not explains code."**

IRIS is a code comprehension tool that transforms source files into a navigable "table of contents" view. Understand unfamiliar code through File Intent and Responsibility Blocks—enabling code skimming instead of line-by-line reading.

## Features

### 📊 Intelligent Code Analysis
Analyze Python, JavaScript, and TypeScript files to extract:
- **File Intent**: The "why" behind the file's existence
- **Responsibility Blocks**: Logical sections organized by conceptual purpose

### 🎯 Interactive Navigation
- **Hover**: Reveal block descriptions and highlight code in editor
- **Single Click**: Scroll to block and enter focus mode
- **Double Click**: Fold gaps between scattered code sections
- **Esc Key**: Exit focus mode and unfold all sections

### 🎨 Visual Code Mapping
- Unique color for each responsibility block
- Background highlights that don't obscure text
- Smooth animations for description reveal
- Theme-aware colors (light/dark mode support)

### ⚡ Smart State Management
- Instant stale detection on file edits
- One-click reload for re-analysis
- Preserves focus state during navigation
- Clean state transitions (IDLE → ANALYZING → ANALYZED → STALE)

## Requirements

- **VS Code**: 1.85.0 or higher
- **Backend Server**: Python 3.8+ with IRIS backend running on `http://localhost:8080`

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
./scripts/start-server.sh
```

## Usage

### Quick Start
1. Open a supported file (`.py`, `.js`, `.ts`, `.jsx`, `.tsx`)
2. Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows/Linux)
3. Run command: **"IRIS: Run Analysis"**
4. View results in the IRIS sidebar (Activity Bar)

### Navigation Workflow
```
1. Hover over block → See description + code highlight
2. Single click → Scroll to code + enter focus
3. Double click → Fold gaps between sections
4. Press Esc → Exit focus and unfold
5. Click reload icon → Re-analyze file
```

### Focus Mode
When you click a responsibility block:
- Editor scrolls to the first line of the block
- Gaps between scattered sections are folded
- Block code remains visible and highlighted
- Press `Esc` or click the same block again to exit

## Extension Settings

This extension currently has no configurable settings. All behavior is automatic based on backend analysis.

## Supported Languages

- Python (`.py`)
- JavaScript (`.js`)
- TypeScript (`.ts`)
- React JSX/TSX (`.jsx`, `.tsx`)

## Known Limitations

- **Manual Trigger**: Analysis requires command execution (no auto-analysis on file open)
- **Single File**: Only analyzes the active editor file
- **No Persistence**: Analysis is cleared on extension restart
- **Optimal Scale**: Works best with 3-15 responsibility blocks per file
- **Backend Required**: Extension requires local backend server running

## Keyboard Shortcuts

| Command | Shortcut | Description |
|---------|----------|-------------|
| Run Analysis | `Cmd+Shift+P` → "IRIS: Run Analysis" | Analyze current file |
| Exit Focus Mode | `Esc` | Exit focus and unfold sections |

## Troubleshooting

### "Backend server not responding"
Ensure the IRIS backend is running:
```bash
cd backend
source venv/bin/activate
python src/server.py
```

### "Unsupported language"
IRIS currently supports Python, JavaScript, and TypeScript only. Other languages will show a warning.

### "Analysis returned empty blocks"
The file may be too simple or the LLM couldn't identify clear responsibility blocks. Try with a more complex file.

## Release Notes

### 1.0.0 (2026-02-01)

**Initial Release**
- Command-driven analysis flow
- File Intent and Responsibility Block extraction
- Interactive sidebar with hover/click navigation
- Focus mode with code folding
- Smart color assignment
- Background highlighting
- Stale state detection
- Keyboard shortcuts (Esc to exit focus)

**UI Refinement**
- Clean, streamlined interface
- Removed unnecessary headers
- Smooth hover animations
- Enhanced visual design
- Theme-aware colors
- Accessibility compliance (WCAG AA)

---

## Architecture Overview

```
Extension → HTTP → Backend Server → LLM Analysis
   ↓
Webview Side Panel (UI)
   ↓
Decoration Manager (Editor Highlights)
   ↓
State Manager (Focus/Fold Tracking)
```

**Key Components:**
- `extension.ts`: Command registration and lifecycle
- `sidePanel.ts`: Webview UI and messaging
- `decorationManager.ts`: Editor highlighting
- `irisState.ts`: Centralized state management
- `colorAssignment.ts`: Intelligent color generation

## Development

### Local Development
```bash
cd vscode-extension
npm install
npm run compile
```

Press `F5` to launch Extension Development Host.

### Building VSIX Package
```bash
npm run package
```

### Running Tests
```bash
npm test
```

## Contributing

See the main [IRIS repository](../) for contribution guidelines.

## License

[Add license information]

---

**For more information:**
- [Project Documentation](../docs/)
- [Philosophy](../docs/philosophy.md)
- [Implementation Status](specs/current-status.md)
- [GitHub Repository](https://github.com/yourusername/iris)

---

*Part of the IRIS project - Progressive abstraction for code comprehension*




### Prompt
## What is IRIS?

IRIS is a **code comprehension tool** that provides a "table of contents" view for source code files. Instead of reading code line-by-line, developers can understand a file's purpose and structure at a glance through two key abstractions:

1. **File Intent** — A concise summary explaining what the file is and why it exists (like a book's title and abstract)
2. **Responsibility Blocks** — Logical sections of code grouped by conceptual purpose (like a table of contents with chapters)

IRIS helps developers navigate unfamiliar codebases faster by revealing the mental model humans naturally try to build when reading code.

---

## Core Functional Requirements

### 1. **File Intent Display**
- Show 1-3 sentence summary of the file's role
- Must be readable at a glance
- Optional: copy-to-clipboard action
- **Example**: *"User authentication controller: validates credentials and manages session lifecycle"*

### 2. **Responsibility Block List**
- Display a list of conceptual code sections
- **Each block must show**:
  - Block name/label (e.g., "Session initialization")
  - Short description (1 line)
  - Visual identifier (to match with code highlights)
- **Interactions**:
  - Hover → triggers background highlight of corresponding code lines in editor
  - Click → enters "focus mode" (jumps to block and folds gaps)

### 3. **Block-to-Code Mapping**
- Each responsibility block corresponds to specific line ranges in the code editor
- Line ranges can be non-contiguous (scattered throughout the file)
- Visual connection must exist between sidebar block and editor lines

### 4. **Hover Highlight**
- When hovering a block in sidebar:
  - Corresponding code lines show background highlight in editor
  - Highlight applies to all associated lines (even if scattered)
  - Non-associated lines remain unchanged

### 5. **Focus Mode**
- When a block is clicked:
  - Editor scrolls to the start of the block's first line range
  - Code between scattered block segments is folded/collapsed
  - Only the selected block's code segments remain visible and unfolded
  - Unrelated code is NOT dimmed, just folded away
- Must provide way to exit focus mode (button, click-away, or keyboard shortcut)

### 6. **Analysis Status Indicator**
- Show whether analysis is:
  - Ready/current
  - Based on older version (stale)
- Should be visible but not intrusive

### 7. **Control Actions**
- Refresh/re-run analysis
- Toggle IRIS view on/off
- Clear focus mode (when active)

### 8. **Color/Identity System**
- Each responsibility block needs a unique visual identifier
- Same identifier used in both sidebar and editor highlights
- Identifiers persist across interactions for same block

---

## User Workflows to Support

1. **File opened** → Analysis runs → Display intent + blocks
2. **Hover block in sidebar** → Background highlight corresponding lines in editor (even if scattered)
3. **Click block** → Jump to start + fold code between scattered segments (focus mode)
4. **Clear focus** → Unfold all code, return to normal view
5. **File edited** → Show stale indicator
6. **Manual refresh** → Re-analyze and update display

---

## What NOT to Include (MVP Exclusions)

- Inline editing of intents or blocks
- Chat interface or AI explanations
- Code quality judgments or suggestions
- Real-time analysis while typing
- Automatic refactoring tools

---

**Goal**: Create a UI that makes code structure immediately visible without overwhelming the developer or interfering with normal code editing. The design should feel like a natural extension of VS Code's interface.