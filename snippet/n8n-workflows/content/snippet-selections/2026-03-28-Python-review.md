# Breakdown Review — 2026-03-28 — Python

Issue: #7
Date: 2026-03-28
Language: Python
Status: PENDING_APPROVAL

## Repo 1 — TauricResearch/TradingAgents

- file_path: tradingagents/agents/utils/memory.py
- snippet_url: https://github.com/TauricResearch/TradingAgents/blob/main/tradingagents/agents/utils/memory.py

file_intent: BM25 trading memory retriever
breakdown_what: Retrieves the top-N past trading situations most similar to the current one using BM25 keyword scoring, normalizes each relevance score against the best match, and returns matched situations alongside their associated recommendations.
breakdown_responsibility: Gives trading agents episodic memory — instead of reasoning from scratch, an analyst agent can recall what worked or failed in a prior market situation before committing to a recommendation.
breakdown_clever: The fallback `max_score = 1` when all scores are zero avoids division-by-zero but silently returns results with `similarity_score: 0`. A caller filtering on a score threshold would correctly discard all of them — making zero-relevance queries degrade gracefully rather than crash.
project_context: An academically-backed framework where LLM agents role-play as analysts, traders, and risk managers to make collaborative investment decisions; used primarily in research and algo-trading experimentation, with backtests reporting up to 30.5% annualized returns against traditional strategies.

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

file_intent: Fault-tolerant batch retry executor
breakdown_what: Iterates a list of items, running each through a per-item retry wrapper, and segregates the results into two separate lists — successes and structured failure records — so the caller can inspect exactly which items failed and why.
breakdown_responsibility: Provides the fault-tolerance layer for MiroFish's LLM batch calls: when the simulation spawns thousands of agents, transient API failures on individual items don't abort the entire swarm run.
breakdown_clever: `continue_on_failure=True` means the outer `except Exception` catches failures that survived all retries, not first-attempt failures — the failure log records what happened but gives no indication of how many retries were exhausted before the item gave up.
project_context: An open-source swarm simulation engine where you seed a real-world event and thousands of personality-distinct AI agents debate and evolve to surface likely outcomes; community forks have added offline (Neo4j + Ollama) and English-UI variants.

### Reformatted Snippet

```python
def call_batch_with_retry(
    self,
    items: list,
    process_func: Callable,
    exceptions: Tuple[Type[Exception], ...] = (
        Exception,
    ),
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
