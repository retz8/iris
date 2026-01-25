"""Analyzer Agent for IRIS two-agent system.

The Analyzer generates hypotheses (file intent + responsibility blocks) and
revises them based on Critic feedback.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional, TYPE_CHECKING

from openai import OpenAI

from .schemas import Hypothesis, Feedback, ResponsibilityBlock, ToolSuggestion
from prompts import ANALYZER_SYSTEM_PROMPT, build_analyzer_prompt
from tools.source_reader import SourceReader

if TYPE_CHECKING:
    from signature_graph import SignatureGraph
    from source_store import SourceStore
    from ..debugger.debugger import AgentFlowDebugger


class AnalyzerAgent:
    """Agent responsible for generating and revising responsibility groupings.

    The Analyzer:
    1. Generates initial hypothesis from signature graph
    2. Executes tool calls suggested by Critic
    3. Revises hypothesis based on Critic feedback
    """

    def __init__(
        self,
        client: OpenAI,
        model: str = "gpt-4o-mini",
        debugger: Optional["AgentFlowDebugger"] = None,
    ) -> None:
        """Initialize Analyzer agent.

        Args:
            client: OpenAI client instance
            model: Model to use for analysis
            debugger: Optional debugger for tracking LLM calls
        """
        self.client = client
        self.model = model
        self.debugger = debugger
        # Store context for revision rounds
        self._filename: Optional[str] = None
        self._language: Optional[str] = None
        self._signature_graph: Optional["SignatureGraph"] = None

    def generate_hypothesis(
        self,
        filename: str,
        language: str,
        signature_graph: "SignatureGraph",
        source_store: "SourceStore",
        file_hash: str,
    ) -> Hypothesis:
        """Generate initial hypothesis from signature graph.

        Args:
            filename: Name of the file being analyzed
            language: Programming language
            signature_graph: Structured representation of code entities
            source_store: Store for source code retrieval
            file_hash: Hash of the source file

        Returns:
            Initial hypothesis with file intent and responsibility blocks
        """
        # Store context for revision rounds
        self._filename = filename
        self._language = language
        self._signature_graph = signature_graph

        # Track in debugger
        if self.debugger:
            self.debugger.start_llm_stage("analyzer_generate_hypothesis")

        # Build prompt for initial hypothesis
        user_prompt = build_analyzer_prompt(
            filename=filename,
            language=language,
            signature_graph=signature_graph,
            feedback=None,
            tool_results=None,
            iteration=0,
        )

        # Call OpenAI Response API
        response = self.client.responses.create(
            model=self.model,
            input=[
                {"role": "developer", "content": ANALYZER_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )

        # Parse response
        response_text = response.output_text or ""
        if not response_text:
            raise ValueError("Analyzer returned empty response")

        # Track token usage
        input_tokens = response.usage.input_tokens if response.usage else 0
        output_tokens = response.usage.output_tokens if response.usage else 0

        if self.debugger:
            self.debugger.end_llm_stage(
                "analyzer_generate_hypothesis",
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                llm_response=response_text,
            )

        # Parse JSON response
        parsed = self._parse_response(response_text)

        # Convert to Hypothesis dataclass
        return self._to_hypothesis(parsed, iteration=0)

    def revise_hypothesis(
        self,
        current_hypothesis: Hypothesis,
        feedback: Feedback,
        tool_results: Optional[List[Dict[str, Any]]] = None,
    ) -> Hypothesis:
        """Revise hypothesis based on Critic feedback and tool results.

        Args:
            current_hypothesis: Current hypothesis to revise
            feedback: Feedback from Critic
            tool_results: Optional results from tool calls executed

        Returns:
            Revised hypothesis with updated groupings
        """
        if not self._filename or not self._language or not self._signature_graph:
            raise RuntimeError(
                "Cannot revise without prior generate_hypothesis call. "
                "Context (filename, language, signature_graph) not set."
            )

        new_iteration = current_hypothesis.iteration + 1

        # Track in debugger
        if self.debugger:
            self.debugger.start_llm_stage(f"analyzer_revise_iteration_{new_iteration}")

        # Build prompt with feedback and tool results
        user_prompt = build_analyzer_prompt(
            filename=self._filename,
            language=self._language,
            signature_graph=self._signature_graph,
            feedback=feedback.comments,
            tool_results=tool_results,
            iteration=new_iteration,
        )

        # Call OpenAI Response API
        response = self.client.responses.create(
            model=self.model,
            input=[
                {"role": "developer", "content": ANALYZER_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )

        # Parse response
        response_text = response.output_text or ""
        if not response_text:
            raise ValueError("Analyzer returned empty response in revision")

        # Track token usage
        input_tokens = response.usage.input_tokens if response.usage else 0
        output_tokens = response.usage.output_tokens if response.usage else 0

        if self.debugger:
            self.debugger.end_llm_stage(
                f"analyzer_revise_iteration_{new_iteration}",
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                llm_response=response_text,
            )

        # Parse JSON response
        parsed = self._parse_response(response_text)

        # Convert to Hypothesis dataclass
        return self._to_hypothesis(parsed, iteration=new_iteration)

    def execute_tool_calls(
        self,
        tool_suggestions: List[ToolSuggestion],
        source_store: "SourceStore",
        file_hash: str,
    ) -> List[Dict[str, Any]]:
        """Execute tool calls suggested by Critic.

        Args:
            tool_suggestions: List of tool calls to execute
            source_store: Store for source code retrieval
            file_hash: Hash of the source file

        Returns:
            List of tool call results with source code snippets
        """
        source_reader = SourceReader(source_store, file_hash)
        results: List[Dict[str, Any]] = []

        for suggestion in tool_suggestions:
            if suggestion.tool_name != "refer_to_source_code":
                # Skip unknown tools
                results.append(
                    {
                        "tool_name": suggestion.tool_name,
                        "error": f"Unknown tool: {suggestion.tool_name}",
                        "rationale": suggestion.rationale,
                    }
                )
                continue

            # Extract parameters
            start_line = suggestion.parameters.get("start_line", 0)
            end_line = suggestion.parameters.get("end_line", 0)

            # Validate line range
            if start_line < 1 or end_line < start_line:
                results.append(
                    {
                        "tool_name": suggestion.tool_name,
                        "error": f"Invalid line range [{start_line}, {end_line}]",
                        "rationale": suggestion.rationale,
                    }
                )
                continue

            # Execute tool call
            snippet = source_reader.refer_to_source_code(
                start_line=start_line,
                end_line=end_line,
                reason=suggestion.rationale,
            )

            # Log to debugger
            if self.debugger and hasattr(self.debugger, "log_tool_call"):
                self.debugger.log_tool_call(
                    tool_name="refer_to_source_code",
                    args={"start_line": start_line, "end_line": end_line},
                    result_length=len(snippet),
                    result_content=snippet,
                )

            results.append(
                {
                    "tool_name": suggestion.tool_name,
                    "parameters": {"start_line": start_line, "end_line": end_line},
                    "source_code_snippet": snippet,
                    "rationale": suggestion.rationale,
                }
            )

        return results

    def _parse_response(self, response: str) -> Dict[str, Any]:
        """Parse LLM response JSON, handling markdown fences if present."""
        content = response.strip()

        # Strip markdown code fences if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse Analyzer response as JSON: {e}")

    def _to_hypothesis(self, parsed: Dict[str, Any], iteration: int) -> Hypothesis:
        """Convert parsed JSON response to Hypothesis dataclass."""
        file_intent = parsed.get("file_intent", "")

        # Handle both old format (responsibilities) and new format (responsibility_blocks)
        raw_blocks = parsed.get("responsibility_blocks") or parsed.get(
            "responsibilities", []
        )

        responsibility_blocks: List[ResponsibilityBlock] = []
        for block in raw_blocks:
            # Extract entities from either flat list or nested elements
            entities = block.get("entities", [])
            if not entities and "elements" in block:
                # Flatten elements structure
                elements = block["elements"]
                entities = (
                    elements.get("functions", [])
                    + elements.get("state", [])
                    + elements.get("imports", [])
                    + elements.get("types", [])
                    + elements.get("constants", [])
                )

            responsibility_blocks.append(
                ResponsibilityBlock(
                    title=block.get("label") or block.get("title", ""),
                    description=block.get("description", ""),
                    entities=entities,
                )
            )

        return Hypothesis(
            file_intent=file_intent,
            responsibility_blocks=responsibility_blocks,
            iteration=iteration,
        )
