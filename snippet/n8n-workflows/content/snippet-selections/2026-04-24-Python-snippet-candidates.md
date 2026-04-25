# Snippet Candidates — 2026-04-24 — Python

Issue: #11
Date: 2026-04-24
Language: Python
Status: PENDING_SELECTION

## Repo 1 — google/adk-python

### Candidate 1 (most important)

- file_path: src/google/adk/tools/_automatic_function_calling_util.py
- snippet_url: https://github.com/google/adk-python/blob/main/src/google/adk/tools/_automatic_function_calling_util.py
- reasoning: This function is the foundation of ADK's entire tool-calling system — it converts any Python function's signature into the `(type, Field)` dict that Pydantic uses to generate a JSON schema for the LLM, carefully mapping `inspect.Parameter.empty` to `PydanticUndefined` and filtering out unsupported parameter kinds.

```python
def _get_fields_dict(func: Callable) -> Dict:
  param_signature = dict(inspect.signature(func).parameters)
  fields_dict = {
      name: (
          (
              param.annotation
              if param.annotation != inspect.Parameter.empty
              else Any
          ),
          pydantic.Field(
              default=(
                  param.default
                  if param.default != inspect.Parameter.empty
                  else pydantic_fields.PydanticUndefined
              ),
              description=None,
          ),
      )
      for name, param in param_signature.items()
      if param.kind
      in (
          inspect.Parameter.POSITIONAL_OR_KEYWORD,
          inspect.Parameter.KEYWORD_ONLY,
          inspect.Parameter.POSITIONAL_ONLY,
      )
  }
  return fields_dict
```

### Candidate 2

- file_path: src/google/adk/flows/llm_flows/agent_transfer.py
- snippet_url: https://github.com/google/adk-python/blob/main/src/google/adk/flows/llm_flows/agent_transfer.py
- reasoning: This function encodes the multi-directional routing graph for ADK's multi-agent system — an agent can transfer to sub-agents, to its parent, and to peer siblings, but each direction is gated by separate opt-out flags (`disallow_transfer_to_parent`, `disallow_transfer_to_peers`), making the precedence logic non-obvious at a glance.

```python
def _get_transfer_targets(agent: LlmAgent) -> list[BaseAgent]:
  result = []
  result.extend(agent.sub_agents)

  if not agent.parent_agent or not hasattr(
      agent.parent_agent, 'disallow_transfer_to_parent'
  ):
    return result

  if not agent.disallow_transfer_to_parent:
    result.append(agent.parent_agent)

  if not agent.disallow_transfer_to_peers:
    result.extend([
        peer_agent
        for peer_agent in agent.parent_agent.sub_agents
        if peer_agent.name != agent.name
    ])

  return result
```

### Candidate 3 (least important)

- file_path: src/google/adk/flows/llm_flows/functions.py
- snippet_url: https://github.com/google/adk-python/blob/main/src/google/adk/flows/llm_flows/functions.py
- reasoning: This helper shows how ADK surfaces tool-level auth requests back to the caller as a synthesized `Event` — the `requested_auth_configs` dict on the response's actions object is the signal that triggers a credential-request round-trip before the tool can proceed.

```python
def generate_auth_event(
    invocation_context: InvocationContext,
    function_response_event: Event,
) -> Optional[Event]:
  if not function_response_event.actions.requested_auth_configs:
    return None

  return build_auth_request_event(
      invocation_context,
      function_response_event.actions.requested_auth_configs,
      role=function_response_event.content.role,
  )
```

## Repo 2 — HKUDS/RAG-Anything

### Candidate 1 (most important)

- file_path: raganything/modalprocessors.py
- snippet_url: https://github.com/HKUDS/RAG-Anything/blob/main/raganything/modalprocessors.py
- reasoning: This four-strategy JSON parsing cascade — stripping reasoning-model `<think>` tags, walking balanced braces, and falling back to regex extraction — is the linchpin that makes RAG-Anything robust against every LLM output format in the wild.

```python
def _robust_json_parse(self, response: str) -> dict:
    """Robust JSON parsing with multiple fallback strategies"""

    # Strategy 1: Try direct parsing first
    for json_candidate in self._extract_all_json_candidates(
        response
    ):
        result = self._try_parse_json(json_candidate)
        if result:
            return result

    # Strategy 2: Try with basic cleanup
    for json_candidate in self._extract_all_json_candidates(
        response
    ):
        cleaned = self._basic_json_cleanup(json_candidate)
        result = self._try_parse_json(cleaned)
        if result:
            return result

    # Strategy 3: Try progressive quote fixing
    for json_candidate in self._extract_all_json_candidates(
        response
    ):
        fixed = self._progressive_quote_fix(json_candidate)
        result = self._try_parse_json(fixed)
        if result:
            return result

    # Strategy 4: Fallback to regex field extraction
    return self._extract_fields_with_regex(response)

def _extract_all_json_candidates(
    self, response: str
) -> list:
    """Extract all possible JSON candidates from response"""
    candidates = []
    import re

    # Strip reasoning tags (DeepSeek-R1, Qwen2.5-think, etc.)
    cleaned = re.sub(
        r"<think>.*?</think>",
        "",
        response,
        flags=re.DOTALL | re.IGNORECASE,
    )
    cleaned = re.sub(
        r"<thinking>.*?</thinking>",
        "",
        cleaned,
        flags=re.DOTALL | re.IGNORECASE,
    )

    # Method 1: JSON in code blocks
    json_blocks = re.findall(
        r"```(?:json)?\s*(\{.*?\})\s*```",
        cleaned,
        re.DOTALL,
    )
    candidates.extend(json_blocks)

    # Method 2: Walk balanced braces
    brace_count = 0
    start_pos = -1
    for i, char in enumerate(cleaned):
        if char == "{":
            if brace_count == 0:
                start_pos = i
            brace_count += 1
        elif char == "}":
            brace_count -= 1
            if brace_count == 0 and start_pos != -1:
                candidates.append(cleaned[start_pos: i + 1])

    # Method 3: Simple regex fallback
    simple_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if simple_match:
        candidates.append(simple_match.group(0))

    return candidates
```

### Candidate 2

- file_path: raganything/resilience.py
- snippet_url: https://github.com/HKUDS/RAG-Anything/blob/main/raganything/resilience.py
- reasoning: The `CircuitBreaker._acquire_permission` method implements a thread-safe half-open single-flight guard — only one trial call is allowed through during recovery — which protects the system from cascading LLM API failures.

```python
def _acquire_permission(self) -> None:
    """Check and update state before a protected call.

    - Open + timeout not elapsed -> raise immediately.
    - Moves open -> half-open when timeout elapses.
    - Half-open allows exactly one in-flight trial call.
    - Closed -> allow normally.
    """
    with self._lock:
        # Transition open -> half-open if timeout elapsed.
        if self._state == "open":
            elapsed = (
                time.time() - self._last_failure_time
            )
            if elapsed >= self.reset_timeout:
                self._state = "half-open"

        if self._state == "open":
            raise self.CircuitBreakerOpen(
                f"Circuit breaker '{self.name}' is open"
                " -- call rejected"
            )

        if self._state == "half-open":
            if self._trial_in_flight:
                # Single-flight: only one trial allowed.
                raise self.CircuitBreakerOpen(
                    f"Circuit breaker '{self.name}' is"
                    " half-open -- trial in progress"
                )
            # Mark a trial call as in-flight.
            self._trial_in_flight = True
            return

        # closed: allow call as normal.
        return
```

### Candidate 3 (least important)

- file_path: raganything/query.py
- snippet_url: https://github.com/HKUDS/RAG-Anything/blob/main/raganything/query.py
- reasoning: The cache-key normalization in `_generate_multimodal_cache_key` shows how the system makes multimodal queries portable across environments by hashing large content and stripping directory paths from image filenames.

```python
def _generate_multimodal_cache_key(
    self,
    query: str,
    multimodal_content: list,
    mode: str,
    **kwargs,
) -> str:
    cache_data = {
        "query": query.strip(),
        "mode": mode,
    }

    normalized_content = []
    if multimodal_content:
        for item in multimodal_content:
            if isinstance(item, dict):
                normalized_item = {}
                for key, value in item.items():
                    # Use basename so cache is path-portable
                    if key in [
                        "img_path",
                        "image_path",
                        "file_path",
                    ] and isinstance(value, str):
                        normalized_item[key] = (
                            Path(value).name
                        )
                    # Hash large content instead of storing
                    elif (
                        key in ["table_data", "table_body"]
                        and isinstance(value, str)
                        and len(value) > 200
                    ):
                        normalized_item[f"{key}_hash"] = (
                            hashlib.md5(
                                value.encode()
                            ).hexdigest()
                        )
                    else:
                        normalized_item[key] = value
                normalized_content.append(normalized_item)
            else:
                normalized_content.append(item)

    cache_data["multimodal_content"] = normalized_content

    cache_str = json.dumps(
        cache_data, sort_keys=True, ensure_ascii=False
    )
    cache_hash = hashlib.md5(cache_str.encode()).hexdigest()
    return f"multimodal_query:{cache_hash}"
```
