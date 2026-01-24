"""OpenAI tool definitions for IRIS agent."""

from openai.types.responses import ToolParam

REFER_TO_SOURCE_CODE_TOOL: ToolParam = {
    "type": "function",
    "name": "refer_to_source_code",
    "description":
        """
        Use this tool ONLY when you cannot determine an entity's purpose from its name, docstring, or comments alone.
        
        DO NOT use for:
        - Self-explanatory names
        - Entities with clear docstrings/leading comments  
        - Can infer purpose but merely need confirmation from implementation details

        ONLY use when following ALL conditions are met:
        1. Name is ambiguous (process, handle, exec, run, etc)
        2. No docstring AND no leading comment AND unclear signature
        3. Cannot infer purpose from content
        """,
    "parameters": {
        "type": "object",
        "properties": {
            "start_line": {
                "type": "integer",
                "description": "Start line number (1-based, inclusive)",
                "minimum": 1,
            },
            "end_line": {
                "type": "integer",
                "description": "End line number (1-based, inclusive)",
                "minimum": 1,
            },
        },
        "required": ["start_line", "end_line"],
        "additionalProperties": False,
    },
    "strict": True,
}

IRIS_TOOLS: list[ToolParam] = [REFER_TO_SOURCE_CODE_TOOL]