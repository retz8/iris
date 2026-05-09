# Snippet Candidates — 2026-05-08 — Python

Issue: #13
Date: 2026-05-08
Language: Python
Status: PENDING_SELECTION

## Repo 1 — cocoindex-io/cocoindex

### Candidate 1 (most important)

- file_path: python/cocoindex/_internal/memo_fingerprint.py
- snippet_url: https://github.com/cocoindex-io/cocoindex/blob/main/python/cocoindex/_internal/memo_fingerprint.py
- reasoning: The heart of CocoIndex's incremental-compute guarantee — a recursive canonicalization walk that converts arbitrary Python objects (hooks, dataclasses, Pydantic models, containers, cycles) into a stable hashable form for Rust-side fingerprinting, making the memoization system language-boundary-aware.

```python
def _canonicalize(
    obj: object,
    _seen: dict[int, int] | None,
    state_methods: list[StateFnEntry] | None = None,
) -> Fingerprintable:
    if _seen is None:
        _seen = {}

    # 1) Primitives
    if obj is None:
        return None
    if isinstance(obj, (bool, int, float, str, bytes,
                        core.Fingerprint)):
        return obj
    if isinstance(obj, (bytearray, memoryview)):
        return bytes(obj)

    # 2) Hook / registry
    hook = getattr(obj, "__coco_memo_key__", None)
    if hook is not None and callable(hook):
        k = hook()
        typ = type(obj)
        tag = "hook"
        state_hook = getattr(obj, "__coco_memo_state__", None)
        if state_hook is not None and callable(state_hook):
            tag = "shook"
            if state_methods is not None:
                raw_fn = getattr(typ, "__coco_memo_state__")
                state_methods.append(
                    _make_state_fn_entry(state_hook, raw_fn)
                )
        return (
            tag,
            typ.__module__,
            typ.__qualname__,
            _canonicalize(k, _seen, state_methods),
        )

    for base in type(obj).__mro__:
        memo = _memo_fns.get(base)
        if memo is not None:
            k = memo.key_fn(obj)
            tag = "hook"
            if memo.state_fn is not None:
                tag = "shook"
                if state_methods is not None:
                    bound = functools.partial(memo.state_fn, obj)
                    state_methods.append(
                        _make_state_fn_entry(bound, memo.state_fn)
                    )
            return (
                tag,
                base.__module__,
                base.__qualname__,
                _canonicalize(k, _seen, state_methods),
            )

    # 3) Cycle detection
    oid = id(obj)
    ordinal = _seen.get(oid)
    if ordinal is not None:
        return ("ref", ordinal)
    _seen[oid] = len(_seen)

    # 4) Containers
    if isinstance(obj, typing.Sequence):
        return (
            "seq",
            tuple(
                _canonicalize(e, _seen, state_methods)
                for e in obj
            ),
        )

    if isinstance(obj, typing.Mapping):
        items: list[
            tuple[Fingerprintable, Fingerprintable]
        ] = []
        for k, v in obj.items():
            items.append((
                _canonicalize(k, _seen, state_methods),
                _canonicalize(v, _seen, state_methods),
            ))
        items.sort(
            key=lambda kv: (
                _stable_sort_key(kv[0]),
                _stable_sort_key(kv[1]),
            )
        )
        return ("map", tuple(items))

    if isinstance(obj, (set, frozenset)):
        elts = [
            _canonicalize(e, _seen, state_methods)
            for e in obj
        ]
        elts.sort(key=_stable_sort_key)
        return ("set", tuple(elts))

    # 5) Dataclass / Pydantic
    if _is_dataclass_instance(obj):
        return _canonicalize_dataclass(obj, _seen)
    if _is_pydantic_model(obj):
        return _canonicalize_pydantic(obj, _seen)

    # 6) Fallback
    try:
        payload = pickle.dumps(
            obj, protocol=pickle.HIGHEST_PROTOCOL
        )
        return ("pickle", payload)
    except Exception:
        raise TypeError(
            f"Unsupported type for memoization key: "
            f"{type(obj)!r}. Provide __coco_memo_key__() "
            "or register a memo key function."
        ) from None
```

### Candidate 2

- file_path: python/cocoindex/_internal/runner.py
- snippet_url: https://github.com/cocoindex-io/cocoindex/blob/main/python/cocoindex/_internal/runner.py
- reasoning: A lazy singleton subprocess pool that spawns a `spawn`-context `ProcessPoolExecutor` with a parent-PID initializer, plus an async retry loop that transparently recreates the pool on `BrokenProcessPool` — a production-grade pattern for resilient subprocess isolation for GPU workloads.

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

### Candidate 3 (least important)

- file_path: python/cocoindex/_internal/target_state.py
- snippet_url: https://github.com/cocoindex-io/cocoindex/blob/main/python/cocoindex/_internal/target_state.py
- reasoning: `_TypedTargetHandlerWrapper` inspects the type annotation of a protocol method's third positional parameter at construction time — using reflection to build a typed deserializer on the fly — so that user-defined `TargetHandler.reconcile` methods receive strongly-typed Python objects instead of raw `StoredValue` blobs from the Rust core.

```python
class _TypedTargetHandlerWrapper:
    """Wraps a TargetHandler to auto-deserialize
    tracking records (StoredValue -> typed objects).
    """

    __slots__ = ("_handler", "_deserializer")

    def __init__(self, handler: Any) -> None:
        self._handler = handler
        reconcile_label = qualified_name(
            type(handler).reconcile
        )
        try:
            ann = get_param_annotation(
                type(handler).reconcile, 3
            )
            record_type = unwrap_element_type(ann)
        except Exception:
            record_type = Any
        self._deserializer = make_deserialize_fn(
            record_type,
            source_label=(
                f"prev_possible_records param of "
                f"{reconcile_label}()"
            ),
        )

    def reconcile(
        self,
        key: Any,
        desired: Any,
        prev_possible_records: Any,
        prev_may_be_missing: bool,
        /,
    ) -> Any:
        records = [
            r.get(self._deserializer)
            for r in prev_possible_records
        ]
        return self._handler.reconcile(
            key, desired, records, prev_may_be_missing
        )

    def attachments(self) -> dict[str, Any]:
        if not hasattr(self._handler, "attachments"):
            return {}
        return {
            k: _TypedTargetHandlerWrapper(v)
            for k, v in self._handler.attachments().items()
        }
```

## Repo 2 — Q00/ouroboros

### Candidate 1 (most important)

- file_path: src/ouroboros/evolution/convergence.py
- snippet_url: https://github.com/Q00/ouroboros/blob/main/src/ouroboros/evolution/convergence.py
- reasoning: The heart of the repo's evolutionary loop — a multi-signal convergence detector that gates termination on both oscillation (period-2 cycle detection across ontology snapshots) and stagnation (unchanged ontology for N windows), showing how the system decides when an AI-driven generation cycle is truly done.

```python
def _check_oscillation(
    self, lineage: OntologyLineage
) -> bool:
    """Detect oscillation: N~N-2 AND N-1~N-3."""
    gens = self._completed_generations(lineage)

    # Period-2 full check: A->B->A->B
    if len(gens) >= 4:
        sim_n_n2 = OntologyDelta.compute(
            gens[-3].ontology_snapshot,
            gens[-1].ontology_snapshot,
        ).similarity
        sim_n1_n3 = OntologyDelta.compute(
            gens[-4].ontology_snapshot,
            gens[-2].ontology_snapshot,
        ).similarity
        if (
            sim_n_n2 >= self.convergence_threshold
            and sim_n1_n3 >= self.convergence_threshold
        ):
            return True

    # Simpler period-2 check: only 3 gens
    elif len(gens) >= 3:
        sim = OntologyDelta.compute(
            gens[-3].ontology_snapshot,
            gens[-1].ontology_snapshot,
        ).similarity
        if sim >= self.convergence_threshold:
            return True

    return False

def _check_stagnation(
    self, lineage: OntologyLineage
) -> bool:
    """Check if ontology unchanged for stagnation_window gens."""
    gens = self._completed_generations(lineage)
    if len(gens) < self.stagnation_window:
        return False

    window = gens[-self.stagnation_window :]
    for i in range(1, len(window)):
        delta = OntologyDelta.compute(
            window[i - 1].ontology_snapshot,
            window[i].ontology_snapshot,
        )
        if delta.similarity < self.convergence_threshold:
            return False

    return True
```

### Candidate 2

- file_path: src/ouroboros/orchestrator/policy.py
- snippet_url: https://github.com/Q00/ouroboros/blob/main/src/ouroboros/orchestrator/policy.py
- reasoning: The capability policy engine that gates which tools each agent session role (coordinator, interview, evaluation, implementation) may see and execute — using a declarative profile table and a two-phase mutation + selector check — a compact example of role-based access control in an AI orchestration system.

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

### Candidate 3 (least important)

- file_path: src/ouroboros/core/ac_tree.py
- snippet_url: https://github.com/Q00/ouroboros/blob/main/src/ouroboros/core/ac_tree.py
- reasoning: Two traversal methods on an event-sourced immutable tree — `get_ancestors` walks up via parent pointers and inserts at position 0 for root-first ordering, while `can_decompose` enforces a four-way guard before allowing further decomposition — a clean pattern for hierarchical decomposition problems.

```python
def get_ancestors(self, ac_id: str) -> list[ACNode]:
    """Get all ancestor nodes from root to parent."""
    ancestors: list[ACNode] = []
    node = self.nodes.get(ac_id)

    while node and node.parent_id:
        parent = self.nodes.get(node.parent_id)
        if parent:
            # Insert at beginning for root-first order
            ancestors.insert(0, parent)
        node = parent

    return ancestors

def can_decompose(self, ac_id: str) -> bool:
    """Check if an AC can be decomposed further."""
    node = self.nodes.get(ac_id)
    if node is None:
        return False

    return (
        node.depth < self.max_depth
        and node.status not in (
            ACStatus.DECOMPOSED,
            ACStatus.COMPLETED,
        )
        and not node.is_atomic
    )
```
