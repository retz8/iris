# backend/tests — Analysis Quality Test Suite

**Status:** Complete (129 tests, lint clean)
**Built:** 2026-02-17 (Track B)

## What This Tests

IRIS's single-shot LLM analysis had three quality gaps before Track B:

1. **Cross-block range overlaps** in ~40% of analyzed files (LLM producing overlapping line ranges across blocks despite prompt rules)
2. **Zero test coverage** (backend/tests/ did not exist)
3. **Prompt quality gaps**: verbose labels, over-granular blocks on small files, file intents exceeding word limits

## Test Breakdown

| Test File | Count | What It Tests |
|-----------|-------|---------------|
| test_range_dedup.py | 10 | Cross-block dedup function |
| test_quality_validators.py | 24 | Quality validator functions |
| test_analysis_quality.py | 74 | Parameterized snapshot quality checks |
| test_edge_cases.py | 8 | Empty, minified, comments, barrel files |
| test_prompt_builder.py | 6 | Prompt construction |
| test_range_processing.py | 7 | Within-block range merge |
| **Total** | **129** | |

## Running Tests

```bash
cd backend && source venv/bin/activate
pytest backend/tests/          # all Tier 1 tests (no API calls)
pytest backend/tests/ -m live  # Tier 2: live API tests (requires running server)
```

## Architecture

**Two-tier testing strategy:**
- **Tier 1** (default): Fixture-based, deterministic, no API calls, no cost — run every commit
- **Tier 2** (`@pytest.mark.live`): Live API via marker — for snapshot regeneration and manual validation

**Post-processing pipeline tested:**
```
LLM output -> within-block merge -> cross-block dedup -> validation
```

**Quality validators** (`utils/quality_validators.py`) — 6 pure functions + aggregator:
- `has_cross_block_overlaps()` — detects shared lines between blocks
- `has_nested_ranges()` — detects ranges fully contained in others
- `avg_label_length()` — average word count of block labels
- `file_intent_word_count()` — word count of file intent
- `has_generic_labels()` — flags "helpers", "utilities", "misc"
- `has_valid_range_format()` — validates [start, end] structure
- `validate_analysis_quality()` — aggregator returning list of issues

**Test corpus** (`fixtures/samples/`): 15 files across Python (7), JavaScript (4), TypeScript (4) — simple functions, OOP classes, data pipelines, empty files, minified code, comments-heavy, Express routes, React components, type definitions, service classes, state machines, config constants, utility modules, barrel files.

**Snapshots** (`fixtures/snapshots/`): 15 cached LLM responses generated against the live API. Regenerate with:
```bash
python -m tests.generate_snapshots --update
python -m tests.generate_snapshots --update --only python_simple_functions
```

## Key Decisions

- **First-block-wins** dedup preserves comprehension-ordered priority
- **Post-processing over prompt-only**: LLMs are non-deterministic; post-processing guarantees correctness
- **Fixture-based tests** for CI (no API key needed); live tests are opt-in

## Files Modified by Track B

- `backend/src/agent.py` — cross-block dedup, empty file handling, minified detection, 30s timeout
- `backend/src/prompts.py` — label conciseness (2-5 words), small-file granularity (1-2 blocks under 30 lines), zero-tolerance overlap rule
- `backend/src/routes.py` — allow empty source_code passthrough

See `TESTING_GUIDE.md` for the iteration workflow when tuning prompts or agent logic.
