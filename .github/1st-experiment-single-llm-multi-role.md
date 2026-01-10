## Title

**Experiment 1: Single LLM, Single Prompt for File Intent & Responsibility Map**

backend/src/exp-single-llm

API:
POST /exp-single-llm
---

## Goal

The goal of this experiment is to validate whether a **single LLM call**, using **one carefully designed prompt**, can generate:

* **File Intent** (WHY this file exists)
* **Responsibility Map** (WHAT responsibilities this file fulfills)

using **only source code as input**.

This experiment intentionally treats the LLM as a **black box** and evaluates only the quality and usefulness of the final output.

---

## Core Problem

Source code is a low-level, objective artifact.

File intent and responsibilities are:

* High-level
* Subjective
* Human-centric abstractions

The problem we are solving is:

> Can an LLM infer a **useful first-reader mental model**
> from raw source code alone, in a single pass?

---

## Key Constraints

* **Input is strictly limited to:**

  * Source code
  * File name
  * File extension
* No repository-level context
* No external documentation
* One LLM invocation per file

This constraint exists to:

* Minimize cost
* Simplify system design
* Establish a strong baseline

---

## Abstraction Targets

### 1. File Intent (WHY)

A short, high-level explanation answering:

* Why does this file exist?
* What problem does it primarily solve?
* In what context would this file be used?

This should be:

* Concise
* Conceptual
* Independent of implementation details

---

### 2. Responsibility Map (WHAT)

A structured list of the file’s major responsibilities.

Each responsibility:

* Represents a distinct role or concern
* Is understandable without reading the code
* Can be mapped back to specific regions of the file

The responsibility map should:

* Reflect how a human would mentally chunk the file
* Avoid over-fragmentation
* Avoid line-by-line descriptions

---

## Design Principles

* **Output-first evaluation**
  Internal reasoning is irrelevant; only the final abstraction matters.

* **Human usefulness over technical precision**
  The abstraction should help a developer orient themselves quickly.

* **One-pass generation**
  No iterative refinement, no feedback loops.

---

## Success Criteria

This experiment is considered successful if:

* A developer can understand the file’s purpose within minutes
* The responsibility map feels “natural” rather than forced
* The abstraction aligns with what a human reviewer would reasonably conclude

Failure is acceptable and informative — this experiment exists to determine whether more complex approaches are necessary.

---

## Role of This Experiment

This experiment serves as:

* A baseline for abstraction quality
* A reference point for cost vs. benefit
* A comparison target for multi-agent approaches

If this approach fails on larger or more complex files, it directly justifies the next experiment.

---

## Implementation Plan for Copilot

**TL;DR:** Build a `POST /exp-single-llm` endpoint that takes source code and returns structured File Intent and Responsibility Map data. The endpoint uses a single OpenAI API call with a carefully designed prompt to extract semantic abstractions from the code without external context.

### Steps

1. **Create the data model and response schema**  
   Define Python classes/dictionaries for `FileIntent` and `Responsibility` (with id, label, description, and line ranges), plus a response wrapper class.

2. **Design the LLM prompt template**  
   Craft a single prompt that instructs OpenAI to extract File Intent (1–4 lines, conceptual) and 3–6 Responsibilities (each with title, description, and line number ranges). Include example output format in the prompt.

3. **Implement the API endpoint**  
   Create `POST /exp-single-llm` in `backend/src/server.py` that accepts source code, filename, and file extension. Call OpenAI API with the prompt template. Parse the JSON response and return structured data.

4. **Add OpenAI client setup**  
   Initialize OpenAI API client in `backend/src/server.py` using environment variable for API key. Add error handling for API failures, rate limits, and invalid responses.

5. **Add input validation and safety checks**  
   Validate that source code isn't too large (set reasonable size limit), filename/extension are provided, and response from OpenAI is valid JSON before returning to client.

### Further Considerations

1. **Prompt engineering specifics**: Should the prompt emphasize detecting semantic groupings by analyzing function boundaries, class definitions, or module-level code patterns? Or let the LLM infer naturally from the code?

2. **Token budget & cost**: Should we use `gpt-4o-mini` (cheapest) or `gpt-4o` (higher quality) for this experiment? This affects accuracy vs. cost trade-off.

3. **Line range accuracy**: How strictly should responsibilities map to exact line ranges? Should we request the LLM to identify line numbers directly, or validate/adjust them post-processing?
