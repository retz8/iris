"""
Heuristic-based Noise Detection Engine
Uses multi-factor scoring to identify non-essential code patterns with high precision
"""

import re
from typing import Dict, List, Tuple
from .patterns import NOISE_PATTERNS, get_compiled_patterns


# Configuration constants
DEFAULT_NOISE_THRESHOLD = 20  # Only dim lines with score >= 60 (balanced precision/recall)
CONTEXT_WINDOW = 3  # Lines before/after to analyze for context


def detect_noise(code: str, language: str, threshold: int = DEFAULT_NOISE_THRESHOLD) -> Dict:
    """
    Analyze code using heuristic scoring to identify noise patterns.
    Prioritizes precision - only dims code that is clearly non-essential.
    
    Args:
        code (str): The source code to analyze
        language (str): Programming language (javascript, python, go, java, etc.)
        threshold (int): Minimum score (0-100) to consider as noise. Default 70 for high precision.
    
    Returns:
        Dict: {
            "success": bool,
            "language": str,
            "noise_lines": List[int],  # Line numbers with score >= threshold
            "noise_scores": Dict[int, int],  # Line number -> noise score (0-100)
            "noise_ranges": List[Dict],  # Grouped consecutive noise lines
            "noise_percentage": float,  # Percentage of code that is noise (0-100)
            "stats": Dict  # Additional statistics for debugging
        }
    """
    try:
        # Validate inputs
        if not code or not code.strip():
            return {
                "success": True,
                "language": language,
                "noise_lines": [],
                "noise_scores": {},
                "noise_ranges": [],
                "noise_percentage": 0.0,
                "stats": {"total_lines": 0, "analyzed_lines": 0}
            }
        
        # Normalize language name
        language = language.lower().strip()
        
        # Handle language aliases
        language = _normalize_language(language)
        
        # Validate language support
        if language not in NOISE_PATTERNS:
            return {
                "success": False,
                "error": f"Language '{language}' not yet supported. Supported: {list(NOISE_PATTERNS.keys())}",
                "language": language,
            }
        
        # Split into lines and analyze
        lines = code.split("\n")
        total_lines = len(lines)
        
        # Get compiled patterns
        compiled_patterns = get_compiled_patterns(language)
        
        # Calculate noise scores for each line
        noise_scores = _calculate_noise_scores(lines, compiled_patterns, language)
        
        # Filter lines above threshold
        noise_lines = [line_num for line_num, score in noise_scores.items() if score >= threshold]
        noise_lines.sort()
        
        # Group consecutive lines into ranges
        noise_ranges = _group_into_ranges(noise_lines, noise_scores)
        
        # Calculate statistics
        analyzed_lines = len([line for line in lines if line.strip()])  # Non-empty lines
        noise_percentage = (len(noise_lines) / analyzed_lines * 100) if analyzed_lines > 0 else 0.0
        
        return {
            "success": True,
            "language": language,
            "noise_lines": noise_lines,
            "noise_scores": noise_scores,
            "noise_ranges": noise_ranges,
            "noise_percentage": round(noise_percentage, 1),
            "stats": {
                "total_lines": total_lines,
                "analyzed_lines": analyzed_lines,
                "noise_lines_count": len(noise_lines),
                "threshold_used": threshold,
                "avg_noise_score": round(sum(noise_scores.values()) / len(noise_scores), 1) if noise_scores else 0
            }
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": f"Error analyzing code: {str(e)}",
            "language": language,
        }


def _normalize_language(language: str) -> str:
    """Normalize language aliases to standard names"""
    aliases = {
        'js': 'javascript',
        'ts': 'javascript',
        'typescript': 'javascript',
        'jsx': 'javascript',
        'tsx': 'javascript',
        'py': 'python',
        'cpp': 'c',
        'c++': 'c',
        'cc': 'c',
        'cxx': 'c',
        'rs': 'rust',
        'rb': 'ruby',
    }
    return aliases.get(language, language)


def _calculate_noise_scores(lines: List[str], compiled_patterns: Dict, language: str) -> Dict[int, int]:
    """
    Calculate noise score (0-100) for each non-empty line using heuristic analysis.
    
    Scoring factors:
    1. Pattern matching (weighted by confidence)
    2. Context analysis (comments, surrounding code)
    3. Code density (isolated lines vs blocks)
    4. Semantic markers (keywords, structure)
    
    Returns: Dict mapping line_number (1-indexed) -> score
    """
    noise_scores = {}
    
    for line_idx, line in enumerate(lines, start=1):
        line_stripped = line.strip()
        
        # Skip empty lines
        if not line_stripped:
            continue
        
        # Build context for this line
        context = _build_context(lines, line_idx - 1, CONTEXT_WINDOW)
        
        # Calculate base score from pattern matching
        base_score = _calculate_pattern_score(line_stripped, compiled_patterns)
        
        # Apply context-based modifiers
        context_modifier = _calculate_context_modifier(line_stripped, context, language)
        
        # Final score (capped at 0-100)
        final_score = max(0, min(100, base_score + context_modifier))
        
        # Only store non-zero scores
        if final_score > 0:
            noise_scores[line_idx] = final_score
    
    return noise_scores


def _calculate_pattern_score(line: str, compiled_patterns: Dict) -> int:
    """
    Calculate base noise score from pattern matching.
    Uses weighted patterns organized by confidence level.
    """
    score = 0
    matched_categories = []
    
    # Check patterns from high to low confidence
    for confidence_level in ['high_confidence', 'medium_confidence', 'low_confidence']:
        if confidence_level not in compiled_patterns:
            continue
        
        for category, pattern_info in compiled_patterns[confidence_level].items():
            weight = pattern_info['weight']
            patterns = pattern_info['patterns']
            
            for pattern in patterns:
                try:
                    if pattern.search(line):
                        score += weight
                        matched_categories.append(category)
                        break  # Only count once per category
                except Exception:
                    pass
    
    return score


def _build_context(lines: List[str], line_idx: int, window: int) -> Dict:
    """Build contextual information for a line"""
    start_idx = max(0, line_idx - window)
    end_idx = min(len(lines), line_idx + window + 1)
    
    prev_lines = [lines[i].strip() for i in range(start_idx, line_idx) if i >= 0]
    next_lines = [lines[i].strip() for i in range(line_idx + 1, end_idx) if i < len(lines)]
    
    return {
        'prev_lines': prev_lines,
        'next_lines': next_lines,
        'has_nearby_comment': _has_nearby_comment(prev_lines, next_lines),
        'is_isolated': _is_isolated_line(prev_lines, next_lines),
        'block_depth': _estimate_block_depth(lines[line_idx]),
    }


def _calculate_context_modifier(line: str, context: Dict, language: str) -> int:
    """
    Calculate score modifiers based on context.
    Negative modifiers REDUCE noise score (increases precision).
    """
    modifier = 0
    
    # PRECISION BOOSTERS (reduce false positives)
    
    # If line has explanatory comment nearby, it's likely important
    if context['has_nearby_comment']:
        modifier -= 25  # Strong reduction
    
    # If line is part of a dense code block (not isolated), be cautious
    if not context['is_isolated']:
        modifier -= 10
    
    # Lines with deep nesting are often core logic
    if context['block_depth'] > 2:
        modifier -= 15
    
    # NOISE INDICATORS (increase confidence)
    
    # Isolated single-line statements are often noise
    if context['is_isolated']:
        modifier += 15  # Increased to better detect isolated debug statements
    
    # Lines at top-level (imports, TODOs) are often noise
    if context['block_depth'] == 0:
        modifier += 10  # Increased for better top-level noise detection
    
    return modifier


def _has_nearby_comment(prev_lines: List[str], next_lines: List[str]) -> bool:
    """Check if there's an explanatory comment near this line"""
    comment_patterns = {
        'javascript': [r'//\s*\w', r'/\*\*?\s*\w'],
        'python': [r'#\s*\w', r'"""', r"'''"],
        'go': [r'//\s*\w', r'/\*'],
        'java': [r'//\s*\w', r'/\*\*?\s*\w'],
        'c': [r'//\s*\w', r'/\*'],
        'rust': [r'//\s*\w', r'/\*'],
        'ruby': [r'#\s*\w'],
        'php': [r'//\s*\w', r'/\*', r'#\s*\w'],
    }
    
    all_nearby = prev_lines[-2:] + next_lines[:2]  # Check closest 2 lines each direction
    
    for line in all_nearby:
        # Exclude TODO/FIXME comments (those are noise)
        if re.search(r'(TODO|FIXME|DEBUG|XXX)', line, re.IGNORECASE):
            continue
        # Check for substantive comments (more than just "//" or "#")
        if re.search(r'(//|#|/\*)\s*\w{3,}', line):
            return True
    
    return False


def _is_isolated_line(prev_lines: List[str], next_lines: List[str]) -> bool:
    """Check if line is isolated (empty lines around it)"""
    prev_empty = all(not line for line in prev_lines[-1:])  # Check last prev line
    next_empty = all(not line for line in next_lines[:1])   # Check first next line
    return prev_empty or next_empty


def _estimate_block_depth(line: str) -> int:
    """Estimate nesting depth from indentation"""
    if not line:
        return 0
    leading_spaces = len(line) - len(line.lstrip())
    return leading_spaces // 4  # Assume 4-space or 1-tab indentation


def _group_into_ranges(noise_lines: List[int], noise_scores: Dict[int, int]) -> List[Dict]:
    """
    Group consecutive noise lines into ranges with score information.
    """
    if not noise_lines:
        return []
    
    ranges = []
    current_range = {"start": noise_lines[0], "end": noise_lines[0], "avg_score": noise_scores[noise_lines[0]]}
    
    for i in range(1, len(noise_lines)):
        line_num = noise_lines[i]
        
        # If consecutive, extend current range
        if line_num == current_range["end"] + 1:
            current_range["end"] = line_num
            # Update average score
            range_lines = list(range(current_range["start"], current_range["end"] + 1))
            scores = [noise_scores.get(ln, 0) for ln in range_lines]
            current_range["avg_score"] = sum(scores) // len(scores) if scores else 0
        else:
            # Save current range and start new one
            ranges.append(current_range)
            current_range = {"start": line_num, "end": line_num, "avg_score": noise_scores[line_num]}
    
    # Don't forget the last range
    ranges.append(current_range)
    
    return ranges
