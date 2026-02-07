"""CloudWatch Embedded Metrics Format (EMF) helpers for IRIS analytics events.

Emits structured JSON logs following the IRIS Analytics Event Schema v0.
Namespace: IRIS/Analysis. Default dimensions: Environment, Endpoint.
"""

import json
import logging
import os
import time

logger = logging.getLogger("iris.analytics")

EMF_NAMESPACE = "IRIS/Analysis"
DEFAULT_ENDPOINT = "/analyze"


def _resolve_environment() -> str:
    """Return the current environment from IRIS_ENV (defaults to 'dev')."""
    return os.getenv("IRIS_ENV", "dev")


def _build_emf_payload(
    event_name: str,
    metrics: list[dict],
    metric_values: dict,
    dimensions: list[list[str]] | None = None,
    extra_fields: dict | None = None,
) -> dict:
    """Build a complete EMF payload.

    Args:
        event_name: One of analysis_requested, analysis_started,
                    analysis_completed, analysis_failed.
        metrics: List of {"Name": ..., "Unit": ...} metric definitions.
        metric_values: Dict mapping metric names to their numeric values.
        dimensions: Override dimension sets. Defaults to [["Environment", "Endpoint"]].
        extra_fields: Additional log-only fields (request_id, filename, etc.).
    """
    if dimensions is None:
        dimensions = [["Environment", "Endpoint"]]

    payload = {
        "_aws": {
            "Timestamp": int(time.time() * 1000),
            "CloudWatchMetrics": [
                {
                    "Namespace": EMF_NAMESPACE,
                    "Dimensions": dimensions,
                    "Metrics": metrics,
                }
            ],
        },
        "Environment": _resolve_environment(),
        "Endpoint": DEFAULT_ENDPOINT,
        "event_name": event_name,
    }

    payload.update(metric_values)

    if extra_fields:
        payload.update(extra_fields)

    return payload


def emit_emf_event(payload: dict) -> None:
    """Emit an EMF payload as a single JSON line to stdout via logging."""
    logger.info(json.dumps(payload, default=str))


# -- Event builders ----------------------------------------------------------


def build_analysis_requested(
    code_length_chars: int,
    estimated_input_tokens: int,
    extra_fields: dict | None = None,
) -> dict:
    """Build an analysis_requested EMF payload."""
    return _build_emf_payload(
        event_name="analysis_requested",
        metrics=[
            {"Name": "CodeLengthChars", "Unit": "Count"},
            {"Name": "EstimatedInputTokens", "Unit": "Count"},
        ],
        metric_values={
            "CodeLengthChars": code_length_chars,
            "EstimatedInputTokens": estimated_input_tokens,
        },
        extra_fields=extra_fields,
    )


def build_analysis_started(
    total_prompt_tokens: int,
    cache_hit: int,
    extra_fields: dict | None = None,
) -> dict:
    """Build an analysis_started EMF payload."""
    return _build_emf_payload(
        event_name="analysis_started",
        metrics=[
            {"Name": "TotalPromptTokens", "Unit": "Count"},
            {"Name": "CacheHit", "Unit": "Count"},
        ],
        metric_values={
            "TotalPromptTokens": total_prompt_tokens,
            "CacheHit": cache_hit,
        },
        extra_fields=extra_fields,
    )


def build_analysis_completed(
    total_latency_ms: float,
    input_tokens: int,
    output_tokens: int,
    estimated_cost_usd: float,
    responsibility_block_count: int,
    extra_fields: dict | None = None,
) -> dict:
    """Build an analysis_completed EMF payload."""
    return _build_emf_payload(
        event_name="analysis_completed",
        metrics=[
            {"Name": "TotalLatencyMs", "Unit": "Milliseconds"},
            {"Name": "InputTokens", "Unit": "Count"},
            {"Name": "OutputTokens", "Unit": "Count"},
            {"Name": "EstimatedCostUsd", "Unit": "None"},
            {"Name": "ResponsibilityBlockCount", "Unit": "Count"},
        ],
        metric_values={
            "TotalLatencyMs": total_latency_ms,
            "InputTokens": input_tokens,
            "OutputTokens": output_tokens,
            "EstimatedCostUsd": estimated_cost_usd,
            "ResponsibilityBlockCount": responsibility_block_count,
        },
        extra_fields=extra_fields,
    )


def build_analysis_failed(
    error_type: str,
    latency_until_failure_ms: float,
    extra_fields: dict | None = None,
) -> dict:
    """Build an analysis_failed EMF payload with ErrorType dimension."""
    payload = _build_emf_payload(
        event_name="analysis_failed",
        metrics=[
            {"Name": "FailureCount", "Unit": "Count"},
            {"Name": "LatencyUntilFailureMs", "Unit": "Milliseconds"},
        ],
        metric_values={
            "FailureCount": 1,
            "LatencyUntilFailureMs": latency_until_failure_ms,
        },
        dimensions=[["Environment", "Endpoint", "ErrorType"]],
        extra_fields=extra_fields,
    )
    payload["ErrorType"] = error_type
    return payload
