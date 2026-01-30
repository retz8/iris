# ShallowASTDebugger Implementation Plan

**Target:** `ShallowASTProcessor` & `IRISAgent`

## 1. Overview

The `ShallowASTDebugger` is a specialized diagnostic utility designed to monitor and validate the transformation of raw source code into a Shallow AST. Its primary purpose is to ensure that the structural compression performed by the `ShallowASTProcessor` preserves essential semantic information while providing accurate metadata for the `IRISAgent`.

---

## 2. Strategies

The debugger utilizes three core strategies to evaluate the quality of the AST transformation:

* **Pipeline Snapshots:** Captures data at each stage of the process (Raw Source → Full AST → Comment Mapping → Final JSON) to pinpoint where data loss or corruption occurs.
* **Quantitative Metrics:** Calculates structural and token-level efficiency to monitor the performance of the compression logic.
* **Round-trip Integrity Verification:** Validates the accuracy of `line_range` metadata by cross-referencing generated AST nodes with the original source code through string slicing.

---

## 3. Implementation Steps: `debugger.py`

This section outlines the specific steps to build the `ShallowASTDebugger` class from scratch.

### Step 1: Base Structure and Storage

* Initialize the `ShallowASTDebugger` class with `filename` and `language` attributes.
* Define a `self.snapshots` dictionary to store deep copies of objects at various processing stages.
* Define a `self.metrics` dictionary to hold final scores and verification results.
* Implement a `capture_snapshot(stage_name: str, data: Any)` method that uses `copy.deepcopy()` to archive data states safely.

### Step 2: Metrics Definition and Calculation

* Implement `compute_metrics(full_tree, shallow_ast, source_code)` to generate the following data points:
* **Node Reduction Ratio:** Calculated as the count of named nodes in the Tree-sitter Full Tree divided by the total node count in the Shallow AST JSON.
* **Context Compression Ratio:** Calculated as the byte size of the raw source code string divided by the byte size of the stringified Shallow AST JSON.
* **Comment Retention Score:** Calculated as the percentage of declaration-type nodes (classes, functions) that successfully retained leading or inline comments.



### Step 3: Round-trip Integrity Engine

* Define a `KEYWORD_ANCHORS` mapping for each supported language (e.g., `python: ["def", "class"]`, `typescript: ["function", "class", "const"]`).
* Implement a `verify_integrity(source_code, shallow_ast)` method that:
1. Recursively visits every node in the `shallow_ast` containing a `line_range`.
2. Extracts the specific text from `source_code` using the `line_range` coordinates.
3. Asserts that the sliced text begins with the correct keyword based on the node's `type`.
4. Verifies that the node's `name` property is physically present within the first line of the extracted slice.


* Calculate an **Integrity Score** representing the percentage of nodes that passed the verification check.

---

## 4. Integration with Application

This section describes the workflow for connecting the debugger to the existing IRIS components.

### Step 1: Updating `ast_processor.py`

* Modify the `ShallowASTProcessor.process()` signature to accept an optional `debugger` instance.
* Invoke `debugger.capture_snapshot()` immediately after receiving the raw source and after the initial Tree-sitter parse.
* Trigger `debugger.compute_metrics()` and `debugger.verify_integrity()` once the final Shallow AST dictionary is constructed but before it is returned.

### Step 2: Updating `routes.py`

* In the `/api/iris/analyze` endpoint, instantiate a new `ShallowASTDebugger` for every incoming request.
* Pass the debugger instance into the `_ast_processor.process()` call.
* Retrieve the final diagnostic report using `debugger.get_report()` after the processor finishes.
* Pass the resulting `debug_report` as a new argument to the `_iris_agent.analyze()` method.

### Step 3: Updating `agent.py`

* Update `IrisAgent.analyze()` to receive the `debug_report` object.
* Implement a logic check: if the `integrity_score` is less than 100, add a warning to the `metadata.notes` field in the final response.
* Embed the `debug_report.metrics` into the final JSON response under `metadata.debug_stats` for frontend transparency and performance tracking.
