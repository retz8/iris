# IRIS VS Code Extension MVP

## Background

IRIS is a developer tool designed to reduce the cognitive load of reading unfamiliar source code.
Rather than generating or modifying code, IRIS overlays **semantic context** on top of existing code so that developers can understand *why* a file exists and *how* responsibilities are structured before reading implementation details.

The core insight behind IRIS is that developers already perform mental abstraction when reading code:

```
Raw Source Code
→ Mental Structuring
→ Conceptual Understanding
```

IRIS externalizes this mental step by providing an explicit **intermediate abstraction layer**.

For the MVP, IRIS is implemented as a **VS Code Extension** that communicates with an existing backend analysis server and renders results as a non-intrusive UX layer inside the editor.

---

## IRIS MVP UX Principles

The VS Code Extension follows several strict principles:

* **Non-destructive**: Original source code is never modified
* **Overlay-based**: IRIS augments, not replaces, the editor
* **Read-only semantics**: No code generation or evaluation
* **Honest state**: If analysis is outdated, IRIS clearly communicates it

IRIS focuses exclusively on helping developers understand code **faster and with less cognitive effort**.

---

## Core UX Concepts

### 1. File Intent

A short, stable explanation of **why the file exists**.

* Displayed before reading code
* Provides a mental frame of reference
* Avoids implementation details

Example:

* "Checkout session bootstrap logic"
* "JSON schema validation helpers"

---

### 2. Responsibility Blocks

Responsibility Blocks represent **conceptual units of responsibility** within a file.

* Not equivalent to functions or classes
* One block corresponds to one reason to change
* Code belonging to a block may be scattered

Each block contains:

* Name
* Description
* Associated line ranges (possibly non-contiguous)

---

## System Architecture Overview

```
IRIS Server        VS Code Extension            Webview
------------      ------------------           -----------
Semantic          State & Orchestration  --->   Rendering
Analysis           (Source of Truth)            Interaction
(stateless)                                      (stateless)
```

* **Server**: Computes semantic meaning (stateless)
* **Extension**: Owns state and editor interaction
* **Webview**: Pure UI and user interaction layer

---

## File Change Strategy (MVP)

To keep behavior predictable and honest:

* Any file modification immediately invalidates analysis
* IRIS transitions to a **STALE** state
* Decorations are removed or visually muted
* Users must explicitly re-run analysis

Soft changes (e.g. formatting) are intentionally not distinguished at the MVP stage.

---

## MVP Development Phases

The VS Code Extension is developed incrementally, optimized for first-time extension development and early UX validation.

---

### Phase 0 — Development Environment Setup

**Goal**

* Become familiar with VS Code Extension development workflow

**Outcome**

* Extension Development Host can be launched via F5
* Debugging and logging are understood

---

### Phase 1 — Minimal Extension Skeleton

**Goal**

* Verify extension activation

**Scope**

* `extension.ts` entry point
* One registered command

**Outcome**

* Command is visible in Command Palette
* Extension lifecycle is confirmed

---

### Phase 2 — Editor Context Access

**Goal**

* Read information about the active editor

**Scope**

* Current file path
* Language identifier
* Full source text

**Outcome**

* Extension can reliably target the active file

---

### Phase 3 — Explicit Analysis Trigger & Server Integration

**Goal**

* Connect VS Code to the IRIS backend

**Scope**

* Command-triggered API request
* Receive File Intent and Responsibility Blocks
* Log results for verification

**Outcome**

* End-to-end semantic analysis pipeline is operational

---

### Phase 4 — Extension State Model

**Goal**

* Define a single source of truth for IRIS data

**Scope**

* Block identifiers
* Color assignment
* Line range normalization
* Active / stale analysis state

**Outcome**

* Stable internal state model independent of UI

---

### Phase 5 — Webview Side Panel (Read-only)

**Goal**

* Visualize IRIS results

**Scope**

* Webview panel creation
* File Intent display
* Responsibility Block list rendering

**Outcome**

* IRIS UX becomes visible and testable

---

### Phase 6 — Webview ↔ Extension Messaging

**Goal**

* Enable user interaction

**Scope**

* Hover and click events in Webview
* Message passing to Extension

**Outcome**

* Webview becomes an interactive control surface

---

### Phase 7 — Editor Decorations

**Goal**

* Connect semantic blocks to source code

**Scope**

* Line highlighting on hover
* Decoration cleanup on unhover

**Outcome**

* Semantic overlays appear directly in the editor

---

### Phase 8 — Focus Mode (Block Selection)

**Goal**

* Enable conceptual slice view

**Scope**

* Block selection
* Non-selected code dimming or hiding
* Exit via ESC or command

**Outcome**

* High-impact UX demonstrating IRIS value

---

### Phase 9 — File Change → STALE Transition

**Goal**

* Maintain trust and correctness

**Scope**

* Detect file edits
* Immediately invalidate analysis
* Update Webview and editor state

**Outcome**

* IRIS behaves predictably and transparently

---

### Phase 10 — UX Polish & Stability

**Goal**

* Make the MVP demo-ready

**Scope**

* Loading states
* Error handling
* Manual re-analysis
* Graceful server failure handling

**Outcome**

* A stable, demoable MVP suitable for user testing

---

## Summary

The IRIS VS Code Extension MVP is intentionally simple in logic but deliberate in UX design.

By prioritizing predictability, honesty, and progressive enhancement, the extension validates a single core hypothesis:

> **Providing high-level semantic context before reading code significantly reduces cognitive load.**

This document defines the foundation upon which future automation, heuristics, and cross-file intelligence can be built.
