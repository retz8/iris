# Breakdown Review — 2026-07-17 — JS/TS

Issue: #23
Date: 2026-07-17
Language: JS/TS
Status: COMPLETED

## Repo 1 — OpenCut-app/OpenCut

- file_path: apps/web/src/timeline/update-pipeline.ts
- snippet_url: https://github.com/OpenCut-app/OpenCut/blob/domain-import-backup-before-main-merge/apps/web/src/timeline/update-pipeline.ts

file_intent: Timeline element patch pipeline
breakdown_what: Applies a partial patch to a timeline element by spreading the change, then running two ordered rule passes: derive rules that compute cascading field changes, then enforce rules that constrain the result to valid ranges.
breakdown_responsibility: The central mutation function for all timeline element edits in OpenCut's browser-based video editor — every trim, reposition, or resize operation routes through this function before timeline state updates.
breakdown_clever: Derive rules expand `changedFields` as they fire, so later rules in the chain see fields changed by earlier ones. Enforce rules run only after all derives settle, constraining the final state rather than each intermediate cascade step.
project_context: An open-source, browser-based video editor built as a privacy-first CapCut alternative — all processing runs locally so footage never leaves your machine, with no watermarks, accounts, or subscription requirements, and over 45,000 GitHub stars.

### Reformatted Snippet

```typescript
export function applyElementUpdate({
	element,
	patch,
	context,
}: {
	element: TimelineElement;
	patch: Partial<TimelineElement>;
	context: ElementUpdateContext;
}): TimelineElement {
	let nextElement = { ...element, ...patch } as TimelineElement;
	const changedFields = new Set(
		Object.keys(patch) as ElementUpdateField[],
	);

	for (const rule of deriveRules) {
		if (!shouldApplyRule({ rule, changedFields })) {
			continue;
		}
		const result = rule.apply({
			element: nextElement,
			originalElement: element,
			patch,
			context,
		});
		nextElement = result.element;
		for (const field of result.changedFields ?? []) {
			changedFields.add(field);
		}
	}

	for (const rule of enforceRules) {
		if (!shouldApplyRule({ rule, changedFields })) {
			continue;
		}
		nextElement = rule.apply({
			element: nextElement,
			originalElement: element,
			patch,
			context,
		}).element;
	}

	return nextElement;
}
```

## Repo 2 — moeru-ai/airi

- file_path: packages/core-agent/src/runtime/llm-marker-parser.ts
- snippet_url: https://github.com/moeru-ai/airi/blob/main/packages/core-agent/src/runtime/llm-marker-parser.ts

file_intent: Push-to-pull stream bridge factory
breakdown_what: Creates a ReadableStream paired with imperative write, close, and error controls, converting LLM token callbacks into a standard pull-readable stream that downstream parsers can consume without knowing the token source.
breakdown_responsibility: The streaming primitive used by airi's LLM marker parser to process real-time token output from any AI provider — `write()` is called as tokens arrive and the stream is piped to downstream marker-detection logic.
breakdown_clever: The `closed` flag guards all three control methods rather than relying on the stream controller's own closed state — preventing a `TypeError: Controller is already closed` when network errors and timeout handlers race to terminate the same stream.
project_context: A self-hosted AI companion platform that combines real-time voice chat, Live2D/VRM character animation, and autonomous gaming (Minecraft, Factorio) — runs on your own hardware via WebGPU and supports 40+ LLM providers including local models.

### Reformatted Snippet

```typescript
function createPushStream<T>(): StreamController<T> {
  let closed = false
  let controller:
    ReadableStreamDefaultController<T> | null = null

  const stream = new ReadableStream<T>({
    start(ctrl) {
      controller = ctrl
    },
    cancel() {
      closed = true
    },
  })

  return {
    stream,
    write(value) {
      if (!controller || closed)
        return
      controller.enqueue(value)
    },
    close() {
      if (!controller || closed)
        return
      closed = true
      controller.close()
    },
    error(err) {
      if (!controller || closed)
        return
      closed = true
      controller.error(err)
    },
  }
}
```
