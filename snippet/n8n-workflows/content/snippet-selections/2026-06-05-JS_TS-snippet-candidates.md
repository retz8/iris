# Snippet Candidates — 2026-06-05 — JS_TS

Issue: #17
Date: 2026-06-05
Language: JS_TS
Status: PENDING_SELECTION

## Repo 1 — DayuanJiang/next-ai-draw-io

### Candidate 1 (most important)

- file_path: lib/chat-helpers.ts
- snippet_url: https://github.com/DayuanJiang/next-ai-draw-io/blob/main/lib/chat-helpers.ts
- reasoning: This function solves a core challenge in multi-turn LLM chat — stale diagram XML in history balloons token usage and causes the model to reference outdated state, so it surgically replaces past tool inputs with a placeholder while also discarding malformed tool calls from interrupted streams.

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

### Candidate 2

- file_path: lib/diagram-validator.ts
- snippet_url: https://github.com/DayuanJiang/next-ai-draw-io/blob/main/lib/diagram-validator.ts
- reasoning: This function translates a structured VLM validation result into a feedback string fed back into the LLM's tool output, showing how the repo closes the loop between vision-model diagram critique and the text-model that generated the XML.

```typescript
export function formatValidationFeedback(
    result: ValidationResult
): string {
    if (result.valid && result.issues.length === 0) {
        return ""
    }

    const lines: string[] = []

    lines.push("DIAGRAM VISUAL VALIDATION FAILED")
    lines.push("")

    const criticalIssues = result.issues.filter(
        (i) => i.severity === "critical",
    )
    const warnings = result.issues.filter(
        (i) => i.severity === "warning"
    )

    if (criticalIssues.length > 0) {
        lines.push("Critical Issues (must fix):")
        for (const issue of criticalIssues) {
            lines.push(
                `  - [${issue.type}] ${issue.description}`
            )
        }
        lines.push("")
    }

    if (warnings.length > 0) {
        lines.push("Warnings:")
        for (const issue of warnings) {
            lines.push(
                `  - [${issue.type}] ${issue.description}`
            )
        }
        lines.push("")
    }

    if (result.suggestions.length > 0) {
        lines.push("Suggestions to fix:")
        for (const suggestion of result.suggestions) {
            lines.push(`  - ${suggestion}`)
        }
        lines.push("")
    }

    lines.push(
        "Please regenerate the diagram with corrected" +
        " layout to fix these visual issues.",
    )

    return lines.join("\n")
}
```

### Candidate 3 (least important)

- file_path: lib/system-prompts.ts
- snippet_url: https://github.com/DayuanJiang/next-ai-draw-io/blob/main/lib/system-prompts.ts
- reasoning: `getSystemPrompt` reveals the model-aware prompt routing strategy — selecting an extended prompt for models that require a higher token-cache minimum, then conditionally prepending or appending style instructions, a pattern useful to anyone building multi-model LLM products.

```typescript
export function getSystemPrompt(
    modelId?: string,
    minimalStyle?: boolean,
): string {
    const modelName = modelId || "AI"

    let prompt: string
    if (
        modelId &&
        EXTENDED_PROMPT_MODEL_PATTERNS.some((pattern) =>
            modelId.includes(pattern),
        )
    ) {
        console.log(
            `[System Prompt] Using EXTENDED prompt` +
            ` for model: ${modelId}`,
        )
        prompt = EXTENDED_SYSTEM_PROMPT
    } else {
        console.log(
            `[System Prompt] Using DEFAULT prompt` +
            ` for model: ${modelId || "unknown"}`,
        )
        prompt = DEFAULT_SYSTEM_PROMPT
    }

    if (minimalStyle) {
        console.log(
            `[System Prompt] Minimal style mode ENABLED`
        )
        prompt = MINIMAL_STYLE_INSTRUCTION + prompt
    } else {
        prompt += STYLE_INSTRUCTIONS
    }

    return prompt.replace("{{MODEL_NAME}}", modelName)
}
```

## Repo 2 — lfnovo/open-notebook

### Candidate 1 (most important)

- file_path: frontend/src/lib/config.ts
- snippet_url: https://github.com/lfnovo/open-notebook/blob/main/frontend/src/lib/config.ts
- reasoning: The paired `configPromise` / `config` module-level variables implement promise deduplication — any number of concurrent callers share one in-flight fetch and one cached result — a precise and commonly misunderstood pattern for singleton async initialization.

```typescript
export async function getApiUrl(): Promise<string> {
  if (config) {
    return config.apiUrl
  }

  if (configPromise) {
    const cfg = await configPromise
    return cfg.apiUrl
  }

  configPromise = fetchConfig()

  const cfg = await configPromise
  return cfg.apiUrl
}

export async function getConfig(): Promise<AppConfig> {
  if (config) {
    return config
  }

  if (configPromise) {
    return await configPromise
  }

  configPromise = fetchConfig()
  return await configPromise
}
```

### Candidate 2

- file_path: frontend/src/lib/hooks/use-modal-manager.ts
- snippet_url: https://github.com/lfnovo/open-notebook/blob/main/frontend/src/lib/hooks/use-modal-manager.ts
- reasoning: Encoding modal state in URL search params instead of `useState` gives the app browser-back, deep-link, and tab-restore for free, and the hook encapsulates all param manipulation behind a clean open/close API.

```typescript
'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export type ModalType = 'source' | 'note' | 'insight'

export function useModalManager() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const modalType = searchParams?.get('modal') as ModalType | null
  const modalId = searchParams?.get('id')

  const openModal = (type: ModalType, id: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('modal', type)
    params.set('id', id)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const closeModal = () => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('modal')
    params.delete('id')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
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

### Candidate 3 (least important)

- file_path: frontend/src/lib/hooks/use-version-check.ts
- snippet_url: https://github.com/lfnovo/open-notebook/blob/main/frontend/src/lib/hooks/use-version-check.ts
- reasoning: A `useRef` boolean guard inside `useEffect` is the correct way to enforce one-shot initialization that survives React Strict Mode double-invocations, and pairing it with session-storage dismissal shows a complete, production-ready notification lifecycle.

```typescript
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { getConfig } from '@/lib/config'
import { useTranslation } from '@/lib/hooks/use-translation'

export function useVersionCheck() {
  const { t } = useTranslation()
  const hasChecked = useRef(false)

  useEffect(() => {
    if (hasChecked.current) return
    hasChecked.current = true

    getConfig()
      .then(config => {
        if (!config.hasUpdate || !config.latestVersion) return

        const dismissKey = `version_notification_dismissed_${config.latestVersion}`
        if (sessionStorage.getItem(dismissKey)) return

        toast.info(t('advanced.updateAvailable').replace('{version}', config.latestVersion), {
          description: t('advanced.updateAvailableDesc'),
          duration: Infinity,
          closeButton: true,
          action: {
            label: t('advanced.viewOnGithub'),
            onClick: () => window.open('https://github.com/lfnovo/open-notebook', '_blank'),
          },
          onDismiss: () => sessionStorage.setItem(dismissKey, 'true'),
        })
      })
      .catch(() => {
        // Silently fail - version check is non-critical
      })
  }, [t])
}
```
