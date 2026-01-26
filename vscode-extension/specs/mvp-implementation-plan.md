---

goal: IRIS VS Code Extension MVP Implementation Plan
version: 1.0
date_created: 2026-01-26
status: Planned
tags: [architecture, design, vscode-extension, mvp]
---------------------------------------------------

## Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This document defines the end-to-end implementation plan for building the **IRIS VS Code Extension MVP**.

The purpose of this plan is to translate the previously defined UX and architectural phases into a structured, machine-readable implementation roadmap. Each phase represents a discrete milestone that can be executed and validated independently.

At this stage, the document establishes the **overall structure and phase breakdown only**. Detailed tasks, file paths, and execution steps will be added incrementally in subsequent iterations.

---

## 1. Requirements & Constraints

This section defines non-negotiable requirements and constraints that govern the IRIS VS Code Extension MVP implementation.
All implementation phases and tasks MUST comply with the following rules.

### Functional Requirements

* **REQ-001 (Explicit Analysis Trigger)**
  Analysis triggered only via explicit user command, not automatically.

* **REQ-002 (Single-File Scope)**
  Analyze only the currently active editor file.

* **REQ-003 (Read-Only Semantics)**
  Never modify source code, file system, or editor text buffers. Overlay-based only.

* **REQ-004 (State-Driven UI)**
  All UI components derive from extension state; UI elements are stateless.

* **REQ-005 (Deterministic blockId)**
  Each Responsibility Block assigned deterministic `blockId` by extension.

### UX Constraints

* **UX-001 (Honest State)**
  Communicate outdated analysis via `STALE` state and visual indicators.

* **UX-002 (No Implicit Actions)**
  No auto-highlighting, auto-focus, or auto-reanalysis after edits.

* **UX-003 (Predictable Reset)**
  On invalidating events: clear decorations, exit Focus Mode, return to neutral state.

### State Management Constraints

* **STATE-001 (Single Source of Truth)**
  All semantic data in single extension-owned state model.

* **STATE-002 (Explicit Transitions)**
  All state transitions must be explicit, logged, and traceable.

* **STATE-003 (STALE Until Reanalysis)**
  `STALE` state remains until explicit user reanalysis.

### Editor & Decoration Constraints

* **ED-001 (Overlay-Only)**
  Use only `TextEditorDecorationType`; no folding or text replacement.

* **ED-002 (Deterministic Colors)**
  Colors derived deterministically from `blockId`.

* **ED-003 (Immediate Disposal)**
  Dispose decorations on state transition to `IDLE`/`STALE`, editor change, or deactivation.

### Logging & Observability Requirements

* **LOG-001 (Centralized Output)**
  Route all logs to dedicated Output Channel (e.g. `IRIS`).

* **LOG-002 (Severity Levels)**
  Use explicit levels: INFO, WARN, ERROR.

* **LOG-003 (No Silent Failures)**
  All errors must be logged and produce visible UI signals.

### Explicit Non-Requirements (MVP Scope Boundaries)

* **NONREQ-001**: No automatic analysis triggering
* **NONREQ-002**: No cross-file intelligence
* **NONREQ-003**: No user configuration system
* **NONREQ-004**: No telemetry or analytics
* **NONREQ-005**: No performance optimization beyond correctness
* **NONREQ-006**: No automated testing (manual verification only)

### Guiding Design Principles

* **GUD-001 (Predictability Over Cleverness)**
  The system must behave consistently, even if that limits advanced heuristics.

* **GUD-002 (Progressive Enhancement)**
  MVP functionality must form a stable foundation for future phases without refactoring core assumptions.

* **GUD-003 (Cognitive Load Reduction First)**
  All decisions must prioritize reducing mental effort for first-time code readers.

### Backend Integration Requirements

* **API-000 (Backend Contract)**
  The extension integrates with the IRIS Analysis Server at `/api/iris/analyze` (POST). Detailed request/response schemas are defined in Phase 3.

* **API-001 (Contract Adherence)**
  Conform to the `/api/iris/analyze` schema (see Phase 3). Ignore undocumented fields safely.

* **API-002 (Failure Handling)**
  On `success=false`: clear state, surface user-readable error.

* **API-003 (Opaque Metadata)**
  Preserve but never interpret `metadata` object.

* **API-004 (Stateless Server)**
  Assume server is stateless; no caching or session reuse.

## 2. Implementation Steps

### Implementation Phase 0 — Development Environment Setup

* GOAL-000: Establish a reproducible local development environment for VS Code Extension development.

| Task      | Description                                                                                   | Completed | Date |
| --------- | --------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-0001 | Install Node.js (LTS) and npm. Verify versions using `node --version` and `npm --version`.    |           |      |
| TASK-0002 | Install VS Code (stable channel) and enable Extension Development prerequisites.              |           |      |
| TASK-0003 | Install Yeoman and VS Code Extension Generator globally (`npm install -g yo generator-code`). |           |      |
| TASK-0004 | Generate a new VS Code Extension scaffold using `yo code` with TypeScript configuration.      |           |      |
| TASK-0005 | Verify local extension launch using VS Code Extension Development Host (F5).                  |           |      |

---

### Implementation Phase 1 — Minimal Extension Skeleton

* GOAL-001: Create a minimal, runnable VS Code Extension that can be activated and controlled via a command.

| Task      | Description                                                                               | Completed | Date |
| --------- | ----------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-0011 | Define extension metadata in `package.json` (name, description, activationEvents).        |           |      |
| TASK-0012 | Register a single activation command (e.g. `iris.runAnalysis`) in `contributes.commands`. |           |      |
| TASK-0013 | Implement `activate()` and `deactivate()` lifecycle functions in `src/extension.ts`.      |           |      |
| TASK-0014 | Log activation and command execution to the VS Code Output Channel for visibility.        |           |      |
| TASK-0015 | Verify command execution via Command Palette and confirm extension activation behavior.   |           |      |

---

### Implementation Phase 2 — Editor Context Access

* GOAL-002: Enable the extension to read the active editor context and extract file-level information required for analysis.

| TASK-0021 | Access the active text editor via `vscode.window.activeTextEditor` and handle the null case explicitly.                    
| TASK-0022 | Extract the absolute file path and language identifier from `TextDocument` (`document.uri.fsPath`, `document.languageId`). 
| TASK-0023 | Read full file contents using `TextDocument.getText()` and store it in an in-memory variable scoped to command execution.  
| TASK-0024 | Capture basic file metadata (file name, line count) for logging and future request payloads.                               
| TASK-0025 | Log extracted editor context data to the Output Channel for manual verification.                                           

---

### Implementation Phase 3 — Explicit Analysis Trigger & Server Integration

* GOAL-003: Trigger semantic analysis explicitly via command, validate supported languages, and integrate with the external IRIS analysis server.

#### Backend API Contract

**Endpoint**: `POST /api/iris/analyze`

**Request Payload**:
```json
{
  "filename": "main.js",
  "language": "javascript",
  "source_code": "<full source code string>",
  "filepath": "/repo/path/main.js",
  "url": "https://github.com/user/repo/blob/main/main.js",
  "metadata": { "filepath": "/repo/path/main.js" }
}
```

Field requirements:
- `filename`: Base file name only (no path)
- `language`: VS Code `languageId`
- `source_code`: Full file contents as UTF-8 string
- `filepath`: Repository-relative or virtual file path
- `url`: Canonical source URL (if available)
- `metadata`: Free-form object, must include `filepath`

**Response Payload**:
```json
{
  "success": true,
  "file_intent": "Short explanation of file purpose",
  "responsibilities": [
    {
      "title": "Responsibility Title",
      "description": "What this responsibility handles",
      "entities": ["function1", "function2"]
    }
  ],
  "metadata": { "final_confidence": 0.7, "iterations": 4 }
}
```

Response requirements:
- `success=false` → treat as analysis failure
- `file_intent` → short, stable natural language string
- `responsibilities` → array of responsibility blocks
- `metadata` → preserve as opaque data

#### Tasks

| Task      | Description                                                                                                                                                 | Completed | Date |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-0031 | Define supported language whitelist: `python`, `javascript`, `javascriptreact`, `typescript`, `typescriptreact`.                                           |           |      |
| TASK-0032 | Validate active editor language against whitelist; abort gracefully if unsupported.                                                                         |           |      |
| TASK-0033 | Display user-facing notification when unsupported language detected.                                                                                        |           |      |
| TASK-0034 | Construct HTTP POST request payload per API contract above.                                                                                                 |           |      |
| TASK-0035 | Send POST request to `/api/iris/analyze` and await JSON response.                                                                                           |           |      |
| TASK-0036 | Validate response schema per API contract.                                                                                                                  |           |      |
| TASK-0037 | Handle errors (timeout, non-200 status, `success=false`) and surface readable messages. Reference API-002.                                                  |           |      |
| TASK-0038 | Log request lifecycle events to Output Channel per LOG-001.                                                

---

### Implementation Phase 4 — Extension State Model Definition

* GOAL-004: Define centralized extension-level state model as single source of truth (STATE-001).

| Task      | Description                                                                                         | Completed | Date |
| --------- | --------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-0041 | Define `IRISAnalysisState` enum: `IDLE`, `ANALYZING`, `ANALYZED`, `STALE`.                         |           |      |
| TASK-0042 | Create single in-memory state container owned by extension runtime.                                 |           |      |
| TASK-0043 | Define typed structures: `FileIntent`, `ResponsibilityBlock`, `AnalysisMetadata`.                   |           |      |
| TASK-0044 | Store raw server response alongside normalized semantic fields.                                     |           |      |
| TASK-0045 | Update state transitions on analysis trigger start per STATE-002.                                   |           |      |
| TASK-0046 | On `success=true`, persist analysis data and transition to `ANALYZED`.                              |           |      |
| TASK-0047 | On failure, clear data and transition to `IDLE` per API-002.                                        |           |      |
| TASK-0048 | Expose read-only selectors for webview and decorations per REQ-004.                                 |           |      |
| TASK-0049 | Log all state transitions per LOG-001, LOG-002.                                     

---

### Implementation Phase 5 — Webview Side Panel (Read-only)

* GOAL-005: Render analysis results in VS Code side panel using Webview, strictly read-only and state-driven (REQ-004).

| Task      | Description                                                                                           | Completed | Date |
| --------- | ----------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-0051 | Register Webview View container (e.g. `iris.sidePanel`) in `package.json`.                           |           |      |
| TASK-0052 | Implement Webview View Provider managing lifecycle without owning semantic state per REQ-004.        |           |      |
| TASK-0053 | Define minimal, static HTML structure for File Intent and Responsibility Blocks.                      |           |      |
| TASK-0054 | On `ANALYZED` state, serialize and send analysis data to webview.                                     |           |      |
| TASK-0055 | Render File Intent prominently at top of panel.                                                       |           |      |
| TASK-0056 | Render vertical list of Responsibility Blocks (title and description only, no interaction).           |           |      |
| TASK-0057 | Handle non-ANALYZED states per UX-001: empty state for `IDLE`, loading for `ANALYZING`, stale warning.|           |      |
| TASK-0058 | Ensure webview never persists or mutates data per REQ-004.                                            |           |      |
| TASK-0059 | Log webview initialization and updates per LOG-001.                                                    

---

### Implementation Phase 6 — Webview ↔ Extension Messaging

* GOAL-006: Define deterministic, typed messaging protocol using `blockId` as sole interaction identity (REQ-005).

#### blockId Generation Specification

**Canonical Signature**:
```ts
interface ResponsibilityBlockSignature {
  title: string      // normalized: trim, collapse whitespace
  entities: string[] // normalized: lowercase, sort lexicographically
}
```

**Hash Function**: SHA-1 hex encoding
**Format**: `blockId = rb_${sha1(JSON.stringify(signature)).slice(0, 12)}`

#### Message Contracts

**Webview → Extension**:
```ts
type WebviewMessage =
  | { type: "WEBVIEW_READY" }
  | { type: "BLOCK_HOVER"; blockId: string }
  | { type: "BLOCK_SELECT"; blockId: string }
  | { type: "BLOCK_CLEAR" }
```

**Extension → Webview**:
```ts
type ExtensionMessage =
  | { type: "STATE_UPDATE"; state: IRISAnalysisState }
  | { type: "ANALYSIS_DATA"; payload: { fileIntent: string; responsibilities: Array<{blockId, title, description}> }}
  | { type: "ERROR"; message: string }
```

#### Tasks

| Task      | Description                                                               | Completed | Date |
| --------- | ------------------------------------------------------------------------- | --------- | ---- |
| TASK-0061 | Implement `generateBlockId(signature)` using SHA-1 canonical encoding.    |           |      |
| TASK-0062 | Attach `blockId` to all blocks during Phase 4 normalization per REQ-005.  |           |      |
| TASK-0063 | Define strict TypeScript discriminated unions for all message types.      |           |      |
| TASK-0064 | Implement message listeners using `webview.onDidReceiveMessage`.          |           |      |
| TASK-0065 | Implement message dispatch from webview using `vscode.postMessage`.       |           |      |
| TASK-0066 | Enforce blockId-based routing; prohibit index/title-based logic.          |           |      |
| TASK-0067 | Ignore and log malformed or unknown message types per LOG-003.            |           |      |
| TASK-0068 | Log all blockId interactions per LOG-001.

---

### Implementation Phase 7 — Editor Decorations (Semantic Highlighting)

* GOAL-007: Visually highlight code regions based on responsibility blocks using decorations, driven by `blockId` (ED-001, ED-002).

#### Decoration Model

```ts
interface ResponsibilityBlockDecoration {
  blockId: string
  ranges: Array<{ startLine: number; endLine: number }> // zero-based, inclusive
}
```

**Color Strategy**: Stable, deterministic color per `blockId` via hash (ED-002).

**Decoration Types**: One `TextEditorDecorationType` per block, lazily created and cached.

**Interaction**: 
- `BLOCK_HOVER` → apply decorations
- `BLOCK_CLEAR` → remove decorations
- `STALE`/`IDLE` → dispose all per ED-003

#### Tasks

| Task      | Description                                                            | Completed | Date |
| --------- | ---------------------------------------------------------------------- | --------- | ---- |
| TASK-0071 | Define decoration manager for creating, caching, disposing per blockId.|           |      |
| TASK-0072 | Implement deterministic color generation from blockId per ED-002.      |           |      |
| TASK-0073 | Define data structures mapping blockId to editor line ranges.          |           |      |
| TASK-0074 | Apply decorations on `BLOCK_HOVER` using `editor.setDecorations`.     |           |      |
| TASK-0075 | Clear decorations on `BLOCK_CLEAR`, `IDLE`, `STALE` per ED-003.       |           |      |
| TASK-0076 | Dispose all decoration types to prevent memory leaks per ED-003.       |           |      |
| TASK-0077 | Log decoration lifecycle per LOG-001.

---

### Implementation Phase 8 — Focus Mode (Responsibility Block Selection)

* GOAL-008: Allow explicit focus on single responsibility block, visually de-emphasizing other code.

#### Focus State Model

```ts
interface FocusState {
  activeBlockId: string | null // null = no focus mode
}
```

**Visual Behavior**:
- Active block: enhanced decoration emphasis
- Inactive blocks: reduced opacity or subtle dimming
- Non-responsibility code: untouched

**Interaction**:
- `BLOCK_SELECT(blockId)` → enter Focus Mode
- `FOCUS_CLEAR` → exit Focus Mode
- Hover disabled while focused

**State Transitions**: Exit on `STALE`, `IDLE`, or editor switch.

#### Tasks

| Task      | Description                                             | Completed | Date |
| --------- | ------------------------------------------------------- | --------- | ---- |
| TASK-0081 | Extend extension state to include `FocusState`.         |           |      |
| TASK-0082 | Implement focused decoration style distinct from hover. |           |      |
| TASK-0083 | Apply selective dimming to non-focused blocks.          |           |      |
| TASK-0084 | Disable hover-based decorations while focused.          |           |      |
| TASK-0085 | Implement `FOCUS_CLEAR` message handling.               |           |      |
| TASK-0086 | Ensure focus exits on `STALE` and editor change.        |           |      |

---

### Implementation Phase 9 — File Change Handling & STALE State Transition

* GOAL-009: Invalidate analysis immediately on file modification (STATE-003, UX-001).

#### Core Rule

**Any edit to active file invalidates analysis.** No diffing, heuristics, or partial reuse.

**Change Detection**: Listen to `onDidChangeTextDocument` for non-empty content changes matching analyzed file URI.

**STALE Transition Behavior** (on first detected change after `ANALYZED`):
1. Transition state to `STALE` per STATE-003
2. Clear all editor decorations per ED-003
3. Exit Focus Mode
4. Notify Webview with `ANALYSIS_STALE` message per UX-001
5. Ignore subsequent edits while already `STALE`

**Webview Expectations**: Display "Outdated analysis" indicator, disable interactions, provide "Re-run Analysis" action.

#### Tasks

| Task      | Description                                               | Completed | Date |
| --------- | --------------------------------------------------------- | --------- | ---- |
| TASK-0091 | Register document change listeners scoped to active file. |           |      |
| TASK-0092 | Implement single-shot transition to `STALE` per STATE-003.|           |      |
| TASK-0093 | Clear decorations and focus state per ED-003.             |           |      |
| TASK-0094 | Send `ANALYSIS_STALE` message to Webview per UX-001.      |           |      |
| TASK-0095 | Prevent redundant STALE transitions.                      |           |      |
| TASK-0096 | Log file invalidation events per LOG-001.                 |           |      |

---

### Implementation Phase 10 — UX Polish, Error Handling & Stability

* GOAL-010: Make MVP robust, debuggable, and predictable under real usage.

#### Error Handling Strategy

Handled error categories: Server request failures, invalid API responses, unsupported language attempts, webview initialization failures.

Rules:
- Errors never crash extension
- All errors logged per LOG-001 and reflected in UI

#### UX Improvements

- Clear loading state during analysis request
- Disable duplicate analysis triggers while in-flight
- Graceful empty states: no active editor, unsupported file type, no results returned

#### Stability & Lifecycle

Ensure: decorations disposed on deactivation per ED-003, webview messages ignored when state invalid, no stale references to closed editors.

#### Tasks

| Task      | Description                                             | Completed | Date |
| --------- | ------------------------------------------------------- | --------- | ---- |
| TASK-0101 | Implement global error boundary for server calls.       |           |      |
| TASK-0102 | Add loading and disabled states to analysis trigger UX. |           |      |
| TASK-0103 | Validate API response shape defensively per API-002.    |           |      |
| TASK-0104 | Implement structured logging per LOG-001, LOG-002.      |           |      |
| TASK-0105 | Ensure full cleanup on extension deactivation.          |           |      |
| TASK-0106 | Final manual test pass across all phases.               |           |      |

---

## 3. Alternatives

* **ALT-001 — Automatic Analysis on File Open**
  Rejected to preserve explicit user intent and avoid ambiguous freshness states.

* **ALT-002 — Incremental / Diff-Based Reanalysis**
  Rejected due to high complexity and risk of misleading semantic overlays.

* **ALT-003 — Server-Generated blockId**
  Rejected to avoid coupling backend behavior to frontend identity guarantees.

* **ALT-004 — AST / Function-Based Responsibility Mapping**
  Rejected because Responsibility Blocks are semantic, not structural.

* **ALT-005 — Inline Editor UI Instead of Webview**
  Rejected to maintain clear separation between code and semantic context.

* **ALT-006 — Persistent Analysis Across Sessions**
  Rejected to avoid stale or misleading analysis restoration.

---

## 4. Dependencies

* **DEP-001 — Node.js (LTS)**
  Required for build and extension runtime.

* **DEP-002 — VS Code (Stable)**
  Required for Extension API, Webview, and editor decorations.

* **DEP-003 — TypeScript**
  Required for typed state models and message contracts.

* **DEP-004 — VS Code Extension API**
  Used for commands, editor access, webviews, and decorations.

* **DEP-005 — IRIS Analysis Server**
  Stateless REST API exposing `/api/iris/analyze`.

* **DEP-006 — SHA-1 Hash Utility**
  Used exclusively for deterministic `blockId` generation.

---

## 5. Files

This section defines the **expected file structure** of the IRIS VS Code Extension MVP.
Paths are relative to the extension root.

* **FILE-001 — `package.json`**
  Defines extension metadata, activation events, commands, and view contributions.

* **FILE-002 — `src/extension.ts`**
  Main extension entry point.
  Responsibilities:

  * Extension activation / deactivation
  * Command registration
  * State store initialization
  * Server integration
  * Webview and decoration orchestration

* **FILE-003 — `src/state/irisState.ts`**
  Centralized extension state model.
  Contains:

  * `IRISAnalysisState` enum
  * Normalized analysis data
  * Focus state
  * Read-only selectors

* **FILE-004 — `src/api/irisClient.ts`**
  HTTP client responsible for communicating with `/api/iris/analyze`.
  Handles request construction, response validation, and error normalization.

* **FILE-005 — `src/webview/sidePanel.ts`**
  Webview View Provider implementation.
  Responsible for:

  * Webview lifecycle
  * Message dispatch and receipt
  * Rendering presentation-safe analysis data

* **FILE-006 — `src/decorations/decorationManager.ts`**
  Manages editor decorations per `blockId`.
  Responsibilities:

  * Deterministic color generation
  * Decoration creation, caching, and disposal

* **FILE-007 — `src/utils/blockId.ts`**
  Implements deterministic `blockId` generation using SHA-1 canonical hashing.

---

## 6. Testing

This section defines **manual and deterministic verification steps** for the MVP.
Automated tests are explicitly out of scope.

### Functional Verification

* **TEST-001 — Command Activation**
  Verify the analysis command appears in the Command Palette and activates the extension.

* **TEST-002 — Editor Context Extraction**
  Verify correct filename, languageId, and full source text are extracted from the active editor.

* **TEST-003 — Server Integration Success Path**
  Trigger analysis and confirm:

  * Successful request
  * Correct parsing of `file_intent` and `responsibilities`
  * Transition to `ANALYZED` state

* **TEST-004 — Unsupported Language Handling**
  Trigger analysis on an unsupported file and verify graceful abort with user-facing message.

### UI & Interaction Verification

* **TEST-005 — Webview Rendering**
  Verify File Intent and Responsibility Blocks render correctly in the side panel.

* **TEST-006 — Hover Highlighting**
  Hover a responsibility block and verify corresponding editor decorations appear and clear correctly.

* **TEST-007 — Focus Mode**
  Select a responsibility block and verify:

  * Focus mode activates
  * Non-focused blocks are visually de-emphasized
  * Focus clears correctly

### State & Lifecycle Verification

* **TEST-008 — STALE Transition on Edit**
  Modify the analyzed file and verify:

  * Transition to `STALE`
  * Decorations are cleared
  * Webview reflects outdated state

* **TEST-009 — Editor Switch Handling**
  Switch active editors and verify decorations and focus state reset correctly.

* **TEST-010 — Extension Deactivation Cleanup**
  Deactivate the extension and confirm all resources are disposed safely.

---

## 7. Risks & Assumptions

* **RISK-001 — Semantic Misalignment**
  Server-generated Responsibility Blocks may not align perfectly with user expectations.

* **RISK-002 — Over-Highlighting**
  Visual decorations may introduce noise if responsibility ranges are too broad.

* **RISK-003 — Network Fragility**
  Analysis depends on server availability; no offline fallback exists in MVP.

* **ASSUMPTION-001 — Server Contract Stability**
  The `/api/iris/analyze` API contract will remain stable for the duration of the MVP.

* **ASSUMPTION-002 — Single Active File Mental Model**
  Users reason about one file at a time when using IRIS.

* **ASSUMPTION-003 — Manual Control Preference**
  Users prefer explicit analysis triggering over automatic behavior in early-stage tooling.

---
