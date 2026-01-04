import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(__file__))

from converter.main import convert_cpp_to_python
from analyzer.noise_detector import detect_noise

app = Flask(__name__, static_folder='static')

# Configure CORS to allow requests from GitHub and Chrome Extension
# Using resources parameter with origins for proper CORS handling
CORS(app, resources={
    r"/*": {
        "origins": [
            "https://github.com",
        ],
        "allow_headers": ["Content-Type"],
        "methods": ["GET", "POST", "OPTIONS"]
    }
})

@app.route('/')
def index():
    return jsonify({"message": "Welcome to the C++ to Python converter API"})

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok"})

@app.route('/convert', methods=['POST'])
def convert():
    """
    Handle code conversion requests
    POST: /convert
    Expects JSON payload with "code" field containing C++ code.
    Returns JSON response with converted Python code or error messages.
    """
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    try:
        result = convert_cpp_to_python(code)
        return jsonify({
            "success": True,
            "python": result.get("python", ""),
            "lines": result.get("lines", []),
            "errors": []
        })
    except Exception as e:
        return jsonify({"success": False, "python": "", "errors": [str(e)]}), 500

@app.route('/analyze', methods=['POST'])
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
        return jsonify({
            "success": False,
            "error": f"Analysis failed: {str(e)}",
            "language": language
        }), 500

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

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files"""
    return send_from_directory(os.path.join(os.path.dirname(__file__), "static"), filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)