# Breakdown Review — 2026-06-05 — JS/TS

Issue: #17
Date: 2026-06-05
Language: JS/TS
Status: PENDING_APPROVAL

## Repo 1 — DayuanJiang/next-ai-draw-io

- file_path: lib/chat-helpers.ts
- snippet_url: https://github.com/DayuanJiang/next-ai-draw-io/blob/main/lib/chat-helpers.ts

file_intent: Diagram tool call history scrubber
breakdown_what: Walks the chat history and replaces the XML payload in past `display_diagram` and `edit_diagram` tool calls with a short placeholder, telling the model to reference the current diagram in system context rather than re-reading stale XML on every turn.
breakdown_responsibility: Prevents diagram XML — which can be thousands of tokens of raw draw.io markup — from accumulating across a multi-turn conversation; called before every API request to keep the context window manageable as the user iterates on a diagram.
breakdown_clever: The empty-input guard (`Object.keys(part.input).length === 0`) skips tool calls that never completed — without it, replacing an empty input with a placeholder would fabricate a ghost diagram turn that the model could treat as real edit history.
project_context: next-ai-draw-io is a Next.js app that lets you describe, create, and revise draw.io diagrams in plain text — type "add a database node" or "rearrange the flow," and the AI edits the underlying XML directly. It also ships an MCP server so AI assistants like Claude Desktop can generate diagrams with a live browser preview.

### Reformatted Snippet

```typescript
export function replaceHistoricalToolInputs(
    messages: any[]
): any[] {
    return messages.map((msg) => {
        if (
            msg.role !== "assistant" ||
            !Array.isArray(msg.content)
        ) {
            return msg
        }
        const replacedContent = msg.content
            .map((part: any) => {
                if (part.type === "tool-call") {
                    const toolName = part.toolName
                    if (
                        !part.input ||
                        typeof part.input !== "object" ||
                        Object.keys(part.input).length === 0
                    ) {
                        return null
                    }
                    if (
                        toolName === "display_diagram" ||
                        toolName === "edit_diagram"
                    ) {
                        return {
                            ...part,
                            input: {
                                placeholder:
                                    "[XML content replaced" +
                                    " - see current diagram" +
                                    " XML in system context]",
                            },
                        }
                    }
                }
                return part
            })
            .filter(Boolean)
        return { ...msg, content: replacedContent }
    })
}
```

## Repo 2 — lfnovo/open-notebook

- file_path: frontend/src/lib/hooks/use-modal-manager.ts
- snippet_url: https://github.com/lfnovo/open-notebook/blob/main/frontend/src/lib/hooks/use-modal-manager.ts

file_intent: URL-state-backed modal controller hook
breakdown_what: Manages modal open/close state entirely through URL search parameters, so navigating to `?modal=source&id=42` opens a source modal and closing it navigates back to the clean URL — making every modal state deep-linkable and browser-back-compatible without component-level state.
breakdown_responsibility: Centralizes modal routing for the three main content types (source, note, insight) into one hook consumed across the notebook UI; adding a new modal type or changing the URL scheme is a single edit rather than hunting through component state.
breakdown_clever: By encoding both `modal` and `id` into the URL, the hook makes every open notebook item bookmarkable and shareable — collaborators can paste a link and land directly on the same source or insight view without any session state reconstruction.
project_context: Open Notebook is a self-hosted, open-source alternative to Google NotebookLM that supports 16+ AI providers (including Anthropic, OpenAI, Ollama, and Google), processes PDFs, video, audio, and webpages, and runs entirely on your own hardware via Docker — your research data never leaves your machine.

### Reformatted Snippet

```typescript
'use client'

import {
  useRouter,
  useSearchParams,
  usePathname
} from 'next/navigation'

export type ModalType = 'source' | 'note' | 'insight'

export function useModalManager() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const modalType =
    searchParams?.get('modal') as ModalType | null
  const modalId = searchParams?.get('id')

  const openModal = (type: ModalType, id: string) => {
    const params = new URLSearchParams(
      searchParams?.toString() || ''
    )
    params.set('modal', type)
    params.set('id', id)
    router.push(
      `${pathname}?${params.toString()}`,
      { scroll: false }
    )
  }

  const closeModal = () => {
    const params = new URLSearchParams(
      searchParams?.toString() || ''
    )
    params.delete('modal')
    params.delete('id')
    router.push(
      `${pathname}?${params.toString()}`,
      { scroll: false }
    )
  }

  return {
    modalType,
    modalId,
    openModal,
    closeModal,
    isOpen: !!modalType && !!modalId
  }
}
```
