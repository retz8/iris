# Breakdown Review — 2026-10-23 — Python

Issue: #36
Date: 2026-10-23
Language: Python
Status: COMPLETED

## Repo 1 — Comfy-Org/ComfyUI

- file_path: comfy/samplers.py
- snippet_url: https://github.com/Comfy-Org/ComfyUI/blob/master/comfy/samplers.py#L128-L146

file_intent: Conditioning batch-concat compatibility check
breakdown_what: Compares two conditioning objects' input tensor shapes, checks whether their control and patch references are either both None or the exact same object, and confirms conditioning sizes match before allowing batch concatenation.
breakdown_responsibility: Sits inside ComfyUI's sampler batching logic, gating whether multiple queued denoising conditions can merge into one batched model call; the decision directly shapes GPU throughput during diffusion sampling steps.
breakdown_clever: The identity check (`is not obj2`) rather than equality means control/patch objects must be the literal same reference to batch — two functionally identical ControlNet instances won't concatenate, silently forcing separate, slower inference passes.
project_context: ComfyUI is a node-based, open-source interface for building Stable Diffusion pipelines without code, used by artists, researchers, and developers to generate images, video, and audio locally with fine-grained control over the process.

### Reformatted Snippet

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

## Repo 2 — Kruk2/jasna

- file_path: jasna/media/splice.py
- snippet_url: https://github.com/Kruk2/jasna/blob/main/jasna/media/splice.py#L360-L377

file_intent: Video codec keyframe-safety detector
breakdown_what: Checks whether a compressed video packet is a safe splice or seek point by inspecting its NAL unit types: AV1 is always treated as safe, H.264 needs an IDR slice (type 5), and other codecs need an IRAP type (16-20).
breakdown_responsibility: Gates jasna's segment-based restoration pipeline, which must cut and restitch video only at frames that decode cleanly without earlier frames; splicing on an unsafe packet would corrupt playback or crash the decoder.
breakdown_clever: AV1 always returns True without inspecting any NAL types at all, a quirk of how AV1 structures its access units compared to H.264/HEVC — so the function silently trusts the caller for AV1 input while rigorously validating everything else.
project_context: Jasna is a free, GPU-based tool that detects mosaic-censored regions in video and restores them frame by frame, offered as both a GUI and a command-line tool with swappable restoration models.

### Reformatted Snippet

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
    return any(
        16 <= nal_type <= 20
        for nal_type in nal_types
    )
```
