"""Shallow AST Debugger for IRIS analysis pipeline.

Monitors and validates the transformation of raw source code into a Shallow AST.
Provides diagnostic snapshots and verification reports.
Also tracks LLM processing metrics (tokens, timing, responses).
"""

from __future__ import annotations

# NOTE: line above is used to enable postponed evaluation of annotations (PEP 563)
# this helps developers to write type hints without worrying about import order

import copy
import json
import time
from typing import Any, Dict, List, Optional, Set, Tuple


class ShallowASTDebugger:
    """Diagnostic utility for monitoring Shallow AST transformation.

    Captures data at various pipeline stages and provides metrics
    for validating the quality of the AST compression.
    Also tracks LLM processing metrics (tokens, timing, responses).
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

        # LLM tracking
        self.llm_stages: Dict[str, Dict[str, Any]] = {}
        self._current_stage: Optional[str] = None
        self._stage_start_time: Optional[float] = None

        # Tool call tracking (for tool-calling architecture)
        self.tool_calls: List[Dict[str, Any]] = []

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
            }
        )

    def get_report(self) -> Dict[str, Any]:
        """Generate a comprehensive diagnostic report.

        Includes execution path summary, metrics, and LLM tracking.

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
        metrics = report.get("metrics", {})
        summary = report.get("summary", {})
        snapshots = report.get("snapshots", {})

        # Determine execution path from LLM stages
        llm_stages = report.get("llm_stages", {})
        if "fast_path_analysis" in llm_stages:
            execution_path = "🚀 Fast-Path (Single-Stage)"
            execution_badge = (
                "![Fast-Path](https://img.shields.io/badge/Execution-Fast--Path-blue)"
            )
        elif "tool_calling_analysis" in llm_stages:
            execution_path = (
                "🔧 Tool-Calling (Single-Stage with Dynamic Source Reading)"
            )
            execution_badge = "![Tool-Calling](https://img.shields.io/badge/Execution-Tool--Calling-orange)"
        else:
            execution_path = "❓ Unknown"
            execution_badge = (
                "![Unknown](https://img.shields.io/badge/Execution-Unknown-gray)"
            )

        # Check if AST was processed (metrics will be non-zero)
        ast_processed = metrics.get("full_ast_node_count", 0) > 0

        md_lines = [
            "# IRIS Debug Report",
            "",
            f"**File:** `{report['filename']}`  ",
            f"**Language:** `{report['language']}`  ",
            f"**Execution Path:** {execution_path}  ",
            "",
        ]

        # Only show transformation pipeline if AST was processed
        if ast_processed:
            md_lines.extend(
                [
                    "---",
                    "",
                    "## Transformation Pipeline Visualization",
                    "",
                ]
            )
        else:
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

        # Add source code snapshot
        raw_source = snapshots.get("raw_source", "") or self._source_code
        if raw_source:
            source_preview = raw_source[:300] if len(raw_source) > 300 else raw_source
            lines_count = len(raw_source.splitlines())
            source_bytes = len(raw_source.encode("utf-8"))
            md_lines.extend(
                [
                    f"**Total Lines:** {lines_count}  ",
                    f"**Size:** {source_bytes:,} bytes",
                    "",
                    "```" + report["language"],
                    source_preview
                    + ("...(truncated)" if len(raw_source) > 300 else ""),
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
        elif llm_stages:
            md_lines.extend(
                [
                    "---",
                    "",
                    "## LLM Processing Pipeline",
                    "",
                ]
            )

            for stage_name, stage_data in llm_stages.items():
                md_lines.extend(
                    [
                        f"### Stage: {stage_name.upper()}",
                        "",
                        "**Metrics:**",
                        "",
                        "| Metric | Value |",
                        "|--------|-------|",
                        f"| Input Tokens | {stage_data.get('input_tokens', 0):,} |",
                        f"| Output Tokens | {stage_data.get('output_tokens', 0):,} |",
                        f"| Total Tokens | {stage_data.get('total_tokens', 0):,} |",
                        f"| Elapsed Time | {stage_data.get('elapsed_time_seconds', 0):.2f}s |",
                        "",
                    ]
                )

                # Add LLM response preview
                llm_response = stage_data.get("llm_response", "")
                if llm_response:
                    # don't cut off LLM response
                    # fully display all of the responses
                    response_preview = llm_response

                    # if response_preview doesn't start with ```json, add it
                    if not response_preview.lstrip().startswith("```json"):
                        response_preview = "```json\n" + response_preview + "\n```"
                    md_lines.extend(
                        [
                            "**LLM Response (Preview):**",
                            "",
                            response_preview
                            + ("...(truncated)" if len(llm_response) > 300 else ""),
                            "```",
                            "```",
                            "",
                        ]
                    )

                # Add parsed output if available
                parsed_output = stage_data.get("parsed_output")
                if parsed_output:
                    md_lines.extend(
                        [
                            "**Parsed Output:**",
                            "",
                            "```json",
                            json.dumps(parsed_output, indent=2)[:500]
                            + (
                                "..."
                                if len(json.dumps(parsed_output, indent=2)) > 500
                                else ""
                            ),
                            "```",
                            "",
                        ]
                    )

                md_lines.append("")

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
                max_length = 2000
                if len(graph_json) > max_length:
                    truncated = graph_json[:max_length]
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
