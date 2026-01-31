# Record on Product Development of Iris

## 1/2/26 ~ 1/3/26: Leetcode Python to Cpp
- developed a simple toy project to extract codes from GitHub webpage and convert it to cpp (overaly UI)
- very small scope version of iris
- (github link)[https://github.com/retz8/leetcode-cpp-to-python]

## 1/9/26 ~ 1/10/26: MVP Pivot & LLM Integration Experimentations
- Iris assists developers to mitigate cognitive loads in reading source code
- MVP scope: file intent (why, short summary of what file is responsible for) & responsibility blocks
- concept of responsibility block: reading line by line or function by function (old) -> reading in logical chunks (collection of func, variables, imports...) (iris, human brain memory can handle easily)

- LLM Integration Experiments (openai api - gpt4o mini, LangChain, LangGraph)
- 1st experiment: single LLM with long prompt => not working well, not precise, too much token
- 2nd experiement: multi agentic flow - compressor(make raw source code shorter) -> question generator -> loop: explainer <-> skeptic
        => decent output, but slow, and too much token

## 1/11/26: shallow AST & two-stage & tooling approach
- IDEA 1: if code itself is already well written and commented, no need to checkout whole implementations, only signatures
- IDEA 2: to reduce input token to LLM, instead of inputting raw source code, adopt an idea of 'line reference to source code'

- shallow AST: instead of using raw AST, LLM doesn't necessarily need full implementation. Cut off body elements from AST and replace it with line reference to source code
- shallow AST with comments: to understand the source code, comments are important signals. extract leading/inline/trailing comments and integrate with shallow AST structure

- tooling - refer_to_source_code: agent can selectively use tool to read source code in specific range by referring to raw source code in separate storage

- Two-Stage Approach - instead of using single agent with tooling, 1. identify which parts of the shallow ast should call tool (unclear parts)   2. use tools on necessary parts and output


# 1/17/26 ~ 1/18/26: Dual-Path Architecture & Hypothesis-Driven Verification
- Dual-Path Architecture
        - Tool-Calling Agent Path (Large/Complex Files)
                - Hypothesis-Driven Verification structure
                - Phase 1: Structural Hypothesis (Mental Mapping) - scan Shallow AST (metadata, imports, node density) without reading code, predict file intent based on 'territory'
                - Phase 2: Strategic Verification - call refer_to_source_code() only to resolve uncertainties in 'Black Box' nodes, trust metadata and skip clear sections to minimize 'slop' and noise
                - Phase 3: Synthesis - once hypothesis is solidified, generate final abstraction map
        - Fast-Path Path (Small Files)
                - when file is small enough to be analyzed in single pass, skip multi-stage verification to
                - Single-Stage Mapping - agent receives both Full Source and Shallow AST simultaneously 

                - Direct Extraction - apply same IRIS success criteria (Scatter Rule, Ecosystem Principle) to generate high-quality JSON map immediately                

## 1/19/26 ~ 1/28/26: Two-Agent System Experiment

**Architecture: Analyzer-Critic Loop with Confidence-Based Iteration**

- Implemented two-agent system: Analyzer generates initial hypothesis, Critic evaluates and provides feedback
- Loop continues until confidence score exceeds threshold or max iterations reached
- Confidence-driven refinement: each iteration aims to improve responsibility block quality based on critic feedback

**Key Problems Identified:**

1. **Token Explosion**: Multi-turn conversations accumulated massive context, each iteration carrying full history
2. **Prompt Complexity**: Managing state between agents, formatting critic feedback, tracking confidence changes led to unwieldy prompts
3. **LLM Performance Degradation**: Longer prompts paradoxically made LLM "dumber" - lost focus, generated inconsistent outputs
4. **Cost Inefficiency**: 2-3 iterations per file doubled or tripled API costs with marginal quality gains
5. **Latency Issues**: Sequential agent calls created unacceptable delays for real-time UX goal

**Critical Insight:**

The agentic approach fundamentally conflicts with IRIS's core UX requirement: **instant, on-file-open analysis**. Multi-agent reasoning, while intellectually appealing, sacrifices speed and simplicity for diminishing returns in output quality.

**Outcome:** Two-agent system marked as failed approach. Pivoting to single-shot inference with careful prompt engineering.

---

## 1/29/26 ~ 1/31/26: Pivot to Single-Shot Inference & Model Selection

**Strategic Shift: Abandoning Agentic Complexity**

- **Model Selection**: gpt-5-nano chosen for speed (fast), cost (cheap), and large context window (400k tokens)
- **Architecture**: Single-shot inference only - no multi-turn, no analyzer/critic, no tool-calling loops
- **Reasoning Control**: Explicitly disable reasoning via API (`reasoning={"effort": "none"}`) to prevent token bloat
- **Output Format**: Structured JSON schema for stability, but reasoning control is critical for cost management

**Key Principles Established:**

1. **Raw Source Code Input**: No normalization, no intermediate representations (AST/signature graph attempts failed)
2. **Minimal Output Schema**: Only `file_intent` and `responsibility_blocks` - stripped all metadata/success flags
3. **Line Number Accuracy**: Source code must be inserted without indentation to prevent phantom line numbers
4. **Prompt Discipline**: XML-tagged developer prompt, clear input order, explicit line number assumptions

**Cost Model:**
- Per-request: ~9k input tokens, ~200-400 output tokens
- With reasoning disabled: ~$0.001 per request
- Input dominates cost → caching strategy becomes critical

**Philosophy:**
Treat LLM like a human reader: give them clean source code, ask for natural reading comprehension, trust their judgment. The simpler the system, the better it performs.

**Analysis Workflow:**
1. Skim through the code
2. list up main functionalities (responsibilities)
3. match code lines to the functionalities and convert it to resp blocks
4. extract file intent based on resp blocks (bottom to top)
5. reorder resp blocks

# TODO
- code clean up
- local storage multi-layered cache
- basic ui integration