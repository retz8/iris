# Breakdown Review — 2026-09-04 — Python

Issue: #29
Date: 2026-09-04
Language: Python
Status: PENDING_APPROVAL

## Repo 1 — google-research/timesfm

- file_path: src/timesfm3/normalization.py
- snippet_url: https://github.com/google-research/timesfm/blob/master/src/timesfm3/normalization.py

file_intent: Learnable per-dimension attention scaler
breakdown_what: Defines a learned attention scaling module that replaces the static 1/sqrt(d) normalization used in standard transformers. Each of the d query dimensions gets its own trainable scalar, initialized so the net scaling matches 1/sqrt(d) at startup.
breakdown_responsibility: Used in TimesFM's attention mechanism to let the model discover which query dimensions deserve stronger or weaker scaling — a more expressive alternative to the single global sqrt(d) divisor that vanilla transformers share across all heads.
breakdown_clever: The constant `_RECIPROCAL_OF_SOFTPLUS_0 ≈ 1.4427` exactly cancels `softplus(0) ≈ 0.693`, so freshly initialized parameters produce scale = 1/sqrt(d) — zero-init is not just convenient but a mathematically precise warm-start that makes training stable from the first step.
project_context: TimesFM is Google's pretrained time-series foundation model for zero-shot forecasting, used by engineers to predict demand, energy consumption, and disease outbreaks without collecting domain-specific training data.

### Reformatted Snippet

```python
_RECIPROCAL_OF_SOFTPLUS_0 = 1.442695041


class PerDimScale(nn.Module):
  """Per-dimension scaling (Pax-style).

  Replaces the standard 1/sqrt(d) query
  scaling with a learnable:
    scale = RECIPROCAL_OF_SOFTPLUS_0
            / sqrt(num_dims)
            * softplus(per_dim_scale)

  per_dim_scale is initialized to zeros, so at init time
  softplus(0) ≈ 0.693 and the net scale is close to 1/sqrt(d).
  """

  def __init__(self, num_dims: int):
    super().__init__()
    self.num_dims = num_dims
    self.per_dim_scale = nn.Parameter(torch.zeros(num_dims))

  def forward(self, x: torch.Tensor) -> torch.Tensor:
    """Applies per-dim scaling to the last dimension of x."""
    return (
      x
      * _RECIPROCAL_OF_SOFTPLUS_0
      / math.sqrt(self.num_dims)
      * torch.nn.functional.softplus(self.per_dim_scale)
    )
```

## Repo 2 — MakazhanAlpamys/Soup

- file_path: src/soup_cli/registry/hashing.py
- snippet_url: https://github.com/MakazhanAlpamys/Soup/blob/main/src/soup_cli/registry/hashing.py

file_intent: Content-addressed file identity hasher
breakdown_what: Computes a SHA-256 digest over a file's full binary contents using fixed-size streaming chunks, returning a hex string. Validates that the path exists and is a regular file before opening.
breakdown_responsibility: Powers Soup's model registry by producing a deterministic, collision-resistant fingerprint for any file on disk, enabling the tool to detect whether a checkpoint or dataset has changed without loading it fully into memory.
breakdown_clever: Streaming via `_HASH_CHUNK_BYTES` means a 70 GB model weight file never fully enters RAM — the digest accumulates in a fixed rolling window, making it safe to run on the same 4 GB laptop GPU that Soup targets for fine-tuning.
project_context: Soup is an open-source LLM fine-tuning tool that lets developers train and post-train models from a single YAML config using layer streaming, enabling fine-tuning of 8B-parameter models on a 4 GB laptop GPU without cloud infrastructure.

### Reformatted Snippet

```python
def hash_file(path: str) -> str:
    """SHA-256 of a file's contents, streamed in 1 MB chunks."""
    file_path = Path(path)
    if not file_path.exists() or not file_path.is_file():
        raise FileNotFoundError(f"File not found: {path}")
    digest = hashlib.sha256()
    with file_path.open("rb") as fh:
        while True:
            chunk = fh.read(_HASH_CHUNK_BYTES)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()
```
