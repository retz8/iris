# Snippet Candidates — 2026-07-24 — Python

Issue: #24
Date: 2026-07-24
Language: Python
Status: PENDING_SELECTION

## Repo 1 — kvcache-ai/ktransformers

### Candidate 1 (most important)

- file_path: kt-kernel/python/experts_base.py
- snippet_url: https://github.com/kvcache-ai/ktransformers/blob/main/kt-kernel/python/experts_base.py
- reasoning: This method implements ktransformers' core deferred-execution optimization — it partitions a token's top-k expert assignments into an "immediate" set (the top-scoring experts, run now on GPU) and a "deferred" set (the rest, queued for CPU), using a scatter/gather trick via a per-expert boolean flag tensor to avoid explicit loops.

```python
    def select_deferred_experts(
        self,
        expert_ids: torch.Tensor,
        expert_scores: torch.Tensor,
        protected_k: int,
    ) -> Tuple[torch.Tensor, Optional[torch.Tensor]]:
        batch, topk = expert_ids.shape
        device = expert_ids.device

        protected_k = max(0, min(int(protected_k), topk))
        if protected_k == 0:
            deferred_ids = expert_ids.clone()
            immediate_ids = torch.full_like(expert_ids, -1)
            return immediate_ids, deferred_ids

        topk_result = torch.topk(expert_scores, k=protected_k, dim=-1, largest=True, sorted=False)
        protected_indices = topk_result.indices
        protected_ids = torch.gather(expert_ids, -1, protected_indices)

        protected_flag = torch.zeros((self.num_experts,), dtype=torch.int32, device=device)
        protected_flag.scatter_(0, protected_ids.reshape(-1), 1)

        protected_mask_flat = torch.gather(protected_flag, 0, expert_ids.reshape(-1)).ne(0)
        protected_mask = protected_mask_flat.view(batch, topk)

        immediate_ids = expert_ids.clone().masked_fill(~protected_mask, -1)
        deferred_ids = expert_ids.clone().masked_fill(protected_mask, -1)

        return immediate_ids, deferred_ids
```

### Candidate 2

- file_path: kt-kernel/python/sft/config.py
- snippet_url: https://github.com/kvcache-ai/ktransformers/blob/main/kt-kernel/python/sft/config.py
- reasoning: Uses the walrus operator inside a set comprehension to deduplicate `(physical_package_id, core_id)` tuples read from Linux sysfs, counting real physical cores rather than SMT logical threads — a compact and correct way to avoid over-provisioning OMP workers.

```python
def detect_physical_cpu_count() -> int:
    """Count physical cores available to the current process.

    Linux exposes a stable ``(physical_package_id, core_id)`` pair for every
    logical CPU. Counting those pairs avoids assigning one OpenMP worker to
    each SMT sibling. If topology is unavailable, fall back to the number of
    affinity-visible logical CPUs.
    """
    cpu_ids = _available_cpu_ids()
    physical_cores = {
        topology
        for cpu_id in cpu_ids
        if (topology := _read_cpu_topology(cpu_id)) is not None
    }
    return max(1, len(physical_cores) if physical_cores else len(cpu_ids))
```

### Candidate 3 (least important)

- file_path: kt-kernel/python/utils/amx.py
- snippet_url: https://github.com/kvcache-ai/ktransformers/blob/main/kt-kernel/python/utils/amx.py
- reasoning: A reusable Linux `/proc/cpuinfo` flag probe that accepts variadic flag names so a single call can match any alias for the same ISA feature — used throughout the codebase to guard AMX/AVX-512/AVX2 backend selection at import time.

```python
def _host_has_cpu_flag(*flag_names: str) -> bool:
    try:
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if line.startswith("flags"):
                    flags = set(line.split(":", 1)[1].strip().split())
                    return any(name in flags for name in flag_names)
    except OSError:
        return False
    return False
```

## Repo 2 — dottxt-ai/outlines

### Candidate 1 (most important)

- file_path: src/outlines/caching.py
- snippet_url: https://github.com/dottxt-ai/outlines/blob/main/src/outlines/caching.py
- reasoning: Building the FSM index for constrained generation is expensive, so outlines disk-caches it — but standard pickle cannot serialize arbitrary functions used as cache keys, so this class overrides every serialization entry point in `diskcache.Disk` to swap in `cloudpickle`, silently making the cache key-space include lambdas, closures, and model-specific callables.

```python
class CloudpickleDisk(Disk): # pragma: no cover
    def __init__(self, directory, compress_level=1, **kwargs):
        self.compress_level = compress_level
        super().__init__(directory, **kwargs)

    def put(self, key):
        data = cloudpickle.dumps(key)
        return super().put(data)

    def get(self, key, raw):
        data = super().get(key, raw)
        return cloudpickle.loads(data)

    def store(self, value, read, key=UNKNOWN):
        if not read:
            value = cloudpickle.dumps(value)
        return super().store(value, read, key=key)

    def fetch(self, mode, filename, value, read):
        data = super().fetch(mode, filename, value, read)
        if not read:
            data = cloudpickle.loads(data)
        return data
```

### Candidate 2

- file_path: src/outlines/types/json_schema_utils.py
- snippet_url: https://github.com/dottxt-ai/outlines/blob/main/src/outlines/types/json_schema_utils.py
- reasoning: This function shows a three-step dynamic class construction pattern — `type()` to build a raw class dict, then `dataclass(kw_only=True)` applied as a callable — to convert a JSON Schema object into a fully-typed Python dataclass at runtime, enabling outlines to round-trip between schema definitions and structured Python output types.

```python
def json_schema_dict_to_dataclass(
    schema: dict,
    name: Optional[str] = None
) -> type:
    """Convert a JSON Schema dict into a dataclass.

    Parameters
    ----------
    schema: dict
        The JSON Schema dict to convert to a dataclass
    name: Optional[str]
        The name of the dataclass

    Returns
    -------
    type
        The dataclass

    """
    required = set(schema.get("required", []))
    properties = schema.get("properties", {})

    annotations: Dict[str, Any] = {}
    defaults: Dict[str, Any] = {}

    for property, details in properties.items():
        typ = schema_type_to_python(details, "dataclass")
        annotations[property] = typ

        if property not in required:
            defaults[property] = None

    class_dict = {
        '__annotations__': annotations,
        '__module__': __name__,
    }

    for property, default_val in defaults.items():
        class_dict[property] = field(default=default_val)

    cls = type(name or "AnonymousDataclass", (), class_dict)
    return dataclass(kw_only=True)(cls)
```

### Candidate 3 (least important)

- file_path: src/outlines/templates.py
- snippet_url: https://github.com/dottxt-ai/outlines/blob/main/src/outlines/templates.py
- reasoning: This `functools.singledispatch` registration demonstrates how outlines' Jinja template system polymorphically extracts JSON schemas from different model types, and notably detects Pydantic v1 vs v2 at runtime with a `hasattr` probe rather than a version check, making it forward-compatible across Pydantic releases.

```python
@get_schema.register(type(BaseModel))
def get_schema_pydantic(model: Type[BaseModel]):
    """Return the schema of a Pydantic model."""
    if hasattr(model, "model_json_schema"):
        def_key = "$defs"
        raw_schema = model.model_json_schema()
    else:  # pragma: no cover
        def_key = "definitions"
        raw_schema = model.schema()

    definitions = raw_schema.get(def_key, None)
    schema = parse_pydantic_schema(raw_schema, definitions)

    return json.dumps(schema, indent=2)
```
