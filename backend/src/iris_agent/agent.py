"""IRIS agent orchestrator for File Intent + Responsibility Blocks extraction.

current version: tool-calling with on-demand source reading
strategy: signature graph / fast path
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, TYPE_CHECKING, cast
from datetime import timedelta

from openai import OpenAI
from openai.types.responses import ResponseInputParam
from openai.types.responses.response_input_param import FunctionCallOutput

from .signature_graph import SignatureGraphExtractor, SignatureGraph
from .prompts import (
    TOOL_CALLING_SYSTEM_PROMPT,
    FAST_PATH_SYSTEM_PROMPT,
    build_signature_graph_prompt,
    build_fast_path_prompt,
)
from .source_store import SourceStore
from .tools.source_reader import SourceReader
from .tools.tool_definitions import IRIS_TOOLS

if TYPE_CHECKING:
    from .debugger import ShallowASTDebugger

class IrisError(Exception):
    """Custom exception for IRIS agent errors."""

    # will be implemented later
    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
    
    def get_status_code(self) -> int:
        return self.status_code

class IrisAgent:
    """Two-stage agent for File Intent + Responsibility Blocks extraction."""

    # Fast-path thresholds for single-stage analysis
    FAST_PATH_LINE_THRESHOLD = 100
    FAST_PATH_TOKEN_THRESHOLD = 1000

    def __init__(self, model: str = "gpt-4o-mini", api_key: str | None = None):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        # Safety limit for tool-calling loop
        self.MAX_TOOL_CALLS: int = 30

    def analyze(
        self,
        filename: str,
        language: str,
        source_store: SourceStore,
        source_code: str,
        file_hash: str,
        debugger: ShallowASTDebugger | None = None,
        debug_report: Dict[str, Any] | None = None,
        force_fast_path: bool = False,
    ) -> Dict[str, Any] | IrisError:
        """Run analysis on a file with selectable execution path.

        Execution paths (in priority order):
        1. Fast-Path: Single-stage analysis for small files with source code (< 200 lines / 2000 tokens)
        2. Tool-Calling: Single-stage with on-demand source reading with signature graph (NEW default)

        Args:
            filename: Name of the file being analyzed.
            language: Programming language identifier.
            source_store: Store containing source code snippets.
            source_code: Source code of the file
            file_hash: Hash of the source file for caching.
            debugger: Optional ShallowASTDebugger instance for LLM tracking.
            debug_report: Optional debug report from ShallowASTDebugger.
            force_fast_path: If True, forces fast-path analysis.
        """
        
        # =====================================================================
        # Fast Path: Single LLM call with full source code
        # =====================================================================
        
        # NOTE: force_fast_path will be removed later
        if force_fast_path or self._should_use_fast_path(source_code):
            if force_fast_path and debugger:
                print("[DEBUG] FORCE FAST-PATH enabled")
            print(f"[FAST-PATH] Analyzing {filename} with raw source code...")

            # Track fast-path stage in debugger
            if debugger:
                debugger.start_llm_stage("fast_path_analysis")
                debugger.capture_snapshot("raw_source", source_code)

            result = self._run_fast_path_analysis(
                filename,
                language,
                source_code,
                debugger,
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
        # Tool-Calling with On-Demand Source Reading based on Signature Graph
        # =====================================================================
        else:
        
            if debugger:
                debugger.start_llm_stage("tool_calling_analysis")
        
            print(
                f"[TOOL-CALLING] Analyzing {filename} with signature graph & tool calling..."
            )

            # Step 1: extract signature graph
            signature_graph = None 
            try:
                extractor = SignatureGraphExtractor(language)
                signature_graph = extractor.extract(source_code)
                if debugger:
                    debugger.capture_snapshot("signature_graph", signature_graph)
            except ValueError as ve:
                return IrisError(f"Invalid Input on Signature Graph Extraction: {ve}", 400)
            except Exception as sg_error:
                return IrisError(f"Signature Graph Extraction failed: {sg_error}", 500)
           
            if signature_graph is None:
                return IrisError("Empty Signature Graph returned", 500) 
            
            # Step 2: run tool-calling analysis
            try:
                result = self._run_tool_calling_analysis(
                    filename,
                    language,
                    source_store,
                    file_hash,
                    signature_graph,
                    debugger
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
                return IrisError(f"Tool-Calling Analysis failed: {e}", 500)

    def _run_tool_calling_analysis(
        self,
        filename: str,
        language: str,
        source_store: SourceStore,
        file_hash: str,
        signature_graph: SignatureGraph,
        debugger: Optional["ShallowASTDebugger"] = None,
    ) -> Dict[str, Any]:
        """Single-stage analysis with OpenAI tool-calling (Responses API).

        The LLM analyzes the shallow AST and calls refer_to_source_code()
        when it needs to see actual implementation details.
        """

        source_reader = SourceReader(source_store, file_hash)

        if signature_graph is None:
            raise RuntimeError("Signature graph is required for tool-calling analysis")

        # Build initial prompt
        user_prompt = build_signature_graph_prompt(
            filename, language, signature_graph
        )

        # Conversation state (text + tool results only)
        messages: ResponseInputParam = [
            {"role": "developer", "content": TOOL_CALLING_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        tool_call_count = 0
        total_input_tokens = 0
        total_output_tokens = 0
        all_responses: List[str] = []

        while tool_call_count < self.MAX_TOOL_CALLS:
            # ---- OpenAI Responses API call ----
            response = self.client.responses.create(
                model=self.model,
                input=messages,
                tools=IRIS_TOOLS,
                tool_choice="auto",
                parallel_tool_calls=True,
                temperature=0.1,
            )


            # ---- Token usage ----
            if response.usage:
                if tool_call_count == 0:
                    total_input_tokens += response.usage.input_tokens
                total_output_tokens += response.usage.output_tokens

            # ---- Parse response output ----
            tool_calls = []

            for item in response.output:
                if item.type == 'function_call':
                    tool_calls.append(item)
                    print("[DEBUG TOOL-CALLING] Tool call requested:", item.name, item.arguments)


            #response.created_at
            #reponse.completed_at
            #response.max_tool_calls = MAX_TOOL_CALLS

            llm_response_text = response.output_text or ""
            print("[DEBUG TOOL-CALLING] response", response)

            # ---- If the model requested tools ----
            for item in response.output:
                if item.type == 'function_call':
                    tool_call_count += 1

                    if item.name != "refer_to_source_code":
                        continue

                    # Parse tool arguments
                    try:
                        args = json.loads(item.arguments or "{}")
                        start_line = int(args.get("start_line", 0))
                        end_line = int(args.get("end_line", 0))
                    except (json.JSONDecodeError, TypeError, ValueError):
                        start_line = 0
                        end_line = 0

                    # Execute tool
                    if start_line < 1 or end_line < start_line:
                        snippet = (
                            f"Error: Invalid line range [{start_line}, {end_line}]"
                        )
                    else:
                        snippet = source_reader.refer_to_source_code(
                            start_line,
                            end_line,
                            reason="LLM requested",
                        )

                    # Debug logging
                    if debugger and hasattr(debugger, "log_tool_call"):
                        debugger.log_tool_call(
                            tool_name="refer_to_source_code",
                            args={"start_line": start_line, "end_line": end_line},
                            result_length=len(snippet),
                            result_content=snippet,
                        )

                    # Append tool result to conversation

                    tool_output: FunctionCallOutput =  {
                            "type": "function_call_output",
                            "call_id": item.id or "",
                            "output": json.dumps({
                                "source_code_snippet": snippet, "start_line": start_line, "end_line": end_line
                            })
                        }
                    messages.append(tool_output)
                
                # Continue loop: model will consume tool output next
                continue

            # ---- No tool calls → final answer ----
            if not llm_response_text:
                raise ValueError("LLM returned empty response in tool-calling analysis")

            result = self._parse_analysis_response(llm_response_text)

            if "file_intent" not in result or "responsibilities" not in result:
                raise ValueError(
                    f"LLM response missing required fields. Got keys: {list(result.keys())}"
                )

            # ---- Attach metadata ----
            result.setdefault("metadata", {})
            result["metadata"]["tool_reads"] = [
                {
                    "start_line": r.start_line,
                    "end_line": r.end_line,
                    "reason": r.reason,
                }
                for r in source_reader.get_log()
            ]
            result["metadata"]["execution_path"] = "tool-calling"
            result["metadata"]["tool_call_count"] = tool_call_count

            # time taken in llm call
            # NOTE: not full time elapsed in iris, only llm call
            llm_call_started = response.created_at
            llm_call_ended = response.completed_at
            result["metadata"]["time_taken_seconds"] = (
                self._convert_milliseconds_to_seconds(llm_call_ended - llm_call_started)
            ) if llm_call_started and llm_call_ended else None

            # ---- Debugger finalization ----
            if debugger:
                full_response = "\n".join(all_responses) if all_responses else llm_response_text
                debugger.end_llm_stage(
                    "tool_calling_analysis",
                    input_tokens=total_input_tokens,
                    output_tokens=total_output_tokens,
                    llm_response=full_response,
                    parsed_output=result,
                )

            return result

        raise RuntimeError(
            f"Exceeded maximum tool calls ({self.MAX_TOOL_CALLS})"
        )



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
        source_code: str,
        debugger: ShallowASTDebugger | None = None,
    ) -> Dict[str, Any]:
        """Single-stage analysis for small files using full source code.

        Args:
            filename: Name of the file being analyzed.
            language: Programming language identifier.
            source_code: Full source code content.
            debugger: Optional debugger for tracking LLM metrics.
            signature_graph: Optional signature graph representation.

        Returns:
            Dict with file_intent, responsibilities, and metadata.
        """
        try:
            user_prompt = build_fast_path_prompt(filename, language, source_code)
            

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
                        filename, language, source_code
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

    def _parse_analysis_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM Analysis response to extract File Intent + Responsibilities."""
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

    def get_fast_path_line_threshold(self) -> int:
        """Get the current line count threshold for fast-path analysis."""
        return self.FAST_PATH_LINE_THRESHOLD

    def get_fast_path_token_threshold(self) -> int:
        """Get the current token count threshold for fast-path analysis."""
        return self.FAST_PATH_TOKEN_THRESHOLD

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
        source_code: str,
    ) -> int:
        """Estimate token count for fast-path prompt."""
        total_chars = len(filename) + len(language) + len(source_code)
        return max(100, total_chars // 4)

    def _convert_milliseconds_to_seconds(self, milliseconds):
        """Converts milliseconds to seconds."""
        seconds = milliseconds / 1000
        return seconds
