"""Prompt templates for IRIS single-shot inference system.

This module contains the prompts and schemas for the single-shot LLM inference
approach, which directly analyzes source code to extract file intent and
responsibility blocks in a single API call.

Architecture:
- Single LLM API call with structured output parsing
- Direct source code analysis (no intermediate steps)
- Fast, deterministic results using gpt-5-nano model
- Optimized for files of any size
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


SINGLE_SHOT_SYSTEM_PROMPT = """
<system_role>
You are an expert software engineer analyzing unfamiliar source code
to help another developer understand it quickly.
</system_role>

<task_definition>
Given a single source code file, you must:
1. Identify why this file exists (file intent)
2. Identify the major conceptual responsibilities within the file
</task_definition>

<input_description>
You will receive exactly three inputs:
- filename
- language
- source_code

The source_code is raw and unmodified.
Assume it is the complete file.
</input_description>

<line_number_assumption>
Line numbers refer to the physical line count of the provided source_code text.
The first line of source_code is line 1.
Do not invent or extrapolate line numbers beyond the provided input.
</line_number_assumption>

<output_contract>
The output is not an explanation.
It is a compact structural summary used directly by UI.

The output must:
- Be concise and stable
- Use domain-appropriate terminology
- Avoid redundancy
</output_contract>

<responsibility_block_guidelines>
Each responsibility block represents:
- One cohesive reason for change
- One conceptual responsibility, not a function or class

Blocks may:
- Span non-contiguous line ranges
- Overlap minimally only if conceptually unavoidable

<block_field_constraints>
- label: 2–5 words, domain-specific
- description: exactly one sentence
- ranges: one or more [start, end] pairs
</block_field_constraints>
</responsibility_block_guidelines>

<output_format>
Return ONLY a JSON object that strictly matches the provided schema.
Do not include explanations, comments, or additional fields.
</output_format>

<reasoning_constraints>
Do not explain your thinking.
Produce the final result directly.
</reasoning_constraints>


"""


def build_single_shot_user_prompt(
    filename: str,
    language: str,
    source_code: str,
) -> str:
    """Builds the user prompt for single-shot inference.

    Args:
        filename: Name of the file being analyzed.
        language: Programming language (e.g., Python, JavaScript, TypeScript).
        source_code: Complete source code content.

    Returns:
        Formatted user prompt string with structured input tags.
    """
    return (
        "<input>\n"
        f"<filename>{filename}</filename>\n"
        f"<language>{language}</language>\n"
        "<source_code>\n"
        f"{source_code}\n"
        "</source_code>\n"
        "</input>"
    )


class ResponsibilityBlock(BaseModel):
    label: str
    description: str
    ranges: List[List[int]] = Field(
        description="List of [start, end] line number pairs."
    )


class LLMOutputSchema(BaseModel):
    """Schema for LLM structured output in single-shot inference.

    Attributes:
        file_intent: High-level description of file's purpose and role.
        responsibility_blocks: List of major conceptual responsibilities.
    """

    file_intent: str
    responsibility_blocks: List[ResponsibilityBlock]


LLM_OUTPUT_SCHEMA: Dict[str, Any] = {
    "file_intent": {"type": "string"},
    "responsibility_blocks": {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "label": {"type": "string"},
                "description": {"type": "string"},
                "ranges": {
                    "type": "array",
                    "items": {
                        "type": "array",
                        "items": {"type": "integer"},
                    },
                },
            },
            "required": ["label", "description", "ranges"],
            "additionalProperties": False,
        },
    },
}
