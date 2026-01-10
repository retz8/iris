"""
Compressor Agent

Role: Convert raw source code into mid-level semantic abstraction
Constraints: Facts only, no interpretation, single execution
"""

import json
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from ..state import GraphState
from ..models import MidLevelAbstraction, FunctionSummary
from ..prompts.compressor import COMPRESSOR_PROMPT


def compressor_agent(state: GraphState) -> GraphState:
    """
    Compressor Agent: Raw code → Mid-level semantic abstraction

    This agent runs only once and produces a lossy abstraction
    that captures what a human would remember after skimming code.

    Args:
        state: Current graph state

    Returns:
        Updated state with mid_level_abstraction populated
    """
    try:
        # Initialize LLM
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.1,  # Low temperature for factual extraction
        )

        # Prepare input
        user_message = f"""
Filename: {state['filename']}
Language: {state['language']}

Source Code:
```{state['language']}
{state['raw_code']}
```

Analyze this code and provide a structured mid-level abstraction.
Return your response as JSON with this structure:
{{
    "functions": [
        {{
            "name": "function_name",
            "line_range": [start, end],
            "role": "what it does (not how)",
            "inputs": "description of inputs",
            "outputs": "description of outputs"
        }}
    ],
    "global_state": "description of shared state",
    "control_flow_patterns": ["pattern1", "pattern2"],
    "imports_dependencies": ["dep1", "dep2"],
    "file_structure": "overall organization"
}}
"""

        # Call LLM
        messages = [
            SystemMessage(content=COMPRESSOR_PROMPT),
            HumanMessage(content=user_message),
        ]

        response = llm.invoke(messages)

        # Parse response
        # Try to extract JSON from markdown code blocks if present
        content = response.content
        if isinstance(content, list):
            content = str(content[0]) if content else ""
        content = content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        parsed = json.loads(content)

        # Convert to MidLevelAbstraction object
        functions = [
            FunctionSummary(
                name=f.get("name", ""),
                line_range=f.get("line_range", [0, 0]),
                role=f.get("role", ""),
                inputs=f.get("inputs"),
                outputs=f.get("outputs"),
            )
            for f in parsed.get("functions", [])
        ]

        abstraction = MidLevelAbstraction(
            functions=functions,
            global_state=parsed.get("global_state"),
            control_flow_patterns=parsed.get("control_flow_patterns", []),
            imports_dependencies=parsed.get("imports_dependencies", []),
            file_structure=parsed.get("file_structure"),
        )

        # Update state
        state["mid_level_abstraction"] = abstraction.to_dict()

        return state

    except Exception as e:
        state["error"] = f"Compressor agent failed: {str(e)}"
        return state
