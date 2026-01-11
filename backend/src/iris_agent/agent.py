"""IRIS agent orchestrator with two-stage analysis.

Stage 1: Identify unclear parts from shallow AST
Stage 2: Analyze with AST + read source code
"""

from __future__ import annotations

import json
from typing import Any, Dict, List

from openai import OpenAI

from .prompts.iris import (
    ANALYSIS_OUTPUT_SCHEMA,
    ANALYSIS_SYSTEM_PROMPT,
    IDENTIFICATION_SYSTEM_PROMPT,
    build_analysis_prompt,
    build_identification_prompt,
)
from .source_store import SourceStore
from .tools.source_reader import SourceReader


class IrisAgent:
    """Two-stage agent for File Intent + Responsibility Blocks extraction."""

    def __init__(self, model: str = "gpt-4o-mini", api_key: str | None = None):
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def analyze(
        self,
        filename: str,
        language: str,
        shallow_ast: Dict[str, Any],
        source_store: SourceStore,
        file_hash: str,
    ) -> Dict[str, Any]:
        """Run two-stage analysis on a file.

        Stage 1: Identify unclear parts
        Stage 2: Generate File Intent + Responsibility Blocks
        """

        # =====================================================================
        # STAGE 1: IDENTIFICATION
        # =====================================================================
        print(f"[STAGE 1] Identifying unclear parts in {filename}...")

        identification_response = self._run_identification(
            filename, language, shallow_ast
        )
        ranges_to_read = self._parse_identification_response(identification_response)

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

        analysis_response = self._run_analysis(
            filename, language, shallow_ast, source_snippets
        )
        result = self._parse_analysis_response(analysis_response)

        # Attach tool reads to metadata
        result["metadata"]["tool_reads"] = [
            {
                "start_line": r.start_line,
                "end_line": r.end_line,
                "reason": r.reason,
            }
            for r in source_reader.get_log()
        ]

        print(f"[STAGE 2] Complete!")
        print(f"  - File Intent: {result['file_intent'][:80]}...")
        print(f"  - Responsibilities: {len(result['responsibilities'])}")
        print(f"  - Tool Reads: {len(result['metadata']['tool_reads'])}")

        return result

    def _run_identification(
        self, filename: str, language: str, shallow_ast: Dict[str, Any]
    ) -> str:
        """Stage 1: Run identification to find unclear parts."""
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
    ) -> str:
        """Stage 2: Run analysis with AST + read source code."""
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


# Example usage
if __name__ == "__main__":
    # Mock data for testing
    shallow_ast = {
        "type": "Program",
        "body": [
            {
                "type": "FunctionDeclaration",
                "id": {"name": "process"},
                "line_range": [10, 25],
                "leading_comment": None,
            }
        ],
    }

    agent = IrisAgent()
    # result = agent.analyze_file("example.ts", "typescript", shallow_ast, source_store, file_hash)
    # print(json.dumps(result, indent=2))
