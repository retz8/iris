"""
LLM Prompt Template for Single LLM Experiment (Exp-1)

This module contains the prompt engineering logic for extracting
File Intent and Responsibility Map from source code.
"""

from typing import List


def build_analysis_prompt(lines: List[str], filename: str, language: str) -> str:
    code = "\n".join(lines)

    prompt = f"""
You are an assistant helping developers understand unfamiliar source code.

Your task is NOT to summarize code features or list APIs.
Your task is to extract the **mental model a first-time reader should form before reading the code in detail**.

Given the following {language} source file, produce two things:

---

## 1. File Intent (WHY)

Answer the question:ㅈ

**“Why does this file exist in the system?”**

Guidelines:
- Focus on the file’s **conceptual role in the system**
- Explain what problem this file solves at a structural or architectural level
- Prefer descriptions like *“acts as a bridge”*, *“coordinates”*, *“dispatches”*, *“integrates”*
- Avoid phrases like *“implements X”* or listing technologies unless essential
- 1–4 short lines, readable in under 5 seconds

---

## 2. Responsibility Map (WHAT)

Identify **3–6 major conceptual responsibilities** this file fulfills.

A responsibility:
This responsibility SHOULD describe a role this file plays in the overall system, not a feature it provides.
- Represents a **distinct conceptual role**, not a utility or helper
- Groups related code that a human would naturally read together
- Explains *why that code exists*, not just what it does
- Should still make sense **without reading the source code**

### VERY IMPORTANT:
- Do NOT create responsibilities for minor helpers (e.g. encoding, small utilities)
- Do NOT simply categorize by API type (e.g. “HTTP”, “WebSocket”, “Cookie”)
- Prioritize responsibilities that are **central to the file’s purpose**
- Ask yourself: *“If I removed this responsibility, would the file still make sense?”*

For each responsibility, provide:
- `id`: unique kebab-case identifier
- `label`: short conceptual title (2–4 words)
- `description`: what role this responsibility plays in the file (1–2 sentences)
- `ranges`: [start_line, end_line] pairs covering complete logical units

Line numbers are 1-indexed.

---

## Output Format

Return ONLY valid JSON in this exact structure:

```json
{{
  "file_intent": {{
    "text": "Why this file exists..."
  }},
  "responsibilities": [
    {{
      "id": "conceptual-role",
      "label": "Conceptual Role",
      "description": "Why this responsibility exists...",
      "ranges": [[start_line, end_line]]
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
    return """
You specialize in extracting **human-centric, conceptual abstractions** from source code.

You do NOT produce:
- Feature lists
- API documentation
- Line-by-line summaries

You DO produce:
- File intent (why this file exists)
- Conceptual responsibilities (what roles it plays in the system)

Your output should help a developer decide:
- What this file is about
- Which parts matter most
- Where to start reading

Always return valid JSON matching the requested schema.
"""
