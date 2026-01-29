# source code only input experiment
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


EXPERIMENT_DEVELOPER_PROMPT = """
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


def build_experiment_user_prompt(
    filename: str,
    language: str,
    source_code: str,
) -> str:
    """Builds the user prompt for the source code only input experiment.

    Returns:
        The constructed user prompt string.
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
    """Schema for LLM output in the experiment.

    Attributes:
        file_intent: Final agreed-upon file intent
        responsibility_blocks: Final agreed-upon responsibilities
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
