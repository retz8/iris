# IRIS

<p align="center">
  <img width="251" height="116" alt="iris_no_background" src="https://github.com/user-attachments/assets/9da5e421-12d5-41e5-bc48-bb85e345cc4b" />
</p>

> **"IRIS prepares developers to read code, not explains code."**

IRIS is an intelligent code comprehension tool that provides progressive abstraction layers for source code — a high-fidelity "Table of Contents" that establishes a mental framework before you dive into implementation.

**Status: In active development. Not yet released.**

---

## How It Works

IRIS provides two layers of abstraction:

- **File Intent (WHY)** — Why does this file exist? A one-line role description that frames everything else.
- **Responsibility Blocks (WHAT)** — Major logical components within the file. Each block is a complete conceptual unit (functions, state, types, constants), ordered by comprehension flow.

You understand the file's purpose and structure before reading any implementation.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Developer                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    VS Code Extension    │
              │      (iris-vscode)      │
              │                         │
              │  Sidebar   ◄── State ──►  Editor
              │  Webview       Machine    Decorations
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │  @iris/core │
                    │             │
                    │  Types      │
                    │  State      │
                    │  API Client │
                    │  Block IDs  │
                    └──────┬──────┘
                           │ HTTP
              ┌────────────▼────────────┐
              │    Analysis Backend     │
              │      (Python/Flask)     │
              │                         │
              │  LLM Inference ── Cache │
              │  (single-shot)   (LRU   │
              │                + disk)  │
              └─────────────────────────┘
```

---

## Monorepo Structure

```
iris/
├── packages/
│   ├── iris-core/          # @iris/core — platform-agnostic domain logic
│   │   ├── src/
│   │   │   ├── models/     #   domain types
│   │   │   ├── state/      #   state machine (IDLE → ANALYZING → ANALYZED → STALE)
│   │   │   ├── api/        #   HTTP client with structured errors
│   │   │   ├── utils/      #   block ID generation (SHA-1)
│   │   │   └── types/      #   Logger interface
│   │   └── package.json
│   │
│   └── iris-vscode/        # VS Code extension (adapter over @iris/core)
│       ├── src/
│       │   ├── state/      #   adapter: core callbacks → vscode.EventEmitter
│       │   ├── webview/    #   sidebar panel
│       │   ├── decorations/#   editor highlights, theme-aware colors
│       │   ├── types/      #   webview ↔ extension message protocol
│       │   └── utils/      #   logger, color assignment
│       └── package.json
│
├── backend/                # Python/Flask analysis server
│   └── src/
│       ├── server.py       #   Flask entry point
│       ├── agent.py        #   LLM orchestration (single-shot inference)
│       ├── prompts.py      #   system prompts + Pydantic output schemas
│       ├── analysis_cache.py#  hybrid cache (in-memory LRU + disk)
│       └── parser/         #   Tree-sitter AST parser
│
└── package.json            # npm workspaces root
```

---

## Build

```bash
# Full build (core first, then extension)
npm run build

# Backend
cd backend && source venv/bin/activate
python -m src.server          # localhost:8080
```

Requires `@iris/core` to be built before `iris-vscode` compiles. The root build script enforces this.

---

## Deployment Plan

The backend is designed as a stateless analysis function. Planned production deployment:

```
Client → API Gateway (HTTP API) → AWS Lambda (Container) → Mangum → Flask
```

- Flask app wrapped with Mangum (WSGI adapter) in a Lambda container image
- Pay-per-request pricing, no always-on server
- Environment variables for API keys and model config

---

## Supported Languages

Python, JavaScript, TypeScript, JSX/TSX

---

## License

Not yet published.
