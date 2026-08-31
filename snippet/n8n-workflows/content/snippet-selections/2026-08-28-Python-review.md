# Breakdown Review — 2026-08-28 — Python

Issue: #28
Date: 2026-08-28
Language: Python
Status: COMPLETED

## Repo 1 — jundot/omlx

- file_path: omlx/output_collector.py
- snippet_url: https://github.com/jundot/omlx/blob/main/omlx/output_collector.py

file_intent: LLM streaming output collector
breakdown_what: Buffers LLM inference outputs for async consumers in two modes: aggregate merges partial token chunks into a growing result, non-aggregate replaces with each new update. An asyncio Event gates blocking reads without polling.
breakdown_responsibility: Acts as the delivery bridge between omlx's continuous batching scheduler and downstream request handlers. Each inference request owns one collector, letting the scheduler push token chunks without coupling to who is waiting downstream.
breakdown_clever: The class-level `_waiting_consumers` counter is a backpressure signal the scheduler can query via `has_waiting_consumers()` to decide whether to flush partial outputs now or batch more tokens — a subtle throughput dial invisible to individual request consumers.
project_context: omlx is a local LLM inference server for Apple Silicon Macs that manages text, vision, and embedding models from a macOS menu bar app, providing an OpenAI-compatible API with a two-tier KV cache (memory + SSD) for developers running models locally.

### Reformatted Snippet

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

- file_path: backend/app/services/regime_builder.py
- snippet_url: https://github.com/shy3130/tick-stock-panel/blob/main/backend/app/services/regime_builder.py

file_intent: Enriched Parquet date availability scanner
breakdown_what: Scans a Hive-partitioned Parquet directory and returns the set of dates for which enriched daily candlestick data exists on disk, silently skipping malformed partition names rather than raising an exception.
breakdown_responsibility: Guards the backtest and screener engines from querying against dates where the enriched feature set has not yet been computed, preventing silent data-missing runs on this self-hosted TickFlow workbench.
breakdown_clever: The function reads only directory names, never opening a Parquet file, so availability lookup is O(partition count) regardless of data volume. A failed enrichment that left an empty partition directory will still report the date as present.
project_context: tick-stock-panel is a self-hosted quantitative trading workbench for Chinese A-share markets, letting retail investors screen stocks, run backtests, and generate LLM-driven strategies against TickFlow market data without depending on closed commercial terminals.

### Reformatted Snippet

```python
def enriched_date_set(repo) -> set[date]:
    """Scan the kline_daily_enriched partition directory;
    return the set of all available dates."""
    enriched_dir = (
        repo.store.data_dir / "kline_daily_enriched"
    )
    dates: set[date] = set()
    if not enriched_dir.exists():
        return dates
    for part in enriched_dir.glob(
        "date=*/part.parquet"
    ):
        try:
            ds = part.parent.name.replace("date=", "")
            dates.add(date.fromisoformat(ds))
        except ValueError:
            continue
    return dates
```
