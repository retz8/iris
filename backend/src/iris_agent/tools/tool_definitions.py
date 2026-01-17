"""OpenAI tool definitions for IRIS agent."""

REFER_TO_SOURCE_CODE_TOOL = {
    "type": "function",
    "function": {
        "name": "refer_to_source_code",
        "description": (
            "Read the actual source code for a specific line range. "
            "Use this when the shallow AST doesn't provide enough information "
            "to understand a function, variable, or code block. "
            "Common reasons to call: generic names, missing comments, complex logic."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "start_line": {
                    "type": "integer",
                    "description": "Start line number (1-based, inclusive)",
                },
                "end_line": {
                    "type": "integer",
                    "description": "End line number (1-based, inclusive)",
                },
            },
            "required": ["start_line", "end_line"],
        },
    },
}

IRIS_TOOLS = [REFER_TO_SOURCE_CODE_TOOL]
