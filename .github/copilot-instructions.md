# Copilot Instructions for IRIS Project

## Project Overview

IRIS enables progressive code understanding through layered abstraction models,
starting with File Intent and Responsibility Blocks as the "table of contents" 
for unfamiliar code, and evolving toward a new programming paradigm between 
source code and natural language.

- **File Intent (WHY)**: 
The "title and abstract" of a code file - a concise statement that 
establishes the reader's mental framework before diving into implementation.

Just as a paper's abstract prepares you to understand its content,
File Intent prepares you to comprehend the code.

- **Responsibility Blocks (WHAT)**: Major logical components

**Core Philosophy**: IRIS prepares developers to read code, not explains code.

To understand IRIS in depth, refer to the [philosophy behind IRIS](docs/philosophy.md).

---

## General Rules

### All Code Changes
- [ ] Fast iteration over perfect code - prioritize working prototypes
- [ ] Do NOT generate `.md` or test files unless explicitly requested
- [ ] Do not use new libraries/platforms unless explicitly told
- [ ] If working on `backend`, Always activate virtual environment: `cd backend && source venv/bin/activate`

---

## File-Specific Instructions

### Extension Files (`extension/**/*.js`)
**Apply when working on Chrome extension code**

- [ ] Use ES6+ syntax consistently
- [ ] Prefer `const` over `let`, avoid `var`
- [ ] Document DOM selectors with comments explaining GitHub's structure
- [ ] Include JSDoc comments for exported functions
- [ ] Use meaningful variable names (avoid single letters except loop counters)

### Backend Tests (`backend/tests/**/*.py`)
**Apply when writing or modifying tests**

- [ ] Follow Arrange-Act-Assert pattern
- [ ] Use descriptive test function names: `test_should_<expected>_when_<condition>`
- [ ] Include docstrings explaining test purpose
- [ ] Test edge cases explicitly (empty input, null, invalid types)
- [ ] Use pytest fixtures for shared setup

---

## Architecture-Specific Rules

### AST Processing (`backend/src/iris_agent/ast_*.py`)
**Apply when working on AST-related files**

- [ ] Every node MUST have `line_range` field (no exceptions)
- [ ] Use `extract_line_range()` utility for position extraction
- [ ] Comment nodes from Tree-sitter must be filtered out (use Comment Extractor only)
- [ ] Preserve AST structure - don't flatten unnecessarily
- [ ] Add `extra_children_count` when collapsing complex nodes

### Agent & Prompts (`backend/src/iris_agent/agent.py`, `prompts.py`)
**Apply when working on LLM integration**

- [ ] Always include token count tracking
- [ ] Log all LLM API calls with timing
- [ ] Handle tool-calling responses properly (check for `tool_calls` attribute)
- [ ] Parse JSON responses with error handling (strip markdown fences)
- [ ] Use structured prompts with clear sections and examples

### Chrome Extension Content Scripts
**Apply when modifying extension UI or interactions**

- [ ] Test on actual GitHub pages before committing
- [ ] Handle GitHub's dynamic page loading (Turbo navigation)
- [ ] Use MutationObserver for DOM changes
- [ ] Clean up event listeners properly
- [ ] Never assume DOM structure - always check existence

---

## Domain-Specific Concepts

### File Intent
**Format**: `[System Role] + [Domain] + [Primary Responsibility]`

**Good Examples**:
- "Batch job orchestrator: coordinates task scheduling, execution, and retry logic"
- "Core parsing engine: transforms raw input into structured domain objects"

**Bad Examples**:
- "Contains helper functions" (too vague)
- "Implements React hooks" (implementation detail)

### Responsibility Blocks
Each responsibility is a **complete ecosystem**:
- Functions (execution logic)
- State (runtime data)
- Imports (dependencies)
- Types (data structures)
- Constants (configuration)

**Test**: "If I moved this responsibility to its own file, what would I need to take?"

---

## Special Instructions

### When Asked to "Resume" or "Continue"
- [ ] Check conversation history for incomplete todo list
- [ ] Continue from last incomplete step without asking for confirmation
- [ ] Inform user which step you're resuming from
- [ ] Do NOT return control until entire todo list is complete

### When Debugging
- [ ] Use `get_errors` tool to identify issues
- [ ] Make small, testable changes
- [ ] Add temporary print statements to inspect state
- [ ] Determine root cause before fixing symptoms
- [ ] Remove debug code before committing

### When Creating Implementation Plans
- [ ] Use templates from `.github/prompts/create-implementation-plan.prompt.md`
- [ ] Include measurable completion criteria for each phase
- [ ] Use standardized prefixes (REQ-, TASK-, CON-, etc.)
- [ ] Save in `/plan/` directory with proper naming

---

## Priority Instructions

**These rules override others if conflict arises:**

1. **DO NOT** generate tests or documentation unless explicitly requested
2. **ALWAYS** activate virtual environment for Python work
3. **NEVER** use new libraries without explicit permission
4. **ALWAYS** prioritize working prototype over perfect code
5. **MUST** follow language-specific style guides (PEP 8 for Python)

---

## Quick Reference

- **Project Root**: `/backend` for Python, `/extension` for Chrome extension
- **Tests**: `backend/tests/` (use pytest)
- **Virtual Env**: `backend/venv/` (activate with `source venv/bin/activate`)
- **Main Docs**: `.github/copilot-instructions.md` (comprehensive guide)
- **Implementation Plans**: `/plan/` directory

---

## Context Links

- [Full project documentation](.github/copilot-instructions.md)
- [Backend architecture](backend/specs/)
- [Iris Agent architecture](backend/specs/single_stage_tool_calling_spec.md)
- [Development history](docs/history.md)