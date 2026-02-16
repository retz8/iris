# Track B: Analysis Quality

**Stream:** 3 (from TODO.md)
**Scope:** `backend/src/prompts.py`, `backend/tests/`
**Dependencies:** None
**Blocks:** Track D (backend hardening must wait for this to avoid merge conflicts)


## Objective

Systematically test and improve the current single-shot inference prompt to ensure consistently useful analysis output across diverse real-world files. Handle edge cases gracefully and establish test coverage for confidence in future refactoring.

**Current State:**
- Single-shot prompt exists in `backend/src/prompts.py`
- Using `gpt-5-nano-2025-08-07` model for cost efficiency
- Basic analysis works, but quality/consistency across different codebases is unvalidated
- No systematic test coverage

## Context

The backend uses single-shot LLM inference: one API call per file produces file intent and responsibility blocks. The prompt is in `backend/src/prompts.py` with a Pydantic schema. Current focus is on making this reliable and useful, not adding new capabilities.

**Key Files:**
- `backend/src/prompts.py` - System prompt and user prompt builder
- `backend/src/agent.py` - LLM orchestration (calls OpenAI API)
- `backend/tests/` - Test suite (currently minimal)


## Phase 0: Exploration

Follow these steps to understand the current state:

1. Read `backend/src/prompts.py` to understand current prompt structure
2. Read `backend/src/agent.py` to see how LLM is called
3. Check existing tests in `backend/tests/` to see what's covered
4. Identify edge case handling in current code (timeouts, errors, empty responses)
5. Run backend locally: `cd backend && source venv/bin/activate && python -m src.server`
6. Test analysis with curl manually on 3-5 diverse files, observe output quality
7. Document failure patterns and edge cases discovered

## Phase 1: Discovery/Discussion (with human engineer)

### Topics to Discuss

Based on Phase 0 exploration, discuss and generate specific questions for:

1. **Prompt Quality** - What makes output "good", common failure modes, measurement criteria
2. **Test Corpus** - File diversity, sourcing strategy, sample size for confidence
3. **Edge Cases** - Large files, empty files, minified code, generated code behavior
4. **Testing Strategy** - Unit vs integration tests, fixtures vs live calls, manual vs automated

Document specific questions and design decisions here after discussion.


## Phase 2: Implementation Planning

**Will be filled in after Phase 1 discussion.** Should include:
- Test corpus file list
- Prompt tuning iteration plan
- Test file structure and organization
- Edge case handling implementation approach


## Phase 3: Execution

**Will be filled in after Phase 2 planning.** Should include:
- Step-by-step prompt refinement process
- Test writing and execution
- Edge case implementation

## Phase 4: Testing & Verification

**Will be filled in after Phase 3 execution.** Should include:
- Test execution commands
- Verification steps against acceptance criteria
- Quality validation on diverse test corpus

## Acceptance Criteria

- [ ] **Prompt Quality:**
  - Tested on at least 20 diverse real-world files (mix of languages, sizes, styles)
  - File intent is clear and accurate in 90%+ of cases
  - Responsibility blocks are non-overlapping and meaningful
  - No generic labels like "helpers" or "utilities" unless truly accurate

- [ ] **Edge Case Handling:**
  - Very large files (>2000 lines) analyzed without timeout or memory issues
  - Empty files return graceful response (empty blocks or clear error message)
  - Minified code detected and handled appropriately (skip analysis or return simplified blocks)
  - Generated code (protobuf, schema) produces useful-enough output or clear "not applicable" signal

- [ ] **Test Coverage:**
  - Backend has pytest tests covering core analysis logic
  - Schema validation tests (LLM output matches expected Pydantic schema)
  - At least 5 fixture-based tests with cached LLM responses (avoid API costs in CI)
  - Edge cases have explicit test coverage


## Files Likely to Modify

Based on scope:
- `backend/src/prompts.py` - Refine system prompt based on quality findings
- `backend/src/agent.py` - Add edge case handling (timeouts, large files, empty files)
- `backend/tests/test_prompts.py` - Schema validation, prompt builder tests
- `backend/tests/test_agent.py` - LLM orchestration tests
- `backend/tests/test_edge_cases.py` - Large file, empty file, minified code tests
- `backend/tests/fixtures/` - Cached LLM responses for deterministic testing


## Claude Code Session Instructions

### Skills to Use

- **sequential-thinking** - For systematic prompt evaluation and iterative refinement
- **n8n-skills** (if applicable) - For any workflow automation in testing

### Recommended Agents

- **General-purpose agent** - For prompt tuning, testing, edge case implementation
- **Explore agent** - For initial codebase exploration

### Tools Priority

- **Read** - Study current prompt, agent code, existing tests
- **Grep** - Search for error handling patterns, edge case references
- **Edit** - Refine prompt text iteratively based on test results
- **Write** - Create new test files, fixture files
- **Bash** - Run backend locally, execute pytest, test against sample files

### Testing Commands

```bash
# Activate venv
cd backend && source venv/bin/activate

# Run backend locally
python -m src.server

# Run all tests
pytest backend/tests/

# Run specific test file
pytest backend/tests/test_prompts.py

# Run with verbose output
pytest backend/tests/ -v

# Run and show print statements
pytest backend/tests/ -s
```

### Coordination

- **Before starting:** Read `docs/tasks/UPDATES.md` to check for relevant updates
- **After completing:** Append summary to `docs/tasks/UPDATES.md` with:
  - Prompt changes made and why
  - Test coverage added
  - Edge cases handled
  - Files modified


## Notes

- This track **blocks Track D** (backend hardening) - they both modify `backend/src/` so D must wait
- Can run in parallel with Tracks A, C, H
- Focus on **current prompt quality**, NOT building new verification features
- Use existing gpt-5-nano model - no model changes for MVP
- Follow PEP 8 and test naming conventions from CLAUDE.md
