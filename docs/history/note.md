# IRIS MVP – UX Component Checklist

This document enumerates the concrete UX elements required for the IRIS MVP.
It focuses on **what must exist in the user experience**, not how it is implemented.

---

## 1. Entry & Lifecycle UX

### 1.1 File Open Trigger
- IRIS analysis is triggered when:
  - A file is opened
  - OR the file is saved
- No background or speculative analysis

### 1.2 Analysis Status Awareness
Minimal, non-intrusive indicators such as:
- “IRIS: Analysis ready”
- “IRIS: Based on last saved version”
- Optional stale hint (never blocking)

Purpose:
- Explain *when* analysis happened
- Avoid “magic” perception

---

## 2. File Intent UX

### 2.1 File Intent Presentation
- A concise, high-level summary of:
  - What this file *is*
  - Why it exists
  - What role it plays conceptually
- Should be:
  - Short (1–3 sentences)
  - Non-technical when possible
  - Stable across minor edits

### 2.2 Placement Options (MVP-select one)
- Top-of-file inline annotation
- Dedicated IRIS panel (sidebar)
- Hoverable header banner

### 2.3 File Intent Interaction
- Read-only by default
- No editing or regeneration inline
- Optional:
  - Copy to clipboard
  - Collapse / expand

---

## 3. Responsibility Block UX (Core MVP)

### 3.1 Responsibility Block List
Each file exposes:
- A list of conceptual responsibility blocks
- Each block has:
  - Name / label
  - Short description
  - Associated line ranges (possibly multiple, non-contiguous)

### 3.2 Responsibility Block Visualization
- Each block is assigned:
  - A unique, consistent color
  - A stable identifier
- Colors must:
  - Be visually distinct
  - Be subtle (background highlight, not text color)

---

## 4. Line Highlighting & Mapping UX

### 4.1 Hover Highlighting
When hovering a responsibility block:
- All associated line ranges are highlighted
- Highlight applies even if ranges are scattered
- Non-associated lines remain unchanged

Goal:
- Show conceptual unity across scattered code

### 4.2 Selection / Focus Mode
When a responsibility block is selected:
- All non-related lines are:
  - Folded, hidden, or dimmed
- Related lines remain visible and highlighted
- Scattered regions stay visible simultaneously

This creates a **conceptual slice view** of the file.

### 4.3 Exit Focus Mode
- Click outside
- ESC key
- “Clear selection” action

---

## 5. Code Folding Integration

### 5.1 Responsibility-Aware Folding
- Folding is driven by responsibility blocks, not syntax
- A block may fold:
  - Multiple distant regions at once
- Folding does not alter the underlying code

### 5.2 Compatibility with Native Folding
- Native VS Code folding still works
- IRIS folding is:
  - Additive
  - Reversible
  - Non-destructive

---

## 6. Block Navigation UX

### 6.1 Jump to First Occurrence
- Clicking a block scrolls to its first line
- Optional next/previous navigation for scattered segments

### 6.2 Mini-Map / Overview (Optional MVP+)
- Visual markers in scrollbar or minimap
- Shows where responsibility blocks appear across the file

---

## 7. Color & Identity Consistency

### 7.1 Stable Color Assignment
- Same responsibility block:
  - Same color across interactions
- Colors reset per file (no global meaning)

### 7.2 Legend / Mapping View
- Clear mapping of:
  - Color → Responsibility name
- Always visible when IRIS UI is active

---

## 8. User Control UX

### 8.1 Enable / Disable IRIS View
- Toggle IRIS overlays on/off
- Code view must remain usable without IRIS

### 8.2 Manual Refresh
- Command Palette action:
- Explicit, user-initiated

---

## 9. Non-Goals (Explicit UX Exclusions)

The MVP intentionally does NOT include:
- Inline editing of intents or blocks
- Real-time re-analysis while typing
- Automatic refactors or suggestions
- Chat-based explanations
- Opinionated “best practice” judgments

IRIS explains structure, not quality.

---

## 10. UX Success Criteria (MVP)

The MVP UX is successful if:
- A developer can answer:
- “What is this file for?”
- “What responsibilities exist here?”
- “Which code belongs together conceptually?”
- Without reading the entire file linearly
- Without IRIS changing unexpectedly

---

## Closing Note

IRIS UX is a **cognitive overlay**, not a replacement for code.

The goal is not to hide complexity,
but to **reveal structure the way humans already try to infer it**.

---

