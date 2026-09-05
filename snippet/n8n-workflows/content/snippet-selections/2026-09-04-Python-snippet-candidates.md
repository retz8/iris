# Snippet Candidates — 2026-09-04 — Python

Issue: #29
Date: 2026-09-04
Language: Python
Status: PENDING_SELECTION

## Repo 1 — google-research/timesfm

### Candidate 1 (most important)

- file_path: src/timesfm3/transformer.py
- snippet_url: https://github.com/google-research/timesfm/blob/master/src/timesfm3/transformer.py
- reasoning: `MixingTransformer.forward` is the architectural heart of TimesFM3 — it fuses sequence-axis and variate-axis multi-head attention in a single layer, enabling multivariate forecasting by first attending across time patches (reshaping to `b*v, n, d`) then across variates (reshaping to `b*n, v, d`), a dual-axis design not found in single-variate transformers.

```python
  def forward(
    self,
    input_embeddings: torch.Tensor,
    patch_mask: torch.Tensor,
    segment_ids: torch.Tensor | None = None,
    segment_pos: torch.Tensor | None = None,
    decode_cache: util.DecodeCache | None = None,
    var_segment_pos: torch.Tensor | None = None,
  ) -> tuple[torch.Tensor, util.DecodeCache | None, torch.Tensor]:
    """Forward pass.

    Args:
      input_embeddings: Shape (b, v, n, d).
      patch_mask: Shape (b, v, n). True = masked.
      segment_ids: Shape (b, n). Optional.
      segment_pos: Shape (b, n). Optional.
      decode_cache: Optional KV cache.
      var_segment_pos: Shape (b*n, v). Optional variate positions.

    Returns:
      (output_embeddings, updated_cache, seq_attn_mask).
    """
    b, v, n, d = input_embeddings.shape

    # --- Sequence Attention ---
    seq_attn_in = self.pre_seq_attn_ln(input_embeddings)
    # (b, v, n, d) -> (b*v, n, d)
    seq_attn_in_flat = seq_attn_in.reshape(b * v, n, d)
    patch_mask_flat = patch_mask.reshape(b * v, n)

    # Broadcast segment_ids/pos across variates
    seq_seg_ids_flat = None
    if segment_ids is not None:
      seg_ids_bvn = segment_ids.unsqueeze(1).expand(b, v, n)
      seq_seg_ids_flat = seg_ids_bvn.reshape(b * v, n)

    seq_seg_pos_flat = None
    if segment_pos is not None:
      seg_pos_bvn = segment_pos.unsqueeze(1).expand(b, v, n)
      seq_seg_pos_flat = seg_pos_bvn.reshape(b * v, n)

    seq_attn_out_flat, decode_cache, seq_attn_mask = self.seq_attn(
      seq_attn_in_flat,
      segment_ids=seq_seg_ids_flat,
      segment_pos=seq_seg_pos_flat,
      decode_cache=decode_cache,
      patch_mask=patch_mask_flat,
    )
    seq_attn_out = seq_attn_out_flat.view(b, v, n, d)
    h1 = self.post_seq_attn_ln(seq_attn_out) + input_embeddings

    # --- Variate Attention ---
    if self.use_variate_attention:
      var_attn_in = self.pre_var_attn_ln(h1)
      # (b, v, n, d) -> (b*n, v, d)
      var_attn_in_flat = (
        var_attn_in.permute(0, 2, 1, 3).reshape(b * n, v, d)
      )
      # Mask: (b, v, n) -> (b, n, v) -> (b*n, v)
      var_patch_mask = patch_mask.permute(0, 2, 1).reshape(b * n, v)

      var_attn_out_flat, _, _ = self.var_attn(
        var_attn_in_flat,
        segment_pos=var_segment_pos,
        decode_cache=None,
        patch_mask=var_patch_mask,
      )
      # (b*n, v, d) -> (b, n, v, d) -> (b, v, n, d)
      var_attn_out = (
        var_attn_out_flat.view(b, n, v, d).permute(0, 2, 1, 3)
      )
      h2 = self.post_var_attn_ln(var_attn_out) + h1
    else:
      h2 = h1

    # --- FeedForward ---
    ff_out = self.ff1(
      self.activation(self.ff0(self.pre_ff_ln(h2)))
    )
    output_embeddings = self.post_ff_ln(ff_out) + h2

    return output_embeddings, decode_cache, seq_attn_mask
```

### Candidate 2

- file_path: src/timesfm3/cpm_revin_refine.py
- snippet_url: https://github.com/google-research/timesfm/blob/master/src/timesfm3/cpm_revin_refine.py
- reasoning: This function implements a genuinely novel iterative algorithm — for each CPM-masked input patch it uses the model's own median-quantile prediction from preceding masked patches to update the RevIN running statistics, so each successive masked patch is denormalized with progressively better-informed stats rather than the frozen stats from the last observed patch.

```python
def cpm_iterative_revin_refine(
  raw_logits: torch.Tensor,
  revin_n: torch.Tensor,
  revin_mu: torch.Tensor,
  revin_sigma: torch.Tensor,
  patch_cpm_mask: torch.Tensor,
  median_q_idx: int,
  rolls: int,
  patch_len: int,
  num_quantiles: int,
  value_clip: float = 1e9,
) -> tuple[torch.Tensor, torch.Tensor]:
  """Refines RevIN stats at CPM-masked patches via iterative estimation.

  For each CPM-masked position p the currently frozen stats (from the
  last observed patch before the CPM region) are replaced with stats
  that also incorporate model-estimated values for all CPM patches
  that precede p.
  """
  b, v, n_patches, _ = raw_logits.shape
  device = raw_logits.device

  # Reshape logits to keep only the median quantile.
  # (b,v,n,oq) -> (b,v,n,rolls,patch_len,num_quantiles)
  #             -> (b,v,n,rolls,patch_len)
  median_logits = raw_logits.reshape(
    b, v, n_patches, rolls, patch_len, num_quantiles
  )[:, :, :, :, :, median_q_idx]

  carry_n = torch.zeros((b, v), dtype=torch.float32, device=device)
  carry_mu = torch.zeros((b, v), dtype=torch.float32, device=device)
  carry_sigma = torch.zeros((b, v), dtype=torch.float32, device=device)
  anchor_predicted_values = torch.zeros(
    (b, v, rolls, patch_len), dtype=torch.float32, device=device
  )
  block_offset = torch.zeros((b,), dtype=torch.long, device=device)

  refined_mu_list = []
  refined_sigma_list = []
  step_masks = torch.zeros(
    (b, v, patch_len), dtype=torch.bool, device=device
  )

  for i in range(n_patches):
    actual_n = revin_n[:, :, i]
    actual_mu = revin_mu[:, :, i]
    actual_sigma = revin_sigma[:, :, i]
    current_step_logits = median_logits[:, :, i]
    is_cpm = patch_cpm_mask[:, i : i + 1]  # (b, 1)

    # Select the block_offset[b]-th patch for each batch element
    offset_onehot = torch.eq(
      torch.arange(rolls, device=device).unsqueeze(0),
      block_offset.unsqueeze(1),
    ).float()
    predicted_values_step = torch.einsum(
      "br,bvrp->bvp", offset_onehot, anchor_predicted_values
    )

    new_n, new_mu, new_sigma = util.update_running_stats(
      carry_n, carry_mu, carry_sigma, predicted_values_step, step_masks
    )

    out_n = torch.where(is_cpm, new_n, actual_n)
    out_mu = torch.where(is_cpm, new_mu, actual_mu)
    out_sigma = torch.where(is_cpm, new_sigma, actual_sigma)

    # Advance block_offset: +1 (mod rolls) for CPM, 0 for non-CPM.
    new_block_offset = torch.where(
      is_cpm.squeeze(-1),
      (block_offset + 1) % rolls,
      torch.zeros_like(block_offset),
    )
    should_update_anchor = torch.eq(new_block_offset, 0)

    step_predicted_values = util.revin(
      current_step_logits, out_mu, out_sigma, reverse=True
    )
    step_predicted_values = torch.clamp(
      step_predicted_values, -value_clip, value_clip
    )
    new_anchor_predicted_values = torch.where(
      should_update_anchor.view(b, 1, 1, 1),
      step_predicted_values,
      anchor_predicted_values,
    )

    carry_n = out_n
    carry_mu = out_mu
    carry_sigma = out_sigma
    anchor_predicted_values = new_anchor_predicted_values
    block_offset = new_block_offset

    refined_mu_list.append(out_mu)
    refined_sigma_list.append(out_sigma)

  refined_mu = torch.stack(refined_mu_list, dim=2)
  refined_sigma = torch.stack(refined_sigma_list, dim=2)
  return refined_mu, refined_sigma
```

### Candidate 3 (least important)

- file_path: src/timesfm3/normalization.py
- snippet_url: https://github.com/google-research/timesfm/blob/master/src/timesfm3/normalization.py
- reasoning: `PerDimScale` replaces the fixed `1/sqrt(d)` attention query scaling with a per-head-dimension learnable softplus-gated scale, initialized so it matches fixed scaling at step zero — a small but instructive technique for giving the model control over how much each attention dimension contributes to logit magnitude.

```python
_RECIPROCAL_OF_SOFTPLUS_0 = 1.442695041


class PerDimScale(nn.Module):
  """Per-dimension scaling (Pax-style).

  Replaces the standard 1/sqrt(d) query scaling with a learnable:
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

### Candidate 1 (most important)

- file_path: src/soup_cli/registry/hashing.py
- snippet_url: https://github.com/MakazhanAlpamys/Soup/blob/main/src/soup_cli/registry/hashing.py
- reasoning: Every training recipe pushed to the registry goes through `hash_entry`, which calls `hash_file` to content-address large data files by streaming them in 1 MB chunks — the chunked-read pattern lets arbitrarily large datasets flow through SHA-256 without ever loading them into memory, and the docstring's distinction between `None` and `""` for `data_path` is a subtle API contract worth studying.

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

### Candidate 2

- file_path: src/soup_cli/config/loader.py
- snippet_url: https://github.com/MakazhanAlpamys/Soup/blob/main/src/soup_cli/config/loader.py
- reasoning: This function shows a layered config-loading pipeline — empty-file guard, then a custom unknown-key scan before Pydantic even runs, then per-field error formatting on `ValidationError` — demonstrating how to give CLI users precise, actionable feedback instead of raw tracebacks.

```python
def load_config(path: "Path | str") -> SoupConfig:
    """Load a soup.yaml file and return validated SoupConfig."""
    path = Path(path)
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))

    if raw is None:
        console.print("[red]Config file is empty[/]")
        raise SystemExit(1)

    unknown_error = _report_unknown_keys(raw)
    if unknown_error is not None:
        console.print("[red bold]Config validation error:[/]\n")
        console.print(f"  [red]{unknown_error}[/]")
        raise SystemExit(1)

    try:
        config = SoupConfig(**raw)
    except ValidationError as e:
        console.print("[red bold]Config validation error:[/]\n")
        for err in e.errors():
            loc = " -> ".join(str(part) for part in err["loc"])
            console.print(f"  [red]{loc}:[/] {err['msg']}")
        raise SystemExit(1)

    return config
```

### Candidate 3 (least important)

- file_path: src/soup_cli/registry/store.py
- snippet_url: https://github.com/MakazhanAlpamys/Soup/blob/main/src/soup_cli/registry/store.py
- reasoning: Every registry read and write flows through this lazy-initialised connection, and the two PRAGMAs it sets — WAL journal mode (allows concurrent reads during a write) and foreign keys (off by default in SQLite) — are correctness-critical settings that many SQLite-in-Python projects silently omit.

```python
def _get_conn(self) -> sqlite3.Connection:
    if self._conn is None:
        self._conn = sqlite3.connect(str(self.db_path))
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA foreign_keys=ON")
    return self._conn
```
