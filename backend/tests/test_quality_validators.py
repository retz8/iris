"""Unit tests for quality validator functions.

Tests use hand-crafted fixture dicts (no LLM calls).
"""

from tests.utils.quality_validators import (
    has_cross_block_overlaps,
    has_nested_ranges,
    avg_label_length,
    file_intent_word_count,
    has_generic_labels,
    has_valid_range_format,
    validate_analysis_quality,
)


class TestHasCrossBlockOverlaps:

    def test_should_return_empty_when_no_overlaps(self):
        result = {
            "responsibility_blocks": [
                {"label": "A", "ranges": [[1, 5]]},
                {"label": "B", "ranges": [[10, 15]]},
            ]
        }
        assert has_cross_block_overlaps(result) == []

    def test_should_detect_when_blocks_share_lines(self):
        result = {
            "responsibility_blocks": [
                {"label": "A", "ranges": [[1, 10]]},
                {"label": "B", "ranges": [[5, 15]]},
            ]
        }
        overlaps = has_cross_block_overlaps(result)
        assert len(overlaps) == 6  # lines 5-10
        assert overlaps[0] == ("A", "B", 5)

    def test_should_return_empty_when_no_blocks(self):
        result = {"responsibility_blocks": []}
        assert has_cross_block_overlaps(result) == []

    def test_should_handle_multiple_ranges_per_block(self):
        result = {
            "responsibility_blocks": [
                {"label": "A", "ranges": [[1, 5], [20, 25]]},
                {"label": "B", "ranges": [[3, 8]]},
            ]
        }
        overlaps = has_cross_block_overlaps(result)
        assert len(overlaps) == 3  # lines 3, 4, 5


class TestHasNestedRanges:

    def test_should_return_empty_when_no_nested(self):
        result = {
            "responsibility_blocks": [
                {"label": "A", "ranges": [[1, 5], [10, 15]]},
            ]
        }
        assert has_nested_ranges(result) == []

    def test_should_detect_when_ranges_overlap_within_block(self):
        result = {
            "responsibility_blocks": [
                {"label": "A", "ranges": [[1, 10], [5, 15]]},
            ]
        }
        issues = has_nested_ranges(result)
        assert len(issues) == 1
        assert issues[0]["label"] == "A"

    def test_should_return_empty_when_single_range(self):
        result = {
            "responsibility_blocks": [
                {"label": "A", "ranges": [[1, 10]]},
            ]
        }
        assert has_nested_ranges(result) == []


class TestAvgLabelLength:

    def test_should_return_zero_when_no_blocks(self):
        result = {"responsibility_blocks": []}
        assert avg_label_length(result) == 0.0

    def test_should_compute_average_correctly(self):
        result = {
            "responsibility_blocks": [
                {"label": "Short"},       # 5 chars
                {"label": "Medium label"},  # 12 chars
                {"label": "A"},            # 1 char
            ]
        }
        avg = avg_label_length(result)
        assert avg == 6.0  # (5 + 12 + 1) / 3

    def test_should_handle_single_block(self):
        result = {
            "responsibility_blocks": [
                {"label": "Hello"},
            ]
        }
        assert avg_label_length(result) == 5.0


class TestFileIntentWordCount:

    def test_should_count_words(self):
        result = {"file_intent": "Data processing utility"}
        assert file_intent_word_count(result) == 3

    def test_should_return_zero_when_empty(self):
        result = {"file_intent": ""}
        assert file_intent_word_count(result) == 0

    def test_should_handle_long_intent(self):
        result = {
            "file_intent": (
                "This is a very long file intent that exceeds "
                "the recommended maximum word count limit"
            )
        }
        assert file_intent_word_count(result) > 10


class TestHasGenericLabels:

    def test_should_return_empty_when_no_generic(self):
        result = {
            "responsibility_blocks": [
                {"label": "Data ingestion"},
                {"label": "Route handlers"},
            ]
        }
        assert has_generic_labels(result) == []

    def test_should_detect_generic_labels(self):
        result = {
            "responsibility_blocks": [
                {"label": "Data ingestion"},
                {"label": "Helpers"},
                {"label": "Utilities"},
            ]
        }
        generic = has_generic_labels(result)
        assert len(generic) == 2

    def test_should_be_case_insensitive(self):
        result = {
            "responsibility_blocks": [
                {"label": "MISC"},
            ]
        }
        assert len(has_generic_labels(result)) == 1


class TestHasValidRangeFormat:

    def test_should_return_empty_when_all_valid(self):
        result = {
            "responsibility_blocks": [
                {"label": "A", "ranges": [[1, 5], [10, 20]]},
            ]
        }
        assert has_valid_range_format(result) == []

    def test_should_detect_when_start_greater_than_end(self):
        result = {
            "responsibility_blocks": [
                {"label": "A", "ranges": [[10, 5]]},
            ]
        }
        issues = has_valid_range_format(result)
        assert len(issues) == 1

    def test_should_detect_when_start_is_zero(self):
        result = {
            "responsibility_blocks": [
                {"label": "A", "ranges": [[0, 5]]},
            ]
        }
        issues = has_valid_range_format(result)
        assert len(issues) == 1

    def test_should_detect_when_range_too_short(self):
        result = {
            "responsibility_blocks": [
                {"label": "A", "ranges": [[5]]},
            ]
        }
        issues = has_valid_range_format(result)
        assert len(issues) == 1


class TestValidateAnalysisQuality:

    def test_should_return_empty_when_all_good(
        self, sample_analysis_result
    ):
        issues = validate_analysis_quality(sample_analysis_result)
        assert issues == []

    def test_should_report_overlaps(self, overlapping_result):
        issues = validate_analysis_quality(overlapping_result)
        assert any("cross-block overlap" in i for i in issues)

    def test_should_report_long_intent(self):
        result = {
            "file_intent": " ".join(["word"] * 25),
            "responsibility_blocks": [],
        }
        issues = validate_analysis_quality(result)
        assert any("too long" in i for i in issues)

    def test_should_report_generic_labels(self):
        result = {
            "file_intent": "Test file",
            "responsibility_blocks": [
                {"label": "helpers", "ranges": [[1, 5]]},
            ],
        }
        issues = validate_analysis_quality(result)
        assert any("Generic" in i for i in issues)
