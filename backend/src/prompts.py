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
1. Identify the major conceptual responsibilities within the file
2. Synthesize why this file exists (file intent) based on those responsibilities
</task_definition>

<input_description>
You will receive exactly three inputs:
- filename
- language
- source_code

Source code with line numbers prefixed to each line in the format "LINE_NUMBER|CODE".
Example:
  195|function abc() {
  196|  // code here
  197|}

</input_description>

<line_number_assumption>
Line numbers refer to the physical line count of the provided source_code text.
The first line of source_code is line 1.
Do not invent or extrapolate line numbers beyond the provided input.
</line_number_assumption>

<output_contract>
The output is not an explanation.
It is a compact structural summary used directly by UI.

Think of it like a book:
- File Intent = The book's title
- Responsibility Blocks = The table of contents

When someone picks up a book, they read the title first, then scan the table of contents
to understand what the book covers without reading every page.

Similarly, when a developer opens an unfamiliar file, they will see your File Intent,
then scan your Responsibility Block labels to understand what the file does
without reading every line of code.

Your job is to provide that "title" and "table of contents" so developers can skim
the file structure and decide where to look deeper.

The output must:
- Be concise and stable
- Use domain-appropriate terminology
- Avoid redundancy
- Enable quick comprehension without reading the full source
</output_contract>

<analysis_workflow>
Phase 1: SCAN AND CLUSTER
- Read through the source code
- Identify natural groupings of related functions, variables, types, and constants
- Look for code that would need to move together if extracted to a separate file

Phase 2: FORM RESPONSIBILITY BLOCKS
- For each cluster, create a responsibility block
- Determine what capability this cluster provides
- Write a clear label that captures the essence
- Label should be specific enough to distinguish from other blocks, not generic or vague
- Note which lines of code belong to this block
- Each block may contains scattered ranges if needed
- Different blocks may overlap in line ranges if necessary
- No need to cover every lines of code, focus on major responsibilities

Phase 3: SYNTHESIZE FILE INTENT
- Review all your responsibility blocks
- Ask: What do these blocks collectively achieve?
- Ask: What makes this file different from other files?
- Ask: If I tweeted about this file's purpose, what would I say?
- Write the file intent based on what the blocks actually do
- Keep it high-level and focused on purpose, not implementation details
- Keep it as concise as possible in one sentence, think it as a book title
- Ideally less than 10 words, but if needed, go up to 20 words

Phase 4: ORDER RESPONSIBILITY BLOCKS FOR COMPREHENSION

IMPORTANT: Reorder the blocks for fastest comprehension, NOT source code line order.

Ask yourself:
1. Which block explains the file's main purpose? → Put that FIRST
2. Which blocks are supporting details? → Put those LAST
3. Which blocks would a developer want to see first when skimming?

Common pattern for application code:
1. Initialization/entry point
2. Main domain logic
3. Helper utilities
4. Infrastructure/imports

Reorder your blocks now before outputting.
</analysis_workflow>
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
    # Add line numbers to each line
    numbered_lines = []
    for i, line in enumerate(source_code.splitlines(), start=1):
        numbered_lines.append(f"{i:4d}|{line}")
    numbered_source = "\n".join(numbered_lines)

    # Then format input
    input_text = (
        "<input>\n"
        f"<filename>{filename}</filename>\n"
        f"<language>{language}</language>\n"
        "<source_code>\n"
        f"{numbered_source}\n"
        "</source_code>\n"
        "</input>"
    )

    return input_text


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
