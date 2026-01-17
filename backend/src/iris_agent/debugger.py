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

    # Language-specific keywords for integrity verification
    KEYWORD_ANCHORS: Dict[str, Set[str]] = {
        "python": {"def", "class", "async", "import", "from", "if", "for", "while"},
        "javascript": {"function", "class", "const", "let", "var", "import", "export"},
        "typescript": {
            "function",
            "class",
            "const",
            "let",
            "var",
            "import",
            "export",
            "interface",
            "type",
        },
        "jsx": {"function", "class", "const", "let", "var", "import", "export"},
        "tsx": {
            "function",
            "class",
            "const",
            "let",
            "var",
            "import",
            "export",
            "interface",
            "type",
        },
    }

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
            self._source_code = data

    def compute_metrics(
        self, full_tree_node_count: int, shallow_ast: Dict[str, Any], source_code: str
    ) -> None:
        """Calculate quantitative metrics for AST compression quality.

        Args:
            full_tree_node_count: Total number of nodes in the full Tree-sitter AST.
            shallow_ast: The optimized shallow AST representation.
            source_code: The original source code.
        """
        self._full_ast_node_count = full_tree_node_count

        # Capture the shallow AST snapshot for reporting
        self.capture_snapshot("shallow_ast", shallow_ast)

        # Count nodes in shallow AST
        shallow_node_count = self._count_shallow_nodes(shallow_ast)

        # Calculate Node Reduction Ratio
        node_reduction_ratio = (
            full_tree_node_count / shallow_node_count if shallow_node_count > 0 else 0
        )

        # Calculate Context Compression Ratio
        raw_source_bytes = len(source_code.encode("utf-8"))
        shallow_ast_json = json.dumps(shallow_ast)
        json_bytes = len(shallow_ast_json.encode("utf-8"))
        context_compression_ratio = (
            raw_source_bytes / json_bytes if json_bytes > 0 else 0
        )

        # Calculate Comment Retention Score
        comment_retention_score = self._calculate_comment_retention_score(shallow_ast)

        self.metrics = {
            "node_reduction_ratio": round(node_reduction_ratio, 2),
            "context_compression_ratio": round(context_compression_ratio, 2),
            "comment_retention_score": round(comment_retention_score, 2),
            "full_ast_node_count": full_tree_node_count,
            "shallow_ast_node_count": shallow_node_count,
            "raw_source_bytes": raw_source_bytes,
            "json_bytes": json_bytes,
            "full_ast_estimated_tokens": self._estimate_tokens(full_tree_node_count),
            "shallow_ast_estimated_tokens": self._estimate_tokens(shallow_node_count),
        }

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

    def _estimate_tokens(self, node_count: int) -> int:
        """Estimate token count based on node count.

        Rough estimation: ~3-4 tokens per AST node
        """
        return max(1, int(node_count * 3.5))

    def verify_integrity(self, source_code: str, shallow_ast: Dict[str, Any]) -> None:
        """Recursively verify that shallow AST nodes match the source code.

        For each node with a line_range, extracts the source text and verifies:
        1. The extracted text begins with a language-specific keyword.
        2. The node's name property appears within the first line.

        Args:
            source_code: The original source code.
            shallow_ast: The shallow AST representation.
        """
        self._source_code = source_code

        lines = source_code.splitlines()
        passed_checks = 0
        total_checks = 0

        # Recursively traverse and verify all nodes
        def traverse_and_verify(node: Dict[str, Any]) -> Tuple[int, int]:
            nonlocal passed_checks, total_checks

            checks_passed, checks_total = 0, 0

            # Verify this node if it has a line_range
            if "line_range" in node and node["line_range"] is not None:
                checks_total += 1
                total_checks += 1

                line_range = node["line_range"]
                start_line, end_line = line_range[0], line_range[1]

                # Extract source text (convert from 1-based to 0-based indexing)
                try:
                    extracted_text = "\n".join(lines[start_line - 1 : end_line])

                    # Verify keyword anchor
                    keyword_found = self._verify_keyword_anchor(node, extracted_text)

                    # Verify name presence
                    name_found = True
                    if "name" in node:
                        name = node["name"]
                        # Check if name appears in first line of extracted text
                        first_line = (
                            extracted_text.split("\n")[0] if extracted_text else ""
                        )
                        name_found = name in first_line

                    if keyword_found and name_found:
                        checks_passed += 1
                        passed_checks += 1
                except (IndexError, ValueError):
                    # Line range is out of bounds
                    pass

            # Recursively verify children
            if "children" in node and isinstance(node["children"], list):
                for child in node["children"]:
                    child_passed, child_total = traverse_and_verify(child)
                    checks_passed += child_passed
                    checks_total += child_total

            # Recursively verify fields
            if "fields" in node and isinstance(node["fields"], dict):
                for field_list in node["fields"].values():
                    if isinstance(field_list, list):
                        for child in field_list:
                            if isinstance(child, dict):
                                child_passed, child_total = traverse_and_verify(child)
                                checks_passed += child_passed
                                checks_total += child_total

            return checks_passed, checks_total

        # Run verification
        passed_checks, total_checks = traverse_and_verify(shallow_ast)

        # Calculate integrity score
        integrity_score = (
            (passed_checks / total_checks * 100) if total_checks > 0 else 0
        )

        self.metrics["integrity_checks_passed"] = passed_checks
        self.metrics["integrity_checks_total"] = total_checks
        self.metrics["integrity_score"] = round(integrity_score, 2)

    def _count_shallow_nodes(self, node: Dict[str, Any]) -> int:
        """Count all named nodes in the shallow AST.

        Recursively counts nodes with explicit 'type' or 'name' fields.
        """
        count = 1  # Count this node

        # Count children
        if "children" in node and isinstance(node["children"], list):
            for child in node["children"]:
                if isinstance(child, dict):
                    count += self._count_shallow_nodes(child)

        # Count nodes in fields
        if "fields" in node and isinstance(node["fields"], dict):
            for field_list in node["fields"].values():
                if isinstance(field_list, list):
                    for child in field_list:
                        if isinstance(child, dict):
                            count += self._count_shallow_nodes(child)

        return count

    def _calculate_comment_retention_score(self, shallow_ast: Dict[str, Any]) -> float:
        """Calculate percentage of declaration nodes that retained comments.

        Declaration types include: function_declaration, class_declaration,
        method_definition, interface_declaration, type_declaration, etc.
        """
        declaration_types = {
            "function_declaration",
            "class_declaration",
            "method_definition",
            "interface_declaration",
            "type_declaration",
            "export_statement",
            "import_declaration",
            "function",
            "class",
        }

        total_declarations = 0
        declarations_with_comments = 0

        def traverse_for_declarations(node: Dict[str, Any]) -> None:
            nonlocal total_declarations, declarations_with_comments

            node_type = node.get("type", "").lower()

            # Check if this is a declaration node
            if any(decl in node_type for decl in declaration_types):
                total_declarations += 1

                # Check if it has at least one comment
                has_comment = (
                    node.get("leading_comment") is not None
                    or node.get("trailing_comment") is not None
                    or node.get("inline_comment") is not None
                )

                if has_comment:
                    declarations_with_comments += 1

            # Recursively traverse children
            if "children" in node and isinstance(node["children"], list):
                for child in node["children"]:
                    if isinstance(child, dict):
                        traverse_for_declarations(child)

            # Recursively traverse fields
            if "fields" in node and isinstance(node["fields"], dict):
                for field_list in node["fields"].values():
                    if isinstance(field_list, list):
                        for child in field_list:
                            if isinstance(child, dict):
                                traverse_for_declarations(child)

        traverse_for_declarations(shallow_ast)

        # Return percentage
        if total_declarations == 0:
            return 100.0  # No declarations = perfect score

        return (declarations_with_comments / total_declarations) * 100

    def _verify_keyword_anchor(self, node: Dict[str, Any], extracted_text: str) -> bool:
        """Verify that extracted text begins with a language-specific keyword.

        Args:
            node: The AST node being verified.
            extracted_text: The source code text extracted from line_range.

        Returns:
            True if keyword is found, False otherwise.
        """
        keywords = self.KEYWORD_ANCHORS.get(self.language, set())

        if not keywords:
            # Language not recognized, skip verification
            return True

        # Normalize and check first line
        first_line = extracted_text.split("\n")[0].strip() if extracted_text else ""

        # Check if any keyword appears at the start
        for keyword in keywords:
            if first_line.startswith(keyword):
                return True

        # Also allow comment lines or decorators (lines starting with # or @)
        if first_line.startswith("#") or first_line.startswith("@"):
            return True

        return False

    def get_report(self) -> Dict[str, Any]:
        """Generate a comprehensive diagnostic report.

        Includes execution path summary, metrics, integrity scores, and LLM tracking.

        Returns:
            Dictionary containing filename, language, snapshots, metrics,
            and a summary of the analysis quality.
        """
        integrity_score = self.metrics.get("integrity_score", 0)
        has_quality_warning = integrity_score < 100

        return {
            "filename": self.filename,
            "language": self.language,
            "snapshots": self.snapshots,
            "metrics": self.metrics,
            "llm_stages": self.llm_stages,
            "tool_calls": self.tool_calls,
            "tool_call_count": len(self.tool_calls),
            "summary": {
                "integrity_score": integrity_score,
                "has_quality_warning": has_quality_warning,
                "node_reduction_ratio": self.metrics.get("node_reduction_ratio", 0),
                "context_compression_ratio": self.metrics.get(
                    "context_compression_ratio", 0
                ),
                "comment_retention_score": self.metrics.get(
                    "comment_retention_score", 0
                ),
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

        # Metrics Section
        print(f"\n{BOLD}Compression Metrics:{END}")
        metrics = report.get("metrics", {})

        node_reduction = metrics.get("node_reduction_ratio", 0)
        compression = metrics.get("context_compression_ratio", 0)
        comment_retention = metrics.get("comment_retention_score", 0)

        print(
            f"  Node Reduction Ratio:        {node_reduction:.2f}x "
            f"({metrics.get('full_ast_node_count', 0)} → {metrics.get('shallow_ast_node_count', 0)} nodes)"
        )
        print(
            f"  Context Compression Ratio:   {compression:.2f}x "
            f"({metrics.get('raw_source_bytes', 0)} → {metrics.get('json_bytes', 0)} bytes)"
        )
        print(f"  Comment Retention Score:     {comment_retention:.1f}%")

        # Integrity Section
        print(f"\n{BOLD}Integrity Verification:{END}")
        integrity_score = metrics.get("integrity_score", 0)
        integrity_passed = metrics.get("integrity_checks_passed", 0)
        integrity_total = metrics.get("integrity_checks_total", 0)

        # Color integrity score based on value
        if integrity_score >= 100:
            score_color = GREEN
            score_status = "✓ PERFECT"
        elif integrity_score >= 80:
            score_color = GREEN
            score_status = "✓ GOOD"
        elif integrity_score >= 60:
            score_color = YELLOW
            score_status = "⚠ FAIR"
        else:
            score_color = RED
            score_status = "✗ POOR"

        print(
            f"  Integrity Score:             {score_color}{integrity_score:.1f}%{END} {score_status}"
        )
        print(f"  Checks Passed:               {integrity_passed}/{integrity_total}")

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

        integrity_score = metrics.get("integrity_score", 0)

        # Determine status badge
        if integrity_score >= 100:
            status_badge = "✅ PERFECT"
        elif integrity_score >= 80:
            status_badge = "✅ GOOD"
        elif integrity_score >= 60:
            status_badge = "⚠️ FAIR"
        else:
            status_badge = "❌ POOR"

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
        elif "stage_1_identification" in llm_stages or "stage_2_analysis" in llm_stages:
            execution_path = "🔄 Two-Stage (Identification + Analysis)"
            execution_badge = (
                "![Two-Stage](https://img.shields.io/badge/Execution-Two--Stage-green)"
            )
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
            f"**Status:** {status_badge} {execution_badge}",
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
            source_preview = raw_source[:500] if len(raw_source) > 500 else raw_source
            lines_count = len(raw_source.splitlines())
            source_bytes = len(raw_source.encode("utf-8"))
            md_lines.extend(
                [
                    f"**Total Lines:** {lines_count}  ",
                    f"**Size:** {source_bytes:,} bytes",
                    "",
                    "```" + report["language"],
                    source_preview
                    + ("...(truncated)" if len(raw_source) > 500 else ""),
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

        # Only show AST sections if AST was processed
        if ast_processed:
            md_lines.extend(
                [
                    "### Stage 2: Full AST (Before Compression)",
                    "",
                    f"**Total Nodes:** {metrics.get('full_ast_node_count', 0)}  ",
                    f"**Structure:** Complete Tree-sitter parse tree",
                    "",
                    "**Key Characteristics:**",
                    "- All implementation details are present",
                    "- Nested bodies and statements fully expanded",
                    "- Comprehensive but verbose JSON structure",
                    "- Ready for detailed analysis but heavy for transmission",
                    "",
                    "```json",
                    "{",
                    '  "type": "root",',
                    '  "children": [',
                    "    {",
                    '      "type": "declaration",',
                    '      "children": [',
                    '        { "type": "identifier", "value": "..." },',
                    '        { "type": "body", "children": [',
                    '          { "type": "statement", "children": [...] },',
                    '          { "type": "statement", "children": [...] }',
                    "        ] }",
                    "      ]",
                    "    },",
                    '    { "type": "declaration", "children": [...] },',
                    '    { "type": "statement", "children": [...] }',
                    "  ]",
                    "}",
                    "```",
                    "",
                ]
            )

            md_lines.extend(
                [
                    "### Stage 3: Shallow AST (After Compression)",
                    "",
                    f"**Total Nodes:** {metrics.get('shallow_ast_node_count', 0)}  ",
                    f"**Compression:** {metrics.get('node_reduction_ratio', 0):.2f}x reduction  ",
                    f"**Size:** {metrics.get('json_bytes', 0):,} bytes",
                    "",
                    "**Key Characteristics:**",
                    "- Implementation bodies collapsed to `line_range` references",
                    "- Function signatures and declarations preserved",
                    "- Comments extracted and attached to nodes",
                    "- Lightweight JSON for semantic analysis",
                    "",
                    "```json",
                ]
            )

            # Add shallow AST preview
            shallow_ast_preview = self._format_shallow_ast_preview()
            md_lines.append(shallow_ast_preview)
            md_lines.extend(
                [
                    "```",
                    "",
                ]
            )

            # Add transformation summary
            md_lines.extend(
                [
                    "### Transformation Summary",
                    "",
                    "| Stage | Nodes | Size | Purpose |",
                    "|-------|-------|------|---------|",
                    f"| Full AST | {metrics.get('full_ast_node_count', 0)} | {metrics.get('raw_source_bytes', 0):,}B | Complete parse tree |",
                    f"| Shallow AST | {metrics.get('shallow_ast_node_count', 0)} | {metrics.get('json_bytes', 0):,}B | Semantic analysis |",
                    f"| **Reduction** | **{metrics.get('node_reduction_ratio', 0):.2f}x** | **{metrics.get('context_compression_ratio', 0):.2f}x** | **Efficiency gain** |",
                    "",
                ]
            )

        # Only show compression metrics if AST was processed
        if ast_processed:
            md_lines.extend(
                [
                    "### Transformation Summary",
                    "",
                    "| Stage | Nodes | Size | Purpose |",
                    "|-------|-------|------|---------|",
                    f"| Full AST | {metrics.get('full_ast_node_count', 0)} | {metrics.get('raw_source_bytes', 0):,}B | Complete parse tree |",
                    f"| Shallow AST | {metrics.get('shallow_ast_node_count', 0)} | {metrics.get('json_bytes', 0):,}B | Semantic analysis |",
                    f"| **Reduction** | **{metrics.get('node_reduction_ratio', 0):.2f}x** | **{metrics.get('context_compression_ratio', 0):.2f}x** | **Efficiency gain** |",
                    "",
                ]
            )

            md_lines.extend(
                [
                    "---",
                    "",
                    "## Compression Metrics (AST Transformation)",
                    "",
                    "| Metric | Value |",
                    "|--------|-------|",
                    f"| Node Reduction Ratio | {metrics.get('node_reduction_ratio', 0):.2f}x |",
                    f"| Context Compression Ratio | {metrics.get('context_compression_ratio', 0):.2f}x |",
                    f"| Comment Retention Score | {metrics.get('comment_retention_score', 0):.1f}% |",
                    f"| Full AST Nodes | {metrics.get('full_ast_node_count', 0)} |",
                    f"| Shallow AST Nodes | {metrics.get('shallow_ast_node_count', 0)} |",
                    f"| Full AST Estimated Tokens | {metrics.get('full_ast_estimated_tokens', 0):,} |",
                    f"| Shallow AST Estimated Tokens | {metrics.get('shallow_ast_estimated_tokens', 0):,} |",
                    f"| Source Bytes | {metrics.get('raw_source_bytes', 0):,} |",
                    f"| JSON Bytes | {metrics.get('json_bytes', 0):,} |",
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
            elif "tool_calling_analysis" in llm_stages:
                md_lines.extend(
                    [
                        "### 🔧 Tool-Calling Execution",
                        "",
                        "Single-stage analysis with dynamic source reading: LLM analyzes shallow AST and calls `refer_to_source_code()` tool when needed.",
                        "",
                    ]
                )
            else:
                md_lines.extend(
                    [
                        "### 🔄 Two-Stage Execution",
                        "",
                        "Multi-stage analysis: Identification → Source Reading → Analysis.",
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
                "## Integrity Verification",
                "",
                f"**Integrity Score:** `{metrics.get('integrity_score', 0):.1f}%`",
                "",
                f"**Checks:** {metrics.get('integrity_checks_passed', 0)}/{metrics.get('integrity_checks_total', 0)} passed",
                "",
            ]
        )

        # Add quality assessment
        has_warning = summary.get("has_quality_warning", False)

        if has_warning:
            md_lines.extend(
                [
                    "### ⚠️ Quality Warning",
                    "",
                    "Integrity score is below 100%. Some structural elements may not have been fully verified.",
                    "",
                ]
            )
        else:
            md_lines.extend(
                [
                    "### ✅ All Checks Passed",
                    "",
                    "AST transformation quality is within acceptable ranges.",
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

    def _format_shallow_ast_preview(self) -> str:
        """Format the shallow AST for display in the markdown report.

        Shows the actual shallow AST if captured in snapshots, otherwise
        returns a template example. Truncates large ASTs to keep report manageable.
        """
        snapshots = self.snapshots

        # Try to get the actual shallow AST from snapshots
        if "shallow_ast" in snapshots and snapshots["shallow_ast"]:
            shallow_ast = snapshots["shallow_ast"]
            try:
                # Format as pretty JSON
                shallow_ast_json = json.dumps(shallow_ast, indent=2, ensure_ascii=False)

                # Truncate if too large (keep first 2000 chars to fit in report)
                max_length = 2000
                if len(shallow_ast_json) > max_length:
                    truncated = shallow_ast_json[:max_length]
                    # Find the last complete object/line to avoid breaking JSON
                    last_newline = truncated.rfind("\n")
                    if last_newline > 0:
                        truncated = truncated[:last_newline]
                    return truncated + "\n  ...(truncated for readability)"
                else:
                    return shallow_ast_json
            except (json.JSONDecodeError, TypeError):
                # If JSON serialization fails, fall back to template
                pass

        # Fallback: return template example
        preview_lines = [
            "{",
            '  "type": "module/program",',
            '  "children": [',
            "    {",
            '      "type": "function_declaration",',
            '      "name": "exampleFunction",',
            '      "line_range": [10, 25],',
            '      "leading_comment": "// Documentation...",',
            '      "children": [...]',
            "    },",
            "    {",
            '      "type": "class_declaration",',
            '      "name": "ExampleClass",',
            '      "line_range": [27, 50],',
            '      "fields": {',
            '        "methods": [',
            "          {",
            '            "type": "method_definition",',
            '            "name": "exampleMethod",',
            '            "line_range": [30, 40]',
            "          }",
            "        ]",
            "      }",
            "    }",
            "  ]",
            "}",
        ]
        return "\n".join(preview_lines)

    def generate_shallow_ast_json(self, output_path: Optional[str] = None) -> str:
        """Generate a standalone JSON file with the complete shallow AST.

        This creates a separate JSON file containing the full, untruncated shallow AST
        for detailed analysis and debugging purposes.

        Args:
            output_path: Optional file path to write the JSON file.
                        If None, only returns the JSON string.

        Returns:
            JSON string of the shallow AST with metadata.
        """
        shallow_ast = self.snapshots.get("shallow_ast", {})

        if not shallow_ast:
            # No shallow AST was captured, return empty
            output = {
                "filename": self.filename,
                "language": self.language,
                "error": "No shallow AST captured during analysis",
                "shallow_ast": None,
            }
        else:
            output = {
                "filename": self.filename,
                "language": self.language,
                "metrics": self.metrics,
                "shallow_ast": shallow_ast,
            }

        json_content = json.dumps(output, indent=2, ensure_ascii=False)

        # Write to file if output_path provided
        if output_path:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(json_content)

        return json_content
