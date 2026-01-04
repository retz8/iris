"""
IRIS Analyzer Package
Cognitive load reduction through noise detection and semantic analysis
"""

from .noise_detector import detect_noise
from .patterns import NOISE_PATTERNS

__all__ = ["detect_noise", "NOISE_PATTERNS"]
