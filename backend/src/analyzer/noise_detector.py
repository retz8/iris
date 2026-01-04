"""
Noise Detection Engine
Analyzes code and identifies non-essential patterns for visual dimming
"""

import re
from typing import Dict, List, Tuple
from .patterns import NOISE_PATTERNS


def detect_noise(code: str, language: str) -> Dict:
    """
    Analyze code and identify noise patterns that should be dimmed.
    
    Args:
        code (str): The source code to analyze
        language (str): Programming language (javascript, python, go, java)
    
    Returns:
        Dict: {
            "success": bool,
            "language": str,
            "noise_lines": List[int],  # Line numbers (1-indexed)
            "noise_ranges": List[Dict],  # [{"start": 3, "end": 5, "type": "error_handling"}]
            "noise_percentage": float,  # Percentage of code that is noise (0-100)
            "error": str  # Error message if any
        }
    """
    try:
        # Validate inputs
        if not code or not code.strip():
            return {
                "success": True,
                "language": language,
                "noise_lines": [],
                "noise_ranges": [],
                "noise_percentage": 0.0,
            }
        
        # Normalize language name
        language = language.lower().strip()
        
        # Validate language support
        if language not in NOISE_PATTERNS:
            return {
                "success": False,
                "error": f"Language '{language}' not yet supported. Supported: {list(NOISE_PATTERNS.keys())}",
                "language": language,
            }
        
        # Split into lines and detect noise
        lines = code.split("\n")
        noise_line_numbers = set()
        noise_classifications = {}  # Line number -> list of noise types
        
        patterns = NOISE_PATTERNS[language]
        
        for line_idx, line in enumerate(lines, start=1):
            line_stripped = line.strip()
            
            # Skip empty lines
            if not line_stripped:
                continue
            
            line_noise_types = []
            
            # Check all noise categories
            for category, regexes in patterns.items():
                for regex_pattern in regexes:
                    try:
                        if re.search(regex_pattern, line, re.IGNORECASE):
                            line_noise_types.append(category)
                            break  # Found match in this category, move to next
                    except re.error as e:
                        # Log but don't crash on bad regex
                        pass
            
            # If any noise type matched, mark this line as noise
            if line_noise_types:
                noise_line_numbers.add(line_idx)
                noise_classifications[line_idx] = list(set(line_noise_types))
        
        # Convert to sorted list
        noise_lines = sorted(list(noise_line_numbers))
        
        # Group consecutive noise lines into ranges
        noise_ranges = _group_into_ranges(noise_lines, noise_classifications)
        
        # Calculate noise percentage
        total_non_empty_lines = sum(1 for line in lines if line.strip())
        noise_percentage = (
            (len(noise_line_numbers) / total_non_empty_lines * 100)
            if total_non_empty_lines > 0
            else 0.0
        )
        
        return {
            "success": True,
            "language": language,
            "noise_lines": noise_lines,
            "noise_ranges": noise_ranges,
            "noise_percentage": round(noise_percentage, 2),
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Analysis error: {str(e)}",
            "language": language,
        }


def _group_into_ranges(
    noise_lines: List[int], classifications: Dict[int, List[str]]
) -> List[Dict]:
    """
    Group consecutive noise lines into ranges with type classification.
    
    Args:
        noise_lines: Sorted list of noise line numbers
        classifications: Line number -> list of noise types
    
    Returns:
        List of range dictionaries with type information
    """
    if not noise_lines:
        return []
    
    ranges = []
    current_start = noise_lines[0]
    current_end = noise_lines[0]
    current_types = set(classifications.get(noise_lines[0], []))
    
    for line_num in noise_lines[1:]:
        # Check if consecutive
        if line_num == current_end + 1:
            # Continue range
            current_end = line_num
            current_types.update(classifications.get(line_num, []))
        else:
            # End current range and start new one
            ranges.append({
                "start": current_start,
                "end": current_end,
                "type": _classify_range(list(current_types)),
                "types": list(current_types),
            })
            current_start = line_num
            current_end = line_num
            current_types = set(classifications.get(line_num, []))
    
    # Add final range
    ranges.append({
        "start": current_start,
        "end": current_end,
        "type": _classify_range(list(current_types)),
        "types": list(current_types),
    })
    
    return ranges


def _classify_range(types: List[str]) -> str:
    """
    Determine primary noise type for a range based on its constituent types.
    
    Args:
        types: List of noise types in the range
    
    Returns:
        Primary noise type string
    """
    # Priority order
    priority = ["error_handling", "imports", "logging", "guards"]
    
    for p in priority:
        if p in types:
            return p
    
    return types[0] if types else "unknown"
