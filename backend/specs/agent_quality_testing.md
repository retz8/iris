# Agent Quality Testing

## Goal

Validate IRIS's tool-calling behavior and response results (file intent & responsibility blocks)

- **Well-Written Code (0-1 tool calls):** Clear function names, comprehensive JSDoc, descriptive parameters 
- **Poorly-Written Code (5-15 tool calls):** Ambiguous names, minimal comments, hidden complexity 

## Directory Structure
```
backend/
├── samples/
│   ├── poorly_written/        # Ambiguous code requiring tool calls
│   │   ├── sample1.js
│   │   ├── sample2.js
│   └── well_written/          # Clear code NOT requiring tool calls
│       ├── sample1.js
│       ├── sample2.js
└── debug_reports/             # IRIS analysis results
    ├── poorly_written/
    │   ├── sample1_*_debug.md
    |   ├── sample1_*_signature_graph.json
    └── well_written/
    │   ├── sample1_*_debug.md
    |   ├── sample1_*_signature_graph.json
```

**Note:** Debug report filenames include timestamps (e.g., `sample1_20250125_143022_debug.md`)



### Observation: Over-Collapsing of Responsibility Blocks

**Problem Identified**: IRIS fails to decompose poorly-written code into appropriately-sized responsibility blocks. All poorly-written samples collapse to a single `"responsibilities_count": 1` despite containing multiple logical ecosystems:

- `calculator.py`: Should have ~3-4 blocks (computation variants, equation solving, data analysis) → **collapsed to 1**
- `criptic_util.js`: Should have ~3 blocks (transform pipeline, caching, batch processing) → **collapsed to 1**
- `cryptic.py`: Should have ~2-3 blocks (orchestration, filtering/merging, validation) → **collapsed to 1**
- `machine.py`: Should have ~2-3 blocks (state transitions, querying, batch execution) → **collapsed to 1**
- `ms_data_processor.js`: Should have ~2 blocks (streaming pipeline, operation selection) → **collapsed to 1**
- `state_machine.js`: Should have ~2-3 blocks (transitions, batch operations, workflow execution) → **collapsed to 1**

**Hypothesis**: Tool-calling adds implementation context that dilutes the architectural abstraction layer, causing the LLM to over-group entities based on shared class/module structure rather than distinct change drivers.

---

### Root Cause Analysis

#### 1. **Cognitive Overload from Context Accumulation**
When `refer_to_source_code()` tool calls inject full implementation, the LLM receives conflicting signals:
- Signature graph: "Here are 5 functions with different purposes"
- Source code: "They all exist in the same class and share state"
- LLM conclusion: "One big ecosystem" ❌

#### 2. **Insufficient Anti-Collapse Enforcement**
The `TOOL_CALLING_SYSTEM_PROMPT` includes a rigorous validation checklist (artifact check, change-driver check, creator-vs-assembler check, label coherence check), but:
- No hard gate requiring explicit validation
- No forced re-splitting on failure
- LLM can skip validation when overwhelmed by context
- Output should flag `passes_anti_collapse_rule: false` to trigger re-analysis

#### 3. **Tool-Calling as a Shortcut**
For poorly-written code with ambiguous names, the LLM calls tools to read implementation. Once it understands the logic, it assumes "I understand everything—one block." But **understanding implementation ≠ identifying distinct responsibilities**.

#### 4. **Missing Splitting Critique Loop**
The prompt says "adopt a critic stance" and "assume the grouping is wrong until it passes every check," but:
- No enforcement mechanism
- LLM should explicitly output reasoning for each responsibility
- No requirement to show passing/failing of the 4-point validation checklist

#### 5. **Unreliable Orchestration Detection**
Many poorly-written files have orchestration functions (e.g., `process()` → `_prepare()` → `_apply()` → `_finalize()`). The prompt requires these to be carved out as separate responsibilities, but detection is inconsistent.

---

### Why Well-Written Code Performs Better

Well-written samples avoid over-collapse because:
- **Clear docstrings eliminate tool calls** → no context dilution
- **Descriptive names** → signature graph is self-explanatory
- **Smaller entity count** → fewer functions to collapse
- **No tool-calling side effects** → original abstraction preserved

---

### Recommended Fixes (Priority Order)

#### 1. **Restrict Tool-Calling Aggressively** (High Impact)
Raise the bar for "truly ambiguous":
- Current: Tool calls permitted for single-letter vars, unclear abbreviations, or `(any) => any` signatures
- Proposed: Only call tools when the entity has NO docstring AND NO leading comment AND name is genuinely cryptic (single letter, or contradicts type)
- Expected impact: Reduce context noise, preserve abstraction layer

#### 2. **Add Split Validation Gate** (High Impact)
Make the checklist executable and mandatory:
- After proposing each responsibility, explicitly run the 4-point checklist
- Output `validation_checklist: { artifact_check: pass/fail, change_driver_check: pass/fail, ... }`
- If any check fails, re-split and re-run checklist
- Enforce in prompt: "Do not output final responsibilities until all checks pass"

#### 3. **Enhance Orchestration Detection** (Medium Impact)
Add heuristic in signature graph or prompt:
- Identify functions with HIGH call count (>3 distinct callees)
- Flag as potential orchestration/composition
- Prompt guidance: "If entity calls many other entities in this file, consider carving it out as a separate orchestration responsibility"

#### 4. **Strengthen Splitting Language** (Medium Impact)
Align tool-calling prompt with fast-path prompt rigor:
- Fast-path has stronger language about splitting and critique stance
- Tool-calling version should match or exceed that intensity
- Explicitly forbid "convenience grouping" (grouping because entities are in same class)

#### 5. **Add Entity-Level Hints in Signature Graph** (Low-Medium Impact)
Enhance the signature graph with architectural hints:
- Track shared state (which functions read/write same variables)
- Track call dependencies (who calls whom)
- Use this to suggest responsibility boundaries *before* reading implementation
- Helps LLM reason about cohesion without implementation context

---

### Implementation Checklist for Tomorrow

- [ ] Review `TOOL_CALLING_SYSTEM_PROMPT` in `prompts.py` (lines ~50-150)
- [ ] Tighten tool-calling eligibility criteria (item #1 above)
- [ ] Add explicit validation checklist output to schema (item #2)
- [ ] Create GitHub Issue: "Over-collapse of responsibility blocks in poorly-written code"
- [ ] Consider creating a secondary "split validator" prompt that re-checks groupings
- [ ] Test fix against calculator.py first (clearest case)