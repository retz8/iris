"""Flask routes for IRIS analysis API"""

from __future__ import annotations

import hashlib
import os
from datetime import datetime

from flask import Blueprint, jsonify, request

from config import SUPPORTED_LANGUAGES
from agent import IrisAgent, IrisError
from debugger import AgentFlowDebugger
from source_store import SourceStore

iris_bp = Blueprint("iris", __name__, url_prefix="/api/iris")

# Global instances
_source_store = SourceStore()
_iris_agent = None
_agent_init_error = None
_debug_mode = True  # Flag to enable/disable debug mode

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
        # STEP 0: Initialize debugger (conditionally based on debug mode)
        # =====================================================================
        debugger = None
        if _debug_mode:
            debugger = AgentFlowDebugger(filename, language)
            print(f"[DEBUG] Debug mode enabled for {filename}")

        # =====================================================================
        # STEP 1: Store source code and get file hash
        # =====================================================================
        file_hash = _compute_file_hash(source_code)
        _source_store.store(source_code, file_hash, filename)

        if debugger:
            debugger.set_source_code_file_hash(file_hash)
            print(
                f"[DEBUG] Source code successfully stored - location: server's memory"
            )
        # =====================================================================
        # STEP 2: Run analysis
        # =====================================================================
        result = None

        try:
            result = _iris_agent.analyze(
                filename=filename,
                language=language,
                source_store=_source_store,
                file_hash=file_hash,
                source_code=source_code,
                debugger=debugger,
            )

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
            return jsonify(
                {
                    "success": False,
                    "error": f"IRIS analysis failed: {iris_error}",
                },
                500,
            )

        # =====================================================================
        # STEP 3: Get debug report AFTER analysis (includes LLM metrics)
        # =====================================================================

        # Print debug report and save markdown if in debug mode
        if debugger and _debug_mode:
            # debugger.print_report()

            # Save markdown report
            debug_reports_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "debug_reports",
            )
            os.makedirs(debug_reports_dir, exist_ok=True)

            # Create filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_filename = os.path.splitext(filename)[0]

            # Add prefixes based on execution path and input type
            execution_path = result.get("metadata", {}).get("execution_path", "")
            print(f"[DEBUG] Execution path: {execution_path}")

            prefixes = []
            if execution_path == "fast-path":
                prefixes.append("fast_path")
            elif execution_path == "two-agent":
                prefixes.append("two_agent")

            path_prefix = "_" + "_".join(prefixes) if prefixes else ""

            report_filename = f"{base_filename}{path_prefix}_{timestamp}_debug.md"
            report_path = os.path.join(debug_reports_dir, report_filename)

            # Generate and save markdown report (includes LLM tracking)
            debugger.generate_markdown_report(output_path=report_path)
            print(f"[DEBUG] Markdown report saved to: {report_path}")

            graph_filename = (
                f"{base_filename}{path_prefix}_{timestamp}_signature_graph.json"
            )
            graph_path = os.path.join(debug_reports_dir, graph_filename)
            debugger.generate_signature_graph_json(output_path=graph_path)
            print(f"[DEBUG] Signature Graph JSON saved to: {graph_path}")

        # =====================================================================
        # STEP 4: Return result
        # =====================================================================
        metadata = metadata_from_data.copy()
        metadata.update(result.get("metadata", {}))
        metadata["analysis_input"] = "signature_graph"

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
                "debug_mode": _debug_mode,
            }
        ),
        200,
    )


def set_debug_mode(enabled: bool) -> None:
    """Enable or disable debug mode.

    When enabled, the debugger captures metrics, performs integrity checks,
    and prints detailed diagnostic reports after analysis.

    Args:
        enabled: True to enable debug mode, False to disable.
    """
    global _debug_mode
    _debug_mode = enabled
    status = "enabled" if enabled else "disabled"
    print(f"[DEBUG] Debug mode {status}")


def get_debug_mode() -> bool:
    """Get the current debug mode status.

    Returns:
        True if debug mode is enabled, False otherwise.
    """
    return _debug_mode


def _compute_file_hash(source_code: str) -> str:
    """Compute SHA-256 hash of source code for caching."""
    return hashlib.sha256(source_code.encode("utf-8")).hexdigest()
