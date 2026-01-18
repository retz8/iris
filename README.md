# IRIS

<p align="center">
  <img width="251" height="116" alt="iris_no_background" src="https://github.com/user-attachments/assets/9da5e421-12d5-41e5-bc48-bb85e345cc4b" />
</p>

> **"IRIS prepares developers to read code, not explains code."**

IRIS is an intelligent abstraction layer designed to bridge the gap between raw source code and natural language. Unlike traditional documentation tools or AI chat assistants that provide passive summaries, IRIS builds a **Progressive Abstraction Layer**—a high-fidelity "Table of Contents" that establishes a mental framework before a developer ever touches the implementation.

---

## 🏗 System Architecture: Dual-Path Analysis

IRIS employs a strategic dual-path architecture to balance deep cognitive accuracy with operational efficiency.

### 1. Tool-Calling Agent Path (Large/Complex Files)

For files that exceed cognitive or context limits, IRIS uses a **Hypothesis-Driven Verification** structure. This mimics how a senior engineer scans a folder:

* **Phase 1: Structural Hypothesis (Mental Mapping)**: IRIS scans the **Shallow AST** (metadata, imports, and node density) without reading the code. It predicts the file's intent based on its "territory."
* **Phase 2: Strategic Verification**: The agent calls `refer_to_source_code()` **only** to resolve uncertainties in "Black Box" nodes. It trusts metadata and skips clear sections to minimize "slop" and noise.
* **Phase 3: Synthesis**: Once the hypothesis is solidified, IRIS generates the final abstraction map.

### 2. Fast-Path Path (Small Files)

When a file is small enough to be analyzed in a single pass, IRIS skips the multi-stage verification to provide instant results.

* **Single-Stage Mapping**: The agent receives both the Full Source and Shallow AST simultaneously.
* **Direct Extraction**: It applies the same IRIS success criteria (Scatter Rule, Ecosystem Principle) to generate a high-quality JSON map immediately.

---

## 🧠 Core Philosophy & Success Criteria

IRIS is built on the principles defined in `philosophy.md`. Every analysis must meet these standards:

### 1. File Intent (The "WHY")

We define the **Systemic Identity** of a file, not just its behavior.

* **Identity over Passive Action**: We avoid vague verbs like "Manages," "Handles," or "Facilitates."
* **The Necessity Test**: We define the "Contract" the file maintains. If this file were deleted, what specific systemic promise would break?

### 2. Responsibility Blocks (The "WHAT")

Instead of listing functions, we extract **Logical Ecosystems**.

* **The Ecosystem Principle**: A block must unify **State + Logic + Constants + Types**. It is an autonomous unit of capability.
* **The Scatter Rule**: We group elements by logical purpose, even if they are physically 1,000 lines apart.
* **The Move-File Test**: "If I moved this feature to a separate file, what set of code must move with it to keep it functional?"

---

## Technical Details

### Shallow AST
 A custom tree-sitter based reduction engine that identifies "High-Density Nodes" and metadata while stripping implementation noise.

### 📂 IRIS Analysis Schema (v1.0)

The schema is divided into four primary segments: **Verification Metadata**, **Systemic Intent**, **Capability Blocks**, and **Technical Metadata**.

#### 1. Hypothesis Verification (`hypothesis_verification`)

This section is primarily used in the **Tool-Calling Path** to provide an audit trail of the agent's reasoning. It ensures the agent isn't just "guessing" but is actively verifying its mental model.

* `initial_hypothesis`: The first impression based purely on imports and Shallow AST.
* `verification_steps`: A concise log of what was read (`refer_to_source_code`) and, more importantly, what was intentionally skipped.
* `refinement`: How the initial guess evolved after seeing the actual implementation.

#### 2. File Intent (`file_intent`)

The "Abstract" of the file. It must be a **Single-Identity Statement**.

* **Constraint**: No banned verbs (Facilitates, Handles, etc.).
* **Goal**: Define the architectural layer and the systemic contract.

#### 3. Responsibility Blocks (`responsibilities`)

The core of the IRIS model. Each block represents a **Logical Ecosystem**.

| Field | Description | Requirement |
| --- | --- | --- |
| `id` | Kebab-case unique identifier. | `string` |
| `label` | A 2-5 word **Identity** (e.g., "Spatial Constraint Resolver"). | **No Banned Verbs** |
| `description` | How this block contributes to the file's overall intent. | Narrative |
| `elements` | A map of code symbols: `functions`, `state`, `imports`, `types`, `constants`. | Complete Set |
| `ranges` | An array of line ranges `[[start, end]]` covering the scattered logic. | **Scatter-Aware** |

#### 4. Metadata (`metadata`)

Structural health indicators for the file.

* `logical_depth`: **Deep** (complex logic, many internal dependencies) vs. **Shallow** (orchestration, glue code).
* `notes`: High-level architectural warnings (e.g., "This file acts as a Singleton," or "High technical debt in the export logic").

---

### 🛠 The Schema (JSON Definition)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "IRIS Analysis Output",
  "type": "object",
  "required": ["file_intent", "responsibilities"],
  "properties": {
    "hypothesis_verification": {
      "type": "object",
      "properties": {
        "initial_hypothesis": { "type": "string" },
        "verification_steps": { "type": "string" },
        "refinement": { "type": "string" }
      }
    },
    "file_intent": { 
      "type": "string",
      "description": "Systemic identity and contract of the file."
    },
    "responsibilities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "label", "description", "elements", "ranges"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "description": { "type": "string" },
          "elements": {
            "type": "object",
            "properties": {
              "functions": { "type": "array", "items": { "type": "string" } },
              "state": { "type": "array", "items": { "type": "string" } },
              "imports": { "type": "array", "items": { "type": "string" } },
              "types": { "type": "array", "items": { "type": "string" } },
              "constants": { "type": "array", "items": { "type": "string" } }
            }
          },
          "ranges": {
            "type": "array",
            "items": {
              "type": "array",
              "minItems": 2,
              "maxItems": 2,
              "items": { "type": "integer" }
            }
          }
        }
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "logical_depth": { "enum": ["Deep", "Shallow"] },
        "notes": { "type": "string" }
      }
    }
  }
}

```

---

### 💡 Why this Schema matters for IRIS

By enforcing this schema, IRIS transforms the developer experience:

1. **Searchability**: A developer can query for "Responsibilities with `label` containing 'Resolver'" across the entire codebase.
2. **Visualization**: This JSON can be rendered into an interactive UI (like the Chrome Extension you are building) to highlight scattered code blocks in different colors.
3. **Consistency**: Whether the code is JavaScript, Python, or Rust, the **Abstaction Format** remains the same, providing a unified "language of intent."

Would you like me to add a **"Usage Example"** section to the README showing a side-by-side comparison of raw code vs. this JSON output?

---

## 🚀 Vision

IRIS is not just a tool; it's a new way to represent programs. We believe that between **Source Code** and **Natural Language**, there exists a vital intermediate layer of **Intelligent Abstraction**.

**IRIS is that bridge.**

---

*For a deeper dive into our mission, see [philosophy.md](docs/philosophy.md).*

---
