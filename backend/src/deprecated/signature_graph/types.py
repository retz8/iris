"""Signature graph output schema types."""

from __future__ import annotations

from typing import List, Optional, TypedDict

LineRange = List[int]


class SignatureEntity(TypedDict):
    """Signature graph entity extracted from a declaration node."""

    id: str
    name: str
    type: str
    signature: str
    line_range: LineRange
    depth: int
    scope: str
    parent_id: Optional[str]
    children_ids: List[str]
    calls: List[str]
    leading_comment: Optional[str]
    inline_comment: Optional[str]
    trailing_comment: Optional[str]
    docstring: Optional[str]


class SignatureGraph(TypedDict):
    """Container for signature graph output."""

    entities: List[SignatureEntity]
