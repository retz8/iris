---
goal: Analysis Quality - Cross-block Overlap Fix, Test Infrastructure, and Prompt Tuning
version: 1.0
date_created: 2026-02-16
last_updated: 2026-02-16
owner: Track B
status: Planned
tags: [quality, testing, prompt-engineering, backend, edge-cases]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan implements systematic quality improvements to IRIS's single-shot LLM analysis. It addresses three problems discovered during Phase 0 exploration:

1. **Cross-block range overlaps**: The LLM produces overlapping line ranges across different responsibility blocks despite prompt rules forbidding it. The existing `_merge_ranges()` function only handles within-block overlaps.
2. **Zero test coverage**: `backend/tests/` does not exist. No pytest tests, no fixtures, no quality validation.
3. **Prompt quality gaps**: Verbose labels, over-granular blocks on small files, file intents exceeding word limits.

The plan uses a fixture-based testing strategy with cached LLM responses for deterministic, cost-free CI testing, plus a live validation tier for prompt iteration.

## 1. Requirements & Constraints

### Functional Requirements

- **REQ-001**: No two responsibility blocks may share any line number in their ranges
- **REQ-002**: Ranges within a single block must be non-overlapping and sorted
- **REQ-003**: File intent must be under 20 words (target under 10)
- **REQ-004**: Block labels must not use generic names ("helpers", "utilities", "misc") unless truly accurate
- **REQ-005**: Empty files must return a graceful response (empty blocks list, descriptive file intent)
- **REQ-006**: Minified code (single-line files with >500 chars) must be detected and handled
- **REQ-007**: Analysis must complete within 30 seconds (timeout protection)
- **REQ-008**: Test corpus must cover at least 20 diverse files across languages, sizes, and styles
- **REQ-009**: At least 5 fixture-based tests with cached LLM responses for CI
- **REQ-010**: Quality metrics must be programmatically verifiable (no manual review required for pass/fail)

### Technical Constraints

- **CON-001**: Use existing `gpt-5-nano-2025-08-07` model (no model changes for MVP)
- **CON-002**: All changes in `backend/` directory only
- **CON-003**: Follow PEP 8 style, test naming: `test_should_<expected>_when_<condition>`
- **CON-004**: Fixture tests must not require OpenAI API key or network access
- **CON-005**: Live tests must be opt-in via pytest marker (not run by default)

### Design Guidelines

- **GUD-001**: Cross-block deduplication runs after within-block merge (layered post-processing)
- **GUD-002**: First block to claim a line range wins; later blocks have overlapping lines trimmed
- **GUD-003**: Quality validators are pure functions (no side effects, no I/O)
- **GUD-004**: Test fixtures are committed JSON files (version-controlled, reviewable)

### Patterns

- **PAT-001**: Post-processing pipeline: LLM output -> within-block merge -> cross-block dedup -> validation
- **PAT-002**: Two-tier testing: Tier 1 (fixtures, fast, deterministic) + Tier 2 (live API, opt-in)
- **PAT-003**: Quality metrics as standalone validators importable by both tests and future CI

## 2. Implementation Steps

### Phase 1: Cross-Block Overlap Fix

- GOAL-001: Eliminate cross-block range overlaps via post-processing in `agent.py`

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add `_deduplicate_cross_block_ranges(blocks)` function in `backend/src/agent.py`. Algorithm: iterate blocks in order, maintain a set of claimed lines, for each subsequent block trim or split ranges that overlap already-claimed lines, remove blocks that become empty after trimming. | ✅ | 2026-02-16 |
| TASK-002 | Call `_deduplicate_cross_block_ranges()` in `IrisAgent._analyze_with_llm()` after the existing `_merge_ranges()` loop (line 216), applying it to the full list of `content.responsibility_blocks`. | ✅ | 2026-02-16 |
| TASK-003 | Add unit tests for `_deduplicate_cross_block_ranges()` in `backend/tests/test_range_dedup.py` covering: no overlaps (passthrough), full overlap (later block removed), partial overlap (later block trimmed), nested ranges across blocks, single-line blocks, empty input. | ✅ | 2026-02-16 |

### Phase 2: Test Infrastructure

- GOAL-002: Create pytest test suite with fixture-based approach for deterministic quality validation

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Create directory structure: `backend/tests/__init__.py`, `backend/tests/conftest.py`, `backend/tests/fixtures/samples/` (with `python/`, `javascript/`, `typescript/` subdirectories), `backend/tests/fixtures/snapshots/`, `backend/tests/utils/`. | ✅ | 2026-02-16 |
| TASK-005 | Create `backend/tests/utils/__init__.py` and `backend/tests/utils/quality_validators.py` with pure functions: `has_cross_block_overlaps(result) -> list[tuple]`, `has_nested_ranges(result) -> list`, `avg_label_length(result) -> float`, `file_intent_word_count(result) -> int`, `has_generic_labels(result) -> list[str]`, `validate_analysis_quality(result) -> list[str]` (aggregator returning list of issue strings). | ✅ | 2026-02-16 |
| TASK-006 | Create `backend/tests/conftest.py` with pytest fixtures: `sample_analysis_result` (valid fixture), `overlapping_result` (fixture with cross-block overlaps), `load_snapshot(name)` helper that reads from `backend/tests/fixtures/snapshots/{name}.json`. Add `@pytest.mark.live` marker registration for Tier 2 tests. | ✅ | 2026-02-16 |
| TASK-007 | Create test corpus of 15 sample source files in `backend/tests/fixtures/samples/`. Files: `python/simple_functions.py` (5 lines, 2 functions), `python/class_with_methods.py` (80 lines, OOP), `python/data_pipeline.py` (200 lines, ETL pattern), `python/empty.py` (0 lines), `python/single_line.py` (1 line: `x = 1`), `python/comments_heavy.py` (60 lines, 70% comments), `javascript/express_routes.js` (120 lines, HTTP handlers), `javascript/react_component.jsx` (90 lines, functional React), `javascript/minified.min.js` (1 line, 800+ chars, UMD bundle), `typescript/types_only.ts` (50 lines, interfaces/types), `typescript/service_class.ts` (180 lines, class with DI), `typescript/state_machine.ts` (150 lines, enum + switch), `python/config_constants.py` (40 lines, constants/dicts), `javascript/utility_module.js` (100 lines, exported helpers), `typescript/index_barrel.ts` (15 lines, re-exports only). | ✅ | 2026-02-16 |
| TASK-008 | Create `backend/tests/test_quality_validators.py` with unit tests for all validator functions in `quality_validators.py`. Test against hand-crafted fixture dicts (no LLM calls). At least 3 test cases per validator. | ✅ | 2026-02-16 |

### Phase 3: Generate Baseline Snapshots

- GOAL-003: Generate and commit LLM response snapshots for fixture-based testing

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Create `backend/tests/utils/snapshot_manager.py` with functions: `generate_snapshot(sample_path, language) -> dict` (calls live API, returns raw result), `save_snapshot(name, result)` (writes to `fixtures/snapshots/{name}.json`), `load_snapshot(name) -> dict` (reads from snapshots dir). | ✅ | 2026-02-16 |
| TASK-010 | Create `backend/tests/generate_snapshots.py` script that iterates all files in `fixtures/samples/`, calls the analysis endpoint for each, saves results as snapshots, and prints a quality summary using `validate_analysis_quality()`. Run with `--update` flag to regenerate. Requires running backend server. | ✅ | 2026-02-16 |
| TASK-011 | Run `generate_snapshots.py` against running backend to produce baseline snapshots for all 15 sample files. Commit snapshots to `backend/tests/fixtures/snapshots/`. Review quality summary output and document any issues found. | ✅ | 2026-02-16 |

### Phase 4: Core Test Suite

- GOAL-004: Write fixture-based pytest tests that validate analysis quality without API calls

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Create `backend/tests/test_analysis_quality.py` with tests that load each snapshot and run `validate_analysis_quality()`. Tests: `test_should_have_no_cross_block_overlaps_when_any_snapshot`, `test_should_have_file_intent_under_20_words_when_any_snapshot`, `test_should_have_no_generic_labels_when_any_snapshot`, `test_should_have_at_least_one_block_when_nonempty_file`, `test_should_have_valid_range_format_when_any_snapshot` (each range is [start, end] with start <= end, both >= 1). Use `@pytest.mark.parametrize` over snapshot files. | ✅ | 2026-02-17 |
| TASK-013 | Create `backend/tests/test_edge_cases.py` with tests: `test_should_reject_empty_source_when_empty_string` (API returns 400), `test_should_handle_minified_code_when_single_long_line` (validates result structure), `test_should_handle_comments_only_file_when_no_executable_code`, `test_should_handle_barrel_file_when_only_reexports`. Use fixture snapshots where available; mock API responses for edge cases not in snapshot set. | ✅ | 2026-02-17 |
| TASK-014 | Create `backend/tests/test_prompt_builder.py` with unit tests for `build_single_shot_user_prompt()`: `test_should_add_line_numbers_when_multiline_source`, `test_should_format_xml_tags_when_valid_input`, `test_should_handle_empty_source_when_empty_string`, `test_should_handle_unicode_when_special_chars`. No LLM calls needed. | ✅ | 2026-02-17 |
| TASK-015 | Create `backend/tests/test_range_processing.py` with unit tests for `_merge_ranges()`: `test_should_passthrough_when_no_overlaps`, `test_should_merge_when_nested_ranges`, `test_should_merge_when_adjacent_ranges`, `test_should_handle_when_single_range`, `test_should_handle_when_empty_list`. | ✅ | 2026-02-17 |

### Phase 5: Edge Case Handling

- GOAL-005: Add graceful handling for empty files, minified code, and LLM timeouts in `agent.py`

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Add empty file detection in `IrisAgent.analyze()` before LLM call. If `source_code.strip()` is empty, return `{"file_intent": "Empty file", "responsibility_blocks": [], "metadata": {"input_tokens": 0, "output_tokens": 0, "estimated_cost_usd": 0.0, "cache_hit": 0, "skipped": "empty_file"}}`. | | |
| TASK-017 | Add minified code detection in `IrisAgent.analyze()`. Heuristic: if file has fewer than 3 lines AND any line exceeds 500 characters, set a `minified` flag. Pass this flag as context to the LLM (append note to user prompt: "Note: This file appears to be minified/bundled code."). Add `"minified_detected": true` to metadata. | | |
| TASK-018 | Add timeout protection to `_analyze_with_llm()`. Wrap the `self.client.responses.parse()` call with `asyncio.wait_for(timeout=30)`. On timeout, raise `IrisError("Analysis timed out after 30 seconds", status_code=504)`. | | |
| TASK-019 | Update `backend/src/routes.py` to handle empty source_code gracefully. Instead of returning 400 for empty `source_code`, pass it through to `IrisAgent.analyze()` which will return the empty-file response from TASK-016. | | |

### Phase 6: Prompt Tuning

- GOAL-006: Refine system prompt to reduce observed quality issues (verbose labels, over-granularity, intent length)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | Add label conciseness rule to `<block_quality_rules>` in `prompts.py`: "Labels must be 2-5 words. Use noun phrases, not sentences. Examples: 'Route handlers', 'Database persistence', 'Auth middleware'. Wrong: 'HTTP route handlers and request validation', 'Add function capability'." | | |
| TASK-021 | Add small-file granularity rule to `<block_size_rules>` in `prompts.py`: "For files under 30 lines, prefer fewer blocks (1-2). A 5-line file with two simple functions is ONE block, not two." | | |
| TASK-022 | Strengthen cross-block overlap instruction in `<responsibility_block_rules>`: change "Each line of code should belong to at most ONE block. Minimize inter-block overlap." to "Each line of code MUST belong to exactly ONE block or NO block. Zero tolerance for inter-block overlap. If two responsibilities share code, assign the shared lines to whichever responsibility they primarily serve." | | |
| TASK-023 | Regenerate snapshots after prompt changes using `generate_snapshots.py --update`. Run full test suite. Compare quality metrics before/after. Document improvement or regression for each snapshot. | | |

## 3. Alternatives

- **ALT-001**: Fix overlaps purely via prompt engineering (no post-processing). Rejected because LLMs are not deterministic; post-processing guarantees correctness regardless of LLM output quality.
- **ALT-002**: Use live API calls in all tests. Rejected because it requires API key, costs money, is non-deterministic, and breaks CI isolation.
- **ALT-003**: Use a separate validation LLM call to check quality. Rejected because it doubles cost and latency for marginal benefit when programmatic validators suffice.
- **ALT-004**: Cross-block dedup via "last block wins" instead of "first block wins". Rejected because comprehension-ordered blocks (Phase 3 of prompt) place the most important blocks first; they should retain their ranges.

## 4. Dependencies

- **DEP-001**: Python 3.10+ (for `list[list[int]]` type hints in `_merge_ranges`)
- **DEP-002**: `pytest` (already in project dev dependencies)
- **DEP-003**: Running backend server for snapshot generation (TASK-011, TASK-023 only)
- **DEP-004**: OpenAI API key for snapshot generation (TASK-011, TASK-023 only; not needed for fixture tests)

## 5. Files

- **FILE-001**: `backend/src/agent.py` - Add `_deduplicate_cross_block_ranges()`, empty file detection, minified detection, timeout protection
- **FILE-002**: `backend/src/prompts.py` - Prompt tuning (label rules, granularity, overlap strength)
- **FILE-003**: `backend/src/routes.py` - Allow empty source_code passthrough
- **FILE-004**: `backend/tests/__init__.py` - Package init
- **FILE-005**: `backend/tests/conftest.py` - Pytest configuration, fixtures, markers
- **FILE-006**: `backend/tests/test_range_dedup.py` - Cross-block dedup unit tests
- **FILE-007**: `backend/tests/test_range_processing.py` - Within-block merge unit tests
- **FILE-008**: `backend/tests/test_quality_validators.py` - Quality validator unit tests
- **FILE-009**: `backend/tests/test_analysis_quality.py` - Snapshot-based quality tests
- **FILE-010**: `backend/tests/test_edge_cases.py` - Edge case tests
- **FILE-011**: `backend/tests/test_prompt_builder.py` - Prompt builder unit tests
- **FILE-012**: `backend/tests/utils/__init__.py` - Utils package init
- **FILE-013**: `backend/tests/utils/quality_validators.py` - Reusable quality check functions
- **FILE-014**: `backend/tests/utils/snapshot_manager.py` - Snapshot load/save utilities
- **FILE-015**: `backend/tests/generate_snapshots.py` - Snapshot generation script
- **FILE-016**: `backend/tests/fixtures/samples/**` - 15 sample source files (test corpus)
- **FILE-017**: `backend/tests/fixtures/snapshots/**` - Cached LLM response JSON files

## 6. Testing

- **TEST-001**: `test_range_dedup.py` - 6 unit tests for `_deduplicate_cross_block_ranges()` (no overlaps, full overlap, partial overlap, nested, single-line, empty)
- **TEST-002**: `test_range_processing.py` - 5 unit tests for `_merge_ranges()` (passthrough, nested, adjacent, single, empty)
- **TEST-003**: `test_quality_validators.py` - 15+ unit tests for all quality validator functions
- **TEST-004**: `test_analysis_quality.py` - Parameterized tests across 15 snapshots validating: no cross-block overlaps, intent word count, no generic labels, valid range format, at least 1 block for non-empty files
- **TEST-005**: `test_edge_cases.py` - 4 tests for empty, minified, comments-only, barrel files
- **TEST-006**: `test_prompt_builder.py` - 4 unit tests for prompt construction

## 7. Risks & Assumptions

- **RISK-001**: Cross-block dedup may remove meaningful blocks if the LLM produces heavily overlapping output. Mitigation: "first block wins" preserves comprehension-ordered priority; monitor block count before/after dedup.
- **RISK-002**: Prompt tuning may regress quality on some file types while improving others. Mitigation: snapshot comparison (before/after) across full corpus catches regressions.
- **RISK-003**: Snapshot-based tests become stale if prompt changes significantly. Mitigation: `generate_snapshots.py --update` regenerates all snapshots; CI only runs fixture tests (Tier 1).
- **ASSUMPTION-001**: `gpt-5-nano-2025-08-07` model is stable and produces reasonably consistent output for the same prompt.
- **ASSUMPTION-002**: 15 sample files provide sufficient diversity for quality validation. Can expand corpus later.
- **ASSUMPTION-003**: "First block wins" dedup strategy aligns with the prompt's comprehension ordering (most important blocks listed first).

## 8. Related Specifications / Further Reading

- [Track B task definition](../track-b-analysis-quality.md)
- [Track A implementation plan](../track-a/extension-ux-implementation-plan.md) (template reference)
- [Current prompt](../../backend/src/prompts.py)
- [Current agent](../../backend/src/agent.py)
