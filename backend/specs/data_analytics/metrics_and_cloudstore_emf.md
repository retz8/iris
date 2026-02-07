# IRIS Analytics Metrics & CloudWatch EMF Mapping (v0)

This document defines how **IRIS Analytics Event Schema v0** is mapped to **AWS CloudWatch Embedded Metrics Format (EMF)**.

The goal is to make IRIS backend behavior **observable, measurable, and cost-aware** from day one, while remaining fully extensible to future analytics systems.

---

## 1. Design Goals

* Zero additional infrastructure (CloudWatch-native)
* Near-zero cost
* Event-first, metric-second
* Tool-agnostic JSON schema
* Safe defaults for cardinality and scale

---

## 2. Core Principle

> Every IRIS backend action is recorded as a **structured event**.
> Some numeric fields inside those events are **promoted to metrics** using CloudWatch Embedded Metrics.

Logs remain the source of truth.
Metrics are derived views.

---

## 3. CloudWatch Embedded Metrics Basics

CloudWatch EMF works by emitting logs that contain a special `_aws` object.

If present, CloudWatch automatically extracts metrics without explicit API calls.

Minimal required structure:

```json
{
  "_aws": { ... }
}
```

---

## 4. Global EMF Configuration

All IRIS analysis metrics share the following configuration:

* **Namespace**: `IRIS/Analysis`
* **Default Dimensions**:

  * `Environment` (e.g. `dev`, `prod`)
  * `Endpoint` (e.g. `/analyze`)

High-cardinality values (request IDs, filenames, raw text) are **never used as dimensions**.

---

## 5. Event-to-Metric Mapping

### 5.1 `analysis_requested`

**Purpose**: Observe input size and request characteristics.

**Metrics**:

* `CodeLengthChars` (Count)
* `EstimatedInputTokens` (Count)

```json
{
  "_aws": {
    "Timestamp": 1736200000000,
    "CloudWatchMetrics": [
      {
        "Namespace": "IRIS/Analysis",
        "Dimensions": [["Environment", "Endpoint"]],
        "Metrics": [
          { "Name": "CodeLengthChars", "Unit": "Count" },
          { "Name": "EstimatedInputTokens", "Unit": "Count" }
        ]
      }
    ]
  },

  "Environment": "prod",
  "Endpoint": "/analyze",

  "CodeLengthChars": 12345,
  "EstimatedInputTokens": 15000,

  "event_name": "analysis_requested"
}
```

---

### 5.2 `analysis_started`

**Purpose**: Track prompt size and cache behavior before LLM execution.

**Metrics**:

* `TotalPromptTokens` (Count)
* `CacheHit` (Count, 0 or 1)

```json
{
  "_aws": {
    "Timestamp": 1736200001000,
    "CloudWatchMetrics": [
      {
        "Namespace": "IRIS/Analysis",
        "Dimensions": [["Environment", "Endpoint"]],
        "Metrics": [
          { "Name": "TotalPromptTokens", "Unit": "Count" },
          { "Name": "CacheHit", "Unit": "Count" }
        ]
      }
    ]
  },

  "Environment": "prod",
  "Endpoint": "/analyze",

  "TotalPromptTokens": 16000,
  "CacheHit": 0,

  "event_name": "analysis_started",
  "model": "gpt-5-nano-2025-08-07"
}
```

---

### 5.3 `analysis_completed`

**Purpose**: Core success metrics for performance, cost, and abstraction quality.

**Metrics**:

* `TotalLatencyMs` (Milliseconds)
* `InputTokens` (Count)
* `OutputTokens` (Count)
* `EstimatedCostUsd` (None)
* `ResponsibilityBlockCount` (Count)

```json
{
  "_aws": {
    "Timestamp": 1736200004000,
    "CloudWatchMetrics": [
      {
        "Namespace": "IRIS/Analysis",
        "Dimensions": [["Environment", "Endpoint"]],
        "Metrics": [
          { "Name": "TotalLatencyMs", "Unit": "Milliseconds" },
          { "Name": "InputTokens", "Unit": "Count" },
          { "Name": "OutputTokens", "Unit": "Count" },
          { "Name": "EstimatedCostUsd", "Unit": "None" },
          { "Name": "ResponsibilityBlockCount", "Unit": "Count" }
        ]
      }
    ]
  },

  "Environment": "prod",
  "Endpoint": "/analyze",

  "TotalLatencyMs": 3120,
  "InputTokens": 15234,
  "OutputTokens": 487,
  "EstimatedCostUsd": 0.00102,
  "ResponsibilityBlockCount": 6,

  "event_name": "analysis_completed"
}
```

---

### 5.4 `analysis_failed`

**Purpose**: Track failures and partial execution behavior.

**Metrics**:

* `FailureCount` (Count, always 1)
* `LatencyUntilFailureMs` (Milliseconds)

**Additional Dimension**:

* `ErrorType`

```json
{
  "_aws": {
    "Timestamp": 1736200003000,
    "CloudWatchMetrics": [
      {
        "Namespace": "IRIS/Analysis",
        "Dimensions": [["Environment", "Endpoint", "ErrorType"]],
        "Metrics": [
          { "Name": "FailureCount", "Unit": "Count" },
          { "Name": "LatencyUntilFailureMs", "Unit": "Milliseconds" }
        ]
      }
    ]
  },

  "Environment": "prod",
  "Endpoint": "/analyze",
  "ErrorType": "TimeoutError",

  "FailureCount": 1,
  "LatencyUntilFailureMs": 1800,

  "event_name": "analysis_failed"
}
```

---

## 6. Cardinality & Cost Safety Rules

* Do NOT use the following as metric dimensions:

  * request IDs
  * filenames
  * raw code text
  * free-form strings

These values must remain log-only fields.

---

## 7. Future Compatibility

This schema is directly compatible with:

* CloudWatch Logs Insights
* Kinesis Firehose → S3
* Athena / Spark
* PostHog event ingestion
* OpenTelemetry spans (event → span mapping)

No changes to the event schema are required.

---

## 8. Summary

By adopting CloudWatch Embedded Metrics with this schema, IRIS gains:

* Per-request cost visibility
* Latency and performance monitoring
* Cache effectiveness tracking
* Abstraction quality signals
* A production-grade analytics foundation

This turns the IRIS backend from a black box into an observable, scalable system.
