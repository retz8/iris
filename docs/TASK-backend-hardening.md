# Track D: Backend Hardening

**Stream:** 2 (from TODO.md)
**Scope:** `backend/src/` (routes, middleware, infra config)
**Dependencies:** Track B must complete first (both modify backend/src/ - avoid merge conflicts)
**Blocks:** None

## Objective

Harden the backend for production use by implementing rate limiting, fixing CloudWatch EMF metric ingestion, and cleaning up legacy Lambda deployment code that's no longer used.

**Current State:**
- Backend deployed on EC2 with Flask/Gunicorn
- No rate limiting (vulnerable to abuse before public launch)
- CloudWatch EMF events are emitted but not ingesting into metrics (monitoring blind spot)
- Legacy Lambda code still in codebase (authorizer.py, lambda_handler.py) from old deployment approach

## Context

The backend is currently production-deployed but lacks critical hardening for public release. Rate limiting prevents abuse and protects infrastructure costs. CloudWatch metrics are needed for monitoring production health. Legacy Lambda code is dead weight that confuses the deployment model.

**Key Files:**
- `backend/src/routes.py` - API endpoint definitions
- `backend/src/server.py` - Flask app initialization
- `backend/src/middleware/` - Middleware layer (may need to create)
- `backend/src/authorizer.py` - Legacy Lambda authorizer (DELETE)
- `backend/src/lambda_handler.py` - Legacy Lambda handler (DELETE)
- CloudWatch EMF config - Location TBD (might be in server.py or separate config)

## Phase 0: Exploration

Follow these steps to understand the current state:

1. Read `backend/src/routes.py` and `backend/src/server.py` to understand current middleware setup
2. Search for "EMF" or "CloudWatch" in backend to find where metrics are emitted (Grep)
3. Search for imports of `authorizer.py` and `lambda_handler.py` to confirm they're unused (Grep)
4. Check if middleware directory exists or needs to be created
5. Review Flask rate limiting libraries (Flask-Limiter, slowapi, custom middleware)
6. Check CloudWatch EMF documentation for expected JSON format

## Phase 1: Discovery/Discussion (with human engineer)

### Topics to Discuss

Based on Phase 0 exploration, discuss and generate specific questions for:

1. **Rate Limiting** - Appropriate limits, tier strategy, response format, storage mechanism, per-key vs per-IP
2. **CloudWatch EMF** - Current emission location, format issues, metric schema, verification approach
3. **Legacy Code Cleanup** - Confirm unused files, identify other Lambda artifacts, documentation updates
4. **Testing Strategy** - Local testing approach, pytest coverage, verification methods

Document specific questions and design decisions here after discussion.

## Phase 2: Implementation Planning

**Will be filled in after Phase 1 discussion.** Should include:
- Rate limiting implementation approach
- CloudWatch EMF fix steps
- Files to delete and cleanup checklist
- Middleware organization structure

## Phase 3: Execution

**Will be filled in after Phase 2 planning.** Should include:
- Rate limiting middleware implementation
- CloudWatch EMF configuration fix
- Legacy code deletion
- Documentation updates

## Phase 4: Testing & Verification

**Will be filled in after Phase 3 execution.** Should include:
- Rate limiting test (simulate rapid requests, verify 429 responses)
- CloudWatch EMF verification (check metrics appear in CloudWatch console)
- Verify no broken imports after deleting legacy code
- Load test to ensure rate limiting doesn't impact normal usage

## Acceptance Criteria

- [ ] **Rate Limiting:**
  - API has per-key rate limiting middleware
  - Exceeding rate limit returns 429 status with clear error message
  - Retry-After header included in 429 response
  - Rate limiting doesn't block legitimate usage patterns (normal users unaffected)
  - Rate limit thresholds are documented (in code comments or config file)

- [ ] **CloudWatch EMF:**
  - EMF events successfully ingest into CloudWatch Metrics
  - At minimum, track: request count, analysis latency, cache hit rate, error rate
  - Metrics visible in CloudWatch console under correct namespace
  - EMF format follows AWS specification (proper JSON structure)

- [ ] **Legacy Code Cleanup:**
  - `backend/src/authorizer.py` deleted
  - `backend/src/lambda_handler.py` deleted
  - Any Lambda-specific dependencies removed from requirements.txt
  - No broken imports or references to deleted files
  - `backend/current-status.md` updated to reflect EC2-only deployment

## Files Likely to Modify

Based on scope:
- `backend/src/server.py` - Add rate limiting middleware registration, CloudWatch EMF config
- `backend/src/middleware/rate_limiter.py` - Create rate limiting middleware (new file)
- `backend/src/routes.py` - May need rate limit decorators on endpoints
- `backend/src/config.py` - Add rate limit configuration (thresholds, storage)
- CloudWatch EMF config - Fix format or permissions issue
- DELETE: `backend/src/authorizer.py`, `backend/src/lambda_handler.py`
- `backend/current-status.md` - Update deployment notes
- `backend/requirements.txt` - Add rate limiting library if needed

## Claude Code Session Instructions

### Skills to Use

- **devops-engineer** - For rate limiting implementation, CloudWatch configuration, deployment considerations

### Recommended Agents

- **General-purpose agent** - For middleware implementation, debugging, cleanup
- **Explore agent** - For finding EMF code and legacy code references

### Tools Priority

- **Read** - Study current server.py, routes.py, middleware setup
- **Grep** - Search for EMF, CloudWatch, authorizer, lambda_handler references
- **Edit** - Add middleware, fix EMF config
- **Write** - Create new middleware file
- **Bash** - Test backend locally, run pytest, simulate rate limit requests

### Testing Commands

```bash
# Activate venv
cd backend && source venv/bin/activate

# Run backend locally
python -m src.server

# Test rate limiting (simulate rapid requests)
for i in {1..100}; do curl -X POST http://localhost:8080/api/iris/analyze; done

# Run tests
pytest backend/tests/

# Test specific rate limit tests (after writing them)
pytest backend/tests/test_rate_limiter.py -v

# Check for broken imports after deleting legacy code
python -m backend.src.server
```

### Coordination

- **Before starting:**
  - Read `docs/tasks/UPDATES.md` to confirm Track B is complete
  - Do NOT start if Track B is still in progress (merge conflict risk)

- **After completing:** Append summary to `docs/tasks/UPDATES.md` with:
  - Rate limiting configuration (thresholds, per-key or per-IP)
  - CloudWatch EMF fix applied
  - Legacy files deleted
  - Files modified

## Notes

- **BLOCKED by Track B** - Both modify backend/src/, must wait for B to complete
- Can run in parallel with Tracks A, C once Track B is done
- Rate limiting is critical before public marketplace launch
- CloudWatch metrics needed for production monitoring and debugging
- Follow PEP 8 and existing backend code style
- ALWAYS activate venv before running backend code
