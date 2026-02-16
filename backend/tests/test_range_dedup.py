"""Unit tests for cross-block range deduplication.

Tests _deduplicate_cross_block_ranges() which ensures no two
responsibility blocks share any line number (first-block-wins).
"""

from src.agent import _deduplicate_cross_block_ranges


class _FakeBlock:
    """Minimal stand-in for a responsibility block with .ranges attribute."""

    def __init__(self, label: str, ranges: list[list[int]]):
        self.label = label
        self.ranges = ranges

    def __repr__(self) -> str:
        return f"Block({self.label!r}, {self.ranges})"


class TestDeduplicateCrossBlockRanges:
    """Tests for _deduplicate_cross_block_ranges()."""

    def test_should_passthrough_when_no_overlaps(self):
        blocks = [
            _FakeBlock("A", [[1, 5]]),
            _FakeBlock("B", [[10, 15]]),
            _FakeBlock("C", [[20, 25]]),
        ]
        result = _deduplicate_cross_block_ranges(blocks)
        assert len(result) == 3
        assert result[0].ranges == [[1, 5]]
        assert result[1].ranges == [[10, 15]]
        assert result[2].ranges == [[20, 25]]

    def test_should_remove_later_block_when_fully_overlapped(self):
        blocks = [
            _FakeBlock("A", [[1, 20]]),
            _FakeBlock("B", [[5, 15]]),
        ]
        result = _deduplicate_cross_block_ranges(blocks)
        assert len(result) == 1
        assert result[0].label == "A"
        assert result[0].ranges == [[1, 20]]

    def test_should_trim_later_block_when_partially_overlapped(self):
        blocks = [
            _FakeBlock("A", [[1, 10]]),
            _FakeBlock("B", [[5, 20]]),
        ]
        result = _deduplicate_cross_block_ranges(blocks)
        assert len(result) == 2
        assert result[0].ranges == [[1, 10]]
        assert result[1].ranges == [[11, 20]]

    def test_should_split_later_block_when_middle_claimed(self):
        blocks = [
            _FakeBlock("A", [[5, 10]]),
            _FakeBlock("B", [[1, 20]]),
        ]
        result = _deduplicate_cross_block_ranges(blocks)
        assert len(result) == 2
        assert result[0].ranges == [[5, 10]]
        assert result[1].ranges == [[1, 4], [11, 20]]

    def test_should_handle_single_line_blocks(self):
        blocks = [
            _FakeBlock("A", [[5, 5]]),
            _FakeBlock("B", [[5, 5]]),
        ]
        result = _deduplicate_cross_block_ranges(blocks)
        assert len(result) == 1
        assert result[0].label == "A"

    def test_should_return_empty_when_empty_input(self):
        result = _deduplicate_cross_block_ranges([])
        assert result == []

    def test_should_handle_single_block(self):
        blocks = [_FakeBlock("A", [[1, 10], [20, 30]])]
        result = _deduplicate_cross_block_ranges(blocks)
        assert len(result) == 1
        assert result[0].ranges == [[1, 10], [20, 30]]

    def test_should_handle_three_blocks_with_cascading_overlaps(self):
        blocks = [
            _FakeBlock("A", [[1, 10]]),
            _FakeBlock("B", [[8, 18]]),
            _FakeBlock("C", [[15, 25]]),
        ]
        result = _deduplicate_cross_block_ranges(blocks)
        assert len(result) == 3
        assert result[0].ranges == [[1, 10]]
        assert result[1].ranges == [[11, 18]]
        assert result[2].ranges == [[19, 25]]

    def test_should_handle_multiple_ranges_per_block(self):
        blocks = [
            _FakeBlock("A", [[1, 5], [20, 25]]),
            _FakeBlock("B", [[3, 8], [22, 30]]),
        ]
        result = _deduplicate_cross_block_ranges(blocks)
        assert len(result) == 2
        assert result[0].ranges == [[1, 5], [20, 25]]
        assert result[1].ranges == [[6, 8], [26, 30]]

    def test_should_remove_all_later_blocks_when_first_claims_everything(self):
        blocks = [
            _FakeBlock("A", [[1, 100]]),
            _FakeBlock("B", [[10, 20]]),
            _FakeBlock("C", [[30, 40]]),
        ]
        result = _deduplicate_cross_block_ranges(blocks)
        assert len(result) == 1
        assert result[0].label == "A"
