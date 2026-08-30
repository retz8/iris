# Snippet Candidates — 2026-08-28 — Python

Issue: #28
Date: 2026-08-28
Language: Python
Status: COMPLETED

## Repo 1 — jundot/omlx

### Candidate 1 (most important)

- file_path: omlx/speculative/processing_sampler.py
- snippet_url: https://github.com/jundot/omlx/blob/main/omlx/speculative/processing_sampler.py
- reasoning: `sample_target` solves a subtle correctness problem at the heart of this LLM server — stateful logits processors must have their internal state checkpointed at each draft-token boundary and restored before verifying speculative tokens, otherwise constraints silently break; the graceful degradation path shows production-grade defensive design.

```python
def sample_target(
    self,
    logprobs: Any,
    row_ids: Sequence[int] | None = None,
    positions: Sequence[int] | None = None,
) -> Any:
    """Process-then-sample every candidate slot of a verify walk."""
    if self._degraded or not self._processors:
        return self._base(logprobs)
    if not positions:
        self._degrade("sample_target called without positions")
        return self._base(logprobs)

    if logprobs.ndim == 1:
        logprobs = logprobs[None, :]
    n_slots = int(logprobs.shape[0])
    if n_slots != len(positions):
        self._degrade(
            f"row/position mismatch (rows={n_slots}, "
            f"positions={len(positions)})"
        )
        return self._base(logprobs)

    base_pos = int(positions[0])
    snapshot = self._snapshots.get(base_pos)
    if snapshot is None:
        self._degrade(
            f"no checkpoint for base position {base_pos}"
        )
        return self._base(logprobs)

    self._restore(snapshot)
    del self._history[self._prompt_len + base_pos :]
    for key in [k for k in self._snapshots if k > base_pos]:
        del self._snapshots[key]

    mx.eval(logprobs)
    sampled: list[int] = []
    for i in range(n_slots):
        pos = int(positions[i])
        if pos != base_pos + i:
            self._degrade(
                f"non-contiguous positions ({positions!r})"
            )
            rest = self._base(logprobs[i:])
            rest_list = [
                int(t)
                for t in mx.reshape(rest, (-1,)).tolist()
            ]
            return mx.array(
                sampled + rest_list, dtype=mx.int32
            )
        processed = logprobs[i][None, :]
        for proc in self._processors:
            processed = proc(self._history, processed)
        token_arr = self._base(processed)
        token = int(
            mx.reshape(token_arr, (-1,))[0].item()
        )
        sampled.append(token)
        self._history.append(token)
        self._snapshots[pos + 1] = self._snap()
    return mx.array(sampled, dtype=mx.int32)
```

### Candidate 2

- file_path: omlx/prefill_transient_tracker.py
- snippet_url: https://github.com/jundot/omlx/blob/main/omlx/prefill_transient_tracker.py
- reasoning: This class solves a hard memory-safety problem in LLM serving — prefill creates a transient memory spike that disappears after compilation, so you must predict it before it happens; the EWMA with an 8x outlier-ratio guard and a separate floor-sample observed-max path shows the layered estimation strategy needed to avoid false OOMs while still catching real peaks.

```python
class PrefillTransientTracker:
    """EWMA estimator of MLX prefill chunk transient bytes per token."""

    _EWMA_ALPHA = 0.3
    _OBSERVED_MAX_CLAMP_BYTES = 4 * 1024**3
    _EWMA_OUTLIER_RATIO = 8.0

    def __init__(self, model_id: str = "") -> None:
        self._model_id = model_id
        self._ewma_per_token: float = 0.0
        self._samples: int = 0
        self._last_delta_bytes: int = 0
        self._last_n_tokens: int = 0
        self._observed_max_bytes: int = 0
        self._recent_reclaim_bytes: int = 0

    def update(
        self,
        n_tokens: int,
        transient_bytes: int,
        *,
        floor_sample: bool = False,
    ) -> None:
        if n_tokens <= 0 or transient_bytes <= 0:
            return
        self._recent_reclaim_bytes = 0
        if floor_sample and self._samples > 0:
            if transient_bytes <= self._OBSERVED_MAX_CLAMP_BYTES:
                if transient_bytes > self._observed_max_bytes:
                    self._observed_max_bytes = transient_bytes
            else:
                logger.debug(
                    "PrefillTransientTracker(%s): rejected "
                    "%d-byte outlier from observed max (clamp %d)",
                    self._model_id,
                    transient_bytes,
                    self._OBSERVED_MAX_CLAMP_BYTES,
                )
        per_token = transient_bytes / n_tokens
        if self._samples == 0:
            self._ewma_per_token = per_token
        elif per_token > (
            self._ewma_per_token * self._EWMA_OUTLIER_RATIO
        ):
            logger.debug(
                "PrefillTransientTracker(%s): rejected "
                "%.1f-byte/token outlier (current %.1f, "
                "ratio limit %.1fx)",
                self._model_id,
                per_token,
                self._ewma_per_token,
                self._EWMA_OUTLIER_RATIO,
            )
        else:
            self._ewma_per_token = (
                self._EWMA_ALPHA * per_token
                + (1.0 - self._EWMA_ALPHA)
                * self._ewma_per_token
            )
        self._samples += 1
        self._last_delta_bytes = transient_bytes
        self._last_n_tokens = n_tokens

    def predict(
        self, n_tokens: int, *, safety_factor: float = 1.2
    ) -> int:
        if self._samples == 0 or n_tokens <= 0:
            return 0
        return int(
            self._ewma_per_token * n_tokens * safety_factor
        )
```

### Candidate 3 (least important)

- file_path: omlx/output_collector.py
- snippet_url: https://github.com/jundot/omlx/blob/main/omlx/output_collector.py
- reasoning: `RequestOutputCollector` demonstrates a clean asyncio backpressure pattern — the class-level `_waiting_consumers` counter lets the engine skip `await` yields when no consumer is blocked, and the `get_nowait() or await get()` idiom cuts one task-switch per token under low load, while output merging silently coalesces tokens when the producer outruns the consumer.

```python
class RequestOutputCollector:
    _waiting_consumers: int = 0

    def __init__(self, aggregate: bool = True):
        self.output: Optional[RequestOutput] = None
        self.ready = asyncio.Event()
        self.aggregate = aggregate
        self._is_waiting = False

    def put(self, output: RequestOutput) -> None:
        if self.output is None:
            self.output = output
        elif self.aggregate:
            self.output = self._merge_outputs(
                self.output, output
            )
        else:
            self.output = output
        self.ready.set()

    def get_nowait(self) -> Optional[RequestOutput]:
        output = self.output
        if output is not None:
            self.output = None
            self.ready.clear()
        return output

    async def get(self) -> RequestOutput:
        if not self._is_waiting:
            self._is_waiting = True
            RequestOutputCollector._waiting_consumers += 1
        try:
            while self.output is None:
                await self.ready.wait()
            output = self.get_nowait()
            assert output is not None
            return output
        finally:
            if self._is_waiting:
                self._is_waiting = False
                RequestOutputCollector._waiting_consumers -= 1

    @classmethod
    def has_waiting_consumers(cls) -> bool:
        return cls._waiting_consumers > 0
```

## Repo 2 — shy3130/tick-stock-panel

### Candidate 1 (most important)

- file_path: backend/app/services/market_phase.py
- snippet_url: https://github.com/shy3130/tick-stock-panel/blob/main/backend/app/services/market_phase.py
- reasoning: This is the final aggregation step of the limit-up ladder model — the repo's most distinctive feature — computing promotion rate (what fraction of yesterday's consecutive limit-up stocks continued their streak today) and ladder completeness (what fraction of rungs between 2 and the peak height are occupied), which together drive the 6-phase market emotion cycle.

```python
def finalize_ladder_row(r: dict) -> dict:
    """把聚合行的梯队原始值整理为持久化字段(晋级率/ladder_completeness)。"""
    height = int(r.get("max_consecutive") or 0)
    rungs = int(r.get("rungs_filled") or 0)
    completeness = (rungs / (height - 1)) if height >= 3 else 0.0
    pool = int(r.get("promo_pool") or 0)
    ok = int(r.get("promo_ok") or 0)
    promo = (ok / pool) if pool >= PROMO_MIN_POOL else None
    return {
        "first_board": int(r.get("first_board") or 0),
        "ge2_count": int(r.get("ge2_count") or 0),
        "ge3_count": int(r.get("ge3_count") or 0),
        "ge5_count": int(r.get("ge5_count") or 0),
        "ladder_completeness": round(completeness, 4),
        "promo_pool": pool,
        "promo_rate": round(promo, 4) if promo is not None else None,
    }
```

### Candidate 2

- file_path: backend/app/services/regime_builder.py
- snippet_url: https://github.com/shy3130/tick-stock-panel/blob/main/backend/app/services/regime_builder.py
- reasoning: This utility encodes the entire Hive-partitioned Parquet storage convention used throughout the backend — scanning `date=YYYY-MM-DD/part.parquet` directory trees to discover available dates without loading any data — and shows why the codebase can answer "which trading days do we have?" in microseconds even across 1,400+ partitions.

```python
def enriched_date_set(repo) -> set[date]:
    """扫描 kline_daily_enriched 分区目录, 返回所有已有日期集合。"""
    enriched_dir = repo.store.data_dir / "kline_daily_enriched"
    dates: set[date] = set()
    if not enriched_dir.exists():
        return dates
    for part in enriched_dir.glob("date=*/part.parquet"):
        try:
            ds = part.parent.name.replace("date=", "")
            dates.add(date.fromisoformat(ds))
        except ValueError:
            continue
    return dates
```

### Candidate 3 (least important)

- file_path: backend/app/services/auth.py
- snippet_url: https://github.com/shy3130/tick-stock-panel/blob/main/backend/app/services/auth.py
- reasoning: This single-user session validator demonstrates a compact pattern for combining an in-memory thread-safe token store with lazy expiry cleanup — expired tokens are evicted on the first failed check rather than via a background sweep, keeping the implementation dependency-free while remaining correct under concurrent FastAPI async handlers.

```python
def is_valid_session(token: str) -> bool:
    """检查会话是否有效(存在且未过期)。过期则清理。"""
    if not token:
        return False
    with _lock:
        expire = _sessions.get(token)
        if expire is None:
            return False
        if time.time() > expire:
            _sessions.pop(token, None)
            _persist_sessions_locked()
            return False
        return True
```
