"""IRIS agent orchestrator for File Intent + Responsibility Blocks extraction.

Current architecture: Single-shot inference with full source code.
No multi-stage orchestration, no tool-calling, no complex branching.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from openai import OpenAI

# Single-shot inference imports
from config import (
    SINGLE_SHOT_MODEL,
    SINGLE_SHOT_REASONING_EFFORT,
    CACHE_DIR,
    CACHE_MAX_MEMORY_ENTRIES,
    CACHE_DISK_TTL_DAYS,
    CACHE_METRICS_PATH,
)
from prompts import (
    SINGLE_SHOT_SYSTEM_PROMPT,
    build_single_shot_user_prompt,
    LLMOutputSchema,
)
from cache_monitor import CacheMonitor
from analysis_cache import AnalysisCache, compute_file_hash, AnalysisResult

logger = logging.getLogger(__name__)


class IrisError(Exception):
    """Custom exception for IRIS agent errors."""

    # will be implemented later
    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code

    def get_status_code(self) -> int:
        return self.status_code


class IrisAgent:
    """Single-shot inference agent for File Intent + Responsibility Blocks extraction.

    Uses a streamlined single-LLM-call approach with full source code for fast,
    reliable analysis without complex branching or multi-stage orchestration.
    """

    def __init__(self, model: str = "gpt-4o-mini", api_key: str | None = None):
        self.client = OpenAI(api_key=api_key)
        self.model = model

        # Initialize caching system with error handling
        # Cache failures should not prevent agent from functioning
        try:
            self.cache_monitor = CacheMonitor(storage_path=CACHE_METRICS_PATH)
            self.analysis_cache = AnalysisCache(
                disk_cache_dir=CACHE_DIR,
                cache_monitor=self.cache_monitor,
                max_memory_entries=CACHE_MAX_MEMORY_ENTRIES,
                disk_ttl_days=CACHE_DISK_TTL_DAYS,
            )
            logger.info("IrisAgent initialized with caching system")
        except Exception as e:
            logger.error(
                f"Failed to initialize cache system: {e}. Continuing without cache."
            )
            self.cache_monitor = None
            self.analysis_cache = None

    async def analyze(
        self,
        filename: str,
        language: str,
        source_code: str,
    ) -> Dict[str, Any] | IrisError:
        """Analyze a file using single-shot LLM inference with caching.

        This method uses a streamlined single-LLM-call approach with full source code,
        eliminating complex branching logic, multi-stage orchestration, and tool-calling
        overhead. The entire analysis completes in one API call with structured output.

        Caching: Checks local cache first (content-addressed). On cache hit, returns
        instantly (~1ms). On cache miss, calls LLM and stores result.

        Architecture:
        - Check cache by content hash (SHA-256)
        - Direct LLM inference with full source code (on cache miss)
        - Structured output parsing via OpenAI responses API
        - No intermediate stages, no tool-calling, no decision trees
        - Optimized for speed and reliability over complex reasoning

        Args:
            filename: Name of the file being analyzed.
            language: Programming language identifier (e.g., 'python', 'javascript').
            source_code: Complete source code content of the file.

        Returns:
            Dictionary with 'file_intent', 'responsibility_blocks', and 'metadata' keys.

        Raises:
            IrisError: On LLM API failures or invalid responses.
        """
        # Compute content hash for cache lookup
        file_hash = compute_file_hash(source_code)
        file_size = len(source_code.encode())

        # Check cache first (with error handling for graceful degradation)
        if self.analysis_cache:
            try:
                cached_result = await self.analysis_cache.get(file_hash, file_size)
                if cached_result is not None:
                    logger.info(f"Cache hit for {filename}")
                    return cached_result
            except Exception as e:
                logger.warning(
                    f"Cache lookup failed for {filename}: {e}. Proceeding with LLM analysis."
                )

        # Cache miss or cache unavailable - proceed with LLM analysis
        logger.debug(f"Cache miss for {filename} - calling LLM")
        logger.info(f"Analyzing {filename} with single-shot inference...")
        return await self._analyze_with_llm(filename, language, source_code, file_hash)

    async def _analyze_with_llm(
        self,
        filename: str,
        language: str,
        source_code: str,
        file_hash: str | None = None,
    ) -> Dict[str, Any]:
        """Execute single-shot LLM inference with structured output parsing.

        Args:
            filename: Name of the file being analyzed.
            language: Programming language identifier.
            source_code: Full source code content.
            file_hash: SHA-256 hash of source_code (computed if not provided).

        Returns:
            Dict with file_intent, responsibility_blocks, and metadata.

        Raises:
            Exception: On LLM API failures or parsing errors.
        """
        try:
            user_prompt = build_single_shot_user_prompt(
                filename,
                language,
                source_code,
            )
            response = self.client.responses.parse(
                model=SINGLE_SHOT_MODEL,
                input=[
                    {
                        "role": "developer",
                        "content": SINGLE_SHOT_SYSTEM_PROMPT,
                    },
                    {"role": "user", "content": user_prompt},
                ],
                text_format=LLMOutputSchema,
                reasoning={"effort": SINGLE_SHOT_REASONING_EFFORT},
            )

            # Record OpenAI usage metrics (including automatic prompt caching)
            if response.usage:
                if self.cache_monitor:
                    try:
                        self.cache_monitor.record_openai_usage(response.usage)
                    except Exception as e:
                        logger.warning(f"Failed to record OpenAI usage metrics: {e}")

                cached_tokens = getattr(response.usage, "cached_input_tokens", 0)
                logger.debug(
                    f"LLM response: {response.usage.input_tokens} input tokens, "
                    f"{response.usage.output_tokens} output tokens, "
                    f"{cached_tokens} cached tokens"
                )

            content = response.output_parsed
            if content is None:
                raise ValueError("LLM returned empty response")

            # Cache the result for future use (with error handling)
            if self.analysis_cache:
                try:
                    if file_hash is None:
                        file_hash = compute_file_hash(source_code)

                    result_obj = AnalysisResult(
                        file_intent=content.file_intent,
                        responsibility_blocks=content.responsibility_blocks,
                    )
                    await self.analysis_cache.set(file_hash, result_obj)
                except Exception as e:
                    logger.warning(f"Failed to cache analysis result: {e}")
                    # Continue - cache failure should not prevent returning the result

            return content.model_dump()

        except Exception as e:
            logger.error(f"LLM inference failed: {e}")
            raise

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get combined cache performance statistics.

        Returns:
            Dictionary with cache performance metrics including:
            - OpenAI API usage and automatic caching stats
            - Local cache hit/miss rates
            - Cost estimates and savings
            - Cache size and performance metrics

            Returns empty/error status if cache system is not initialized.
        """
        if not self.cache_monitor or not self.analysis_cache:
            return {
                "error": "Cache system not initialized",
                "cache_monitor": None,
                "analysis_cache": None,
            }

        try:
            monitor_stats = self.cache_monitor.get_stats()
            cache_stats = self.analysis_cache.get_cache_stats()

            return {
                "cache_monitor": monitor_stats,
                "analysis_cache": cache_stats,
            }
        except Exception as e:
            logger.error(f"Failed to retrieve cache stats: {e}")
            return {
                "error": str(e),
                "cache_monitor": None,
                "analysis_cache": None,
            }
