# IRIS Single-Stage Tool-Calling Architecture

## Implementation Specification Document

**Version:** 1.0  
**Date:** January 17, 2026  
**Status:** Proposed

---

## 1. Executive Summary

### Current Problem

The two-stage analysis pipeline introduces significant latency:

| Stage | Time | Tokens | Purpose |
|-------|------|--------|---------|
| Stage 1 (Identification) | 29.10s | 13,156 | Decide what to read |
| Stage 2 (Analysis) | 16.70s | 19,663 | Generate output |
| **Total** | **45.80s** | **32,819** | |

Stage 1 consumes 64% of total time but produces intermediate output that is immediately discarded after use.

### Proposed Solution

Replace the two-stage pipeline with a **single-stage tool-calling architecture** where:

1. LLM receives shallow AST in a single call
2. LLM can invoke `refer_to_source_code(start_line, end_line)` tool when needed
3. LLM produces final File Intent + Responsibility Blocks directly

### Expected Benefits

| Metric | Current | Proposed | Improvement |
|--------|---------|----------|-------------|
| LLM Calls | 2 | 1 (with tool loops) | Fewer round-trips |
| Stage 1 Output | 1,445 tokens | 0 | Eliminated |
| Duplicate AST Transmission | 2x | 1x | Halved |
| Estimated Time | 45.80s | ~25-30s | ~35-45% faster |

---

## 2. Current Architecture Analysis

### 2.1 Code Flow Overview

```
routes.py: analyze()
    │
    ├── SourceStore.store(source_code, file_hash)
    │
    ├── ShallowASTProcessor.process(source_code, language)
    │
    └── IrisAgent.analyze()
            │
            ├── _should_use_fast_path() → if True, skip to fast-path
            │
            ├── [STAGE 1] _run_identification(filename, language, shallow_ast)
            │       └── OpenAI API call with IDENTIFICATION_SYSTEM_PROMPT
            │       └── Returns: ranges_to_read[]
            │
            ├── [SOURCE READING] SourceReader.refer_to_source_code()
            │       └── For each range in ranges_to_read
            │       └── Builds: source_snippets{}
            │
            └── [STAGE 2] _run_analysis(filename, language, shallow_ast, source_snippets)
                    └── OpenAI API call with ANALYSIS_SYSTEM_PROMPT
                    └── Returns: File Intent + Responsibilities
```

### 2.2 Key Files and Their Responsibilities

| File | Current Role | Changes Needed |
|------|--------------|----------------|
| `agent.py` | Two-stage orchestration | Major refactor to tool-calling loop |
| `prompts.py` | Stage 1 & 2 prompts | New unified prompt |
| `tools/source_reader.py` | Manual source reading | Adapt for tool-call interface |
| `source_store.py` | Source storage | No changes |
| `routes.py` | HTTP endpoint | Minor adjustments |

### 2.3 Current `agent.py` Structure

```python
class IrisAgent:
    def analyze(self, filename, language, shallow_ast, source_store, file_hash, ...):
        # Routing decision
        if self._should_use_fast_path(source_code):
            return self._run_fast_path_analysis(...)
        
        # STAGE 1: Identification
        identification_response = self._run_identification(filename, language, shallow_ast)
        ranges_to_read = self._parse_identification_response(identification_response)
        
        # SOURCE READING
        source_reader = SourceReader(source_store, file_hash)
        source_snippets = {}
        for r in ranges_to_read:
            snippet = source_reader.refer_to_source_code(r["start_line"], r["end_line"], r["reason"])
            source_snippets[key] = snippet
        
        # STAGE 2: Analysis
        analysis_response = self._run_analysis(filename, language, shallow_ast, source_snippets)
        result = self._parse_analysis_response(analysis_response)
        
        return result
```

### 2.4 Current `SourceReader` Interface

```python
# tools/source_reader.py
class SourceReader:
    def __init__(self, store: SourceStore, file_hash: str):
        self.store = store
        self.file_hash = file_hash
        self.read_log: List[SourceRead] = []

    def refer_to_source_code(self, start_line: int, end_line: int, reason: Optional[str] = None) -> str:
        """Return the raw source code for the inclusive line range and log the access."""
        snippet = self.store.get_range(self.file_hash, start_line, end_line)
        self.read_log.append(SourceRead(start_line, end_line, reason, snippet))
        return snippet
```

---

## 3. Proposed Architecture

### 3.1 New Flow Overview

```
routes.py: analyze()
    │
    ├── SourceStore.store(source_code, file_hash)
    │
    ├── ShallowASTProcessor.process(source_code, language)
    │
    └── IrisAgent.analyze()
            │
            ├── _should_use_fast_path() → if True, skip to fast-path (unchanged)
            │
            └── [SINGLE STAGE] _run_tool_calling_analysis()
                    │
                    ├── Initial OpenAI API call with TOOL_CALLING_SYSTEM_PROMPT
                    │       └── tools=[refer_to_source_code]
                    │
                    └── TOOL CALL LOOP:
                            │
                            ├── If response.tool_calls exists:
                            │       ├── Execute refer_to_source_code(start, end)
                            │       ├── Append tool result to messages
                            │       └── Continue API call
                            │
                            └── If response.content (final answer):
                                    └── Parse and return File Intent + Responsibilities
```

### 3.2 OpenAI Tool Calling Interface

The OpenAI API supports function/tool calling natively:

```python
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[...],
    tools=[{
        "type": "function",
        "function": {
            "name": "refer_to_source_code",
            "description": "Read source code for a specific line range",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_line": {"type": "integer", "description": "Start line (1-based)"},
                    "end_line": {"type": "integer", "description": "End line (1-based, inclusive)"}
                },
                "required": ["start_line", "end_line"]
            }
        }
    }],
    tool_choice="auto"  # LLM decides when to call
)
```

### 3.3 Message Flow Example

```
[1] User Message:
    - System Prompt (TOOL_CALLING_SYSTEM_PROMPT)
    - filename, language, shallow_ast

[2] Assistant Response (tool_call):
    - tool_calls: [refer_to_source_code(79, 293)]

[3] Tool Message:
    - role: "tool"
    - content: <source code lines 79-293>

[4] Assistant Response (tool_call):
    - tool_calls: [refer_to_source_code(475, 562)]

[5] Tool Message:
    - role: "tool"
    - content: <source code lines 475-562>

... (repeat as needed)

[N] Assistant Response (final):
    - content: { "file_intent": "...", "responsibilities": [...] }
```

---

## 4. Implementation Steps

### Step 1: Define Tool Schema

**File:** `backend/src/iris_agent/tools/tool_definitions.py` (NEW)

```python
"""OpenAI tool definitions for IRIS agent."""

REFER_TO_SOURCE_CODE_TOOL = {
    "type": "function",
    "function": {
        "name": "refer_to_source_code",
        "description": (
            "Read the actual source code for a specific line range. "
            "Use this when the shallow AST doesn't provide enough information "
            "to understand a function, variable, or code block. "
            "Common reasons to call: generic names, missing comments, complex logic."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "start_line": {
                    "type": "integer",
                    "description": "Start line number (1-based, inclusive)"
                },
                "end_line": {
                    "type": "integer",
                    "description": "End line number (1-based, inclusive)"
                }
            },
            "required": ["start_line", "end_line"]
        }
    }
}

IRIS_TOOLS = [REFER_TO_SOURCE_CODE_TOOL]
```

### Step 2: Create Unified Prompt

**File:** `backend/src/iris_agent/prompts.py` (MODIFY)

Add new prompt template:

```python
# =============================================================================
# TOOL-CALLING: SINGLE-STAGE ANALYSIS WITH SOURCE CODE ACCESS
# =============================================================================

TOOL_CALLING_SYSTEM_PROMPT = """You are IRIS, a code comprehension assistant.

YOUR TASK:
Extract File Intent and Responsibility Blocks from the provided shallow AST.

YOUR CAPABILITIES:
- You receive a SHALLOW AST (structure only, no implementation details)
- You can call `refer_to_source_code(start_line, end_line)` to read actual source code
- Call the tool ONLY when the AST doesn't provide enough information

WHEN TO READ SOURCE CODE:
- Generic function names: "process", "handle", "execute", "init", "update"
- Generic variable names: "data", "temp", "result", "config", "obj"
- Single-letter names: "a", "b", "x", "y" (except loop vars i, j, k)
- Missing comments on complex functions
- Nodes with high extra_children_count (>5) and unclear purpose

WHEN NOT TO READ SOURCE CODE:
- Descriptive names: "validateUserCredentials", "calculateOrderTotal"
- Clear comments explaining purpose
- Simple imports or type definitions
- Nodes with line_range: null (single-line, nothing to read)

PHILOSOPHY:
- IRIS prepares developers to read code, not explains code
- Focus on WHY/WHAT, not HOW
- No execution flow analysis
- No line-by-line summarization

OUTPUT REQUIREMENTS:
After gathering enough information, output JSON directly (no markdown):
{
  "file_intent": "1-4 lines explaining WHY this file exists",
  "responsibilities": [
    {
      "id": "kebab-case-id",
      "label": "Short Label (2-5 words)",
      "description": "Purpose-oriented summary",
      "elements": {
        "functions": ["func1", "func2"],
        "state": ["var1", "var2"],
        "imports": ["import1"],
        "types": ["Type1"],
        "constants": ["CONST1"]
      },
      "ranges": [[start1, end1], [start2, end2]]
    }
  ],
  "metadata": { "notes": "optional" }
}

RESPONSIBILITY BLOCK RULES:
- 3-6 responsibilities per file
- Each is a COMPLETE ECOSYSTEM (functions + state + imports + types + constants)
- Ranges can be scattered (non-contiguous is OK)
- Peers, not hierarchical
"""


def build_tool_calling_prompt(
    filename: str,
    language: str,
    shallow_ast: Dict[str, Any],
) -> str:
    """Build prompt for tool-calling single-stage analysis."""
    payload = {
        "task": "Analyze this file and extract File Intent + Responsibility Blocks",
        "filename": filename,
        "language": language,
        "shallow_ast": shallow_ast,
        "instructions": [
            "1. Scan the shallow AST structure",
            "2. Call refer_to_source_code() for any unclear parts",
            "3. After gathering enough information, output the final JSON",
        ],
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)
```

### Step 3: Implement Tool-Calling Loop in Agent

**File:** `backend/src/iris_agent/agent.py` (MODIFY)

Add new method:

```python
from .tools.tool_definitions import IRIS_TOOLS

class IrisAgent:
    # ... existing code ...
    
    # Configuration for tool-calling
    MAX_TOOL_CALLS = 30  # Safety limit
    
    def _run_tool_calling_analysis(
        self,
        filename: str,
        language: str,
        shallow_ast: Dict[str, Any],
        source_store: SourceStore,
        file_hash: str,
        debugger: Optional[ShallowASTDebugger] = None,
    ) -> Dict[str, Any]:
        """Single-stage analysis with tool calling.
        
        The LLM analyzes the shallow AST and calls refer_to_source_code()
        when it needs to see actual implementation details.
        """
        # Initialize source reader for logging
        source_reader = SourceReader(source_store, file_hash)
        
        # Build initial prompt
        user_prompt = build_tool_calling_prompt(filename, language, shallow_ast)
        
        # Initialize message history
        messages = [
            {"role": "system", "content": TOOL_CALLING_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]
        
        tool_call_count = 0
        
        while tool_call_count < self.MAX_TOOL_CALLS:
            # Call OpenAI with tools
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=IRIS_TOOLS,
                tool_choice="auto",
                temperature=0.1,
            )
            
            assistant_message = response.choices[0].message
            
            # Check if we have tool calls
            if assistant_message.tool_calls:
                # Append assistant message to history
                messages.append({
                    "role": "assistant",
                    "content": assistant_message.content,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            }
                        }
                        for tc in assistant_message.tool_calls
                    ]
                })
                
                # Process each tool call
                for tool_call in assistant_message.tool_calls:
                    tool_call_count += 1
                    
                    if tool_call.function.name == "refer_to_source_code":
                        args = json.loads(tool_call.function.arguments)
                        start_line = args["start_line"]
                        end_line = args["end_line"]
                        
                        # Execute the tool
                        snippet = source_reader.refer_to_source_code(
                            start_line, end_line, reason="LLM requested"
                        )
                        
                        # Add tool result to messages
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": snippet,
                        })
                        
                        if debugger:
                            debugger.log_tool_call(
                                tool_name="refer_to_source_code",
                                args=args,
                                result_length=len(snippet),
                            )
            else:
                # No tool calls - we have the final answer
                content = assistant_message.content
                if content is None:
                    raise ValueError("LLM returned empty response")
                
                result = self._parse_analysis_response(content)
                
                # Attach tool read metadata
                result["metadata"]["tool_reads"] = [
                    {
                        "start_line": r.start_line,
                        "end_line": r.end_line,
                        "reason": r.reason,
                    }
                    for r in source_reader.get_log()
                ]
                result["metadata"]["execution_path"] = "tool-calling"
                result["metadata"]["tool_call_count"] = tool_call_count
                
                return result
        
        # Safety: max tool calls reached
        raise RuntimeError(f"Exceeded maximum tool calls ({self.MAX_TOOL_CALLS})")
```

### Step 4: Update Main `analyze()` Method

**File:** `backend/src/iris_agent/agent.py` (MODIFY)

```python
def analyze(
    self,
    filename: str,
    language: str,
    shallow_ast: Dict[str, Any],
    source_store: SourceStore,
    file_hash: str,
    debug_report: Dict[str, Any] | None = None,
    source_code: str = "",
    debugger: ShallowASTDebugger | None = None,
    use_tool_calling: bool = True,  # NEW: Flag to enable tool-calling mode
) -> Dict[str, Any]:
    """Run analysis on a file.
    
    Execution paths:
    1. Fast-Path: Single-stage for small files (unchanged)
    2. Tool-Calling: Single-stage with on-demand source reading (NEW)
    3. Two-Stage: Legacy mode for comparison (existing)
    """
    
    # Fast-path for small files (unchanged)
    if self._should_use_fast_path(source_code):
        return self._run_fast_path_analysis(...)
    
    # NEW: Tool-calling mode (default)
    if use_tool_calling:
        if debugger:
            debugger.start_llm_stage("tool_calling_analysis")
        
        result = self._run_tool_calling_analysis(
            filename=filename,
            language=language,
            shallow_ast=shallow_ast,
            source_store=source_store,
            file_hash=file_hash,
            debugger=debugger,
        )
        
        if debugger:
            debugger.end_llm_stage(
                "tool_calling_analysis",
                # Token tracking will be updated per-call
            )
        
        return result
    
    # Legacy two-stage mode (keep for comparison)
    return self._run_two_stage_analysis(...)
```

### Step 5: Update Routes for Mode Selection

**File:** `backend/src/iris_agent/routes.py` (MODIFY)

```python
# Add new flag
_use_tool_calling = True  # Default to new mode

def set_use_tool_calling(enabled: bool) -> None:
    """Enable or disable tool-calling mode."""
    global _use_tool_calling
    _use_tool_calling = enabled


@iris_bp.route("/analyze", methods=["POST"])
def analyze():
    # ... existing code ...
    
    result = _iris_agent.analyze(
        filename=filename,
        language=language,
        shallow_ast=shallow_ast or {},
        source_store=_source_store,
        file_hash=file_hash,
        debug_report=debug_report,
        source_code=source_code,
        debugger=debugger,
        use_tool_calling=_use_tool_calling,  # NEW
    )
    
    # ... rest of code ...


@iris_bp.route("/debug", methods=["GET", "POST"])
def debug_control():
    """Control debug flags."""
    # Add use_tool_calling to the response and control
    # ...
```

### Step 6: Update Debugger for Tool-Call Tracking

**File:** `backend/src/iris_agent/debugger.py` (MODIFY)

```python
class ShallowASTDebugger:
    def __init__(self, filename: str, language: str) -> None:
        # ... existing code ...
        self.tool_calls: List[Dict[str, Any]] = []  # NEW
    
    def log_tool_call(
        self,
        tool_name: str,
        args: Dict[str, Any],
        result_length: int,
    ) -> None:
        """Log a tool call for debugging."""
        self.tool_calls.append({
            "tool_name": tool_name,
            "args": args,
            "result_length": result_length,
            "timestamp": time.time(),
        })
    
    def get_report(self) -> Dict[str, Any]:
        report = {
            # ... existing fields ...
            "tool_calls": self.tool_calls,  # NEW
            "tool_call_count": len(self.tool_calls),  # NEW
        }
        return report
```

---

## 5. Prompt Design Rationale

### 5.1 Why Unified Prompt Works Better

| Aspect | Two-Stage | Tool-Calling |
|--------|-----------|--------------|
| Context | AST parsed twice | AST in context throughout |
| Decision Making | Upfront all-or-nothing | Just-in-time, adaptive |
| Output Generation | Intermediate + Final | Final only |
| Error Recovery | Must restart stage | Can retry single tool call |

### 5.2 Prompt Size Comparison

```
Two-Stage:
├── IDENTIFICATION_SYSTEM_PROMPT: ~2,500 chars
├── build_identification_prompt: ~500 chars + AST
├── ANALYSIS_SYSTEM_PROMPT: ~2,800 chars
└── build_analysis_prompt: ~300 chars + AST + snippets

Tool-Calling:
├── TOOL_CALLING_SYSTEM_PROMPT: ~2,200 chars
└── build_tool_calling_prompt: ~200 chars + AST
```

Estimated token savings: ~1,500-2,000 tokens from prompt alone.

### 5.3 Key Prompt Design Decisions

1. **Explicit tool-calling guidance**: Tell LLM exactly when to call vs. not call
2. **Output format at the end**: Remind format after tool guidance
3. **No intermediate output**: Skip reason/element_type/element_name generation
4. **Philosophy reminder**: Keep IRIS principles front and center

---

## 6. Error Handling & Edge Cases

### 6.1 Tool Call Limits

```python
MAX_TOOL_CALLS = 30  # Configurable

# Edge cases:
# - Clean code: 0-3 tool calls
# - Messy code: 10-20 tool calls
# - Obfuscated code: May hit limit
```

### 6.2 Invalid Tool Arguments

```python
def _execute_tool_call(self, tool_call, source_reader):
    try:
        args = json.loads(tool_call.function.arguments)
        start_line = int(args.get("start_line", 0))
        end_line = int(args.get("end_line", 0))
        
        # Validate range
        if start_line < 1 or end_line < start_line:
            return f"Error: Invalid line range [{start_line}, {end_line}]"
        
        return source_reader.refer_to_source_code(start_line, end_line)
    except json.JSONDecodeError:
        return "Error: Could not parse tool arguments"
    except Exception as e:
        return f"Error: {str(e)}"
```

### 6.3 Fallback to Two-Stage

```python
def analyze(self, ..., use_tool_calling=True):
    if use_tool_calling:
        try:
            return self._run_tool_calling_analysis(...)
        except Exception as e:
            print(f"[FALLBACK] Tool-calling failed: {e}")
            print(f"[FALLBACK] Falling back to two-stage...")
            # Fall through to two-stage
    
    return self._run_two_stage_analysis(...)
```
---


**End of Specification Document**