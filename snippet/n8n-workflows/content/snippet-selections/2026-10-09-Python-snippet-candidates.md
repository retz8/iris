# Snippet Candidates — 2026-10-09 — Python

Issue: #34
Date: 2026-10-09
Language: Python
Status: PENDING_SELECTION

## Repo 1 — Tracer-Cloud/opensre

### Candidate 1 (most important)

- file_path: core/tool/execution.py
- snippet_url: https://github.com/Tracer-Cloud/opensre/blob/main/core/tool/execution.py#L229-L252
- reasoning: This closure is the agent's tool-call hook-composition mechanism, letting multiple independent hook layers (guardrails, logging, approvals) each patch a tool's result in sequence without any layer silently discarding another's change — the extensibility backbone of OpenSRE's ReAct agent loop.

```python
    def after_tool_call(
        request: ToolExecutionRequest,
        result: ToolExecutionResult,
    ) -> ToolExecutionPatch | None:
        patched = result
        changed = False
        for hook_set in hooks:
            callback = hook_set.after_tool_call
            if callback is None:
                continue
            patch = callback(request, patched)
            if patch is None:
                continue
            patched = _apply_patch(patched, patch)
            changed = True
        if not changed:
            return None
        return ToolExecutionPatch(
            content=patched.content,
            details=patched.details,
            is_error=patched.is_error,
            terminate=patched.terminate,
            metadata=patched.metadata,
        )
```

### Candidate 2

- file_path: core/domain/alerts/inbox.py
- snippet_url: https://github.com/Tracer-Cloud/opensre/blob/main/core/domain/alerts/inbox.py#L47-L64
- reasoning: This is the thread-safe drain logic for the in-process alert queue that feeds OpenSRE's "AI SRE agent reacts to a pushed alert" flow — pop_nowait takes one alert while iter_pending atomically drains the whole queue and clears the pending-event flag so a background waker doesn't spin on an empty queue.

```python
    def pop_nowait(self) -> IncomingAlert | None:
        with self._lock:
            try:
                return self._queue.popleft()
            except IndexError:
                return None

    def iter_pending(self) -> list[IncomingAlert]:
        with self._lock:
            items: list[IncomingAlert] = []
            while True:
                try:
                    items.append(self._queue.popleft())
                except IndexError:
                    break
            if not self._queue:
                self._pending_event.clear()
            return items
```

### Candidate 3 (least important)

- file_path: integrations/verification/validation.py
- snippet_url: https://github.com/Tracer-Cloud/opensre/blob/main/integrations/verification/validation.py#L18-L39
- reasoning: A generic (PEP 695) helper that every config-only integration (of the repo's 60+ supported tools) reuses to turn its own validate_<vendor>_config call into a uniform pass/fail/missing verification result, showing the plumbing behind OpenSRE's broad integration surface.

```python
def verify_with_validation_result[ConfigT](
    service: str,
    source: str,
    config: dict[str, Any],
    *,
    build_config: Callable[[dict[str, Any]], ConfigT],
    validate_config: Callable[[ConfigT], Any],
) -> dict[str, str]:
    try:
        normalized_config = build_config(config)
    except Exception as err:
        return result(service, source, "missing", str(err))
    try:
        validation_result = validate_config(normalized_config)
    except Exception as err:
        return result(service, source, "failed", str(err))
    return result(
        service,
        source,
        "passed" if validation_result.ok else "failed",
        validation_result.detail,
    )
```

## Repo 2 — getsentry/sentry

### Candidate 1 (most important)

- file_path: src/sentry/grouping/variants.py
- snippet_url: https://github.com/getsentry/sentry/blob/master/src/sentry/grouping/variants.py
- reasoning: This is `BaseVariant.as_dict`, the method every grouping-variant subclass relies on to serialize the output of Sentry's core issue-grouping algorithm (the mechanism that decides which events belong to the same issue) into the shape exposed by the "Grouping Info" API/UI.

```python
    def as_dict(self) -> dict[str, Any]:
        rv = {
            "type": self.type,
            "key": self.key,
            "description": self.description,
            "hash": self.get_hash(),
            "hint": self.hint,
            "contributes": self.contributes,
        }
        rv.update(self._get_metadata_as_dict())
        return rv
```

### Candidate 2

- file_path: src/sentry/utils/numbers.py
- snippet_url: https://github.com/getsentry/sentry/blob/master/src/sentry/utils/numbers.py
- reasoning: A generic base-N encoder (with sign handling via a reversed digit list) that powers Sentry's human-readable issue short IDs, the "PROJECT-1A2B3"-style identifiers shown throughout the UI and in integrations.

```python
def _encode(number: int, alphabet: str) -> str:
    if number == 0:
        return alphabet[0]

    base = len(alphabet)
    rv = []
    inverse = False
    if number < 0:
        number = -number
        inverse = True

    while number != 0:
        number, i = divmod(number, base)
        rv.append(alphabet[i])

    if inverse:
        rv.append("-")
    rv.reverse()

    return "".join(rv)
```

### Candidate 3 (least important)

- file_path: src/sentry/search/utils.py
- snippet_url: https://github.com/getsentry/sentry/blob/master/src/sentry/search/utils.py
- reasoning: A two-pointer helper from Sentry's issue-search query parser that strips surrounding quotes from a tag value while correctly refusing to strip a quote that's actually escaped (preceded by a backslash).

```python
def remove_surrounding_quotes(text: str) -> str:
    length = len(text)
    if length <= 1:
        return text

    left = 0
    while left <= length / 2:
        if text[left] != '"':
            break
        left += 1

    right = length - 1
    while right >= length / 2:
        if text[right] != '"' or text[right - 1] == "\\":
            break
        right -= 1

    return text[left : right + 1]
```
