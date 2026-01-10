"""
Prompt templates for multi-agent system.
"""

from .compressor import COMPRESSOR_PROMPT
from .question_generator import QUESTION_GENERATOR_PROMPT
from .explainer import EXPLAINER_PROMPT
from .skeptic import SKEPTIC_PROMPT

__all__ = [
    "COMPRESSOR_PROMPT",
    "QUESTION_GENERATOR_PROMPT",
    "EXPLAINER_PROMPT",
    "SKEPTIC_PROMPT",
]
