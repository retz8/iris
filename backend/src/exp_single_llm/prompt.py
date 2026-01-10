"""
LLM Prompt Template for Single LLM Experiment (Exp-1)

This module contains the prompt engineering logic for extracting
File Intent and Responsibility Map from source code.
"""

from typing import List


def build_analysis_prompt(lines: List[str], filename: str, language: str) -> str:
    """
    Build a prompt for the LLM to analyze source code and extract:
    - File Intent (WHY this file exists)
    - Responsibility Map (WHAT responsibilities this file fulfills)

    Args:
        lines: Source code as a list of lines
        filename: Name of the file
        language: Programming language

    Returns:
        Formatted prompt string
    """

    # Join lines and add line numbers for reference
    code = "\n".join(lines)

    prompt = f"""You are a code analysis assistant. Your task is to analyze source code and extract high-level semantic abstractions that help developers understand unfamiliar code quickly.

Given the following {language} source file, extract:

1. **File Intent (WHY)**: A concise explanation (1-4 short lines) of why this file exists and what problem it primarily solves. Focus on conceptual purpose, not implementation details.

2. **Responsibility Map (WHAT)**: A list of 3-6 major responsibilities this file fulfills. Each responsibility represents a distinct conceptual role or concern. For each responsibility, provide:
   - `id`: A unique kebab-case identifier (e.g., "data-loading", "search-api")
   - `label`: A short, clear title (2-4 words)
   - `description`: A brief explanation of what this responsibility does (1-2 sentences)
   - `ranges`: An array of [start_line, end_line] pairs indicating which code regions belong to this responsibility (line numbers are 1-indexed)

**Guidelines:**
- Responsibilities should reflect how a human would mentally chunk the file
- Avoid over-fragmentation (don't create a responsibility for every function)
- Group related functions/code regions under a single responsibility
- Line ranges should cover complete logical units (entire functions, class definitions, etc.)
- Responsibilities should be understandable without reading the code
- Focus on WHAT the code does at a high level, not HOW it does it

**Output Format:**
Return your analysis as a JSON object with this exact structure:

```json
{{
  "file_intent": {{
    "text": "Brief explanation of why this file exists and its primary purpose..."
  }},
  "responsibilities": [
    {{
      "id": "responsibility-identifier",
      "label": "Responsibility Title",
      "description": "What this responsibility does...",
      "ranges": [[start_line, end_line], [start_line, end_line]]
    }}
  ]
}}
```

**Example Output:**
```json
{{
  "file_intent": {{
    "text": "REST API endpoint for search index server. Loads ranking data and inverted index into memory, then provides search query interface with score calculation."
  }},
  "responsibilities": [
    {{
      "id": "data-loading",
      "label": "Data Loading",
      "description": "Load pagerank scores and inverted index data from files into memory at startup.",
      "ranges": [[18, 27], [30, 94], [97, 103]]
    }},
    {{
      "id": "search-api",
      "label": "Search API",
      "description": "Handle incoming search requests, find matching documents, calculate relevance scores, and return ranked results.",
      "ranges": [[106, 153]]
    }}
  ]
}}
```

**File to Analyze:**
Filename: {filename}
Language: {language}

```{language}
{code}
```

Now analyze the code above and return ONLY the JSON output (no additional text or explanation):"""

    return prompt


def build_system_message() -> str:
    """
    Build the system message for the LLM.

    Returns:
        System message string
    """
    return """You are a code analysis expert specializing in extracting high-level semantic abstractions from source code. 

Your goal is to help developers quickly understand unfamiliar code by identifying:
1. WHY the file exists (File Intent)
2. WHAT major responsibilities it fulfills (Responsibility Map)

You provide clear, concise, human-centric abstractions that prepare developers to read code, not replace reading it.

Always respond with valid JSON matching the requested schema. Be accurate with line numbers."""
