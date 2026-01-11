"""
LangGraph Flow for Multi-Agent Feedback Loop

This module defines the graph structure that orchestrates the agent flow.
"""

import time
from typing import Literal, Optional, Dict, Any
from langgraph.graph import StateGraph, END

from .state import GraphState
from .agents import (
    compressor_agent,
    question_generator_agent,
    explainer_agent,
    skeptic_agent,
)
from .debug import get_debugger, enable_debug, disable_debug


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


def _wrap_agent_with_debug(agent_func, agent_name: str):
    """Wrap an agent function with debug tracking."""

    def wrapped(state: GraphState) -> GraphState:
        debugger = get_debugger()
        iteration = state.get("iteration_count", 0)

        # Log start
        debugger.log_node_start(agent_name, iteration)

        # Execute agent
        start_time = time.time()
        result_state = agent_func(state)
        duration_ms = (time.time() - start_time) * 1000

        # Try to extract token usage from the state if available
        # (Agents would need to populate this - see note below)
        usage = result_state.get("_last_llm_usage")

        # Log end
        debugger.log_node_end(
            agent_name, iteration, duration_ms, state=result_state, usage=usage
        )

        # Clean up temporary usage field
        if "_last_llm_usage" in result_state:
            del result_state["_last_llm_usage"]

        return result_state

    return wrapped


def create_graph(debug: bool = False) -> StateGraph:
    """
    Create and configure the LangGraph for multi-agent analysis.

    Flow:
    1. Compressor: raw_code → mid_level_abstraction
    2. Question Generator: mid_level_abstraction → questions
    3. Explainer: mid_level_abstraction + questions → file_intent + responsibilities
    4. Skeptic: validate and challenge → feedback
    5. Conditional: if not complete, loop back to explainer for revision

    Args:
        debug: Enable debug mode with token tracking

    Returns:
        Compiled StateGraph ready for execution
    """
    # Create graph
    workflow = StateGraph(GraphState)

    # Wrap agents with debug tracking if enabled
    compressor = (
        _wrap_agent_with_debug(compressor_agent, "compressor")
        if debug
        else compressor_agent
    )
    question_gen = (
        _wrap_agent_with_debug(question_generator_agent, "question_generator")
        if debug
        else question_generator_agent
    )
    explainer = (
        _wrap_agent_with_debug(explainer_agent, "explainer")
        if debug
        else explainer_agent
    )
    skeptic = (
        _wrap_agent_with_debug(skeptic_agent, "skeptic") if debug else skeptic_agent
    )

    # Add nodes (agents)
    workflow.add_node("compressor", compressor)
    workflow.add_node("question_generator", question_gen)
    workflow.add_node("explainer", explainer)
    workflow.add_node("skeptic", skeptic)

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


def run_analysis(
    raw_code: str,
    filename: str,
    language: str,
    debug: bool = False,
    track_tokens: bool = True,
) -> tuple[GraphState, Optional[Dict[str, Any]]]:
    """
    Run the complete multi-agent analysis on source code.

    Args:
        raw_code: Source code to analyze
        filename: Name of the file
        language: Programming language
        debug: Enable debug logging
        track_tokens: Track token usage and costs

    Returns:
        Tuple of (final GraphState, debug metrics dict)
    """
    from .state import create_initial_state

    # Enable debug if requested
    if debug:
        enable_debug(track_tokens=track_tokens)

    # Create graph with debug mode
    graph = create_graph(debug=debug)

    # Create initial state
    initial_state = create_initial_state(
        raw_code=raw_code, filename=filename, language=language
    )

    # Run the graph
    final_state = graph.invoke(initial_state)  # type: ignore

    # Print summary and get metrics
    debugger = get_debugger()
    metrics = None

    if debug:
        debugger.print_summary()
        metrics = debugger.get_metrics_dict()
        disable_debug()  # Clean up for next run

    return final_state, metrics
