# Breakdown Review — 2026-09-18 — C/C++

Issue: #31
Date: 2026-09-18
Language: C/C++
Status: PENDING_APPROVAL

## Repo 1 — google/perfetto

- file_path: src/trace_processor/util/galloping_search.h
- snippet_url: https://github.com/google/perfetto/blob/main/src/trace_processor/util/galloping_search.h

file_intent: Batched galloping lower-bound search
breakdown_what: Looks up the sorted insertion position for a batch of keys against an internal sorted array, finding the first key via binary search then using each result's position as the starting point to gallop forward to the next key's position.
breakdown_responsibility: Powers range and point lookups in Perfetto's trace processor over large sorted columns of trace events, where query keys (e.g. timestamps) arrive already sorted — letting SQL queries over gigabyte-scale traces resolve row positions without a full binary search per key.
breakdown_clever: Only the first key gets a full binary search (LowerBound); every later key calls GallopForward from the previous result instead of searching from scratch, exploiting sortedness in both arrays to turn repeated O(log n) lookups into near-constant-time steps.
project_context: Perfetto is Google's open-source tracing and performance-analysis suite that ships as the default system tracer on Android, used to diagnose slow app startups, dropped frames, and memory issues, and also serves C/C++ developers on Linux, macOS, and Windows.

### Reformatted Snippet

```cpp
void BatchedLowerBound(const int64_t* keys,
                       uint32_t num_keys,
                       uint32_t* results) const {
  if (n_ == 0) {
    for (uint32_t i = 0; i < num_keys; ++i) {
      results[i] = 0;
    }
    return;
  }
  uint32_t pos = LowerBound(0, n_, keys[0]);
  results[0] = pos;
  for (uint32_t i = 1; i < num_keys; ++i) {
    pos = GallopForward(pos, keys[i]);
    results[i] = pos;
  }
}
```

## Repo 2 — Neroued/ninfer

- file_path: src/core/decode_graph.cpp
- snippet_url: https://github.com/Neroued/ninfer/blob/master/src/core/decode_graph.cpp

file_intent: CUDA graph capture wrapper
breakdown_what: Wraps a block of CUDA stream operations in cudaStreamBeginCapture/EndCapture to record them as a replayable CUDA graph, cleanly rolling back the capture if the recorded body throws or the capture itself fails, instead of leaving the stream half-captured.
breakdown_responsibility: Builds the one-time graph that ninfer replays on every later decode step of token generation, since re-capturing per-step would defeat the purpose — CUDA graphs amortize kernel-launch overhead only when one captured sequence of GPU ops is replayed many times.
breakdown_clever: If body() throws mid-capture, the stream is left in an active-capture state that corrupts any later attempt if ignored — the catch block explicitly discards the capture before rethrowing, and even a failed cudaStreamEndCapture destroys its graph rather than leaking it.
project_context: ninfer is a from-scratch C++/CUDA inference engine purpose-built to run Qwen3 MoE model checkpoints at maximum throughput on a single RTX 5090, exposing an OpenAI/Anthropic-compatible HTTP API for self-hosted inference.

### Reformatted Snippet

```cpp
void DecodeGraphDefinition::capture(
    cudaStream_t stream,
    const std::function<void()>& body) {
  nvtx::ScopedRange capture_range(
      nvtx::Name::CudaGraphCapture,
      nvtx::Category::Graph);
  reset();
  CUDA_CHECK(cudaStreamBeginCapture(
      stream,
      cudaStreamCaptureModeThreadLocal));
  try {
    body();
  } catch (...) {
    discard_capture(stream);
    throw;
  }
  cudaGraph_t graph = nullptr;
  cudaError_t err =
      cudaStreamEndCapture(stream, &graph);
  if (err != cudaSuccess) {
    destroy_graph(graph);
    CUDA_CHECK(err);
  }
  graph_ = graph;
}
```
