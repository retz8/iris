# LeetCode C++ to Python Converter

## What is this?

A Chrome Extension that automatically converts C++ solutions from LeetCode to Python. It adds a "Convert to Python" button directly on LeetCode problem pages and displays converted Python code in an overlay UI.

## Why this project?

LeetCode has a massive collection of algorithm solutions, and many high-quality solutions are written in C++. This tool helps developers who are more comfortable with Python to study and understand these C++ solutions by automatically converting them.

### Why start with LeetCode?

LeetCode problems are ideal for building a code converter because:
- Single-file, self-contained solutions
- Predictable structure (`class Solution` with methods)
- No external dependencies
- Clear input/output patterns
- Easy to validate conversion correctness

## Development Constraints

This project is being developed under unique constraints:
- **Environment**: Limited access computer lab (사이버지식정보방) during Korean military service
- **Hardware**: Low-spec Windows PC connecting remotely to a Mac at home
- **Connection**: VSCode Tunnel for remote development
- **Time**: Development in spare moments

These constraints drive the architecture decisions toward simplicity and offline-capable workflows.

## Development Plan

### Stage 1: Chrome Extension MVP (Current)
- Chrome Extension with overlay UI on LeetCode pages
- Flask backend for C++ to Python conversion
- Regex-based conversion logic
- Two experiments running in parallel:
  - Overlay UI injection into LeetCode
  - Core conversion functionality

### Stage 2: Enhanced Conversion (Future)
- tree-sitter based AST parsing for better accuracy
- Support for more complex C++ patterns

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, Flask |
| Frontend | HTML, CSS, JavaScript |
| Deployment | Docker |
| Extension | Chrome Extension (Manifest V3) |

## Project Structure
```
leetcode-cpp-to-python/
├── README.md
├── backend/
│   ├── requirements.txt
│   └── src/
│       ├── server.py
│       ├── converter/
│       └── static/
├── samples/
└── extension/
```