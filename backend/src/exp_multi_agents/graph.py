"""
LangGraph Flow for Multi-Agent Feedback Loop

This module defines the graph structure that orchestrates the agent flow.
"""

from typing import Literal
from langgraph.graph import StateGraph, END

from .state import GraphState
from .agents import (
    compressor_agent,
    question_generator_agent,
    explainer_agent,
    skeptic_agent,
)


def should_continue(state: GraphState) -> Literal["continue", "end"]:
    """
    Conditional branch logic: decide whether to continue the feedback loop or end.

    Termination conditions:
    - Analysis is marked as complete (skeptic approved)
    - Error occurred

    Continue condition:
    - More iterations needed for refinement

    Args:
        state: Current graph state

    Returns:
        "end" to terminate, "continue" to loop back to explainer for revision
    """
    # Terminate if there's an error
    if state.get("error"):
        return "end"

    # Terminate if skeptic marked as complete
    if state.get("is_complete"):
        return "end"

    # Otherwise, continue the feedback loop
    return "continue"


def create_graph() -> StateGraph:
    """
    Create and configure the LangGraph for multi-agent analysis.

    Flow:
    1. Compressor: raw_code → mid_level_abstraction
    2. Question Generator: mid_level_abstraction → questions
    3. Explainer: mid_level_abstraction + questions → file_intent + responsibilities
    4. Skeptic: validate and challenge → feedback
    5. Conditional: if not complete, loop back to explainer for revision

    Returns:
        Compiled StateGraph ready for execution
    """
    # Create graph
    workflow = StateGraph(GraphState)

    # Add nodes (agents)
    workflow.add_node("compressor", compressor_agent)
    workflow.add_node("question_generator", question_generator_agent)
    workflow.add_node("explainer", explainer_agent)
    workflow.add_node("skeptic", skeptic_agent)

    # Set entry point
    workflow.set_entry_point("compressor")

    # Define edges
    # Linear flow through first three agents
    workflow.add_edge("compressor", "question_generator")
    workflow.add_edge("question_generator", "explainer")
    workflow.add_edge("explainer", "skeptic")

    # Conditional branch after skeptic
    # - If should continue: loop back to explainer for revision
    # - If should end: terminate the graph
    workflow.add_conditional_edges(
        "skeptic",
        should_continue,
        {
            "continue": "explainer",  # Loop back for revision
            "end": END,  # Terminate
        },
    )

    # Compile the graph
    return workflow.compile()  # type: ignore


# Create the compiled graph instance
graph = create_graph()


def run_analysis(raw_code: str, filename: str, language: str) -> GraphState:
    """
    Run the complete multi-agent analysis on source code.

    Args:
        raw_code: Source code to analyze
        filename: Name of the file
        language: Programming language

    Returns:
        Final GraphState after all iterations
    """
    from .state import create_initial_state

    # Create initial state
    initial_state = create_initial_state(
        raw_code=raw_code, filename=filename, language=language
    )

    # Run the graph
    final_state = graph.invoke(initial_state)  # type: ignore

    return final_state
