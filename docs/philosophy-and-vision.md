# IRIS Philosophy and Vision

> **IRIS prepares developers to read code, not explain it.**

## One-Line Vision

**IRIS is a universal, OS-level code reading assistant that overlays structured understanding onto any code, anywhere it appears.**

IRIS does not aim to replace IDEs, editors, or browsers. It introduces a new layer: a reading interface for code, independent of where that code is rendered.

## The Problem: Code Review Is the New Bottleneck

The history of programming is a story of rising abstraction:

```
Machine Code → Assembly → Procedural (C) → Object-Oriented (Java)
    → High-Level (Python) → AI Assistants (Copilot, Cursor, Claude Code)
    → ??? (Natural Language)
```

Modern development is no longer bottlenecked by writing code, but by reading, validating, and understanding it. AI helps with generation — but understanding and validation remain human responsibilities.

```
Requirements → AI generates code → Engineers review code ← BOTTLENECK → Deploy
```

Code now appears everywhere — IDEs, GitHub, terminals, diffs, PR reviews, generated outputs. Yet every environment forces developers to rebuild understanding from raw syntax each time. IRIS exists to solve this.

## What IRIS Is (and Is Not)

**IRIS is:**
- A code reading tool, not a code editing tool
- A progressive abstraction layer over source code
- A system that prepares developers to read code before inspecting implementation details
- Environment-agnostic in intent: IDE, browser, terminal, or otherwise

**IRIS is not:**
- An IDE replacement
- A refactoring or code generation tool
- A chat-based explanation assistant
- A documentation generator

IRIS does not explain code. It structures the mental model required to read it efficiently.

## Core Philosophy: Progressive Abstraction

The wrong approach: `Code → Natural Language` (too radical a leap — technology isn't ready, trust hasn't been established, the gap is too wide).

IRIS's approach: `Code → Intermediate Abstraction → Natural Language` (progressive evolution).

**Key insight:** Developers need a bridge between low-level code and high-level natural language. IRIS provides intermediate abstraction layers that reduce cognitive load while maintaining technical accuracy.

### The Table of Contents Analogy

Just as a table of contents enables you to understand a long document without reading every word, IRIS provides structural context that makes code comprehensible at a glance.

When you read a book: title → table of contents → skim chapters → understand the whole.

When you read code with IRIS: File Intent (WHY) → Responsibility Blocks (WHAT) → navigate to relevant sections → understand the file without reading every line.

**IRIS enables skimming for code.**

## The Two Core Abstractions

### File Intent (WHY)

A concise noun phrase describing why the file exists in the system. Establishes a mental frame before reading. Stable across refactors.

**Format:** `[System Role] + [Domain] + [Primary Responsibility]` (not strict, but noun phrase only — not a sentence).

**Good examples:**
- Menu category flattening utility
- JSON schema validation helpers
- Mobile offline sync resolution engine
- Genomics variant-calling batch processor
- Edge IoT telemetry normalization gateway

### Responsibility Blocks (WHAT)

A structured list of the major conceptual responsibilities within a file — the table of contents for code.

- Not a function list
- Not bound to contiguous code regions
- Ordered by comprehension flow, not source order
- Each block represents a single reason to change

**Good examples:**
- Menu list flattening (functions: `convertMenuByCategoryToRawList`, `mapMenuItem`)
- Checkout session bootstrap (functions: `createSession`, `attachLineItems`)
- Log parsing and normalization (functions: `parseLine`, `normalizeFields`, `emitRecord`)
- Streaming feature extraction (functions: `windowEvents`, `computeFeatures`)
- Infrastructure drift analysis (functions: `scanResources`, `diffState`, `formatReport`)

**Bad examples (and why):**
- "Misc utilities and helpers" — too vague; not a single reason to change
- "Input parsing and database writes" — two independent concerns bundled
- "Configuration and error handling and logging" — title needs "and"; multiple change drivers
- "Everything else" — catch-all provides no navigational value

**Block size rules:**
- Minimum: a block has a single, independent reason to change. If it cannot change without the adjacent block changing, it is too small.
- Maximum: if the title needs "and" to be accurate, or bundles multiple distinct reasons to change, split it.

**Flow-based ordering:** Order blocks by reader comprehension flow (e.g., input → transform → optimize → output), not by physical code order. The first block establishes the mental entry point; each subsequent block answers "what comes next in understanding?"

**Split checklist — split when any of these are true:**
- Two or more distinct reasons to change exist in the same block
- The block title naturally requires "and" to be accurate
- Different stakeholders would change different parts independently
- The block mixes orchestration (control flow) with deep domain logic that could stand alone

**Keep together when all are true:**
- Steps are required to fulfill a single intent
- Parts are tightly coupled and lose meaning if separated
- A single noun-phrase title captures the block clearly

## Architectural Principle

IRIS must maintain strict separation between a platform-agnostic core and platform-specific adapters.

**IRIS Core responsibilities** (no knowledge of host environment):
- File Intent and Responsibility Block domain models
- Interaction state management (hover, select, focus)
- Navigation semantics between conceptual units
- UI layout and presentation logic
- Communication with the IRIS analysis server

**Platform adapter responsibilities** (intentionally minimal):
- Acquiring visible code text
- Mapping abstract ranges to screen or line positions
- Rendering overlays and highlights
- Handling user input events

This separation ensures IRIS's core abstractions remain stable as the product expands across environments.

## Product Roadmap

### Phase 1 — IDE-Native Reading (Current)

Prove the IRIS abstraction with maximum structural accuracy.

- VS Code extension (and future: Cursor, Monaco-based editors)
- Automatic file analysis on open or manual trigger
- File Intent + Responsibility Blocks with precise line-based highlights
- Stable IRIS Core abstraction and data model

IDEs provide the richest, most reliable code context — enabling rapid iteration on abstraction quality and UX.

### Phase 2 — Browser-Based Code Reading

Extend IRIS to where code is frequently read, not edited.

- Browser extension for GitHub and similar code viewers
- DOM-based line mapping and overlay rendering
- Shared IRIS Core with IDE integrations

Code review increasingly happens in the browser. This phase validates IRIS as an environment-agnostic reading layer and forces clean Core/adapter separation.

### Phase 3 — Unified IRIS UI Shell

Decouple IRIS's UI identity from host platforms.

- Shared standalone UI shell rendered consistently across IDE and browser
- Platform adapters reduced to input/output bridges
- Strong visual identity independent of IDE conventions

IRIS becomes a product, not a plugin.

### Phase 4 — OS-Level IRIS Agent (Visionary)

Make IRIS available wherever code appears on screen.

- Native background application (macOS / Windows)
- Global hotkeys or selection-based invocation
- Screen-level overlay UI via accessibility APIs
- IRIS invoked independently of IDE or browser

This completes the vision: one consistent reading experience, independent of editor or tool choice.

## Design Principles

1. **Progressive abstraction** — never force a radical leap; each layer prepares for the next
2. **Structure first, details later** — understand architecture before implementation; skim first, deep-dive selectively
3. **Cognitive load reduction** — externalize the mental model developers naturally build; make the implicit explicit
4. **Technical accuracy** — abstraction does not mean oversimplification; every layer is verifiable and traceable to source
5. **Selective depth** — support both the junior developer who needs more abstraction and the senior who wants a quick structural overview

## Success Criteria

**Phase 1 (current):**
- Developers understand unfamiliar files in minutes instead of hours
- Code review time reduced by 30-50%
- Onboarding new engineers to codebases 2x faster

**Phase 2:**
- Developers navigate large codebases without getting lost
- Selective exploration replaces exhaustive reading
- Mental models externalized and shareable

**Phase 3-4:**
- A new intermediate representation becomes an industry standard
- Source code viewed as a compilation target, not the primary artifact
- IRIS's abstraction model adopted as the paradigm before natural language programming

## The Long-Term Bet

Natural language programming is inevitable — it is the logical endpoint of abstraction evolution. The transition will be gradual, not a sudden replacement. Intermediate abstraction is necessary: developers need a bridge. Code comprehension is the bottleneck, not generation. A new paradigm is needed — not just better tools, but a new way to represent programs.

> "We cannot leap from assembly to Python in one step.
> We cannot leap from code to natural language in one step.
> But we can build the bridges between them.
> IRIS is that bridge."

The OS-level universal reader is the destination, not the starting point. IRIS must earn this future by perfecting its abstractions, proving its value in constrained environments, and maintaining architectural discipline from the beginning.
