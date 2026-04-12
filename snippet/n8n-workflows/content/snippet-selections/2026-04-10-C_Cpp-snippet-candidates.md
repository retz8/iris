# Snippet Candidates — 2026-04-10 — C_Cpp

Issue: #9
Date: 2026-04-10
Language: C_Cpp
Status: PENDING_SELECTION

## Repo 1 — google-ai-edge/LiteRT-LM

### Candidate 1 (most important)

- file_path: runtime/core/tasks.cc
- snippet_url: https://github.com/google-ai-edge/LiteRT-LM/blob/main/runtime/core/tasks.cc
- reasoning: `DecodeOneStep::Run()` is the heart of text generation in LiteRT-LM — it orchestrates a single decode step, handles BPE partial-token accumulation across steps, buffers tokens that might be partial stop sequences, and rolls back the executor step count if completion is detected mid-sequence, making it the most complex and central logic in the repo.

```cpp
absl::StatusOr<bool> Run(
    std::optional<litert::TensorBuffer> decoded_ids
        = std::nullopt) {
  ASSIGN_OR_RETURN(
      auto token_ids,
      DecodeAndSample(std::move(decoded_ids)));

  size_t sequence_length = token_ids[0].size();
  for (size_t i = 1; i < token_ids.size(); ++i) {
    RET_CHECK_EQ(token_ids[i].size(), sequence_length);
  }

  for (int i = 0; i < num_output_candidates_; ++i) {
    result_text_[i].clear();
  }

  for (size_t step = 0; step < sequence_length; ++step) {
    std::vector<std::vector<int>> step_tokens;
    step_tokens.reserve(num_output_candidates_);
    for (int batch = 0; batch < num_output_candidates_;
         ++batch) {
      step_tokens.push_back({token_ids[batch][step]});
    }
    RETURN_IF_ERROR(
        stop_token_detector_.ProcessTokens(step_tokens));
    ASSIGN_OR_RETURN(
        step_tokens,
        tokenizer_.MergeTokenIds(
            bpe_partial_token_ids_, step_tokens));

    auto decoded_result = tokenizer_.TokenIdsToTexts(
        num_output_candidates_, step_tokens);
    for (int i = 0; i < num_output_candidates_; ++i) {
      if (Tokenizer::IsIncompleteBeSequence(
              decoded_result.value()[i])) {
        bpe_partial_token_ids_[i] = step_tokens[i];
      } else if (
          !stop_token_detector_.GetStopTokensFound()[i]) {
        bpe_partial_token_ids_[i].clear();
        int max_length =
            stop_token_detector_
                .MaxPartialStopTokenLength(i);
        if (max_length > 0) {
          pending_stop_tokens_[i].push(
              decoded_result.value()[i].value());
        }
        while (
            pending_stop_tokens_[i].size() > max_length) {
          result_text_[i] +=
              pending_stop_tokens_[i].front();
          pending_stop_tokens_[i].pop();
        }
        if (max_length == 0) {
          result_text_[i] +=
              decoded_result.value()[i].value();
        }
      }
    }

    is_first_step_ = false;
    ASSIGN_OR_RETURN(bool all_done,
                     stop_token_detector_.AllDone());
    if (all_done) {
      if (step != sequence_length - 1) {
        int diff = sequence_length - step;
        ASSIGN_OR_RETURN(int current_step,
                         executor_.GetCurrentStep());
        RETURN_IF_ERROR(
            executor_.SetCurrentStep(
                current_step - diff));
      }
      return true;
    }
  }
  return false;
}
```

### Candidate 2

- file_path: runtime/components/constrained_decoding/constrained_decoder.cc
- snippet_url: https://github.com/google-ai-edge/LiteRT-LM/blob/main/runtime/components/constrained_decoding/constrained_decoder.cc
- reasoning: `MaskLogits` shows how LiteRT-LM enforces grammar/schema constraints on generation — it retrieves a per-batch allowed-token bitmap from the constraint state machine and writes `lowest()` into every disallowed logit position before sampling, with a subtle vocab-size asymmetry check that handles constraints with larger vocabularies than the model.

```cpp
absl::Status ConstrainedDecoder::MaskLogits(
    absl::Span<float> logits,
    absl::Span<const ::litert::Layout::Dim> logits_dims) {
  RET_CHECK_EQ(logits_dims.size(), 3)
      << "Only support logits with dimensions "
         "[batch_size, 1, vocab_size].";
  int batch_size  = logits_dims[0];
  int seq_length  = logits_dims[1];
  int vocab_size  = logits_dims[2];
  RET_CHECK_EQ(seq_length, 1)
      << "Only support sequence length 1.";
  // Constraint vocab may be larger than model vocab;
  // extra constraint tokens are treated as unused.
  RET_CHECK_LE(vocab_size,
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
    auto& constraint_state = constraint_states_[b];
    ASSIGN_OR_RETURN(
        auto bitmap,
        constraint_->ComputeBitmap(*constraint_state));
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

### Candidate 3 (least important)

- file_path: runtime/core/engine_impl.cc
- snippet_url: https://github.com/google-ai-edge/LiteRT-LM/blob/main/runtime/core/engine_impl.cc
- reasoning: `GetEnvironment()` reveals an important architectural constraint — the LiteRT hardware environment is a process-wide singleton initialized exactly once, and the function encodes all the backend-conditional logic for resolving the NPU dispatch library path (from explicit config, or by deriving it from the model file's parent directory), which directly determines whether GPU, CPU, or NPU acceleration is available.

```cpp
absl::StatusOr<Environment&> GetEnvironment(
    EngineSettings& engine_settings,
    ModelResources& model_resources) {
  static absl::NoDestructor<MagicNumberConfigsHelper>
      helper;
  static absl::NoDestructor<
      absl::StatusOr<Environment>>
      kEnvironment(
          [&]() -> absl::StatusOr<Environment> {
    std::vector<Environment::Option> env_options;
    const auto& s =
        engine_settings.GetMainExecutorSettings();

    if (s.GetBackend() == Backend::CPU ||
        s.GetBackend() == Backend::GPU) {
      if (!s.GetAdvancedSettings() ||
          s.GetAdvancedSettings()
              ->configure_magic_numbers) {
        env_options = helper->GetLiteRtEnvOptions(
            model_resources, s);
      }
    } else {
      if (!s.GetLitertDispatchLibDir().empty()) {
        env_options.push_back(
            ::litert::Environment::Option{
                ::litert::Environment::OptionTag
                    ::DispatchLibraryDir,
                s.GetLitertDispatchLibDir()});
      } else {
        std::string model_path(
            s.GetModelAssets()
             .GetPath().value_or(""));
        std::filesystem::path path(model_path);
        static const absl::NoDestructor<std::string>
            kDispatchLibraryPath(
                path.parent_path().string());
        if (!kDispatchLibraryPath->empty()) {
          env_options.push_back(
              ::litert::Environment::Option{
                  ::litert::Environment::OptionTag
                      ::DispatchLibraryDir,
                  absl::string_view(
                      *kDispatchLibraryPath)});
        }
      }
    }
    LITERT_ASSIGN_OR_RETURN(
        auto env,
        Environment::Create(env_options));
    return std::move(env);
  }());
  if (!kEnvironment->ok()) {
    return kEnvironment->status();
  }
  return **kEnvironment;
}
```

## Repo 2 — mozilla-ai/llamafile

### Candidate 1 (most important)

- file_path: llamafile/zip.c
- snippet_url: https://github.com/mozilla-ai/llamafile/blob/main/llamafile/zip.c
- reasoning: llamafile's signature feature is embedding model weights inside a self-executing ZIP archive; this function implements ZIP64-aware offset parsing — the precise logic that locates where a bundled model actually lives on disk, accounting for variable-length extra fields in the central directory.

```c
int64_t get_zip_cfile_offset(const uint8_t *z) {
    if (ZIP_CFILE_OFFSET(z) != 0xFFFFFFFFu)
        return ZIP_CFILE_OFFSET(z);
    const uint8_t *p = ZIP_CFILE_EXTRA(z);
    const uint8_t *pe = p + ZIP_CFILE_EXTRASIZE(z);
    for (; p + ZIP_EXTRA_SIZE(p) <= pe;
         p += ZIP_EXTRA_SIZE(p))
        if (ZIP_EXTRA_HEADERID(p) == kZipExtraZip64) {
            int offset = 0;
            if (ZIP_CFILE_UNCOMPRESSEDSIZE(z) == 0xFFFFFFFFu)
                offset += 8;
            if (ZIP_CFILE_COMPRESSEDSIZE(z) == 0xFFFFFFFFu)
                offset += 8;
            if (offset + 8 <= ZIP_EXTRA_CONTENTSIZE(p))
                return ZIP_READ64(
                    ZIP_EXTRA_CONTENT(p) + offset);
        }
    return -1;
}
```

### Candidate 2

- file_path: llamafile/datauri.cpp
- snippet_url: https://github.com/mozilla-ai/llamafile/blob/main/llamafile/datauri.cpp
- reasoning: This three-state machine parses RFC 2397 percent-encoded data URIs, enabling llamafile to accept inline base64-encoded images as chat inputs; the PERCENT1/PERCENT2 states handle malformed sequences (bare `%`, partial escapes) rather than crashing or silently dropping bytes.

```cpp
static std::string percent_decode(std::string_view data) {
    std::string r;
    enum {
        NORMAL,
        PERCENT1,
        PERCENT2,
    } t = NORMAL;
    int b, a = 0, ac = 0;
    for (size_t i = 0; i < data.size(); ++i) {
        int c = data[i] & 255;
        switch (t) {
        case NORMAL:
            if (c == '%') {
                t = PERCENT1;
            } else {
                r += c;
            }
            break;
        case PERCENT1:
            if ((a = kHexToInt[(ac = c)]) != -1) {
                t = PERCENT2;
            } else if (c == '%') {
                r += '%';
            } else {
                t = NORMAL;
                r += '%';
                r += c;
            }
            break;
        case PERCENT2:
            if ((b = kHexToInt[c]) != -1) {
                t = NORMAL;
                r += a << 4 | b;
            } else if (c == '%') {
                t = PERCENT1;
                r += '%';
                r += ac;
            } else {
                t = NORMAL;
                r += '%';
                r += ac;
                r += c;
            }
            break;
        default:
            __builtin_unreachable();
        }
    }
    switch (t) {
    case PERCENT1:
        r += '%';
        break;
    case PERCENT2:
        r += '%';
        r += ac;
        break;
    default:
        break;
    }
    return r;
}
```

### Candidate 3 (least important)

- file_path: llamafile/string.cpp
- snippet_url: https://github.com/mozilla-ai/llamafile/blob/main/llamafile/string.cpp
- reasoning: This append-only buffered file reader grows a `std::string` in 16 KB chunks without a stat call, making it safe on pseudo-files like `/proc/cpuinfo` where the kernel reports zero size, and correctly rolls back the string to its original length on any I/O error.

```cpp
ssize_t slurp(std::string *r, const char *path) {
    int fd;
    if ((fd = open(path, O_RDONLY)) == -1)
        return -1;
    size_t toto = 0;
    size_t orig = r->size();
    for (;;) {
        size_t want = 16384;
        size_t size = r->size();
        r->resize(size + want);
        ssize_t rc;
        if ((rc = read(fd, r->data() + size, want)) == -1) {
            r->resize(orig);
            close(fd);
            return -1;
        }
        size_t got = rc;
        r->resize(size + got);
        toto += got;
        if (!got)
            break;
    }
    if (close(fd)) {
        r->resize(orig);
        return -1;
    }
    return toto;
}
```
