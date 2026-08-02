# Breakdown Review — 2026-03-13 — JS/TS

Issue: #5
Date: 2026-03-13
Language: JS/TS
Status: PENDING_APPROVAL

## Repo 1 — promptfoo/promptfoo

- file_path: src/assertions/ngrams.ts
- snippet_url: https://github.com/promptfoo/promptfoo/blob/main/src/assertions/ngrams.ts

file_intent: N-gram sequence extractor for LLM output scoring
breakdown_what: Generates all n-word sliding-window sequences from a word array, joining each window into a space-separated string — returning an empty array for any n that falls outside the valid range.
breakdown_responsibility: Powers promptfoo's ROUGE-style text overlap metrics for evaluating LLM output quality — by comparing n-gram sets between model responses and reference answers, test assertions can detect whether a response covers the expected content without requiring exact matches.
breakdown_clever: The loop bound `i <= words.length - n` produces every complete n-gram with no partial windows — off by one in either direction either drops the final gram or appends a truncated one, a common sliding-window mistake.
project_context: Engineers and QA teams use promptfoo to catch prompt regressions and compare LLM outputs across Claude, GPT-4, Llama, and other models without manual testing — it brings unit-test discipline to AI applications. Used by 350,000+ developers and reportedly more than 25% of Fortune 500 companies, it covers both quality evaluation and adversarial red-teaming.

### Reformatted Snippet

```typescript
export function getNGrams(
  words: string[],
  n: number
): string[] {
  if (n <= 0 || n > words.length) {
    return [];
  }

  const ngrams: string[] = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return ngrams;
}
```

## Repo 2 — web-infra-dev/midscene

- file_path: packages/core/src/ai-model/conversation-history.ts
- snippet_url: https://github.com/web-infra-dev/midscene/blob/main/packages/core/src/ai-model/conversation-history.ts

file_intent: LLM conversation history compressor for UI agents
breakdown_what: Truncates the in-memory message list to a fixed tail window when it exceeds a threshold, replacing all dropped entries with a single placeholder that records how many were removed — keeping the array ready for the next LLM call.
breakdown_responsibility: Manages context overflow in midscene's AI-driven UI automation — when a long test session accumulates step history, this keeps the message array within token limits so the vision model can continue interpreting the UI without context exhaustion.
breakdown_clever: `this.messages.length = 0` empties the array in place — any reference to it immediately reflects the cleared state. `this.messages = []` would leave prior references still pointing at the old array, silently breaking any observer that cached the same instance.
project_context: Midscene lets developers and QA engineers drive web, Android, and desktop UIs with plain-language instructions instead of brittle CSS selectors, relying on a multimodal vision model to interpret screenshots and execute each step. Teams use it for test automation on UIs that frequently change or where selectors break down — canvas surfaces, cross-origin iframes, and rapidly redesigned frontends.

### Reformatted Snippet

```typescript
compressHistory(
  threshold: number,
  keepCount: number
): boolean {
  if (this.messages.length <= threshold) {
    return false;
  }

  const omittedCount =
    this.messages.length - keepCount;
  const omittedPlaceholder:
    ChatCompletionMessageParam = {
    role: 'user',
    content:
      `(${omittedCount} previous conversation` +
      ` messages have been omitted)`,
  };

  const recentMessages =
    this.messages.slice(-keepCount);

  this.messages.length = 0;
  this.messages.push(omittedPlaceholder);
  for (const msg of recentMessages) {
    this.messages.push(msg);
  }

  return true;
}
```
