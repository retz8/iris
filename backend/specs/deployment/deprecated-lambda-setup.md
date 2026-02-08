# Deprecated: AWS Lambda Deployment Setup

> **Note**: This deployment method is no longer in use. Migrated to EC2 in February 2026. See [deployment-state.md](./deployment-state.md) for the current setup.

---

## Infrastructure

- **AWS Lambda** (containerized): Python runtime deployed as Docker container image to ECR (Elastic Container Registry)
- **API Gateway** (HTTP API): Public endpoint routing requests to Lambda function
- **Mangum**: WSGI adapter wrapping the Flask app to translate API Gateway events into WSGI calls
- **Authentication**: Temporary API key validation via custom header (`X-API-Key`)

**Legacy endpoint:** `https://ejg9mydfzi.execute-api.us-east-2.amazonaws.com/api/iris/analyze`

---

## Container Image

- **Base image**: AWS Lambda Python 3.11 (`public.ecr.aws/lambda/python:3.11`)
- **Build**: Multi-stage Docker build
  - Stage 1: Install dependencies from `requirements.txt`
  - Stage 2: Copy source code, set Lambda handler entry point
- **Entry point**: `lambda_handler.handler` (Mangum WSGI adapter wrapping Flask app)
- **Registry**: AWS ECR (private repository)

---

## Deployment Flow

```
1. Build Docker image locally (or CI/CD)
2. Tag image with ECR repository URI
3. Push to ECR: aws ecr get-login-password | docker push
4. Update Lambda function: aws lambda update-function-code --image-uri
5. API Gateway invokes Lambda on HTTP requests
```

---

## Environment Variables

| Variable         | Purpose                              | Storage               |
|------------------|--------------------------------------|-----------------------|
| `OPENAI_API_KEY` | LLM inference                        | Lambda env config     |
| `API_KEY`        | Temporary authorization secret       | Lambda env config     |

Cache paths used Lambda's `/tmp` directory (ephemeral, not persistent across invocations).

---

## Why It Was Deprecated

| Problem                   | Detail                                                                         |
|---------------------------|--------------------------------------------------------------------------------|
| **Cache not persistent**  | Lambda's ephemeral `/tmp` and isolated containers mean cache is lost between invocations or across instances |
| **Cold starts**           | First request after idle period incurs 1-3s initialization latency             |
| **Cost inefficiency**     | ElastiCache Redis (~$15/month) required for persistent caching, negating Lambda's pay-per-use advantage at low traffic |
| **Complexity**            | Mangum WSGI adapter adds an unnecessary abstraction layer                      |

---

## Related Code (still in repo)

- `backend/lambda_handler.py` — Mangum handler (deprecated, kept for reference)
- `backend/Dockerfile` — Lambda container image build
- `backend/authorizer.py` — API Gateway custom authorizer

**Migration completed:** 2026-02-08 → EC2 deployment
