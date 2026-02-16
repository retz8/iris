# CLAUDE.md

See @README.md for project overview, architecture, build commands, and local development setup.

## Key Architecture Gotchas

- **Line numbers**: API response is ONE-based; VS Code is ZERO-based. Decoration manager handles conversion.
- **iris-core**: Owns state machine (`IDLE → ANALYZING → ANALYZED → STALE`), `IRISAPIClient`, domain types, block IDs, endpoint config.
- **iris-vscode**: Adapter pattern — wraps core state into `vscode.EventEmitter`. `iris.apiKey` VS Code setting is passed to `IRISAPIClient`; hot-reloads on config change.
- **Backend**: Single-shot LLM inference (one call per file). Two-tier cache: memory LRU + disk (SHA-256 content-addressed).
- **Auth**: Production requires `x-api-key` header. Local skips auth when `IRIS_API_KEY` env var is unset.

## Build & Dev Commands

### Backend (Python/Flask)
```bash
cd backend && source venv/bin/activate   # ALWAYS activate venv first
python -m src.server                     # localhost:8080
pytest backend/tests/                    # Run tests
pytest backend/tests/test_foo.py::test_bar  # Run single test
```

### Frontend (TypeScript)
```bash
npm run build            # Full build (core → extension)
npm run compile          # iris-vscode only: type check + lint + esbuild → dist/extension.js
npm run watch            # Watch mode (from packages/iris-vscode/)
```

### API
- **Production**: `https://api.iris-codes.com/api/iris/analyze` — requires `x-api-key` header
- **Local**: `http://localhost:8080/api/iris/analyze` — no auth when `IRIS_API_KEY` env var is unset
- `POST /api/iris/analyze` — params: `filename`, `language`, `source_code`
- `GET /api/iris/health` — no auth

## Development Rules

- **Fast iteration over perfect code** — prioritize working prototypes
- **Do NOT generate `.md` or test files** unless explicitly requested
- **Do not use new libraries/platforms** unless explicitly told
- **Do NOT include time estimates or duration predictions** in documentation or plans — avoid phrases like "2-3 days", "~1 week", "should take X hours"
- **Do NOT use emojis** in documentation or code — waste of tokens
- **Do NOT overuse `---` dividers** in markdown — headers are sufficient for structure, dividers waste tokens
- **ALWAYS activate virtual environment** for Python work: `cd backend && source venv/bin/activate`
- **PEP 8** for Python style
- **Test naming**: `test_should_<expected>_when_<condition>`
- **Debugging**: determine root cause before fixing symptoms; remove debug code before committing

## Code Verification Rules

### After Modifying TypeScript Code
**ALWAYS run these checks in order:**
1. **Type check**: `npm run typecheck` or `npx tsc --noEmit`
2. **Lint**: `npm run lint` or `npx eslint <modified-files>`
3. **Compile**: `npm run build` or `npm run compile`

If any check fails, fix the issues before considering the task complete.

### After Modifying Python Code
**ALWAYS run these checks in order:**
1. **Lint**: `cd backend && source venv/bin/activate && flake8 <modified-files>`
2. **Type check**: `mypy <modified-files>` (if mypy is configured)
3. **Tests**: `pytest backend/tests/` (run relevant test files)

If any check fails, fix the issues before considering the task complete.

## Implementation Plan Requirements

- **ALWAYS use the `create-implementation-plan` skill** when asked to write an implementation plan
- Implementation plans must follow the structured template format defined in the skill
- Plans must be machine-readable, deterministic, and executable by AI agents or humans
- Use standardized prefixes (REQ-, TASK-, GOAL-, etc.) for all identifiers
- Include specific file paths, function names, and exact implementation details
- No placeholder text or ambiguous language in final plans

## Documentation Updates on Request

When explicitly asked, update these current-status docs based on actual session changes:
- `backend/current-status.md`
- `packages/iris-vscode/current-status.md`
