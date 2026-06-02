# Breakdown Review — 2026-05-29 — Python

Issue: #16
Date: 2026-05-29
Language: Python
Status: COMPLETED

## Repo 1 — dograh-hq/dograh

- file_path: api/services/campaign/circuit_breaker.py
- snippet_url: https://github.com/dograh-hq/dograh/blob/main/api/services/campaign/circuit_breaker.py

file_intent: Campaign call-rate circuit breaker
breakdown_what: Runs atomically inside Redis to track failure and success timestamps in two sorted sets, trims both to a sliding window on every call, then returns a trip signal when the failure ratio exceeds a configured threshold across a minimum sample of recent calls.
breakdown_responsibility: Guards outbound calling campaigns from continuing after a phone number or provider starts failing consistently — a tripped breaker pauses the campaign before wasted call attempts and telephony costs accumulate on a degraded channel.
breakdown_clever: By embedding this logic in a Lua script, the entire read-modify-write cycle is atomic inside Redis — no Python process holds a distributed lock, and no race window exists where two concurrent workers both read a not-yet-tripped state before either writes its outcome.
project_context: Dograh is an open-source, self-hosted voice AI platform built as a drop-in alternative to Vapi and Retell, letting teams build telephony voice agents with a drag-and-drop workflow builder and bring-your-own-key LLM/STT/TTS on their own infrastructure.

### Reformatted Snippet

```python
lua_script = """
local fail_key = KEYS[1]
local succ_key = KEYS[2]
local now = tonumber(ARGV[1])
local window_start = tonumber(ARGV[2])
local is_failure = tonumber(ARGV[3])
local threshold = tonumber(ARGV[4])
local min_calls = tonumber(ARGV[5])
local ttl = tonumber(ARGV[6])

-- Trim both sets to the sliding window
redis.call('ZREMRANGEBYSCORE', fail_key, 0, window_start)
redis.call('ZREMRANGEBYSCORE', succ_key, 0, window_start)

-- Add the new outcome to the appropriate set
if is_failure == 1 then
    redis.call('ZADD', fail_key, now, now)
else
    redis.call('ZADD', succ_key, now, now)
end

-- Refresh TTL on both keys
redis.call('EXPIRE', fail_key, ttl)
redis.call('EXPIRE', succ_key, ttl)

-- Count via ZCARD (O(1))
local failures = redis.call('ZCARD', fail_key)
local successes = redis.call('ZCARD', succ_key)
local total = failures + successes

-- Check trip condition
if total >= min_calls
    and (failures / total) >= threshold then
    return {1, failures, successes, total}
end

return {0, failures, successes, total}
"""
```

## Repo 2 — st-tech/ppf-contact-solver

- file_path: frontend/_scene_.py
- snippet_url: https://github.com/st-tech/ppf-contact-solver/blob/main/frontend/_scene_.py

file_intent: Scene compiler material parameter replicator
breakdown_what: Replicates per-object material parameters across all generated mesh elements in three ordered passes — rods, pure-shell tris, and SOLID surface tris — building the flat parameter arrays the Rust/CUDA solver expects as contiguous, element-indexed input.
breakdown_responsibility: Bridges the Python scene description (one param set per logical object) to the flat arrays the Rust kernel consumes — any element appended to the wrong pass silently mis-pairs material properties with mesh faces, causing wrong simulation results with no error raised.
breakdown_clever: The three passes mirror the Rust kernel's internal `concat_tri` layout order, not the Python scene graph order — this invariant lives only in a comment. Adding a new object type to the wrong pass produces code that compiles and runs, with visually incorrect physics as the only signal.
project_context: ppf-contact-solver is a GPU-accelerated physics simulator for deformable shells, solids, and rods, developed by ZOZO (Japan's largest fashion e-commerce company) for virtual try-on and digital fashion applications, with a guarantee of penetration-free contact resolution.

### Reformatted Snippet

```python
        def _extend_param(
            param: ParamHolder,
            concat_param: dict[str, list],
            count: int,
        ):
            if len(concat_param.keys()):
                assert param.key_list() == list(
                    concat_param.keys()
                ), (
                    f"param keys mismatch: "
                    f"{param.key_list()} vs "
                    f"{list(concat_param.keys())}"
                )
            for key, value in param.items():
                if key not in concat_param:
                    concat_param[key] = []
                concat_param[key].extend([value] * count)

        # Param replication must mirror the Rust kernel's element
        # layout in `concat_tri`: rods first, then pure shells,
        # then SOLID surface tris. `concat_tri_param` is read by
        # the solver as a prefix-aligned slot for each tri, so
        # any deviation from this order mis-pairs material
        # parameters with their tris.
        for name, obj in dyn_objects:
            stats = stats_by_name[name]
            rod_added = int(stats["rod_added"])
            tet_added = int(stats["tet_added"])
            if obj.obj_type == "rod" and rod_added:
                _extend_param(
                    obj.param, concat_rod_param, rod_added
                )
            if tet_added:
                _extend_param(
                    obj.param, concat_tet_param, tet_added
                )
        # Pass A: pure shells.
        for name, obj in dyn_objects:
            stats = stats_by_name[name]
            tri_added = int(stats["tri_added"])
            tet_added = int(stats["tet_added"])
            if tri_added and tet_added == 0:
                _extend_param(
                    obj.param, concat_tri_param, tri_added
                )
        # Pass B: SOLID surface triangles
        # (objects carrying both tri and tet).
        for name, obj in dyn_objects:
            stats = stats_by_name[name]
            tri_added = int(stats["tri_added"])
            tet_added = int(stats["tet_added"])
            if tri_added and tet_added:
                _extend_param(
                    obj.param, concat_tri_param, tri_added
                )
```
