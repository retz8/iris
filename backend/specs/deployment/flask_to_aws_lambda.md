# Step 1: Deploy Existing Flask Server to AWS Lambda

This document describes the minimal steps to deploy an existing Flask server to AWS Lambda **without rewriting the app**, using **Mangum** and a **container image**.

---

## Goal

* Keep the existing Flask app intact
* Run it as an AWS Lambda function
* Use API Gateway for HTTP access
* Optimize for low cost and minimal infrastructure overhead

---

## Architecture Overview

```
Client
  → API Gateway (HTTP API)
    → AWS Lambda (Container Image)
      → Mangum (WSGI adapter)
        → Flask App
```

---

## 1. Prepare the Flask App for Lambda

* Keep `app = Flask(__name__)` unchanged
* Remove or ignore `app.run()`
* Expose the Flask app as a module-level object

The Flask app must be importable by Lambda.

---

## 2. Add Mangum as a WSGI Adapter

* Add `mangum` to dependencies
* Create a Lambda handler that wraps the Flask app

Conceptually:

* Flask remains a WSGI app
* Mangum translates API Gateway events into WSGI requests

---

## 3. Use a Container Image for Lambda

AWS Lambda supports Docker container images as a runtime.

Benefits:

* Same environment as local Docker
* No dependency size limits
* Easier debugging and parity with Fly.io if needed

---

## 4. Build a Lambda-Compatible Docker Image

The image must:

* Be based on an AWS Lambda Python base image
* Install Python dependencies
* Copy application code
* Define the Lambda handler as the container entrypoint

The handler becomes the true entrypoint (not Flask).

---

## 5. Push Image to Amazon ECR

* Create an ECR repository
* Authenticate Docker to ECR
* Build and push the image

ECR acts as the deployment source for Lambda.

---

## 6. Create the Lambda Function

* Runtime: **Container Image**
* Image source: ECR image
* Memory: 512 MB or higher
* Timeout: 30–60 seconds
* Environment variables:

  * `OPENAI_API_KEY`
  * Model snapshot name
  * Token limits

---

## 7. Attach API Gateway (HTTP API)

* Create an HTTP API
* Route requests (e.g. `/analyze`) to the Lambda function
* Enable CORS if needed

API Gateway replaces the traditional web server.

---

## Result

* Flask code remains unchanged
* No always-on server
* Pay-per-request pricing
* Backend behaves as a stateless analysis function

This setup aligns with IRIS’s vision of a transparent, environment-agnostic analysis backend.
