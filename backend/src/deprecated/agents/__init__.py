"""Multi-agent architecture for IRIS analysis.

This package implements a two-agent system:
- AnalyzerAgent: Generates hypothesis (file intent + responsibility blocks)
- CriticAgent: Evaluates hypothesis and provides feedback
- Orchestrator: Manages the Analyzer-Critic loop
"""

from .analyzer import AnalyzerAgent
from .critic import CriticAgent
from .orchestrator import Orchestrator
from .schemas import Hypothesis, Feedback, ToolSuggestion, AnalysisResult

__all__ = [
    "AnalyzerAgent",
    "CriticAgent",
    "Orchestrator",
    "Hypothesis",
    "Feedback",
    "ToolSuggestion",
    "AnalysisResult",
]
