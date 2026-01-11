"""Flask routes for IRIS analysis API (Phase 3)."""

from __future__ import annotations

import hashlib

from flask import Blueprint, jsonify, request

from .agent import IrisAgent
from .ast_processor import ShallowASTProcessor
from .source_store import SourceStore

iris_bp = Blueprint("iris", __name__, url_prefix="/api/iris")

# Global instances
_source_store = SourceStore()
_ast_processor = ShallowASTProcessor()
_iris_agent = None
_agent_init_error = None

try:
    _iris_agent = IrisAgent(model="gpt-4o-mini")
except Exception as exc:  # pragma: no cover - initialization fallback
    _agent_init_error = str(exc)


@iris_bp.route("/analyze", methods=["POST"])
def analyze():
    """Analyze a source file to extract File Intent + Responsibility Blocks.

    Request body:
    {
      "filename": "example.ts",
      "source_code": "..." or "lines": [{"line": 1, "text": "..."}],
      "language": "typescript"  // optional, defaults to "javascript"
    }

    Response:
    {
      "success": true,
      "file_intent": "...",
      "responsibilities": [...],
      "metadata": {
        "notes": "...",
        "tool_reads": [...]
      }
    }
    """
    data = request.get_json(silent=True) or {}
    filename = data.get("filename", "")
    language = data.get("language", "javascript")

    # Handle both source_code and lines format
    source_code = data.get("source_code")
    if not source_code:
        lines = data.get("lines", [])
        if lines:
            source_code = "\n".join(line["text"] for line in lines)

    # Validation
    if not filename:
        return (
            jsonify({"success": False, "error": "Missing required field: filename"}),
            400,
        )
    if not source_code:
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Missing required field: source_code or lines",
                }
            ),
            400,
        )

    if _iris_agent is None:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"IRIS agent unavailable: {_agent_init_error}",
                }
            ),
            500,
        )

    try:
        # =====================================================================
        # STEP 1: Store source code and get file hash
        # =====================================================================
        file_hash = _compute_file_hash(source_code)
        _source_store.store(source_code, file_hash, filename)

        # =====================================================================
        # STEP 2: Generate shallow AST
        # =====================================================================
        try:
            shallow_ast = _ast_processor.process(source_code, language)
        except ValueError as ve:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"Invalid input: {ve}",
                    }
                ),
                400,
            )
        except Exception as ast_error:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"AST parsing failed: {ast_error}",
                    }
                ),
                500,
            )

        # =====================================================================
        # STEP 3: Run two-stage analysis
        # =====================================================================
        result = _iris_agent.analyze(
            filename=filename,
            language=language,
            shallow_ast=shallow_ast,
            source_store=_source_store,
            file_hash=file_hash,
        )

        # =====================================================================
        # STEP 4: Return result
        # =====================================================================
        response = {
            "success": True,
            "file_intent": result.get("file_intent", ""),
            "responsibilities": result.get("responsibilities", []),
            "metadata": result.get("metadata", {}),
        }
        return jsonify(response), 200

    except Exception as exc:  # pragma: no cover - runtime protection
        import traceback

        traceback.print_exc()
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Unexpected error during IRIS analysis: {exc}",
                }
            ),
            500,
        )


def _compute_file_hash(source_code: str) -> str:
    """Compute SHA-256 hash of source code for caching."""
    return hashlib.sha256(source_code.encode("utf-8")).hexdigest()


@iris_bp.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return (
        jsonify(
            {
                "status": "ok",
                "agent_ready": _iris_agent is not None,
                "agent_error": _agent_init_error,
            }
        ),
        200,
    )
