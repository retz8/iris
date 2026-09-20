# Breakdown Review — 2026-03-07 — JS/TS

Issue: #4
Date: 2026-03-07
Language: JS/TS
Status: PENDING_APPROVAL

## Repo 1 — grab/cursor-talk-to-figma-mcp

- file_path: src/talk_to_figma_mcp/server.ts
- snippet_url: https://github.com/grab/cursor-talk-to-figma-mcp/blob/main/src/talk_to_figma_mcp/server.ts

file_intent: Figma WebSocket command dispatcher
breakdown_what: Sends a typed command to Figma over an open WebSocket, wrapping it in a UUID-keyed Promise that a timeout will reject and clean up if Figma doesn't reply within the deadline.
breakdown_responsibility: Acts as the sole egress point for all agent-to-Figma communication; because Figma's plugin API only executes inside the desktop app's sandbox, every read and write from the MCP server must pass through this WebSocket relay.
breakdown_clever: The join command is special-cased at two points — it skips the channel prerequisite check and uses a different message type — so this single function doubles as both the WebSocket protocol handshake and the application command dispatcher, treating channel establishment as just another command.
project_context: cursor-talk-to-figma-mcp is Grab's open-source MCP server that lets AI agents like Cursor and Claude Code read and modify Figma documents programmatically via a WebSocket bridge, enabling design-to-code workflows without manual hand-off.

### Reformatted Snippet

```typescript
function sendCommandToFigma(
  command: FigmaCommand,
  params: unknown = {},
  timeoutMs: number = 30000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectToFigma();
      reject(new Error(
        "Not connected to Figma. Attempting to connect..."
      ));
      return;
    }

    const requiresChannel = command !== "join";
    if (requiresChannel && !currentChannel) {
      reject(new Error(
        "Must join a channel before sending commands"
      ));
      return;
    }

    const id = uuidv4();
    const request = {
      id,
      type: command === "join" ? "join" : "message",
      ...(command === "join"
        ? { channel: (params as any).channel }
        : { channel: currentChannel }),
      message: {
        id,
        command,
        params: {
          ...(params as any),
          commandId: id,
        },
      },
    };

    const timeout = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Request to Figma timed out'));
      }
    }, timeoutMs);

    pendingRequests.set(id, {
      resolve,
      reject,
      timeout,
      lastActivity: Date.now()
    });

    ws.send(JSON.stringify(request));
  });
}
```

## Repo 2 — FlowiseAI/Flowise

- file_path: packages/server/src/utils/domainValidation.ts
- snippet_url: https://github.com/FlowiseAI/Flowise/blob/main/packages/server/src/utils/domainValidation.ts

file_intent: Chatflow ID URL path extractor
breakdown_what: Extracts a chatflow UUID from a URL by locating a known slug segment and taking the immediately following path component, stripping any query string from the result.
breakdown_responsibility: Called by Flowise's domain validation middleware to resolve which chatflow an embedded chatbot request targets before the server authorizes or executes it against the database.
breakdown_clever: The try/catch wraps only array operations — split, indexOf, bracket indexing — none of which throw in JavaScript; the logger.error branch is unreachable dead code, most likely a leftover from a previous version that used new URL() and could throw on malformed input.
project_context: Flowise is an open-source drag-and-drop builder for LLM workflows and chatbots used by teams at AWS, Accenture, and Deloitte — it wraps LangChain in a visual interface so developers can assemble RAG pipelines and AI agents without writing orchestration code.

### Reformatted Snippet

```typescript
function extractChatflowId(url: string): string | null {
    try {
        const urlParts = url.split('/')
        const slug = extractSlugFromUrl(url)
        if (!slug) return null
        const slugIndex = urlParts.indexOf(slug)
        if (
            slugIndex !== -1 &&
            urlParts.length > slugIndex + 1
        ) {
            const chatflowId = urlParts[slugIndex + 1]
            return chatflowId.split('?')[0]
        }
        return null
    } catch (error) {
        logger.error(
            'Error extracting chatflow ID from URL:',
            error
        )
        return null
    }
}
```
