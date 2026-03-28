# Breakdown Review — 2026-03-28 — Python

Issue: #7
Date: 2026-03-28
Language: Python
Status: PENDING_APPROVAL

## Repo 1 — TauricResearch/TradingAgents

- file_path: tradingagents/agents/utils/memory.py
- snippet_url: https://github.com/TauricResearch/TradingAgents/blob/main/tradingagents/agents/utils/memory.py

file_intent: BM25 agent memory retrieval
breakdown_what: Retrieves the top-N past trading situations most semantically similar to the current market context by tokenizing the query, scoring all stored documents with BM25, then normalizing scores against the session maximum to return ranked situation-recommendation pairs.
breakdown_responsibility: Acts as long-term memory for all LLM trading agents — each specialized analyst agent calls this to surface relevant historical experiences before forming an opinion on current conditions, giving agent recommendations continuity across trading sessions.
breakdown_clever: The outer guard sets `max_score = 1` when all BM25 scores are zero, making `max_score` always positive — so the subsequent `if max_score > 0 else 0` branch inside the normalization loop is unreachable dead code; zero-scored memories still return with `similarity_score: 0.0`, not get filtered out.
project_context: TradingAgents simulates a full trading firm with LLM-powered analysts, a trader, and a risk manager that collaborate autonomously to analyze markets and make decisions — backed by a published arXiv paper and achieving up to 30.5% annualized returns in backtesting.

### Reformatted Snippet

```python
def get_memories(
    self,
    current_situation: str,
    n_matches: int = 1,
) -> List[dict]:
    if not self.documents or self.bm25 is None:
        return []

    query_tokens = self._tokenize(current_situation)
    scores = self.bm25.get_scores(query_tokens)

    top_indices = sorted(
        range(len(scores)),
        key=lambda i: scores[i],
        reverse=True,
    )[:n_matches]

    results = []
    max_score = (
        max(scores) if max(scores) > 0 else 1
    )

    for idx in top_indices:
        norm = (
            scores[idx] / max_score
            if max_score > 0
            else 0
        )
        results.append({
            "matched_situation": self.documents[idx],
            "recommendation": (
                self.recommendations[idx]
            ),
            "similarity_score": norm,
        })

    return results
```

## Repo 2 — 666ghj/MiroFish

- file_path: backend/app/utils/retry.py
- snippet_url: https://github.com/666ghj/MiroFish/blob/main/backend/app/utils/retry.py

file_intent: Fault-tolerant batch processor
breakdown_what: Iterates a list of items, delegating each to a retry-capable inner function, accumulating successful results and failed items (with index, value, and error string) separately — halting the entire batch early if `continue_on_failure` is False.
breakdown_responsibility: Provides the resilience layer for all batch LLM and external API calls in MiroFish's simulation pipeline — since simulations spawn thousands of agents concurrently, individual item failures are isolated and logged without aborting the entire batch run by default.
breakdown_clever: When `continue_on_failure=False`, the function appends the failing item to `failures` before re-raising — but the caller never receives the partial `results` list since execution never reaches the `return` statement, making the tracked failure log silently inaccessible via normal exception handling.
project_context: MiroFish is a swarm intelligence prediction engine that seeds a digital sandbox with thousands of AI agents, injects real-world events, and simulates emergent collective behavior to forecast future outcomes — used for market prediction and policy impact modeling.

### Reformatted Snippet

```python
def call_batch_with_retry(
    self,
    items: list,
    process_func: Callable,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
    continue_on_failure: bool = True
) -> Tuple[list, list]:
    results = []
    failures = []

    for idx, item in enumerate(items):
        try:
            result = self.call_with_retry(
                process_func,
                item,
                exceptions=exceptions
            )
            results.append(result)

        except Exception as e:
            logger.error(
                f"处理第 {idx + 1} 项失败: {str(e)}"
            )
            failures.append({
                "index": idx,
                "item": item,
                "error": str(e)
            })

            if not continue_on_failure:
                raise

    return results, failures
```
