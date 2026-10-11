# Breakdown Review — 2026-09-18 — JS/TS

Issue: #31
Date: 2026-09-18
Language: JS/TS
Status: PENDING_APPROVAL

## Repo 1 — Tencent/BrowserSkill

- file_path: apps/extension/src/tools/observation.ts
- snippet_url: https://github.com/Tencent/BrowserSkill/blob/main/apps/extension/src/tools/observation.ts

file_intent: UTF-8 safe byte truncator
breakdown_what: Encodes an HTML string to bytes and, if it exceeds a byte budget, walks backward from the cutoff until it lands on a UTF-8 character boundary before decoding, so the truncated output never contains a broken multi-byte character.
breakdown_responsibility: Used when the extension captures a page's HTML for an AI agent and must cap payload size before sending it over the WebSocket bridge to the CLI — a guard against truncation corrupting non-ASCII page content like CJK text.
breakdown_clever: A naive slice at a fixed character count would silently mangle any multi-byte character split across the cutoff; checking (bytes[end] & 0b1100_0000) === 0b1000_0000 detects UTF-8 continuation bytes specifically, walking back only as far as needed rather than over-trimming.
project_context: BrowserSkill is Tencent's open-source CLI and browser extension that lets shell-capable AI agents like Claude Code, Cursor, and Codex borrow a user's own logged-in browser tab to complete tasks, handing control back when done.

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

file_intent: String randomness entropy scorer
breakdown_what: Samples up to a fixed length of a string, tallies character frequencies, and computes Shannon entropy in bits per character — a statistical measure of how random or repetitive the string's contents are.
breakdown_responsibility: Feeds langwatch's secret-redaction pipeline, which scans traced LLM inputs and outputs for likely API keys and tokens before they're stored — high entropy is a strong signal that a captured string is a credential, not ordinary text.
breakdown_clever: Capping the sample at ENTROPY_SAMPLE_LENGTH isn't just a perf shortcut — entropy trends toward a stable value as sample size grows, so scoring only a prefix of a huge string gives nearly the same signal for far less cost.
project_context: LangWatch is an open-source LLM observability platform that adds OpenTelemetry-based tracing, real-time evaluation, and agent simulation testing to production AI applications, helping teams catch regressions before they reach users.

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
