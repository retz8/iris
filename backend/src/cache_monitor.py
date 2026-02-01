"""
Cache performance monitoring and metrics tracking for IRIS.

Tracks both OpenAI API usage (including automatic prompt caching) and local cache performance.
"""

import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class OpenAICacheMetrics:
    """Metrics from a single OpenAI API call."""

    timestamp: float
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cached_input_tokens: int = 0  # OpenAI's automatic prompt caching


@dataclass
class LocalCacheMetrics:
    """Metrics for a single local cache access."""

    timestamp: float
    operation: str  # 'hit' or 'miss'
    file_size_bytes: int


class CacheMonitor:
    """
    Monitors and tracks cache performance metrics.

    Responsibilities:
    - Record OpenAI API usage and automatic caching metrics
    - Record local cache hit/miss events
    - Calculate cost estimates and savings
    - Persist metrics to disk
    - Provide performance statistics
    """

    # OpenAI pricing (as of 2026-02-01)
    PROMPT_TOKEN_COST = 0.15 / 1_000_000  # $0.15 per 1M tokens
    COMPLETION_TOKEN_COST = 0.60 / 1_000_000  # $0.60 per 1M tokens
    CACHED_TOKEN_COST = 0.075 / 1_000_000  # $0.075 per 1M cached tokens (50% discount)

    def __init__(self, storage_path: Optional[Path] = None):
        """
        Initialize cache monitor.

        Args:
            storage_path: Path to store persistent metrics (JSON file)
        """
        self.storage_path = storage_path
        self.session_start = datetime.now().timestamp()

        # In-memory metrics for current session
        self.openai_metrics: List[OpenAICacheMetrics] = []
        self.local_metrics: List[LocalCacheMetrics] = []

        # Load existing metrics if available
        if storage_path and storage_path.exists():
            self._load_metrics()

        logger.info(f"CacheMonitor initialized (storage: {storage_path})")

    def record_openai_usage(self, usage: Any) -> None:
        """
        Record OpenAI API usage metrics.

        Args:
            usage: OpenAI usage object from API response
        """
        metric = OpenAICacheMetrics(
            timestamp=datetime.now().timestamp(),
            prompt_tokens=getattr(usage, "prompt_tokens", 0),
            completion_tokens=getattr(usage, "completion_tokens", 0),
            total_tokens=getattr(usage, "total_tokens", 0),
            cached_input_tokens=(
                getattr(usage, "prompt_tokens_details", {}).get("cached_tokens", 0)
                if hasattr(usage, "prompt_tokens_details")
                else 0
            ),
        )
        self.openai_metrics.append(metric)

        # Log if prompt caching occurred
        if metric.cached_input_tokens > 0:
            cache_rate = (
                (metric.cached_input_tokens / metric.prompt_tokens * 100)
                if metric.prompt_tokens > 0
                else 0
            )
            logger.debug(
                f"OpenAI cache hit: {metric.cached_input_tokens} tokens ({cache_rate:.1f}%)"
            )

        self._save_metrics()

    def record_local_cache_hit(self, file_size_bytes: int) -> None:
        """Record a local cache hit."""
        metric = LocalCacheMetrics(
            timestamp=datetime.now().timestamp(),
            operation="hit",
            file_size_bytes=file_size_bytes,
        )
        self.local_metrics.append(metric)
        logger.debug(f"Local cache hit ({file_size_bytes} bytes)")
        self._save_metrics()

    def record_local_cache_miss(self, file_size_bytes: int) -> None:
        """Record a local cache miss."""
        metric = LocalCacheMetrics(
            timestamp=datetime.now().timestamp(),
            operation="miss",
            file_size_bytes=file_size_bytes,
        )
        self.local_metrics.append(metric)
        logger.debug(f"Local cache miss ({file_size_bytes} bytes)")
        self._save_metrics()

    def get_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive cache statistics.

        Returns:
            Dictionary with OpenAI and local cache statistics
        """
        stats = {
            "session_start": self.session_start,
            "openai": self._get_openai_stats(),
            "local_cache": self._get_local_cache_stats(),
            "cost_estimate": self.get_cost_estimate(),
        }
        return stats

    def _get_openai_stats(self) -> Dict[str, Any]:
        """Calculate OpenAI API usage statistics."""
        if not self.openai_metrics:
            return {
                "total_calls": 0,
                "total_prompt_tokens": 0,
                "total_completion_tokens": 0,
                "total_cached_tokens": 0,
                "cache_hit_rate": 0.0,
            }

        total_prompt_tokens = sum(m.prompt_tokens for m in self.openai_metrics)
        total_completion_tokens = sum(m.completion_tokens for m in self.openai_metrics)
        total_cached_tokens = sum(m.cached_input_tokens for m in self.openai_metrics)

        cache_hit_rate = (
            (total_cached_tokens / total_prompt_tokens * 100)
            if total_prompt_tokens > 0
            else 0.0
        )

        return {
            "total_calls": len(self.openai_metrics),
            "total_prompt_tokens": total_prompt_tokens,
            "total_completion_tokens": total_completion_tokens,
            "total_cached_tokens": total_cached_tokens,
            "cache_hit_rate": round(cache_hit_rate, 2),
        }

    def _get_local_cache_stats(self) -> Dict[str, Any]:
        """Calculate local cache statistics."""
        if not self.local_metrics:
            return {"total_accesses": 0, "hits": 0, "misses": 0, "hit_rate": 0.0}

        hits = sum(1 for m in self.local_metrics if m.operation == "hit")
        misses = sum(1 for m in self.local_metrics if m.operation == "miss")
        total = len(self.local_metrics)

        hit_rate = (hits / total * 100) if total > 0 else 0.0

        return {
            "total_accesses": total,
            "hits": hits,
            "misses": misses,
            "hit_rate": round(hit_rate, 2),
        }

    def get_cost_estimate(self) -> Dict[str, Any]:
        """
        Calculate cost estimates based on usage.

        Returns:
            Dictionary with actual cost, potential cost without caching, and savings
        """
        if not self.openai_metrics:
            return {
                "actual_cost": 0.0,
                "cost_without_caching": 0.0,
                "savings": 0.0,
                "currency": "USD",
            }

        actual_cost = 0.0
        cost_without_caching = 0.0

        for metric in self.openai_metrics:
            # Actual cost (with cached token discount)
            uncached_prompt_tokens = metric.prompt_tokens - metric.cached_input_tokens
            actual_cost += (
                uncached_prompt_tokens * self.PROMPT_TOKEN_COST
                + metric.cached_input_tokens * self.CACHED_TOKEN_COST
                + metric.completion_tokens * self.COMPLETION_TOKEN_COST
            )

            # Cost without any caching
            cost_without_caching += (
                metric.prompt_tokens * self.PROMPT_TOKEN_COST
                + metric.completion_tokens * self.COMPLETION_TOKEN_COST
            )

        savings = cost_without_caching - actual_cost

        return {
            "actual_cost": round(actual_cost, 6),
            "cost_without_caching": round(cost_without_caching, 6),
            "savings": round(savings, 6),
            "savings_percentage": round(
                (
                    (savings / cost_without_caching * 100)
                    if cost_without_caching > 0
                    else 0.0
                ),
                2,
            ),
            "currency": "USD",
        }

    def print_stats(self) -> None:
        """Print formatted cache statistics to console."""
        stats = self.get_stats()

        print("\n" + "=" * 60)
        print("IRIS CACHE PERFORMANCE STATISTICS")
        print("=" * 60)

        # Local cache stats
        local = stats["local_cache"]
        print(f"\nLocal Cache:")
        print(f"  Total accesses: {local['total_accesses']}")
        print(f"  Hits: {local['hits']}")
        print(f"  Misses: {local['misses']}")
        print(f"  Hit rate: {local['hit_rate']}%")

        # OpenAI stats
        openai = stats["openai"]
        print(f"\nOpenAI API Usage:")
        print(f"  Total calls: {openai['total_calls']}")
        print(f"  Prompt tokens: {openai['total_prompt_tokens']:,}")
        print(f"  Cached tokens: {openai['total_cached_tokens']:,}")
        print(f"  Completion tokens: {openai['total_completion_tokens']:,}")
        print(f"  Cache hit rate: {openai['cache_hit_rate']}%")

        # Cost estimate
        cost = stats["cost_estimate"]
        print(f"\nCost Estimate ({cost['currency']}):")
        print(f"  Actual cost: ${cost['actual_cost']:.6f}")
        print(f"  Cost without caching: ${cost['cost_without_caching']:.6f}")
        print(f"  Savings: ${cost['savings']:.6f} ({cost['savings_percentage']}%)")

        print("=" * 60 + "\n")

    def _save_metrics(self) -> None:
        """Persist metrics to disk."""
        if not self.storage_path:
            return

        try:
            # Ensure directory exists
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)

            data = {
                "session_start": self.session_start,
                "last_updated": datetime.now().timestamp(),
                "openai_metrics": [asdict(m) for m in self.openai_metrics],
                "local_metrics": [asdict(m) for m in self.local_metrics],
            }

            with open(self.storage_path, "w") as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            logger.error(f"Failed to save metrics: {e}")

    def _load_metrics(self) -> None:
        """Load metrics from disk."""
        if not self.storage_path or not self.storage_path.exists():
            return

        try:
            with open(self.storage_path, "r") as f:
                data = json.load(f)

            self.session_start = data.get("session_start", self.session_start)

            # Load OpenAI metrics
            self.openai_metrics = [
                OpenAICacheMetrics(**m) for m in data.get("openai_metrics", [])
            ]

            # Load local cache metrics
            self.local_metrics = [
                LocalCacheMetrics(**m) for m in data.get("local_metrics", [])
            ]

            logger.info(
                f"Loaded {len(self.openai_metrics)} OpenAI metrics and {len(self.local_metrics)} local cache metrics"
            )

        except Exception as e:
            logger.error(f"Failed to load metrics: {e}")
