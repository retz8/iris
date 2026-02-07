# IRIS Background

## One-line definition
IRIS prepares developers to read code, not explain it.

## Problem statement
Code review and code comprehension have become the bottleneck in modern development, especially as AI generates more code. Developers spend more time validating and understanding unfamiliar codebases, which increases cognitive load and slows delivery.

## IRIS approach
IRIS bridges the gap between raw source code and natural language by providing an intermediate abstraction layer. Instead of forcing a direct “code → natural language” leap, IRIS uses progressive abstraction to preserve accuracy while reducing mental effort.

## Core concepts
- **File Intent (WHY)**: A concise statement of why a file exists in the system.
- **Responsibility Blocks (WHAT)**: The major conceptual units inside a file, ordered by comprehension flow rather than code order.

Together, these form a “table of contents” for code that enables fast skimming and structured navigation.

## Principles
- **Progressive abstraction** over radical transformation.
- **Structure first, details later** for faster understanding.
- **Cognitive load reduction** without losing technical precision.
- **Selective depth** so developers can choose how far to dive.

## Scope boundaries (MVP)
IRIS focuses on comprehension, not editing or refactoring.
- No inline editing of intent or blocks.
- No chat-based explanations.
- No automatic refactoring or code quality judgments.
- No real-time re-analysis while typing.

## Product phases
1. **Phase 1 (Current)**: File Intent + Responsibility Blocks.
2. **Phase 2 (Mid-term)**: Data flow and call graph–aware exploration.
3. **Phase 3 (Long-term)**: A new intermediate representation that precedes natural language programming.
