"""Reusable quality validation functions for IRIS analysis output.

Pure functions that check analysis results for quality issues.
Used by tests, snapshot generation, and future CI pipelines.
"""

from __future__ import annotations

from typing import Any

GENERIC_LABELS = {
    "misc",
    "miscellaneous",
    "helpers",
    "utilities",
    "utility",
    "other",
    "everything else",
    "remaining",
}


def has_cross_block_overlaps(
    result: dict[str, Any],
) -> list[tuple[str, str, int]]:
    """Find lines claimed by more than one block.

    Returns:
        List of (block_a_label, block_b_label, line_number) tuples
        for each overlapping line. Empty list means no overlaps.
    """
    blocks = result.get("responsibility_blocks", [])
    overlaps = []
    claimed: dict[int, str] = {}

    for block in blocks:
        label = block.get("label", "unknown")
        for r in block.get("ranges", []):
            if len(r) < 2:
                continue
            for line in range(r[0], r[1] + 1):
                if line in claimed:
                    overlaps.append((claimed[line], label, line))
                else:
                    claimed[line] = label

    return overlaps


def has_nested_ranges(
    result: dict[str, Any],
) -> list[dict[str, Any]]:
    """Find blocks with overlapping ranges within themselves.

    Returns:
        List of dicts with 'label' and 'ranges' for blocks that
        have internal overlaps.
    """
    issues = []
    for block in result.get("responsibility_blocks", []):
        ranges = block.get("ranges", [])
        if len(ranges) <= 1:
            continue
        sorted_ranges = sorted(ranges, key=lambda r: r[0])
        for i in range(len(sorted_ranges) - 1):
            if sorted_ranges[i][1] >= sorted_ranges[i + 1][0]:
                issues.append({
                    "label": block.get("label", "unknown"),
                    "ranges": ranges,
                })
                break
    return issues


def avg_label_length(result: dict[str, Any]) -> float:
    """Average character length of block labels.

    Returns:
        Average length, or 0.0 if no blocks.
    """
    blocks = result.get("responsibility_blocks", [])
    if not blocks:
        return 0.0
    total = sum(len(b.get("label", "")) for b in blocks)
    return total / len(blocks)


def file_intent_word_count(result: dict[str, Any]) -> int:
    """Count words in file intent string."""
    intent = result.get("file_intent", "")
    return len(intent.split())


def has_generic_labels(result: dict[str, Any]) -> list[str]:
    """Find blocks with generic/vague labels.

    Returns:
        List of generic label strings found.
    """
    found = []
    for block in result.get("responsibility_blocks", []):
        label = block.get("label", "").lower().strip()
        if label in GENERIC_LABELS:
            found.append(block.get("label", ""))
    return found


def has_valid_range_format(
    result: dict[str, Any],
) -> list[dict[str, Any]]:
    """Find ranges with invalid format.

    Valid range: [start, end] where start >= 1 and start <= end.

    Returns:
        List of dicts with 'label' and 'invalid_range' for bad ranges.
        Empty list means all ranges are valid.
    """
    issues = []
    for block in result.get("responsibility_blocks", []):
        label = block.get("label", "unknown")
        for r in block.get("ranges", []):
            if (
                len(r) != 2
                or not isinstance(r[0], int)
                or not isinstance(r[1], int)
                or r[0] < 1
                or r[0] > r[1]
            ):
                issues.append({"label": label, "invalid_range": r})
    return issues


def validate_analysis_quality(
    result: dict[str, Any],
) -> list[str]:
    """Run all quality checks and return list of issue descriptions.

    Returns:
        List of issue strings. Empty list means all checks passed.
    """
    issues = []

    overlaps = has_cross_block_overlaps(result)
    if overlaps:
        issues.append(
            f"CRITICAL: {len(overlaps)} cross-block overlap(s) found"
        )

    nested = has_nested_ranges(result)
    if nested:
        labels = [n["label"] for n in nested]
        issues.append(
            f"Nested ranges within block(s): {', '.join(labels)}"
        )

    intent_words = file_intent_word_count(result)
    if intent_words > 20:
        issues.append(
            f"File intent too long ({intent_words} words, max 20)"
        )

    generic = has_generic_labels(result)
    if generic:
        issues.append(
            f"Generic label(s): {', '.join(generic)}"
        )

    bad_ranges = has_valid_range_format(result)
    if bad_ranges:
        issues.append(
            f"{len(bad_ranges)} invalid range format(s) found"
        )

    label_len = avg_label_length(result)
    if label_len > 60:
        issues.append(
            f"Verbose labels (avg {label_len:.0f} chars, target <60)"
        )

    return issues
