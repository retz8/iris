# Breakdown Review — 2026-09-18 — JS/TS

Issue: #31
Date: 2026-09-18
Language: JS/TS
Status: PENDING_APPROVAL

## Repo 1 — Tencent/BrowserSkill

- file_path: apps/extension/src/tools/observation.ts
- snippet_url: https://github.com/Tencent/BrowserSkill/blob/main/apps/extension/src/tools/observation.ts

file_intent: Byte-safe HTML truncator
breakdown_what: Truncates an HTML string to a maximum byte length by encoding it to UTF-8, then walks backward from that byte offset until it lands on a valid UTF-8 character boundary before decoding, avoiding split multi-byte characters mid-string.
breakdown_responsibility: Within BrowserSkill's extension, this guards the payload the agent receives when it observes a live browser tab's DOM, keeping captured page HTML within size limits so agent context windows and IPC messages to the CLI daemon stay bounded.
breakdown_clever: The bitmask check against 0b1100_0000 detects UTF-8 continuation bytes rather than trusting JavaScript's string length; naive byte-slicing on multi-byte characters like emoji would silently corrupt output or throw when re-encoded downstream.
project_context: BrowserSkill is Tencent's open-source CLI and browser extension that lets AI coding agents such as Claude Code, Cursor, and Codex drive a developer's real, already-logged-in browser tab instead of a blank automation instance, so agents can act on authenticated sites without separate test accounts.

### Reformatted Snippet

```typescript
function truncateBytes(
  html: string,
  maxBytes: number,
): { out: string; truncated: boolean } {
  const enc = new TextEncoder();
  const bytes = enc.encode(html);
  if (bytes.length <= maxBytes) {
    return { out: html, truncated: false };
  }
  // Walk back to a UTF-8 boundary
  // (bytes whose high bits aren't `10`).
  let end = maxBytes;
  while (
    end > 0 &&
    (bytes[end] & 0b1100_0000) === 0b1000_0000
  ) {
    end -= 1;
  }
  const out = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, end));
  return { out, truncated: true };
}
```

## Repo 2 — langwatch/langwatch

- file_path: packages/redaction/src/secrets.ts
- snippet_url: https://github.com/langwatch/langwatch/blob/main/packages/redaction/src/secrets.ts

file_intent: Secret-detection entropy calculator
breakdown_what: Calculates the Shannon entropy in bits of a string by sampling up to a fixed length, tallying character frequencies, and summing each character's probability-weighted negative log2, producing a single score representing how random the text looks.
breakdown_responsibility: Inside LangWatch's redaction package, this entropy score helps flag high-randomness substrings in traced LLM prompts and outputs, like API keys or tokens, so the tracing pipeline can automatically redact likely secrets before they're stored or displayed to users.
breakdown_clever: Only the first ENTROPY_SAMPLE_LENGTH characters are sampled rather than the full string, a deliberate tradeoff, since entropy over a short prefix is statistically sufficient to flag a secret while avoiding O(n) scans over huge base64 blobs or logged payloads.
project_context: LangWatch is an open-source, Apache 2.0-licensed platform for tracing, evaluating, and testing LLM applications and AI agents, self-hostable via Docker or Helm and used in production by enterprises including Deloitte, Backbase, and PagBank.

### Reformatted Snippet

```typescript
function shannonEntropyBits(value: string): number {
  const sample =
    value.length > ENTROPY_SAMPLE_LENGTH
      ? value.slice(0, ENTROPY_SAMPLE_LENGTH)
      : value;
  const counts = new Map<string, number>();
  for (const char of sample) {
    counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / sample.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}
```
