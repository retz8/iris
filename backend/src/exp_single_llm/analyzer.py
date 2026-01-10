"""
LLM Service for Single LLM Experiment (Exp-1)

This module handles interaction with OpenAI API for analyzing source code.
"""

import json
import os
from typing import List, Optional
from openai import OpenAI

from .models import FileIntent, Responsibility, AnalysisResult
from .prompt import build_analysis_prompt, build_system_message


class SingleLLMAnalyzer:
    """Handles LLM-based analysis of source code."""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the LLM analyzer.

        Args:
            api_key: OpenAI API key. If not provided, uses OPENAI_API_KEY env var.
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "OpenAI API key not found. Set OPENAI_API_KEY environment variable."
            )

        self.client = OpenAI(api_key=self.api_key)
        self.model = "gpt-4o-mini"  # Using mini for cost efficiency in MVP

    def analyze(self, lines: List[str], filename: str, language: str) -> AnalysisResult:
        """
        Analyze source code to extract File Intent and Responsibility Map.

        Args:
            lines: Source code as a list of lines (strings or line objects)
            filename: Name of the file
            language: Programming language

        Returns:
            AnalysisResult object with extracted intent and responsibilities
        """
        try:
            # Normalize lines: extract text content if lines are objects
            normalized_lines = []
            for line in lines:
                if isinstance(line, dict):
                    # If line is a dict, try to extract text content
                    normalized_lines.append(line.get("text", ""))
                else:
                    # If line is already a string, use it as is
                    normalized_lines.append(str(line))

            # Build the prompt
            user_prompt = build_analysis_prompt(normalized_lines, filename, language)
            system_message = build_system_message()

            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,  # Lower temperature for more consistent output
                max_tokens=2000,
            )

            # Log token usage
            if response.usage:
                print(f"[TOKEN USAGE] File: {filename}")
                print(f"  Prompt tokens: {response.usage.prompt_tokens}")
                print(f"  Completion tokens: {response.usage.completion_tokens}")
                print(f"  Total tokens: {response.usage.total_tokens}")
                print(f"  Model: {self.model}")

            # Extract and parse the response
            response_text = response.choices[0].message.content
            if response_text is None:
                raise ValueError("LLM returned empty response")
            response_text = response_text.strip()

            # Handle markdown code blocks if present
            if response_text.startswith("```"):
                # Extract JSON from markdown code block
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                response_text = response_text[start:end]

            # Parse JSON response
            data = json.loads(response_text)

            # Build FileIntent
            file_intent = FileIntent(text=data["file_intent"]["text"])

            # Build Responsibilities
            responsibilities = []
            for resp_data in data.get("responsibilities", []):
                responsibility = Responsibility(
                    id=resp_data["id"],
                    label=resp_data["label"],
                    description=resp_data["description"],
                    ranges=resp_data.get("ranges", []),
                )
                responsibilities.append(responsibility)

            # Return successful result
            return AnalysisResult(
                success=True,
                file_intent=file_intent,
                responsibilities=responsibilities,
                filename=filename,
                language=language,
            )

        except json.JSONDecodeError as e:
            return AnalysisResult(
                success=False,
                filename=filename,
                language=language,
                error=f"Failed to parse LLM response as JSON: {str(e)}",
            )
        except KeyError as e:
            return AnalysisResult(
                success=False,
                filename=filename,
                language=language,
                error=f"Missing expected field in LLM response: {str(e)}",
            )
        except Exception as e:
            return AnalysisResult(
                success=False,
                filename=filename,
                language=language,
                error=f"Analysis failed: {str(e)}",
            )
