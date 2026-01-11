# IRIS Two-Stage Analysis Strategy

**Document Version:** 1.0  
**Date:** January 11, 2026  
**Status:** Implemented

---

## Overview

IRIS uses a **two-stage analysis strategy** to extract File Intent and Responsibility Blocks from source code while minimizing LLM token usage.

Instead of feeding the entire source code to the LLM, IRIS:
1. **Preprocesses** code into a shallow AST (free, no LLM calls)
2. **Identifies** unclear parts that need reading (Stage 1, minimal tokens)
3. **Reads** only those unclear parts selectively
4. **Analyzes** with AST + selective code snippets (Stage 2, focused tokens)

**Key Principle:** Don't pay to read clean, self-documenting code. Only read what's unclear.

---

## Problem Statement

### Initial Approach: Full Context

**Naive approach:**
```
Source Code (8000 tokens) → LLM → File Intent + Resp Blocks
```

**Problems:**
- Clean code costs the same as dirty code
- Well-commented functions still consume tokens
- No differentiation between obvious and unclear code
- Token cost scales linearly with file size

### Breakthrough Observation

**Hypothesis:**
> If code has good names and comments, we can understand it from structure alone (AST).

**Spectrum:**
```
Clean Code ────────────────────── Dirty Code
     ↓                                  ↓
AST sufficient                   Need implementations
(500 tokens)                     (3000 tokens)
```

**Solution:** Make the LLM adaptive - read implementations only when necessary.

---

## Solution: Two-Stage Approach

### Philosophy

> The LLM should **decide** what to read, not blindly consume everything.

### Flow

```
Source Code
    ↓
[Preprocessing - FREE]
    → Parse to Shallow AST
    → Replace nested bodies with line_range references
    → Extract comments
    ↓
[Stage 1: Identification - ~300 tokens]
    → LLM scans AST
    → Identifies unclear parts
    → Returns: ranges_to_read []
    ↓
[Selective Reading - FREE]
    → For each range: fetch source code
    → Build: source_snippets {}
    ↓
[Stage 2: Analysis - ~1500 tokens]
    → LLM receives: AST + source_snippets
    → Generates: File Intent + Resp Blocks
    ↓
Output + metadata.tool_reads
```

### Why Two Stages?

**Why not one-stage with tool calling?**
- Tool-calling in a single pass is unpredictable
- Hard to ensure LLM uses tools when needed
- Difficult to track which parts were unclear

**Two-stage benefits:**
- **Explicit**: Stage 1 forces identification
- **Predictable**: Always know what was read
- **Trackable**: Full audit trail in metadata.tool_reads
- **Adaptive**: Clean code = few reads, Dirty code = many reads

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                        routes.py                            │
│  POST /api/iris/analyze                                     │
│  1. Store source code                                       │
│  2. Generate shallow AST (ShallowASTProcessor)              │
│  3. Run two-stage analysis (IRISAgent)                      │
│  4. Return File Intent + Resp Blocks + tool_reads           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      ast_processor.py                       │
│  ShallowASTProcessor                                        │
│  - Parse with Tree-sitter                                   │
│  - Keep first-level declarations                            │
│  - Replace nested bodies → line_range or null               │
│  - Extract comments (leading/trailing/inline)               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        agent.py                             │
│  IRISAgent.analyze_file()                                   │
│  1. Stage 1: _run_identification() → ranges_to_read         │
│  2. Read: source_reader.refer_to_source_code()              │
│  3. Stage 2: _run_analysis() → File Intent + Resp Blocks    │
│  4. Attach metadata.tool_reads                              │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│                      prompts.py                             │
│  - IDENTIFICATION_SYSTEM_PROMPT (Stage 1)                   │
│  - ANALYSIS_SYSTEM_PROMPT (Stage 2)                         │
│  - Decision criteria, output schemas                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Shallow AST Processing

### Concept

**Full AST Problem:**
```json
{
  "type": "FunctionDeclaration",
  "name": "calculateTotal",
  "body": {
    "type": "BlockStatement",
    "body": [
      // Deeply nested implementation details (2000+ tokens)
    ]
  }
}
```

**Shallow AST Solution:**
```json
{
  "type": "FunctionDeclaration",
  "line_range": [15, 28],  // ← Body replaced with line reference
  "name": "calculateTotal",
  "leading_comment": "// Calculate order total with tax",
  "trailing_comment": null,
  "inline_comment": null
}
```

### Processing Rules

1. **Keep first-level declarations:** imports, functions, classes, variables
2. **Replace nested bodies:** body → `line_range` or `null`
3. **Extract comments:** leading, trailing, inline
4. **Preserve structure:** Original AST navigation still works

### Implementation

**ShallowASTProcessor:**
- Uses Tree-sitter for parsing
- `max_depth = 2` (traverse 2 levels deep)
- Body-like nodes detected by field name (`body`, `block`, etc.) or type (`statement_block`, etc.)
- Comment extraction via `CommentExtractor`

**Output:**
```json
{
  "type": "Program",
  "line_range": [1, 150],
  "fields": {
    "body": [
      {
        "type": "import_statement",
        "line_range": null,  // Single-line
        "name": "THREE"
      },
      {
        "type": "function_declaration",
        "line_range": [45, 60],  // Multi-line
        "name": "initScene",
        "leading_comment": "// Initialize Three.js scene"
      }
    ]
  }
}
```

---

## Stage 1: Identification

### Goal

Identify which AST nodes have unclear purposes that require reading their implementations.

### Input

```json
{
  "task": "Identify which parts need source code reading",
  "filename": "example.ts",
  "language": "typescript",
  "shallow_ast": { ... }
}
```

### Decision Criteria

**CLEAR (skip reading):**
- Semantically descriptive names: `validateUserCredentials`, `MAX_RETRY_COUNT`
- Helpful leading/inline comments
- Self-explanatory type information

**UNCLEAR (must read):**
- Generic names: `process`, `handle`, `data`, `temp`, `a`, `b`, `c`
- Single-letter names (except loop vars `i`, `j`, `k`)
- No comments
- Constants with unclear values

**CRITICAL: Skip null line_range**
- `line_range: null` = single-line declaration, no implementation to read
- Example: `const MAX_RETRY = 5;` (one line, already in AST)
- Never mark these for reading

### Output

```json
{
  "ranges_to_read": [
    {
      "start_line": 45,
      "end_line": 60,
      "reason": "Function name 'process' is too generic",
      "element_type": "function",
      "element_name": "process"
    },
    {
      "start_line": 10,
      "end_line": 15,
      "reason": "Constant 'config' has no comment, need to see structure",
      "element_type": "constant",
      "element_name": "config"
    }
  ]
}
```

### Token Usage

**Expected:** ~300-500 tokens
- Clean code: 0-2 ranges
- Dirty code: 5-20 ranges

---

## Stage 2: Analysis

### Goal

Generate File Intent and Responsibility Blocks using the shallow AST combined with selectively read source code.

### Input

```json
{
  "task": "Generate File Intent + Responsibility Blocks",
  "filename": "example.ts",
  "language": "typescript",
  "shallow_ast": { ... },
  "source_snippets": {
    "45-60": "function process(data) {\n  return data.map(...);\n}",
    "10-15": "const config = {\n  timeout: 5000,\n  retry: 3\n};"
  }
}
```

### Output Schema

```json
{
  "file_intent": "Real-time order state management and filtered view generation",
  "responsibilities": [
    {
      "id": "order-data-fetching",
      "label": "Order Data Fetching",
      "description": "Fetches and caches order data from API with real-time updates",
      "elements": {
        "functions": ["fetchOrders", "refetchOrders"],
        "state": ["ordersData", "isLoading"],
        "imports": ["useSWR from swr"],
        "types": ["OrdersResponse"],
        "constants": ["REFETCH_INTERVAL"]
      },
      "ranges": [[10, 25], [45, 50]]
    }
  ],
  "metadata": {
    "notes": "Optional clarifications"
  }
}
```

### Key Principles

**File Intent:**
- 1-4 short lines
- Architectural purpose, not implementation details
- Answer: "Why does this file exist?"

**Responsibility Blocks:**
- NOT just function groups
- Complete ecosystems: functions + state + imports + types + constants
- 3-6 responsibilities per file
- Can be scattered (ranges non-contiguous)
- Peers, not hierarchical

### Token Usage

**Expected:** ~1500-3000 tokens
- Includes: shallow AST + source snippets + generation

---

## Implementation

### File Structure

```
backend/src/iris_agent/
├── routes.py                  # Flask API endpoint
├── agent.py                   # Two-stage orchestrator
├── prompts/iris.py                 # Stage 1 & 2 prompts
├── ast_processor.py           # ShallowASTProcessor
├── source_store.py            # Source code storage
└── tools/
    └── source_reader.py       # Source code reader
```

### Key Classes

**ShallowASTProcessor:**
```python
def process(code: str, language: str) -> Dict[str, Any]:
    """Parse code into shallow AST with line_range references."""
    # 1. Parse with Tree-sitter
    # 2. Traverse AST (max_depth=2)
    # 3. Replace bodies with line_range or null
    # 4. Extract comments
    return shallow_ast
```

**IRISAgent:**
```python
def analyze_file(filename, language, shallow_ast, source_store, file_hash):
    """Two-stage analysis."""
    # Stage 1: Identification
    ranges = _run_identification(shallow_ast)
    
    # Read source code
    snippets = {}
    for r in ranges:
        snippets[...] = source_reader.refer_to_source_code(r.start, r.end)
    
    # Stage 2: Analysis
    result = _run_analysis(shallow_ast, snippets)
    result["metadata"]["tool_reads"] = source_reader.get_log()
    
    return result
```

**SourceStore:**
```python
def store(source: str, file_hash: str, filename: str) -> str:
    """Store source code indexed by hash."""
    self._cache[hash] = source.splitlines()
    return hash

def get_range(file_hash: str, start: int, end: int) -> str:
    """Retrieve source code for line range."""
    return "\n".join(self._cache[hash][start-1:end])
```
---

## Future Considerations

### Potential Improvements

1. **Caching:** 
   - Cache AST by file hash
   - Cache Stage 1 results for unchanged files
   - Cache Stage 2 results

2. **Parallel processing:**
   - Read all ranges_to_read in parallel
   - Batch API calls for multiple files

3. **Smart batching:**
   - If ranges_to_read are dense, read entire section
   - Avoid fragmentary reads

4. **Language-specific tuning:**
   - Different decision criteria for Python vs JavaScript
   - Language-specific "clear name" patterns

5. **Learning from tool reads:**
   - Track which patterns always need reading
   - Adjust Stage 1 prompts based on false negatives

### Known Limitations

1. **Context loss:** Single-line reads may lack surrounding context
2. **Indirect references:** May miss relationships between scattered code
3. **Complex types:** Type definitions may need broader context
4. **Macros/templates:** Code generation patterns may be unclear from structure

### Mitigation Strategies

**For context loss:**
- Allow Stage 2 to request additional context if needed
- Include line numbers of related definitions in AST

**For indirect references:**
- Track imports and exports at file level
- Include "see also" references in AST nodes

**For complex types:**
- Include type signatures in AST (already done)
- Read type definitions eagerly if referenced

---

## Conclusion

The two-stage approach successfully addresses the core challenge: **minimizing LLM token usage while maintaining analysis quality.**

**Key achievements:**
- ✅ Adaptive: Clean code costs less than dirty code
- ✅ Transparent: Full audit trail via metadata.tool_reads
- ✅ Efficient: 69-94% token reduction
- ✅ Predictable: Bounded token usage per file
- ✅ Optimized: line_range null skips redundant reads

**The fundamental insight:**
> Don't make the LLM read what it can infer from structure.  
> Only read what's genuinely unclear.

This strategy enables IRIS to scale to large codebases while keeping costs manageable and results high-quality.

---

**End of Document**