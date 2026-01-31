"""IRIS agent orchestrator for File Intent + Responsibility Blocks extraction.

Current architecture: Single-shot inference with full source code.
No multi-stage orchestration, no tool-calling, no complex branching.
"""

from __future__ import annotations

from typing import Any, Dict

from openai import OpenAI

# Single-shot inference imports
from config import SINGLE_SHOT_MODEL, SINGLE_SHOT_REASONING_EFFORT
from prompts import (
    SINGLE_SHOT_SYSTEM_PROMPT,
    build_single_shot_user_prompt,
    LLMOutputSchema,
)


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

    def analyze(
        self,
        filename: str,
        language: str,
        source_code: str,
    ) -> Dict[str, Any] | IrisError:
        """Analyze a file using single-shot LLM inference.

        This method uses a streamlined single-LLM-call approach with full source code,
        eliminating complex branching logic, multi-stage orchestration, and tool-calling
        overhead. The entire analysis completes in one API call with structured output.

        Architecture:
        - Direct LLM inference with full source code
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
        print(f"[IRIS] Analyzing {filename} with single-shot inference...")
        return self._analyze_with_llm(filename, language, source_code)

    def _analyze_with_llm(
        self,
        filename: str,
        language: str,
        source_code: str,
    ) -> Dict[str, Any]:
        """Execute single-shot LLM inference with structured output parsing.

        Args:
            filename: Name of the file being analyzed.
            language: Programming language identifier.
            source_code: Full source code content.

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

            # debugging token usage (will moved to debugger later)
            if response.usage:
                print(
                    f"[IRIS] LLM response received. "
                    f"Input tokens: {response.usage.input_tokens}, "
                    f"Output tokens: {response.usage.output_tokens}, "
                )

            content = response.output_parsed
            if content is None:
                raise ValueError("LLM returned empty response")

            return content.model_dump()

        except Exception as e:
            print(f"[ERROR] LLM inference failed: {e}")
            raise
