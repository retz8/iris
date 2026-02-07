"""Flask routes for IRIS analysis API"""

from __future__ import annotations

import logging
import os
import time
from datetime import datetime

from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)

from config import SUPPORTED_LANGUAGES, SINGLE_SHOT_MODEL
from agent import IrisAgent, IrisError
from utils.analytics_emf import (
    emit_emf_event,
    build_analysis_requested,
    build_analysis_started,
    build_analysis_completed,
    build_analysis_failed,
)

iris_bp = Blueprint("iris", __name__, url_prefix="/api/iris")

# Global instances
_iris_agent = None
_agent_init_error = None

try:
    _iris_agent = IrisAgent(model=SINGLE_SHOT_MODEL)
except Exception as exc:  # pragma: no cover - initialization fallback
    logger.error(f"IRIS agent initialization failed: {exc}", exc_info=True)
    _agent_init_error = True


@iris_bp.route("/analyze", methods=["POST"])
async def analyze():
    """Analyze a source file to extract File Intent + Responsibility Blocks.

    Request body:
    {
      "filename": "example.ts",
      "source_code": "..." or "lines": [{"line": 1, "text": "..."}],
      "language": "typescript"  // optional, defaults
      to "javascript"
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
                    "error": "IRIS agent is currently unavailable",
                }
            ),
            503,
        )
    code_length = len(source_code)
    estimated_tokens = code_length // 4
    emit_emf_event(build_analysis_requested(code_length, estimated_tokens))

    t_start = time.monotonic()

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

            if isinstance(result, IrisError):
                # -- TASK-007: analysis_failed (IrisError) -----------------
                elapsed_ms = (time.monotonic() - t_start) * 1000
                emit_emf_event(
                    build_analysis_failed(
                        error_type="IrisError",
                        latency_until_failure_ms=elapsed_ms,
                    )
                )
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
            # -- TASK-007: analysis_failed (exception) ---------------------
            elapsed_ms = (time.monotonic() - t_start) * 1000
            emit_emf_event(
                build_analysis_failed(
                    error_type=type(iris_error).__name__,
                    latency_until_failure_ms=elapsed_ms,
                )
            )
            logger.error(f"IRIS analysis failed: {iris_error}", exc_info=True)
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "IRIS analysis failed",
                    }
                ),
                500,
            )

        # =====================================================================
        # Return result
        # =====================================================================
        metadata = metadata_from_data.copy()
        metadata.update(result.get("metadata", {}))

        # -- TASK-005/009: analysis_started (real metadata from agent) -----
        emit_emf_event(
            build_analysis_started(
                total_prompt_tokens=metadata.get("input_tokens", 0),
                cache_hit=metadata.get("cache_hit", 0),
            )
        )

        # -- TASK-006: analysis_completed ----------------------------------
        elapsed_ms = (time.monotonic() - t_start) * 1000
        blocks = result.get("responsibility_blocks", [])
        emit_emf_event(
            build_analysis_completed(
                total_latency_ms=elapsed_ms,
                input_tokens=metadata.get("input_tokens", 0),
                output_tokens=metadata.get("output_tokens", 0),
                estimated_cost_usd=metadata.get("estimated_cost_usd", 0.0),
                responsibility_block_count=len(blocks),
            )
        )

        response = {
            "success": True,
            "file_intent": result.get("file_intent", ""),
            "responsibility_blocks": blocks,
            "metadata": metadata,
        }
        return jsonify(response), 200

    except Exception as exc:  # pragma: no cover - runtime protection
        elapsed_ms = (time.monotonic() - t_start) * 1000
        emit_emf_event(
            build_analysis_failed(
                error_type=type(exc).__name__,
                latency_until_failure_ms=elapsed_ms,
            )
        )
        logger.error(f"Unexpected error during IRIS analysis: {exc}", exc_info=True)
        return (
            jsonify(
                {
                    "success": False,
                    "error": "An unexpected error occurred",
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
                "agent_error": bool(_agent_init_error),
            }
        ),
        200,
    )
