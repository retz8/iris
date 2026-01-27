"""Agent Flow Debugger for IRIS analysis pipeline.

Monitors and captures diagnostic data throughout the analysis stages:
- Source Code Ingestion
- Full AST Generation
- Signature Graph Extraction
- Analysis Result Compilation

Provides diagnostic snapshots and verification reports.
Also tracks LLM processing metrics (tokens, timing, responses).
"""

from __future__ import annotations

# NOTE: line above is used to enable postponed evaluation of annotations (PEP 563)
# this helps developers to write type hints without worrying about import order

import copy
import json
import time
from typing import Any, Dict, List, Optional

RAW_SOURCE_MAX_PREVIEW = 150
SIGNATURE_GRAPH_PREVIEW_MAX_LEN = 1000


class AgentFlowDebugger:
    """Diagnostic utility for monitoring Agent Flow from source code ingestion to final analysis.

    Captures data at various pipeline stages and provides metrics
    for validating the quality of the AST compression.
    Also tracks LLM processing metrics (tokens, timing, responses).
    Supports multi-agent tracking for Analyzer-Critic two-agent system.
    """

    def __init__(self, filename: str, language: str) -> None:
        """Initialize the ShallowASTDebugger.

        Args:
            filename: Name of the file being analyzed.
            language: Programming language identifier (e.g., "python", "typescript").
        """
        self.filename = filename
        self.language = language
        self.snapshots: Dict[str, Any] = {}
        self.metrics: Dict[str, Any] = {}
        self._full_ast_node_count: int = 0
        self._source_code: str = ""
        self._source_code_file_hash: str = ""

        # LLM tracking
        self.llm_stages: Dict[str, Dict[str, Any]] = {}
        self._current_stage: Optional[str] = None
        self._stage_start_time: Optional[float] = None

        # Tool call tracking (for tool-calling architecture)
        self.tool_calls: List[Dict[str, Any]] = []

        # Two-agent system tracking (Analyzer-Critic loop)
        self.agent_iterations: List[Dict[str, Any]] = []
        self._current_iteration: int = 0

    def capture_snapshot(self, stage_name: str, data: Any) -> None:
        """Capture a deep copy of data at a specific pipeline stage.

        Args:
            stage_name: Name of the stage (e.g., "raw_source", "full_ast").
            data: Data to capture (will be deep copied).
        """
        self.snapshots[stage_name] = copy.deepcopy(data)

        # Store source code for later verification
        if stage_name == "raw_source" and isinstance(data, str):
            self._source_code = data

    def start_llm_stage(self, stage_name: str) -> None:
        """Start tracking an LLM processing stage.

        Args:
            stage_name: Name of the stage (e.g., "identification", "analysis").
        """
        self._current_stage = stage_name
        self._stage_start_time = time.time()
        self.llm_stages[stage_name] = {
            "name": stage_name,
            "start_time": self._stage_start_time,
        }

    def end_llm_stage(
        self,
        stage_name: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        llm_response: str = "",
        parsed_output: Optional[Dict[str, Any]] = None,
    ) -> None:
        """End tracking an LLM processing stage.

        Args:
            stage_name: Name of the stage.
            input_tokens: Number of input tokens used.
            output_tokens: Number of output tokens generated.
            llm_response: Full LLM response text.
            parsed_output: Parsed output from the LLM response.
        """
        end_time = time.time()
        elapsed_time = end_time - (self._stage_start_time or end_time)

        if stage_name not in self.llm_stages:
            self.llm_stages[stage_name] = {"name": stage_name}

        self.llm_stages[stage_name].update(
            {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
                "elapsed_time_seconds": round(elapsed_time, 2),
                "llm_response": llm_response,
                "parsed_output": parsed_output,
                "end_time": end_time,
            }
        )

    def log_tool_call(
        self,
        tool_name: str,
        args: Dict[str, Any],
        result_length: int,
        result_content: str = "",
    ) -> None:
        """Log a tool call for debugging.

        Records details about tool invocations made during tool-calling analysis.

        Args:
            tool_name: Name of the tool that was called (e.g., "refer_to_source_code").
            args: Arguments passed to the tool.
            result_length: Length of the result returned by the tool.
            result_content: Actual content returned by the tool (source code snippet, etc.).
        """
        self.tool_calls.append(
            {
                "tool_name": tool_name,
                "args": args,
                "result_length": result_length,
                "result_content": result_content,
                "timestamp": time.time(),
                "iteration": self._current_iteration,  # Track which iteration made this call
            }
        )

    def log_agent_iteration(
        self,
        iteration: int,
        agent: str,
        hypothesis: Optional[Dict[str, Any]] = None,
        feedback: Optional[Dict[str, Any]] = None,
        confidence: Optional[float] = None,
        approved: Optional[bool] = None,
        tool_suggestions: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log an iteration of the Analyzer-Critic loop.

        Records the state of the two-agent system at each iteration,
        including hypotheses, feedback, and confidence scores.

        Args:
            iteration: Iteration number (0 = initial hypothesis)
            agent: Which agent produced this data ("analyzer" or "critic")
            hypothesis: Current hypothesis from Analyzer (file_intent + responsibility_blocks)
            feedback: Feedback from Critic (comments + suggestions)
            confidence: Confidence score from Critic (0.0 to 1.0)
            approved: Whether the Critic approved the hypothesis
            tool_suggestions: Tool calls suggested by Critic
            metadata: Additional metadata (e.g., exit_reason, stall_counter)
        """
        self._current_iteration = iteration

        iteration_data = {
            "iteration": iteration,
            "agent": agent,
            "timestamp": time.time(),
        }

        if hypothesis is not None:
            iteration_data["hypothesis"] = {
                "file_intent": hypothesis.get("file_intent", ""),
                "responsibility_block_count": len(
                    hypothesis.get("responsibility_blocks", [])
                ),
                "responsibility_blocks": [
                    {
                        "id": block.get("id", ""),
                        "label": block.get("label", ""),
                        "elements": block.get("elements", {}),
                        "ranges": block.get("ranges", []),
                    }
                    for block in hypothesis.get("responsibility_blocks", [])
                ],
            }

        if feedback is not None:
            iteration_data["feedback"] = feedback

        if confidence is not None:
            iteration_data["confidence"] = confidence

        if approved is not None:
            iteration_data["approved"] = approved

        if tool_suggestions is not None:
            iteration_data["tool_suggestions"] = tool_suggestions

        if metadata is not None:
            iteration_data["metadata"] = metadata

        self.agent_iterations.append(iteration_data)

    def get_two_agent_summary(self) -> Dict[str, Any]:
        """Generate a summary of the two-agent system execution.

        Returns:
            Dictionary with iteration count, total tool calls, final confidence,
            and per-iteration summaries including progress metrics.
        """
        if not self.agent_iterations:
            return {"enabled": False}

        # Find the final critic evaluation
        final_critic = None
        for iteration_data in reversed(self.agent_iterations):
            if iteration_data.get("agent") == "critic":
                final_critic = iteration_data
                break

        # Count iterations (based on analyzer hypotheses)
        analyzer_count = sum(
            1 for i in self.agent_iterations if i.get("agent") == "analyzer"
        )
        critic_count = sum(
            1 for i in self.agent_iterations if i.get("agent") == "critic"
        )

        # Count tool calls per iteration
        tool_calls_by_iteration: Dict[int, int] = {}
        for tc in self.tool_calls:
            iteration = tc.get("iteration", 0)
            tool_calls_by_iteration[iteration] = (
                tool_calls_by_iteration.get(iteration, 0) + 1
            )

        # TASK-FIX2-022: Extract confidence history and progress metrics
        confidence_history: List[float] = []
        for iteration_data in self.agent_iterations:
            if iteration_data.get("agent") == "critic":
                conf = iteration_data.get("confidence")
                if conf is not None:
                    confidence_history.append(conf)

        # Detect stall and early termination from metadata
        stall_detected = False
        early_termination = False
        exit_reason = None

        # Check if we can extract this from the last analyzer's metadata
        # (This would be passed from orchestrator if available)
        for iteration_data in reversed(self.agent_iterations):
            metadata = iteration_data.get("metadata", {})
            if metadata:
                exit_reason = metadata.get("exit_reason")
                stall_counter = metadata.get("stall_counter", 0)
                if exit_reason == "insufficient_progress":
                    early_termination = True
                    stall_detected = True
                elif stall_counter > 0:
                    stall_detected = True
                if exit_reason:
                    break

        return {
            "enabled": True,
            "total_iterations": analyzer_count,
            "analyzer_rounds": analyzer_count,
            "critic_rounds": critic_count,
            "final_confidence": (
                final_critic.get("confidence") if final_critic else None
            ),
            "final_approved": final_critic.get("approved") if final_critic else None,
            "total_tool_calls": len(self.tool_calls),
            "tool_calls_by_iteration": tool_calls_by_iteration,
            "iterations": self.agent_iterations,
            "confidence_history": confidence_history,
            "stall_detected": stall_detected,
            "early_termination": early_termination,
            "exit_reason": exit_reason,
        }

    def get_report(self) -> Dict[str, Any]:
        """Generate a comprehensive diagnostic report.

        Includes execution path summary, metrics, and LLM tracking.
        Now also includes two-agent system tracking when applicable.

        Returns:
            Dictionary containing filename, language, snapshots, metrics,
            and a summary of the analysis quality.
        """

        signature_graph = self.snapshots.get("signature_graph", {})
        entity_count = 0
        if isinstance(signature_graph, dict):
            entity_count = len(signature_graph.get("entities", []))

        return {
            "filename": self.filename,
            "language": self.language,
            "snapshots": self.snapshots,
            "metrics": self.metrics,
            "llm_stages": self.llm_stages,
            "tool_calls": self.tool_calls,
            "tool_call_count": len(self.tool_calls),
            "agent_iterations": self.agent_iterations,
            "two_agent_summary": self.get_two_agent_summary(),
            "summary": {
                "node_reduction_ratio": self.metrics.get("node_reduction_ratio", 0),
                "context_compression_ratio": self.metrics.get(
                    "context_compression_ratio", 0
                ),
                "comment_retention_score": self.metrics.get(
                    "comment_retention_score", 0
                ),
                "signature_graph_entity_count": entity_count,
                "signature_graph_available": entity_count > 0,
            },
        }

    def print_report(self) -> None:
        """Print a formatted debug report to console.

        Displays metrics, integrity scores, and quality assessments
        in a human-readable format for visual inspection.
        """
        report = self.get_report()

        # Color codes for terminal output
        BLUE = "\033[94m"
        GREEN = "\033[92m"
        YELLOW = "\033[93m"
        RED = "\033[91m"
        BOLD = "\033[1m"
        END = "\033[0m"

        print(f"\n{BOLD}{BLUE}{'=' * 80}{END}")
        print(f"{BOLD}{BLUE}IRIS DEBUG REPORT - {report['filename']}{END}")
        print(f"{BOLD}{BLUE}{'=' * 80}{END}")

        # File Information
        print(f"\n{BOLD}File Information:{END}")
        print(f"  Filename: {report['filename']}")
        print(f"  Language: {report['language']}")

        signature_graph = report.get("snapshots", {}).get("signature_graph", {})
        if isinstance(signature_graph, dict) and signature_graph.get("entities"):
            entity_count = len(signature_graph.get("entities", []))
            print(f"\n{BOLD}Signature Graph Snapshot:{END}")
            print(f"  Entities Captured:           {entity_count}")

        # Quality Assessment
        summary = report.get("summary", {})
        has_warning = summary.get("has_quality_warning", False)

        print(f"\n{BOLD}Quality Assessment:{END}")
        if has_warning:
            print(
                f"  {RED}⚠ Quality Warning{END}: "
                f"Integrity score is below 100%. Some structural elements may not have been fully verified."
            )
        else:
            print(f"  {GREEN}✓ All Checks Passed{END}")

        print(f"\n{BOLD}{BLUE}{'=' * 80}{END}\n")

    def generate_markdown_report(self, output_path: Optional[str] = None) -> str:
        """Generate debug report as formatted markdown with visual snapshots.

        Args:
            output_path: Optional file path to write markdown report.
                        If None, only returns the markdown string.

        Returns:
            Formatted markdown string.
        """
        report = self.get_report()
        snapshots = report.get("snapshots", {})
        two_agent_summary = report.get("two_agent_summary", {})

        # Determine execution path from LLM stages
        llm_stages = report.get("llm_stages", {})
        if "fast_path_analysis" in llm_stages:
            execution_path = "🚀 Fast-Path"
        elif "two_agent_analysis" in llm_stages or two_agent_summary.get("enabled"):
            execution_path = "🤝 Two-Agent (Analyzer + Critic)"
        elif "tool_calling_analysis" in llm_stages:
            execution_path = "🔧 Tool-Calling with Signature Graph"
        else:
            execution_path = "❓ Unknown"

        md_lines = [
            "# IRIS Debug Report",
            "",
            f"**File:** `{report['filename']}`  ",
            f"**Language:** `{report['language']}`  ",
            f"**Execution Path:** {execution_path}  ",
            "",
        ]

        # Add two-agent summary at the top if applicable
        if two_agent_summary.get("enabled"):
            md_lines.extend(
                [
                    "### Two-Agent Summary",
                    "",
                    "| Metric | Value |",
                    "|--------|-------|",
                    f"| Iterations | {two_agent_summary.get('total_iterations', 0)} |",
                    f"| Analyzer Rounds | {two_agent_summary.get('analyzer_rounds', 0)} |",
                    f"| Critic Rounds | {two_agent_summary.get('critic_rounds', 0)} |",
                    f"| Final Confidence | {two_agent_summary.get('final_confidence', 0):.2f} |",
                    f"| Approved | {'✅ Yes' if two_agent_summary.get('final_approved') else '❌ No'} |",
                    f"| Total Tool Calls | {two_agent_summary.get('total_tool_calls', 0)} |",
                    "",
                ]
            )

            # TASK-FIX2-022: Add Progress Metrics section
            confidence_history = two_agent_summary.get("confidence_history", [])
            if len(confidence_history) >= 2:
                # Calculate confidence deltas
                deltas = []
                for i in range(1, len(confidence_history)):
                    delta = confidence_history[i] - confidence_history[i - 1]
                    deltas.append(delta)

                avg_delta = sum(abs(d) for d in deltas) / len(deltas) if deltas else 0
                stall_detected = two_agent_summary.get("stall_detected", False)
                early_termination = two_agent_summary.get("early_termination", False)

                md_lines.extend(
                    [
                        "### Progress Metrics",
                        "",
                        "| Metric | Value |",
                        "|--------|-------|",
                    ]
                )

                # Add confidence delta for each iteration transition
                for i, delta in enumerate(deltas):
                    sign = "+" if delta >= 0 else ""
                    md_lines.append(
                        f"| Confidence Delta (Iter {i}→{i+1}) | {sign}{delta:.2f} |"
                    )

                md_lines.extend(
                    [
                        f"| Average Delta | {avg_delta:.3f} |",
                        f"| Stall Detected | {'Yes ⚠️' if stall_detected else 'No'} |",
                        f"| Early Termination | {'Yes' if early_termination else 'No'} |",
                        "",
                    ]
                )

            # Show exit reason if available
            exit_reason = two_agent_summary.get("exit_reason")
            if exit_reason:
                exit_emoji = (
                    "✅"
                    if exit_reason == "approved"
                    else "⏹️" if exit_reason == "insufficient_progress" else "🔄"
                )
                md_lines.extend(
                    [
                        f"**Exit Reason:** {exit_emoji} `{exit_reason}`",
                        "",
                    ]
                )

        md_lines.extend(
            [
                "---",
                "",
                "## Source Code Overview",
                "",
            ]
        )

        md_lines.extend(
            [
                "### Stage 1: Original Source Code",
                "",
            ]
        )

        # Display source code preview
        raw_source = snapshots.get("raw_source", "") or self._source_code
        if raw_source:
            source_preview = (
                raw_source[:RAW_SOURCE_MAX_PREVIEW]
                if len(raw_source) > RAW_SOURCE_MAX_PREVIEW
                else raw_source
            )
            lines_count = len(raw_source.splitlines())
            source_bytes = len(raw_source.encode("utf-8"))
            md_lines.extend(
                [
                    f"**Total Lines:** {lines_count}  ",
                    f"**Size:** {source_bytes:,} bytes",
                    "",
                    "```" + report["language"],
                    source_preview
                    + (
                        "...(truncated)"
                        if len(raw_source) > RAW_SOURCE_MAX_PREVIEW
                        else ""
                    ),
                    "```",
                    "",
                ]
            )
        else:
            md_lines.extend(
                [
                    "*Source code not available in snapshots*",
                    "",
                ]
            )

        # Display Signature Graph snapshot if available
        signature_graph = snapshots.get("signature_graph", {})
        if isinstance(signature_graph, dict) and signature_graph.get("entities"):
            entity_count = len(signature_graph.get("entities", []))
            md_lines.extend(
                [
                    "### Signature Graph Snapshot",
                    "",
                    f"**Entities:** {entity_count}",
                    "",
                    "```json",
                    self._format_signature_graph_preview(),
                    "```",
                    "",
                ]
            )

        # Add Two-Agent Iteration Details (if applicable)
        agent_iterations = report.get("agent_iterations", [])
        if agent_iterations and two_agent_summary.get("enabled"):
            md_lines.extend(
                [
                    "---",
                    "",
                    "## Two-Agent Iteration History",
                    "",
                    "The Analyzer-Critic loop ran through the following iterations:",
                    "",
                ]
            )

            for iteration_data in agent_iterations:
                iteration_num = iteration_data.get("iteration", 0)
                agent = iteration_data.get("agent", "unknown")
                agent_emoji = "🔬" if agent == "analyzer" else "🎯"

                md_lines.extend(
                    [
                        f"### Iteration {iteration_num}: {agent_emoji} {agent.title()}",
                        "",
                    ]
                )

                # Show hypothesis summary for analyzer
                if agent == "analyzer" and "hypothesis" in iteration_data:
                    hyp = iteration_data["hypothesis"]
                    md_lines.extend(
                        [
                            f"**File Intent:** {hyp.get('file_intent', 'N/A')[:100]}...",
                            "",
                            f"**Responsibility Blocks:** {hyp.get('responsibility_block_count', 0)}",
                            "",
                        ]
                    )
                    blocks = hyp.get("responsibility_blocks", [])
                    if blocks:
                        md_lines.append(
                            "| Block | Functions | State | Imports | Types | Constants |"
                        )
                        md_lines.append(
                            "|-------|-----------|-------|---------|-------|-----------|"
                        )
                        for block in blocks:
                            elements = block.get("elements", {}) or {}
                            functions_count = len(elements.get("functions", []))
                            state_count = len(elements.get("state", []))
                            imports_count = len(elements.get("imports", []))
                            types_count = len(elements.get("types", []))
                            constants_count = len(elements.get("constants", []))
                            md_lines.append(
                                "| "
                                f"{block.get('label', 'Untitled')} | "
                                f"{functions_count} | "
                                f"{state_count} | "
                                f"{imports_count} | "
                                f"{types_count} | "
                                f"{constants_count} |"
                            )
                        md_lines.append("")

                # Show feedback for critic
                if agent == "critic":
                    confidence = iteration_data.get("confidence", 0)
                    approved = iteration_data.get("approved", False)
                    feedback = iteration_data.get("feedback", "")

                    status_emoji = "✅" if approved else "🔄"
                    md_lines.extend(
                        [
                            f"**Confidence:** {confidence:.2f} {status_emoji}",
                            f"**Approved:** {'Yes' if approved else 'No'}",
                            "",
                        ]
                    )

                    if feedback:
                        md_lines.extend(
                            [
                                "**Feedback:**",
                                "",
                                f"> {feedback[:300]}{'...' if len(str(feedback)) > 300 else ''}",
                                "",
                            ]
                        )

                    # Show tool suggestions
                    tool_suggestions = iteration_data.get("tool_suggestions", [])
                    if tool_suggestions:
                        md_lines.extend(
                            [
                                f"**Tool Suggestions:** {len(tool_suggestions)}",
                                "",
                            ]
                        )
                        for ts in tool_suggestions[:5]:  # Limit to first 5
                            params = ts.get("parameters", {})
                            rationale = ts.get("rationale", "")
                            md_lines.append(
                                f"- Lines {params.get('start_line', '?')}-{params.get('end_line', '?')}: {rationale[:50]}..."
                            )
                        md_lines.append("")

        # Add LLM Processing Stages
        llm_stages = report.get("llm_stages", {})
        if llm_stages:
            md_lines.extend(
                [
                    "---",
                    "",
                    "## LLM Processing Metrics",
                    "",
                ]
            )

            # Check execution path
            if "fast_path_analysis" in llm_stages:
                md_lines.extend(
                    [
                        "### 🚀 Fast-Path Execution",
                        "",
                        "Single-stage analysis using shallow AST + full source code.",
                        "",
                    ]
                )
            elif two_agent_summary.get("enabled"):
                md_lines.extend(
                    [
                        "### 🤝 Two-Agent Execution",
                        "",
                        "Analyzer generates hypothesis, Critic evaluates and suggests tool calls. Loop continues until confidence threshold is met.",
                        "",
                    ]
                )
            else:
                md_lines.extend(
                    [
                        "### 🔧 Tool-Calling Execution",
                        "",
                        "Single-stage analysis with dynamic source reading: LLM analyzes shallow AST and calls `refer_to_source_code()` tool when needed.",
                        "",
                    ]
                )

            # Calculate totals
            total_input = sum(
                stage.get("input_tokens", 0) for stage in llm_stages.values()
            )
            total_output = sum(
                stage.get("output_tokens", 0) for stage in llm_stages.values()
            )
            total_time = sum(
                stage.get("elapsed_time_seconds", 0) for stage in llm_stages.values()
            )

            md_lines.extend(
                [
                    "#### Summary",
                    "",
                    "| Metric | Value |",
                    "|--------|-------|",
                    f"| Total Input Tokens | {total_input:,} |",
                    f"| Total Output Tokens | {total_output:,} |",
                    f"| Total Tokens | {total_input + total_output:,} |",
                    f"| Total Time | {total_time:.2f}s |",
                    f"| Stages | {len(llm_stages)} |",
                    "",
                    "#### Stage Details",
                    "",
                ]
            )

            for stage_name, stage_data in llm_stages.items():
                stage_label = stage_name.replace("_", " ").title()
                input_tok = stage_data.get("input_tokens", 0)
                output_tok = stage_data.get("output_tokens", 0)
                total_tok = stage_data.get("total_tokens", input_tok + output_tok)
                elapsed = stage_data.get("elapsed_time_seconds", 0)

                md_lines.extend(
                    [
                        f"**{stage_label}**",
                        "",
                        "| Metric | Value |",
                        "|--------|-------|",
                        f"| Input Tokens | {input_tok:,} |",
                        f"| Output Tokens | {output_tok:,} |",
                        f"| Total Tokens | {total_tok:,} |",
                        f"| Time | {elapsed:.2f}s |",
                        "",
                    ]
                )

                # Show token usage and speed
                total_tokens = stage_data.get("total_tokens", 0)
                tokens_per_second = total_tokens / elapsed if elapsed > 0 else 0
                md_lines.extend(
                    [
                        "**Throughput:**",
                        "",
                        f"- Tokens/Second: {tokens_per_second:.1f} tok/s",
                        f"- Input: {input_tok:,} tok | Output: {output_tok:,} tok | Total: {total_tok:,} tok",
                        "",
                    ]
                )

                # Show full LLM response
                llm_response = stage_data.get("llm_response", "")
                if llm_response:
                    md_lines.extend(
                        [
                            "<details>",
                            "<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>",
                            "",
                            "```json",
                            llm_response,
                            "```",
                            "",
                            "</details>",
                            "",
                        ]
                    )

        # Add Tool Call Records (for tool-calling architecture)
        tool_calls = report.get("tool_calls", [])
        if tool_calls:
            md_lines.extend(
                [
                    "---",
                    "",
                    "## Tool Call Records",
                    "",
                    f"**Total Tool Calls:** {len(tool_calls)}",
                    "",
                    "### Tool Call Summary",
                    "",
                    "| # | Tool | Line Range | Size | Duration | Timestamp |",
                    "|---|------|-----------|------|----------|-----------|",
                ]
            )

            # Calculate durations between tool calls
            tool_call_durations = []
            for i in range(len(tool_calls)):
                if i < len(tool_calls) - 1:
                    duration = tool_calls[i + 1].get("timestamp", 0) - tool_calls[
                        i
                    ].get("timestamp", 0)
                else:
                    duration = 0
                tool_call_durations.append(duration)

            import datetime as dt

            for idx, tool_call in enumerate(tool_calls, 1):
                tool_name = tool_call.get("tool_name", "unknown")
                args = tool_call.get("args", {})
                start_line = args.get("start_line", "?")
                end_line = args.get("end_line", "?")
                result_length = tool_call.get("result_length", 0)
                timestamp = tool_call.get("timestamp", 0)
                duration = (
                    tool_call_durations[idx - 1]
                    if idx - 1 < len(tool_call_durations)
                    else 0
                )

                # Format timestamp as human-readable
                timestamp_str = dt.datetime.fromtimestamp(timestamp).strftime(
                    "%H:%M:%S"
                )

                md_lines.append(
                    f"| {idx} | `{tool_name}` | {start_line}-{end_line} | {result_length:,}B | {duration:.2f}s | {timestamp_str} |"
                )

            md_lines.extend(
                [
                    "",
                    "### Tool Call Details",
                    "",
                ]
            )

            for idx, tool_call in enumerate(tool_calls, 1):
                tool_name = tool_call.get("tool_name", "unknown")
                args = tool_call.get("args", {})
                result_length = tool_call.get("result_length", 0)
                result_content = tool_call.get("result_content", "")
                timestamp = tool_call.get("timestamp", 0)

                import datetime as dt

                timestamp_str = dt.datetime.fromtimestamp(timestamp).strftime(
                    "%H:%M:%S.%f"
                )[
                    :-3
                ]  # Include milliseconds

                md_lines.extend(
                    [
                        f"#### Call #{idx}: {tool_name}",
                        "",
                        f"**Timestamp:** {timestamp_str}  ",
                        "**Arguments:**",
                        "",
                        "```json",
                        json.dumps(args, indent=2),
                        "```",
                        "",
                        f"**Result Size:** {result_length:,} bytes",
                        "",
                    ]
                )

                # Show the actual source code that was retrieved
                if result_content:
                    # Determine the language for syntax highlighting
                    lang = report.get("language", "text")
                    md_lines.extend(
                        [
                            "**Source Code Retrieved:**",
                            "",
                            f"```{lang}",
                            result_content,
                            "```",
                            "",
                        ]
                    )

        md_lines.extend(
            [
                "---",
                "",
                "*Report generated for IRIS AST transformation analysis*",
            ]
        )

        markdown_content = "\n".join(md_lines)

        # Write to file if output_path provided
        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(markdown_content)

        return markdown_content

    def _format_signature_graph_preview(self) -> str:
        """Format the signature graph for display in the markdown report.

        Shows the actual signature graph if captured in snapshots, otherwise
        returns a template example. Truncates large graphs to keep report
        manageable.
        """
        signature_graph = self.snapshots.get("signature_graph", {})
        if isinstance(signature_graph, dict) and signature_graph:
            try:
                graph_json = json.dumps(signature_graph, indent=2, ensure_ascii=False)
                if len(graph_json) > SIGNATURE_GRAPH_PREVIEW_MAX_LEN:
                    truncated = graph_json[:SIGNATURE_GRAPH_PREVIEW_MAX_LEN]
                    last_newline = truncated.rfind("\n")
                    if last_newline > 0:
                        truncated = truncated[:last_newline]
                    return truncated + "\n  ...(truncated for readability)"
                return graph_json
            except (json.JSONDecodeError, TypeError):
                pass

        preview_lines = [
            "{",
            '  "entities": [',
            "    {",
            '      "id": "entity_0",',
            '      "name": "exampleFunction",',
            '      "type": "function",',
            '      "signature": "function exampleFunction(arg)",',
            '      "line_range": [10, 25],',
            '      "depth": 0,',
            '      "parent_id": null,',
            '      "children_ids": ["entity_1"],',
            '      "calls": ["entity_2"]',
            "    }",
            "  ]",
            "}",
        ]
        return "\n".join(preview_lines)

    def generate_signature_graph_json(self, output_path: Optional[str] = None) -> str:
        """Generate a standalone JSON file with the signature graph.

        Args:
            output_path: Optional file path to write the JSON file.
                        If None, only returns the JSON string.

        Returns:
            JSON string of the signature graph with metadata.
        """
        signature_graph = self.snapshots.get("signature_graph", {})

        if not signature_graph:
            output = {
                "filename": self.filename,
                "language": self.language,
                "error": "No signature graph captured during analysis",
                "signature_graph": None,
            }
        else:
            output = {
                "filename": self.filename,
                "language": self.language,
                "signature_graph": signature_graph,
            }

        json_content = json.dumps(output, indent=2, ensure_ascii=False)

        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(json_content)

        return json_content

    def set_source_code_file_hash(self, file_hash: str) -> None:
        """Set the file hash of the source code being analyzed.

        Args:
            file_hash: Hash string representing the source code.
        """
        self._source_code_file_hash = file_hash
