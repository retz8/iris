"""OpenAI tool definitions for IRIS agent."""

from openai.types.responses import ToolParam

REFER_TO_SOURCE_CODE_TOOL: ToolParam = {
    "type": "function",
    "name": "refer_to_source_code",
    "description": "Retrieve source code for a specific line range. Use according to tooling rules in system prompt.",
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
