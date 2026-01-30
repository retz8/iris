"""IRIS agent package."""

from .agent import IrisAgent
from .routes import iris_bp
from .prompts import *

__all__ = [
    "IrisAgent",
    "iris_bp",
    "TOOL_CALLING_SYSTEM_PROMPT",
    "FAST_PATH_SYSTEM_PROMPT",
    "build_signature_graph_prompt",
    "build_fast_path_prompt",
]
