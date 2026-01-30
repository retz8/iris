---
goal: Refactor Critic Agent for Progressive & Constructive Feedback
version: 1.0
date_created: 2026-01-25
status: Planned
tags: [refactor, agent, critic, prompts]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Refactoring the Critic Agent's system prompt to address "Coverage Trap", passive tool suggestions, vague splitting instructions, and rigid scoring. The goal is to shift the Critic from a pedantic reviewer to a constructive structural architect.

## 1. Requirements & Constraints

- **REQ-001**: **Progressive Coverage**: Critic MUST NOT penalize missing entities in Iteration 0-1 unless they are critical architectural components.
- **REQ-002**: **Active Ambiguity Detection**: Critic MUST suggest `refer_to_source_code` for generic/ambiguous names (e.g., "Manager", "System", "Processor") even if they contain some domain hints.
- **REQ-003**: **Constructive Splitting**: Critic MUST provide explicit "Splitting Criteria" (e.g., "Split by State vs Logic" or "Split by User vs Admin") when requesting block splits.
- **REQ-004**: **Collaborative Stance**: Feedback tone should be guiding rather than arresting, prioritizing major structural fixes over minor completeness issues in early rounds.

## 2. Implementation Steps

### Phase 1: Redefine Evaluation Principles

- [x] **TASK-001**: Simplify "Entity Coverage" principle in `CRITIC_SYSTEM_PROMPT`.
  - **File**: `backend/src/prompts.py`
  - **Change**: Replace "Every non-import entity..." with "Subsystem Integrity First". Explicitly state that minor helpers/utils are secondary to finding the correct major blocks.
- [x] **TASK-002**: Strengthen "Evidence Sufficiency" principle.
  - **File**: `backend/src/prompts.py`
  - **Change**: Define "Ambiguous Signals" list (Manager, Handler, Data, Info) that triggers mandatory tool calls.

### Phase 2: Implement Progressive Scoring

- [x] **TASK-003**: Modify "Confidence Scoring" section.
  - **File**: `backend/src/prompts.py`
  - **Change**: Introduce `Iteration Context`:
    - Iter 0-1: Maximize score if Structure is correct (ignore missing entities penalty).
    - Iter 2+: Apply strict coverage penalties.

### Phase 3: Enhance Feedback Templates

- **TASK-004**: Update "Concrete Fix Specification" templates.
  - **File**: `backend/src/prompts.py`
  - **Change**: Add `SPLIT_CRITERIA` field to "For Block Splits" template.
  - **Example**: `SPLIT_CRITERIA: Separate [Stateful Storage] from [Stateless Computation]`.

### Phase 4: Verification

- **TASK-005**: Review against `calculator.py` failure mode.
  - **Check**: Does the new prompt allow `calculator.py` to be grouped into logical chunks without tool calls first?
  - **Check**: If tool calls are needed, does it suggest them?
