"""
IRIS Analyzer Package
Cognitive load reduction through noise detection and semantic analysis
"""

# [NOTE] noise detector will be moved to a separate package later, not used for now (1/9/27)
from .noise_detector import detect_noise
from .patterns import NOISE_PATTERNS

from .function_extractor import FunctionExtractor

__all__ = ["detect_noise", "NOISE_PATTERNS", "FunctionExtractor"]
