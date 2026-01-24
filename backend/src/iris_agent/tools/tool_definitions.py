"""OpenAI tool definitions for IRIS agent."""

from openai.types.responses import ToolParam

REFER_TO_SOURCE_CODE_TOOL: ToolParam = {
    "type": "function",
    "name": "refer_to_source_code",
    "description": (
        "Read the actual source code for a specific line range. "
        "Use this when the signature graph doesn't provide enough information "
        "to understand an entity's purpose or implementation. "
        "Call ONLY for: (1) generic names (process, handle, data, temp), "
        "(2) missing comments on complex entities, "
        "(3) unclear signatures. "
        "DO NOT call for: descriptive names, entities with clear comments, or simple leaf entities."
    ),
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