# Breakdown Review — 2026-04-10 — C/C++

Issue: #9
Date: 2026-04-10
Language: C/C++
Status: PENDING_APPROVAL

## Repo 1 — google-ai-edge/LiteRT-LM

- file_path: runtime/components/constrained_decoding/constrained_decoder.cc
- snippet_url: https://github.com/google-ai-edge/LiteRT-LM/blob/main/runtime/components/constrained_decoding/constrained_decoder.cc

file_intent: Constrained decoding logit masker
breakdown_what: Applies a grammar constraint to the raw LLM logit tensor by computing a per-batch-item bitmap of allowed next tokens and setting all disallowed positions to the minimum float value, eliminating them from softmax consideration.
breakdown_responsibility: Enforces structured output at the token-generation level for LiteRT-LM's constrained decoding pipeline — by zeroing out disallowed tokens before sampling, it guarantees generated text conforms to a grammar or JSON schema without any post-processing step.
breakdown_clever: The check RET_CHECK_LE(vocab_size, constraint_->GetVocabularySize()) intentionally allows the constraint vocabulary to exceed the model's vocabulary — extra constraint tokens go unused. This lets the same constraint FSM be reused across model checkpoints with different tokenizer sizes without recompilation.
project_context: LiteRT-LM is Google's production-grade on-device LLM inference runtime — the infrastructure powering Gemini Nano on Pixel devices and Chrome — open-sourced to let developers deploy language models on Android, iOS, and IoT hardware with sub-100ms latency.

### Reformatted Snippet

```cpp
absl::Status ConstrainedDecoder::MaskLogits(
    absl::Span<float> logits,
    absl::Span<
        const ::litert::Layout::Dim
    > logits_dims) {
  RET_CHECK_EQ(logits_dims.size(), 3)
      << "Only support logits with dimensions "
         "[batch_size, 1, vocab_size].";
  int batch_size = logits_dims[0];
  int seq_length = logits_dims[1];
  int vocab_size = logits_dims[2];
  RET_CHECK_EQ(seq_length, 1)
      << "Only support sequence length 1.";
  // Constraint vocab may be larger than model vocab;
  // extra constraint tokens are treated as unused.
  RET_CHECK_LE(
      vocab_size,
      constraint_->GetVocabularySize())
      << "Vocabulary size [" << vocab_size
      << "] does not match the expected vocabulary "
         "size ["
      << constraint_->GetVocabularySize() << "].";
  RET_CHECK_EQ(batch_size, batch_size_)
      << "Batch size [" << batch_size
      << "] does not match expected ["
      << batch_size_ << "].";

  for (int b = 0; b < batch_size; ++b) {
    auto& constraint_state =
        constraint_states_[b];
    ASSIGN_OR_RETURN(
        auto bitmap,
        constraint_->ComputeBitmap(
            *constraint_state));
    for (int i = 0; i < vocab_size; ++i) {
      if (!bitmap->Get(i)) {
        logits.data()[b * vocab_size + i] =
            std::numeric_limits<float>::lowest();
      }
    }
  }
  return absl::OkStatus();
}
```

## Repo 2 — mozilla-ai/llamafile

- file_path: llamafile/zip.c
- snippet_url: https://github.com/mozilla-ai/llamafile/blob/main/llamafile/zip.c

file_intent: ZIP64 central-file offset resolver
breakdown_what: Reads the file offset from a ZIP central directory entry, returning the 32-bit value directly or walking the Zip64 extended info extra field to extract a 64-bit offset when the standard field holds the 0xFFFFFFFF sentinel.
breakdown_responsibility: Enables llamafile to locate model weights packed into ZIP-formatted executables that exceed the 4 GB limit of the original ZIP spec — critical since modern LLM weight files routinely cross that boundary.
breakdown_clever: The parser dynamically computes the 64-bit offset's byte position within the Zip64 block by checking whether uncompressed-size and compressed-size also used sentinels — correctly handling all four field-width combinations that simpler ZIP parsers get wrong.
project_context: llamafile bundles an entire LLM — weights, inference engine, and runtime — into a single executable using Cosmopolitan Libc, so the same file runs natively on macOS, Windows, Linux, and three BSDs with no installation required.

### Reformatted Snippet

```c
int64_t get_zip_cfile_offset(
    const uint8_t *z) {
    if (ZIP_CFILE_OFFSET(z) != 0xFFFFFFFFu)
        return ZIP_CFILE_OFFSET(z);
    const uint8_t *p = ZIP_CFILE_EXTRA(z);
    const uint8_t *pe =
        p + ZIP_CFILE_EXTRASIZE(z);
    for (; p + ZIP_EXTRA_SIZE(p) <= pe;
         p += ZIP_EXTRA_SIZE(p))
        if (ZIP_EXTRA_HEADERID(p) ==
                kZipExtraZip64) {
            int offset = 0;
            if (ZIP_CFILE_UNCOMPRESSEDSIZE(z)
                    == 0xFFFFFFFFu)
                offset += 8;
            if (ZIP_CFILE_COMPRESSEDSIZE(z)
                    == 0xFFFFFFFFu)
                offset += 8;
            if (offset + 8 <=
                    ZIP_EXTRA_CONTENTSIZE(p))
                return ZIP_READ64(
                    ZIP_EXTRA_CONTENT(p)
                    + offset);
        }
    return -1;
}
```
