# Backend Current Status

## Summary
The backend runs a single-shot LLM analysis pipeline that produces File Intent and Responsibility Blocks for a given file. It prioritizes speed, simplicity, and determinism, with a two-tier cache to reduce cost and latency.

## Current architecture
- **Single-shot inference**: One LLM call per analysis, no tool-calling or multi-agent orchestration.
- **Structured output**: JSON schema with `file_intent` and `responsibility_blocks`.
- **Caching**: Memory LRU + disk cache, content-addressed by SHA-256.

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

## Known constraints
- Analysis is file-scoped (single file per request).
- Cache invalidation is content-based only.
- No multi-file or project-wide reasoning.

## Next likely work
- Tighten prompt or schema if responsibility block quality regresses.
- Expand supported languages as parser coverage grows.
- Add automated tests for cache and API validation paths.
