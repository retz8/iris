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
        title: Short, descriptive title for the responsibility
        description: Detailed explanation of what this responsibility handles
        entities: List of entity names (functions, classes, etc.) in this block
    """

    title: str
    description: str
    entities: List[str]


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
    """

    confidence: float  # 0.0 to 1.0
    comments: str
    tool_suggestions: List[ToolSuggestion] = field(default_factory=list)
    approved: bool = False

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
            "responsibilities": [
                {
                    "title": block.title,
                    "description": block.description,
                    "entities": block.entities,
                }
                for block in self.responsibility_blocks
            ],
            "metadata": self.metadata,
        }
