"""Source code storage and retrieval utilities for IRIS.

Caches source code by hash and enables fast line-range retrieval.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Dict, List, Optional


class SourceStore:
    """Stores source code content indexed by a stable hash."""

    def __init__(self) -> None:
        self._cache: Dict[str, List[str]] = {}
        self._filenames: Dict[str, str] = {}  # hash -> filename mapping

    def store(
        self,
        source: str,
        file_hash: Optional[str] = None,
        filename: Optional[str] = None,
    ) -> str:
        """Store raw source and return the hash key used for retrieval.

        Supports both old and new calling conventions:
        - store(source) - auto-compute hash
        - store(source, file_hash) - use provided hash
        - store(source, file_hash, filename) - also store filename

        Args:
            source: Raw source code content
            file_hash: Optional pre-computed hash (will compute if not provided)
            filename: Optional filename for debugging/logging

        Returns:
            Hash key used for storage and retrieval
        """
        digest = file_hash or self._hash_text(source)
        self._cache.setdefault(digest, source.splitlines())

        if filename:
            self._filenames[digest] = filename

        return digest

    def store_file(self, path: str) -> str:
        """Load a file from disk, cache it, and return its hash key."""
        source = Path(path).read_text(encoding="utf-8")
        filename = Path(path).name
        return self.store(source, filename=filename)

    def get_range(self, file_hash: str, start_line: int, end_line: int) -> str:
        """Return a slice of source code for the given line range (1-based, inclusive).

        Args:
            file_hash: Hash key from store()
            start_line: Start line (1-based)
            end_line: End line (1-based, inclusive)

        Returns:
            Joined lines as a single string

        Raises:
            KeyError: If file_hash not found in cache
        """
        lines = self._cache.get(file_hash)
        if lines is None:
            raise KeyError(f"Source not cached for hash: {file_hash}")

        # Convert to 0-based indexing and clamp to available lines
        start_idx = max(start_line - 1, 0)
        end_idx = min(end_line, len(lines))

        return "\n".join(lines[start_idx:end_idx])

    def get_filename(self, file_hash: str) -> Optional[str]:
        """Get the filename associated with a hash, if available."""
        return self._filenames.get(file_hash)

    def exists(self, file_hash: str) -> bool:
        """Check if a file hash exists in the cache."""
        return file_hash in self._cache

    def clear(self) -> None:
        """Clear all cached source code (useful for testing)."""
        self._cache.clear()
        self._filenames.clear()

    def _hash_text(self, text: str) -> str:
        """Compute SHA-256 hash of text."""
        return hashlib.sha256(text.encode("utf-8")).hexdigest()
