---
goal: Fix Two-Agent System Entity Coverage & Convergence (Immediate Remedies)
version: 2.0
date_created: 2025-01-25
last_updated: 2025-01-25
owner: IRIS Team
status: 'Planned'
tags: [bugfix, agent-system, prompt-engineering, two-agent, critical]
---

# Fix Two-Agent System Entity Coverage & Convergence (Immediate Remedies)

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Critical fixes to address entity coverage regression and convergence failures observed in the two-agent system after implementing iris_agent_flow_fix.md Phase 1-5. The debug report for main.js shows confidence oscillation (0.70 → 0.40 → 0.70), entity loss during restructuring (5 functions missing in Iteration 1), and superficial response validation. This plan implements four immediate remedies to achieve convergence within 3 iterations.

**Root Cause**: Analyzer loses entities during block splits, Critic validates format but not accuracy, and no mechanism detects stalled progress or enforces coverage preservation.

## 1. Requirements & Constraints

**Requirements**

- **REQ-FIX2-001**: Analyzer MUST preserve all entities from signature_graph when restructuring blocks (no entity loss)
- **REQ-FIX2-002**: Analyzer MUST validate coverage_complete before finalizing hypothesis (pre-flight check)
- **REQ-FIX2-003**: Critic MUST verify entities_moved in response_to_feedback match actual block changes (accuracy check)
- **REQ-FIX2-004**: System MUST detect insufficient progress and terminate early (after 2 iterations with <0.10 confidence change)
- **REQ-FIX2-005**: Splitting a block MUST partition ALL parent entities into child blocks (explicit partition rule)

**Constraints**

- **CON-FIX2-001**: Cannot break existing single-agent (tool-calling/fast-path) execution paths
- **CON-FIX2-002**: Schema changes must be backward-compatible with existing debug reports
- **CON-FIX2-003**: Prompt changes must reduce or maintain token count (no bloat beyond +100 tokens)
- **CON-FIX2-004**: Must converge within 3 iterations for 80%+ of test files (up from 60%)

**Guidelines**

- **GUD-FIX2-001**: Coverage preservation is highest priority (Coverage > Structure > Labels)
- **GUD-FIX2-002**: Use explicit worked examples in prompts for entity preservation
- **GUD-FIX2-003**: Validation rules must be machine-verifiable (exact entity list matching)
- **GUD-FIX2-004**: Progress detection should fail-fast rather than waste iterations

**Patterns**

- **PAT-FIX2-001**: Follow existing schema patterns in prompts.py (ANALYZER_OUTPUT_SCHEMA, CRITIC_OUTPUT_SCHEMA)
- **PAT-FIX2-002**: Use table format for rules/checklists in prompts (better LLM parsing)
- **PAT-FIX2-003**: Add validation steps as numbered checklist in prompts

## 2. Implementation Steps

### Implementation Phase 1: Add Explicit Entity Preservation Rules (H4)

**GOAL-001**: Add unambiguous rules to Analyzer prompt defining entity preservation during block splits/merges

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-FIX2-001 | Add "ENTITY PRESERVATION RULES" section to ANALYZER_SYSTEM_PROMPT before "Revision" section | | |
| TASK-FIX2-002 | Define partition rule: "When splitting block X → [Y, Z], entities(X) = entities(Y) + entities(Z)" | | |
| TASK-FIX2-003 | Define merge rule: "When merging blocks [A, B] → C, entities(C) = entities(A) + entities(B)" | | |
| TASK-FIX2-004 | Add worked example showing split with explicit entity accounting | | |
| TASK-FIX2-005 | Add FORBIDDEN pattern: "Split resulting in orphaned entities (not assigned to any block)" | | |
| TASK-FIX2-006 | Update "Revision" section to reference preservation rules: "Apply ENTITY PRESERVATION RULES when restructuring" | | |

**Detailed Specification for TASK-FIX2-001 to TASK-FIX2-006:**

Add the following section to ANALYZER_SYSTEM_PROMPT after "Output Format" and before "Revision (with Critic feedback)":

```markdown
## ENTITY PRESERVATION RULES (MANDATORY)

When restructuring blocks (split, merge, move), you MUST preserve all entities from signature_graph.

### Partition Rule (Splitting Blocks)

When splitting a block into multiple blocks:
- Parent block: { entities: [E1, E2, E3, E4] }
- Child blocks MUST contain ALL parent entities
- Valid: Child1=[E1, E2], Child2=[E3, E4]
- FORBIDDEN: Child1=[E1, E2], Child2=[E3] (E4 orphaned)

### Union Rule (Merging Blocks)

When merging multiple blocks into one:
- Parent blocks: A={ entities: [E1, E2] }, B={ entities: [E3, E4] }
- Merged block MUST contain ALL parent entities
- Valid: Merged=[E1, E2, E3, E4]
- FORBIDDEN: Merged=[E1, E2, E3] (E4 lost)

### Coverage Invariant

**CRITICAL**: Total entities across all blocks MUST equal signature_graph entity count at ALL times.
- If signature_graph has 42 entities, responsibility_blocks must account for all 42
- No entity may appear twice (violation: scatter)
- No entity may be missing (violation: coverage failure)

### Worked Example: Splitting Block

**Before Split:**
```json
{
  "title": "Model Loading and Initialization",
  "entities": ["loadHumanAndWheelchairModels", "checkAllModelsLoaded", "init", "loadHumanModel", "loadWheelchairModel"]
}
```

**After Split (CORRECT):**
```json
[
  {
    "title": "Model Loading",
    "entities": ["loadHumanAndWheelchairModels", "loadHumanModel", "loadWheelchairModel", "checkAllModelsLoaded"]
  },
  {
    "title": "Scene Management and Rendering",
    "entities": ["init"]
  }
]
```

**After Split (FORBIDDEN):**
```json
[
  {
    "title": "Model Loading",
    "entities": ["loadHumanModel", "loadWheelchairModel"]
  },
  {
    "title": "Scene Management and Rendering",
    "entities": ["init"]
  }
]
// VIOLATION: "loadHumanAndWheelchairModels" and "checkAllModelsLoaded" are orphaned
```

### Verification Checklist (Before Finalizing Hypothesis)

Before outputting your hypothesis, verify:
- [ ] All entities from signature_graph appear in responsibility_blocks
- [ ] No entity appears in multiple blocks
- [ ] Entity count matches: len(all_block_entities) == len(signature_graph_entities)
- [ ] If splitting, parent entities = sum of child entities
- [ ] If merging, child entities = sum of parent entities


---

### Implementation Phase 2: Add Coverage Validation in Analyzer (H1)

**GOAL-002**: Implement pre-flight entity coverage validation before Analyzer outputs hypothesis

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-FIX2-007 | Add "COVERAGE VALIDATION (MANDATORY)" section to ANALYZER_SYSTEM_PROMPT after "ENTITY PRESERVATION RULES" | ✅ | 2025-01-25 |
| TASK-FIX2-008 | Add step-by-step validation procedure: count entities, compare to signature_graph, list missing/duplicate | ✅ | 2025-01-25 |
| TASK-FIX2-009 | Add failure protocol: "If validation fails, DO NOT output hypothesis. Revise blocks to fix coverage" | ✅ | 2025-01-25 |
| TASK-FIX2-010 | Add example validation output showing entity accounting | ✅ | 2025-01-25 |
| TASK-FIX2-011 | Update "Revision" section: "After applying changes, run COVERAGE VALIDATION before responding" | ✅ | 2025-01-25 |

**Detailed Specification for TASK-FIX2-007 to TASK-FIX2-011:**

Add the following section to ANALYZER_SYSTEM_PROMPT after "ENTITY PRESERVATION RULES":

```markdown
## COVERAGE VALIDATION (MANDATORY)

Before outputting your hypothesis, you MUST validate entity coverage.

### Validation Procedure

**Step 1: Count Entities**
- Extract all entities from your responsibility_blocks
- Count total: N_blocks
- Count signature_graph entities: N_signature

**Step 2: Compare Counts**
- If N_blocks != N_signature → COVERAGE FAILURE
- If N_blocks == N_signature → Proceed to Step 3

**Step 3: Check for Missing Entities**
- For each entity in signature_graph:
  - Is it in responsibility_blocks?
  - If not → Add to missing_entities list

**Step 4: Check for Duplicate Entities**
- For each entity in responsibility_blocks:
  - Does it appear in multiple blocks?
  - If yes → Add to duplicate_entities list

**Step 5: Validation Result**
- If missing_entities is empty AND duplicate_entities is empty → PASS
- Otherwise → FAIL

### Failure Protocol

If validation FAILS:
1. DO NOT output the hypothesis
2. Identify which block restructuring caused the issue
3. Revise block entities to restore coverage
4. Re-run validation until PASS

### Example Validation Output (Internal - Not in JSON)

```
COVERAGE VALIDATION:
Signature graph entities: 42
Responsibility block entities: 42
Missing: []
Duplicates: []
Status: PASS ✓
```

### Example Validation Failure

```
COVERAGE VALIDATION:
Signature graph entities: 42
Responsibility block entities: 37
Missing: [calculateOptimalSeatWidth, calculateOptimalBackHeight, measureBackGap, measureThighCushionOverlap, measureCalfCushionOverlap]
Duplicates: []
Status: FAIL ✗

ACTION: Revising block 'Wheelchair Parameter Management' to include missing entities...
```

### Integration with Revision Workflow

When revising hypothesis (iteration > 0):
1. Parse REQUIRED CHANGES
2. Apply block restructuring (split/merge/move)
3. **Run COVERAGE VALIDATION** ← NEW STEP
4. If validation fails, fix and re-validate
5. Fill response_to_feedback
6. Output hypothesis
```

---

### Implementation Phase 3: Add Response Accuracy Validation in Critic (H5)

**GOAL-003**: Implement Critic validation to verify response_to_feedback accuracy matches actual block changes

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-FIX2-012 | Add "RESPONSE VERIFICATION" section to CRITIC_SYSTEM_PROMPT after "CONFIDENCE SCORING RUBRIC" | ✅ | 2025-01-25 |
| TASK-FIX2-013 | Add validation checklist: verify entities_moved appear in target blocks, verify action_taken matches block structure | ✅ | 2025-01-25 |
| TASK-FIX2-014 | Add penalty rule: If verification fails, reduce confidence by 0.15 and add REQUIRED CHANGE | ✅ | 2025-01-25 |
| TASK-FIX2-015 | Add worked example showing verification process for split operation | ✅ | 2025-01-25 |
| TASK-FIX2-016 | Update CRITIC_OUTPUT_SCHEMA to include "response_verification_passed: boolean" field | ✅ | 2025-01-25 |

**Detailed Specification for TASK-FIX2-012 to TASK-FIX2-016:**

Add the following section to CRITIC_SYSTEM_PROMPT after "CONFIDENCE SCORING RUBRIC":

```markdown
## RESPONSE VERIFICATION (MANDATORY FOR ITERATIONS > 0)

When evaluating a revised hypothesis (iteration > 0), you MUST verify response_to_feedback accuracy.

### Verification Checklist

For each entry in response_to_feedback:

**Check 1: Entities Moved Verification**
- [ ] `entities_moved` list is non-empty (unless action is "no entity movement")
- [ ] ALL entities in `entities_moved` appear in responsibility_blocks
- [ ] Entities appear in blocks mentioned in `action_taken`

**Check 2: Action Taken Verification**
- [ ] `action_taken` describes a structural change (split/merge/move/rewrite/reorder)
- [ ] Block structure changed matches claimed action
- [ ] If "split block X", verify X no longer exists OR X has fewer entities
- [ ] If "created new block Y", verify Y exists in responsibility_blocks

**Check 3: Verification Statement Accuracy**
- [ ] `verification` statement can be confirmed by inspecting blocks
- [ ] Claims like "all entities preserved" are true
- [ ] Claims like "block now contains only X" are accurate

### Verification Failure Protocol

If ANY check fails:
1. Set `response_verification_passed = false`
2. Reduce confidence by 0.15 (response accuracy penalty)
3. Add to REQUIRED CHANGES:
   ```
   Response verification failed: [specific mismatch]
   Example: "Claimed to move [E1, E2] to block 'Target' but E1 not found in Target's entity list"
   ```

### Verification Success

If ALL checks pass:
- Set `response_verification_passed = true`
- Proceed with normal confidence calculation

### Worked Example: Verification Process

**Analyzer's response_to_feedback entry:**
```json
{
  "criticism_number": 1,
  "criticism_summary": "Block 'Model Loading and Initialization' violates single-responsibility",
  "action_taken": "Split into two blocks: 'Model Loading' and 'Scene Management'",
  "entities_moved": ["loadHumanAndWheelchairModels", "loadHumanModel", "loadWheelchairModel", "checkAllModelsLoaded"],
  "verification": "New block 'Model Loading' contains only model loading functions"
}
```

**Critic verification steps:**
1. Check: Does block 'Model Loading' exist? → YES ✓
2. Check: Does 'Model Loading' contain loadHumanAndWheelchairModels? → YES ✓
3. Check: Does 'Model Loading' contain loadHumanModel? → YES ✓
4. Check: Does 'Model Loading' contain loadWheelchairModel? → YES ✓
5. Check: Does 'Model Loading' contain checkAllModelsLoaded? → YES ✓
6. Check: Does original block 'Model Loading and Initialization' still exist with same entities? → NO ✓

**Result:** response_verification_passed = true

### Worked Example: Verification Failure

**Analyzer's response_to_feedback entry:**
```json
{
  "criticism_number": 1,
  "action_taken": "Split into 'Model Loading' and 'Scene Management'",
  "entities_moved": ["loadHumanAndWheelchairModels", "loadHumanModel", "loadWheelchairModel", "checkAllModelsLoaded"],
  "verification": "All entities preserved in child blocks"
}
```

**Critic verification steps:**
1. Check: Does 'Model Loading' contain checkAllModelsLoaded? → NO ✗

**Result:** 
- response_verification_passed = false
- Confidence penalty: -0.15
- Add REQUIRED CHANGE: "Response verification failed: Claimed to move 'checkAllModelsLoaded' but entity not found in 'Model Loading' block"
```

**Update to CRITIC_OUTPUT_SCHEMA** (TASK-FIX2-016):

```python
CRITIC_OUTPUT_SCHEMA: Dict[str, Any] = {
    "coverage_complete": "boolean (all entities accounted for)",
    "major_issues_count": "number",
    "minor_issues_count": "number",
    "confidence": "number (0.0 to 1.0, calculated from rubric)",
    "confidence_reasoning": "string (explain score based on rubric)",
    "response_verification_passed": "boolean (true if iteration > 0 and response_to_feedback verified, null if iteration 0)",  # NEW FIELD
    "comments": "string (REQUIRED CHANGES / KEEP UNCHANGED format)",
    "tool_suggestions": [...],
    "approved": "boolean (true if confidence >= 0.85)"
}
```

---

### Implementation Phase 4: Add Progress Detection & Early Termination (H3)

**GOAL-004**: Implement progress tracking and early termination when iterations stall

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-FIX2-017 | Update orchestrator.py: Track confidence history across iterations in loop state | ✅ | 2025-01-25 |
| TASK-FIX2-018 | Add progress detection: Calculate confidence delta between iterations | ✅ | 2025-01-25 |
| TASK-FIX2-019 | Add stall detection: If abs(confidence_delta) < 0.10 for 2 consecutive iterations, set stall flag | ✅ | 2025-01-25 |
| TASK-FIX2-020 | Add early termination: If stalled, exit loop with status="insufficient_progress" | ✅ | 2025-01-25 |
| TASK-FIX2-021 | Add Critic rule in CRITIC_SYSTEM_PROMPT: "If major_issues_count >= previous_major_issues_count, reduce confidence by additional 0.10" | ✅ | 2025-01-25 |
| TASK-FIX2-022 | Update debug report generation to show progress metrics (confidence delta, stall detection status) | ✅ | 2025-01-25 |

**Detailed Specification for TASK-FIX2-017 to TASK-FIX2-022:**

**TASK-FIX2-017: Update orchestrator.py**

Add confidence history tracking to iteration loop:

```python
# In two_agent_loop or similar orchestrator function
confidence_history = []
stall_counter = 0
MAX_STALL_ITERATIONS = 2
MIN_PROGRESS_THRESHOLD = 0.10

for iteration in range(max_iterations):
    # ... existing analyzer and critic calls ...
    
    current_confidence = critic_response.confidence
    confidence_history.append(current_confidence)
    
    # Progress detection (TASK-FIX2-018)
    if len(confidence_history) >= 2:
        confidence_delta = abs(confidence_history[-1] - confidence_history[-2])
        
        # Stall detection (TASK-FIX2-019)
        if confidence_delta < MIN_PROGRESS_THRESHOLD:
            stall_counter += 1
        else:
            stall_counter = 0  # Reset if progress detected
        
        # Early termination (TASK-FIX2-020)
        if stall_counter >= MAX_STALL_ITERATIONS:
            return {
                "status": "insufficient_progress",
                "reason": f"Confidence stalled for {MAX_STALL_ITERATIONS} iterations (delta < {MIN_PROGRESS_THRESHOLD})",
                "final_confidence": current_confidence,
                "iterations": iteration + 1,
                "confidence_history": confidence_history
            }
```

**TASK-FIX2-021: Add Critic Progress Penalty Rule**

Add to CRITIC_SYSTEM_PROMPT "CONFIDENCE SCORING RUBRIC" section:

```markdown
### Progress Regression Penalty

When evaluating iteration > 0:

**Check for Regression:**
- Compare current `major_issues_count` with previous iteration's count
- If current >= previous → No improvement or regression detected

**Apply Penalty:**
- If major_issues_count regression detected: confidence -= 0.10 (additional penalty)
- Rationale: System should improve or maintain quality, not regress

**Example:**
- Iteration 1: major_issues_count = 2, confidence = 0.70
- Iteration 2: major_issues_count = 2 (no improvement)
  - Base calculation: 1.0 - 0.15×2 = 0.70
  - Regression penalty: 0.70 - 0.10 = 0.60
  - Final confidence: 0.60

**Note:** This penalty only applies if major issue count doesn't decrease. Minor fluctuations in confidence due to different issue types are expected.
```

**TASK-FIX2-022: Update Debug Report Generation**

Add progress metrics section to debug report template:

```markdown
### Progress Metrics

| Metric | Value |
|--------|-------|
| Confidence Delta (Iter 0→1) | +0.05 |
| Confidence Delta (Iter 1→2) | -0.30 |
| Confidence Delta (Iter 2→3) | +0.30 |
| Average Delta | 0.217 |
| Stall Detected | No |
| Early Termination | No |
```

---

## 3. Alternatives

**Entity Preservation Enforcement**

- **ALT-FIX2-001**: Use JSON schema validation to enforce entity count matching - Rejected: Requires external validation tool, adds complexity outside LLM control
- **ALT-FIX2-002**: Make Analyzer output entity accounting table before hypothesis - Rejected: Adds token overhead, validation checklist in prompt is sufficient
- **ALT-FIX2-003**: Add separate validation agent between Analyzer and Critic - Rejected: Over-engineering, Analyzer self-validation + Critic verification covers this

**Response Verification**

- **ALT-FIX2-004**: Require Analyzer to output before/after entity counts per block - Considered but not implemented: May add later if current approach insufficient
- **ALT-FIX2-005**: Add structured diff format (added/removed/moved entities) - Rejected: response_to_feedback with entities_moved is sufficient
- **ALT-FIX2-006**: Make Critic quote exact entity lists from blocks when verifying - Rejected: Too verbose, boolean verification with penalty is clearer

**Progress Detection**

- **ALT-FIX2-007**: Use structural similarity score (Jaccard index on entity sets) instead of confidence delta - Rejected: Confidence already encapsulates structural quality, additional metric adds complexity
- **ALT-FIX2-008**: Set confidence floor based on previous iteration (prevent large drops) - Considered: May implement in future if oscillation persists
- **ALT-FIX2-009**: Use exponential moving average for confidence smoothing - Rejected: Hides actual progress/regression signals, defeats purpose of graduated scoring

**Early Termination**

- **ALT-FIX2-010**: Terminate after fixed 3 iterations regardless of progress - Rejected: Wastes compute if system stalls early
- **ALT-FIX2-011**: Return highest-confidence iteration when stalled - Considered: May implement as fallback strategy later
- **ALT-FIX2-012**: Suggest tool calls when stalled - Rejected: Current IRIS agent doesn't use tools for analysis phase

## 4. Dependencies

- **DEP-FIX2-001**: OpenAI API (existing dependency for LLM calls)
- **DEP-FIX2-002**: Existing `SourceStore` class (unchanged)
- **DEP-FIX2-003**: Existing `SignatureGraphExtractor` for entity list (unchanged)
- **DEP-FIX2-004**: Existing orchestrator code (agents/orchestrator.py or similar) - requires modification
- **DEP-FIX2-005**: Python 3.8+ for type hints and dictionary operations
- **DEP-FIX2-006**: Existing debug report generation code - requires extension

## 5. Files

- **FILE-FIX2-001**: `backend/src/prompts.py` - Update ANALYZER_SYSTEM_PROMPT (add ENTITY PRESERVATION RULES, COVERAGE VALIDATION)
- **FILE-FIX2-002**: `backend/src/prompts.py` - Update CRITIC_SYSTEM_PROMPT (add RESPONSE VERIFICATION, progress penalty rule)
- **FILE-FIX2-003**: `backend/src/prompts.py` - Update CRITIC_OUTPUT_SCHEMA (add response_verification_passed field)
- **FILE-FIX2-004**: `backend/src/agents/orchestrator.py` - Add confidence history tracking and progress detection logic
- **FILE-FIX2-005**: `backend/src/debugger/debugger.py` (or similar) - Update debug report to include progress metrics

## 6. Testing

**Unit Tests**

- **TEST-FIX2-001**: Analyzer with split operation preserves all entities (mock signature_graph with 42 entities, verify output has 42)
- **TEST-FIX2-002**: Analyzer with merge operation combines entity lists correctly (merge 2 blocks, verify union)
- **TEST-FIX2-003**: Critic detects response_to_feedback inaccuracy (mock response claiming entity move that didn't happen)
- **TEST-FIX2-004**: Progress detection flags stall after 2 iterations with <0.10 delta
- **TEST-FIX2-005**: Early termination returns "insufficient_progress" status when stalled

**Integration Tests**

- **TEST-FIX2-006**: main.js (debug report file) - System maintains coverage_complete=true across all iterations
- **TEST-FIX2-007**: main.js - Confidence shows monotonic improvement or early termination (no oscillation)
- **TEST-FIX2-008**: calculator.py (poorly written) - Converges to confidence ≥0.85 within 3 iterations OR terminates early
- **TEST-FIX2-009**: bst.js (well written) - Maintains coverage_complete=true and confidence ≥0.85 from iteration 0
- **TEST-FIX2-010**: Any file with entity loss in previous runs - No entity coverage regression detected

**Validation Metrics**

| Metric | Pre-Fix Baseline | Post-Fix Target |
|--------|------------------|-----------------|
| Entity coverage regression rate | 33% (1 of 3 iterations lost entities) | 0% |
| Convergence rate (confidence ≥0.85 within 3 iterations OR early term with reason) | 0% | ≥80% |
| Response verification pass rate | N/A (not tracked) | ≥90% |
| False stall detection rate | N/A | <5% |
| Average iterations to convergence or termination | 3.0 (always max) | ≤2.5 |

## 7. Risks & Assumptions

**Risks**

- **RISK-FIX2-001**: Entity preservation rules too verbose, LLM skips validation - Mitigation: Use checklist format, place rules before revision section (high visibility)
- **RISK-FIX2-002**: Coverage validation adds latency to Analyzer response generation - Mitigation: Validation is internal reasoning, not additional API call
- **RISK-FIX2-003**: Response verification generates false positives (rejects valid responses) - Mitigation: Test on diverse examples, tune verification logic
- **RISK-FIX2-004**: Progress detection terminates prematurely on legitimate plateaus - Mitigation: Require 2 consecutive stalls (not 1), threshold 0.10 allows minor fluctuations
- **RISK-FIX2-005**: Early termination prevents eventual convergence - Mitigation: 3 iterations with <0.10 progress unlikely to improve further, saves compute
- **RISK-FIX2-006**: Prompt bloat degrades LLM performance - Mitigation: Monitor token count, target <100 tokens net increase

**Assumptions**

- **ASSUMPTION-FIX2-001**: LLMs can perform entity accounting (count, compare lists) reliably
- **ASSUMPTION-FIX2-002**: Explicit worked examples improve instruction following vs abstract rules
- **ASSUMPTION-FIX2-003**: Confidence delta < 0.10 for 2 iterations indicates genuine stall (not temporary plateau)
- **ASSUMPTION-FIX2-004**: Entity coverage preservation is more critical than optimal block structure
- **ASSUMPTION-FIX2-005**: Response verification penalty (confidence -0.15) is sufficient deterrent for inaccurate responses
- **ASSUMPTION-FIX2-006**: Progress regression penalty (confidence -0.10) prevents stagnation

## 8. Related Specifications / Further Reading

- [Two-Agent Architecture Spec](iris_agentic_flow.md) - Original implementation plan
- [Two-Agent Flow Fix Phase 1-5](iris_agent_flow_fix.md) - Previous fixes implemented
- [Agent Quality Testing](agent_quality_testing.md) - Root cause analysis
- [IRIS Philosophy](../docs/philosophy.md) - Core principles for responsibility blocks
- [Signature Graph Spec](signature_graph.md) - Entity extraction format

---

## Implementation Notes

**Critical Path Dependencies:**
1. Phase 1 (Entity Preservation Rules) must be implemented before Phase 2 (Coverage Validation)
2. Phase 3 (Response Verification) can be implemented in parallel with Phase 1-2
3. Phase 4 (Progress Detection) depends on orchestrator having confidence history

**Rollback Plan:**
If implementation causes regression:
1. Revert prompts.py changes
2. Keep orchestrator progress detection (non-breaking)
3. Analyze failure cases for prompt tuning
4. Re-implement with adjusted thresholds
