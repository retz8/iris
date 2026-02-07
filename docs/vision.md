
### IRIS Core Responsibilities
- Intent and responsibility block models
- Interaction state (hover, select, focus)
- Navigation semantics
- UI layout logic
- Communication with IRIS analysis server

### Platform Adapters (Examples)
- IDE adapters (VS Code, Cursor, Monaco-based editors)
- Browser adapters (GitHub and other web code viewers)
- OS-level agent (future)

Each adapter is responsible only for:
- Acquiring visible code text
- Mapping abstract ranges to screen positions
- Rendering overlays and highlights
- Handling user input events

---

## Why OS-Level Integration Is the End Goal

IDE and browser integrations provide accuracy and structure, but they are inherently limited by platform boundaries.

The OS-level IRIS agent represents the convergence point:

- One consistent reading experience
- Independent of editor, browser, or tool choice
- Focused on the act of **reading**, not editing

This aligns with IRIS’s core philosophy:

> **IRIS prepares developers to read code, not explain it.**

---

## Phased Roadmap

### Phase 1 — IDE-Native Reading (Current / Near-term)

**Goal:** Prove the IRIS abstraction with maximum structural accuracy.

- IDE integrations (VS Code, Cursor, Monaco-based editors)
- Automatic file analysis on open or manual trigger
- File Intent + Responsibility Blocks
- Precise line-based highlights and navigation
- Stable IRIS Core abstraction and data model

**Why this phase matters:**
- IDEs provide the richest and most reliable code context
- Enables rapid iteration on abstraction quality and UX
- Establishes IRIS as a serious code reading tool

---

### Phase 2 — Browser-Based Code Reading

**Goal:** Extend IRIS to where code is frequently *read*, not edited.

- Browser extension for GitHub and similar code viewers
- DOM-based line mapping and overlay rendering
- Shared IRIS Core with IDE integrations
- Consistent UI and interaction patterns across IDE and web

**Why this phase matters:**
- Code review increasingly happens in the browser
- Validates IRIS as an environment-agnostic reading layer
- Forces clear separation between Core and adapters

---

### Phase 3 — Unified IRIS UI Shell

**Goal:** Decouple IRIS’s UI identity from host platforms.

- A shared, standalone UI shell rendered consistently
- Identical interaction model across IDE and browser
- Platform adapters reduced to input/output bridges
- Strong visual identity independent of IDE conventions

**Why this phase matters:**
- IRIS becomes a product, not a plugin
- UX consistency regardless of environment
- Prepares the ground for OS-level integration

---

### Phase 4 — OS-Level IRIS Agent (Visionary)

**Goal:** Make IRIS available wherever code appears on screen.

- Native background application (macOS / Windows)
- Global hotkeys or selection-based invocation
- Screen-level overlay UI
- Text acquisition via accessibility APIs and user selection
- IRIS invoked independently of IDE or browser

**Why this phase matters:**
- Completes the vision of IRIS as a universal code reader
- Eliminates environment lock-in
- Positions IRIS as a foundational developer tool

---

## Strategic Reality

The OS-level universal reader is the destination, not the starting point.

IRIS must earn this future by:
- Perfecting its abstractions
- Proving its value in constrained environments
- Maintaining architectural discipline from the beginning

The roadmap defines **how IRIS converges toward its vision without compromising feasibility**.
