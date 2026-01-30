---
goal: Backend Cleanup - Single-Shot Architecture Isolation
version: 1.0
date_created: 2026-01-30
last_updated: 2026-01-30
owner: Backend Team
status: Planned
tags: [refactor, cleanup, architecture, single-shot-inference, deprecation]
---

# Backend Cleanup - Single-Shot Architecture Isolation

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan isolates the current single-shot inference system by deprecating all legacy multi-agent and tool-calling infrastructure. The goal is to achieve a clean, maintainable codebase that reflects the strategic pivot from complex agentic systems to simple, fast single-shot LLM inference.

## 1. Requirements & Constraints

**Requirements**

- **REQ-001**: Preserve current single-shot inference functionality (experiment.py → prompts.py)
- **REQ-002**: Remove all debugger dependencies from agent.py and routes.py
- **REQ-003**: Deprecate two-agent system (agents/ directory) to deprecated/agents/
- **REQ-004**: Deprecate tool-calling system (tools/ directory) to deprecated/tools/
- **REQ-005**: Deprecate SourceStore (source_store.py) to deprecated/
- **REQ-006**: Deprecate signature graph (signature_graph/ directory) to deprecated/signature_graph/
- **REQ-007**: Simplify IrisAgent.analyze() to single execution path
- **REQ-008**: Maintain backward-compatible API contract in routes.py
- **REQ-009**: Remove all unused feature flags and configuration constants

**Security Requirements**

- **SEC-001**: Ensure no sensitive debug data remains in deprecated files
- **SEC-002**: Verify API key management remains secure after refactor

**Constraints**

- **CON-001**: Must not break existing API responses (routes.py `/api/iris/analyze`)
- **CON-002**: Must preserve experiment.py functionality during migration
- **CON-003**: Cannot modify files in debug_reports/ or backend/samples/

**Guidelines**

- **GUD-001**: Prioritize file moves over deletions (use deprecated/ for archival)
- **GUD-002**: Update imports incrementally to minimize breakage
- **GUD-003**: Document rationale in commit messages (link to history.md section)
- **GUD-004**: Keep deprecated/ directory structure organized by subsystem

**Patterns**

- **PAT-001**: Use `deprecated/<subsystem>/` structure for clarity
- **PAT-002**: Remove imports before moving files to avoid circular dependencies

---

## 2. Implementation Steps

### Implementation Phase 1: Remove Debugger Dependencies

**GOAL-001**: Eliminate all debugger-related code from active codebase to simplify analysis flow

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Remove debugger import from [routes.py](backend/src/routes.py) (line 13) | ✅ | 2026-01-30 |
| TASK-002 | Remove `_debug_mode` global variable from [routes.py](backend/src/routes.py) (line 22) | ✅ | 2026-01-30 |
| TASK-003 | Remove debugger initialization block from [routes.py](backend/src/routes.py) (lines 100-103) | ✅ | 2026-01-30 |
| TASK-004 | Remove debugger setup calls from [routes.py](backend/src/routes.py) (lines 111-115) | ✅ | 2026-01-30 |
| TASK-005 | Remove `debugger` parameter from `_iris_agent.analyze()` call in [routes.py](backend/src/routes.py) (line 128) | ✅ | 2026-01-30 |
| TASK-006 | Remove debug report generation block from [routes.py](backend/src/routes.py) (lines 158-197) | ✅ | 2026-01-30 |
| TASK-007 | Remove `debug_mode` from health endpoint response in [routes.py](backend/src/routes.py) (line 238) | ✅ | 2026-01-30 |
| TASK-008 | Delete `set_debug_mode()` and `get_debug_mode()` functions from [routes.py](backend/src/routes.py) (lines 245-264) | ✅ | 2026-01-30 |
| TASK-009 | Remove conditional import `from .debugger.debugger import AgentFlowDebugger` from [agent.py](backend/src/agent.py) (line 38) | ✅ | 2026-01-30 |
| TASK-010 | Remove `debugger` parameter from `IrisAgent.analyze()` method signature in [agent.py](backend/src/agent.py) (lines 77-84) | ✅ | 2026-01-30 |
| TASK-011 | Remove debugger conditional blocks from fast-path in [agent.py](backend/src/agent.py) (lines 109-112, 118) | ✅ | 2026-01-30 |
| TASK-012 | Remove debugger conditional blocks from signature graph section in [agent.py](backend/src/agent.py) (lines 135-136, 143-144) | ✅ | 2026-01-30 |
| TASK-013 | Remove debugger conditional blocks from two-agent path in [agent.py](backend/src/agent.py) (lines 160-161, 172) | ✅ | 2026-01-30 |
| TASK-014 | Remove debugger conditional blocks from legacy tool-calling path in [agent.py](backend/src/agent.py) (lines 192-193) | ✅ | 2026-01-30 |
| TASK-015 | Remove `debugger` parameter from `_run_two_agent_analysis()` method in [agent.py](backend/src/agent.py) (line 222) | ✅ | 2026-01-30 |
| TASK-016 | Remove debugger usage from within `_run_two_agent_analysis()` in [agent.py](backend/src/agent.py) (lines 254, 270-288) | ✅ | 2026-01-30 |
| TASK-017 | Remove `debugger` parameter from `_run_tool_calling_analysis()` in [agent.py](backend/src/agent.py) (line 297) | ✅ | 2026-01-30 |
| TASK-018 | Remove debugger usage from within `_run_tool_calling_analysis()` in [agent.py](backend/src/agent.py) (lines 308, 401-408, 459-467) | ✅ | 2026-01-30 |
| TASK-019 | Remove `debugger` parameter from `_run_fast_path_analysis()` in [agent.py](backend/src/agent.py) (line 498, 503) | ✅ | 2026-01-30 |
| TASK-020 | Remove commented debugger blocks from `_run_fast_path_analysis()` in [agent.py](backend/src/agent.py) (lines 590-602) | ✅ | 2026-01-30 |
| TASK-021 | Delete `_create_debug_report()` helper method from [agent.py](backend/src/agent.py) (lines 645-676) | ✅ | 2026-01-30 |
| TASK-022 | Move [backend/src/debugger/](backend/src/debugger/) directory → [backend/src/deprecated/debugger/](backend/src/deprecated/debugger/) | ✅ | 2026-01-30 |
| TASK-023 | Verify no remaining imports of AgentFlowDebugger across codebase | ✅ | 2026-01-30 |

---

### Implementation Phase 2: Migrate Experiment Code to Main Prompts

**GOAL-002**: Promote experiment.py as the primary prompt system and deprecate legacy prompts.py

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-024 | Create [backend/src/deprecated/](backend/src/deprecated/) directory if not exists | ✅ | 2026-01-30 |
| TASK-025 | Move current [backend/src/prompts.py](backend/src/prompts.py) → [backend/src/deprecated/prompts.py](backend/src/deprecated/prompts.py) | ✅ | 2026-01-30 |
| TASK-026 | Rename [backend/src/experiment.py](backend/src/experiment.py) → [backend/src/prompts.py](backend/src/prompts.py) | ✅ | 2026-01-30 |
| TASK-027 | Update import in [agent.py](backend/src/agent.py): change `from experiment import (...)` to `from prompts import (...)` (lines 30-35) | ✅ | 2026-01-30 |
| TASK-028 | Rename `EXPERIMENT_DEVELOPER_PROMPT` → `SINGLE_SHOT_SYSTEM_PROMPT` in new [prompts.py](backend/src/prompts.py) | ✅ | 2026-01-30 |
| TASK-029 | Rename `build_experiment_user_prompt` → `build_single_shot_user_prompt` in new [prompts.py](backend/src/prompts.py) | ✅ | 2026-01-30 |
| TASK-030 | Update `_run_fast_path_analysis()` to use renamed constants in [agent.py](backend/src/agent.py) (lines 538-559) | ✅ | 2026-01-30 |
| TASK-031 | Verify no remaining imports of experiment module across codebase | ✅ | 2026-01-30 |
| TASK-032 | Add docstring to new [prompts.py](backend/src/prompts.py) explaining single-shot architecture | ✅ | 2026-01-30 |

---

### Implementation Phase 3: Deprecate Two-Agent System

**GOAL-003**: Archive entire two-agent infrastructure (Orchestrator, AnalyzerAgent, CriticAgent)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-033 | Create [backend/src/deprecated/agents/](backend/src/deprecated/agents/) directory | ✅ | 2026-01-30 |
| TASK-034 | Move [backend/src/agents/__init__.py](backend/src/agents/__init__.py) → [backend/src/deprecated/agents/__init__.py](backend/src/deprecated/agents/__init__.py) | ✅ | 2026-01-30 |
| TASK-035 | Move [backend/src/agents/orchestrator.py](backend/src/agents/orchestrator.py) → [backend/src/deprecated/agents/orchestrator.py](backend/src/deprecated/agents/orchestrator.py) | ✅ | 2026-01-30 |
| TASK-036 | Move [backend/src/agents/analyzer.py](backend/src/agents/analyzer.py) → [backend/src/deprecated/agents/analyzer.py](backend/src/deprecated/agents/analyzer.py) | ✅ | 2026-01-30 |
| TASK-037 | Move [backend/src/agents/critic.py](backend/src/agents/critic.py) → [backend/src/deprecated/agents/critic.py](backend/src/deprecated/agents/critic.py) | ✅ | 2026-01-30 |
| TASK-038 | Move [backend/src/agents/schemas.py](backend/src/agents/schemas.py) → [backend/src/deprecated/agents/schemas.py](backend/src/deprecated/agents/schemas.py) | ✅ | 2026-01-30 |
| TASK-039 | Remove import `from agents import Orchestrator, AnalysisResult` from [agent.py](backend/src/agent.py) (line 27) | ✅ | 2026-01-30 |
| TASK-040 | Delete `_run_two_agent_analysis()` method from [agent.py](backend/src/agent.py) (lines 222-295) | ✅ | 2026-01-30 |
| TASK-041 | Remove two-agent branch from `analyze()` method in [agent.py](backend/src/agent.py) (lines 156-187) | ✅ | 2026-01-30 |
| TASK-042 | Remove `USE_TWO_AGENT_SYSTEM` constant from [agent.py](backend/src/agent.py) (line 64) | ✅ | 2026-01-30 |
| TASK-043 | Remove `DEFAULT_CONFIDENCE_THRESHOLD` constant from [agent.py](backend/src/agent.py) (line 62) | ✅ | 2026-01-30 |
| TASK-044 | Remove `DEFAULT_MAX_ITERATIONS` constant from [agent.py](backend/src/agent.py) (line 63) | ✅ | 2026-01-30 |
| TASK-045 | Remove `self.confidence_threshold` instance variable from [agent.py](backend/src/agent.py) __init__ (line 74) | ✅ | 2026-01-30 |
| TASK-046 | Remove `self.max_iterations` instance variable from [agent.py](backend/src/agent.py) __init__ (line 75) | ✅ | 2026-01-30 |
| TASK-047 | Delete empty [backend/src/agents/](backend/src/agents/) directory | ✅ | 2026-01-30 |
| TASK-048 | Verify no remaining imports from agents module across codebase | ✅ | 2026-01-30 |

---

### Implementation Phase 4: Deprecate Tool-Calling System

**GOAL-004**: Archive legacy tool-calling infrastructure (SourceReader, tool definitions)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-049 | Create [backend/src/deprecated/tools/](backend/src/deprecated/tools/) directory | ✅ | 2026-01-30 |
| TASK-050 | Move [backend/src/tools/source_reader.py](backend/src/tools/source_reader.py) → [backend/src/deprecated/tools/source_reader.py](backend/src/deprecated/tools/source_reader.py) | ✅ | 2026-01-30 |
| TASK-051 | Move [backend/src/tools/tool_definitions.py](backend/src/tools/tool_definitions.py) → [backend/src/deprecated/tools/tool_definitions.py](backend/src/deprecated/tools/tool_definitions.py) | ✅ | 2026-01-30 |
| TASK-052 | Remove imports `from tools.source_reader import SourceReader` from [agent.py](backend/src/agent.py) (line 25) | ✅ | 2026-01-30 |
| TASK-053 | Remove imports `from tools.tool_definitions import IRIS_TOOLS` from [agent.py](backend/src/agent.py) (line 26) | ✅ | 2026-01-30 |
| TASK-054 | Delete `_run_tool_calling_analysis()` method from [agent.py](backend/src/agent.py) (lines 297-470) | ✅ | 2026-01-30 |
| TASK-055 | Delete `_should_use_fast_path()` helper method from [agent.py](backend/src/agent.py) (lines 473-495) | ✅ | 2026-01-30 |
| TASK-056 | Remove tool-calling branch from `analyze()` method in [agent.py](backend/src/agent.py) (lines 189-220) | ✅ | 2026-01-30 |
| TASK-057 | Delete empty [backend/src/tools/](backend/src/tools/) directory | ✅ | 2026-01-30 |
| TASK-058 | Verify no remaining imports from tools module across codebase | ✅ | 2026-01-30 |

---

### Implementation Phase 5: Deprecate Signature Graph

**GOAL-005**: Archive signature graph system (no longer used in single-shot inference)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-059 | Create [backend/src/deprecated/signature_graph/](backend/src/deprecated/signature_graph/) directory | ✅ | 2026-01-30 |
| TASK-060 | Move [backend/src/signature_graph/__init__.py](backend/src/signature_graph/__init__.py) → [backend/src/deprecated/signature_graph/__init__.py](backend/src/deprecated/signature_graph/__init__.py) | ✅ | 2026-01-30 |
| TASK-061 | Move [backend/src/signature_graph/config.py](backend/src/signature_graph/config.py) → [backend/src/deprecated/signature_graph/config.py](backend/src/deprecated/signature_graph/config.py) | ✅ | 2026-01-30 |
| TASK-062 | Move [backend/src/signature_graph/extractor.py](backend/src/signature_graph/extractor.py) → [backend/src/deprecated/signature_graph/extractor.py](backend/src/deprecated/signature_graph/extractor.py) | ✅ | 2026-01-30 |
| TASK-063 | Move [backend/src/signature_graph/types.py](backend/src/signature_graph/types.py) → [backend/src/deprecated/signature_graph/types.py](backend/src/deprecated/signature_graph/types.py) | ✅ | 2026-01-30 |
| TASK-064 | Remove import `from signature_graph import SignatureGraphExtractor, SignatureGraph` from [agent.py](backend/src/agent.py) (line 16) | ✅ | 2026-01-30 |
| TASK-065 | Remove signature graph extraction logic from `analyze()` method in [agent.py](backend/src/agent.py) (lines 135-154) | ✅ | 2026-01-30 |
| TASK-066 | Delete empty [backend/src/signature_graph/](backend/src/signature_graph/) directory | ✅ | 2026-01-30 |
| TASK-067 | Verify no remaining imports from signature_graph module across codebase | ✅ | 2026-01-30 |

---

### Implementation Phase 6: Deprecate SourceStore

**GOAL-006**: Remove SourceStore dependency (no longer needed without tool-calling)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-068 | Move [backend/src/source_store.py](backend/src/source_store.py) → [backend/src/deprecated/source_store.py](backend/src/deprecated/source_store.py) | ✅ | 2026-01-30 |
| TASK-069 | Remove `from source_store import SourceStore` import from [agent.py](backend/src/agent.py) (line 24) | ✅ | 2026-01-30 |
| TASK-070 | Remove `source_store` parameter from `IrisAgent.analyze()` method signature in [agent.py](backend/src/agent.py) (line 80) | ✅ | 2026-01-30 |
| TASK-071 | Remove `_source_store` global variable from [routes.py](backend/src/routes.py) (initialization) | ✅ | 2026-01-30 |
| TASK-072 | Remove `from source_store import SourceStore` import from [routes.py](backend/src/routes.py) | ✅ | 2026-01-30 |
| TASK-073 | Remove `_source_store.store_source()` call from [routes.py](backend/src/routes.py) analyze endpoint | ✅ | 2026-01-30 |
| TASK-074 | Remove `source_store=_source_store` parameter from `_iris_agent.analyze()` call in [routes.py](backend/src/routes.py) (line 128) | ✅ | 2026-01-30 |
| TASK-075 | Remove `file_hash` variable and hashing logic from [routes.py](backend/src/routes.py) (no longer needed) | ✅ | 2026-01-30 |
| TASK-076 | Remove `file_hash` parameter from `IrisAgent.analyze()` method signature in [agent.py](backend/src/agent.py) (line 83) | ✅ | 2026-01-30 |
| TASK-077 | Verify no remaining imports or usage of SourceStore across codebase | ✅ | 2026-01-30 |

---

### Implementation Phase 7: Simplify Agent.py to Single Execution Path

**GOAL-007**: Reduce IrisAgent.analyze() to direct single-shot inference with no branching

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-078 | Remove `FAST_PATH_LINE_THRESHOLD` constant from [agent.py](backend/src/agent.py) (line 58) | ✅ | 2026-01-30 |
| TASK-079 | Remove `FAST_PATH_TOKEN_THRESHOLD` constant from [agent.py](backend/src/agent.py) (line 59) | ✅ | 2026-01-30 |
| TASK-080 | Remove `ONLY_FAST_PATH_EXPERIMENT` constant from [agent.py](backend/src/agent.py) (line 66) | ✅ | 2026-01-30 |
| TASK-081 | Delete fast-path threshold getter/setter methods from [agent.py](backend/src/agent.py) (lines 630-643) | ✅ | 2026-01-30 |
| TASK-082 | Delete token estimation methods from [agent.py](backend/src/agent.py): `_estimate_tokens()`, `_estimate_tool_calling_cost()`, `_calculate_max_tool_calls()`, `_estimate_fast_path_cost()` (lines 677-712) | ✅ | 2026-01-30 |
| TASK-083 | Delete `_extract_ranges_from_graph()` helper from [agent.py](backend/src/agent.py) (lines 607-628, only used by deleted methods) | ✅ | 2026-01-30 |
| TASK-084 | Rename `_run_fast_path_analysis()` → `_analyze_with_llm()` in [agent.py](backend/src/agent.py) (line 498) | ✅ | 2026-01-30 |
| TASK-085 | Remove all commented code from `_analyze_with_llm()` in [agent.py](backend/src/agent.py) (lines 521-602) | ✅ | 2026-01-30 |
| TASK-086 | Simplify `analyze()` method to single execution path in [agent.py](backend/src/agent.py): remove all branching logic (lines 104-220) | ✅ | 2026-01-30 |
| TASK-087 | Update `analyze()` to directly call `self._analyze_with_llm(filename, language, source_code)` | ✅ | 2026-01-30 |
| TASK-088 | Remove experiment flag checks from `analyze()` method in [agent.py](backend/src/agent.py) | ✅ | 2026-01-30 |
| TASK-089 | Update `analyze()` method signature to: `def analyze(self, filename: str, language: str, source_code: str) -> Dict[str, Any] | IrisError` | ✅ | 2026-01-30 |
| TASK-090 | Keep helper methods `_safe_stringify()` and `_handle_response_format()` in [agent.py](backend/src/agent.py) (lines 714-723) | ✅ | 2026-01-30 |
| TASK-091 | Add docstring to `analyze()` explaining single-shot architecture | ✅ | 2026-01-30 |

---

### Implementation Phase 8: Update Configuration Files

**GOAL-008**: Clean up configuration to reflect simplified architecture

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-092 | Review [backend/src/config.py](backend/src/config.py) for unused constants related to two-agent or tool-calling | ✅ | 2026-01-30 |
| TASK-093 | Remove any deprecated configuration values from [config.py](backend/src/config.py) | ✅ | 2026-01-30 |
| TASK-094 | Add configuration for single-shot inference if needed (model name, reasoning effort) | ✅ | 2026-01-30 |
| TASK-095 | Update [backend/requirements.txt](backend/requirements.txt) if any dependencies are no longer needed | ✅ | 2026-01-30 |
| TASK-096 | Verify OpenAI SDK version supports `responses.parse()` API used in single-shot inference | ✅ | 2026-01-30 |

---

### Implementation Phase 9: Archive Related Specs

**GOAL-009**: Move obsolete specification documents to archive directory

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-097 | Create [backend/specs/deprecated/](backend/specs/deprecated/) directory | ✅ | 2026-01-30 |
| TASK-098 | Move [backend/specs/iris_agentic_flow.md](backend/specs/iris_agentic_flow.md) → [backend/specs/deprecated/iris_agentic_flow.md](backend/specs/deprecated/iris_agentic_flow.md) | ✅ | 2026-01-30 |
| TASK-099 | Move [backend/specs/iris_agent_flow_fix.md](backend/specs/iris_agent_flow_fix.md) → [backend/specs/deprecated/iris_agent_flow_fix.md](backend/specs/deprecated/iris_agent_flow_fix.md) | ✅ | 2026-01-30 |
| TASK-100 | Move [backend/specs/iris_agent_flow_fix_2.md](backend/specs/iris_agent_flow_fix_2.md) → [backend/specs/deprecated/iris_agent_flow_fix_2.md](backend/specs/deprecated/iris_agent_flow_fix_2.md) | ✅ | 2026-01-30 |
| TASK-101 | Move [backend/specs/iris_agent_flow_fix3.md](backend/specs/iris_agent_flow_fix3.md) → [backend/specs/deprecated/iris_agent_flow_fix3.md](backend/specs/deprecated/iris_agent_flow_fix3.md) | ✅ | 2026-01-30 |
| TASK-102 | Move [backend/specs/debugger_implementation.md](backend/specs/debugger_implementation.md) → [backend/specs/deprecated/debugger_implementation.md](backend/specs/deprecated/debugger_implementation.md) | ✅ | 2026-01-30 |
| TASK-103 | Consider keeping [backend/specs/signature_graph.md](backend/specs/signature_graph.md) and [backend/specs/signature_graph_algorithm.md](backend/specs/signature_graph_algorithm.md) for future reference | ✅ | 2026-01-30 |
| TASK-104 | Consider keeping [backend/specs/agent_quality_testing.md](backend/specs/agent_quality_testing.md) for testing methodology | ✅ | 2026-01-30 |

---

## 3. Alternatives

**ALT-001**: Keep two-agent system as optional feature flag
- **Rejected**: Adds maintenance burden and contradicts strategic pivot to simplicity

**ALT-002**: Delete deprecated files instead of moving to deprecated/
- **Rejected**: Version control history may not be sufficient; archival provides clearer context

**ALT-003**: Keep signature graph as active module for potential future use
- **Rejected**: YAGNI principle - deprecate now, restore from git if needed later

**ALT-004**: Gradually deprecate systems over multiple releases
- **Rejected**: Clean break is clearer and reduces technical debt accumulation

**ALT-005**: Keep SourceStore for potential caching strategy
- **Rejected**: Current single-shot system doesn't need source caching; revisit when implementing LLM caching

---

## 4. Dependencies

**Internal Dependencies**

- **DEP-001**: [backend/src/agent.py](backend/src/agent.py) - Core agent logic
- **DEP-002**: [backend/src/routes.py](backend/src/routes.py) - Flask API endpoints
- **DEP-003**: [backend/src/experiment.py](backend/src/experiment.py) - Current single-shot prompts (will become prompts.py)
- **DEP-004**: [backend/src/prompts.py](backend/src/prompts.py) - Legacy prompts (will be deprecated)
- **DEP-005**: [backend/src/config.py](backend/src/config.py) - Configuration constants

**External Dependencies**

- **DEP-006**: OpenAI Python SDK - Must support `responses.parse()` API with structured outputs
- **DEP-007**: Flask framework - API routing remains unchanged
- **DEP-008**: Pydantic - Schema validation for LLM outputs

**Git Dependencies**

- **DEP-009**: Must commit after each phase to preserve working state
- **DEP-010**: Should create feature branch for cleanup work

---

## 5. Files

**Modified Files**

- **FILE-001**: [backend/src/agent.py](backend/src/agent.py) - Remove legacy methods, simplify analyze(), update imports
- **FILE-002**: [backend/src/routes.py](backend/src/routes.py) - Remove debugger, simplify analyze endpoint
- **FILE-003**: [backend/src/experiment.py](backend/src/experiment.py) - Will be renamed to prompts.py
- **FILE-004**: [backend/src/config.py](backend/src/config.py) - Remove unused configuration
- **FILE-005**: [backend/requirements.txt](backend/requirements.txt) - Potentially remove unused dependencies

**Moved Files**

- **FILE-006**: [backend/src/prompts.py](backend/src/prompts.py) → [backend/src/deprecated/prompts.py](backend/src/deprecated/prompts.py)
- **FILE-007**: [backend/src/debugger/](backend/src/debugger/) → [backend/src/deprecated/debugger/](backend/src/deprecated/debugger/)
- **FILE-008**: [backend/src/agents/](backend/src/agents/) → [backend/src/deprecated/agents/](backend/src/deprecated/agents/)
- **FILE-009**: [backend/src/tools/](backend/src/tools/) → [backend/src/deprecated/tools/](backend/src/deprecated/tools/)
- **FILE-010**: [backend/src/signature_graph/](backend/src/signature_graph/) → [backend/src/deprecated/signature_graph/](backend/src/deprecated/signature_graph/)
- **FILE-011**: [backend/src/source_store.py](backend/src/source_store.py) → [backend/src/deprecated/source_store.py](backend/src/deprecated/source_store.py)
- **FILE-012**: [backend/specs/iris_agentic_flow.md](backend/specs/iris_agentic_flow.md) → [backend/specs/deprecated/iris_agentic_flow.md](backend/specs/deprecated/iris_agentic_flow.md)
- **FILE-013**: [backend/specs/iris_agent_flow_fix*.md](backend/specs/iris_agent_flow_fix.md) → [backend/specs/deprecated/](backend/specs/deprecated/)
- **FILE-014**: [backend/specs/debugger_implementation.md](backend/specs/debugger_implementation.md) → [backend/specs/deprecated/debugger_implementation.md](backend/specs/deprecated/debugger_implementation.md)

**Unchanged Files**

- **FILE-015**: [backend/src/server.py](backend/src/server.py) - Flask server initialization
- **FILE-016**: [backend/samples/](backend/samples/) - Test samples
- **FILE-017**: [debug_reports/](debug_reports/) - Historical debug data

---

## 6. Risks & Assumptions

**Risks**

- **RISK-001**: Forgetting to remove an import, causing runtime errors
  - *Mitigation*: Use grep/search to verify no remaining imports after each phase

- **RISK-002**: Chrome extension or VS Code extension may depend on deprecated API features
  - *Mitigation*: Review extension code for dependencies on removed functionality (e.g., debug_mode)

- **RISK-003**: Accidentally moving/deleting active code instead of legacy code
  - *Mitigation*: Double-check file paths against detailed context report before moving

**Assumptions**

- **ASSUMPTION-001**: Current experiment mode (single-shot inference) is production-ready
- **ASSUMPTION-002**: No other services or scripts depend on two-agent or tool-calling APIs
- **ASSUMPTION-003**: OpenAI `gpt-5-nano` model will remain available and stable
- **ASSUMPTION-004**: debug_reports/ directory contents can remain as-is (historical data)
- **ASSUMPTION-005**: Signature graph may be useful in future but not blocking current cleanup

---

## 7. Related Specifications / Further Reading

- [History Document - Pivot to Single-Shot Inference](docs/history.md#12926-pivot-to-single-shot-inference--model-selection)
- [Backend Thoughts Document](backend/thoughts.md)
- [Deprecated: Two-Agent System Spec](backend/specs/deprecated/iris_agentic_flow.md) (after Phase 9)
- [Deprecated: Signature Graph Spec](backend/specs/signature_graph.md)
- [OpenAI Responses API Documentation](https://platform.openai.com/docs/api-reference/responses)
- [IRIS Philosophy Document](docs/philosophy.md)