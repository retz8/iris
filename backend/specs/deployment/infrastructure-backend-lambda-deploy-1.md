---
goal: Containerize and deploy IRIS Flask backend to AWS Lambda with API Gateway
version: 1.0
date_created: 2026-02-07
last_updated: 2026-02-07
owner: IRIS Backend
status: 'Planned'
tags: [infrastructure, deployment, backend]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines the containerization and deployment steps to run the IRIS Flask backend on AWS Lambda behind API Gateway using a container image stored in ECR. It is designed for manual execution outside the IDE.

## 1. Requirements & Constraints

- **REQ-001**: Use AWS Lambda container image runtime for deployment.
- **REQ-002**: Use API Gateway HTTP API to expose the backend over HTTPS.
- **REQ-003**: Use Mangum handler as the Lambda entry point.
- **SEC-001**: Store secrets using AWS Secrets Manager or SSM Parameter Store.
- **SEC-002**: Avoid embedding secrets in Docker images or source control.
- **CON-001**: Prefer minimal infrastructure and pay-per-request pricing.
- **CON-002**: Deployment steps must be executable by a single operator.
- **GUD-001**: Maintain parity with local Docker environment.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Build a Lambda-compatible container image.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create a Dockerfile based on AWS Lambda Python base image (e.g., `public.ecr.aws/lambda/python:3.11`). Copy backend code, install dependencies, and set the handler to `src.lambda_handler.handler`. | | |
| TASK-002 | Build the container locally with `docker build` and run a smoke test using the Lambda Runtime Interface Emulator or `docker run` with a local invoke. | | |

### Implementation Phase 2

- **GOAL-002**: Publish image to ECR and create the Lambda function.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-003 | Create or select an ECR repository, authenticate Docker to ECR, and push the image with a versioned tag. | | |
| TASK-004 | Create a Lambda function using the ECR image, configure memory, timeout, and environment variables. | | |
| TASK-005 | Attach IAM policy allowing the function to read secrets from Secrets Manager/SSM as needed. | | |

### Implementation Phase 3

- **GOAL-003**: Expose Lambda via API Gateway HTTP API.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Create an HTTP API, add routes for `/api/iris/*`, and integrate them with the Lambda function. | | |
| TASK-007 | Configure CORS (allowed origins, methods, headers) consistent with existing Flask CORS settings. | | |
| TASK-008 | Deploy the API and verify end-to-end request flow from a client. | | |

## 3. Alternatives

- **ALT-001**: Use AWS Lambda zip deployment. Rejected due to dependency size and build complexity.
- **ALT-002**: Use ECS/Fargate or Fly.io. Rejected to avoid always-on compute and higher operational overhead.

## 4. Dependencies

- **DEP-001**: AWS account with permissions for ECR, Lambda, API Gateway, IAM.
- **DEP-002**: Local Docker installation for building images.
- **DEP-003**: Mangum handler available at `src.lambda_handler.handler`.

## 5. Files

- **FILE-001**: Dockerfile in backend root (to be created).
- **FILE-002**: Any deployment scripts or notes used for operator execution (optional).

## 6. Testing

- **TEST-001**: Local container invoke test returns 200 on `/health`.
- **TEST-002**: API Gateway endpoint returns 200 for `/api/iris/health`.
- **TEST-003**: Production request to `/api/iris/analyze` returns a successful JSON response.

## 7. Risks & Assumptions

- **RISK-001**: Cold start latency from container image could impact perceived responsiveness.
- **RISK-002**: API Gateway payload limits may restrict large requests.
- **ASSUMPTION-001**: Network egress to LLM providers is allowed in the Lambda VPC configuration (if VPC is used).
- **ASSUMPTION-002**: API Gateway routes are configured to preserve path mappings without rewriting.

## 8. Related Specifications / Further Reading

[backend/specs/flask_to_aws_lambda.md](backend/specs/flask_to_aws_lambda.md)
https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html
