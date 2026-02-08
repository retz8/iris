"""
Lambda Authorizer for IRIS API Gateway
Validates x-api-key header against allowed keys
"""
import os
import json


# Load valid API keys from environment variable (comma-separated)
# Example: IRIS_API_KEYS="key1,key2,key3"
API_KEYS_ENV = os.environ.get("IRIS_API_KEYS", "")
VALID_API_KEYS = [key.strip() for key in API_KEYS_ENV.split(",") if key.strip()]


def handler(event, context):
    """
    Lambda authorizer handler for HTTP API Gateway

    Event format for HTTP API:
    {
        "headers": {"x-api-key": "value"},
        "requestContext": {...},
        "routeArn": "arn:aws:execute-api:..."
    }
    """
    print(f"Authorizer invoked: {json.dumps(event)}")

    # Extract API key from headers
    headers = event.get("headers", {})
    api_key = headers.get("x-api-key") or headers.get("X-Api-Key")

    # Check if API key is valid
    is_allowed = api_key in VALID_API_KEYS

    print(f"API Key: {api_key}, Valid: {is_allowed}")

    # Return authorization response
    # For HTTP APIs (payload format 2.0), return simple allow/deny
    return {
        "isAuthorized": is_allowed
    }
