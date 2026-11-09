# Snippet Candidates — 2026-11-06 — C_Cpp

Issue: #38
Date: 2026-11-06
Language: C_Cpp
Status: COMPLETED

## Repo 1 — k2-fsa/sherpa-onnx

### Candidate 1 (most important)

- file_path: sherpa-onnx/csrc/context-graph.cc
- snippet_url: https://github.com/k2-fsa/sherpa-onnx/blob/master/sherpa-onnx/csrc/context-graph.cc
- reasoning: This is the matching step of sherpa-onnx's contextual-biasing (hotword) trie — it decides whether the current traversal state is a full phrase match either directly or through an Aho-Corasick-style output link, which is core to how the ASR engine boosts user-supplied hotwords.

```cpp
std::pair<bool, const ContextState *> ContextGraph::IsMatched(
    const ContextState *state) const {
  bool status = false;
  const ContextState *node = nullptr;
  if (state->is_end) {
    status = true;
    node = state;
  } else {
    if (state->output != nullptr) {
      status = true;
      node = state->output;
    }
  }
  return std::make_pair(status, node);
}
```

### Candidate 2

- file_path: sherpa-onnx/csrc/hypothesis.cc
- snippet_url: https://github.com/k2-fsa/sherpa-onnx/blob/master/sherpa-onnx/csrc/hypothesis.cc
- reasoning: Converts a batch of per-utterance beam-search hypothesis sets into CSR-style row-split offsets, the glue that lets sherpa-onnx's transducer decoder process a ragged batch of hypotheses as flat tensors during inference.

```cpp
const std::vector<int32_t> GetHypsRowSplits(
    const std::vector<Hypotheses> &hyps) {
  std::vector<int32_t> row_splits;
  row_splits.reserve(hyps.size() + 1);

  row_splits.push_back(0);
  int32_t s = 0;
  for (const auto &h : hyps) {
    s += h.Size();
    row_splits.push_back(s);
  }

  return row_splits;
}
```

### Candidate 3 (least important)

- file_path: sherpa-onnx/csrc/fast-clustering.cc
- snippet_url: https://github.com/k2-fsa/sherpa-onnx/blob/master/sherpa-onnx/csrc/fast-clustering.cc
- reasoning: Builds the pairwise cosine-dissimilarity matrix that feeds sherpa-onnx's hierarchical speaker-clustering (diarization) step, clamping negative similarities so the distance matrix stays valid for the clustering library.

```cpp
    int32_t k = 0;
    for (int32_t i = 0; i != num_rows; ++i) {
      auto v = m.row(i);
      for (int32_t j = i + 1; j != num_rows; ++j) {
        double cosine_similarity = v.dot(m.row(j));
        double consine_dissimilarity = 1 - cosine_similarity;

        if (consine_dissimilarity < 0) {
          consine_dissimilarity = 0;
        }

        distance[k] = consine_dissimilarity;
        ++k;
      }
    }
```

## Repo 2 — rizinorg/rizin

### Candidate 1 (most important)

- file_path: librz/util/debruijn.c
- snippet_url: https://github.com/rizinorg/rizin/blob/dev/librz/util/debruijn.c
- reasoning: This generates rizin's De Bruijn cyclic pattern, the exact mechanism reverse engineers and exploit developers rely on to find buffer-overflow offsets, making it one of the most practically recognizable algorithms in the codebase.

```c
RZ_API RZ_OWN char *rz_debruijn_pattern(int size, int start, const char *charset) {
	rz_return_val_if_fail(size >= 0, NULL);
	rz_return_val_if_fail(start >= 0, NULL);
	if (!charset) {
		charset = debruijn_charset;
	}
	char *pat = de_bruijn(charset, 3, size + start);
	if (!pat || start == 0) {
		return pat;
	}

	char *pat2 = RZ_NEWS0(char, size + 1);
	if (!pat2) {
		free(pat);
		return NULL;
	}
	size_t len = strlen(pat + start);
	if (len > size) {
		free(pat);
		return NULL;
	}
	strcpy(pat2, pat + start);
	free(pat);
	return pat2;
}
```

### Candidate 2

- file_path: librz/core/basefind.c
- snippet_url: https://github.com/rizinorg/rizin/blob/dev/librz/core/basefind.c
- reasoning: This is the scoring predicate behind rizin's `rz_basefind` heuristic, which guesses a loaded binary's base address by checking whether raw pointer values land on known string offsets within a candidate base range.

```c
static bool basefind_pointer_map_iter(BaseFindData *bfd, const ut64 address, const ut64 hits) {
	if (!rz_atomic_bool_get(bfd->loop)) {
		return false;
	}
	if (address < bfd->start || address >= bfd->end) {
		return true;
	}
	ut64 offset = address - bfd->start;
	if (basefind_array_has(bfd->array, offset)) {
		bfd->score += hits;
	}
	return true;
}
```

### Candidate 3 (least important)

- file_path: librz/util/luhn.c
- snippet_url: https://github.com/rizinorg/rizin/blob/dev/librz/util/luhn.c
- reasoning: A compact, self-contained implementation of the Luhn checksum algorithm, interesting as a tight algorithmic utility but peripheral to rizin's core disassembly/analysis engine.

```c
RZ_API bool rz_calculate_luhn_value(const char *data, ut64 *result) {
	rz_return_val_if_fail(data && result, false);
	ssize_t size = strlen(data);
	if (size < 1) {
		return false;
	}

	int digit;
	ut64 sum = 0;
	bool parity = false;
	for (ssize_t i = size - 1; i >= 0; --i) {
		if (!IS_DIGIT(data[i])) {
			return false;
		}

		digit = data[i] - '0';
		if (parity) {
			digit *= 2;
		}
		digit = (digit / 10) + (digit % 10);
		sum += digit;
		parity = !parity;
	}

	*result = sum % 10;
	return true;
}
```
