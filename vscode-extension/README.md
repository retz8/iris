# iris README

This is the README for your extension "iris". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**




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