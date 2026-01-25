---
goal: Fix Two-Agent System Feedback Loop & Convergence Issues
version: 1.0
date_created: 2025-01-25
last_updated: 2025-01-25
owner: IRIS Team
status: 'Planned'
tags: [bugfix, agent-system, prompt-engineering, two-agent]
---

# Fix Two-Agent System Feedback Loop & Convergence Issues

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Current two-agent system (Analyzer + Critic) fails to converge after 3 iterations. The Analyzer ignores feedback, makes cosmetic changes instead of structural fixes, and receives confusing signals from the Critic. Confidence remains stuck at 0.50 across all iterations with identical criticism repeated.

**Root Cause**: Verbose prompts, ambiguous feedback format (PROBLEMS/PRESERVE/MISSING ENTITIES sections contradict), no enforcement of structural changes, no progress signaling.

## 1. Requirements & Constraints

**Requirements**

- **REQ-FIX-001**: Critic feedback must use clear REQUIRED CHANGES / KEEP UNCHANGED format (no MISSING ENTITIES section)
- **REQ-FIX-002**: Critic must provide concrete fix specifications (exact entity lists, target block names)
- **REQ-FIX-003**: Analyzer must respond explicitly to each criticism with action_taken verification
- **REQ-FIX-004**: Confidence scoring must be incremental (graduated 0.1-1.0 scale, not binary)
- **REQ-FIX-005**: Analyzer must make structural changes (split/merge/move) when confidence < 0.85

**Constraints**

- **CON-FIX-001**: Cannot break existing single-agent (tool-calling/fast-path) execution paths
- **CON-FIX-002**: Schema changes must be backward-compatible with existing debug reports
- **CON-FIX-003**: Prompt changes must reduce or maintain token count (no bloat)
- **CON-FIX-004**: Must converge within 3 iterations for 60%+ of test files

**Guidelines**

- **GUD-FIX-001**: Prioritize clarity over completeness in feedback format
- **GUD-FIX-002**: Use examples in prompts rather than lengthy explanations
- **GUD-FIX-003**: Penalize cosmetic-only revisions via confidence reduction
- **GUD-FIX-004**: Validate that response_to_feedback entries match actual block changes

**Patterns**

- **PAT-FIX-001**: Follow existing schema patterns in `prompts.py` (ANALYZER_OUTPUT_SCHEMA, CRITIC_OUTPUT_SCHEMA)
- **PAT-FIX-002**: Use table format for rules/rubrics in prompts (better LLM parsing)
- **PAT-FIX-003**: Include concrete examples in prompts (before/after, good/bad)

## 2. Implementation Steps

### Implementation Phase 1: Simplify Critic Feedback Format

- **GOAL-001**: Replace confusing 3-section feedback (PROBLEMS/PRESERVE/MISSING) with clear REQUIRED CHANGES / KEEP UNCHANGED structure

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-FIX-001 | Update `CRITIC_SYSTEM_PROMPT` feedback section to use REQUIRED CHANGES / KEEP UNCHANGED format | | |
| TASK-FIX-002 | Remove "MISSING ENTITIES" section from CRITIC_SYSTEM_PROMPT (misplaced entities go in REQUIRED CHANGES) | | |
| TASK-FIX-003 | Add "REQUIRED CHANGES" instruction with concrete examples in CRITIC_SYSTEM_PROMPT | | |
| TASK-FIX-004 | Update "PRESERVE" → "KEEP UNCHANGED" with scoping rule (only list blocks near problem area) | | |
| TASK-FIX-005 | Update `build_critic_prompt()` documentation to reflect new format in prompts.py | | |

### Implementation Phase 2: Critic Proposes Concrete Fixes

- **GOAL-002**: Require Critic to specify exact block splits, merges, entity movements (not vague "split this block")

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-FIX-006 | Add "Concrete Fix Specification" rule section to CRITIC_SYSTEM_PROMPT | | |
| TASK-FIX-007 | Provide fix templates (split/merge/reorder/file intent) in CRITIC_SYSTEM_PROMPT | | |
| TASK-FIX-008 | Add examples of concrete vs vague feedback (good/bad comparison) | | |
| TASK-FIX-009 | Update confidence scoring to penalize vague feedback without entity lists | | |

### Implementation Phase 3: Force Explicit Response to Feedback

- **GOAL-003**: Analyzer must acknowledge each criticism with action_taken and entities_moved verification

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-FIX-010 | Add `response_to_feedback` field to ANALYZER_OUTPUT_SCHEMA in prompts.py | | |
| TASK-FIX-011 | Update ANALYZER_SYSTEM_PROMPT "Revision" section with response requirements | | |
| TASK-FIX-012 | Add example of proper response_to_feedback array in ANALYZER_SYSTEM_PROMPT | | |
| TASK-FIX-013 | Update Critic to validate responses match required changes (check 1-to-1 mapping) | | |
| TASK-FIX-014 | Update `analyzer.py` to parse and log response_to_feedback for debugging | | |

### Implementation Phase 4: Incremental Confidence Scoring

- **GOAL-004**: Replace binary 0.50 scoring with graduated 0.1-1.0 rubric to signal progress/regression

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-FIX-015 | Add graduated scoring rubric table to CRITIC_SYSTEM_PROMPT (0.1-1.0 with ranges) | | |
| TASK-FIX-016 | Add issue classification guide (major vs minor issues) to CRITIC_SYSTEM_PROMPT | | |
| TASK-FIX-017 | Require Critic to list major_issues_count, minor_issues_count in output | | |
| TASK-FIX-018 | Add confidence calculation formula (1.0 - 0.15×major - 0.05×minor) to prompt | | |
| TASK-FIX-019 | Update CRITIC_OUTPUT_SCHEMA with coverage_complete, issue counts, confidence_reasoning | | |

### Implementation Phase 5: Change Mandate for Revisions

- **GOAL-005**: Enforce structural changes (split/merge/move) when confidence < 0.85, prevent cosmetic-only revisions

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-FIX-020 | Add "REVISION MANDATE" section to ANALYZER_SYSTEM_PROMPT with required action types | | |
| TASK-FIX-021 | List allowed structural changes: split block, merge block, move entities, rewrite intent, reorder | | |
| TASK-FIX-022 | Add detection rule for cosmetic-only changes (forbidden pattern) | | |
| TASK-FIX-023 | Update Critic to penalize no-structural-change revisions (confidence -= 0.10) | | |

## 3. Alternatives

**Feedback Format**

- **ALT-FIX-001**: Keep 3-section format but rename "MISSING ENTITIES" to "MISPLACED ENTITIES" - Rejected: Still confusing, better to merge into REQUIRED CHANGES with explicit fix instructions
- **ALT-FIX-002**: Use structured JSON instead of markdown for feedback - Rejected: LLMs parse markdown better, harder to read in debug reports

**Response Tracking**

- **ALT-FIX-003**: Add revision_diff field showing before/after block structures - Rejected: Too verbose, response_to_feedback with entity lists is sufficient
- **ALT-FIX-004**: Require Analyzer to quote exact Critic feedback text - Rejected: Adds token overhead, criticism_summary is enough

**Confidence Scoring**

- **ALT-FIX-005**: Use separate scores for coverage, structure, labels - Rejected: Adds complexity, single graduated score with reasoning is clearer
- **ALT-FIX-006**: Let Analyzer self-score confidence - Rejected: Creates bias, Critic must evaluate independently

**Change Enforcement**

- **ALT-FIX-007**: Hard-reject revisions without structural changes - Rejected: Too rigid, confidence penalty allows graceful degradation
- **ALT-FIX-008**: Require minimum 2 structural changes per revision - Rejected: Over-constraining, 1 significant change may be sufficient

## 4. Dependencies

- **DEP-FIX-001**: OpenAI API (existing dependency for LLM calls)
- **DEP-FIX-002**: Existing `SourceStore` class for tool call execution (unchanged)
- **DEP-FIX-003**: Existing `SignatureGraphExtractor` for input generation (unchanged)
- **DEP-FIX-004**: Existing `AgentFlowDebugger` for metrics tracking (unchanged)
- **DEP-FIX-005**: Python 3.8+ for type hints in schema definitions

## 5. Files

- **FILE-FIX-001**: `backend/src/prompts.py` - Update ANALYZER_SYSTEM_PROMPT, CRITIC_SYSTEM_PROMPT, schemas
- **FILE-FIX-002**: `backend/src/agents/analyzer.py` - Parse response_to_feedback field
- **FILE-FIX-003**: `backend/src/agents/critic.py` - Validate response_to_feedback matches required changes
- **FILE-FIX-004**: `backend/src/agents/orchestrator.py` - Log iteration metrics (confidence progression)
- **FILE-FIX-005**: `backend/src/agents/schemas.py` - Update Hypothesis and Feedback data structures

## 6. Testing

**Unit Tests**

- **TEST-FIX-001**: Critic output uses REQUIRED CHANGES / KEEP UNCHANGED format (no MISSING ENTITIES)
- **TEST-FIX-002**: response_to_feedback array has N entries for N required changes
- **TEST-FIX-003**: Confidence calculation matches rubric formula (major=-0.15, minor=-0.05)
- **TEST-FIX-004**: Cosmetic-only revision triggers confidence penalty

**Integration Tests**

- **TEST-FIX-005**: main.js (debug report file) - Analyzer splits "User Interface Refresh" in iteration 1, confidence > 0.50
- **TEST-FIX-006**: calculator.py (poorly written) - Converges to confidence ≥ 0.85 within 3 iterations
- **TEST-FIX-007**: bst.js (well written) - Maintains confidence ≥ 0.85 from iteration 1
- **TEST-FIX-008**: Any file with banned verb in file intent - Fixed by iteration 2
- **TEST-FIX-009**: 10 sample files - Confidence variance ≥ 0.15 across iterations (shows progress)

**Validation Metrics**

| Metric | Pre-Fix Baseline | Post-Fix Target |
|--------|------------------|-----------------|
| Convergence rate (confidence ≥ 0.85 within 3 iterations) | 0% | ≥60% |
| Confidence variance per file | 0.0 (stuck at 0.50) | ≥0.15 |
| Structural changes per iteration | ~0.5 (entity additions) | ≥1.0 (splits/merges/moves) |
| Infinite loops (identical feedback 3x) | 100% | 0% |

## 7. Risks & Assumptions

**Risks**

- **RISK-FIX-001**: Forced responses become boilerplate without substance - Mitigation: Critic validates response_to_feedback matches actual block changes
- **RISK-FIX-002**: Concrete fixes too prescriptive, Analyzer just copies without reasoning - Mitigation: Analyzer must still apply principles; Critic suggests structure not implementation
- **RISK-FIX-003**: Confidence scoring adds token overhead (~50 tokens/iteration) - Mitigation: Offset by clearer convergence reducing total iterations
- **RISK-FIX-004**: Change mandate causes over-splitting (too many tiny blocks) - Mitigation: Keep "single artifact + single change driver" validation in place
- **RISK-FIX-005**: Increased prompt complexity negates clarity gains - Mitigation: Net token reduction via format simplification, use tables over paragraphs

**Assumptions**

- **ASSUMPTION-FIX-001**: LLMs can parse tabular rubrics better than prose rules
- **ASSUMPTION-FIX-002**: Graduated confidence provides useful progress signal vs binary threshold
- **ASSUMPTION-FIX-003**: Explicit response tracking forces accountability without gaming the system
- **ASSUMPTION-FIX-004**: 3 iterations is sufficient for most files with improved feedback loop
- **ASSUMPTION-FIX-005**: Structural changes correlate with quality improvements (not just cosmetic churn)

## 8. Related Specifications / Further Reading

- [Two-Agent Architecture Spec](iris_agentic_flow.md) - Original implementation plan
- [Agent Quality Testing](agent_quality_testing.md) - Root cause analysis of over-collapsing
- [IRIS Philosophy](../docs/philosophy.md) - Core principles for responsibility blocks
- [Signature Graph Spec](signature_graph.md) - Input format for agents

**Goal**: Replace confusing 3-section feedback with clear REQUIRED/KEEP structure

#### Current Problem
```
PROBLEMS:
- Block 'X' mixes orchestration with UI updates

PRESERVE:
- Preserve block 'A' as-is
- Preserve block 'B' as-is
[... 7+ blocks listed]

MISSING ENTITIES:
- Missing entities: funcA, funcB
[But they exist in wrong blocks - causes confusion]
```

**Analyzer interpretation**: "Entities are missing" → Adds them anywhere  
**Intended meaning**: "Entities are misplaced" → Move them properly

#### Solution Design

**New Format**:
```
REQUIRED CHANGES:
1. [Issue Description]
   [Concrete Fix Instruction]
   
2. [Issue Description]
   [Concrete Fix Instruction]

KEEP UNCHANGED:
- [Only list blocks that might be confused with problematic ones]
```

#### Implementation Tasks

| Task | Description | File | Completed |
|------|-------------|------|-----------|
| TASK-FIX-001 | Update `CRITIC_SYSTEM_PROMPT` feedback section | prompts.py | [ ] |
| TASK-FIX-002 | Remove "MISSING ENTITIES" section from prompt | prompts.py | [ ] |
| TASK-FIX-003 | Add "REQUIRED CHANGES" instruction with examples | prompts.py | [ ] |
| TASK-FIX-004 | Update "PRESERVE" → "KEEP UNCHANGED" with scoping rule | prompts.py | [ ] |
| TASK-FIX-005 | Update `build_critic_prompt()` to reflect new format | prompts.py | [ ] |

#### Detailed Specification

**New CRITIC_SYSTEM_PROMPT Feedback Section**:

```markdown
## FEEDBACK FORMAT (MANDATORY STRUCTURE)

Your `comments` field MUST use this format:

REQUIRED CHANGES:
[Numbered list of issues with concrete fix instructions]

KEEP UNCHANGED:
[Only blocks that might be confused with the problem area]

### Format Rules

1. **REQUIRED CHANGES**: List each issue as numbered item
   - State the problem clearly
   - Provide explicit fix instruction
   - Include entity names and target block names
   
2. **KEEP UNCHANGED**: 
   - Only list blocks near the problem area that shouldn't change
   - Omit obviously correct blocks far from issues
   - If all other blocks are fine, say "All other blocks correct"

### Example

REQUIRED CHANGES:
1. Block 'User Interface Refresh' violates single-responsibility principle.
   Split into two blocks:
   - New block 'Model Loading Orchestration': loadHumanAndWheelchairModels, checkAllModelsLoaded
   - Keep block 'User Interface Refresh': refreshGUIWheelchairParams only

2. File intent uses banned verb 'Manages'.
   Rewrite to: "Wheelchair-human integration orchestrator that coordinates model loading, parameter calculation, and ergonomic alignment validation."

KEEP UNCHANGED:
- Block 'Wheelchair Parameter Calculation' (correct as-is)
- Block 'Human Model Management' (correct as-is)
```

**Acceptance Criteria**:
- [ ] No more "MISSING ENTITIES" section in prompts
- [ ] Feedback always uses REQUIRED CHANGES / KEEP UNCHANGED
- [ ] Each REQUIRED CHANGE includes concrete fix instruction

---

### Phase 2: Critic Proposes Concrete Fixes (Priority 2)

**Goal**: Critic must specify exact block splits, merges, and entity movements

#### Current Problem
```
❌ Vague: "Block 'X' mixes orchestration with UI updates. Split into separate blocks."
```
**Result**: Analyzer doesn't know HOW to split (which entities go where)

#### Solution Design

**Concrete Fix Format**:
```
✓ Specific:
"Block 'User Interface Refresh' violates single-responsibility.
 
 CURRENT ENTITIES:
 - loadHumanAndWheelchairModels
 - checkAllModelsLoaded
 - refreshGUIWheelchairParams
 
 REQUIRED SPLIT:
 Block A: 'Model Loading Orchestration'
   Entities: loadHumanAndWheelchairModels, checkAllModelsLoaded
   
 Block B: 'GUI Parameter Synchronization'  
   Entities: refreshGUIWheelchairParams"
```

#### Implementation Tasks

| Task | Description | File | Completed |
|------|-------------|------|-----------|
| TASK-FIX-006 | Add "Concrete Fix Specification" rule to CRITIC_SYSTEM_PROMPT | prompts.py | [ ] |
| TASK-FIX-007 | Provide split/merge/reorder templates in prompt | prompts.py | [ ] |
| TASK-FIX-008 | Add examples of concrete vs vague feedback | prompts.py | [ ] |
| TASK-FIX-009 | Update confidence scoring to penalize vague feedback | prompts.py | [ ] |

#### Detailed Specification

**Add to CRITIC_SYSTEM_PROMPT**:

```markdown
## CONCRETE FIX SPECIFICATION

Every issue in REQUIRED CHANGES must include:
1. **Current state**: What entities/structure exist now
2. **Violation**: What principle/rule is broken
3. **Target state**: Exact entities and block names after fix

### Fix Templates

**For Block Splits**:
```
Block '[CurrentName]' violates [principle].

CURRENT ENTITIES: [list all]

REQUIRED SPLIT:
Block '[NewName1]': [entity1, entity2, ...]
Block '[NewName2]': [entity3, entity4, ...]

RATIONALE: [why this grouping is correct]
```

**For Block Merges**:
```
Blocks '[Block1]' and '[Block2]' belong together (scatter violation).

REQUIRED MERGE:
Block '[MergedName]': [all entities from both blocks]

RATIONALE: [shared domain/change-driver]
```

**For File Intent**:
```
File intent uses banned verb '[verb]'.

CURRENT: "[current file intent]"
SUGGESTED: "[rewritten file intent with system role + domain + contract]"
```

**For Ordering**:
```
Block '[BlockName]' is orchestration but not listed first.

REQUIRED ORDER:
1. [BlockName] (orchestration)
2. [CoreBlock1]
3. [CoreBlock2]
...
```

### Anti-Pattern: Vague Feedback (FORBIDDEN)

❌ "Block X has issues. Split it."
❌ "File intent needs improvement."
❌ "Some entities are in wrong blocks."

✓ Must always specify: WHAT + WHERE + WHY
```

**Acceptance Criteria**:
- [ ] Every REQUIRED CHANGE includes entity lists
- [ ] Split instructions specify target block names
- [ ] File intent rewrites are provided (not just "fix it")

---

### Phase 3: Force Explicit Response to Feedback (Priority 3)

**Goal**: Analyzer must acknowledge each criticism and state action taken

#### Current Problem
Analyzer's response:
```json
{
  "reasoning": "Grouped responsibilities based on distinct capabilities..."
}
```
**No mention of which feedback items were addressed or how.**

#### Solution Design

**New Analyzer Output Schema**:
```json
{
  "response_to_feedback": [
    {
      "criticism_number": 1,
      "criticism_summary": "Block 'X' mixes orchestration with UI",
      "action_taken": "Split into 'Model Loading Orchestration' and 'GUI Parameter Sync'",
      "entities_moved": ["loadHumanAndWheelchairModels", "checkAllModelsLoaded"],
      "verification": "Block 'Model Loading Orchestration' now contains only orchestration functions"
    }
  ],
  "file_intent": "...",
  "responsibility_blocks": [...]
}
```

#### Implementation Tasks

| Task | Description | File | Completed |
|------|-------------|------|-----------|
| TASK-FIX-010 | Add `response_to_feedback` field to ANALYZER_OUTPUT_SCHEMA | prompts.py | [ ] |
| TASK-FIX-011 | Update ANALYZER_SYSTEM_PROMPT "Revision" section | prompts.py | [ ] |
| TASK-FIX-012 | Add example of proper response_to_feedback | prompts.py | [ ] |
| TASK-FIX-013 | Update Critic to check if responses match required changes | prompts.py | [ ] |
| TASK-FIX-014 | Update `analyzer.py` to parse and validate response_to_feedback | agents/analyzer.py | [ ] |

#### Detailed Specification

**Update ANALYZER_OUTPUT_SCHEMA**:
```python
ANALYZER_OUTPUT_SCHEMA: Dict[str, Any] = {
    "response_to_feedback": [
        {
            "criticism_number": "number (1, 2, 3... matching REQUIRED CHANGES order)",
            "criticism_summary": "string (brief quote from Critic feedback)",
            "action_taken": "string (what structural change was made)",
            "entities_moved": ["list of entity names affected"],
            "verification": "string (how to verify the fix is correct)"
        }
    ],
    "file_intent": "string (1-4 lines: system role + domain + contract)",
    "responsibility_blocks": [...],
    "reasoning": "string (optional, overall strategy note)"
}
```

**Update ANALYZER_SYSTEM_PROMPT Revision Workflow**:
```markdown
### Revision (with Critic feedback)

When receiving feedback (iteration > 0):

1. **Parse REQUIRED CHANGES**: Read each numbered item carefully
2. **Respond to Each**: Fill `response_to_feedback` array
   - One entry per REQUIRED CHANGE
   - State exactly what you changed
   - List entities moved/renamed
   - Explain how change satisfies the criticism
3. **Apply Fixes**: Make structural changes to blocks
4. **Verify**: Check that response_to_feedback matches actual blocks

**CRITICAL RULE**: 
- If feedback has N REQUIRED CHANGES, response_to_feedback MUST have N entries
- If you cannot address a criticism, state: "action_taken": "Unable to address: [reason]"
- Empty or generic responses will be rejected

**Example**:
```json
{
  "response_to_feedback": [
    {
      "criticism_number": 1,
      "criticism_summary": "Block 'User Interface Refresh' mixes orchestration with UI updates",
      "action_taken": "Split into two blocks: 'Model Loading Orchestration' (loadHumanAndWheelchairModels, checkAllModelsLoaded) and 'GUI Parameter Synchronization' (refreshGUIWheelchairParams)",
      "entities_moved": ["loadHumanAndWheelchairModels", "checkAllModelsLoaded"],
      "verification": "New block 'Model Loading Orchestration' contains only model loading functions; 'GUI Parameter Synchronization' contains only GUI update function"
    },
    {
      "criticism_number": 2,
      "criticism_summary": "File intent uses banned verb 'Manages'",
      "action_taken": "Rewrote file intent to: 'Wheelchair-human integration orchestrator coordinating model loading, parameter calculation, and ergonomic alignment'",
      "entities_moved": [],
      "verification": "File intent now uses 'orchestrator' (system role) with contract focus"
    }
  ]
}
```
```

**Acceptance Criteria**:
- [ ] Analyzer output includes `response_to_feedback` array
- [ ] One response per REQUIRED CHANGE
- [ ] Critic validates responses match actual changes

---

### Phase 4: Incremental Confidence Scoring (Priority 4)

**Goal**: Confidence increases/decreases to signal progress

#### Current Problem
```
Iteration 0: confidence = 0.50
Iteration 1: confidence = 0.50  ← No signal of progress
Iteration 2: confidence = 0.50  ← Analyzer thinks nothing is improving
```

#### Solution Design

**Graduated Scoring Rubric**:
```
0.1-0.2: Multiple blocks incorrect + missing entities (catastrophic)
0.3-0.4: Coverage complete but 3+ major structural issues
0.5-0.6: Coverage complete, 2 major issues OR 4+ minor issues
0.7-0.75: Coverage complete, 1 major issue OR 2-3 minor issues  
0.76-0.84: Minor issues only (wording, small reordering)
0.85-0.89: Excellent, trivial improvements possible
0.90-1.0: Perfect (rare - only for exceptionally clear code)
```

**Issue Classification**:
- **Major**: Over-collapsed blocks, missing orchestration separation, multiple artifacts mixed
- **Minor**: Label wording, ordering tweaks, file intent banned verbs

#### Implementation Tasks

| Task | Description | File | Completed |
|------|-------------|------|-----------|
| TASK-FIX-015 | Add graduated scoring rubric to CRITIC_SYSTEM_PROMPT | prompts.py | [ ] |
| TASK-FIX-016 | Add issue classification (major/minor) guide | prompts.py | [ ] |
| TASK-FIX-017 | Require Critic to list: major_issues_count, minor_issues_count | prompts.py | [ ] |
| TASK-FIX-018 | Add confidence calculation formula to prompt | prompts.py | [ ] |
| TASK-FIX-019 | Update CRITIC_OUTPUT_SCHEMA with issue counts | prompts.py | [ ] |

#### Detailed Specification

**Update CRITIC_OUTPUT_SCHEMA**:
```python
CRITIC_OUTPUT_SCHEMA: Dict[str, Any] = {
    "coverage_complete": "boolean (all entities accounted for)",
    "major_issues_count": "number",
    "minor_issues_count": "number", 
    "confidence": "number (0.0 to 1.0, calculated from rubric)",
    "confidence_reasoning": "string (explain score based on rubric)",
    "comments": "string (REQUIRED CHANGES / KEEP UNCHANGED format)",
    "tool_suggestions": [...],
    "approved": "boolean (true if confidence >= 0.85)"
}
```

**Add to CRITIC_SYSTEM_PROMPT**:
```markdown
## CONFIDENCE SCORING RUBRIC

### Issue Classification

**Major Issues** (heavily penalized):
- Over-collapsed blocks (multiple artifacts/change-drivers mixed)
- Orchestration not separated from domain logic
- Under-grouped scattered entities
- Missing entities (coverage incomplete)
- Multiple domain nouns in one block label

**Minor Issues** (lightly penalized):
- File intent uses banned verb
- Block ordering suboptimal
- Label wording could be more specific
- Description clarity improvements

### Scoring Formula

**Step 1: Check Coverage**
- If `coverage_complete = false`: max confidence = 0.4

**Step 2: Count Issues**
```
Base score = 1.0
- Major issue: -0.15 each
- Minor issue: -0.05 each

Final confidence = max(0.1, Base score)
```

**Step 3: Apply Thresholds**
- 3+ major issues: cap at 0.5
- 2 major issues: cap at 0.65
- 1 major issue: cap at 0.80

### Confidence Ranges

| Range | Interpretation | Typical Issues |
|-------|---------------|----------------|
| 0.90-1.0 | Exceptional | None or cosmetic |
| 0.85-0.89 | Approved | 1-2 minor issues |
| 0.75-0.84 | Near approval | 3-4 minor issues |
| 0.65-0.74 | Needs work | 1 major + minor issues |
| 0.50-0.64 | Significant issues | 2 major issues |
| 0.30-0.49 | Major rework | 3+ major issues |
| 0.10-0.29 | Fundamental problems | Missing entities + structural chaos |

### Output Requirements

Include in your response:
```json
{
  "coverage_complete": true,
  "major_issues_count": 1,
  "minor_issues_count": 2,
  "confidence": 0.70,
  "confidence_reasoning": "Coverage complete. 1 major issue: 'User Interface Refresh' mixes orchestration with UI (over-collapsed). 2 minor issues: file intent banned verb, suboptimal ordering. Score: 1.0 - 0.15 (major) - 0.10 (2 minor) = 0.75, capped at 0.70 due to 1 major issue."
}
```
```

**Acceptance Criteria**:
- [ ] Confidence varies across iterations based on actual issues
- [ ] Confidence increases when issues are fixed
- [ ] Confidence reasoning explains calculation

---

### Phase 5: Change Mandate for Revisions (Priority 5)

**Goal**: Analyzer must make structural changes when confidence < 0.85

#### Current Problem
Analyzer makes cosmetic changes:
- Adds `reasoning` note
- Reorders slightly
- Renames without restructuring
**Result**: Core structural issues persist

#### Solution Design

**Revision Mandate**:
```
If confidence < 0.85, you MUST make at least ONE structural change:
1. Split an over-collapsed block (create new block)
2. Merge scattered entities (remove a block)
3. Move entities between blocks (restructure)
4. Rewrite file intent (if major issue)

FORBIDDEN: Only adding reasoning notes without block changes.
```

#### Implementation Tasks

| Task | Description | File | Completed |
|------|-------------|------|-----------|
| TASK-FIX-020 | Add "REVISION MANDATE" section to ANALYZER_SYSTEM_PROMPT | prompts.py | [ ] |
| TASK-FIX-021 | List allowed structural change types | prompts.py | [ ] |
| TASK-FIX-022 | Add detection for cosmetic-only changes | prompts.py | [ ] |
| TASK-FIX-023 | Update Critic to check for structural changes | prompts.py | [ ] |

#### Detailed Specification

**Add to ANALYZER_SYSTEM_PROMPT**:
```markdown
## REVISION MANDATE

When revising hypothesis (iteration > 0 and confidence < 0.85):

### Required Actions

You MUST perform at least ONE of these structural changes:

**1. Split Over-Collapsed Block**
- Create NEW block with subset of entities
- Update BOTH block descriptions
- Example: "User Interface Refresh" → "Model Loading Orchestration" + "GUI Parameter Sync"

**2. Merge Scattered Entities**  
- REMOVE one block by merging into another
- Update target block description
- Example: Merge "Update Human Geometry" into "Human Model Management"

**3. Move Entities Between Blocks**
- Relocate at least 2 entities
- Update BOTH blocks' entity lists and descriptions
- Example: Move orchestration functions to existing orchestration block

**4. Rewrite File Intent**
- If file intent is a REQUIRED CHANGE
- Must change system role or contract framing
- Example: "Manages..." → "Orchestrator coordinating..."

**5. Reorder Blocks**
- If ordering is a REQUIRED CHANGE
- Must change block positions (not just renumber)
- Example: Move orchestration block from position 5 to position 1

### Forbidden: Cosmetic-Only Changes

❌ INVALID revision:
- Only add `reasoning` field
- Only change wording in descriptions without entity movement
- Only rename blocks without restructuring

✓ VALID revision must include at least ONE of actions 1-5 above.

### Verification

Before finalizing:
1. Check: Did I create, remove, or significantly restructure a block?
2. Check: Can I point to specific entity movements in response_to_feedback?
3. Check: Would a developer see structural differences comparing old vs new blocks?

If all answers are NO → revision is invalid.
```

**Add to CRITIC_SYSTEM_PROMPT**:
```markdown
## REVISION VALIDATION

When evaluating a revised hypothesis (iteration > 0):

Check if Analyzer made structural changes:
1. Did block count change? (+1 for split, -1 for merge)
2. Did entity distributions change? (compare entity lists)
3. Was file intent rewritten? (not just word substitution)
4. Were blocks reordered? (position changes)

If previous confidence was < 0.85 AND no structural changes detected:
- Set confidence = previous_confidence - 0.10 (penalty)
- Add to REQUIRED CHANGES: "No structural changes detected. Must split, merge, or move entities per previous feedback."
```

**Acceptance Criteria**:
- [ ] Analyzer performs structural changes when confidence < 0.85
- [ ] Critic penalizes cosmetic-only revisions
- [ ] Block count or entity distributions change across iterations

---

## Integration & Testing

### Implementation Order

1. **Phase 1** (Feedback Format) → Enables clearer communication
2. **Phase 2** (Concrete Fixes) → Gives Analyzer actionable targets  
3. **Phase 3** (Explicit Response) → Forces accountability
4. **Phase 4** (Confidence) → Signals progress/regression
5. **Phase 5** (Change Mandate) → Prevents cosmetic avoidance

### Testing Strategy

| Test Case | Input | Expected Behavior | Success Criteria |
|-----------|-------|-------------------|------------------|
| TEST-FIX-001 | main.js (debug report file) | Analyzer splits "User Interface Refresh" in iteration 1 | Block count increases from 5 to 6+ |
| TEST-FIX-002 | Same file | Analyzer fixes file intent verb in iteration 1 | File intent doesn't use banned verbs |
| TEST-FIX-003 | Same file | Confidence increases from 0.50 → 0.70+ | Progress signal visible |
| TEST-FIX-004 | calculator.py (poorly written) | Converges within 3 iterations | Confidence >= 0.85 OR clear improvement |
| TEST-FIX-005 | Any file | Critic feedback uses REQUIRED/KEEP format | No "MISSING ENTITIES" section |
| TEST-FIX-006 | Any revision | response_to_feedback has N entries for N required changes | 1-to-1 mapping |

### Validation Metrics

**Pre-Fix Baseline** (current behavior):
- Convergence rate: 0% (3/3 iterations with same feedback)
- Confidence variance: 0.0 (stuck at 0.50)
- Structural changes per iteration: ~0.5 (minor entity additions)

**Post-Fix Targets**:
- Convergence rate: >60% (approve within 3 iterations)
- Confidence variance: >0.15 (shows progress)
- Structural changes per iteration: ≥1.0 (splits/merges/moves)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **RISK-FIX-001**: Forced responses become boilerplate | Medium | Critic checks response_to_feedback matches actual blocks |
| **RISK-FIX-002**: Concrete fixes too prescriptive (Analyzer just copies) | Low | Analyzer must still apply principles; Critic suggests not dictates |
| **RISK-FIX-003**: Confidence scoring adds token overhead | Low | Schema adds ~50 tokens, offset by clearer convergence |
| **RISK-FIX-004**: Change mandate causes over-splitting | Medium | Keep "single artifact + single change driver" validation |
| **RISK-FIX-005**: Increased prompt complexity | Low | Net reduction via format simplification offsets new fields |

---

## Success Criteria

### Immediate (Post-Implementation)
- [ ] All 5 priority solutions implemented in prompts.py
- [ ] Schema updates reflected in code
- [ ] No breaking changes to existing single-agent path

### Short-Term (After 10 Test Files)
- [ ] Convergence rate: ≥60% files reach confidence ≥0.85 within 3 iterations
- [ ] No infinite loops: 0% files with identical feedback across iterations
- [ ] Confidence progression: ≥70% files show confidence increase iteration-to-iteration

### Long-Term (After 50+ Files)
- [ ] Average iterations to convergence: ≤2.5
- [ ] False negative rate: <10% (well-written files incorrectly criticized)
- [ ] User-reported quality: Responsibility blocks match human expert judgment ≥85%

---

## Related Documents

- [Two-Agent Architecture Spec](iris_agentic_flow.md) - Original implementation plan
- [Agent Quality Testing](agent_quality_testing.md) - Problem analysis
- [IRIS Philosophy](../docs/philosophy.md) - Core principles

---

## Appendix: Example Iteration with Fixes

**Iteration 0: Analyzer Initial Hypothesis**
```json
{
  "file_intent": "Manages wheelchair design and human model integration",
  "responsibility_blocks": [
    {
      "title": "User Interface Refresh",
      "entities": ["loadHumanAndWheelchairModels", "checkAllModelsLoaded", "refreshGUIWheelchairParams"]
    }
  ]
}
```

**Iteration 0: Critic Feedback (NEW FORMAT)**
```json
{
  "coverage_complete": true,
  "major_issues_count": 1,
  "minor_issues_count": 1,
  "confidence": 0.70,
  "confidence_reasoning": "1 major: over-collapsed block. 1 minor: banned verb. Score: 1.0 - 0.15 - 0.05 = 0.80, capped at 0.70.",
  "comments": "REQUIRED CHANGES:\n1. Block 'User Interface Refresh' violates single-responsibility.\n   CURRENT ENTITIES: loadHumanAndWheelchairModels, checkAllModelsLoaded, refreshGUIWheelchairParams\n   REQUIRED SPLIT:\n   - Block 'Model Loading Orchestration': loadHumanAndWheelchairModels, checkAllModelsLoaded\n   - Block 'GUI Parameter Synchronization': refreshGUIWheelchairParams\n\n2. File intent uses banned verb 'Manages'.\n   SUGGESTED: 'Wheelchair-human integration orchestrator coordinating model loading, parameter calculation, and ergonomic alignment.'\n\nKEEP UNCHANGED:\n- Block 'Wheelchair Parameter Calculation' (correct grouping)"
}
```

**Iteration 1: Analyzer Revision (NEW FORMAT)**
```json
{
  "response_to_feedback": [
    {
      "criticism_number": 1,
      "criticism_summary": "Block 'User Interface Refresh' violates single-responsibility",
      "action_taken": "Split into 'Model Loading Orchestration' and 'GUI Parameter Synchronization'",
      "entities_moved": ["loadHumanAndWheelchairModels", "checkAllModelsLoaded"],
      "verification": "New block created at position 1 (orchestration first)"
    },
    {
      "criticism_number": 2,
      "criticism_summary": "File intent uses banned verb 'Manages'",
      "action_taken": "Rewrote to: 'Wheelchair-human integration orchestrator coordinating model loading, parameter calculation, and ergonomic alignment'",
      "entities_moved": [],
      "verification": "File intent now contract-focused with system role"
    }
  ],
  "file_intent": "Wheelchair-human integration orchestrator coordinating model loading, parameter calculation, and ergonomic alignment.",
  "responsibility_blocks": [
    {
      "title": "Model Loading Orchestration",
      "entities": ["loadHumanAndWheelchairModels", "checkAllModelsLoaded"]
    },
    {
      "title": "GUI Parameter Synchronization", 
      "entities": ["refreshGUIWheelchairParams"]
    }
  ]
}
```

**Iteration 1: Critic Response (IMPROVED CONFIDENCE)**
```json
{
  "coverage_complete": true,
  "major_issues_count": 0,
  "minor_issues_count": 0,
  "confidence": 0.90,
  "confidence_reasoning": "All issues resolved. Orchestration properly separated. File intent contract-focused. Excellent grouping.",
  "approved": true
}
```

**Result**: Converged in 2 iterations (vs infinite loop before fix)
