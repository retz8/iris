# Breakdown Review — 2026-09-18 — C/C++

Issue: #31
Date: 2026-09-18
Language: C/C++
Status: COMPLETED

## Repo 1 — google/perfetto

- file_path: src/trace_processor/util/galloping_search.h
- snippet_url: https://github.com/google/perfetto/blob/main/src/trace_processor/util/galloping_search.h

file_intent: Batched galloping lower-bound search
breakdown_what: Performs a batch of lower-bound lookups over a sorted key array, initializing the first search with a standard binary search, then advancing each subsequent search forward from the prior result via exponential galloping instead of restarting from the beginning.
breakdown_responsibility: This header lives inside Perfetto's trace_processor, the SQL query engine that powers trace analysis and the new Data Explorer UI; BatchedLowerBound accelerates repeated timestamp/index lookups over sorted trace event columns during query execution.
breakdown_clever: Reusing the previous match position as the seed for each next search exploits temporal locality in monotonically increasing trace timestamps, turning what looks like N independent O(log n) binary searches into a sequence of much cheaper O(log gap) gallops.
project_context: Perfetto is Google's production-grade tracing and profiling platform that serves as the default system tracer for Android and the Chrome browser, used by app and platform engineers to diagnose slow startups, jank, and memory issues. Its v54.0 release added a visual Data Explorer and deeper integration with Android Performance Analyzer, unveiled at Google I/O 2026.

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
breakdown_what: Captures a sequence of CUDA operations issued inside a callback into a reusable CUDA graph, wrapping cudaStreamBeginCapture and cudaStreamEndCapture with NVTX profiling markers, exception-safe cleanup on capture failure, and graph destruction when the capture itself errors.
breakdown_responsibility: Within ninfer's single-GPU decode pipeline for Qwen3 MoE models, this capture step turns the many small per-token kernel launches of autoregressive decoding into one replayable CUDA graph, removing launch overhead that otherwise caps achievable tokens-per-second on a single RTX 5090.
breakdown_clever: Even when cudaStreamEndCapture itself fails, the call can still hand back a non-null (partial) graph object; the code destroys it before raising via CUDA_CHECK, because leaving that handle unfreed leaks GPU memory that a simple error-and-return would silently miss.
project_context: ninfer is a from-scratch C++/CUDA inference engine hard-locked to a single Qwen3 MoE checkpoint and a single RTX 5090, exposing an OpenAI/Anthropic-compatible HTTP API; it reports up to roughly 700 decode tokens/sec by trading model and hardware flexibility for maximum single-GPU throughput, a trade-off documented in independent community benchmarking write-ups.

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
