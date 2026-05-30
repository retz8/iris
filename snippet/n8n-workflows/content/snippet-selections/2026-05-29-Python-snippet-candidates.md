# Snippet Candidates — 2026-05-29 — Python

Issue: #16
Date: 2026-05-29
Language: Python
Status: PENDING_SELECTION

## Repo 1 — dograh-hq/dograh

### Candidate 1 (most important)

- file_path: api/services/campaign/circuit_breaker.py
- snippet_url: https://github.com/dograh-hq/dograh/blob/main/api/services/campaign/circuit_breaker.py
- reasoning: This is the campaign safety mechanism — the atomic Lua sliding-window trip logic is the single most consequential piece of code in the repo, as a bug here would either silently allow runaway campaigns to make unlimited failing calls or incorrectly pause healthy ones.

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

### Candidate 2

- file_path: api/services/campaign/rate_limiter.py
- snippet_url: https://github.com/dograh-hq/dograh/blob/main/api/services/campaign/rate_limiter.py
- reasoning: The phone-number pool acquisition logic combines stale-entry cleanup and random selection in a single atomic Lua script — a non-obvious design that prevents two concurrent campaign workers from grabbing the same caller ID while also self-healing numbers stuck in-use by crashed workers.

```python
lua_script = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local stale_cutoff = tonumber(ARGV[2])

-- Clean stale entries: score > 0 and score < stale_cutoff
local stale = redis.call(
    'ZRANGEBYSCORE', key, 1, stale_cutoff
)
for i, member in ipairs(stale) do
    redis.call('ZADD', key, 0, member)
end

-- Find all available numbers (score == 0)
local available = redis.call(
    'ZRANGEBYSCORE', key, 0, 0
)
if #available == 0 then
    return nil
end

-- Pick random for uniform distribution
local idx = math.random(#available)
local chosen = available[idx]

-- Mark as in-use with current timestamp
redis.call('ZADD', key, now, chosen)
return chosen
"""

result = await redis_client.eval(
    lua_script, 1, key, now, stale_cutoff
)
```

### Candidate 3 (least important)

- file_path: api/services/integrations/tuner/collector.py
- snippet_url: https://github.com/dograh-hq/dograh/blob/main/api/services/integrations/tuner/collector.py
- reasoning: The frame deduplication logic here is subtle — it uses a bounded `deque` as a sliding eviction window to cap memory of a `set` that tracks processed frame IDs, a pattern that avoids unbounded growth during long calls without losing dedup correctness within the window.

```python
async def on_push_frame(self, data: FramePushed):
    if data.direction != FrameDirection.DOWNSTREAM:
        return

    if data.frame.id in self._processed_frames:
        return

    self._processed_frames.add(data.frame.id)
    self._frame_history.append(data.frame.id)
    if len(self._processed_frames) > len(self._frame_history):
        self._processed_frames = set(self._frame_history)

    frame = data.frame

    # data.timestamp is pipeline-relative (ns since start).
    # Convert to absolute ns for the accumulator.
    if self._pipeline_start_rel_ns is None:
        self._pipeline_start_rel_ns = data.timestamp
    timestamp_ns = self._acc.call_start_abs_ns + (
        data.timestamp - self._pipeline_start_rel_ns
    )

    if isinstance(frame, StartFrame):
        self._acc.on_start(timestamp_ns)
    elif isinstance(frame, FunctionCallInProgressFrame):
        self._acc.on_function_call_in_progress(
            frame, timestamp_ns
        )
    elif isinstance(frame, FunctionCallResultFrame):
        self._acc.on_function_call_result(
            frame.tool_call_id, timestamp_ns
        )
    elif isinstance(frame, MetricsFrame):
        self._acc.on_metrics_frame(frame)
    elif isinstance(frame, UserStartedSpeakingFrame):
        self._acc.on_user_started_speaking(timestamp_ns)
    elif isinstance(frame, UserStoppedSpeakingFrame):
        self._acc.on_user_stopped_speaking(timestamp_ns)
        self._acc.on_user_turn_stopped(timestamp_ns)
    elif isinstance(frame, BotStartedSpeakingFrame):
        self._acc.on_bot_started_speaking(timestamp_ns)
    elif isinstance(frame, BotStoppedSpeakingFrame):
        self._acc.on_bot_stopped(timestamp_ns)
    elif isinstance(frame, VADUserStoppedSpeakingFrame):
        self._acc.on_vad_stopped(timestamp_ns)
    elif isinstance(frame, (CancelFrame, EndFrame)):
        self._acc.on_call_end(timestamp_ns)
```

## Repo 2 — st-tech/ppf-contact-solver

### Candidate 1 (most important)

- file_path: frontend/_scene_.py
- snippet_url: https://github.com/st-tech/ppf-contact-solver/blob/main/frontend/_scene_.py
- reasoning: This is the heart of the scene compiler — it shows the non-obvious two-pass param replication that mirrors the Rust kernel's exact element-layout order (rods → pure shells → SOLID surface tris), where any deviation silently mis-pairs material parameters with elements.

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

### Candidate 2

- file_path: frontend/_scene_fixed_.py
- snippet_url: https://github.com/st-tech/ppf-contact-solver/blob/main/frontend/_scene_fixed_.py
- reasoning: This validation block in `FixedScene.__init__` filters static colliders to single-keyframe entries, then dispatches a single Rust BVH call covering self-intersection, rod-triangle, contact-offset, wall, and sphere checks simultaneously — revealing how the Python layer gates simulation safety before any solver ever runs.

```python
        def _wall_static_entry(w):
            entry = w.get_entry()
            if not entry or len(entry) > 1:
                return None
            return (
                list(entry[0][0]),
                list(getattr(w, "normal", [0.0, 1.0, 0.0])),
            )

        wall_data = [
            d for d in (
                _wall_static_entry(w) for w in wall
            ) if d is not None
        ]

        def _sphere_static_entry(s):
            entry = s.get_entry()
            if not entry or len(entry) > 1:
                return None
            pos, radius, _ = entry[0]
            return (
                list(pos),
                float(radius),
                bool(s.is_inverted),
                bool(s.is_hemisphere),
            )

        sphere_data = [
            d for d in (
                _sphere_static_entry(s) for s in sphere
            ) if d is not None
        ]

        pinned_list = (
            [int(i) for i in pinned_vertices]
            if pinned_vertices else []
        )

        result = _rust.scene_fixed_scene_assemble(
            np.ascontiguousarray(
                self._vert[0], dtype=np.uint32
            ),
            np.ascontiguousarray(
                self._vert[1], dtype=np.float64
            ),
            np.ascontiguousarray(
                self._displacement, dtype=np.float64
            ),
            np.ascontiguousarray(
                self._tri, dtype=np.int32
            ) if n_tris > 0
            else np.zeros((0, 3), dtype=np.int32),
            np.ascontiguousarray(
                self._rod, dtype=np.int32
            ) if n_rods > 0
            else np.zeros((0, 2), dtype=np.int32),
            np.ascontiguousarray(
                tri_is_collider, dtype=bool
            ),
            np.ascontiguousarray(
                rod_is_collider, dtype=bool
            ),
            list(tri_offset) if tri_offset else [],
            list(rod_offset) if rod_offset else [],
            pinned_list,
            wall_data,
            sphere_data,
            bool(self._has_dyn_color),
        )

        self._has_self_intersection = bool(
            result["has_self_intersection"]
        )
        self._has_contact_offset_violation = bool(
            result["has_contact_offset_violation"]
        )
        n_self = int(
            result.get("n_self_intersections_total", 0)
        )
        n_tri_tri = int(result.get("n_tri_tri", 0))
        n_rod_tri = int(result.get("n_rod_tri", 0))
        n_off = int(
            result.get("n_contact_offset_total", 0)
        )
        if n_self == 0 and n_off == 0:
            print(
                "scene checks: clean "
                "(0 self-intersections, "
                "0 contact-offset)"
            )
        else:
            parts = []
            if n_self > 0:
                parts.append(
                    f"{n_self} self-intersections "
                    f"({n_tri_tri} tri-tri, "
                    f"{n_rod_tri} rod-tri)"
                )
            if n_off > 0:
                parts.append(
                    f"{n_off} contact-offset violations"
                )
            print(
                f"scene checks found: "
                f"{'; '.join(parts)}"
            )
        all_violations = result["violations"]
        if all_violations:
            raise ValidationError(
                result["combined_message"],
                violations=all_violations,
            )
```

### Candidate 3 (least important)

- file_path: frontend/_scene_pin_.py
- snippet_url: https://github.com/st-tech/ppf-contact-solver/blob/main/frontend/_scene_pin_.py
- reasoning: The `PinHolder.move_to()` singleton-target expansion reveals a subtle coordinate-space decision: when a single target position is given for a multi-vertex pin, the method resolves the delta relative to the object's centroid and broadcasts it per-vertex — a design that is easy to misread as a simple absolute-position setter.

```python
    def move_to(
        self,
        target_pos,
        t_start: float = 0.0,
        t_end: float = 1.0,
        transition: Optional[str] = None,
        bezier_handles=None,
    ) -> "PinHolder":
        target_pos = np.asarray(
            target_pos, dtype=np.float64
        ).reshape((-1, 3))

        if len(target_pos) == 1:
            # Singleton-target: resolve against the
            # object's current position. This depends
            # on `self._obj`, which lives only on the
            # Python side, so we expand here before
            # forwarding the resolved (N, 3) array to
            # the Rust mirror.
            initial_vertices = (
                self._obj.vertex(False)[self._data.index]
            )
            current_center = np.array(
                self._obj.position
            )
            delta = target_pos[0] - current_center
            target_pos = initial_vertices + delta
        elif len(target_pos) != len(self.index):
            raise Exception(
                "target_pos must have the same "
                "length as pin"
            )

        if t_end <= t_start:
            raise Exception(
                "t_end must be greater than t_start"
            )

        self._rust.move_to(
            target_pos, t_start, t_end,
            transition, bezier_handles,
        )
        self._data.operations.append(
            MoveToOperation(
                target=target_pos,
                t_start=t_start,
                t_end=t_end,
                transition=(
                    transition
                    if transition
                    else self._data.transition
                ),
                bezier_handles=bezier_handles,
            )
        )
        return self
```
