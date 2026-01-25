"""Orchestrator for managing the Analyzer-Critic loop.

Coordinates the interaction between Analyzer and Critic agents until
a satisfactory hypothesis is achieved or max iterations is reached.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, TYPE_CHECKING

from openai import OpenAI

from .analyzer import AnalyzerAgent
from .critic import CriticAgent
from .schemas import AnalysisResult, Hypothesis, Feedback

if TYPE_CHECKING:
    from signature_graph import SignatureGraph
    from source_store import SourceStore
    from ..debugger.debugger import AgentFlowDebugger


class Orchestrator:
    """Manages the Analyzer-Critic feedback loop.

    Flow:
    1. Analyzer generates initial hypothesis
    2. Critic evaluates hypothesis
    3. If confidence < threshold:
       a. Critic suggests tool calls (optional)
       b. Analyzer executes tool calls
       c. Analyzer revises hypothesis
       d. Go to step 2
    4. Return final hypothesis when confidence >= threshold or max_iterations reached
    """

    # Default configuration
    DEFAULT_CONFIDENCE_THRESHOLD = 0.85
    DEFAULT_MAX_ITERATIONS = 3

    def __init__(
        self,
        client: OpenAI,
        model: str = "gpt-4o-mini",
        confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
        max_iterations: int = DEFAULT_MAX_ITERATIONS,
        debugger: Optional["AgentFlowDebugger"] = None,
    ) -> None:
        """Initialize orchestrator with both agents.

        Args:
            client: OpenAI client instance
            model: Model to use for both agents
            confidence_threshold: Minimum confidence to accept hypothesis
            max_iterations: Maximum number of revision iterations
            debugger: Optional debugger for tracking multi-agent flow
        """
        self.client = client
        self.model = model
        self.analyzer = AnalyzerAgent(client, model, debugger)
        self.critic = CriticAgent(client, model, debugger)
        self.confidence_threshold = confidence_threshold
        self.max_iterations = max_iterations
        self.debugger = debugger

    def run(
        self,
        filename: str,
        language: str,
        signature_graph: "SignatureGraph",
        source_store: "SourceStore",
        file_hash: str,
    ) -> AnalysisResult:
        """Run the Analyzer-Critic loop until convergence.

        Args:
            filename: Name of the file being analyzed
            language: Programming language
            signature_graph: Structured representation of code entities
            source_store: Store for source code retrieval
            file_hash: Hash of the source file

        Returns:
            Final analysis result with metadata about the process

        Exit Conditions:
            - Critic confidence >= threshold (approved=True)
            - max_iterations reached
        """
        # Track metadata for debugging
        iteration_history: List[Dict[str, Any]] = []
        total_tool_calls = 0

        # TASK-FIX2-017: Track confidence history for progress detection
        confidence_history: List[float] = []
        stall_counter = 0
        MAX_STALL_ITERATIONS = 2
        MIN_PROGRESS_THRESHOLD = 0.10

        print(f"[ORCHESTRATOR] Starting Analyzer-Critic loop for {filename}")
        print(f"  - Confidence threshold: {self.confidence_threshold}")
        print(f"  - Max iterations: {self.max_iterations}")

        # =====================================================================
        # Step 1: Generate initial hypothesis
        # =====================================================================
        print(f"\n[ITERATION 0] Generating initial hypothesis...")

        hypothesis = self.analyzer.generate_hypothesis(
            filename=filename,
            language=language,
            signature_graph=signature_graph,
            source_store=source_store,
            file_hash=file_hash,
        )

        print(f"  - File Intent: {hypothesis.file_intent[:80]}...")
        print(f"  - Responsibility blocks: {len(hypothesis.responsibility_blocks)}")

        # Log initial hypothesis to debugger
        if self.debugger:
            self.debugger.log_agent_iteration(
                iteration=0,
                agent="analyzer",
                hypothesis={
                    "file_intent": hypothesis.file_intent,
                    "responsibility_blocks": [
                        {
                            "title": block.title,
                            "description": block.description,
                            "entities": block.entities,
                        }
                        for block in hypothesis.responsibility_blocks
                    ],
                },
            )

        # =====================================================================
        # Step 2: Evaluate and revise loop
        # =====================================================================
        current_iteration = 0
        final_feedback: Optional[Feedback] = None

        while current_iteration < self.max_iterations:
            print(f"\n[ITERATION {current_iteration}] Critic evaluating hypothesis...")

            # Evaluate current hypothesis
            feedback = self.critic.evaluate(
                hypothesis=hypothesis,
                signature_graph=signature_graph,
                filename=filename,
                language=language,
                iteration=current_iteration,
            )

            final_feedback = feedback

            print(f"  - Confidence: {feedback.confidence:.2f}")
            print(f"  - Approved: {feedback.approved}")
            print(f"  - Tool suggestions: {len(feedback.tool_suggestions)}")

            # Log critic feedback to debugger
            if self.debugger:
                self.debugger.log_agent_iteration(
                    iteration=current_iteration,
                    agent="critic",
                    feedback=feedback.comments,  # type: ignore
                    confidence=feedback.confidence,
                    approved=feedback.approved,
                    tool_suggestions=[
                        {
                            "tool_name": ts.tool_name,
                            "parameters": ts.parameters,
                            "rationale": ts.rationale,
                        }
                        for ts in feedback.tool_suggestions
                    ],
                )

            # Record iteration history
            iteration_history.append(
                {
                    "iteration": current_iteration,
                    "confidence": feedback.confidence,
                    "approved": feedback.approved,
                    "comments": feedback.comments[:200] if feedback.comments else "",
                    "tool_suggestions_count": len(feedback.tool_suggestions),
                    "responsibility_blocks_count": len(
                        hypothesis.responsibility_blocks
                    ),
                }
            )

            # TASK-FIX2-017: Track confidence for progress detection
            current_confidence = feedback.confidence
            confidence_history.append(current_confidence)

            # TASK-FIX2-018: Calculate confidence delta between iterations
            confidence_delta = None
            if len(confidence_history) >= 2:
                confidence_delta = abs(confidence_history[-1] - confidence_history[-2])

                # TASK-FIX2-019: Stall detection
                if confidence_delta < MIN_PROGRESS_THRESHOLD:
                    stall_counter += 1
                    print(
                        f"  - Progress stall detected ({stall_counter}/{MAX_STALL_ITERATIONS}): delta={confidence_delta:.3f}"
                    )
                else:
                    stall_counter = 0  # Reset if progress detected

                # TASK-FIX2-020: Early termination on stall
                # if stall_counter >= MAX_STALL_ITERATIONS:
                #     print(
                #         f"\n[ORCHESTRATOR] Early termination: Confidence stalled for {MAX_STALL_ITERATIONS} iterations"
                #     )
                #     print(
                #         f"  - Confidence deltas below threshold ({MIN_PROGRESS_THRESHOLD})"
                #     )
                #     print(f"  - Final confidence: {current_confidence:.2f}")

                #     result = AnalysisResult(
                #         file_intent=hypothesis.file_intent,
                #         responsibility_blocks=hypothesis.responsibility_blocks,
                #         metadata={
                #             "execution_path": "two-agent",
                #             "iterations": current_iteration + 1,
                #             "final_confidence": current_confidence,
                #             "approved": False,
                #             "exit_reason": "insufficient_progress",
                #             "stall_reason": f"Confidence stalled for {MAX_STALL_ITERATIONS} iterations (delta < {MIN_PROGRESS_THRESHOLD})",
                #             "tool_call_count": total_tool_calls,
                #             "iteration_history": iteration_history,
                #             "confidence_threshold": self.confidence_threshold,
                #             "max_iterations": self.max_iterations,
                #             "confidence_history": confidence_history,
                #             "stall_counter": stall_counter,
                #         },
                #     )

                #     # Log final metadata to debugger for progress metrics
                #     if self.debugger:
                #         self.debugger.log_agent_iteration(
                #             iteration=current_iteration,
                #             agent="orchestrator",
                #             metadata=result.metadata,
                #         )

                #     return result

            # =====================================================================
            # Exit Condition 1: Confidence threshold met (approved)
            # =====================================================================
            if feedback.approved:
                print(
                    f"\n[ORCHESTRATOR] Hypothesis approved with confidence {feedback.confidence:.2f}"
                )
                break

            # =====================================================================
            # Exit Condition 2: Max iterations reached (run final Analyzer pass)
            # =====================================================================
            if current_iteration >= self.max_iterations - 1:
                print(
                    f"\n[ORCHESTRATOR] Max iterations ({self.max_iterations}) reached"
                )
                print(f"  - Final confidence: {feedback.confidence:.2f}")

                # Final Analyzer revision (no further Critic evaluation)
                tool_results: List[Dict[str, Any]] = []

                if feedback.tool_suggestions:
                    print(
                        f"\n[ITERATION {current_iteration}] Executing {len(feedback.tool_suggestions)} tool calls..."
                    )

                    tool_results = self.analyzer.execute_tool_calls(
                        tool_suggestions=feedback.tool_suggestions,
                        source_store=source_store,
                        file_hash=file_hash,
                    )

                    total_tool_calls += len(feedback.tool_suggestions)

                    for result in tool_results:
                        if "error" not in result:
                            params = result.get("parameters", {})
                            print(
                                f"    - Lines {params.get('start_line')}-{params.get('end_line')}: {result.get('rationale', '')[:50]}"
                            )

                print(
                    f"\n[ITERATION {current_iteration}] Analyzer revising hypothesis..."
                )

                hypothesis = self.analyzer.revise_hypothesis(
                    current_hypothesis=hypothesis,
                    feedback=feedback,
                    tool_results=tool_results if tool_results else None,
                )

                print(
                    f"  - Updated responsibility blocks: {len(hypothesis.responsibility_blocks)}"
                )

                # Log revised hypothesis to debugger
                if self.debugger:
                    self.debugger.log_agent_iteration(
                        iteration=current_iteration + 1,
                        agent="analyzer",
                        hypothesis={
                            "file_intent": hypothesis.file_intent,
                            "responsibility_blocks": [
                                {
                                    "title": block.title,
                                    "description": block.description,
                                    "entities": block.entities,
                                }
                                for block in hypothesis.responsibility_blocks
                            ],
                        },
                    )

                current_iteration += 1
                break

            # =====================================================================
            # Step 3a: Execute tool calls suggested by Critic
            # =====================================================================
            tool_results: List[Dict[str, Any]] = []

            if feedback.tool_suggestions:
                print(
                    f"\n[ITERATION {current_iteration}] Executing {len(feedback.tool_suggestions)} tool calls..."
                )

                tool_results = self.analyzer.execute_tool_calls(
                    tool_suggestions=feedback.tool_suggestions,
                    source_store=source_store,
                    file_hash=file_hash,
                )

                total_tool_calls += len(feedback.tool_suggestions)

                for result in tool_results:
                    if "error" not in result:
                        params = result.get("parameters", {})
                        print(
                            f"    - Lines {params.get('start_line')}-{params.get('end_line')}: {result.get('rationale', '')[:50]}"
                        )

            # =====================================================================
            # Step 3b: Revise hypothesis based on feedback and tool results
            # =====================================================================
            print(f"\n[ITERATION {current_iteration}] Analyzer revising hypothesis...")

            hypothesis = self.analyzer.revise_hypothesis(
                current_hypothesis=hypothesis,
                feedback=feedback,
                tool_results=tool_results if tool_results else None,
            )

            print(
                f"  - Updated responsibility blocks: {len(hypothesis.responsibility_blocks)}"
            )

            # Log revised hypothesis to debugger
            if self.debugger:
                self.debugger.log_agent_iteration(
                    iteration=current_iteration + 1,
                    agent="analyzer",
                    hypothesis={
                        "file_intent": hypothesis.file_intent,
                        "responsibility_blocks": [
                            {
                                "title": block.title,
                                "description": block.description,
                                "entities": block.entities,
                            }
                            for block in hypothesis.responsibility_blocks
                        ],
                    },
                )

            current_iteration += 1

        # =====================================================================
        # Step 4: Build final result
        # =====================================================================
        print(f"\n[ORCHESTRATOR] Building final result...")

        # Determine exit reason
        exit_reason = (
            "approved"
            if (final_feedback and final_feedback.approved)
            else "max_iterations"
        )

        result = AnalysisResult(
            file_intent=hypothesis.file_intent,
            responsibility_blocks=hypothesis.responsibility_blocks,
            metadata={
                "execution_path": "two-agent",
                "iterations": current_iteration + 1,
                "final_confidence": (
                    final_feedback.confidence if final_feedback else 0.0
                ),
                "approved": final_feedback.approved if final_feedback else False,
                "exit_reason": exit_reason,
                "tool_call_count": total_tool_calls,
                "iteration_history": iteration_history,
                "confidence_threshold": self.confidence_threshold,
                "max_iterations": self.max_iterations,
                "confidence_history": confidence_history,
                "stall_counter": stall_counter,
            },
        )

        print(f"  - Exit reason: {exit_reason}")
        print(f"  - Total iterations: {current_iteration + 1}")
        print(f"  - Total tool calls: {total_tool_calls}")
        print(f"  - Final responsibility blocks: {len(result.responsibility_blocks)}")

        # Log final metadata to debugger for progress metrics
        if self.debugger:
            self.debugger.log_agent_iteration(
                iteration=current_iteration,
                agent="orchestrator",
                metadata=result.metadata,
            )

        return result
