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

---

## Implementation Plan
- **Goal**: Embed LangGraph into Flask server to implement `/exp-multi-agents` endpoint
- **Output**: File Intent (WHY) + Responsibility Map (WHAT)
- **Approach**: 4 Agent Feedback Loop

---

### Phase 0: Environment Setup

#### 0.1 Dependencies
- Add `langgraph`, `langchain-openai` to `requirements.txt`
- Verify no conflicts with existing `openai` package

#### 0.2 Directory Structure
- `backend/src/exp_multi_agents/` folder

---

### Phase 1: Data Model Definition

#### 1.1 State Model
- Define LangGraph state object
- Fields: raw_code, mid_level_abstraction, questions, file_intent, responsibilities, iteration_count, is_complete

#### 1.2 Mid-Level Abstraction Model
- Define Compressor output structure
- Include: function summaries, global state, control flow patterns

#### 1.3 Output Model
- Reuse or extend `AnalysisResult` from 1st experiment
- Leverage existing `FileIntent`, `Responsibility` classes

---

### Phase 2: Individual Agent Implementation

#### 2.1 Compressor Agent
- Role: Raw code → Mid-level semantic abstraction
- Input: Source code, filename, language
- Output: Structured intermediate representation (function list, role summaries, dependencies)
- Constraint: Facts only, no interpretation, single execution
- Cache: need separate caching for compressed source code

#### 2.2 First-Time Reader Agent (Question Agent)
- Role: Simulate developer encountering code for the first time
- Input: Mid-level abstraction
- Output: List of questions needed for comprehension
- Example questions: "What is the main purpose of this file?", "Why are these functions grouped together?"

#### 2.3 Explainer Agent
- Role: Generate File Intent + Responsibility Map
- Input: Mid-level abstraction, question list
- Output: Intent text, Responsibility list
- Constraint: Must be able to answer all generated questions

#### 2.4 Skeptic Agent
- Role: Validate and challenge generated abstractions
- Input: File Intent, Responsibilities, Mid-level abstraction
- Output: Counterarguments, weaknesses, revision suggestions
- Behavior: "Prove it" perspective, actively challenge claims

---

### Phase 3: LangGraph Flow Construction

#### 3.1 Graph Definition
- Create `StateGraph` instance
- Register nodes: compressor, question_generator, explainer, skeptic
- Set entry point: compressor

#### 3.2 Edge Definition
- compressor → question_generator
- question_generator → explainer
- explainer → skeptic
- skeptic → conditional branch (loop or end)

#### 3.3 Conditional Branch Logic
- Termination conditions:
  - All key questions resolved
  - Skeptic has no meaningful objections
  - Iteration limit reached (e.g., 3 iterations)
- Continue condition: Return to question_generator for retry

#### 3.4 Loop Implementation
- Skeptic objection → Explainer revision → Skeptic re-validation
- Increment and check iteration_count

---

### Phase 4: Flask Integration

#### 4.1 Endpoint Implementation
- `POST /exp-multi-agents` route
- Parse request: filename, language, lines, metadata
- Invoke Graph execution
- Serialize response

#### 4.2 Error Handling
- Handle LLM API failures
- Set timeout (feedback loop may take longer)
- Option to return partial results

#### 4.3 Cache Integration
- Utilize existing `CacheManager`
- Cache key: filename + content_hash
- Store completed analysis results

---

### Phase 5: Testing and Validation

#### 5.1 Unit Tests
- Test each Agent individually
- Validate output format with mock inputs

#### 5.2 Integration Tests
- Execute full Graph flow
- End-to-end testing with sample files

#### 5.3 Comparison with 1st Experiment
- Compare results from both experiments on same files
- Measure quality, cost, and time

---

### Phase 6: Optimization (Optional)

#### 6.1 Token Optimization
- Adjust mid-level abstraction compression ratio
- Remove unnecessary context

#### 6.2 Parallel Processing
- Evaluate parallelization for independent agent calls

#### 6.3 Early Termination
- Simple files terminate after 1 iteration
- Adaptive loop based on complexity

---

### Expected File Structure

```
backend/src/exp_multi_agents/
├── __init__.py
├── graph.py              # LangGraph definition
├── state.py              # State model
├── models.py             # Output data models
├── agents/
│   ├── __init__.py
│   ├── compressor.py
│   ├── question_generator.py
│   ├── explainer.py
│   └── skeptic.py
└── prompts/
    ├── compressor.py
    ├── question_generator.py
    ├── explainer.py
    └── skeptic.py
```
---

## Experiment Results Summary (Current Status)

This experiment validated the **practical effectiveness of a multi-agent feedback loop**
for extracting **File Intent (WHY)** and **Responsibility Maps (WHAT)** from non-trivial source files.

The focus of this phase was **not implementation**, but **output quality under iterative pressure**.

---

## Key Findings

### 1. Single-Pass Explanation Is Structurally Unstable

Initial Explainer outputs tended to:

- Overgeneralize responsibilities
- Introduce meta-level commentary
- Hide uncertainty using abstract labels
  (e.g., “control flow management”, “error handling strategy”)

These outputs appeared “reasonable” but **collapsed under scrutiny**:
they were hard to falsify, hard to challenge, and cognitively unhelpful.

**Conclusion**  
A single-pass explainer cannot reliably produce a defensible mental model for first-time readers.

---

### 2. Question-Driven Explanation Improves Precision

Introducing a **First-Time Reader Question Agent** significantly improved clarity.

Observed effects:

- Responsibilities became more concrete
- Overlapping or vague responsibilities were naturally eliminated
- Explanation shifted from “what sounds right” to “what must be answered”

Questions acted as:

- A **minimum information boundary**
- An implicit correctness constraint on the Explainer

**Conclusion**  
Questions are an effective forcing function for abstraction quality.

---

### 3. Skeptic Pressure Forces Responsibility Grounding

When the Skeptic role was conceptually introduced, a clear pattern emerged:

- Responsibilities that could not be tied to:
  - a concrete capability, or
  - a specific code region  
  became indefensible

This resulted in a shift from:

> Conceptual, architectural labels  
→ **Functionally grounded responsibilities**

Accepted responsibilities converged toward:

- One responsibility ≈ one concrete capability
- Clearly traceable line ranges
- No speculative or defensive language

**Conclusion**  
Skeptic pressure is essential for removing “soft abstractions”.

---

### 4. File Intent Must Be Minimal and Non-Sentential

Early File Intent outputs were full sentences (e.g., “This file exists to…”),
which caused:

- Redundancy in UI
- Ambiguity between intent and explanation
- Weak Skeptic attack surfaces

After refinement, File Intent was constrained to:

- A **noun phrase**
- No filename reference
- No existential framing

Example:

```json
"file_intent": {
  "text": "Data loading and query processing for document retrieval"
}
````

This format proved:

* Stable across iterations
* Easier to validate
* More useful as a cognitive anchor

**Conclusion**
File Intent should be treated as a **label**, not a claim.

---

### 5. Iterative Convergence Produces Qualitatively Better Outputs

Comparing early vs converged outputs:

| Aspect               | Early Output       | Converged Output   |
| -------------------- | ------------------ | ------------------ |
| Responsibility count | High, abstract     | Fewer, concrete    |
| Language             | Defensive, verbose | Assertive, minimal |
| Skeptic resistance   | Weak               | Strong             |
| Cognitive usefulness | Low                | High               |

Importantly, convergence was achieved **without adding more information** —
only by removing ambiguity.

**Conclusion**
The value of the loop comes from *refinement*, not enrichment.

---

## Overall Assessment

The multi-agent feedback loop:

* Produces **more trustworthy abstractions** than a single-LLM baseline
* Scales better cognitively to large files
* Externalizes the same negotiation a human reader performs internally

However, this comes at the cost of:

* Higher latency
* Higher token usage
* Increased system complexity

This tradeoff is acceptable for:

* First-contact code reading
* Large or unfamiliar codebases
* High-confidence understanding tasks

---

## Final Takeaway

This experiment supports the hypothesis that:

> **Robust code understanding emerges from structured disagreement,
> not from stronger single explanations.**

The 2nd experiment demonstrates that
multi-agent interaction is not an optimization —
it is a *qualitative shift* in how understanding is produced.

---

---

## Next Steps: Optimization & UI Integration

The current multi-agent pipeline produces higher-quality abstractions,
but at a **significant latency cost** due to multiple sequential LLM calls.

The next phase focuses on making the system **usable in practice**.

---

## 1. Performance Optimization

### Problem
- End-to-end API latency grows linearly with agent count and iteration depth
- Sequential LLM calls dominate response time
- Current setup is unsuitable for interactive usage
---

## 2. UI Integration

### Goals
- Make the abstraction *visually explorable*
- Surface uncertainty and iteration history
- Support first-contact code reading

### Planned UI Features

- File Intent displayed as a persistent header label
- Responsibility Map rendered as:
  - Clickable blocks
  - Line-range highlights
- Iteration visibility:
  - Show whether output is first-pass or converged
  - Optionally expose skeptic objections

### Interaction Model
- User uploads or selects a file
- Analysis runs (or loads from cache)
- User navigates abstraction without reading raw code first

---

## 3. Success Criteria

This phase is successful if:

- Average response time is reduced to **interactive levels**
- Multi-agent analysis feels **usable, not experimental**
- The UI helps users understand a file **faster than reading code**

---

## Closing Direction

With performance and UX addressed, the system can evolve from
an experiment into a **practical code comprehension tool**.

The long-term goal remains unchanged:

> Reduce first-contact cognitive load  
> by externalizing the mental model a human would build anyway.

---
