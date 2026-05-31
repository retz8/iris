# Breakdown Review — 2026-03-21 — Python

Issue: #6
Date: 2026-03-21
Language: Python
Status: PENDING_APPROVAL

## Repo 1 — karpathy/autoresearch

- file_path: prepare.py
- snippet_url: https://github.com/karpathy/autoresearch/blob/master/prepare.py

file_intent: BPB evaluation metric calculator
breakdown_what: Runs fixed-step validation over a dataloader, computing cross-entropy loss per token, then aggregates total nats and byte counts — excluding zero-byte special tokens — to return bits-per-byte, a vocabulary-size-independent evaluation metric.
breakdown_responsibility: Serves as the research agent's evaluation oracle — every experiment's keep-or-discard decision hinges on whether BPB improves. Because BPB normalizes by byte count rather than token count, results stay comparable even when the agent experiments with different tokenizers or sequence lengths.
breakdown_clever: The masking is multiplicative — `loss_flat * mask` rather than a conditional filter — so both the nats sum and byte count zero out special tokens in a single vectorized pass with no branching, keeping the computation fully on-GPU without any fallback to host-side filtering.
project_context: Karpathy's autoresearch is a 630-line Python script that puts an AI agent in charge of running ML training experiments autonomously overnight on a single GPU, iterating code modifications to train.py and judging each change by whether BPB improves.

### Reformatted Snippet

```python
@torch.no_grad()
def evaluate_bpb(model, tokenizer, batch_size):
    """
    Bits per byte (BPB): vocab size-independent metric.
    Sums per-token cross-entropy (in nats), sums target
    byte lengths, then converts nats/byte to bits/byte.
    Special tokens (byte length 0) are excluded from
    both sums. Uses fixed MAX_SEQ_LEN so results are
    comparable across configs.
    """
    token_bytes = get_token_bytes(device="cuda")
    val_loader = make_dataloader(
        tokenizer, batch_size, MAX_SEQ_LEN, "val"
    )
    steps = EVAL_TOKENS // (batch_size * MAX_SEQ_LEN)
    total_nats = 0.0
    total_bytes = 0
    for _ in range(steps):
        x, y, _ = next(val_loader)
        loss_flat = model(
            x, y, reduction='none'
        ).view(-1)
        y_flat = y.view(-1)
        nbytes = token_bytes[y_flat]
        mask = nbytes > 0
        total_nats += (loss_flat * mask).sum().item()
        total_bytes += nbytes.sum().item()
    return total_nats / (math.log(2) * total_bytes)
```

## Repo 2 — bytedance/deer-flow

- file_path: backend/app/channels/manager.py
- snippet_url: https://github.com/bytedance/deer-flow/blob/main/backend/app/channels/manager.py

file_intent: LLM stream text merge utility
breakdown_what: Normalizes streaming LLM text into a single growing snapshot by detecting whether an incoming chunk is a cumulative replacement, a duplicate, or a new delta, then applying the correct merge — replace, no-op, or append — without any external state.
breakdown_responsibility: Called by the channel manager to maintain a consistent accumulated text snapshot as model output arrives, ensuring multiple sub-agents reading the same stream never see duplicated or garbled text regardless of whether the upstream model sends deltas or cumulative chunks.
breakdown_clever: The `chunk.startswith(existing)` branch silently handles cumulative streaming APIs — models that resend the full output so far on each event rather than just the new fragment. Without it, switching to such an API would produce exponentially growing duplicate text, a bug invisible until you change the upstream model.
project_context: ByteDance's DeerFlow is an open-source SuperAgent framework that orchestrates parallel sub-agents, Docker-sandboxed code execution, and persistent memory to complete complex multi-hour tasks — research, data analysis, and content generation — across any OpenAI-compatible model API.

### Reformatted Snippet

```python
def _merge_stream_text(existing: str, chunk: str) -> str:
    """Merge delta or cumulative text into one snapshot."""
    if not chunk:
        return existing
    if not existing or chunk == existing:
        return chunk or existing
    if chunk.startswith(existing):
        return chunk
    if existing.endswith(chunk):
        return existing
    return existing + chunk
```
