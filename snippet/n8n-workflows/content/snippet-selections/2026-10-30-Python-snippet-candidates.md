# Snippet Candidates — 2026-10-30 — Python

Issue: #37
Date: 2026-10-30
Language: Python
Status: COMPLETED

## Repo 1 — sgl-project/sglang

### Candidate 1 (most important)

- file_path: python/sglang/srt/mem_cache/radix_cache.py
- snippet_url: https://github.com/sgl-project/sglang/blob/main/python/sglang/srt/mem_cache/radix_cache.py
- reasoning: This is the reference-counting core of RadixAttention, SGLang's signature automatic KV-cache-reuse mechanism that underlies most of its throughput advantage.

```python
    def inc_lock_ref(self, node: TreeNode) -> IncLockRefResult:
        if self.disable:
            return IncLockRefResult(delta=0)

        delta = 0
        while node != self.root_node:
            if node.lock_ref == 0:
                self.evictable_size_ -= len(node.key)
                self.protected_size_ += len(node.key)
                delta -= len(node.key)
            node.lock_ref += 1
            self._update_leaf_status(node)
            node = node.parent
        return IncLockRefResult(delta=delta)
```

### Candidate 2

- file_path: python/sglang/srt/managers/scheduler.py
- snippet_url: https://github.com/sgl-project/sglang/blob/main/python/sglang/srt/managers/scheduler.py
- reasoning: Accumulates the sufficient statistics (sums, sum of squares, cross-products) for an online least-squares fit of decode-step latency vs. batch size, a subtle numerical trick feeding the scheduler's throughput model.

```python
def _accumulate_decode_moment(
    totals: list[float],
    batch_size: int,
    step_us: int,
    generated: int,
) -> None:
    if batch_size <= 0 or step_us <= 0:
        return
    b = float(batch_size)
    t = float(step_us)
    g = float(generated)
    totals[0] += 1.0
    totals[1] += b
    totals[2] += t
    totals[3] += b * b
    totals[4] += b * t
    totals[5] += g
```

### Candidate 3 (least important)

- file_path: python/sglang/lang/interpreter.py
- snippet_url: https://github.com/sgl-project/sglang/blob/main/python/sglang/lang/interpreter.py
- reasoning: Implements the batched `+=` merge used by SGLang's fork/join frontend DSL to apply a lambda, expression, or per-branch list across parallel program states, a nice illustration of the language's parallel-branching design.

```python
    def __iadd__(self, other):
        if isinstance(other, Callable):
            # lambda function
            for i in range(len(self.states)):
                self.states[i] += other(i)
        elif isinstance(other, SglExpr):
            for i in range(len(self.states)):
                self.states[i] += other
        elif isinstance(other, (list, tuple)):
            for i in range(len(self.states)):
                self.states[i] += other[i]
        else:
            raise ValueError(f"Invalid value: {other}")

        return self
```

## Repo 2 — HKUDS/DeepTutor

### Candidate 1 (most important)

- file_path: deeptutor/learning/mastery.py
- snippet_url: https://github.com/HKUDS/DeepTutor/blob/main/deeptutor/learning/mastery.py#L17-L37
- reasoning: The single function that turns a learner's raw answer history into the mastery score driving DeepTutor's "personalized tutoring" premise, with a non-obvious recency-weighting plus low-confidence cap.

```python
_RECENCY_WEIGHTS: tuple[float, ...] = (0.5, 0.7, 0.85, 0.95, 1.0)
_CONFIDENCE_CAP: dict[int, float] = {1: 0.5, 2: 0.8}


def compute_mastery(correctness: list[bool | float]) -> float:
    if not correctness:
        return 0.0
    recent = correctness[-len(_RECENCY_WEIGHTS) :]
    weights = _RECENCY_WEIGHTS[-len(recent) :]
    score = sum(
        w * max(0.0, min(1.0, float(c))) for c, w in zip(recent, weights, strict=True)
    ) / sum(weights)
    return min(score, _CONFIDENCE_CAP.get(len(recent), 1.0))
```

### Candidate 2

- file_path: deeptutor/learning/scheduler.py
- snippet_url: https://github.com/HKUDS/DeepTutor/blob/main/deeptutor/learning/scheduler.py#L603-L615
- reasoning: Feeds DeepTutor's spaced-repetition scheduler a believable "quality" signal when a grader didn't supply one explicitly, deriving it from correctness plus penalties for hints used and extra attempts.

```python
def _resolved_quality(evidence: LearningEvidence) -> float:
    if evidence.quality is not None:
        quality = float(evidence.quality)
    elif evidence.result == "correct":
        quality = 1.0
    elif evidence.result == "partial":
        quality = 0.4
    else:
        quality = 0.0
    if evidence.quality is None:
        quality -= min(0.25, evidence.hints_used * 0.08)
        quality -= min(0.2, max(0, evidence.attempt_count - 1) * 0.05)
    return max(0.0, min(1.0, quality))
```

### Candidate 3 (least important)

- file_path: deeptutor/agents/loop/context_budget.py
- snippet_url: https://github.com/HKUDS/DeepTutor/blob/main/deeptutor/agents/loop/context_budget.py#L125-L138
- reasoning: A subtle rule in the agent loop's token accounting — it only skips the first message if it's a system prompt, since the system prompt is already counted elsewhere, the kind of double-counting bug every LLM-agent builder eventually hits.

```python
def count_conversation_tokens(
    messages: Sequence[dict[str, Any]],
    counter: TokenCounter,
) -> int:
    total = 0
    for index, message in enumerate(messages):
        if index == 0 and message.get("role") == "system":
            continue
        total += _message_tokens(message, counter)
    return total
```
