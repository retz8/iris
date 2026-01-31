# Deprecated Backend Approaches for IRIS

**Document Purpose**: Record failed architectural experiments before deletion of `/backend/src/deprecated/` directory.

**Timeline**: January 9, 2026 → January 31, 2026 (3 weeks of iteration)

**Current State**: Single-shot inference system (the winner)

---

## Introduction

This document chronicles the evolution of IRIS backend architecture through four major failed approaches. Each represents a hypothesis about how to optimize LLM-based code understanding, and each failed for instructive reasons.

The journey from multi-agent orchestration to single-shot inference is a case study in **resisting complexity** and **trusting LLM capabilities**. The final architecture is radically simpler than where we started, yet performs better on all metrics: speed, cost, quality, and maintainability.

**Key Insight**: When building LLM-powered systems, the simplest architecture is almost always the right one.

---

## 1. Multi-Agentic Flow (Jan 9-10, 2026)

### 1.1 Architecture

**Flow**: Compressor → Question Generator → Explainer ↔ Skeptic

The first attempt at IRIS used multiple specialized LLM agents:
- **Compressor**: Reduce raw source code to "essential" elements
- **Question Generator**: Identify unclear aspects of compressed code
- **Explainer**: Answer questions and explain code purpose
- **Skeptic**: Challenge Explainer's reasoning, trigger refinement loop

### 1.2 Implementation Details

- Multi-turn conversations with full history accumulation
- Each agent had specialized system prompt
- Used LangChain/LangGraph for orchestration
- Model: GPT-4o-mini throughout

### 1.3 Problems Identified

**Token Explosion**
- Each iteration carried full conversation history
- Compressor output + questions + explanations + critiques
- Single file analysis: 15K-25K tokens input per iteration

**Slow Execution**
- Sequential agent calls (no parallelization possible)
- Average 8-12 seconds per file
- Unacceptable for "instant analysis" UX goal

**Marginal Quality**
- Output quality only slightly better than single-agent baseline
- Skeptic often made superficial objections
- Diminishing returns after 2-3 iterations

**Output Inconsistency**
- Complex state management between agents
- Formatting drift across iterations
- Difficult to maintain structured output schema

### 1.4 Key Learnings

1. **Multi-agent reasoning conflicts with "instant analysis" UX**
   - Real-time code understanding requires <3 second response time
   - Agentic loops fundamentally incompatible with synchronous UX

2. **More complexity ≠ better quality**
   - Single focused prompt often outperforms agent orchestration
   - LLMs already good at "thinking through" problems internally

3. **Token cost compounds rapidly**
   - 3 iterations = 3x cost, not 3x quality

### 1.5 Artifacts

None preserved (predates systematic deprecation tracking).

---

## 2. Shallow AST + Two-Stage + Tooling Approach (Jan 11, 2026)

### 2.1 Architecture

**Core Concept**: Don't send full source code to LLM. Send metadata + selective retrieval.

**Components**:
1. **Shallow AST**: Strip function bodies, replace with line range references
2. **Comment Integration**: Extract and attach leading/inline/trailing comments
3. **Source Store**: Separate storage for raw source code
4. **Tool Interface**: `refer_to_source_code(start_line, end_line)` for selective reading
5. **Two-Stage Process**:
   - Stage 1: Analyze shallow AST, identify unclear "black boxes"
   - Stage 2: Use tool to read necessary details, synthesize final output

### 2.2 Shallow AST Structure

**Input** (raw source):
```python
def calculate_total(items, tax_rate):
    """Calculate order total with tax."""
    subtotal = sum(item.price for item in items)
    tax = subtotal * tax_rate
    return subtotal + tax
```

**Output** (shallow AST):
```json
{
  "type": "function_definition",
  "name": "calculate_total",
  "line_range": [1, 5],
  "leading_comment": "Calculate order total with tax.",
  "fields": {
    "parameters": ["items", "tax_rate"],
    "return_type": null
  },
  "body": {
    "type": "block",
    "line_range": [2, 5],
    "collapsed": true,
    "line_count": 4
  }
}
```

### 2.3 Motivation

**Token Reduction**
- Function bodies often 10-50x larger than signatures
- For large files, shallow AST reduces input tokens by 60-80%

**Hypothesis-Driven Reading**
- Well-written code: signatures are self-documenting
- Only read implementations when signatures unclear
- Mimics how humans skim unfamiliar codebases

**Selective Context**
- Avoid "noise" from implementation details
- Focus LLM attention on high-level structure

### 2.4 Problems Identified

**Abstraction Leaks**
- Shallow AST introduced its own complexity (field names, node types)
- LLM had to understand both AST format AND code semantics
- Cognitive overhead: "What does `collapsed: true` mean?"

**Fragility**
- Line range references brittle during code editing
- AST transformation bugs hard to diagnose
- Maintenance burden: support multiple languages' AST quirks

**LLM Confusion**
- Models struggled to reason about abstracted structures
- Often requested `refer_to_source_code()` for nearly every function
- Tool-calling overhead exceeded token savings

**Over-Engineering**
- Separate source storage, comment extraction, AST traversal logic
- 500+ lines of code just to prepare input for LLM

### 2.5 Critical Insight

> **"Don't normalize, give raw source"**

This became the foundational principle for the final architecture. LLMs are trained on raw code, not AST representations. They perform better on natural, unmodified code.

### 2.6 Key Learnings

1. **Intermediate representations add complexity without proportional value**
   - Every transformation step is a potential bug source
   - LLMs don't need "simplified" input—they need familiar input

2. **Token optimization premature at this scale**
   - Modern LLMs handle 128K tokens easily
   - Most code files <5K tokens anyway
   - Optimize for simplicity first, then performance

3. **Tools are overhead, not optimization**
   - Each tool call: API roundtrip + context management
   - For code understanding, full context > selective context

### 2.7 Artifacts

- `deprecated/ast_processor.py` (506 lines) - Shallow AST transformation logic
- `deprecated/source_store.py` - Source code storage and retrieval
- `deprecated/tools/source_reader.py` - Tool interface for range-based reads
- `deprecated/tools/tool_definitions.py` - Tool schema definitions for LLM

---

## 3. Dual-Path Architecture with Hypothesis-Driven Verification (Jan 17-18, 2026)

### 3.1 Architecture

**Adaptive Routing**: Route files to different analysis paths based on size/complexity.

**Tool-Calling Path** (Large/Complex Files):
- **Phase 1: Structural Hypothesis**
  - Scan shallow AST metadata (imports, node density, type signatures)
  - Predict file intent based on "territory" without reading code
  - Mental model: "What would I expect this file to do?"

- **Phase 2: Strategic Verification**
  - Call `refer_to_source_code()` only to resolve uncertainties
  - Focus on "black box" nodes (unclear from signature alone)
  - Trust metadata, skip clear sections

- **Phase 3: Synthesis**
  - Once hypothesis solidified, generate final abstraction map
  - Confidence score: how certain is the LLM about the intent?

**Fast Path** (Small Files):
- Single-stage analysis with both full source AND shallow AST
- Direct extraction using same IRIS quality criteria
- No tool-calling, no hypothesis-verification loop

**Routing Criteria**:
- File size < 200 lines → Fast Path
- File size ≥ 200 lines → Tool-Calling Path
- Override if complexity metrics high (e.g., deeply nested classes)

### 3.2 Motivation

**Hypothesis-Driven Verification**
- Scientific method: predict first, test predictions, refine
- Avoid "analysis paralysis" from reading everything
- Minimize "slop" and noise in LLM input

**Adaptive Complexity**
- Small files don't need complex orchestration
- Large files benefit from structured approach
- Right tool for the job

**Performance Optimization**
- Fast path: <1 second for 80% of files
- Tool-calling path: 2-4 seconds for 20% of files

### 3.3 Problems Identified

**Path Management Complexity**
- Two codepaths to maintain, test, and debug
- Routing logic itself became complex (size + metrics)
- Edge cases: what about 199-line files?

**Hypothesis Overhead**
- Phase 1 (predict) + Phase 2 (verify) = 2 LLM calls minimum
- Latency: 2-4 seconds even when hypothesis correct on first pass
- No clear quality gain vs. direct analysis

**Fast Path Underutilized**
- Most "small" files routed to tool-calling path anyway
- Complexity metrics triggered tool-calling for 60% of <200 line files
- Fast path optimization wasted effort

**Still Dependent on Shallow AST**
- Inherited all problems from Section 2
- Abstraction issues compounded by path complexity

**False Optimization**
- Assumed large files = need for selective reading
- Reality: LLMs handle full context better than fragmented context

### 3.4 Key Learnings

1. **Adaptive complexity rarely justified**
   - Simple, consistent approach beats "smart" routing
   - Special cases multiply maintenance burden

2. **File size not reliable predictor of analysis difficulty**
   - 500-line well-written file easier than 150-line spaghetti code
   - Routing heuristics inherently fragile

3. **Hypothesis-verification adds latency without quality gain**
   - LLMs already do internal hypothesis-testing
   - Forcing multi-stage externalization just slows things down

### 3.5 Artifacts

Logic integrated into two-agent system (see Section 4). No standalone implementation preserved.

---

## 4. Two-Agent System: Analyzer-Critic Loop (Jan 19-28, 2026)

### 4.1 Architecture

**The Most Sophisticated (and Most Failed) Approach**

**Components**:
- **Orchestrator**: Manages iteration loop until confidence threshold reached
- **Analyzer Agent**: Generates and revises hypotheses, executes tool calls
- **Critic Agent**: Evaluates quality, assigns confidence score, suggests improvements
- **Signature Graph**: Declaration-focused AST representation (evolved from shallow AST)
- **Schemas**: Structured Hypothesis, Feedback, and ToolSuggestion types

### 4.2 Core Workflow

```
INITIALIZATION:
  confidence_threshold = 0.85
  max_iterations = 3
  iteration = 0

LOOP:
  1. Analyzer.generate_hypothesis(signature_graph) → Hypothesis
  2. Critic.evaluate(hypothesis) → Feedback {confidence, comments, tool_suggestions}
  
  3. IF Feedback.confidence >= 0.85:
       RETURN hypothesis (SUCCESS)
  
  4. IF iteration >= max_iterations:
       RETURN hypothesis (MAX_ITERATIONS)
  
  5. IF Feedback.tool_suggestions:
       tools_results = Analyzer.execute_tools(tool_suggestions)
       context += tools_results
  
  6. Analyzer.revise_hypothesis(feedback, context) → Updated Hypothesis
  
  7. iteration += 1
     GOTO step 2
```

### 4.3 Signature Graph Evolution

**Concept**: Declaration-focused AST traversal (successor to Shallow AST)

**Structure**:
```json
{
  "entities": [
    {
      "id": "fn_calculate_total",
      "type": "function_declaration",
      "name": "calculate_total",
      "line_range": [10, 25],
      "signature": "def calculate_total(items: List[Item], tax_rate: float) -> float",
      "parent_id": null,
      "children_ids": [],
      "metadata": {
        "parameters": ["items", "tax_rate"],
        "return_type": "float",
        "is_async": false,
        "decorators": []
      }
    }
  ]
}
```

**Differences from Shallow AST**:
- Flat entity list (not nested tree)
- Minimal signature extraction (just declarations)
- Explicit parent-child relationships via IDs
- Language-agnostic metadata structure

### 4.4 Analyzer Agent Behavior

**Initial Hypothesis Generation**:
```python
def generate_hypothesis(signature_graph, source_store):
    # Scan signature graph structure
    # Identify major entity groups
    # Predict file intent from entity patterns
    # Group entities into responsibility blocks
    return Hypothesis(file_intent, responsibility_blocks)
```

**Revision Process**:
```python
def revise_hypothesis(feedback, tool_results, previous_hypothesis):
    # Read critic feedback comments
    # Incorporate new evidence from tool_results
    # Adjust responsibility block boundaries
    # Refine file intent based on new understanding
    return Updated_Hypothesis
```

**Tool Execution**:
- Critic suggests: `refer_to_source_code(45, 67, "unclear state management")`
- Analyzer executes via SourceReader
- Tool results appended to conversation context

### 4.5 Critic Agent Behavior

**Evaluation Criteria**:
1. **Scatter Rule**: Responsibility blocks shouldn't have scattered line ranges
2. **Ecosystem Principle**: Each block should be complete unit (functions + state + types)
3. **Label Quality**: Labels specific enough to distinguish blocks
4. **File Intent Accuracy**: Does intent match actual responsibilities?

**Feedback Structure**:
```python
{
  "confidence": 0.72,  # 0.0-1.0
  "approved": False,   # True if confidence >= 0.85
  "comments": [
    "Block 'State Management' has scattered ranges: [10-25, 67-89, 120-135]",
    "Missing imports for 'API Handler' block - should include lines 1-8"
  ],
  "tool_suggestions": [
    {
      "tool": "refer_to_source_code",
      "args": {"start_line": 67, "end_line": 89},
      "reason": "Verify if lines 67-89 are really part of state management"
    }
  ]
}
```

### 4.6 Orchestrator Logic

**Confidence Tracking**:
```python
confidence_history = []
stall_counter = 0

for iteration in range(max_iterations):
    feedback = critic.evaluate(hypothesis)
    confidence_history.append(feedback.confidence)
    
    # Check for stalling
    if len(confidence_history) >= 2:
        progress = confidence_history[-1] - confidence_history[-2]
        if progress < 0.10:  # Less than 10% improvement
            stall_counter += 1
            if stall_counter >= 2:
                print("Detected stalling, terminating early")
                break
```

**Exit Conditions**:
1. Confidence ≥ 0.85 (approved)
2. Max iterations reached (3)
3. Stalling detected (2 iterations with <10% progress)
4. LLM error or invalid response

### 4.7 Problems Identified

#### **Token Explosion**

**Iteration 1** (Initial):
```
Input: signature_graph (2K tokens) + system_prompt (1K tokens) = 3K tokens
Output: hypothesis (500 tokens)
Critic Input: signature_graph + hypothesis = 2.5K tokens
Critic Output: feedback (300 tokens)
Total Round 1: 6.3K tokens
```

**Iteration 2** (Revision):
```
Input: signature_graph + previous_hypothesis + feedback + tool_results = 5K tokens
Output: revised_hypothesis (500 tokens)
Critic Input: signature_graph + revised_hypothesis = 2.5K tokens
Critic Output: feedback (300 tokens)
Total Round 2: 8.3K tokens
```

**Cumulative for 3 iterations**: 18-25K tokens per file

#### **Prompt Complexity**

**Analyzer System Prompt**: 1,200 tokens
- Role definition
- Signature graph format explanation
- Tool usage instructions
- Revision guidelines
- Output schema specification

**Critic System Prompt**: 1,000 tokens
- Evaluation criteria (Scatter Rule, Ecosystem Principle)
- Confidence scoring rubric
- Tool suggestion guidelines
- Feedback format specification

**User Prompts** (grew each iteration):
- Iteration 1: 500 tokens (just signature graph)
- Iteration 2: 1,200 tokens (+ feedback + previous hypothesis)
- Iteration 3: 2,000 tokens (+ all previous context)

#### **LLM Performance Degradation**

**Observation**: Longer prompts made LLM "dumber"

**Symptoms**:
- Lost focus on original task
- Generated inconsistent JSON schemas
- Repeated same feedback across iterations
- Ignored tool results in revision
- Confidence scores meaningless (0.75 → 0.78 → 0.74)

**Hypothesis**: 
- Attention dilution across long context
- Over-constrained by accumulated instructions
- "Forest for the trees" problem—too much information to synthesize

#### **Cost Inefficiency**

**Per-File Cost** (3 iterations):
- Input tokens: ~18K
- Output tokens: ~1.5K
- Total: ~19.5K tokens
- Cost (gpt-4o-mini): ~$0.003 per file

**Comparison**:
- Single-shot: ~$0.001 per file
- Two-agent: 3x cost for marginal quality improvement (subjective)

#### **Latency Issues**

**Breakdown**:
- Iteration 1: 1.8s (Analyzer) + 1.2s (Critic) = 3.0s
- Iteration 2: 2.1s (Analyzer) + 1.3s (Critic) = 3.4s
- Iteration 3: 2.4s (Analyzer) + 1.4s (Critic) = 3.8s
- **Total**: 10.2 seconds average per file

**UX Impact**:
- Target: <3 seconds for "instant" feel
- Reality: 10+ seconds = unacceptable
- User perception: system feels "slow and heavy"

### 4.8 Critical Failure Analysis

#### **Confidence Score Fallacy**

**Assumption**: Numeric confidence score correlates with actual quality

**Reality**:
- Confidence scores highly variable (0.65 → 0.82 → 0.71)
- No correlation with human evaluation of output quality
- LLM often "confident" about mediocre hypotheses
- Low confidence didn't predict poor user experience

**Root Cause**: Confidence is subjective and context-dependent. Asking LLM to quantify it introduces false precision.

#### **Iteration Stalling**

**Pattern**: Agents made superficial changes without real improvement

**Example**:
```
Iteration 1: File intent = "Handles user authentication"
Critic: "Too vague, be more specific"

Iteration 2: File intent = "Handles user authentication and session management"
Critic: "Better, but still lacks detail about JWT handling"

Iteration 3: File intent = "Handles user authentication via JWT and session persistence"
Critic: "Approved (confidence: 0.86)"

Human Evaluation: All three versions equally useful in practice.
```

**Insight**: Micro-optimization wasted tokens/time without meaningful quality gain.

#### **Over-Engineering**

**Code Complexity**:
- Orchestrator: 436 lines
- Analyzer: 326 lines
- Critic: 192 lines
- Schemas: 150 lines
- Total: 1,104 lines for agent orchestration alone

**Comparison**:
- Single-shot agent: 133 lines
- **8.3x code reduction** with similar output quality

#### **Fundamental Conflict**

**The Agentic Paradigm** assumes:
- Multi-turn refinement improves quality
- Specialized agents better than generalist
- Confidence-driven iteration converges to optimal solution

**IRIS Reality**:
- First-pass quality usually sufficient
- Single focused prompt outperforms agent conversation
- "Instant analysis" UX incompatible with iteration loops

**Conclusion**: Agentic reasoning fundamentally wrong approach for this problem.

### 4.9 Key Learnings

1. **Single-shot > Multi-turn for code understanding**
   - LLMs already good at comprehensive analysis in one pass
   - Iteration rarely improves quality proportional to cost

2. **Treat LLM like human reader**
   - Humans skim code once, form mental model, done
   - LLMs can do the same—trust their judgment

3. **Complexity is cost without ROI**
   - Every abstraction layer: tokens + latency + maintenance
   - Simplest system that works is best system

4. **Metrics can mislead**
   - Confidence scores didn't predict quality
   - Iteration count didn't correlate with satisfaction

5. **Token accumulation kills performance**
   - Multi-turn context grows exponentially
   - LLM performance degrades with prompt length

### 4.10 Artifacts

**Most comprehensive deprecated system**:
- `deprecated/agents/orchestrator.py` (436 lines) - Manages Analyzer-Critic loop
- `deprecated/agents/analyzer.py` (326 lines) - Hypothesis generation and revision
- `deprecated/agents/critic.py` (192 lines) - Evaluation and feedback
- `deprecated/agents/schemas.py` (150 lines) - Data structures (Hypothesis, Feedback, ToolSuggestion)
- `deprecated/signature_graph/extractor.py` (1,088 lines) - Declaration-focused AST extraction
- `deprecated/signature_graph/types.py` - SignatureEntity and SignatureGraph types
- `deprecated/signature_graph/config.py` - Language-specific node type mappings
- `deprecated/prompts.py` - Analyzer and Critic system prompts

---

## 5. Common Failure Patterns Across All Approaches

### 5.1 Premature Abstraction

**Pattern**: Transform raw source code into "cleaner" intermediate representation

**Manifestations**:
- Shallow AST (Section 2)
- Signature Graph (Section 4)
- Metadata extraction and normalization

**Why It Failed**:
- LLMs trained on raw code, not AST/metadata
- Each transformation introduces noise and bugs
- Abstraction overhead exceeded benefits

**Lesson**: Raw source code > intermediate representations

### 5.2 Over-Engineering for Optimization

**Pattern**: Assume complex system needed for optimization

**Manifestations**:
- Tool-calling for selective reading
- Multi-stage verification
- Adaptive routing based on file size
- Confidence-driven iteration

**Why It Failed**:
- Optimization premature (modern LLMs handle context well)
- Complexity introduced more problems than it solved
- Marginal gains not worth maintenance burden

**Lesson**: Optimize for simplicity first, performance second

### 5.3 Multi-Turn Complexity

**Pattern**: Assume iteration improves quality

**Manifestations**:
- Compressor → Question Generator → Explainer ↔ Skeptic (Section 1)
- Analyzer ↔ Critic loop (Section 4)
- Hypothesis-Verification cycles (Section 3)

**Why It Failed**:
- Token accumulation (context explosion)
- Latency accumulation (sequential API calls)
- Diminishing returns after first pass
- LLM confusion from overly long prompts

**Lesson**: Single-shot sufficient for most code understanding tasks

### 5.4 Misaligned Metrics

**Pattern**: Use quantitative metrics to guide qualitative task

**Manifestations**:
- Confidence scores (0.0-1.0)
- Iteration counts as quality proxy
- Token reduction as success metric

**Why It Failed**:
- Confidence didn't correlate with actual quality
- More iterations ≠ better output
- Token savings negligible for typical file sizes

**Lesson**: Quality is subjective—trust LLM judgment on first pass

### 5.5 Tool-Calling as Premature Optimization

**Pattern**: Assume tools reduce tokens/improve quality

**Manifestations**:
- `refer_to_source_code(start_line, end_line)`
- Selective context retrieval
- "Only read what you need"

**Why It Failed**:
- Tool calls: API overhead + context management
- LLMs often requested tool for nearly every function
- Full context > fragmented context for reasoning

**Lesson**: Tools are overhead, not optimization, for code understanding

---

## 6. The Winning Approach: Single-Shot Inference

### 6.1 Architecture

**Radical Simplicity**: Single LLM call with full raw source code

**Flow**:
```
Input:
  - filename: "auth_service.py"
  - language: "python"
  - source_code: <full raw source with line numbers>

LLM Call:
  Model: gpt-4o-mini
  System Prompt: <IRIS task definition> (800 tokens)
  User Prompt: <filename + language + source_code> (~3-5K tokens)
  Temperature: 0.1
  Reasoning: {"effort": "none"}  # Critical for cost control
  Response Format: Structured JSON schema

Output:
  {
    "file_intent": "...",
    "responsibility_blocks": [...]
  }
```

### 6.2 Key Design Decisions

#### **No Reasoning**

```python
response = client.chat.completions.create(
    model="gpt-4o-mini",
    reasoning={"effort": "none"},  # Explicit disable
    ...
)
```

**Why**: Reasoning tokens cost 3x regular tokens. For code understanding, reasoning overhead unnecessary—LLMs naturally comprehend code.

**Impact**: Reduced cost from $0.003 to $0.001 per file (3x savings)

#### **Line Number Prefixing**

**Input Format**:
```
1|def authenticate(username, password):
2|    """Verify user credentials against database."""
3|    user = db.find_user(username)
4|    if not user:
5|        return None
6|    return bcrypt.verify(password, user.password_hash)
```

**Why**: Enables precise line range references in responsibility blocks

**Critical**: Source code must NOT be indented in prompt (prevents phantom line numbers)

#### **Structured JSON Output**

**Schema**:
```json
{
  "file_intent": "string",
  "responsibility_blocks": [
    {
      "label": "string",
      "ranges": [[10, 25], [67, 89]]
    }
  ]
}
```

**Why**: 
- Stable output format (no markdown/freeform text)
- Easy to parse and validate
- Prevents LLM from adding commentary

#### **Raw Source Code Input**

**No normalization, no preprocessing, no AST**

**Why**:
- LLMs trained on raw code (familiar format)
- Preserves all context (comments, whitespace, idioms)
- Zero transformation bugs

### 6.3 Performance Metrics

**Speed**:
- Average: 1.8 seconds per file
- 95th percentile: 2.4 seconds
- **5-6x faster than two-agent system**

**Cost**:
- Per request: ~$0.001 (with reasoning disabled)
- Input: ~4K tokens (typical file)
- Output: ~300 tokens (structured JSON)
- **3x cheaper than two-agent system**

**Quality** (subjective evaluation):
- Matches or exceeds two-agent output
- More consistent formatting
- Fewer hallucinations (simpler prompt = less confusion)

**Code Complexity**:
- `agent.py`: 133 lines (entire orchestration logic)
- `prompts.py`: 238 lines (system + user prompt builders)
- **Total**: 371 lines vs. 1,500+ lines for two-agent system

### 6.4 Why It Works

#### **Simplicity**
- No orchestration → fewer bugs
- No intermediate steps → no transformation errors
- No tool-calling → no API overhead

#### **Speed**
- Single API call → ~2 seconds total
- No iteration loops → predictable latency
- Meets "instant analysis" UX requirement

#### **Cost**
- Reasoning disabled → 3x token savings
- No multi-turn → no context accumulation
- Typical cost: $0.001 per file (affordable at scale)

#### **Quality**
- Full context → better reasoning
- Raw code → familiar format for LLM
- Focused prompt → clear task definition

#### **Maintainability**
- 133-line agent.py → easy to understand
- Single execution path → easy to debug
- No complex state management

### 6.5 Philosophy

> **"Treat LLM like a human reader: give them clean source code, ask for natural reading comprehension, trust their judgment. The simpler the system, the better it performs."**

**Human Analogy**:
- When you skim unfamiliar code, you read it once (maybe twice)
- You form mental model of "what this file does"
- You don't need 3 iterations with critic feedback

**LLM Parallel**:
- Give LLM full source code (like human reads)
- Ask for mental model (file intent + resp blocks)
- Trust first-pass judgment (like human intuition)

---

## 7. Migration Path: Two-Agent → Single-Shot

### 7.1 Code Removal

**Deleted** (Jan 29, 2026):
```
backend/src/deprecated/
├── agents/
│   ├── orchestrator.py      # -436 lines
│   ├── analyzer.py           # -326 lines
│   ├── critic.py             # -192 lines
│   └── schemas.py            # -150 lines
├── signature_graph/
│   ├── extractor.py          # -1,088 lines
│   ├── types.py              # -120 lines
│   └── config.py             # -80 lines
├── tools/
│   ├── source_reader.py      # -100 lines
│   └── tool_definitions.py   # -50 lines
├── ast_processor.py          # -506 lines
├── prompts.py                # -400 lines (analyzer/critic prompts)
└── source_store.py           # -200 lines

Total: ~3,650 lines deleted
```

**Replaced With**:
```
backend/src/
├── agent.py                  # +133 lines (single-shot logic)
├── prompts.py                # +238 lines (single-shot prompts)
└── config.py                 # +30 lines (model config)

Total: ~400 lines (net reduction: 3,250 lines)
```

### 7.2 Prompt Evolution

**Before** (Two-Agent):
- Analyzer System Prompt: 1,200 tokens
- Critic System Prompt: 1,000 tokens
- User Prompt (Iteration 3): 2,000 tokens
- **Total**: 4,200 tokens (system) + 2,000 tokens (user) = 6,200 tokens

**After** (Single-Shot):
- System Prompt: 800 tokens (task definition + quality criteria)
- User Prompt: filename + language + source_code (~3-5K tokens)
- **Total**: ~4,000-5,000 tokens (20-30% reduction)

### 7.3 API Integration Changes

**Before**:
```python
def analyze(filename, language, source_code):
    # Parse to signature graph
    sig_graph = extract_signature_graph(source_code, language)
    
    # Store source for tool calls
    source_store = SourceStore()
    file_hash = source_store.add(source_code)
    
    # Run orchestrator
    orchestrator = Orchestrator(client, model)
    result = orchestrator.run(filename, language, sig_graph, source_store, file_hash)
    
    return result.to_dict()
```

**After**:
```python
def analyze(filename, language, source_code):
    # Build prompt
    user_prompt = build_single_shot_user_prompt(filename, language, source_code)
    
    # Single LLM call
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.1,
        reasoning={"effort": "none"},
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)
```

**Simplification**: 30 lines → 15 lines (50% reduction)

### 7.4 Testing Changes

**Before**:
- Test orchestrator loop logic
- Test analyzer tool execution
- Test critic evaluation criteria
- Test schema validation
- Test signature graph extraction
- Mock LLM responses for each agent

**After**:
- Test prompt building (deterministic)
- Test JSON parsing (straightforward)
- Integration test with real LLM (single call)

**Test Complexity**: 300 lines → 80 lines (70% reduction)

---

## 8. Lessons for Future Architecture Decisions

### 8.1 When Deprecating Code

**Do**:
- ✅ Document WHY it failed, not just WHAT it did
- ✅ Preserve key learnings for future decisions
- ✅ Keep failure artifacts temporarily for reference
- ✅ Write post-mortem before deleting

**Don't**:
- ❌ Silently delete without documentation
- ❌ Assume "everyone knows why"
- ❌ Erase history of failed experiments

**This Document**: Embodies the "Do" principles

### 8.2 Designing LLM-Powered Systems

**Default to Simplicity**:
1. Start with single LLM call
2. Optimize prompt, not architecture
3. Only add complexity if proven necessary

**Question to Ask**:
> "Would this be simpler with a single LLM call?"

**Red Flags**:
- "We need multi-agent orchestration"
- "Let's normalize the input first"
- "Tools will optimize token usage"
- "Iteration improves quality"

**Green Flags**:
- "Single LLM call with full context"
- "Raw input, structured output"
- "Trust LLM judgment"

### 8.3 When Multi-Agent IS Appropriate

**Valid Use Cases**:
- **Distinct domains**: Agent A (code) + Agent B (database) with different expertise
- **Asynchronous workflows**: Agent processes background task, notifies when done
- **Human-in-loop**: Agent proposes, human approves, agent executes

**NOT Valid for IRIS**:
- Synchronous code analysis (single domain)
- Real-time UX requirement
- Quality achievable in single pass

### 8.4 Optimization Priorities

**Order of Optimization**:
1. **Simplicity**: Fewest moving parts
2. **Correctness**: Reliable output
3. **Maintainability**: Easy to debug/extend
4. **Speed**: Response time
5. **Cost**: Token usage

**Common Mistake**: Optimizing #5 (cost) before #1-3 (fundamentals)

**IRIS Journey**: Learned this the hard way (3 weeks, 4 failed approaches)

### 8.5 Metrics That Matter

**Good Metrics**:
- Latency (user-perceivable)
- Cost per request (scalability)
- Code complexity (maintainability)
- Crash rate (reliability)

**Bad Metrics**:
- Confidence scores (uncorrelated with quality)
- Iteration counts (more ≠ better)
- Token reduction (premature optimization)
- Number of agents (complexity ≠ sophistication)

**Focus**: Measure what users experience, not internal abstractions

---

## 9. Final Reflections

### 9.1 The Irony of Complexity

**Observation**: Most sophisticated approach (two-agent system) performed WORSE than simplest approach (single-shot)

**Why**:
- Complexity introduces fragility
- More abstractions = more bugs
- Token accumulation degrades LLM performance
- Iteration loops create latency

**Lesson**: Sophistication ≠ quality. Simplicity wins.

### 9.2 Trust LLM Capabilities

**Human Tendency**: Underestimate LLM comprehension, overengineer solutions

**Examples in IRIS**:
- "LLM can't handle full source" → Wrong, they handle 128K tokens fine
- "LLM needs structured input" → Wrong, they prefer raw code
- "LLM needs iteration to refine" → Wrong, first pass usually sufficient

**Lesson**: Trust the model. Give it natural input, clear task, structured output format.

### 9.3 Cost of Premature Optimization

**Time Spent**:
- Multi-agentic flow: 2 days
- Shallow AST + tools: 1 day
- Dual-path architecture: 2 days
- Two-agent system: 10 days
- Single-shot (final): 2 days

**Total**: 17 days, 4 failed approaches

**Alternative**: Could have reached single-shot on Day 3 if we started simple

**Lesson**: Premature optimization wastes time. Start simple, optimize only if needed.

### 9.4 Value of Failure Documentation

**This Document**:
- 3,650 lines of deleted code
- 4 failed architectural approaches
- 3 weeks of iteration

**Why Document**:
- Prevent repeating mistakes
- Educate future developers
- Validate final design by contrast

**Future Reference**: When tempted to "make it more sophisticated", read this document.

---

## 10. Appendix: Deprecated Code Mapping

### 10.1 Directory Structure

```
backend/src/deprecated/
├── agents/                    # Two-Agent System (Section 4)
│   ├── __init__.py
│   ├── orchestrator.py        # Manages Analyzer-Critic loop
│   ├── analyzer.py            # Hypothesis generation + revision
│   ├── critic.py              # Evaluation + feedback
│   └── schemas.py             # Hypothesis, Feedback, ToolSuggestion types
│
├── signature_graph/           # Declaration-Focused AST (Section 4.3)
│   ├── __init__.py
│   ├── extractor.py           # Tree-sitter traversal + entity extraction
│   ├── types.py               # SignatureEntity, SignatureGraph types
│   └── config.py              # Language-specific node mappings
│
├── tools/                     # Tool Interface (Section 2)
│   ├── source_reader.py       # refer_to_source_code() implementation
│   └── tool_definitions.py    # OpenAI tool schemas
│
├── debugger/                  # Debugging Infrastructure
│   ├── __init__.py
│   └── debugger.py            # Agent flow tracking (unused)
│
├── ast_processor.py           # Shallow AST (Section 2.2)
├── prompts.py                 # Analyzer/Critic prompts (Section 4.6, 4.7)
└── source_store.py            # Source storage (Section 2)
```

### 10.2 File Size Summary

```
Total Lines by Section:
- Section 1 (Multi-Agentic): ~0 lines (not preserved)
- Section 2 (Shallow AST + Tools): ~806 lines
- Section 3 (Dual-Path): ~0 lines (integrated into Section 4)
- Section 4 (Two-Agent): ~2,844 lines

Total Deprecated: ~3,650 lines
Total Replacement: ~400 lines
Net Reduction: ~3,250 lines (89% code deletion)
```

---

## Conclusion

The IRIS backend evolution from multi-agent orchestration to single-shot inference is a case study in **resisting complexity bias**. Every failed approach added sophistication that looked promising on paper but failed in practice.

**The Pattern**:
1. Identify problem (token usage, latency, quality)
2. Design sophisticated solution (agents, tools, iteration)
3. Implement solution (~500-1,000 lines)
4. Discover solution introduces more problems than it solves
5. Repeat with different approach

**The Breakthrough**: Questioning the premise

> "Do we actually need all this complexity?"

**The Answer**: No. 

Single LLM call with full source code achieves same quality at 1/10th the code, 1/3rd the cost, and 5x the speed.

**Final Wisdom**:

> "The best code is the code you don't write. The best architecture is the one you don't need."

When building LLM systems, start simple. Trust the model. Optimize only when necessary. And document your failures so others can learn.

---

**Document Created**: January 31, 2026  
**Created By**: IRIS Development Team  
**Purpose**: Historical record before deletion of `/backend/src/deprecated/`  
**Next Action**: Delete deprecated folder after team review
