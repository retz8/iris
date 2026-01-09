import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(__file__))

from analyzer.noise_detector import detect_noise
from parser.ast_parser import ASTParser
from analyzer.function_extractor import FunctionExtractor
from analyzer.section_detector import SectionDetector

app = Flask(__name__, static_folder="static")

# Configure CORS to allow requests from GitHub and Chrome Extension
# Using resources parameter with origins for proper CORS handling
CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "https://github.com/*",
            ],
            "allow_headers": ["Content-Type"],
            "methods": ["GET", "POST", "OPTIONS"],
        }
    },
)

# Initialize Phase 0 components (AST-based analysis)
ast_parser = ASTParser()
function_extractor = FunctionExtractor()
section_detector = SectionDetector()


@app.route("/")
def index():
    return jsonify(
        {"message": "IRIS - Intelligent Review & Insight System (Noise Eraser API)"}
    )


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"})


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Analyze code to detect noise patterns for visual dimming
    POST: /analyze
    Expects JSON payload with "code" and optional "language" fields.
    Returns JSON response with noise line numbers and ranges.
    """
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    language = data.get("language", "javascript")

    try:
        # Auto-detect language if not provided
        if not language or language == "auto":
            language = detect_language_from_code(code)

        # Perform noise detection
        result = detect_noise(code, language)

        return jsonify(result), (200 if result.get("success") else 400)

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Analysis failed: {str(e)}",
                    "language": language,
                }
            ),
            500,
        )


@app.route("/analyze-structure", methods=["POST"])
def analyze_structure():
    """
    NEW ENDPOINT: Analyze code structure using AST (Phase 1)

    POST: /analyze-structure
    Expects JSON payload with:
    - code: Source code string
    - language: Programming language (javascript, python, go, etc.)
    - filepath: Optional file path for context

    Returns JSON response with:
    - success: Boolean
    - language: Detected/provided language
    - filepath: File path
    - file_summary: {total_lines, total_functions, complexity}
    - functions: [{name, start_line, end_line, params, sections: [...]}]
    """
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    language = data.get("language", "javascript")
    filepath = data.get("filepath", "")

    if not code:
        return jsonify({"success": False, "error": "No code provided"}), 400

    try:
        # Auto-detect language if not provided
        if not language or language == "auto":
            language = detect_language_from_code(code)

        # 1. Parse AST
        ast_tree = ast_parser.parse(code, language)

        # 2. Extract functions
        functions = function_extractor.extract_functions(ast_tree, language)

        # 3. Detect sections for each function
        for func in functions:
            func.sections = section_detector.detect_sections(func, language)

        # 4. Generate file summary
        total_lines = len(code.split("\n"))
        file_summary = {
            "total_lines": total_lines,
            "total_functions": len(functions),
            "complexity": _estimate_complexity(total_lines, len(functions)),
        }

        # 5. Return structured data
        return (
            jsonify(
                {
                    "success": True,
                    "language": language,
                    "filepath": filepath,
                    "file_summary": file_summary,
                    "functions": [
                        {
                            **func.to_dict(),
                            "sections": [s.to_dict() for s in func.sections],
                        }
                        for func in functions
                    ],
                }
            ),
            200,
        )

    except ValueError as e:
        return jsonify({"success": False, "error": str(e), "language": language}), 400
    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Structure analysis failed: {str(e)}",
                    "language": language,
                }
            ),
            500,
        )


def _estimate_complexity(total_lines: int, num_functions: int) -> str:
    """Simple complexity heuristic"""
    if total_lines < 100:
        return "low"
    elif total_lines < 300:
        return "medium"
    else:
        return "high"


def detect_language_from_code(code: str) -> str:
    """
    Auto-detect programming language from code content.
    Falls back to 'javascript' if unable to determine.

    Args:
        code (str): Source code to analyze

    Returns:
        str: Detected language name
    """
    code_lower = code.lower()

    # Check for language-specific patterns
    if "def " in code and "import " in code:
        if "django" in code or "flask" in code or ".py" in code:
            return "python"

    if "import " in code and "export " in code:
        return "javascript"

    if "func " in code or "package " in code or "defer " in code:
        return "go"

    if "class " in code and "public " in code and "{" in code:
        if "System.out" in code:
            return "java"

    # Default to JavaScript
    return "javascript"


@app.route("/static/<path:filename>")
def static_files(filename):
    """Serve static files"""
    return send_from_directory(
        os.path.join(os.path.dirname(__file__), "static"), filename
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
