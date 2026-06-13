# Snippet Candidates — 2026-06-12 — Python

Issue: #18
Date: 2026-06-12
Language: Python
Status: COMPLETED

## Repo 1 — huggingface/OpenEnv

### Candidate 1 (most important)

- file_path: src/openenv/core/env_server/mcp_environment.py
- snippet_url: https://github.com/huggingface/OpenEnv/blob/main/src/openenv/core/env_server/mcp_environment.py
- reasoning: This is the central dispatch method that bridges OpenEnv's Gym-style `step()` API with MCP tool invocation — the core mechanism that makes agent environments composable with the Model Context Protocol.

```python
def step(
    self,
    action: Action,
    timeout_s: Optional[float] = None,
    **kwargs: Any,
) -> Observation:
    if isinstance(action, ListToolsAction):
        return self._handle_list_tools()
    elif isinstance(action, CallToolAction):
        return self._handle_call_tool(
            action, timeout_s=timeout_s
        )
    else:
        return self._step_impl(
            action, timeout_s=timeout_s, **kwargs
        )
```

### Candidate 2

- file_path: src/openenv/core/harness/collect.py
- snippet_url: https://github.com/huggingface/OpenEnv/blob/main/src/openenv/core/harness/collect.py
- reasoning: `build_model_step` adapts any `LLMClient` into a harness-compatible `ModelStep` callable, handling system-prompt injection, unsupported sampling-key filtering with a warning, and sync/async bridging — revealing how OpenEnv normalizes heterogeneous LLM providers into a single rollout loop.

```python
def build_model_step(
    llm_client: LLMClient,
    *,
    system_prompt: str | None = None,
) -> ModelStep:
    def model_step(
        messages: list[dict[str, Any]],
        tools: list[Tool],
        sampling: dict[str, Any],
    ) -> ModelStepResult:
        effective_messages = list(messages)
        if system_prompt and not any(
            m.get("role") == "system"
            for m in effective_messages
        ):
            effective_messages.insert(
                0, {"role": "system", "content": system_prompt}
            )

        tool_dicts = [_tool_to_mcp_dict(t) for t in tools]
        dropped_keys = sorted(
            set(sampling) - _SUPPORTED_SAMPLING_KEYS
        )
        if dropped_keys:
            warnings.warn(
                "Dropping unsupported sampling keys: "
                + ", ".join(dropped_keys),
                RuntimeWarning,
                stacklevel=2,
            )
        filtered_sampling = {
            k: v
            for k, v in sampling.items()
            if k in _SUPPORTED_SAMPLING_KEYS
        }

        response = run_async_safely(
            llm_client.complete_with_tools(
                messages=effective_messages,
                tools=tool_dicts,
                **filtered_sampling,
            )
        )
        return ModelStepResult(response=response)

    return model_step
```

### Candidate 3 (least important)

- file_path: src/openenv/core/env_server/interfaces.py
- snippet_url: https://github.com/huggingface/OpenEnv/blob/main/src/openenv/core/env_server/interfaces.py
- reasoning: `_apply_rubric_async` shows how OpenEnv handles rubrics that may return either a plain float or a coroutine from the same call site, using `inspect.iscoroutine` to decide whether to await — a pattern that makes reward functions composable across sync and async environments without requiring two separate rubric implementations.

```python
async def _apply_rubric_async(
    self,
    action: ActT,
    observation: ObsT,
) -> float:
    if self.rubric is not None:
        result = self.rubric(action, observation)
        if inspect.iscoroutine(result):
            return await result
        return result
    return 0.0
```

## Repo 2 — Panniantong/Agent-Reach

### Candidate 1 (most important)

- file_path: agent_reach/probe.py
- snippet_url: https://github.com/Panniantong/Agent-Reach/blob/main/agent_reach/probe.py
- reasoning: This is the foundation every channel health-check is built on — it distinguishes three failure modes (`missing`, `broken`, `timeout/error`) that `shutil.which()` treats identically, solving the real-world problem of stale venv shims that appear installed but cannot exec.

```python
def probe_command(
    cmd: str,
    args: Sequence[str] = ("--version",),
    timeout: int = 10,
    retries: int = 0,
    package: Optional[str] = None,
) -> ProbeResult:
    path = shutil.which(cmd)
    if not path:
        return ProbeResult("missing")

    last: Optional[ProbeResult] = None
    for _ in range(retries + 1):
        last = _run_once(path, args, timeout, package or cmd)
        if last.ok:
            return last
        if last.status in ("missing", "broken"):
            return last
    return last


def _run_once(
    path: str,
    args: Sequence[str],
    timeout: int,
    package: str,
) -> ProbeResult:
    try:
        r = subprocess.run(
            [path, *args],
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            env=utf8_subprocess_env(),
        )
    except FileNotFoundError:
        return ProbeResult(
            "broken", hint=reinstall_hint(package)
        )
    except OSError:
        return ProbeResult(
            "broken", hint=reinstall_hint(package)
        )
    except subprocess.TimeoutExpired:
        return ProbeResult(
            "timeout",
            hint=f"`{path}` 响应超时（>{timeout}s）",
        )

    if r.returncode in _BROKEN_EXIT_CODES:
        return ProbeResult(
            "broken", hint=reinstall_hint(package)
        )

    output = (r.stdout or "") + (r.stderr or "")
    if r.returncode != 0:
        return ProbeResult("error", output=output.strip())
    return ProbeResult("ok", output=output.strip())
```

### Candidate 2

- file_path: agent_reach/channels/twitter.py
- snippet_url: https://github.com/Panniantong/Agent-Reach/blob/main/agent_reach/channels/twitter.py
- reasoning: The two-phase backend selection in `check()` solves a subtle ordering problem — collecting all candidate statuses first, then picking the best one, prevents an authenticated-but-broken tool from blocking a fully-functional fallback that appears later in the list.

```python
def check(self, config=None):
    self.active_backend = None
    findings = []

    for backend in self.ordered_backends(config):
        if backend == "twitter-cli":
            result = self._check_twitter_cli()
        elif backend == "OpenCLI":
            result = self._check_opencli()
        elif backend == "bird CLI (legacy)":
            result = self._check_bird()
        else:
            continue

        if result is None:
            continue
        findings.append((backend, *result))

    for wanted in ("ok", "warn"):
        for backend, status, message in findings:
            if status == wanted:
                self.active_backend = backend
                return status, message

    if findings:
        return "error", "\n".join(
            m for _, _, m in findings
        )

    return "warn", (
        "Twitter CLI 未安装。安装方式：\n"
        "  pipx install twitter-cli\n"
        "或：\n"
        "  uv tool install twitter-cli"
    )
```

### Candidate 3 (least important)

- file_path: agent_reach/channels/base.py
- snippet_url: https://github.com/Panniantong/Agent-Reach/blob/main/agent_reach/channels/base.py
- reasoning: `ordered_backends()` implements the user-override routing that all channels inherit — a small but non-obvious algorithm that moves a config-specified backend to the front of the probe list while silently ignoring stale overrides so they can never hide working backends.

```python
def ordered_backends(self, config=None) -> List[str]:
    candidates = list(self.backends)
    override = (
        config.get(f"{self.name}_backend")
        if config
        else None
    )
    if override:
        for i, b in enumerate(candidates):
            if b == override or b.startswith(override):
                candidates.insert(0, candidates.pop(i))
                break
    return candidates
```
