# Snippet Candidates — 2026-07-10 — Python

Issue: #22
Date: 2026-07-10
Language: Python
Status: COMPLETED

## Repo 1 — bradautomates/claude-video

### Candidate 1 (most important)

- file_path: skills/watch/scripts/transcribe.py
- snippet_url: https://github.com/bradautomates/claude-video/blob/main/skills/watch/scripts/transcribe.py
- reasoning: This function is the core of the subtitle pipeline — it silently fixes a real quirk of YouTube auto-generated captions where each spoken phrase appears 2–3 times in rolling succession, using a two-pass rule that both collapses exact duplicates and merges incremental extensions of the previous cue.

```python
def _dedupe(segments: list[dict]) -> list[dict]:
    """Collapse rolling duplicates common in YouTube auto-subs."""
    out: list[dict] = []
    for seg in segments:
        if out and seg["text"] == out[-1]["text"]:
            out[-1]["end"] = seg["end"]
            continue
        if out and seg["text"].startswith(out[-1]["text"] + " "):
            out[-1]["text"] = seg["text"]
            out[-1]["end"] = seg["end"]
            continue
        out.append(seg)
    return out
```

### Candidate 2

- file_path: skills/watch/scripts/whisper.py
- snippet_url: https://github.com/bradautomates/claude-video/blob/main/skills/watch/scripts/whisper.py
- reasoning: This function exploits the fact that constant-bitrate mono MP3 encodes size proportionally to duration, letting it compute an even time-split that guarantees every chunk stays under the Whisper API's 25 MB upload limit while making the last chunk absorb floating-point rounding remainder.

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
            (total_seconds - offset) if i == n - 1 else chunk
        )
        plan.append((round(offset, 3), round(duration, 3)))
    return plan
```

### Candidate 3 (least important)

- file_path: skills/watch/scripts/frames.py
- snippet_url: https://github.com/bradautomates/claude-video/blob/main/skills/watch/scripts/frames.py
- reasoning: This one-liner drives the entire perceptual deduplication pass — it computes mean absolute per-pixel difference between two raw grayscale thumbnails stored as plain bytes, returning infinity on length mismatch so a decode hiccup never silently collapses two visually distinct frames.

```python
def _frame_delta(a: bytes, b: bytes) -> float:
    if not a or len(a) != len(b):
        return float("inf")
    return sum(abs(x - y) for x, y in zip(a, b)) / len(a)
```

## Repo 2 — xbtlin/ai-berkshire

### Candidate 1 (most important)

- file_path: tools/momentum_backtest_v2.py
- snippet_url: https://github.com/xbtlin/ai-berkshire/blob/main/tools/momentum_backtest_v2.py
- reasoning: This function is the repo's core investment filter — it scores a stock across 5 fundamental dimensions (revenue acceleration, margin expansion, earnings surprise, growth rate, absolute margin health) using sequential quarter comparison, and its output score is what gates every buy signal the system emits.

```python
def verify(fund, prev_fund):
    if not fund:
        return 0, {}
    d = fund[1]
    pd = prev_fund[1] if prev_fund else None

    checks = {}
    # 1.营收加速（同比增速改善）
    if pd:
        checks["营收加速"] = d["rev_yoy"] > pd["rev_yoy"]
    else:
        checks["营收加速"] = d["rev_yoy"] > 20

    # 2.毛利率方向
    if pd:
        checks["毛利率↑"] = d["gm"] > pd["gm"] or d["gm"] > 50
    else:
        checks["毛利率↑"] = d["gm"] > 40

    # 3.EPS超预期>10%
    checks["盈利惊喜"] = d["eps_beat"] > 10

    # 4.营收高增>15%
    checks["营收高增"] = d["rev_yoy"] > 15

    # 5.毛利率>40%
    checks["毛利健康"] = d["gm"] > 40

    score = sum(1 for v in checks.values() if v)
    return score, checks
```

### Candidate 2

- file_path: tools/stock_screener.py
- snippet_url: https://github.com/xbtlin/ai-berkshire/blob/main/tools/stock_screener.py
- reasoning: The production evolution of the scoring algorithm — it extends the 5-dimension check to 6, adds a third comparison quarter, and introduces two hard-coded independent-pass bypass conditions that encode specific historical edge cases (NVDA Jan-2023 margin inflection, cyclical EPS spikes), showing how expert judgement gets embedded as code.

```python
def check_value(ticker, signal_date=None):
    """6维价值验证"""
    funds = load_fundamentals()
    if ticker not in funds or not funds[ticker].get("quarters"):
        return None

    quarters = funds[ticker]["quarters"]
    sorted_q = sorted(quarters.items(), key=lambda x: x[0])

    # 找最近两个季度
    if signal_date:
        valid = [(d, q) for d, q in sorted_q if d <= signal_date]
    else:
        valid = sorted_q

    if not valid:
        return None

    latest = valid[-1]
    prev = valid[-2] if len(valid) >= 2 else None
    prev2 = valid[-3] if len(valid) >= 3 else None

    d = latest[1]
    pd = prev[1] if prev else None
    pd2 = prev2[1] if prev2 else None

    checks = {}

    # 1. 营收加速（同比增速在改善）
    if pd:
        checks["营收加速"] = d["rev_yoy"] > pd["rev_yoy"]
    else:
        checks["营收加速"] = d["rev_yoy"] > 20

    # 2. 毛利率方向
    if pd:
        checks["毛利率扩张"] = d["gm"] > pd["gm"] or d["gm"] > 55
    else:
        checks["毛利率扩张"] = d["gm"] > 45

    # 3. EPS超预期 > 10%
    checks["盈利惊喜"] = d["eps_beat"] > 10

    # 4. 营收高增长 > 15%
    checks["营收高增长"] = d["rev_yoy"] > 15

    # 5. 毛利率健康 > 40%
    checks["毛利率健康"] = d["gm"] > 40

    # 6. ★改进：毛利率连续2季改善（解决NVDA 2023-01漏判）
    if pd and pd2:
        checks["毛利连续改善"] = d["gm"] > pd["gm"] > pd2["gm"]
    elif pd:
        checks["毛利连续改善"] = d["gm"] > pd["gm"]
    else:
        checks["毛利连续改善"] = False

    score = sum(1 for v in checks.values() if v)

    # ★改进：独立通过条件
    independent_pass = False
    independent_reason = ""

    # 条件A：毛利率连续2季改善 + 毛利>45%（NVDA 2023-01场景）
    if checks.get("毛利连续改善") and d["gm"] > 45:
        independent_pass = True
        independent_reason = "毛利率连续改善+>45%"

    # 条件B：EPS超预期>30%（MU底部场景）
    if d["eps_beat"] > 30:
        independent_pass = True
        independent_reason = "EPS超预期>30%（周期股信号）"

    return {
        "score": score,
        "max": 6,
        "checks": checks,
        "fund": d,
        "fund_date": latest[0],
        "fund_label": d.get("label", ""),
        "independent_pass": independent_pass,
        "independent_reason": independent_reason,
    }
```

### Candidate 3 (least important)

- file_path: tools/ashare_data.py
- snippet_url: https://github.com/xbtlin/ai-berkshire/blob/main/tools/ashare_data.py
- reasoning: A small but necessary locale adaptation — it converts raw floats to Chinese financial shorthand (万 = 10,000; 亿 = 100,000,000) used throughout the A-share display layer, illustrating the market-specific numeric conventions the toolchain must accommodate to operate on Chinese equity data.

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
