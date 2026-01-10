"""
Explainer Agent

Role: Generate File Intent + Responsibility Map
Constraint: Must be able to answer all generated questions
"""

import json
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from ..state import GraphState
from ..prompts.explainer import EXPLAINER_PROMPT


def explainer_agent(state: GraphState) -> GraphState:
    """
    Explainer Agent: Generate File Intent (WHY) and Responsibility Map (WHAT)

    Creates high-level abstractions that answer the generated questions.

    Args:
        state: Current graph state

    Returns:
        Updated state with file_intent and responsibilities populated
    """
    try:
        # Check prerequisites
        if not state.get("mid_level_abstraction"):
            state["error"] = "Explainer requires mid_level_abstraction"
            return state

        if not state.get("questions"):
            state["error"] = "Explainer requires questions"
            return state

        # Initialize LLM
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.2,  # Low temperature for consistent abstraction
        )

        # Prepare input
        abstraction = state["mid_level_abstraction"]
        questions = state["questions"]

        # Include skeptic feedback if this is a revision iteration
        skeptic_context = ""
        if state.get("skeptic_feedback") and state.get("iteration_count", 0) > 0:
            skeptic_context = f"""

Previous Skeptic Feedback:
{json.dumps(state['skeptic_feedback'], indent=2)}

Please address the skeptic's concerns in your revision.
"""

        user_message = f"""
Filename: {state['filename']}
Language: {state['language']}

Mid-Level Abstraction:
{json.dumps(abstraction, indent=2)}

Questions to Answer:
{json.dumps(questions, indent=2)}
{skeptic_context}

Generate File Intent and Responsibility Map.

Return your response as JSON with this structure:
{{
    "file_intent": "1-4 short lines explaining WHY this file exists",
    "responsibilities": [
        {{
            "id": "unique-id",
            "label": "Short title",
            "description": "Brief explanation",
            "ranges": [[start_line, end_line], ...]
        }}
    ]
}}
"""

        # Call LLM
        messages = [
            SystemMessage(content=EXPLAINER_PROMPT),
            HumanMessage(content=user_message),
        ]

        response = llm.invoke(messages)

        # Parse response
        content = response.content
        if isinstance(content, list):
            content = str(content[0]) if content else ""
        content = content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        parsed = json.loads(content)

        # Update state
        state["file_intent"] = parsed.get("file_intent", "")
        state["responsibilities"] = parsed.get("responsibilities", [])

        return state

    except Exception as e:
        state["error"] = f"Explainer agent failed: {str(e)}"
        return state
