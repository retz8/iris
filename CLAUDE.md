# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IRIS is an intelligent code comprehension tool that provides progressive abstraction layers to help developers understand unfamiliar codebases. Core philosophy: **"IRIS prepares developers to read code, not explains code."**

Two core abstractions:
- **File Intent (WHY)**: Format is `[System Role] + [Domain] + [Primary Responsibility]` (e.g., "Orchestrates Batch Jobs by coordinating task scheduling, execution, and retry logic")
- **Responsibility Blocks (WHAT)**: Major logical components within a file, each a complete ecosystem (functions, state, imports, types, constants)

## Build & Development Commands

### Backend (Python/Flask)
```bash
cd backend && source venv/bin/activate   # ALWAYS activate venv for Python work
python -m src.server                     # Run server on localhost:8080
pytest backend/tests/                    # Run tests
pytest backend/tests/test_foo.py         # Run single test file
pytest backend/tests/test_foo.py::test_bar  # Run single test
```

### VS Code Extension (TypeScript)
```bash
cd packages/iris-vscode
npm install              # Install dependencies (run from repo root for workspaces)
npm run compile          # Type check + lint + build
npm run watch            # Watch mode for development
npm run package          # Production build (minified)
npm run lint             # ESLint
npm run check-types      # TypeScript type checking only
npm run test             # VS Code test runner
```

Build uses esbuild, outputting a single bundled file at `dist/extension.js`.

### API Endpoints
- `GET /api/iris/health` - Health check
- `POST /api/iris/analyze` - Analyze a file (params: `filename`, `language`, `source_code`)

## Architecture

### Backend (`backend/src/`)

Uses a **single-shot inference** pattern: one LLM API call with full source code produces structured output via OpenAI's `responses.parse()` API. No multi-stage orchestration or tool-calling.

- **`server.py`** - Flask entry point
- **`routes.py`** - API blueprint at `/api/iris`
- **`agent.py`** - `IrisAgent` class orchestrating LLM analysis with two-tier caching
- **`prompts.py`** - System prompts and Pydantic output schemas
- **`analysis_cache.py`** - Hybrid cache: in-memory LRU (500 entries) + disk (30-day TTL, SHA-256 content-addressed)
- **`cache_monitor.py`** - OpenAI usage/cost tracking, persisted to `.iris/metrics.json`
- **`parser/ast_parser.py`** - Unified Tree-sitter parser (JS, TS, Python, Go, Java, C, C++)
- **`config.py`** - Model config (`gpt-5-nano-2025-08-07`), cache settings, supported languages

Cache flow: Check memory → check disk (promote hit to memory) → LLM inference → cache result.

### VS Code Extension (`packages/iris-vscode/src/`)

Uses a **state-driven architecture** with explicit state transitions: `IDLE → ANALYZING → ANALYZED → STALE`.

- **`extension.ts`** - Entry point, initializes all managers, registers commands
- **`state/irisState.ts`** - `IRISStateManager`: single source of truth, event emitter for state changes
- **`api/irisClient.ts`** - Backend HTTP client with 15s timeout, structured error types
- **`webview/sidePanel.ts`** - Stateless webview provider, renders based on current state
- **`decorations/decorationManager.ts`** - Text decorations for responsibility blocks, deterministic color generation via golden ratio, theme-aware (light/dark)
- **`decorations/segmentNavigator.ts`** - Ctrl+Up/Down navigation between scattered code sections in a block
- **`utils/blockId.ts`** - SHA-1 hashing for stable block identification across sessions
- **`utils/colorAssignment.ts`** - WCAG AA compliant color generation
- **`types/messages.ts`** - Webview ↔ extension message contracts

Key: API response line numbers are ONE-based; VS Code uses ZERO-based. The decoration manager handles this conversion.

### Chrome Extension (`extension/`) - Legacy, targets GitHub UI with Manifest v3.

## Development Rules

- **Fast iteration over perfect code** - prioritize working prototypes
- **Do NOT generate `.md` or test files** unless explicitly requested
- **Do not use new libraries/platforms** unless explicitly told
- **ALWAYS activate virtual environment** for Python work: `cd backend && source venv/bin/activate`
- **PEP 8** for Python style
- **Test naming**: `test_should_<expected>_when_<condition>`
- **Debugging**: determine root cause before fixing symptoms; remove debug code before committing

## Documentation Updates on Request

When the user explicitly asks after changes are made, update the following
current-status documents based on the actual modifications in that session:
- `backend/current-status.md`
- `packages/iris-vscode/current-status.md`

Guidelines:
- Reflect only the changes that actually occurred.
- Keep updates concise and action-focused.
- Include constraints/limitations if they changed.
