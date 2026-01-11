
# IRIS Multi-Agent Pipeline – Updated Version (AST + Raw Text Evidence)

## Overview

This document provides detailed instructions for implementing the **updated multi-agent pipeline** for IRIS, incorporating an **AST + raw text evidence-based Compressor**.  

The update addresses performance and semantic clarity issues in the original pipeline.  

### Key Design Principles

1. **Compressor is strictly structural**
   - Must NOT perform any semantic interpretation.
   - Must output **JSON with AST nodes + raw text addresses only**.
   - No LLM usage in this stage.

2. **Question Generator & Explainer operate on raw slices**
   - LLMs are only invoked in these agents.
   - They retrieve only the relevant **raw source slices** as identified by the Compressor.
   - Explainer generates meaning; Question Generator identifies questions.

3. **Skeptic validates**
   - Only verifies Explainer output against AST structure + raw text evidence.
   - Provides feedback for iterative refinement.

---

## Updated Agent Responsibilities

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **Compressor** | Structural extraction | Raw source code | JSON: AST nodes, function metadata, global state, raw text block addresses |
| **Question Generator** | Identify uncertainty points | Compressor JSON | Questions referencing AST nodes + raw slice addresses |
| **Explainer** | Generate meaning | Compressor JSON + raw slices from Question Generator | Structured explanation of function intent, responsibilities, and global state interactions |
| **Skeptic** | Verification | Explainer output + Compressor JSON | Feedback highlighting inconsistencies, ambiguities, or risks |

---

## Compressor Output Schema

```json
{
  "file": { "path": "string", "language": "string", "loc": { "total": 1031, "code": 900, "comment": 131 } },
  "symbols": {
    "functions": [ /* AST nodes with loc and comment addresses */ ],
    "globals": [ /* global variables with read/write tracking */ ],
    "classes": []
  },
  "source_map": {
    "function:loadHumanModel": {
      "loc": [416, 487],
      "comments": { "leading": [410, 415], "inline": [432, 455] }
    }
  },
  "global_state": { /* variable lifecycles */ },
  "control_flow_skeleton": { "calls": { "init": ["loadHumanAndWheelchairModels"] } }
}
```

---

## Source Slicing Strategy

* **Raw source is never fully tokenized** for LLMs.
* Compressor provides **addresses for slices** (start/end lines) for each AST node.
* Agents request slices by reference for **token-efficient processing**.
* Example:

```json
{
  "need_source": [
    { "ref": "function:optimizeHumanAlignment" },
    { "ref": "global:wheelchairParams" }
  ]
}
```

---

## Agent Behavior – Detailed Instructions

### 1. Compressor

* **Input:** Full source code.
* **Output:** JSON with:

  * AST nodes
  * Function/Global/Class metadata
  * Raw text block addresses (leading/inline comments, docstrings, TODOs)
  * Call graph skeleton (AST-only)
* **Rules:**

  * NO semantic interpretation
  * NO natural language summaries
  * Deterministic, cacheable
  * Zero LLM calls
  * Must preserve naming, comment text, and position references

---

### 2. Question Generator

* **Input:** Compressor JSON
* **Output:** Questions referencing AST nodes and raw slices
* **Behavior:**

  1. Identify points of uncertainty:

     * Functions with complex global state interactions
     * AST nodes with incomplete or misleading comments
     * Entry points and lifecycle hooks
  2. Request only **relevant raw slices** from the raw source store
  3. Generate question prompts in JSON format
* **Example Output:**

```json
{
  "questions": [
    { "target": "function:loadHumanModel", "type": "consistency", "prompt_slice": ["lines 416-487 + leading comments"], "question": "Do the comments match what the function actually does?" }
  ]
}
```

---

### 3. Explainer

* **Input:** Compressor JSON + raw slices requested by Question Generator
* **Output:** Structured JSON explaining:

  * Function intent
  * Responsibilities
  * Global state read/write interactions
  * Consistency with comments
* **Rules:**

  * Only uses AST structure and raw slices provided
  * Must output in a **strict JSON schema** to enable Skeptic verification
* **Example Output:**

```json
{
  "function:loadHumanModel": {
    "intent": "Load and initialize human mesh from 3D file",
    "responsibilities": ["Create human mesh", "Set rotation, scale, and position", "Attach to scene"],
    "comments_consistency": true,
    "reads_globals": ["wheelchairParams"],
    "writes_globals": ["humanMesh"]
  }
}
```

---

### 4. Skeptic

* **Input:** Explainer JSON + Compressor JSON
* **Output:** Verification report and feedback for iteration
* **Checks:**

  * AST node consistency
  * Comment alignment
  * Global state usage validation
  * Detect missing or inconsistent responsibilities
* **Example Output:**

```json
{
  "issues": [
    { "target": "function:fitWheelchairToHuman", "type": "comment_mismatch", "details": "Docstring mentions seat width adjustment, but function also changes GUI" },
    { "target": "global:wheelchairParams", "type": "lifecycle_risk", "details": "Modified in multiple functions without clear order" }
  ],
  "confidence_score": 0.65
}
```

---

## 5. LangGraph Flow – Updated Diagram

```text
+----------------+
|  Raw Source    |
+----------------+
        │
        ▼
+----------------+
|  Compressor    | (AST + Raw Text Evidence)
+----------------+
        │ JSON: AST nodes + addresses
        ▼
+----------------+
| Question Gen   | (LLM)
+----------------+
        │ Questions + raw slice requests
        ▼
+----------------+
| Explainer      | (LLM)
+----------------+
        │ Structured meaning JSON
        ▼
+----------------+
| Skeptic        | (LLM optional)
+----------------+
        │ Feedback to Question Gen / Explainer
        └───────────────┐
                        │ Iteration Loop
```

* Compressor is **deterministic and fast**
* Only Question Generator, Explainer, and Skeptic invoke LLMs
* Raw source is **never fully tokenized**; slices are provided on demand
* Feedback loop continues until Skeptic approves

---

## 6. Token Efficiency Strategy

1. Raw source **never sent in full**
2. Compressor provides **AST + line ranges** for slices
3. Question Generator requests slices selectively
4. Explainer sees only **relevant slices**
5. Skeptic validates JSON without additional raw slices

Result:

* Minimum LLM token usage
* Maximum retention of semantic information
* Deterministic, reproducible analysis

---

## 7. Implementation Notes

* **AST Parser**: Use language-specific parser (`tree-sitter`, `@babel/parser`, `ast` for Python)
* **Raw Text Mapping**: Leading/inline comments, TODOs, docstrings
* **JSON Schema Enforcement**: All agents must strictly adhere
* **Iteration Control**: LangGraph handles loops until Skeptic confirms
* **No LLM in Compressor**: strictly rule-based

---

## 8. Summary

* **Compressor**: structural indexing only, outputs JSON with AST nodes + raw text addresses
* **Question Generator**: identifies points needing explanation, requests slices
* **Explainer**: generates meaning, outputs structured JSON
* **Skeptic**: validates, triggers iteration loop
* **LangGraph Flow**: deterministic Compressor → selective raw slice LLM agents → Skeptic feedback loop

This updated multi-agent design ensures:

* Token efficiency
* Meaning retention
* Clear agent responsibilities
* Deterministic first stage (Compressor)
* Scalable, iterative feedback mechanism

```
```
