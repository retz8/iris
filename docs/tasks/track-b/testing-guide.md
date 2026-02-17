# Track B: Using Test Suites to Improve Agent Quality

Step-by-step guide for iterating on IRIS analysis quality using the Track B test infrastructure.

## The Iteration Loop

```
Edit prompt/agent -> Clear cache -> Restart server -> Regenerate snapshots
-> Run tests -> Check diff -> Commit if improved
```

## Step-by-Step

### 1. Start the backend server

```bash
cd backend && source venv/bin/activate
python -m src.server   # localhost:8080
```

### 2. Make your change

Edit one or both of:
- `backend/src/prompts.py` -- prompt rules (label format, block granularity, overlap instructions)
- `backend/src/agent.py` -- post-processing logic (dedup, detection, validation)

### 3. Clear cache and restart server

Old cached responses will not reflect prompt changes. Always clear and restart.

```bash
rm -rf .iris
# Kill the running server process, then:
cd backend && source venv/bin/activate
python -m src.server
```

To find and kill a stale server process:

```bash
ps aux | grep "src.server"
kill <PID>
```

### 4. Regenerate snapshots

Regenerate all 15 snapshots against the updated server:

```bash
cd backend && python -m tests.generate_snapshots --update
```

The script prints a quality summary showing issues per snapshot. To regenerate a single snapshot:

```bash
python -m tests.generate_snapshots --update --only python_simple_functions
```

### 5. Run the full test suite

```bash
pytest backend/tests/
```

This runs all 129 Tier 1 tests against regenerated snapshots -- no API calls, instant, deterministic. Tests check:
- Zero cross-block overlaps
- File intent under 20 words
- No generic labels ("helpers", "utilities", "misc")
- Valid range format ([start, end] with start <= end, both >= 1)
- At least 1 block for non-empty files
- Label length averages

### 6. Compare before/after

Check the git diff of snapshots to see exactly how your change affected each analysis result:

```bash
git diff backend/tests/fixtures/snapshots/
```

Key things to compare:
- **Block count** -- fewer = less granular (good for small files)
- **Label word counts** -- target 2-5 words, noun phrases
- **Range coverage** -- are important lines still covered?
- **File intent wording** -- concise, under 20 words

### 7. Commit if improved

If tests pass and the diff shows improvement, commit the updated snapshots along with your prompt/agent changes.

## Extending the Test Suite

### Add new sample files

When you find a quality issue in production, capture the file:

1. Add it to `backend/tests/fixtures/samples/<language>/`
2. Run `python -m tests.generate_snapshots --update --only <name>`
3. The parameterized tests in `test_analysis_quality.py` automatically pick it up

### Add new quality validators

1. Add a pure function to `backend/tests/utils/quality_validators.py`
2. Wire it into `validate_analysis_quality()` aggregator
3. Add unit tests in `test_quality_validators.py`
4. Existing parameterized tests enforce the new rule across all snapshots

## Test Tiers

| Tier | Marker | API Calls | When to Use |
|------|--------|-----------|-------------|
| Tier 1 | (default) | No | CI, local dev, every commit |
| Tier 2 | `@pytest.mark.live` | Yes | Snapshot regeneration, manual validation |

Run only Tier 2 (live) tests:

```bash
pytest backend/tests/ -m live
```

## Common Gotchas

- **Stale server process**: The #1 source of false results. Always `ps aux | grep "src.server"` and kill old processes before regenerating.
- **Disk cache**: The `.iris/` directory caches responses by content hash. If you change the prompt but not the sample file, the cache returns old results. Always `rm -rf .iris` after prompt changes.
- **Server not picking up changes**: The Flask dev server does not always hot-reload. Restart it manually after editing `agent.py` or `prompts.py`.
