---
goal: Add Mangum handler for Flask backend to run on AWS Lambda
version: 1.0
date_created: 2026-02-07
last_updated: 2026-02-07
owner: IRIS Backend
status: 'Implemented'
tags: [feature, infrastructure, backend]
---

# Introduction

This plan defines the minimal backend code changes required to expose the existing Flask app through a Mangum Lambda handler while keeping local development behavior unchanged.

## 1. Requirements & Constraints

- **REQ-001**: Keep the existing Flask app unchanged in behavior for local execution.
- **REQ-002**: Expose a Lambda handler that wraps the Flask `app` using Mangum.
- **REQ-003**: Ensure the Flask `app` remains importable at module scope.
- **SEC-001**: Do not hardcode secrets; rely on environment variables already in place.
- **CON-001**: Do not introduce new libraries other than `mangum`.
- **CON-002**: Do not add new test files unless explicitly requested.
- **GUD-001**: Preserve current request routes and CORS settings.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Add Mangum dependency and handler module for Lambda entry.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Update [backend/requirements.txt](backend/requirements.txt) to include `mangum` with a pinned minimum version (e.g., `mangum>=0.17.0`). | | |
| TASK-002 | Create [backend/src/lambda_handler.py](backend/src/lambda_handler.py) with `from mangum import Mangum`, `from server import app`, and `handler = Mangum(app)` as the module-level Lambda entry point. | | |
| TASK-003 | Verify [backend/src/server.py](backend/src/server.py) continues to expose the module-level `app` and only calls `app.run(...)` under the `if __name__ == "__main__":` guard. | | |

### Implementation Phase 2

- **GOAL-002**: Ensure compatibility and document the runtime expectations for the handler.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Add a short comment at the top of [backend/src/lambda_handler.py](backend/src/lambda_handler.py) clarifying that `handler` is the Lambda entry point for API Gateway. | | |
| TASK-005 | Confirm any import path assumptions in [backend/src/server.py](backend/src/server.py) still work when loaded by Lambda (e.g., `sys.path.insert` usage remains correct). | | |

## 3. Alternatives

- **ALT-001**: Use Zappa or Serverless Framework. Rejected to keep a minimal, framework-free deployment path.
- **ALT-002**: Rewrite the Flask app to FastAPI/ASGI. Rejected to avoid changes to application logic.

## 4. Dependencies

- **DEP-001**: `mangum` package in [backend/requirements.txt](backend/requirements.txt).
- **DEP-002**: Existing Flask app in [backend/src/server.py](backend/src/server.py) must remain importable.

## 5. Files

- **FILE-001**: [backend/requirements.txt](backend/requirements.txt) for dependency update.
- **FILE-002**: [backend/src/server.py](backend/src/server.py) to ensure `app` remains module-level and `app.run` is guarded.
- **FILE-003**: [backend/src/lambda_handler.py](backend/src/lambda_handler.py) new Lambda handler module.

## 6. Testing

- **TEST-001**: Manual smoke test: run Flask locally and confirm `/health` responds 200.
- **TEST-002**: Manual lambda entry sanity check: import `handler` in a Python REPL without exceptions.

## 7. Risks & Assumptions

- **RISK-001**: Async Flask routes may require specific Flask/WSGI behavior in Lambda; ensure the deployed environment uses the same Flask version as local.
- **RISK-002**: Import path issues when Lambda loads [backend/src/server.py](backend/src/server.py) if working directory differs.
- **ASSUMPTION-001**: API Gateway will route requests directly to the Mangum handler without path rewriting.

## 8. Related Specifications / Further Reading

[backend/specs/flask_to_aws_lambda.md](backend/specs/flask_to_aws_lambda.md)
https://mangum.io/
