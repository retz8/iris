"""
Skeptic Agent (Validation)

Role: Challenge and validate generated abstractions
Behavior: "Prove it" perspective
"""

import json
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from ..state import GraphState
from ..prompts.skeptic import SKEPTIC_PROMPT


def skeptic_agent(state: GraphState) -> GraphState:
    """
    Skeptic Agent: Validate and challenge generated abstractions

    Actively looks for weaknesses, contradictions, and missing evidence.
    Provides feedback for the next iteration or validates convergence.

    Args:
        state: Current graph state

    Returns:
        Updated state with skeptic_feedback and potentially is_complete flag
    """
    try:
        # Check prerequisites
        if not state.get("mid_level_abstraction"):
            state["error"] = "Skeptic requires mid_level_abstraction"
            return state

        if not state.get("file_intent") or not state.get("responsibilities"):
            state["error"] = "Skeptic requires file_intent and responsibilities"
            return state

        # Initialize LLM
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.4,  # Higher temperature for critical thinking
        )

        # Prepare input
        abstraction = state.get("mid_level_abstraction")
        file_intent = state.get("file_intent")
        responsibilities = state.get("responsibilities")
        questions = state.get("questions", [])

        user_message = f"""
Filename: {state.get('filename', '')}
Language: {state.get('language', '')}

Mid-Level Abstraction:
{json.dumps(abstraction, indent=2)}

File Intent:
{file_intent}

Responsibilities:
{json.dumps(responsibilities, indent=2)}

Questions That Should Be Answered:
{json.dumps(questions, indent=2)}

Challenge this abstraction. Look for:
- Weak or speculative claims
- Unanswered questions
- Missing evidence
- Contradictions
- Alternative interpretations

Return your response as JSON with this structure:
{{
    "objections": ["specific objection 1", "objection 2"],
    "weak_claims": ["claim that needs strengthening"],
    "suggestions": ["concrete improvement suggestion"],
    "confidence_score": 0.85
}}

confidence_score: 0-1, where 1.0 means completely confident in the abstraction
"""

        # Call LLM
        messages = [
            SystemMessage(content=SKEPTIC_PROMPT),
            HumanMessage(content=user_message),
        ]

        response = llm.invoke(messages)

        # Track token usage if available
        if (
            hasattr(response, "response_metadata")
            and "token_usage" in response.response_metadata
        ):
            state["_last_llm_usage"] = response.response_metadata["token_usage"]

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

        # Update state with feedback
        state["skeptic_feedback"] = parsed

        # Increment iteration count
        state["iteration_count"] = state.get("iteration_count", 0) + 1

        # Check termination conditions
        confidence_score = parsed.get("confidence_score", 0.0)
        max_iterations = 3

        # Terminate if:
        # 1. High confidence and no significant objections
        # 2. Max iterations reached
        if (
            confidence_score >= 0.85 and len(parsed.get("objections", [])) == 0
        ) or state["iteration_count"] >= max_iterations:
            state["is_complete"] = True

        return state

    except Exception as e:
        state["error"] = f"Skeptic agent failed: {str(e)}"
        return state
