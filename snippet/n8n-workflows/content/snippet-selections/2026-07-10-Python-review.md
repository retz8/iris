# Breakdown Review — 2026-07-10 — Python

Issue: #22
Date: 2026-07-10
Language: Python
Status: COMPLETED

## Repo 1 — bradautomates/claude-video

- file_path: skills/watch/scripts/whisper.py
- snippet_url: https://github.com/bradautomates/claude-video/blob/main/skills/watch/scripts/whisper.py

file_intent: Audio upload chunk planner
breakdown_what: Splits a large audio file into time-range segments that each fit within the Whisper API's upload byte limit, returning a list of (offset, duration) tuples ready for sequential API calls.
breakdown_responsibility: Acts as the gating step before audio is sent to Whisper — it determines how many calls are needed and at what timestamps to slice, so the caller can iterate the plan without knowing the API size constraints.
breakdown_clever: The last chunk's duration is computed as `total_seconds - offset` rather than the fixed chunk size, absorbing any floating-point rounding drift so the plan always covers exactly the full audio without gaps or overlap.
project_context: claude-video is a Claude Code skill that gives AI agents the ability to watch any video — it downloads the file, extracts frames, and transcribes audio so Claude can answer questions grounded in what's actually on screen.

### Reformatted Snippet

```python
def plan_chunks(
    total_seconds: float,
    total_bytes: int,
    max_bytes: int = MAX_UPLOAD_BYTES,
) -> list[tuple[float, float]]:
    if total_bytes <= max_bytes or total_seconds <= 0:
        return [(0.0, total_seconds)]

    n = math.ceil(total_bytes / max_bytes)
    chunk = total_seconds / n
    plan: list[tuple[float, float]] = []
    for i in range(n):
        offset = i * chunk
        duration = (
            (total_seconds - offset)
            if i == n - 1
            else chunk
        )
        plan.append((round(offset, 3), round(duration, 3)))
    return plan
```

## Repo 2 — xbtlin/ai-berkshire

- file_path: tools/ashare_data.py
- snippet_url: https://github.com/xbtlin/ai-berkshire/blob/main/tools/ashare_data.py

file_intent: Chinese financial number formatter
breakdown_what: Converts a raw financial value into a human-readable Chinese unit string — displaying values over 100 million as 亿 and over 10,000 as 万 — handling None, empty strings, and non-numeric inputs gracefully.
breakdown_responsibility: Formats A-share market data for display in the multi-agent investment reports, translating raw API numbers into the Chinese financial units — 亿 and 万 — that fund managers and analysts in China actually read.
breakdown_clever: Passing unconvertible inputs to `str(value)` rather than raising means already-formatted strings from upstream APIs — like 'N/A' or 'pending' — pass through unchanged, so this formatter is safe to insert anywhere in the data pipeline.
project_context: ai-berkshire is a multi-agent value investing research framework modeled on Buffett, Munger, and Graham methodologies, built on Claude Code — multiple agents research a company in parallel and produce adversarial investment analyses.

### Reformatted Snippet

```python
def _fmt_yi(value) -> str:
    if value is None or value == "-" or value == "":
        return "-"
    try:
        v = float(value)
    except (ValueError, TypeError):
        return str(value)
    if abs(v) >= 1e8:
        return f"{v / 1e8:.2f}亿"
    if abs(v) >= 1e4:
        return f"{v / 1e4:.2f}万"
    return f"{v:.2f}"
```
