# IRIS MVP Instructions
**Project Pivot: January 10, 2026**

### File Intent & Responsibility Map (Side Panel + Hover UX)

---

## 1. MVP Goal

This MVP aims to validate whether **showing high-level semantic context (WHY + WHAT)** alongside source code can significantly reduce a developer’s cognitive load when reading unfamiliar code.

The MVP focuses on **understanding, not navigation or execution**.

---

## 2. Problem Statement

When developers open an unfamiliar source file (e.g. a 200–300 line backend file), they face several immediate questions:

* Why does this file exist?
* What are the main responsibilities of this file?
* Which parts of the code matter most?
* Where should I start reading?

Today’s code editors and GitHub views present source code primarily as **raw text**, forcing developers to manually infer purpose and structure line by line.

 iris is suggesting a new visulization abstraction model of source code. Previously source code is just a raw text, indentation, syntax-based token colorization, and file name. now, I am devising a new abstration model to be a better way for human to understand code without cognitive load.

This MVP tests whether **explicitly surfacing “file intent” and “responsibility grouping”** can help developers form a correct mental model *before* diving into code details.

---

## 3. Scope of the MVP

The MVP is intentionally minimal.

It only addresses:

* **WHY** → File Intent
* **WHAT** → Responsibility Map

It explicitly does **not** attempt to solve:

* Execution flow
* Variable tracking
* AST-level understanding
* Code summarization at line or statement level

---

## 4. Core Concepts

### 4.1 File Intent (WHY)

**File Intent** answers the question:

> “Why does this file exist?”

It should:

* Be readable in under 5 seconds
* Consist of 1–4 short lines
* Describe the file’s purpose at a conceptual level
* Avoid implementation details

The intent is shown **once per file** and represents the highest-level abstraction.

---

### 4.2 Responsibility Map (WHAT)

**Responsibilities** answer the question:

> “What major roles does this file play?”

A responsibility:

* Represents a **conceptual role**, not a single function
* May group multiple functions or code regions
* Should be understandable without reading code

Guidelines:

* Typically 3–6 responsibilities per file
* Each responsibility has a short label and description
* Responsibilities are peers (no deep hierarchy in MVP)

---

## 5. User Experience Principles

### 5.1 Side-by-Side Context

* The source code remains the primary focus.
* IRIS content appears in a **side panel** as contextual guidance.
* The panel should feel like a **reading aid**, not a replacement for code.

---

### 5.2 Progressive Disclosure

* File Intent is immediately visible.
* Responsibilities are visible but can be expanded/collapsed.
* No information overload on first glance.

---

### 5.3 Bidirectional Awareness

The side panel and the source code should feel connected:

* Interacting with a responsibility highlights the related code lines.
* Interacting with relevant code (e.g. hovering a function) reveals its responsibility.
* This creates a shared mental map between abstraction and raw code.

---

## 6. Required MVP Features

### 6.1 File Intent Display

* A dedicated section labeled **WHY**
* Displays the file’s intent in natural language
* Always visible when the file is open

---

### 6.2 Responsibility Map Display

* A dedicated section labeled **WHAT**
* Lists the file’s main responsibilities
* Each responsibility includes:

  * A short title
  * A brief description

---

### 6.3 Responsibility-to-Code Highlighting

* Hovering over a responsibility temporarily highlights its related code lines
* Selecting (clicking) a responsibility locks the highlight
* Highlighting should be subtle and non-disruptive

```python

def load_pagerank():
^^^^^^^^^^^^^^^^^^^  ← subtle background highlight

def load_inverted_index():
^^^^^^^^^^^^^^^^^^^^^^^^
```

---

### 6.4 Code-to-Responsibility Feedback

* Hovering over relevant code (e.g. a function definition) should indicate its responsibility
* This reinforces the conceptual grouping without requiring panel interaction

```python
def hits():   ← hover
────────────
Responsibility: Search API

```
---

## 7. Success Criteria

The MVP is considered successful if, after brief exposure:

* A developer can explain **what the file does** without reading all the code
* A developer can identify **which parts of the file are most important**
* A developer feels more confident choosing where to start reading

The goal is not “wow” but:

> *“This makes the file easier to approach.”*

## 7.1 Example 

Given a source file without any context:
```python
"""REST API for index server."""

import os
import sys
from pathlib import Path
from typing import Dict, List, Set
from flask import Blueprint, jsonify, request, current_app
from . import math
from . import utils

# Global variables
pagerank_dict: Dict[str, float] = {}
word_info_dict: Dict[str, Dict[str, float]] = {}
doc_info_dict: Dict[str, Dict[str, float]] = {}

bp = Blueprint("api", __name__, url_prefix="/api/v1/")


def load_pagerank() -> None:
    """Load pagerank from file."""
    global pagerank_dict
    pagerank_path = Path(__file__).parent.parent / "pagerank.out"
    print(f"Loading pagerank from {pagerank_path}", file=sys.stderr)
    with open(pagerank_path, "r", encoding="utf-8") as f:
        for line in f:
            doc_id, score = line.strip().split(",")
            pagerank_dict[doc_id] = float(score)
    print(f"Loaded {len(pagerank_dict)} pagerank scores", file=sys.stderr)


def load_inverted_index() -> None:
    """Load inverted index from files."""
    global word_info_dict, doc_info_dict

    # Get the index path from app config
    index_path = current_app.config["INDEX_PATH"]
    print(f"Loading inverted index from {index_path}", file=sys.stderr)

    if not os.path.exists(index_path):
        print(f"Warning: Index path {index_path} does not exist", file=sys.stderr)
        return

    with open(index_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            parts = line.strip().split()
            if len(parts) < 4:  # Need at least word, idf, and one docid,tf,nf triple
                print(
                    f"Skipping line {i}: insufficient parts",
                    file=sys.stderr,
                )
                continue

            word = parts[0]
            try:
                idf = float(parts[1])
            except ValueError as e:
                print(
                    f"Error processing idf {parts[1]} for word {word}: {e}",
                    file=sys.stderr,
                )
                continue

            if i < 5:
                print(f"Processing {word} with idf {idf}", file=sys.stderr)

            # Process triples of doc_id, tf, nf
            for j in range(2, len(parts), 3):
                if j + 2 >= len(parts):
                    break

                doc_id = parts[j]
                try:
                    tf = float(parts[j + 1])
                    nf = float(parts[j + 2])
                    weight = tf * idf / nf  # Calculate the final weight

                    # Update word_info_dict
                    if word not in word_info_dict:
                        word_info_dict[word] = {}
                    word_info_dict[word][doc_id] = weight

                    # Update doc_info_dict
                    if doc_id not in doc_info_dict:
                        doc_info_dict[doc_id] = {}
                    doc_info_dict[doc_id][word] = weight

                except ValueError as e:
                    print(
                        f"Error processing doc_id {doc_id}, tf {parts[j + 1]}, nf {parts[j + 2]} for word {word}: {e}",
                        file=sys.stderr,
                    )
                    continue

    print(
        f"Loaded {len(word_info_dict)} words and {len(doc_info_dict)} documents",
        file=sys.stderr,
    )
    print(f"Sample word_info_dict: {list(word_info_dict.keys())[:5]}", file=sys.stderr)
    print(f"Sample doc_info_dict: {list(doc_info_dict.keys())[:5]}", file=sys.stderr)

    # Share the data with math module
    math.word_info_dict = word_info_dict
    math.doc_info_dict = doc_info_dict
    math.pagerank_dict = pagerank_dict


def load_index():
    """Load all required data into memory."""
    # Load data in the correct order
    load_pagerank()
    load_inverted_index()
    utils.load_stopwords(str(Path(__file__).parent.parent / "stopwords.txt"))


@bp.route("/hits/")
def hits():
    """Return hits for a query."""
    # Get query parameters
    query = request.args.get("q", "")
    w = float(request.args.get("w", 0.5))

    # Clean and split query terms
    query_terms = math.clean(query)

    # Find documents that contain all query terms
    candidate_docs = set()
    for i, term in enumerate(query_terms):
        if term not in word_info_dict:
            return jsonify({"hits": []})

        # For first term, initialize candidate set
        if i == 0:
            candidate_docs = set(word_info_dict[term].keys())
        else:
            # Intersect with documents containing current term
            candidate_docs &= set(word_info_dict[term].keys())

        # If no documents contain all terms seen so far, return empty results
        if not candidate_docs:
            return jsonify({"hits": []})

    # Calculate scores for documents containing all terms
    scores = {}
    for doc_id in candidate_docs:
        score = math.calc_score(doc_id, query_terms, w)
        if score > 0:
            scores[doc_id] = score

    # Sort by score and convert docids to integers
    hits = [
        {"docid": int(doc_id), "score": score}
        for doc_id, score in sorted(scores.items(), key=lambda x: (-x[1], x[0]))
    ]

    return jsonify({"hits": hits})
```

MVP Data should look like (not exactly, but similar to):

```python
ResponsibilityMap = [
  {
    id: "data-loading",
    label: "Data Loading",
    description: "Load ranking and inverted index data into memory",
    ranges: [
      [18, 27],   // load_pagerank
      [30, 94],   // load_inverted_index
      [97, 103]   // load_index
    ]
  },
  {
    id: "data-sharing",
    label: "Data Sharing",
    description: "Expose loaded data to math module",
    ranges: [
      [86, 89]
    ]
  },
  {
    id: "search-api",
    label: "Search API",
    description: "Handle search requests and return ranked hits",
    ranges: [
      [106, 153]  // hits
    ]
  }
]

```

### 7.2 DEVELOPMENT PLAN: Experimentation Steps

**1st Experiement: Single LLM, Multi-Role Prompting**
./1st-experiment-single-llm-multi-role.md

**2nd Experiment: multi-agents collaboration**
./2nd-experiment-multi-llm-multi-role.md

---

## 8. Explicit Non-Goals

The MVP does **not** aim to:

* Explain how the code works internally
* Replace reading the source code
* Be perfectly accurate or complete
* Handle all edge cases or languages

This is a **learning and validation prototype**, not a production system.

---

## 9. Design Philosophy Reminder

> IRIS does not explain code.
> IRIS prepares the developer to read code.

---

## 8. Development Context

- Remote development via VS Code tunnel
- Limited network access
- Simple architecture preferred
- Minimal dependencies
- KEEP THIS IN MIND: there are existing codes from previous versions of IRIS. Avoid unnecessary refactoring; focus on building the MVP features as specified. Don't over-engineer.

---

## Quick Reference

**Backend Entry**: `backend/src/server.py`
**Frontend Entry**: `extension/content.js`