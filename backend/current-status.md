# Backend Current Status

## Summary
The backend runs a single-shot LLM analysis pipeline that produces File Intent and Responsibility Blocks for a given file. It prioritizes speed, simplicity, and determinism, with a two-tier cache to reduce cost and latency.

## Current architecture
- **Single-shot inference**: One LLM call per analysis, no tool-calling or multi-agent orchestration.
- **Structured output**: JSON schema with `file_intent` and `responsibility_blocks`.
- **Caching**: Memory LRU + disk cache, content-addressed by SHA-256.

## Cache flow visualization (user request scenarios)

```mermaid
flowchart TD
    A["User requests analysis<br/>(filename, language, source)"] --> B["Compute SHA-256<br/>content hash"]
    B --> C{"Cache system<br/>initialized?"}
    C -- No --> H["Call LLM<br/>(single-shot analysis)"]
    C -- Yes --> D{"Memory LRU<br/>hit?"}
    D -- Yes --> E["Return cached result<br/>(memory hit)"]
    D -- No --> F{"Disk cache<br/>hit?"}
    F -- Yes --> G["Promote to memory<br/>return cached result"]
    F -- No --> H
    H --> I["Store result<br/>memory + disk"]
    I --> J["Return result<br/>(cache miss)"]
```

Notes:
- Disk entries expire after TTL (default 30 days); expired entries are deleted on read and during startup cleanup.
- Local cache hits/misses and OpenAI usage are tracked by `CacheMonitor`.

## API surface
- **POST /api/iris/analyze**
  - Input: `filename`, `language`, `source_code` (with line numbers), optional `metadata`.
  - Output: `file_intent`, `responsibility_blocks`, `metadata`.
- **GET /api/iris/health**: Agent readiness check.

## Supported languages
- Python
- JavaScript
- TypeScript

## Key modules
- `agent.py`: Single-shot orchestration, cache lookup, OpenAI usage tracking.
- `prompts.py`: System prompt and output schema.
- `analysis_cache.py`: LRU + disk cache, TTL cleanup.
- `cache_monitor.py`: Local cache metrics and OpenAI cost tracking.
- `routes.py`: Flask API endpoints.
- `lambda_handler.py`: Mangum WSGI adapter exposing the Flask app as an AWS Lambda handler.

## AWS Lambda deployment
- **Adapter**: Mangum wraps the Flask WSGI app to translate API Gateway events.
- **Handler entry point**: `lambda_handler.handler` (for container CMD / Lambda config).
- **Runtime**: Container image based on AWS Lambda Python base image.
- **Local dev unchanged**: `app.run()` remains guarded under `__main__`; Mangum is only invoked by Lambda.
- **Specs**: `backend/specs/deployment/` contains the deployment plan and implementation details.

## Known constraints
- Analysis is file-scoped (single file per request).
- Cache invalidation is content-based only.
- No multi-file or project-wide reasoning.

## Deployment
- AWS Lambda
- AWS GateWay
- CloudStore
- Temporary API Key authorization (will change to github OAuth)

