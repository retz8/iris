# Breakdown Review — 2026-11-06 — C/C++

Issue: #38
Date: 2026-11-06
Language: C/C++
Status: PENDING_APPROVAL

## Repo 1 — k2-fsa/sherpa-onnx

- file_path: sherpa-onnx/csrc/context-graph.cc
- snippet_url: https://github.com/k2-fsa/sherpa-onnx/blob/master/sherpa-onnx/csrc/context-graph.cc

file_intent: Context-biasing trie match checker
breakdown_what: Checks whether the current node in a context-biasing trie represents a completed match, returning either the node itself when it is an explicit end state, or a fallback output link when one exists, otherwise reporting no match.
breakdown_responsibility: Part of sherpa-onnx's contextual biasing feature, which steers streaming speech recognition toward a user-supplied list of words or phrases (names, jargon) by walking this trie alongside the decoder's beam search.
breakdown_clever: The "output" link being followed resembles a failure-function pointer from Aho-Corasick-style automata: it lets the matcher jump to the longest still-valid suffix when a token doesn't extend the current phrase, instead of restarting the whole phrase search from scratch.
project_context: sherpa-onnx is k2-fsa's offline, ONNX-based speech toolkit covering streaming and non-streaming ASR, TTS, speaker ID, and keyword spotting across platforms from servers down to embedded devices like Raspberry Pi, with bindings in C, Python, Java, Swift, Go, Rust, and more.

### Reformatted Snippet

```cpp
std::pair<bool, const ContextState *>
ContextGraph::IsMatched(
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

## Repo 2 — rizinorg/rizin

- file_path: librz/util/debruijn.c
- snippet_url: https://github.com/rizinorg/rizin/blob/dev/librz/util/debruijn.c

file_intent: De Bruijn exploit pattern generator
breakdown_what: Generates a de Bruijn sequence-based pattern of a given size, optionally offset by a start value and using a custom character set, validating inputs and falling back to a default charset when none is provided.
breakdown_responsibility: Provides the core pattern-generation primitive behind Rizin's exploit-development tooling, producing non-repeating byte sequences testers write into a vulnerable buffer so the exact overflow offset can later be read back off the crashing instruction pointer or register.
breakdown_clever: When start is nonzero, the function generates a longer de Bruijn sequence covering size+start symbols, then copies out the slice beginning at start — reusing one generator for "skip the first N bytes" instead of writing a second, offset-aware algorithm.
project_context: Rizin is an open-source, UNIX-like reverse-engineering framework and command-line toolset forked from radare2, packaged by Linux distributions like Fedora and Gentoo and paired with the Cutter GUI; its de Bruijn pattern generator is the same kind of tool exploit developers use to find exact offsets in a buffer overflow.

### Reformatted Snippet

```c
RZ_API RZ_OWN char *rz_debruijn_pattern(
    int size, int start, const char *charset
) {
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
