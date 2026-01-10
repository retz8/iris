"""
Question Generator Agent (First-Time Reader)

Role: Simulate developer encountering code for the first time
"""

import json
from typing import Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from ..state import GraphState
from ..prompts.question_generator import QUESTION_GENERATOR_PROMPT


def question_generator_agent(state: GraphState) -> GraphState:
    """
    Question Generator Agent: Simulate first-time code reader

    Generates questions that naturally arise when encountering unfamiliar code.
    These questions define the minimum information needed to understand the file.

    Args:
        state: Current graph state

    Returns:
        Updated state with questions populated
    """
    try:
        # Check if we have mid-level abstraction
        if not state.get("mid_level_abstraction"):
            state["error"] = "Question generator requires mid_level_abstraction"
            return state

        # Initialize LLM
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.3,  # Some creativity for question generation
        )

        # Prepare input
        abstraction = state["mid_level_abstraction"]
        user_message = f"""
Filename: {state['filename']}
Language: {state['language']}

Mid-Level Abstraction:
{json.dumps(abstraction, indent=2)}

As a developer seeing this code for the first time, what questions would you ask?

Return your response as JSON with this structure:
{{
    "questions": [
        {{
            "text": "The question",
            "category": "purpose|structure|behavior|context"
        }}
    ]
}}
"""

        # Call LLM
        messages = [
            SystemMessage(content=QUESTION_GENERATOR_PROMPT),
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

        # Extract question texts
        questions = [q["text"] for q in parsed.get("questions", [])]

        # Update state
        state["questions"] = questions

        return state

    except Exception as e:
        state["error"] = f"Question generator agent failed: {str(e)}"
        return state
