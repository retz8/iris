"""Snapshot-based analysis quality tests.

Loads each cached LLM response snapshot and validates quality
metrics. No API calls required — runs against committed fixtures.
"""

import pytest

from tests.conftest import load_snapshot, get_all_snapshot_names
from tests.utils.quality_validators import (
    has_cross_block_overlaps,
    has_generic_labels,
    has_valid_range_format,
    file_intent_word_count,
)

# Snapshot names excluding empty file (special case)
_ALL = get_all_snapshot_names()
_NONEMPTY = [n for n in _ALL if n != "python_empty"]


@pytest.mark.parametrize("name", _ALL)
def test_should_have_no_cross_block_overlaps_when_any_snapshot(name):
    result = load_snapshot(name)
    overlaps = has_cross_block_overlaps(result)
    assert overlaps == [], (
        f"{name}: {len(overlaps)} cross-block overlap(s) found"
    )


@pytest.mark.parametrize("name", _ALL)
def test_should_have_file_intent_under_20_words_when_any_snapshot(name):
    result = load_snapshot(name)
    words = file_intent_word_count(result)
    assert words <= 20, (
        f"{name}: file intent is {words} words "
        f"(max 20): '{result['file_intent']}'"
    )


@pytest.mark.parametrize("name", _ALL)
def test_should_have_no_generic_labels_when_any_snapshot(name):
    result = load_snapshot(name)
    generic = has_generic_labels(result)
    assert generic == [], (
        f"{name}: generic label(s) found: {generic}"
    )


@pytest.mark.parametrize("name", _NONEMPTY)
def test_should_have_at_least_one_block_when_nonempty_file(name):
    result = load_snapshot(name)
    blocks = result.get("responsibility_blocks", [])
    assert len(blocks) >= 1, (
        f"{name}: expected at least 1 block, got {len(blocks)}"
    )


@pytest.mark.parametrize("name", _ALL)
def test_should_have_valid_range_format_when_any_snapshot(name):
    result = load_snapshot(name)
    issues = has_valid_range_format(result)
    assert issues == [], (
        f"{name}: invalid range(s): {issues}"
    )
