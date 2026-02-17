"""Unit tests for _merge_ranges() within-block range merging."""

from src.agent import _merge_ranges


class TestMergeRanges:

    def test_should_passthrough_when_no_overlaps(self):
        result = _merge_ranges([[1, 5], [10, 15], [20, 25]])
        assert result == [[1, 5], [10, 15], [20, 25]]

    def test_should_merge_when_nested_ranges(self):
        result = _merge_ranges([[1, 20], [5, 15], [8, 12]])
        assert result == [[1, 20]]

    def test_should_merge_when_adjacent_ranges(self):
        result = _merge_ranges([[1, 10], [10, 20]])
        assert result == [[1, 20]]

    def test_should_handle_when_single_range(self):
        result = _merge_ranges([[5, 10]])
        assert result == [[5, 10]]

    def test_should_handle_when_empty_list(self):
        result = _merge_ranges([])
        assert result == []

    def test_should_merge_when_partial_overlap(self):
        result = _merge_ranges([[3, 10], [8, 15], [14, 20]])
        assert result == [[3, 20]]

    def test_should_sort_before_merging(self):
        result = _merge_ranges([[20, 25], [1, 5], [10, 15]])
        assert result == [[1, 5], [10, 15], [20, 25]]
