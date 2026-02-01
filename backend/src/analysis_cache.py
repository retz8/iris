"""
Two-tier caching system for IRIS analysis results.

Implements hybrid memory (LRU) + disk cache with content-addressable storage.
"""

import hashlib
import json
import logging
from collections import OrderedDict
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


def compute_file_hash(content: str) -> str:
    """
    Compute SHA-256 hash of file content for cache key generation.

    Args:
        content: File content as string

    Returns:
        Hexadecimal hash string (64 characters)
    """
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


@dataclass
class AnalysisResult:
    """
    Type-safe wrapper for analysis results.

    This ensures consistent structure for cached data.
    """

    file_intent: str
    responsibility_blocks: List[Dict[str, Any]]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "file_intent": self.file_intent,
            "responsibility_blocks": self.responsibility_blocks,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AnalysisResult":
        """Create AnalysisResult from dictionary."""
        return cls(
            file_intent=data["file_intent"],
            responsibility_blocks=data["responsibility_blocks"],
        )


class AnalysisCache:
    """
    Hybrid memory + disk cache for analysis results.

    Responsibilities:
    - Store analysis results with content-addressable keys (SHA-256)
    - Maintain LRU memory cache (max 500 entries)
    - Persist to disk for cross-session caching
    - Auto-cleanup entries older than 30 days
    - Track cache performance metrics

    Architecture:
    - Memory: OrderedDict for O(1) LRU access
    - Disk: JSON files named by content hash
    - TTL: 30 days for disk entries
    """

    def __init__(
        self,
        disk_cache_dir: Path,
        cache_monitor: Optional[Any] = None,
        max_memory_entries: int = 500,
        disk_ttl_days: int = 30,
    ):
        """
        Initialize analysis cache.

        Args:
            disk_cache_dir: Directory for disk cache storage
            cache_monitor: CacheMonitor instance for metrics tracking
            max_memory_entries: Maximum entries in memory cache (LRU eviction)
            disk_ttl_days: Days before disk cache entries expire
        """
        self.disk_cache_dir = Path(disk_cache_dir)
        self.cache_monitor = cache_monitor
        self.max_memory_entries = max_memory_entries
        self.disk_ttl_days = disk_ttl_days

        # Memory cache (LRU via OrderedDict)
        self._memory_cache: OrderedDict[str, AnalysisResult] = OrderedDict()

        # Ensure disk cache directory exists
        self.disk_cache_dir.mkdir(parents=True, exist_ok=True)

        # Cleanup old entries on initialization
        self._cleanup_old_entries()

        logger.info(
            f"AnalysisCache initialized (dir: {disk_cache_dir}, max_memory: {max_memory_entries}, ttl: {disk_ttl_days}d)"
        )

    async def get(
        self, file_hash: str, file_size_bytes: int = 0
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached analysis result.

        Checks memory cache first, then disk cache. Promotes disk hits to memory.

        Args:
            file_hash: SHA-256 hash of file content
            file_size_bytes: File size for metrics tracking

        Returns:
            Analysis result as dictionary, or None if not cached
        """
        # Check memory cache
        if file_hash in self._memory_cache:
            # Move to end (most recently used)
            result = self._memory_cache.pop(file_hash)
            self._memory_cache[file_hash] = result

            if self.cache_monitor:
                self.cache_monitor.record_local_cache_hit(file_size_bytes)

            logger.debug(f"Memory cache hit for {file_hash[:8]}...")
            return result.to_dict()

        # Check disk cache
        disk_result = self._read_from_disk(file_hash)
        if disk_result is not None:
            # Promote to memory cache
            self._add_to_memory(file_hash, disk_result)

            if self.cache_monitor:
                self.cache_monitor.record_local_cache_hit(file_size_bytes)

            logger.debug(f"Disk cache hit for {file_hash[:8]}... (promoted to memory)")
            return disk_result.to_dict()

        # Cache miss
        if self.cache_monitor:
            self.cache_monitor.record_local_cache_miss(file_size_bytes)

        logger.debug(f"Cache miss for {file_hash[:8]}...")
        return None

    async def set(self, file_hash: str, result: AnalysisResult) -> None:
        """
        Store analysis result in cache.

        Stores in both memory and disk caches.

        Args:
            file_hash: SHA-256 hash of file content
            result: Analysis result to cache
        """
        # Store in memory cache
        self._add_to_memory(file_hash, result)

        # Store in disk cache
        self._write_to_disk(file_hash, result)

        logger.debug(f"Cached analysis for {file_hash[:8]}...")

    def _add_to_memory(self, file_hash: str, result: AnalysisResult) -> None:
        """Add result to memory cache with LRU eviction."""
        # Remove if already exists (to update position)
        if file_hash in self._memory_cache:
            self._memory_cache.pop(file_hash)

        # Add to end (most recently used)
        self._memory_cache[file_hash] = result

        # Evict oldest if over limit
        if len(self._memory_cache) > self.max_memory_entries:
            oldest_key = next(iter(self._memory_cache))
            self._memory_cache.pop(oldest_key)
            logger.debug(f"Evicted {oldest_key[:8]}... from memory cache (LRU)")

    def _read_from_disk(self, file_hash: str) -> Optional[AnalysisResult]:
        """Read cached result from disk."""
        cache_file = self._get_cache_file_path(file_hash)

        if not cache_file.exists():
            return None

        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Check if entry has expired
            analyzed_at = data.get("analyzed_at", 0)
            age_days = (datetime.now().timestamp() - analyzed_at) / 86400

            if age_days > self.disk_ttl_days:
                logger.debug(
                    f"Cache entry {file_hash[:8]}... expired ({age_days:.1f} days old)"
                )
                cache_file.unlink()  # Delete expired entry
                return None

            return AnalysisResult.from_dict(data)

        except Exception as e:
            logger.error(f"Failed to read cache file {cache_file}: {e}")
            # Delete corrupted cache file
            try:
                cache_file.unlink()
            except Exception:
                pass
            return None

    def _write_to_disk(self, file_hash: str, result: AnalysisResult) -> None:
        """Write result to disk cache."""
        cache_file = self._get_cache_file_path(file_hash)

        try:
            data = result.to_dict()
            data["analyzed_at"] = datetime.now().timestamp()

            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            logger.error(f"Failed to write cache file {cache_file}: {e}")

    def _get_cache_file_path(self, file_hash: str) -> Path:
        """Get path to cache file for given hash."""
        return self.disk_cache_dir / f"{file_hash}.json"

    def _cleanup_old_entries(self) -> None:
        """Remove cache entries older than TTL."""
        if not self.disk_cache_dir.exists():
            return

        cutoff_time = datetime.now() - timedelta(days=self.disk_ttl_days)
        cutoff_timestamp = cutoff_time.timestamp()

        removed_count = 0

        for cache_file in self.disk_cache_dir.glob("*.json"):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)

                analyzed_at = data.get("analyzed_at", 0)

                if analyzed_at < cutoff_timestamp:
                    cache_file.unlink()
                    removed_count += 1

            except Exception as e:
                logger.error(f"Failed to check cache file {cache_file}: {e}")

        if removed_count > 0:
            logger.info(f"Cleaned up {removed_count} expired cache entries")

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with memory and disk cache stats
        """
        disk_entries = (
            len(list(self.disk_cache_dir.glob("*.json")))
            if self.disk_cache_dir.exists()
            else 0
        )

        return {
            "memory_entries": len(self._memory_cache),
            "memory_max": self.max_memory_entries,
            "disk_entries": disk_entries,
            "disk_ttl_days": self.disk_ttl_days,
        }

    def clear(self) -> None:
        """Clear both memory and disk caches."""
        # Clear memory
        self._memory_cache.clear()

        # Clear disk
        if self.disk_cache_dir.exists():
            for cache_file in self.disk_cache_dir.glob("*.json"):
                try:
                    cache_file.unlink()
                except Exception as e:
                    logger.error(f"Failed to delete cache file {cache_file}: {e}")

        logger.info("Cache cleared")
