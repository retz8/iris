"""Flask routes for IRIS analysis API (Phase 3)."""

from __future__ import annotations

import hashlib
import os
from datetime import datetime
from unittest import result

from flask import Blueprint, jsonify, request

from .agent import IrisAgent
from .ast_processor import ShallowASTProcessor
from .debugger import ShallowASTDebugger
from .source_store import SourceStore

iris_bp = Blueprint("iris", __name__, url_prefix="/api/iris")

# Global instances
_source_store = SourceStore()
_ast_processor = ShallowASTProcessor()
_iris_agent = None
_agent_init_error = None
_debug_mode = True  # Flag to enable/disable debug mode
_force_fast_path = False  # Flag to force fast-path analysis (skip fallback)
_use_raw_source = False  # Flag to use raw source code instead of shallow AST
_use_tool_calling = True  # Flag to enable/disable tool-calling mode (default: True)

try:
    _iris_agent = IrisAgent(model="gpt-4o-mini")
except Exception as exc:  # pragma: no cover - initialization fallback
    _agent_init_error = str(exc)


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


def set_force_fast_path(enabled: bool) -> None:
    """Enable or disable forced fast-path mode.

    When enabled, analysis will always use fast-path (single-stage)
    and skip fallback to two-stage analysis on error.

    Args:
        enabled: True to force fast-path, False to allow fallback.
    """
    global _force_fast_path
    _force_fast_path = enabled
    status = "enabled" if enabled else "disabled"
    print(f"[DEBUG] Force fast-path mode {status}")


def get_force_fast_path() -> bool:
    """Get the current force fast-path mode status.

    Returns:
        True if force fast-path is enabled, False otherwise.
    """
    return _force_fast_path


def set_use_raw_source(enabled: bool) -> None:
    """Enable or disable raw source code mode.

    When enabled, analysis will use raw source code instead of shallow AST.
    Useful for comparing token usage and performance.

    Args:
        enabled: True to use raw source, False to use shallow AST.
    """
    global _use_raw_source
    _use_raw_source = enabled
    status = "enabled" if enabled else "disabled"
    print(f"[DEBUG] Use raw source mode {status}")


def get_use_raw_source() -> bool:
    """Get the current use raw source mode status.

    Returns:
        True if using raw source, False if using shallow AST.
    """
    return _use_raw_source


def set_use_tool_calling(enabled: bool) -> None:
    """Enable or disable tool-calling mode.

    When enabled, analysis uses single-stage tool-calling architecture.
    When disabled, falls back to legacy two-stage analysis.

    Args:
        enabled: True to enable tool-calling, False to use two-stage.
    """
    global _use_tool_calling
    _use_tool_calling = enabled
    status = "enabled" if enabled else "disabled"
    print(f"[DEBUG] Tool-calling mode {status}")


def get_use_tool_calling() -> bool:
    """Get the current tool-calling mode status.

    Returns:
        True if tool-calling mode is enabled, False if using two-stage.
    """
    return _use_tool_calling


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
    metadata_from_data = data.get("metadata", {})

    # Handle both source_code and lines format
    source_code = data.get("source_code")
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
        # STEP 0: Initialize debugger (conditionally based on debug mode)
        # =====================================================================
        debugger = None
        if _debug_mode:
            debugger = ShallowASTDebugger(filename, language)
            print(f"[DEBUG] Debug mode enabled for {filename}")

        # =====================================================================
        # STEP 1: Store source code and get file hash
        # =====================================================================
        file_hash = _compute_file_hash(source_code)
        _source_store.store(source_code, file_hash, filename)

        # =====================================================================
        # STEP 2: Generate shallow AST (unless using raw source mode)
        # =====================================================================
        shallow_ast = None
        if _use_raw_source:
            print(f"[DEBUG] Using raw source code instead of shallow AST")
            # Skip AST processing, but still capture source in debugger
            if debugger:
                debugger.capture_snapshot("raw_source", source_code)
        else:
            try:
                shallow_ast = _ast_processor.process(source_code, language, debugger)
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
        # STEP 3: Run analysis (with fallback support)
        # =====================================================================
        # NOTE: Get debug report AFTER analysis to include LLM tracking
        # (initialized but not called yet)
        debug_report = None

        # Try fast-path first, fallback to two-stage if it fails (unless forced)
        original_line_threshold = None
        original_token_threshold = None
        try:
            # Force fast-path if flag is enabled
            if _force_fast_path:
                original_line_threshold = _iris_agent.FAST_PATH_LINE_THRESHOLD
                original_token_threshold = _iris_agent.FAST_PATH_TOKEN_THRESHOLD
                _iris_agent.set_fast_path_line_threshold(999999)  # Force fast-path
                _iris_agent.set_fast_path_token_threshold(999999)  # Force fast-path
                print(f"[DEBUG] Forcing fast-path analysis (thresholds set to 999999)")

            result = _iris_agent.analyze(
                filename=filename,
                language=language,
                shallow_ast=shallow_ast or {},
                source_store=_source_store,
                file_hash=file_hash,
                debug_report=debug_report,
                source_code=source_code,
                debugger=debugger,
                use_tool_calling=_use_tool_calling,
            )

            # Restore thresholds if they were forced
            if _force_fast_path and original_line_threshold is not None:
                _iris_agent.set_fast_path_line_threshold(original_line_threshold)
            if _force_fast_path and original_token_threshold is not None:
                _iris_agent.set_fast_path_token_threshold(original_token_threshold)

        except Exception as fast_path_error:
            # Restore thresholds if they were forced
            if _force_fast_path and original_line_threshold is not None:
                _iris_agent.set_fast_path_line_threshold(original_line_threshold)
            if _force_fast_path and original_token_threshold is not None:
                _iris_agent.set_fast_path_token_threshold(original_token_threshold)
            if _force_fast_path:
                # Don't fallback if forced - re-raise the error
                print(f"[FORCED FAST-PATH] Analysis failed: {fast_path_error}")
                raise

            # Fast-path failed, fallback to two-stage analysis
            print(f"[FALLBACK] Fast-path analysis failed: {fast_path_error}")
            print(f"[FALLBACK] Attempting two-stage analysis...")

            # Force two-stage by setting a very high line threshold temporarily
            original_threshold = _iris_agent.FAST_PATH_LINE_THRESHOLD
            _iris_agent.set_fast_path_line_threshold(-1)  # Disable fast-path

            try:
                result = _iris_agent.analyze(
                    filename=filename,
                    language=language,
                    shallow_ast=shallow_ast or {},
                    source_store=_source_store,
                    file_hash=file_hash,
                    debug_report=debug_report,
                    source_code=source_code,
                    debugger=debugger,
                    use_tool_calling=False,  # Force two-stage for fallback
                )
                # Add fallback note to metadata
                result["metadata"][
                    "notes"
                ] = f"Fallback: Fast-path error: {str(fast_path_error)[:200]}"
            finally:
                # Restore original threshold
                _iris_agent.set_fast_path_line_threshold(original_threshold)

        # =====================================================================
        # STEP 3.5: Get debug report AFTER analysis (includes LLM metrics)
        # =====================================================================
        debug_report = debugger.get_report() if debugger else None

        # Print debug report and save markdown if in debug mode
        if debugger and _debug_mode:
            debugger.print_report()

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
            if _use_raw_source:
                prefixes.append("raw_source")

            path_prefix = "_" + "_".join(prefixes) if prefixes else ""

            report_filename = f"{base_filename}{path_prefix}_{timestamp}_debug.md"
            report_path = os.path.join(debug_reports_dir, report_filename)

            # Generate and save markdown report (includes LLM tracking)
            debugger.generate_markdown_report(output_path=report_path)
            print(f"[DEBUG] Markdown report saved to: {report_path}")

            # Generate and save shallow AST JSON file
            ast_filename = f"{base_filename}{path_prefix}_{timestamp}_shallow_ast.json"
            ast_path = os.path.join(debug_reports_dir, ast_filename)
            debugger.generate_shallow_ast_json(output_path=ast_path)
            print(f"[DEBUG] Shallow AST JSON saved to: {ast_path}")

        # =====================================================================
        # STEP 4: Return result
        # =====================================================================
        metadata = metadata_from_data.copy()
        metadata.update(result.get("metadata", {}))

        response = {
            "success": True,
            "file_intent": result.get("file_intent", ""),
            "responsibilities": result.get("responsibilities", []),
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
                "debug_mode": _debug_mode,
                "force_fast_path": _force_fast_path,
                "use_raw_source": _use_raw_source,
                "use_tool_calling": _use_tool_calling,
            }
        ),
        200,
    )


@iris_bp.route("/debug", methods=["GET", "POST"])
def debug_control():
    """Control debug flags.

    GET: Return current debug flags status
    POST: Set debug flags

    Request body (POST):
    {
      "debug_mode": true/false,           // Enable debug reports and metrics
      "force_fast_path": true/false,      // Force fast-path analysis (no fallback)
      "use_raw_source": true/false,       // Use raw source instead of shallow AST
      "use_tool_calling": true/false      // Use tool-calling mode (default: true)
    }

    Response:
    {
      "debug_mode": true/false,
      "force_fast_path": true/false,
      "use_raw_source": true/false,
      "use_tool_calling": true/false,
      "status": {...}
    }
    """
    if request.method == "GET":
        return (
            jsonify(
                {
                    "debug_mode": _debug_mode,
                    "force_fast_path": _force_fast_path,
                    "use_raw_source": _use_raw_source,
                    "use_tool_calling": _use_tool_calling,
                    "status": {
                        "debug_mode": "enabled" if _debug_mode else "disabled",
                        "force_fast_path": (
                            "enabled" if _force_fast_path else "disabled"
                        ),
                        "use_raw_source": "enabled" if _use_raw_source else "disabled",
                        "use_tool_calling": (
                            "enabled" if _use_tool_calling else "disabled"
                        ),
                    },
                }
            ),
            200,
        )

    # POST request - set debug flags
    data = request.get_json(silent=True) or {}

    messages = []

    # Update debug_mode if provided
    if "debug_mode" in data:
        set_debug_mode(data["debug_mode"])
        messages.append(f"Debug mode {'enabled' if data['debug_mode'] else 'disabled'}")

    # Update force_fast_path if provided
    if "force_fast_path" in data:
        set_force_fast_path(data["force_fast_path"])
        messages.append(
            f"Force fast-path {'enabled' if data['force_fast_path'] else 'disabled'}"
        )

    # Update use_raw_source if provided
    if "use_raw_source" in data:
        set_use_raw_source(data["use_raw_source"])
        messages.append(
            f"Use raw source {'enabled' if data['use_raw_source'] else 'disabled'}"
        )

    # Update use_tool_calling if provided
    if "use_tool_calling" in data:
        set_use_tool_calling(data["use_tool_calling"])
        messages.append(
            f"Tool-calling mode {'enabled' if data['use_tool_calling'] else 'disabled'}"
        )

    if not messages:
        messages.append("No flags changed")

    return (
        jsonify(
            {
                "debug_mode": _debug_mode,
                "force_fast_path": _force_fast_path,
                "use_raw_source": _use_raw_source,
                "use_tool_calling": _use_tool_calling,
                "message": "; ".join(messages),
            }
        ),
        200,
    )
