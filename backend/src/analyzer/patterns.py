"""
Heuristic-based noise pattern definitions for multiple languages
Uses weighted scoring system to identify non-essential code with high precision
"""

import re
from functools import lru_cache

# Compiled pattern cache
_pattern_cache = {}

def get_compiled_patterns(language):
    """
    Get compiled regex patterns for a language with caching.
    Returns patterns organized by confidence level for heuristic scoring.
    """
    if language not in _pattern_cache:
        patterns = NOISE_PATTERNS.get(language.lower(), {})
        compiled = {}
        
        for confidence_level, categories in patterns.items():
            compiled[confidence_level] = {}
            for category, pattern_info in categories.items():
                compiled[confidence_level][category] = {
                    'weight': pattern_info['weight'],
                    'patterns': [re.compile(p, re.IGNORECASE) for p in pattern_info['patterns']]
                }
        
        _pattern_cache[language] = compiled
    
    return _pattern_cache[language]


# Heuristic scoring system with confidence-based weights
# Each pattern has a weight (0-40) indicating confidence it's noise
# Higher weight = more confident it's pure noise

NOISE_PATTERNS = {
    "javascript": {
        "high_confidence": {
            "logging": {
                "weight": 40,
                "patterns": [
                    r"console\.(log|debug)\(",  # Debug logging (not error/warn)
                    r"//\s*(TODO|FIXME|DEBUG|XXX)",  # Dev comments
                    r"debugger;",  # Debugger statements
                ]
            }
        },
        "medium_confidence": {
            "error_logging": {
                "weight": 25,
                "patterns": [
                    r"console\.(error|warn)\(",  # Error logging (might be important)
                    r"logger\.(debug|trace)\(",  # Low-level logging
                ]
            },
            "imports": {
                "weight": 20,
                "patterns": [
                    r"^import\s+.*from\s+['\"]",  # Standard imports
                    r"^require\(['\"]",  # CommonJS requires
                    r"^export\s+(default\s+)?(const|let|var|function|class)",  # Exports
                ]
            },
            "simple_guards": {
                "weight": 20,
                "patterns": [
                    r"if\s*\(!.*\)\s*return\s*;?\s*$",  # Simple early returns
                    r"if\s*\(.*===\s*undefined\)\s*return",  # Undefined checks
                ]
            }
        },
        "low_confidence": {
            "contextual_error_handling": {
                "weight": 10,
                "patterns": [
                    r"catch\s*\(\w+\)\s*{\s*$",  # Empty catch blocks only
                    r"finally\s*{\s*$",  # Finally blocks (often cleanup)
                ]
            }
        }
    },
    
    "python": {
        "high_confidence": {
            "logging": {
                "weight": 40,
                "patterns": [
                    r"print\(['\"].*debug",  # Debug prints
                    r"logging\.debug\(",  # Debug logging
                    r"#\s*(TODO|FIXME|DEBUG|XXX)",  # Dev comments
                ]
            }
        },
        "medium_confidence": {
            "imports": {
                "weight": 20,
                "patterns": [
                    r"^import\s+\w+$",  # Simple imports
                    r"^from\s+\w+\s+import\s+\w+",  # From imports
                ]
            },
            "simple_guards": {
                "weight": 20,
                "patterns": [
                    r"if\s+not\s+\w+:\s*return",  # Simple guards
                    r"if\s+\w+\s+is\s+None:\s*return",  # None checks
                ]
            }
        },
        "low_confidence": {
            "error_logging": {
                "weight": 10,
                "patterns": [
                    r"logging\.(error|warning)\(",  # Error logs (might be critical)
                    r"except\s+\w+Error\s*:\s*pass",  # Empty exception handlers
                ]
            }
        }
    },
    
    "go": {
        "high_confidence": {
            "logging": {
                "weight": 40,
                "patterns": [
                    r"fmt\.Println\(",  # Simple prints
                    r"log\.Printf\(.*DEBUG",  # Debug logging
                    r"//\s*(TODO|FIXME|DEBUG)",  # Dev comments
                ]
            }
        },
        "medium_confidence": {
            "imports": {
                "weight": 20,
                "patterns": [
                    r"^import\s+\"",  # Single imports
                ]
            },
            "defer_statements": {
                "weight": 15,
                "patterns": [
                    r"defer\s+\w+\.\w+\(\)",  # Simple defer calls
                ]
            }
        },
        "low_confidence": {
            "error_checks": {
                "weight": 10,
                "patterns": [
                    r"if\s+err\s+!=\s+nil\s*{\s*return",  # Simple error returns
                ]
            }
        }
    },
    
    "java": {
        "high_confidence": {
            "logging": {
                "weight": 40,
                "patterns": [
                    r"System\.out\.println\(",  # Debug prints
                    r"logger\.debug\(",  # Debug logging
                    r"//\s*(TODO|FIXME|DEBUG)",  # Dev comments
                ]
            }
        },
        "medium_confidence": {
            "imports": {
                "weight": 20,
                "patterns": [
                    r"^import\s+java\.",  # Java standard library
                    r"^import\s+\w+\.\w+\.\w+;",  # Package imports
                ]
            }
        },
        "low_confidence": {
            "empty_catches": {
                "weight": 10,
                "patterns": [
                    r"catch\s*\(\w+\s+\w+\)\s*{\s*}",  # Empty catch blocks
                ]
            }
        }
    },
    
    # C/C++
    "c": {
        "high_confidence": {
            "logging": {
                "weight": 40,
                "patterns": [
                    r"printf\(.*DEBUG",  # Debug prints
                    r"//\s*(TODO|FIXME|DEBUG)",  # Dev comments
                ]
            }
        },
        "medium_confidence": {
            "includes": {
                "weight": 20,
                "patterns": [
                    r"^#include\s+<\w+\.h>",  # Standard library includes
                ]
            }
        }
    },
    
    # Rust
    "rust": {
        "high_confidence": {
            "logging": {
                "weight": 40,
                "patterns": [
                    r"println!\(",  # Debug macros
                    r"dbg!\(",  # Debug macro
                    r"//\s*(TODO|FIXME|DEBUG)",  # Dev comments
                ]
            }
        },
        "medium_confidence": {
            "uses": {
                "weight": 20,
                "patterns": [
                    r"^use\s+std::",  # Standard library uses
                ]
            }
        }
    },
    
    # Ruby
    "ruby": {
        "high_confidence": {
            "logging": {
                "weight": 40,
                "patterns": [
                    r"puts\s+['\"].*debug",  # Debug prints
                    r"p\s+\w+",  # p method (debugging)
                    r"#\s*(TODO|FIXME|DEBUG)",  # Dev comments
                ]
            }
        },
        "medium_confidence": {
            "requires": {
                "weight": 20,
                "patterns": [
                    r"^require\s+['\"]",  # Requires
                ]
            }
        }
    },
    
    # PHP
    "php": {
        "high_confidence": {
            "logging": {
                "weight": 40,
                "patterns": [
                    r"var_dump\(",  # Debug dumps
                    r"print_r\(",  # Debug prints
                    r"//\s*(TODO|FIXME|DEBUG)",  # Dev comments
                ]
            }
        },
        "medium_confidence": {
            "includes": {
                "weight": 20,
                "patterns": [
                    r"^require_once\s+",  # Requires
                    r"^include_once\s+",  # Includes
                ]
            }
        }
    }
}
