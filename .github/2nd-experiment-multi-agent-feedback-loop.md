## Title

**Experiment 2: Multi-Agent Feedback Loop for Robust File Intent & Responsibility Extraction**


backend/src/exp-multi-agents

API:
POST /exp-multi-agents
---

## Motivation

While the single-LLM approach prioritizes speed, it has limitations:

* Reduced robustness on large or complex files
* Limited ability to challenge its own assumptions
* Difficulty scaling to very long source code due to token constraints

This experiment explores a **multi-agent feedback loop** designed to:

* Improve abstraction quality
* Handle longer source files
* Explicitly model disagreement and validation

---

## Core Philosophy

IRIS is not a system that outputs “correct answers”.

It is a system that:

> **Simulates a plausible, human-like code reading process**
> and converges on a *defensible* mental model.

Disagreement, questioning, and refinement are **features**, not bugs.

---

## High-Level Architecture

The system is composed of **multiple agents**, each with a strict cognitive role.

Agents communicate through **structured intermediate artifacts**, not raw source code.

This ensures:

* Token efficiency
* Clear responsibility boundaries
* Scalable reasoning over large files

---

## Key Concept: Mid-Level Source Abstraction

Before any reasoning loop begins, raw source code is transformed into a **mid-level semantic abstraction**.

This abstraction:

* Is lossy by design
* Captures what a human would remember after skimming code
* Is optimized for reasoning, not execution

All downstream agents operate **only on this abstraction**, never raw code.

---

## Agent Roles

### 1. The Compressor

**Responsibility**

* Convert raw source code into mid-level semantic blocks
* Summarize functions, shared state, and control flow

**Constraints**

* No interpretation
* No inferred intent
* Single execution per file to minimize cost

---

### 2. The First-Time Reader (Question Agent)

**Responsibility**

* Act as a developer unfamiliar with the codebase
* Generate questions that naturally arise while reading

These questions define:

> The minimum information required to understand the file.

They also serve as:

* A checklist for abstraction completeness

---

### 3. The Explainer (Intent & Responsibility Agent)

**Responsibility**

* Generate:

  * File Intent (WHY)
  * Responsibility Map (WHAT)

**Key Rule**

* Every generated question must be answerable using the abstraction.
* If a question cannot be answered, the abstraction is insufficient.

---

### 4. The Skeptic (Validation Agent)

**Responsibility**

* Challenge the generated abstraction
* Attempt to disprove or weaken:

  * File intent statements
  * Responsibility boundaries
  * Implicit assumptions

This agent always tries to say:

> “This might be wrong — prove it.”

---

## Feedback Loop Dynamics

The system runs for a **bounded number of iterations**.

After each iteration:

* Unanswered questions are surfaced
* Weak or speculative claims are revised
* Responsibilities may be merged, split, or removed

The loop terminates when:

* All key questions are reasonably answered, or
* The skeptic cannot raise new meaningful objections, or
* An iteration limit is reached

---

## Design Priorities

* **Plausibility over perfection**
* **Clarity over completeness**
* **Cognitive usefulness over technical accuracy**

The output should help a developer:

> Understand the file’s role in minutes — not master its implementation.

---

## Expected Outcome

This experiment evaluates whether:

* Multi-agent disagreement improves abstraction quality
* Mid-level abstraction enables scaling to long files
* Feedback loops produce more stable and trustworthy intent models

This approach is intended as:

> A higher-confidence, higher-cost alternative to the single-LLM baseline.

---

## Closing Note

Both experiments share the same north star:

> **Reduce cognitive load during first-contact code reading
> by externalizing the mental model a human would naturally build.**

