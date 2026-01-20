"""IRIS agent orchestrator with two-stage analysis.

Stage 1: Identify unclear parts from shallow AST
Stage 2: Analyze with AST + read source code
"""

from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional, TYPE_CHECKING, cast

from openai import OpenAI

from .prompts import (
    ANALYSIS_OUTPUT_SCHEMA,
    ANALYSIS_SYSTEM_PROMPT,
    TOOL_CALLING_SYSTEM_PROMPT,
    FAST_PATH_SYSTEM_PROMPT,
    IDENTIFICATION_SYSTEM_PROMPT,
    build_analysis_prompt,
    build_signature_graph_analysis_prompt,
    build_tool_calling_prompt,
    build_signature_graph_prompt,
    build_fast_path_prompt,
    build_identification_prompt,
    build_signature_graph_identification_prompt,
    build_raw_source_prompt,
)
from .source_store import SourceStore
from .tools.source_reader import SourceReader
from .tools.tool_definitions import IRIS_TOOLS

if TYPE_CHECKING:
    from .debugger import ShallowASTDebugger


class IrisAgent:
    """Two-stage agent for File Intent + Responsibility Blocks extraction."""

    # Fast-path thresholds for single-stage analysis
    FAST_PATH_LINE_THRESHOLD = 200
    FAST_PATH_TOKEN_THRESHOLD = 2000

    def __init__(self, model: str = "gpt-4o-mini", api_key: str | None = None):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        # Safety limit for tool-calling loop
        self.MAX_TOOL_CALLS: int = 30

    def _run_tool_calling_analysis(
        self,
        filename: str,
        language: str,
        shallow_ast: Dict[str, Any],
        source_store: SourceStore,
        file_hash: str,
        debugger: Optional["ShallowASTDebugger"] = None,
        signature_graph: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Single-stage analysis with OpenAI tool-calling.

        The LLM analyzes the shallow AST and calls refer_to_source_code()
        when it needs to see actual implementation details.

        Follows OpenAI function calling specification:
        https://platform.openai.com/docs/guides/function-calling
        """
        source_reader = SourceReader(source_store, file_hash)

        prompt_structure = signature_graph if signature_graph else shallow_ast
        if signature_graph:
            user_prompt = build_signature_graph_prompt(
                filename, language, signature_graph
            )
        else:
            user_prompt = build_tool_calling_prompt(filename, language, shallow_ast)

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": TOOL_CALLING_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        tool_call_count = 0
        total_input_tokens = 0
        total_output_tokens = 0
        all_responses: List[str] = []
        stage_start_time = time.time()

        while tool_call_count < self.MAX_TOOL_CALLS:
            # Call OpenAI API with tools
            response = self.client.chat.completions.create(
                model=self.model,
                messages=cast(Any, messages),
                tools=cast(Any, IRIS_TOOLS),
                tool_choice="auto",
                temperature=0.1,
            )

            assistant_message = response.choices[0].message

            # Track token usage from response
            if response.usage:
                # For the first call, take prompt tokens
                # For subsequent calls, only count completion tokens (prompt is the full message history)
                if tool_call_count == 0:
                    total_input_tokens += response.usage.prompt_tokens
                total_output_tokens += response.usage.completion_tokens
            else:
                # Fallback: estimate tokens if usage not provided by API
                if tool_call_count == 0:
                    total_input_tokens += self._estimate_tokens_for_prompt(
                        filename, language, prompt_structure
                    )
                # Estimate output tokens from response content
                content = assistant_message.content or ""
                tool_calls = getattr(assistant_message, "tool_calls", None)
                total_response = content
                if tool_calls:
                    for tc in tool_calls:
                        total_response += tc.function.arguments
                total_output_tokens += self._estimate_tokens_for_response(
                    total_response
                )

            # Store response for debugging
            if assistant_message.content:
                all_responses.append(assistant_message.content)

            # Check if LLM wants to call tools
            tool_calls = getattr(assistant_message, "tool_calls", None)

            if tool_calls:
                # Step 1: Append the assistant's response (with tool calls) to message history
                # This is critical for the API to understand the conversation context
                messages.append(
                    {
                        "role": "assistant",
                        "content": assistant_message.content or "",
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments,
                                },
                            }
                            for tc in tool_calls
                        ],
                    }
                )

                # Step 2: Process each tool call and collect results
                for tc in tool_calls:
                    tool_call_count += 1

                    # Only handle refer_to_source_code function
                    if tc.function.name == "refer_to_source_code":
                        try:
                            args = json.loads(tc.function.arguments)
                            start_line = int(args.get("start_line", 0))
                            end_line = int(args.get("end_line", 0))
                        except (json.JSONDecodeError, TypeError, ValueError):
                            snippet = "Error: Invalid tool arguments"
                            args = {}
                            start_line = 0
                            end_line = 0

                        # Execute the tool
                        if start_line < 1 or end_line < start_line:
                            snippet = (
                                f"Error: Invalid line range [{start_line}, {end_line}]"
                            )
                        else:
                            snippet = source_reader.refer_to_source_code(
                                start_line, end_line, reason="LLM requested"
                            )

                        # Log tool call if debugger available
                        if debugger and hasattr(debugger, "log_tool_call"):
                            debugger.log_tool_call(
                                tool_name="refer_to_source_code",
                                args={"start_line": start_line, "end_line": end_line},
                                result_length=len(snippet),
                                result_content=snippet,
                            )

                        # Step 3: Append tool result to message history
                        # This tells the LLM what the tool returned
                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": tc.id,
                                "content": snippet,
                            }
                        )

                # Step 4: Continue loop - LLM will process tool results and respond again
                continue

            # No tool calls - LLM has returned final answer
            content = assistant_message.content
            if content is None:
                raise ValueError("LLM returned empty response in tool-calling analysis")

            # Parse the JSON response
            result = self._parse_analysis_response(content)

            # Validate result has required fields
            if "file_intent" not in result or "responsibilities" not in result:
                raise ValueError(
                    f"LLM response missing required fields. Got keys: {list(result.keys())}"
                )

            # Calculate elapsed time
            stage_elapsed = time.time() - stage_start_time

            # Attach metadata about tool usage
            result.setdefault("metadata", {})
            result["metadata"]["tool_reads"] = [
                {"start_line": r.start_line, "end_line": r.end_line, "reason": r.reason}
                for r in source_reader.get_log()
            ]
            result["metadata"]["execution_path"] = "tool-calling"
            result["metadata"]["tool_call_count"] = tool_call_count

            # Record LLM metrics if debugger is available
            if debugger:
                # Combine all responses for logging
                full_response = "\n".join(all_responses) if all_responses else content
                debugger.end_llm_stage(
                    "tool_calling_analysis",
                    input_tokens=total_input_tokens,
                    output_tokens=total_output_tokens,
                    llm_response=full_response,
                    parsed_output=result,
                )

            return result

        # Safety: max tool calls exceeded
        raise RuntimeError(f"Exceeded maximum tool calls ({self.MAX_TOOL_CALLS})")

    def analyze(
        self,
        filename: str,
        language: str,
        shallow_ast: Dict[str, Any],
        source_store: SourceStore,
        file_hash: str,
        signature_graph: Dict[str, Any] | None = None,
        debug_report: Dict[str, Any] | None = None,
        source_code: str = "",
        debugger: ShallowASTDebugger | None = None,
        use_tool_calling: bool = True,
    ) -> Dict[str, Any]:
        """Run analysis on a file with selectable execution path.

        Execution paths (in priority order):
        1. Fast-Path: Single-stage analysis for small files (< 200 lines / 2000 tokens)
        2. Tool-Calling: Single-stage with on-demand source reading (NEW default)
        3. Two-Stage: Identify unclear parts → Read source → Generate results (legacy)

        Args:
            filename: Name of the file being analyzed.
            language: Programming language identifier.
            shallow_ast: Shallow AST representation from processor.
            signature_graph: Optional signature graph representation.
            source_store: Store containing source code snippets.
            file_hash: Hash of the source file for caching.
            debug_report: Optional debug report from ShallowASTDebugger.
            source_code: Source code of the file (required for fast-path).
            debugger: Optional ShallowASTDebugger instance for LLM tracking.
            use_tool_calling: Enable tool-calling mode (default: True). If False, use legacy two-stage.
        """
        prompt_structure = signature_graph if signature_graph else shallow_ast

        # =====================================================================
        # ROUTING: Decide between Fast-Path, Tool-Calling, and Two-Stage analysis
        # =====================================================================
        if self._should_use_fast_path(source_code):
            print(f"[FAST-PATH] Analyzing {filename} in single-stage mode...")

            # Track fast-path stage in debugger
            if debugger:
                debugger.start_llm_stage("fast_path_analysis")

            result = self._run_fast_path_analysis(
                filename,
                language,
                shallow_ast,
                source_code,
                debugger,
                signature_graph=signature_graph,
            )
            result["metadata"]["execution_path"] = "fast-path"
            result["metadata"]["tool_reads"] = []  # No tool reads in fast-path

            # Add debug stats if available
            if debug_report:
                result["metadata"]["debug_stats"] = debug_report.get("summary", {})
                self._add_quality_warnings(result, debug_report)

            print(f"[FAST-PATH] Complete!")
            print(f"  - File Intent: {result['file_intent'][:80]}...")
            print(f"  - Responsibilities: {len(result['responsibilities'])}")
            return result

            # =====================================================================
        # TOOL-CALLING MODE (New default)
        # =====================================================================
        if use_tool_calling:
            print(
                f"[TOOL-CALLING] Analyzing {filename} with on-demand source reading..."
            )

            if debugger:
                debugger.start_llm_stage("tool_calling_analysis")

            try:
                result = self._run_tool_calling_analysis(
                    filename,
                    language,
                    shallow_ast,
                    source_store,
                    file_hash,
                    debugger,
                    signature_graph=signature_graph,
                )

                # Add debug stats if available
                if debug_report:
                    result["metadata"]["debug_stats"] = debug_report.get("summary", {})
                    self._add_quality_warnings(result, debug_report)

                print(f"[TOOL-CALLING] Complete!")
                print(f"  - File Intent: {result['file_intent'][:80]}...")
                print(f"  - Responsibilities: {len(result['responsibilities'])}")
                print(f"  - Tool Calls: {result['metadata'].get('tool_call_count', 0)}")
                return result
            except Exception as e:
                print(f"[TOOL-CALLING] Error occurred: {e}")
                print(f"[FALLBACK] Falling back to two-stage analysis...")

        # =====================================================================
        # LEGACY TWO-STAGE MODE
        # =====================================================================
        print(f"[STAGE 1] Identifying unclear parts in {filename}...")

        if debugger:
            debugger.start_llm_stage("stage_1_identification")

        stage1_start = time.time()
        identification_response = self._run_identification(
            filename, language, shallow_ast, signature_graph=signature_graph
        )
        stage1_elapsed = time.time() - stage1_start

        ranges_to_read = self._parse_identification_response(identification_response)

        # Record Stage 1 metrics if debugger is available
        if debugger:
            stage1_tokens = self._estimate_tokens_for_response(identification_response)
            debugger.end_llm_stage(
                "stage_1_identification",
                input_tokens=self._estimate_tokens_for_prompt(
                    filename, language, prompt_structure
                ),
                output_tokens=stage1_tokens,
                llm_response=identification_response,
                parsed_output={"ranges_to_read": ranges_to_read},
            )

        print(f"[STAGE 1] Found {len(ranges_to_read)} unclear parts to read")
        for r in ranges_to_read:
            print(f"  - {r['element_name']} ({r['element_type']}): {r['reason']}")

        # =====================================================================
        # READ SOURCE CODE
        # =====================================================================
        source_reader = SourceReader(source_store, file_hash)
        source_snippets = {}

        for r in ranges_to_read:
            snippet = source_reader.refer_to_source_code(
                r["start_line"], r["end_line"], r["reason"]
            )
            key = f"{r['start_line']}-{r['end_line']}"
            source_snippets[key] = snippet

        print(f"[READ] Read {len(source_snippets)} source code snippets")

        # =====================================================================
        # STAGE 2: ANALYSIS
        # =====================================================================
        print(f"[STAGE 2] Generating File Intent + Responsibility Blocks...")

        if debugger:
            debugger.start_llm_stage("stage_2_analysis")

        stage2_start = time.time()
        analysis_response = self._run_analysis(
            filename,
            language,
            shallow_ast,
            source_snippets,
            signature_graph=signature_graph,
        )
        stage2_elapsed = time.time() - stage2_start

        result = self._parse_analysis_response(analysis_response)

        # Record Stage 2 metrics if debugger is available
        if debugger:
            stage2_tokens = self._estimate_tokens_for_response(analysis_response)
            debugger.end_llm_stage(
                "stage_2_analysis",
                input_tokens=self._estimate_tokens_for_analysis_prompt(
                    filename,
                    language,
                    prompt_structure,
                    source_snippets,
                ),
                output_tokens=stage2_tokens,
                llm_response=analysis_response,
                parsed_output=result,
            )

        # Attach metadata
        result["metadata"]["execution_path"] = "two-stage"
        result["metadata"]["tool_reads"] = [
            {
                "start_line": r.start_line,
                "end_line": r.end_line,
                "reason": r.reason,
            }
            for r in source_reader.get_log()
        ]

        # Add debug stats if available
        if debug_report:
            result["metadata"]["debug_stats"] = debug_report.get("summary", {})
            self._add_quality_warnings(result, debug_report)

        print(f"[STAGE 2] Complete!")
        print(f"  - File Intent: {result['file_intent'][:80]}...")
        print(f"  - Responsibilities: {len(result['responsibilities'])}")
        print(f"  - Tool Reads: {len(result['metadata']['tool_reads'])}")

        return result

    def _should_use_fast_path(self, source_code: str) -> bool:
        """Determine if file is small enough for single-stage analysis.

        Returns True if file is below both line and token thresholds.

        Args:
            source_code: The source code content to evaluate.

        Returns:
            True if fast-path should be used, False for two-stage analysis.
        """
        # Check line count
        line_count = len(source_code.splitlines())
        if line_count > self.FAST_PATH_LINE_THRESHOLD:
            return False

        # Estimate token count using a simple character-to-token ratio
        # Rough estimate: 1 token ≈ 4 characters
        estimated_tokens = len(source_code) // 4
        if estimated_tokens > self.FAST_PATH_TOKEN_THRESHOLD:
            return False

        return True

    def _run_fast_path_analysis(
        self,
        filename: str,
        language: str,
        shallow_ast: Dict[str, Any],
        source_code: str,
        debugger: ShallowASTDebugger | None = None,
        signature_graph: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """Single-stage analysis for small files using full source code.

        Args:
            filename: Name of the file being analyzed.
            language: Programming language identifier.
            shallow_ast: Shallow AST representation.
            source_code: Full source code content.
            debugger: Optional debugger for tracking LLM metrics.
            signature_graph: Optional signature graph representation.

        Returns:
            Dict with file_intent, responsibilities, and metadata.
        """
        try:
            # Use different prompt depending on whether we have AST or raw source only
            if not shallow_ast and not signature_graph:
                # Raw source mode - no AST
                user_prompt = build_raw_source_prompt(filename, language, source_code)
            else:
                # Fast-path with AST
                user_prompt = build_fast_path_prompt(
                    filename, language, shallow_ast, source_code
                )

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": FAST_PATH_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
            )

            content = response.choices[0].message.content
            if content is None:
                raise ValueError("LLM returned empty response in fast-path analysis")

            result = self._parse_analysis_response(content)

            # Track LLM metrics if debugger is available
            if debugger:
                input_tokens = (
                    response.usage.prompt_tokens
                    if response.usage
                    else self._estimate_tokens_for_fast_path_prompt(
                        filename, language, signature_graph or shallow_ast, source_code
                    )
                )
                output_tokens = (
                    response.usage.completion_tokens
                    if response.usage
                    else self._estimate_tokens_for_response(content)
                )

                debugger.end_llm_stage(
                    "fast_path_analysis",
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    llm_response=content,
                    parsed_output=result,
                )

            return result
        except Exception as e:
            # Fallback to two-stage analysis on error
            print(f"[FAST-PATH] Error occurred: {e}")
            print(f"[FALLBACK] Falling back to two-stage analysis...")
            # Return minimal valid structure to trigger fallback in caller
            raise

    def _run_identification(
        self,
        filename: str,
        language: str,
        shallow_ast: Dict[str, Any],
        signature_graph: Dict[str, Any] | None = None,
    ) -> str:
        """Stage 1: Run identification to find unclear parts."""
        if signature_graph:
            user_prompt = build_signature_graph_identification_prompt(
                filename, language, signature_graph
            )
        else:
            user_prompt = build_identification_prompt(filename, language, shallow_ast)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": IDENTIFICATION_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )

        content = response.choices[0].message.content
        if content is None:
            raise ValueError("LLM returned empty response in identification stage")
        return content

    def _parse_identification_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse Stage 1 response to extract ranges to read."""
        try:
            # Strip markdown code fences if present
            content = response.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            data = json.loads(content)
            return data.get("ranges_to_read", [])
        except json.JSONDecodeError as e:
            print(f"[ERROR] Failed to parse identification response: {e}")
            print(f"Response: {response}")
            return []

    def _run_analysis(
        self,
        filename: str,
        language: str,
        shallow_ast: Dict[str, Any],
        source_snippets: Dict[str, str],
        signature_graph: Dict[str, Any] | None = None,
    ) -> str:
        """Stage 2: Run analysis with AST + read source code."""
        if signature_graph:
            user_prompt = build_signature_graph_analysis_prompt(
                filename, language, signature_graph, source_snippets
            )
        else:
            user_prompt = build_analysis_prompt(
                filename, language, shallow_ast, source_snippets
            )

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )

        content = response.choices[0].message.content
        if content is None:
            raise ValueError("LLM returned empty response in analysis stage")
        return content

    def _parse_analysis_response(self, response: str) -> Dict[str, Any]:
        """Parse Stage 2 response to extract File Intent + Responsibilities."""
        try:
            # Strip markdown code fences if present
            content = response.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            return json.loads(content)
        except json.JSONDecodeError as e:
            print(f"[ERROR] Failed to parse analysis response: {e}")
            print(f"Response: {response}")
            # Return minimal valid structure
            return {
                "file_intent": "Error: Failed to analyze file",
                "responsibilities": [],
                "metadata": {"notes": f"Parsing error: {str(e)}"},
            }

    def set_fast_path_line_threshold(self, threshold: int) -> None:
        """Set the line count threshold for fast-path analysis."""
        self.FAST_PATH_LINE_THRESHOLD = threshold

    def set_fast_path_token_threshold(self, threshold: int) -> None:
        """Set the token count threshold for fast-path analysis."""
        self.FAST_PATH_TOKEN_THRESHOLD = threshold

    def _add_quality_warnings(
        self, result: Dict[str, Any], debug_report: Dict[str, Any]
    ) -> None:
        """Add quality warnings to metadata.notes if integrity score is below 100%.

        Args:
            result: The analysis result dictionary to update.
            debug_report: The debug report from ShallowASTDebugger.
        """
        metadata = result.get("metadata", {})

        # Initialize notes if not present
        if "notes" not in metadata:
            metadata["notes"] = ""

        # Check integrity score
        summary = debug_report.get("summary", {})
        integrity_score = summary.get("integrity_score", 100)

        if integrity_score < 100:
            warning = (
                f"Warning: AST integrity score is {integrity_score:.1f}%. "
                f"Some structural elements may not have been fully verified. "
                f"Node reduction: {summary.get('node_reduction_ratio', 0)}x, "
                f"Compression: {summary.get('context_compression_ratio', 0)}x"
            )

            if metadata["notes"]:
                metadata["notes"] += " | " + warning
            else:
                metadata["notes"] = warning

    def _estimate_tokens_for_prompt(
        self, filename: str, language: str, structure: Dict[str, Any]
    ) -> int:
        """Estimate token count for Stage 1 identification prompt."""
        # Rough estimation: filename + language + shallow AST
        structure_str = json.dumps(structure)
        total_chars = len(filename) + len(language) + len(structure_str)
        return max(100, total_chars // 4)  # ~1 token per 4 characters

    def _estimate_tokens_for_analysis_prompt(
        self,
        filename: str,
        language: str,
        structure: Dict[str, Any],
        source_snippets: Dict[str, str],
    ) -> int:
        """Estimate token count for Stage 2 analysis prompt."""
        ast_str = json.dumps(structure)
        snippets_str = json.dumps(source_snippets)
        total_chars = len(filename) + len(language) + len(ast_str) + len(snippets_str)
        return max(100, total_chars // 4)

    def _estimate_tokens_for_response(self, response: str) -> int:
        """Estimate token count for LLM response."""
        return max(50, len(response) // 4)

    def _estimate_tokens_for_fast_path_prompt(
        self,
        filename: str,
        language: str,
        structure: Dict[str, Any],
        source_code: str,
    ) -> int:
        """Estimate token count for fast-path prompt."""
        ast_str = json.dumps(structure)
        total_chars = len(filename) + len(language) + len(ast_str) + len(source_code)
        return max(100, total_chars // 4)

    # result = agent.analyze_file("example.ts", "typescript", shallow_ast, source_store, file_hash)
    # print(json.dumps(result, indent=2))
