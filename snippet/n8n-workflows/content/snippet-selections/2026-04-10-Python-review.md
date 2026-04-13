# Breakdown Review — 2026-04-10 — Python

Issue: #9
Date: 2026-04-10
Language: Python
Status: COMPLETED

## Repo 1 — NousResearch/hermes-agent

- file_path: agent/retry_utils.py
- snippet_url: https://github.com/NousResearch/hermes-agent/blob/main/agent/retry_utils.py

file_intent: Jittered exponential backoff calculator
breakdown_what: Computes a per-attempt retry delay by applying binary exponential backoff capped at max_delay, then appends bounded random jitter using an RNG seeded from nanosecond time XOR'd with a monotonic global counter.
breakdown_responsibility: Provides the delay schedule for hermes-agent's retry loop, ensuring concurrent task attempts fan out over time rather than thundering-herd back to the same endpoint when multiple agent operations fail simultaneously.
breakdown_clever: The seed mixes time.time_ns() with the counter scaled by 0x9E3779B9 — the golden-ratio multiplicative hash constant from Knuth's multiplicative hashing — ensuring statistically independent jitter even when two threads enter the function within the same nanosecond.
project_context: Hermes Agent is an open-source self-hosted framework that runs autonomously on your server, executing multi-step tasks across Telegram, Slack, Discord, and a dozen other platforms while maintaining persistent memory and a self-improving skill library.

### Reformatted Snippet

```python
_jitter_counter = 0
_jitter_lock = threading.Lock()


def jittered_backoff(
    attempt: int,
    *,
    base_delay: float = 5.0,
    max_delay: float = 120.0,
    jitter_ratio: float = 0.5,
) -> float:
    global _jitter_counter
    with _jitter_lock:
        _jitter_counter += 1
        tick = _jitter_counter

    exponent = max(0, attempt - 1)
    if exponent >= 63 or base_delay <= 0:
        delay = max_delay
    else:
        delay = min(
            base_delay * (2 ** exponent), max_delay
        )

    seed = (
        (time.time_ns() ^ (tick * 0x9E3779B9))
        & 0xFFFFFFFF
    )
    rng = random.Random(seed)
    jitter = rng.uniform(0, jitter_ratio * delay)

    return delay + jitter
```

## Repo 2 — punitarani/fli

- file_path: fli/search/flights.py
- snippet_url: https://github.com/punitarani/fli/blob/main/fli/search/flights.py

file_intent: Multi-leg flight itinerary combinator
breakdown_what: Recursively builds complete multi-leg itineraries by selecting each candidate flight for the current segment, deep-copying the filter state, fetching next-leg options, and assembling all valid cross-leg combinations into flat tuples.
breakdown_responsibility: Handles the combinatorial phase of multi-city and round-trip searches in fli's flight engine, translating Google Flights' sequential leg-selection API into a single flat list of complete itinerary tuples the caller can rank and price.
breakdown_clever: deepcopy(filters) on every loop iteration ensures each recursive branch holds isolated mutable state — without it, writing selected_flight for one candidate would corrupt sibling branches, silently producing itineraries that mix flights from different search paths.
project_context: fli is a Python library and MCP server that reverse-engineers Google Flights' internal API to give developers and AI assistants programmatic, scraping-free access to real-time flight pricing and scheduling data.

### Reformatted Snippet

```python
# For round-trip and multi-city, iteratively select
# each leg and fetch the next leg's options
# with combined pricing.
num_segments = len(filters.flight_segments)
selected_count = sum(
    1
    for s in filters.flight_segments
    if s.selected_flight is not None
)

# If all previous segments are selected,
# we're on the last leg
if selected_count >= num_segments - 1:
    return flights

# Select each flight option and fetch next leg
flight_combos = []
for selected_flight in flights[:top_n]:
    next_filters = deepcopy(filters)
    next_filters.flight_segments[
        selected_count
    ].selected_flight = selected_flight
    next_results = self.search(
        next_filters, top_n=top_n
    )
    if next_results is not None:
        for next_result in next_results:
            if isinstance(next_result, tuple):
                flight_combos.append(
                    (selected_flight,) + next_result
                )
            else:
                flight_combos.append(
                    (selected_flight, next_result)
                )

return flight_combos
```
