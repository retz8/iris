---
goal: Add EMF analytics logging for /api/iris/analyze
version: 1.0
date_created: 2026-02-07
last_updated: 2026-02-07
owner: Backend
status: Planned
tags: [data, analytics, feature, logging]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Implement structured JSON logging with CloudWatch Embedded Metrics Format (EMF) for the /api/iris/analyze endpoint, following IRIS Analytics Event Schema v0.

## 1. Requirements & Constraints

- **REQ-001**: Emit structured JSON logs only (no plain text logs) for analytics events.
- **REQ-002**: Emit events: `analysis_requested`, `analysis_started`, `analysis_completed`, `analysis_failed`.
- **REQ-003**: Use EMF namespace `IRIS/Analysis` with dimensions `Environment`, `Endpoint`.
- **REQ-004**: Add `ErrorType` dimension for `analysis_failed` only.
- **REQ-005**: Promote metrics: latency (ms), input tokens, output tokens, estimated cost (USD), responsibility block count, cache hit (0/1).
- **SEC-001**: Never use high-cardinality values (request_id, filename, raw code) as metric dimensions.
- **CON-001**: Lambda-native only (stdout or Python logging); no CloudWatch API calls.
- **CON-002**: Do not introduce new infrastructure or external services.
- **GUD-001**: Reuse a single EMF helper to ensure consistent schema and dimensions.
- **PAT-001**: Keep metrics event-first; log fields remain the source of truth.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Add a minimal EMF logging utility for IRIS analytics events.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create [backend/src/utils/analytics_emf.py](backend/src/utils/analytics_emf.py) with helpers to build EMF payloads for `analysis_requested`, `analysis_started`, `analysis_completed`, `analysis_failed`, including `_aws` metadata, `Environment`, `Endpoint`, and optional `ErrorType`. | Yes | 2026-02-07 |
| TASK-002 | Implement `emit_emf_event(payload: dict) -> None` using ``logging` or `print(json.dumps(...))` to guarantee JSON-only output. | Yes | 2026-02-07 |
| TASK-003 | Add a small environment resolver (e.g., `IRIS_ENV` from `os.getenv`) so `Environment` is always present without hardcoding. | Yes | 2026-02-07 |

### Implementation Phase 2

- **GOAL-002**: Instrument `/api/iris/analyze` to emit all four analytics events with correct metrics.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Update [backend/src/routes.py](backend/src/routes.py) to emit `analysis_requested` after request parsing with `CodeLengthChars` and `EstimatedInputTokens` (e.g., simple chars-per-token heuristic). | Yes | 2026-02-07 |
| TASK-005 | Emit `analysis_started` before LLM execution with `TotalPromptTokens` and `CacheHit` (0/1). For cache hits, set `CacheHit=1` and `TotalPromptTokens=0` unless real prompt stats are available. | Yes | 2026-02-07 |
| TASK-006 | Emit `analysis_completed` on success with `TotalLatencyMs`, `InputTokens`, `OutputTokens`, `EstimatedCostUsd`, `ResponsibilityBlockCount` (derived from result). | Yes | 2026-02-07 |
| TASK-007 | Emit `analysis_failed` on any failure path with `ErrorType`, `FailureCount=1`, and `LatencyUntilFailureMs`. Ensure no high-cardinality dimensions are added. | Yes | 2026-02-07 |

### Implementation Phase 3

- **GOAL-003**: Surface token usage, cost, and cache hit metadata for logging.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Update [backend/src/agent.py](backend/src/agent.py) to include LLM usage stats in the returned `metadata` (input/output tokens, prompt tokens, estimated cost if available). | Yes | 2026-02-07 |
| TASK-009 | Ensure cache-hit responses provide `cache_hit=1` metadata so `analysis_started` and `analysis_completed` can report cache-related metrics consistently. | Yes | 2026-02-07 |

## 3. Alternatives

- **ALT-001**: Use AWS SDK `PutMetricData` for metrics. Rejected because it violates Lambda-native and zero-infra requirements.
- **ALT-002**: Emit a single aggregated EMF event per request. Rejected because the schema requires four explicit lifecycle events.

## 4. Dependencies

- **DEP-001**: Existing OpenAI client usage in [backend/src/agent.py](backend/src/agent.py) for token usage data.
- **DEP-002**: Existing Flask routing in [backend/src/routes.py](backend/src/routes.py).

## 5. Files

- **FILE-001**: [backend/src/utils/analytics_emf.py](backend/src/utils/analytics_emf.py) (new EMF helper module)
- **FILE-002**: [backend/src/routes.py](backend/src/routes.py) (instrument /api/iris/analyze)
- **FILE-003**: [backend/src/agent.py](backend/src/agent.py) (surface usage and cache metadata)

## 6. Testing

- **TEST-001**: Manual validation via CloudWatch logs: confirm four JSON EMF events per request with correct dimensions and metrics.
- **TEST-002**: Local run (Lambda container or Flask dev) to verify JSON-only log output and correct event ordering.

## 7. Risks & Assumptions

- **RISK-001**: Token/cost estimates may be approximate if not all usage fields are available.
- **RISK-002**: Cache-hit paths may lack prompt token counts, requiring explicit defaults.
- **ASSUMPTION-001**: The backend can safely log structured JSON to stdout and CloudWatch will ingest EMF automatically.

## 8. Related Specifications / Further Reading

- [backend/specs/data_analytics/metrics_and_cloudstore_emf.md](backend/specs/data_analytics/metrics_and_cloudstore_emf.md)
- [backend/specs/deployment/flask_to_aws_lambda.md](backend/specs/deployment/flask_to_aws_lambda.md)
