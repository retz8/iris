---
goal: Implement Analyzer-Critic Two-Agent System for IRIS
version: 1.0
date_created: 2025-01-25
last_updated: 2025-01-25
owner: IRIS Team
status: 'Planned'
tags: [architecture, feature, agent-system]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan implements a two-agent architecture (Analyzer + Critic) to replace the current single-agent IRIS system. The new architecture addresses the over-collapsing problem where poorly-written code is grouped into a single responsibility block despite containing multiple logical ecosystems.

The core insight is that **hypothesis generation and evaluation should be separate concerns**. The Analyzer generates responsibility groupings, and the Critic evaluates them, suggests tool calls for verification, and provides feedback. This loop continues until the Critic's confidence threshold is met.

## 0. Agent System Architecture (visualization)
┌─────────────────────────────────────────────────────────────┐
│                        IRIS Agent System                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                      ┌──────────────┐     │
│  │   Analyzer   │ ───── hypothesis ──► │    Critic    │     │
│  │    Agent     │ ◄──── feedback ───── │    Agent     │     │
│  └──────────────┘                      └──────────────┘     │
│         │                                     │              │
│         │                                     │              │
│         ▼                                     ▼              │
│  ┌──────────────┐                      ┌──────────────┐     │
│  │   Generate   │                      │   Evaluate   │     │
│  │   Groupings  │                      │   Groupings  │     │
│  └──────────────┘                      │   Suggest    │     │
│                                        │   Tool Calls │     │
│                                        └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Source Store                       │   │
│  │            (refer_to_source_code tool)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

## 1. Requirements & Constraints

- **REQ-001**: Analyzer agent generates hypothesis (file intent + responsibility blocks) from signature graph
- **REQ-002**: Critic agent evaluates hypothesis and provides actionable feedback
- **REQ-003**: Critic agent suggests tool calls when evidence for grouping is insufficient
- **REQ-004**: Analyzer agent executes tool calls suggested by Critic
- **REQ-005**: Critic agent assigns confidence score (numeric) to evaluated hypothesis
- **REQ-006**: Loop continues until confidence threshold is met or max iterations reached
- **REQ-007**: System must work for general code (currently only in Python and JS/TS) (not domain-specific)
- **REQ-008**: Final output format must remain compatible with current IRIS output schema

- **CON-001**: Prompts must be concise - long prompts degrade LLM performance
- **CON-002**: Minimize LLM calls for efficiency (latency and cost)
- **CON-003**: Must maintain backward compatibility with existing debug report format
- **CON-004**: Tool calls should be used as last resort, not default behavior

- **GUD-001**: Use principles over rules in prompts (shorter, more effective)
- **GUD-002**: Provide examples in prompts rather than lengthy explanations
- **GUD-003**: Critic feedback must be specific and actionable (not generic approval/rejection)

- **PAT-001**: Follow existing code patterns in `backend/src/agent.py`
- **PAT-002**: Use existing `SourceStore` and `refer_to_source_code` tool infrastructure
- **PAT-003**: Extend existing `AgentFlowDebugger` for multi-agent tracking

## 2. Implementation Steps

### Implementation Phase 1: Core Architecture Setup

- GOAL-001: Create the foundational two-agent architecture with Analyzer and Critic agents

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `backend/src/agents/` directory for multi-agent components | ✅ | 2025-01-25 |
| TASK-002 | Create `backend/src/agents/analyzer.py` with `AnalyzerAgent` class | ✅ | 2025-01-25 |
| TASK-003 | Create `backend/src/agents/critic.py` with `CriticAgent` class | ✅ | 2025-01-25 |
| TASK-004 | Create `backend/src/agents/orchestrator.py` to manage the Analyzer-Critic loop | ✅ | 2025-01-25 |
| TASK-005 | Define shared data structures for hypothesis and feedback in `backend/src/agents/schemas.py` | ✅ | 2025-01-25 |

### Implementation Phase 2: Prompt Engineering

- GOAL-002: Design concise, principle-based prompts for both agents

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Create `ANALYZER_SYSTEM_PROMPT` in `backend/src/prompts.py` - focused on hypothesis generation | ✅ | 2025-01-25 |
| TASK-007 | Create `CRITIC_SYSTEM_PROMPT` in `backend/src/prompts.py` - focused on evaluation and feedback | ✅ | 2025-01-25 |
| TASK-008 | Update tooling section with condensed "zero domain signal" rule | ✅ | 2025-01-25 |
| TASK-009 | Update `backend/src/tools/tool_definitions.py` to use minimal description | ✅ | 2025-01-25 |
| TASK-010 | Create prompt builder functions for Analyzer (`build_analyzer_prompt`) | ✅ | 2025-01-25 |
| TASK-011 | Create prompt builder functions for Critic (`build_critic_prompt`) | ✅ | 2025-01-25 |

### Implementation Phase 3: Agent Loop Implementation

- GOAL-003: Implement the Analyzer → Critic → Fix loop with tool call handling

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Implement `AnalyzerAgent.generate_hypothesis()` method | ✅ | 2025-01-25 |
| TASK-013 | Implement `AnalyzerAgent.revise_hypothesis()` method (processes Critic feedback) | ✅ | 2025-01-25 |
| TASK-014 | Implement `AnalyzerAgent.execute_tool_calls()` method | ✅ | 2025-01-25 |
| TASK-015 | Implement `CriticAgent.evaluate()` method returning feedback + confidence + tool suggestions | ✅ | 2025-01-25 |
| TASK-016 | Implement `Orchestrator.run()` method managing the loop until confidence threshold | ✅ | 2025-01-25 |
| TASK-017 | Define exit conditions: confidence >= threshold OR max_iterations reached | ✅ | 2025-01-25 |

### Implementation Phase 4: Integration and Migration

- GOAL-004: Integrate new two-agent system with existing IRIS infrastructure

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-018 | Update `IrisAgent.analyze()` to use new `Orchestrator` for tool-calling path | ✅ | 2025-01-25 |
| TASK-019 | Maintain fast-path as single-agent for small/well-written files | ✅ | 2025-01-25 |
| TASK-020 | Extend `AgentFlowDebugger` to track multi-agent interactions (Analyzer rounds, Critic feedback) | ✅ | 2025-01-25 |
| TASK-021 | Update debug report markdown generation for two-agent flow | ✅ | 2025-01-25 |
| TASK-022 | Ensure final output matches existing `ANALYSIS_OUTPUT_SCHEMA` | ✅ | 2025-01-25 |

### Implementation Phase 5: Testing and Validation

- GOAL-005: Validate the new system against existing test samples

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Run new system against all poorly-written samples in `backend/samples/poorly_written/` | | |
| TASK-024 | Run new system against all well-written samples in `backend/samples/well_written/` | | |
| TASK-025 | Compare responsibility block counts: new system vs old system vs expected | | |
| TASK-026 | Verify tool calls are triggered appropriately (more for ambiguous code, fewer for clear code) | | |
| TASK-027 | Measure latency and token usage compared to single-agent system | | |
| TASK-028 | Generate new debug reports and compare quality | | |

## 3. Alternatives

- **ALT-001**: Single-agent with self-critique step - Rejected because self-evaluation is biased; agent grades its own homework and always passes
- **ALT-002**: Three-agent system (Analyzer, Critic, Resolver) - Rejected as over-engineered; Analyzer can handle revisions based on Critic feedback
- **ALT-003**: Critic executes tool calls directly - Rejected to maintain clean separation of concerns; Critic evaluates, Analyzer generates and executes
- **ALT-004**: Both agents assign confidence - Rejected to avoid confusion; single confidence from Critic is clearer

## 4. Dependencies

- **DEP-001**: OpenAI API (existing dependency, used by both agents)
- **DEP-002**: Existing `SourceStore` class for tool call execution
- **DEP-003**: Existing `SignatureGraphExtractor` for input generation
- **DEP-004**: Existing `AgentFlowDebugger` for metrics and debugging

## 5. Files

- **FILE-001**: `backend/src/agents/__init__.py` - New package init
- **FILE-002**: `backend/src/agents/analyzer.py` - Analyzer agent implementation
- **FILE-003**: `backend/src/agents/critic.py` - Critic agent implementation
- **FILE-004**: `backend/src/agents/orchestrator.py` - Loop orchestration logic
- **FILE-005**: `backend/src/agents/schemas.py` - Shared data structures (Hypothesis, Feedback, ToolSuggestion)
- **FILE-006**: `backend/src/prompts.py` - Updated with new prompts (ANALYZER_SYSTEM_PROMPT, CRITIC_SYSTEM_PROMPT)
- **FILE-007**: `backend/src/tools/tool_definitions.py` - Simplified tool description
- **FILE-008**: `backend/src/agent.py` - Updated to use Orchestrator
- **FILE-009**: `backend/src/debugger/debugger.py` - Extended for multi-agent tracking

## 6. Testing

- **TEST-001**: Unit test `AnalyzerAgent.generate_hypothesis()` produces valid schema
- **TEST-002**: Unit test `CriticAgent.evaluate()` returns feedback with confidence score
- **TEST-003**: Unit test `Orchestrator.run()` exits on confidence threshold
- **TEST-004**: Unit test `Orchestrator.run()` exits on max iterations
- **TEST-005**: Integration test: `calculator.py` produces 3+ responsibility blocks (was 1)
- **TEST-006**: Integration test: `criptic_util.js` produces 3+ responsibility blocks (was 1)
- **TEST-007**: Integration test: well-written samples maintain quality (2-3 blocks)
- **TEST-008**: Integration test: tool calls are suggested by Critic for ambiguous entities
- **TEST-009**: Performance test: latency < 2x single-agent for typical files

## 7. Risks & Assumptions

- **RISK-001**: Two-agent system doubles LLM calls, increasing latency and cost - Mitigation: fast-path bypass for simple files, confidence threshold tuning
- **RISK-002**: Critic may be too harsh or too lenient - Mitigation: tune prompt and confidence threshold through testing
- **RISK-003**: Infinite loop if Critic never approves - Mitigation: hard max_iterations limit (e.g., 3 rounds)
- **RISK-004**: Prompt length creep over iterations - Mitigation: summarize previous rounds rather than full history

- **ASSUMPTION-001**: Critic can effectively identify grouping weaknesses from hypothesis alone
- **ASSUMPTION-002**: Tool call results provide useful signal for grouping decisions
- **ASSUMPTION-003**: Confidence threshold can be tuned to balance quality vs efficiency
- **ASSUMPTION-004**: 2-3 iterations is sufficient for most files to reach good quality

## 8. Related Specifications / Further Reading

- [Agent Quality Testing Spec](backend/specs/agent_quality_testing.md) - Problem analysis and root causes
- [Signature Graph Spec](backend/specs/signature_graph.md) - Input format for agents
- [Development History](docs/history.md) - Previous agentic system experiments
- [IRIS Philosophy](docs/philosophy.md) - Core principles for responsibility blocks