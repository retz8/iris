"""Flask routes for IRIS analysis API"""

from __future__ import annotations

import os
from datetime import datetime

from flask import Blueprint, jsonify, request

from config import SUPPORTED_LANGUAGES, SINGLE_SHOT_MODEL
from agent import IrisAgent, IrisError

iris_bp = Blueprint("iris", __name__, url_prefix="/api/iris")

# Global instances
_iris_agent = None
_agent_init_error = None

try:
    _iris_agent = IrisAgent(model=SINGLE_SHOT_MODEL)
except Exception as exc:  # pragma: no cover - initialization fallback
    _agent_init_error = str(exc)


@iris_bp.route("/analyze", methods=["POST"])
async def analyze():
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
            "responsibility_blocks": [...],
      "metadata": {
        "notes": "...",
        "tool_reads": [...]
      }
    }
    """
    data = request.get_json(silent=True) or {}
    filename = data.get("filename")
    language = data.get("language")
    metadata_from_data = data.get("metadata", {})

    # Handle both source_code and lines format
    source_code = data.get("source_code")
    # Validation
    if not filename:
        return (
            jsonify({"success": False, "error": "Missing required field: filename"}),
            400,
        )
    if not language:
        return (
            jsonify({"success": False, "error": "Missing required field: language"}),
            400,
        )
    if language not in SUPPORTED_LANGUAGES:
        return (
            jsonify({"success": False, "error": f"Unsupported language: {language}"}),
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
        # Run analysis
        # =====================================================================
        result = None

        try:
            result = await _iris_agent.analyze(
                filename=filename,
                language=language,
                source_code=source_code,
            )

            print(f"Result JSON: {jsonify(result).get_json()}")

            if isinstance(result, IrisError):
                return (
                    jsonify(
                        {
                            "success": False,
                            "error": f"IRIS analysis failed: {result.message}",
                        },
                    ),
                    result.status_code,
                )

        except Exception as iris_error:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"IRIS analysis failed: {iris_error}",
                    }
                ),
                500,
            )

        # =====================================================================
        # Return result
        # =====================================================================
        metadata = metadata_from_data.copy()
        metadata.update(result.get("metadata", {}))

        response = {
            "success": True,
            "file_intent": result.get("file_intent", ""),
            "responsibility_blocks": result.get("responsibility_blocks", []),
            "metadata": metadata,
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
