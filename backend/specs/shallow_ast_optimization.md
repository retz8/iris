# ShallowAST Optimization Plan

**Target:** `ShallowASTProcessor` & `IRISAgent`

---

## 1. Overview

The goal of ShallowAST Optimization is to maximize the signal-to-noise ratio of the data sent to the LLM. By refining the extraction logic, we ensure that all critical declarations are captured with high precision while aggressively pruning redundant metadata and intermediate structural nodes that inflate token counts without adding semantic value.

---

## 2. Strategies

To balance structural clarity with token efficiency, the following strategies will be implemented:

* **Semantic Noise Reduction:** Identifies and removes "dead weight" data such as empty comment fields and whitespace-only strings that do not contribute to code comprehension.
* **Intermediate Node Flattening:** Removes non-semantic wrapper nodes (e.g., "Program", "Body", "Block") to shorten the distance between parent declarations and child members while preserving the containment relationship.
* **Complexity Signaling:** Provides explicit metadata about collapsed sections of the tree to inform the Agent about the true complexity of a file without displaying every sub-node.

---

## 3. Implementation Steps: `ast_processor.py`

Follow these steps to upgrade the existing `ShallowASTProcessor` logic.

### Step 1: Semantic Cleanup (Noise Removal)

* Modify the `CommentExtractor` to return `None` (omitted in final JSON) for empty or whitespace-only strings.
* Implement a filtering policy in `_build_node` to skip any keys with `null` values or `empty lists`.
* Deduplicate comments: If a `trailing_comment` is a duplicate of a `leading_comment`, discard the trailing one.

### Step 2: Refining Declaration Extraction (Precision)

* Update `_is_body_like` for improved context-awareness:
* **Python:** Ensure decorators are preserved as part of the declaration.
* **TypeScript:** Correctly handle `ExportNamedDeclaration` to maintain the visibility of exported identifiers.


* Signature Preservation: Ensure that even when a body is collapsed, the full signature line (parameters, return types) remains visible to the LLM.

### Step 3: Semantic Flattening and Complexity Signaling

* **Intermediate Node Removal:** Modify the tree traversal to skip nodes that serve as purely structural wrappers (e.g., `translation_unit`, `statement_block`) unless they contain essential metadata.
* **Depth-based Pruning with Counters:**
* When reaching `max_depth`, stop recursion.
* Count the total number of child nodes being pruned at that branch.
* Append an `extra_children_count` field to the parent node to signal the presence of hidden members.


* **Linearized Children:** Instead of deep nesting (e.g., `class.body.statements`), store child members in a direct `children` array under the parent declaration to reduce indentation and bracket overhead.

---

## 4. Integration with Application

This section describes the integration with the Agent and System Prompts.

### Step 1: Updating System Prompts (`prompts.py`)

* Update `IDENTIFICATION_SYSTEM_PROMPT` to describe the `extra_children_count` field.
* Instruct the Agent that a high `extra_children_count` (e.g., > 5) indicates a complex entity that might require a selective read (Stage 2) even if the name is descriptive.
* Update prompt examples to match the new flattened JSON structure, ensuring the Agent understands the direct parent-child relationship.

### Step 2: Validation via ShallowASTDebugger

* Use the **Context Compression Ratio** to measure token savings from flattening.
* Use the **Integrity Score** to verify that flattening did not break the `line_range` mapping or keyword associations.
* Compare the LLM's Stage 1 "Identification" accuracy before and after flattening to ensure structural cues are still effectively perceived.

### Step 3: Agent-side Complexity Assessment (`agent.py`)

* Enhance the Agent's reasoning: If a class has a low number of visible methods but a high `extra_children_count`, the Agent should be more inclined to request a tool read for the missing members.
