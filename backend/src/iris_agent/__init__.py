"""IRIS agent package."""

from .ast_processor import ShallowASTProcessor
from .comment_extractor import CommentExtractor
from .source_store import SourceStore
from .agent import IrisAgent
from .routes import iris_bp
from .signature_graph import SignatureGraphExtractor

__all__ = [
    "ShallowASTProcessor",
    "CommentExtractor",
    "SourceStore",
    "IrisAgent",
    "iris_bp",
    "SignatureGraphExtractor",
]
