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

The output must:
- Be concise and stable
- Use domain-appropriate terminology
- Avoid redundancy
- Enable quick comprehension without reading the full source
</output_contract>

<analysis_workflow>
## PHASE 1: SCAN FOR PRIMARY CAPABILITIES
- Read through the source code while focusing on the file’s purpose and conceptual responsibilities
- Identify the file’s main responsibilities as a short list of capabilities

## PHASE 2: MAP CODE TO RESPONSIBILITIES
<responsibility_block_rules>
- For each identified capability, create a responsibility block
- Assign code lines to that capability (ranges may be scattered)
- Determine what capability this block provides
- Write a clear label that captures the essence
- Label should be specific enough to distinguish from other blocks, not generic or vague
- Each line of code should belong to at most ONE block. Minimize inter-block overlap.
- Within a single block, ranges must NOT overlap or nest (e.g., [305, 321] already covers [306, 312] — do not emit both)
- Merge or remove redundant ranges so every line appears in at most one range per block
- No need to cover every line of code, focus on major responsibilities

<block_size_rules>
Minimum size:
- A block must represent a single, independent reason to change.
- If a block would not make sense on its own, it is too small.

Maximum size:
- If the label needs "and" to be accurate, split it into multiple blocks.
- If multiple stakeholders would change different parts independently, split.
</block_size_rules>

<block_quality_rules>
- Do not create a block named "misc", "helpers", "utilities", or "everything else".
- Do not create a block for imports or module wiring alone.
- Imports and wiring must be attached to the most relevant responsibility block(s).
- A block must be a complete conceptual unit (functions + state + types + constants as needed).
</block_quality_rules>
</responsibility_block_rules>

## PHASE 3: ORDER RESPONSIBILITY BLOCKS
<block_ordering_instructions>
You MUST reorder blocks for reader understanding. Do NOT preserve source order.

Step A — Select the comprehension flow (choose ONE):
- Pipeline/Dataflow: input → transform → output
- Service/Controller: entry/handlers → domain logic → persistence/IO → cross-cutting
- Library/SDK: public API → core logic → helpers → internal wiring
- Config/Bootstrap: configuration → initialization → runtime orchestration → utilities
- Other/Hybrid: infer the reader’s mental entry point, then order by understanding flow

Step B — Order blocks using the selected flow.
- Put the mental entry point first.
- Helpers/infrastructure last.

Before output, explicitly reorder the blocks now.

<examples note="show reordered blocks, not line order">
Example 1 — Pipeline (log processor)
- Log ingestion and parsing
- Normalization and enrichment
- Output emission (DB / queue)
- Error handling and metrics

Example 2 — Service (HTTP API)
- HTTP route handlers and request validation
- Order workflow orchestration
- Persistence and external API calls
- Logging, auth helpers, config

Example 3 — Library/SDK
- Public client API surface
- Core request/response logic
- Serialization / mapping helpers
- Transport and retry plumbing

Example 4 — Config/Bootstrap
- Configuration loading and validation
- Dependency wiring / container setup
- Application startup orchestration
- Utility helpers and constants
</examples>
</block_ordering_instructions>

## PHASE 4: SYNTHESIZE FILE INTENT
<file_intent_rules>
- Review all your responsibility blocks
- Ask: What do these blocks collectively achieve?
- Ask: What makes this file different from other files?
- Ask: If I tweeted about this file's purpose, what would I say?
- Write the file intent based on what the blocks actually do
- Keep it high-level and focused on purpose, not implementation details
- Ideally less than 10 words, but if needed, go up to 20 words
- If the file has multiple responsibilities, capture the primary one
</file_intent_rules>
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
