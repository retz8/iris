"""
Data models for Single LLM Experiment (Exp-1)

This module defines the core data structures for representing:
- File Intent (WHY the file exists)
- Responsibility Map (WHAT the file does)
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


@dataclass
class FileIntent:
    """
    Represents the high-level purpose of a file.

    Attributes:
        text: 1-4 short lines explaining WHY does this file exist
    """

    text: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {"text": self.text}


@dataclass
class Responsibility:
    """
    Represents a single conceptual responsibility within a file.

    Attributes:
        id: Unique identifier (e.g. "{filename}-data-loading", "{filename}-search-api")
        label: Short title for the responsibility
        description: Brief explanation of what this responsibility does
        ranges: List of [start_line, end_line] tuples indicating code regions
    """

    id: str
    label: str
    description: str
    ranges: List[List[int]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "label": self.label,
            "description": self.description,
            "ranges": self.ranges,
        }


@dataclass
class AnalysisResult:
    """
    Complete result of single LLM analysis.

    Attributes:
        success: Whether the analysis completed successfully
        file_intent: The WHY of the file
        responsibilities: List of WHAT the file does
        filename: Name of the analyzed file
        language: Programming language
        error: Optional error message if analysis failed
    """

    success: bool
    file_intent: Optional[FileIntent] = None
    responsibilities: List[Responsibility] = field(default_factory=list)
    filename: str = ""
    language: str = ""
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "success": self.success,
            "filename": self.filename,
            "language": self.language,
        }

        if self.success:
            result["file_intent"] = (
                self.file_intent.to_dict() if self.file_intent else None
            )
            result["responsibilities"] = [r.to_dict() for r in self.responsibilities]

        if self.error:
            result["error"] = self.error

        return result
