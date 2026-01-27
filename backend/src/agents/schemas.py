"""Shared data structures for the two-agent system.

Defines the schema for communication between Analyzer and Critic agents.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ToolSuggestion:
    """Suggestion from Critic to Analyzer to execute a tool call.

    Attributes:
        tool_name: Name of the tool to call (e.g., "refer_to_source_code")
        parameters: Parameters to pass to the tool
        rationale: Why this tool call is needed
    """

    tool_name: str
    parameters: Dict[str, Any]
    rationale: str


@dataclass
class ResponsibilityBlock:
    """A single responsibility block in the hypothesis.

    Attributes:
        id: Stable identifier for the responsibility block
        label: Short, descriptive label for the responsibility
        description: Detailed explanation of what this responsibility provides
        elements: Structured elements grouped by type
        ranges: Line ranges covering all listed elements
    """

    id: str
    label: str
    description: str
    elements: Dict[str, List[str]]
    ranges: List[List[int]]


@dataclass
class Hypothesis:
    """Analyzer's proposed grouping of code into responsibilities.

    Attributes:
        file_intent: High-level purpose of the file (WHY it exists)
        responsibility_blocks: List of identified responsibilities (WHAT it does)
        iteration: Current iteration number (0 = initial hypothesis)
    """

    file_intent: str
    responsibility_blocks: List[ResponsibilityBlock]
    iteration: int = 0


@dataclass
class Feedback:
    """Critic's evaluation and feedback on a hypothesis.

    Attributes:
        confidence: Numeric confidence score (0.0 to 1.0)
        comments: Specific, actionable feedback on the hypothesis
        tool_suggestions: Optional list of tools Analyzer should call for clarification
        approved: Whether the hypothesis meets quality threshold
        coverage_complete: Whether all entities are accounted for
        major_issues_count: Count of major structural issues
        minor_issues_count: Count of minor issues
        confidence_reasoning: Explanation of confidence calculation
    """

    confidence: float  # 0.0 to 1.0
    comments: str
    tool_suggestions: List[ToolSuggestion] = field(default_factory=list)
    approved: bool = False
    coverage_complete: bool = True
    major_issues_count: int = 0
    minor_issues_count: int = 0
    confidence_reasoning: str = ""

    def __post_init__(self) -> None:
        """Validate confidence is in valid range."""
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(
                f"Confidence must be between 0.0 and 1.0, got {self.confidence}"
            )


@dataclass
class AnalysisResult:
    """Final output from the two-agent system.

    Attributes:
        file_intent: Final agreed-upon file intent
        responsibility_blocks: Final agreed-upon responsibilities
        metadata: Additional information about the analysis process
    """

    file_intent: str
    responsibility_blocks: List[ResponsibilityBlock]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format compatible with existing IRIS output schema."""
        return {
            "file_intent": self.file_intent,
            "responsibility_blocks": [
                {
                    "id": block.id,
                    "label": block.label,
                    "description": block.description,
                    "elements": block.elements,
                    "ranges": block.ranges,
                }
                for block in self.responsibility_blocks
            ],
            "metadata": self.metadata,
        }
