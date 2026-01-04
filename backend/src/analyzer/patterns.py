"""
Noise pattern definitions for multiple languages
Defines regex patterns to identify non-essential code (logging, error handling, imports, guards)
"""

NOISE_PATTERNS = {
    "javascript": {
        "error_handling": [
            r"try\s*{",
            r"catch\s*\(",
            r"finally\s*{",
            r"if\s*\(.*error.*\)",
            r"throw\s+new\s+",
            r"\.catch\(",
        ],
        "logging": [
            r"console\.(log|error|warn|info|debug)",
            r"logger\.",
            r"debug\(",
        ],
        "imports": [
            r"^import\s+",
            r"^require\(",
            r"^export\s+(default\s+)?",
            r"^from\s+",
        ],
        "guards": [
            r"if\s*\(!.*\)\s*return",
            r"if\s*\(.*==\s*null\)",
            r"if\s*\(.*===\s*undefined\)",
            r"if\s*\(!.*\)\s*{",
        ],
    },
    "python": {
        "error_handling": [
            r"try\s*:",
            r"except\s+",
            r"finally\s*:",
            r"if\s+.*error.*:",
            r"raise\s+",
        ],
        "logging": [
            r"print\(",
            r"logging\.",
            r"logger\.",
            r"log\(",
        ],
        "imports": [
            r"^import\s+",
            r"^from\s+.*import",
            r"^__all__\s*=",
        ],
        "guards": [
            r"if\s+not\s+.*:",
            r"if\s+.*\s+is\s+None:",
            r"if\s+not\s+.*:",
        ],
    },
    "go": {
        "error_handling": [
            r"if\s+err\s+!=\s+nil",
            r"if\s+err\s+==\s+nil",
            r"panic\(",
            r"defer\s+",
        ],
        "logging": [
            r"log\.",
            r"fmt\.(Println|Printf|Print)",
        ],
        "imports": [
            r"^import\s+",
            r"^import\s*\(",
        ],
        "guards": [
            r"if\s+.*\s+==\s+nil",
            r"if\s+.*\s+!=\s+nil",
        ],
    },
    "java": {
        "error_handling": [
            r"try\s*{",
            r"catch\s*\(",
            r"finally\s*{",
            r"throw\s+new\s+",
        ],
        "logging": [
            r"logger\.",
            r"log\.",
            r"System\.out\.println",
        ],
        "imports": [
            r"^import\s+",
            r"^package\s+",
        ],
        "guards": [
            r"if\s*\(.*==\s*null\)",
            r"if\s*\(!.*\)\s*{",
        ],
    },
}
