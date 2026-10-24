# Snippet Candidates — 2026-10-23 — Python

Issue: #36
Date: 2026-10-23
Language: Python
Status: COMPLETED

## Repo 1 — Comfy-Org/ComfyUI

### Candidate 1 (most important)

- file_path: comfy_execution/graph.py
- snippet_url: https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_execution/graph.py#L207-L212
- reasoning: This is the dependency-unblocking step of ComfyUI's topological-sort execution scheduler — the node-graph engine that is the project's core architectural differentiator and what makes its selective re-execution/caching possible.

```python
def pop_node(self, unique_id):
    del self.pendingNodes[unique_id]
    for blocked_node_id in self.blocking[unique_id]:
        self.blockCount[blocked_node_id] -= 1
    del self.blocking[unique_id]
    self.externalBlockResults.pop(unique_id, None)
```

### Candidate 2

- file_path: comfy/samplers.py
- snippet_url: https://github.com/Comfy-Org/ComfyUI/blob/master/comfy/samplers.py#L128-L146
- reasoning: This decides whether two conditioning batches can be merged before a diffusion sampling step, the batching optimization underlying ComfyUI's actual inference performance.

```python
def can_concat_cond(c1, c2):
    if c1.input_x.shape != c2.input_x.shape:
        return False

    def objects_concatable(obj1, obj2):
        if (obj1 is None) != (obj2 is None):
            return False
        if obj1 is not None:
            if obj1 is not obj2:
                return False
        return True

    if not objects_concatable(c1.control, c2.control):
        return False

    if not objects_concatable(c1.patches, c2.patches):
        return False

    return cond_equal_size(c1.conditioning, c2.conditioning)
```

### Candidate 3 (least important)

- file_path: comfy/utils.py
- snippet_url: https://github.com/Comfy-Org/ComfyUI/blob/master/comfy/utils.py#L1445-L1453
- reasoning: A small but non-obvious utility that packs variable-shaped latents into one tensor for later unpacking, used by batched/mixed-resolution latent workflows.

```python
def pack_latents(latents):
    latent_shapes = []
    tensors = []
    for tensor in latents:
        latent_shapes.append(tensor.shape)
        tensors.append(tensor.reshape(tensor.shape[0], 1, -1))

    latent = torch.cat(tensors, dim=-1)
    return latent, latent_shapes
```

## Repo 2 — Kruk2/jasna

### Candidate 1 (most important)

- file_path: jasna/media/splice.py
- snippet_url: https://github.com/Kruk2/jasna/blob/main/jasna/media/splice.py#L360-L377
- reasoning: Decides whether a packet is a safe stream-copy cut point (inspecting NAL unit types per codec), the core check behind Jasna's "smart render" splicing that only re-encodes touched segments.

```python
def _is_safe_random_access_packet(
    data: bytes,
    codec: str,
    length_size: int,
    *,
    length_prefixed: bool,
) -> bool:
    if codec == "av1":
        return True
    nal_types = _nal_unit_types(
        data,
        codec=codec,
        length_size=length_size,
        length_prefixed=length_prefixed,
    )
    if codec == "h264":
        return 5 in nal_types
    return any(16 <= nal_type <= 20 for nal_type in nal_types)
```

### Candidate 2

- file_path: jasna/vr_projection.py
- snippet_url: https://github.com/Kruk2/jasna/blob/main/jasna/vr_projection.py#L210-L229
- reasoning: Computes the minimal gnomonic field-of-view cone that tightly bounds a region of a half-equirectangular VR180 frame, the projection math underpinning Jasna's distinctive VR180 restoration support.

```python
@lru_cache(maxsize=4096)
def _region_gnomonic_spec(
    u1: float,
    v1: float,
    u2: float,
    v2: float,
) -> tuple[float, float, float]:
    lon0 = ((u1 + u2) * 0.5 - 0.5) * 180.0
    lat0 = (0.5 - (v1 + v2) * 0.5) * 180.0
    extent = 0.0
    for u, v in _perimeter_uv(u1, v1, u2, v2):
        x, y, z = _rotate_inv_scalar(
            _hequirect_uv_to_xyz_scalar(u, v),
            lon0,
            lat0,
        )
        z = z if abs(z) >= 1e-12 else 1e-12
        extent = max(extent, abs(x / z), abs(y / z))
    fov = 2.0 * math.degrees(math.atan(extent))
    return lon0, lat0, fov
```

### Candidate 3 (least important)

- file_path: jasna/media/container_utils.py
- snippet_url: https://github.com/Kruk2/jasna/blob/main/jasna/media/container_utils.py#L31-L53
- reasoning: Picks a compatible subtitle codec to transcode into per output container, a correctness utility for output compatibility rather than the core restoration algorithm.

```python
def subtitle_transcode_codec(
    codec_name: str | None,
    *,
    output_formats: Collection[str],
    supported_codecs: Collection[str],
) -> str | None:
    if not codec_name or codec_name in supported_codecs:
        return None
    try:
        codec = av.Codec(codec_name, "r")
    except ValueError:
        return None
    if not codec.properties & Properties.TEXT_SUB.value:
        return None
    if "webm" in output_formats:
        candidate = "webvtt"
    elif set(output_formats) & {"mp4", "mov"}:
        candidate = "mov_text"
    elif "matroska" in output_formats:
        candidate = "ass"
    else:
        return None
    return candidate if candidate in supported_codecs else None
```
