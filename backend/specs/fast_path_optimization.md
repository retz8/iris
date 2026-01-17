# Fast-Path Optimization Plan

**Target:** `IRISAgent` & `Execution Workflow`
---

## 1. Overview

The Fast-Path Optimization is a latency-reduction strategy designed for small-to-medium-sized files. For files where the entire source code fits comfortably within the LLM's optimal context window, the overhead of a two-stage analysis (Stage 1: Identification + Stage 2: Analysis) exceeds the benefit of token savings. By bypassing the identification stage and performing a single-stage full analysis, IRIS can deliver results significantly faster while maintaining or even improving accuracy for smaller files.

---

## 2. Strategies

To implement an effective and safe fast-path, the following three strategies will be employed:

* **Threshold-based Routing:** Uses quantitative metrics (Token count or Line count) to decide at runtime whether a file should follow the standard two-stage pipeline or the optimized fast-path.
* **Stage Consolidation:** Merges the intent of Stage 1 and Stage 2 into a single, high-density prompt that utilizes the full source code as direct context, eliminating the need for `source_reader` tool calls.
* **Graceful Fallback & Safety:** Ensures that if the fast-path fails (e.g., due to unexpected token limit issues), the agent can fallback to the standard two-stage analysis without returning an error.

---

## 3. Implementation Steps: `agent.py`

Follow these steps to integrate the fast-path logic into the `IrisAgent` class.

### Step 1: File Size and Token Estimation

* Implement a helper method `_should_use_fast_path(source_code, language)`:
* Calculate the total line count of the raw source code.
* Estimate the token count (using a lightweight tokenizer like `tiktoken` or a simple character-to-token ratio).
* Define a constant `FAST_PATH_TOKEN_THRESHOLD` (e.g., 2,000 tokens) and `FAST_PATH_LINE_THRESHOLD` (e.g., 200 lines).
* Return `True` if the file is below both thresholds.



### Step 2: Designing the Fast-Path Execution Path

* Create a new private method `_run_fast_path_analysis(filename, language, source_code, shallow_ast)`:
* Construct a consolidated prompt that provides the **Full Source Code** and the **Shallow AST** simultaneously.
* Set the system instruction to perform direct "File Intent + Responsibility Block" extraction in one pass.
* Reuse the existing `ANALYSIS_OUTPUT_SCHEMA` to ensure the response format remains consistent with the two-stage path.



### Step 3: Branching Logic in `analyze()`

* Modify the main `analyze()` method to check the `_should_use_fast_path` condition before starting Stage 1.
* If `True`: Execute `_run_fast_path_analysis` and return the result immediately.
* If `False`: Proceed with the existing `_run_identification` (Stage 1) and `_run_analysis` (Stage 2) workflow.

---

## 4. Integration with Application

This section describes how the fast-path interacts with other components like the Debugger and Metadata.

### Step 1: Update Metadata and Debugging

* Modify the final response's `metadata` field to include an `execution_path` property (either `"fast-path"` or `"two-stage"`).
* Update `ShallowASTDebugger` (or create a parent `IrisDebugger`) to track:
* Total latency of the fast-path execution.
* Token usage comparison (Actual vs. Predicted two-stage usage).


* Ensure that `tool_reads` in the metadata is empty for fast-path, as the whole file was read initially.

### Step 2: Prompt Refinement (`prompts.py`)

* Define a new `FAST_PATH_SYSTEM_PROMPT` that explicitly tells the LLM: "You have the full source code. Analyze the file's intent and responsibilities directly without asking for further snippets."
* Adjust the prompt to leverage the **Shallow AST** as a structural map while using the **Full Source** for semantic details.

### Step 3: Error Handling and Fallback

* Wrap the fast-path call in a try-except block.
* If a `context_length_exceeded` error or similar LLM error occurs, automatically trigger the standard `two-stage` analysis as a safety fallback.
* Log the fallback event in the `metadata.notes` for diagnostic purposes.

