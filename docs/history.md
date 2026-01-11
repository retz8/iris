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