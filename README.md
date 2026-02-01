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
