"""Source reader tool interface for IRIS.

Provides `refer_to_source_code` for agents to fetch raw source ranges while
logging usage for later analysis.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from ..source_store import SourceStore


@dataclass
class SourceRead:
    start_line: int
    end_line: int
    reason: Optional[str]
    snippet: str


class SourceReader:
    """Lightweight wrapper that exposes range-based source retrieval."""

    def __init__(self, store: SourceStore, file_hash: str) -> None:
        self.store = store
        self.file_hash = file_hash
        self.read_log: List[SourceRead] = []

    def refer_to_source_code(self, start_line: int, end_line: int, reason: Optional[str] = None) -> str:
        """Return the raw source code for the inclusive line range and log the access."""
        snippet = self.store.get_range(self.file_hash, start_line, end_line)
        self.read_log.append(SourceRead(start_line, end_line, reason, snippet))
        return snippet

    def get_log(self) -> List[SourceRead]:
        """Return the list of recorded source reads."""
        return self.read_log
