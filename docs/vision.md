# IRIS Vision: A Universal Code Reading Layer

## One-line Vision

**IRIS is a universal, OS-level code reading assistant that overlays structured understanding onto any code, anywhere it appears.**

IRIS does not aim to replace IDEs, editors, or browsers.  
Instead, it introduces a new layer: **a reading interface for code**, independent of where that code is rendered.

---

## The Core Insight

Modern development is no longer bottlenecked by writing code, but by **reading, validating, and understanding code**.

Code now appears everywhere:
- In IDEs
- On GitHub and web-based code viewers
- Inside terminals
- In diffs, reviews, logs, and generated outputs

Yet, every environment forces developers to re-build understanding from raw syntax each time.

IRIS exists to solve this problem by providing a **persistent, structured abstraction layer** on top of code, wherever it is viewed.

---

## What IRIS Is (and Is Not)

### IRIS Is
- A **code reading tool**, not a code editing tool
- A **progressive abstraction layer** over source code
- A system that prepares developers to read code before they inspect implementation details
- Environment-agnostic in intent: IDE, browser, terminal, or otherwise

### IRIS Is Not
- An IDE replacement
- A refactoring or code generation tool
- A chat-based explanation assistant
- A documentation generator

IRIS does not explain code.  
It **structures the mental model required to read it efficiently**.

---

## The Ideal End State

In its most ideal form, IRIS is installed as a native OS application:

- **IRIS for macOS**
- **IRIS for Windows**

Once installed and running in the background:

- IRIS can be invoked anywhere code appears on screen
- It overlays its UI directly on top of the existing application
- It does not require the code to be opened inside a specific IDE or website

From the user’s perspective:

> “Whenever I am looking at code, IRIS can help me read it.”

---

## Universal Overlay Interaction Model

At the ideal end state, IRIS operates as an **OS-level overlay agent**:

1. The user views code in any environment:
   - IDE
   - Browser (e.g. GitHub)
   - Terminal
   - Diff or review tool

2. The user triggers IRIS (hotkey, selection, or gesture)

3. IRIS:
   - Acquires the visible code text
   - Infers structure and boundaries
   - Sends the code to the IRIS analysis server

4. IRIS renders an overlay UI on top of the current screen:
   - **File Intent**: why this code exists
   - **Responsibility Blocks**: conceptual structure of the file
   - Highlighted regions corresponding to each block
   - Clickable navigation between conceptual units

This overlay is visually independent from the host application and does not require modifying it.

---

## The Core Abstractions

IRIS is built on two foundational abstractions:

### 1. File Intent (WHY)
A concise statement describing **why the file exists in the system**.

- Establishes a mental frame before reading
- Independent of implementation details
- Stable across refactors

### 2. Responsibility Blocks (WHAT)
A structured list of the major conceptual responsibilities within a file.

- Not a function list
- Not bound to contiguous code regions
- Ordered by comprehension flow, not source order
- Each block represents a single “reason to change”

Together, these form a **table of contents for code**.

---

## Architectural Principle

IRIS must be architected around a strict separation between a platform-agnostic core and platform-specific adapters.

**High-level structure:**

IRIS Core (environment-agnostic)  
+ Thin Platform Adapters

### IRIS Core Responsibilities
- Intent and responsibility block domain models
- Interaction state management (hover, select, focus)
- Navigation semantics between conceptual units
- UI layout and presentation logic
- Communication with the IRIS analysis server

The IRIS Core must have **no knowledge of the host environment**.  
It should operate purely on text, abstract ranges, and interaction state.

### Platform Adapter Responsibilities
Each platform adapter is intentionally minimal and environment-specific.

Examples:
- IDE adapters (VS Code, Cursor, Monaco-based editors)
- Browser adapters (GitHub and other web-based code viewers)
- OS-level agent (future)

Adapters are responsible only for:
- Acquiring the visible code text
- Mapping abstract ranges to screen or line positions
- Rendering overlays and highlights
- Handling user input events (clicks, hovers, navigation)

This separation ensures that IRIS’s core abstractions remain stable while allowing the product to expand across environments without redesign.
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
