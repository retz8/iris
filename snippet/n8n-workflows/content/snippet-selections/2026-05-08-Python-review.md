# Breakdown Review — 2026-05-08 — Python

Issue: #13
Date: 2026-05-08
Language: Python
Status: PENDING_APPROVAL

## Repo 1 — cocoindex-io/cocoindex

- file_path: python/cocoindex/_internal/runner.py
- snippet_url: https://github.com/cocoindex-io/cocoindex/blob/main/python/cocoindex/_internal/runner.py

file_intent: Subprocess pool lifecycle manager
breakdown_what: Lazily creates a single-worker process pool using the `spawn` context, then submits callable work to it asynchronously through the event loop's executor, transparently restarting the pool on worker crash.
breakdown_responsibility: Offloads CPU-bound or blocking computation to an isolated subprocess so cocoindex's async pipeline can process incremental data changes without stalling the event loop — preventing tail latency spikes during active indexing runs.
breakdown_clever: The `while True` retry swallows `BrokenProcessPool` transparently, so callers never know the worker crashed. Choosing `spawn` over `fork` ensures the child starts clean — no inherited file descriptors, database connections, or stale lock state from the parent.
project_context: CocoIndex is an incremental data pipeline engine used by AI teams to keep RAG indexes, agent memory, and knowledge graphs continuously in sync with changing source data — like codebases, Slack threads, or PDFs — without reprocessing unchanged content.

### Reformatted Snippet

```python
def _get_pool() -> ProcessPoolExecutor:
    """Get or create the singleton subprocess pool."""
    global _pool
    with _pool_lock:
        if _pool is None:
            _pool = ProcessPoolExecutor(
                max_workers=1,
                initializer=_subprocess_init,
                initargs=(os.getpid(),),
                mp_context=mp.get_context("spawn"),
            )
        return _pool


async def _submit_to_pool_async(
    fn: Callable[..., Any], *args: Any
) -> Any:
    """Submit work to pool and wait asynchronously."""
    loop = asyncio.get_running_loop()
    while True:
        pool = _get_pool()
        try:
            return await loop.run_in_executor(
                pool, fn, *args
            )
        except BrokenProcessPool:
            _restart_pool(old_pool=pool)
```

## Repo 2 — Q00/ouroboros

- file_path: src/ouroboros/orchestrator/policy.py
- snippet_url: https://github.com/Q00/ouroboros/blob/main/src/ouroboros/orchestrator/policy.py

file_intent: Role-based capability access policy evaluator
breakdown_what: Iterates all capabilities in a graph, checking each against the session role's mutation policy and selector rules to produce a tuple of decisions flagging each capability as visible and/or executable.
breakdown_responsibility: Acts as the authorization gate between ouroboros's structured specification workflow and its AI runtime backends — ensuring agents see only the tools their role permits and cannot execute capabilities requiring runtime provider discovery.
breakdown_clever: `visible` and `executable` start equal but can diverge: a capability that needs live provider discovery stays visible but non-executable, with a reason attached. The system surfaces restricted tools as inactive rather than hiding them — so the agent understands what exists but isn't available yet.
project_context: Ouroboros is a specification-first orchestration layer used by developers who want structured, reviewable AI agent workflows — it wraps runtimes like Claude Code or Codex CLI with an interview-seed-execute-evaluate loop that enforces intent clarity before any code gets written.

### Reformatted Snippet

```python
def evaluate_capability_policy(
    graph: CapabilityGraph,
    context: PolicyContext,
) -> tuple[PolicyDecision, ...]:
    """Evaluate visible/executable capability decisions."""
    profile = _ROLE_PROFILES[context.session_role]
    decisions: list[PolicyDecision] = []

    for descriptor in graph.capabilities:
        reasons: list[str] = []
        visible = _is_mutation_allowed(descriptor, profile)
        executable = visible

        if visible and not _matches_role_selector(
            descriptor, profile
        ):
            visible = False
            executable = False
            reasons.append(
                f"{context.session_role.value} profile "
                f"does not include {descriptor.name}"
            )
        elif not visible:
            reasons.append(
                f"mutation_class "
                f"{descriptor.semantics.mutation_class.value}"
                f" exceeds {context.session_role.value} policy"
            )

        if descriptor.source_kind in (
            _NON_EXECUTABLE_SOURCE_KINDS
        ):
            executable = False
            reasons.append(
                f"{descriptor.source_kind} requires live "
                f"provider discovery before execution"
            )

        decisions.append(
            PolicyDecision(
                stable_id=descriptor.stable_id,
                name=descriptor.name,
                visible=visible,
                executable=executable,
                approval_class=(
                    descriptor.semantics.approval_class
                ),
                reasons=tuple(reasons),
            )
        )

    return tuple(decisions)
```
