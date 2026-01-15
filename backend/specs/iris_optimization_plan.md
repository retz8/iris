# IRIS Optimization Plan

**Goal:** Reduce latency of `/api/iris/analyze`, optimize resource efficiency, and establish a debugging framework.

---

## Step 0. Debugging Framework (Debugger)

Before proceeding with optimizations, a dedicated debugging system will be implemented to monitor the internal operations of IRIS.

* **Overview:** Create `debugger.py` containing two specialized classes to track the behavior of different components.
* **Component-Specific Debugging:**
* **AST Processor Debugger:** Focuses on the structural integrity and performance of the shallow AST parsing process.
* **Agent Debugger:** Monitors LLM-specific metrics including token consumption, response time (latency), and tool-calling behavior.


* **Goal:** Provide a clear audit trail to measure the effectiveness of subsequent optimization steps.

* **SPEC:** `./debugger_implementation.md`


## Step 1. Shallow AST Pre-processing & Token Optimization

Lighten the context payload sent to the LLM to improve inference speed and reduce costs.

* **Description:** Filter the `shallow_ast` JSON data to remove metadata irrelevant to the analysis:
* Remove empty comments and unnecessary structural fields.
* Optimize the tree depth (`max_depth`) and JSON structure based on language-specific characteristics.


* **Effect:** Decreases input tokens, resulting in faster LLM processing and the ability to handle larger files within context limits.

## Step 2. Fast-Path: Small File Optimization

Streamline the analysis process for smaller files where a two-stage approach might be counterproductive due to network overhead.

* **Description:** Skip Stage 1 (Identification) if the file's total tokens or line count is below a defined threshold. Instead, send the full source code directly to Stage 2.
* **Effect:** Reduces LLM calls from two to one for small files

## Step 3. Multi-layer Caching Strategy

Prevent redundant computations for unchanged files to provide near-instant responses.

* **Description:** Implement a caching layer based on `file_hash` across three levels:
* **AST Cache:** Stores pre-parsed `shallow_ast` data.
* **Stage 1 Cache:** Stores identified `ranges_to_read` lists.
* **Final Result Cache:** Stores the complete File Intent and Responsibility Blocks.


* **Effect:** Enables millisecond-level responses for repeated requests on identical files.
---
