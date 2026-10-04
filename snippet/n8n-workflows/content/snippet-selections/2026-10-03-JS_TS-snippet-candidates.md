# Snippet Candidates — 2026-10-03 — JS_TS

Issue: #33
Date: 2026-10-03
Language: JS_TS
Status: COMPLETED

## Repo 1 — anthropics/claude-code-action

### Candidate 1 (most important)

- file_path: src/mcp/binary-detection.ts
- snippet_url: https://github.com/anthropics/claude-code-action/blob/main/src/mcp/binary-detection.ts
- reasoning: This decides when a file Claude just wrote must be committed as a base64 blob instead of inline text, directly underpinning the action's ability to commit code changes straight through the GitHub API instead of local git.

```typescript
export function isBinaryContent(content: Buffer): boolean {
  if (content.includes(0)) {
    return true;
  }

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(content);
    return false;
  } catch {
    return true;
  }
}
```

### Candidate 2

- file_path: src/github/token.ts
- snippet_url: https://github.com/anthropics/claude-code-action/blob/main/src/github/token.ts
- reasoning: Parses a user-supplied multi-line permissions override into the scope map used when exchanging the workflow's OIDC token for a short-lived GitHub App token, a security-sensitive step that runs on every invocation of the action.

```typescript
export function parseAdditionalPermissions():
  | Record<string, string>
  | undefined {
  const raw = process.env.ADDITIONAL_PERMISSIONS;
  if (!raw || !raw.trim()) {
    return undefined;
  }

  const additional: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    if (key && value) {
      additional[key] = value;
    }
  }

  if (Object.keys(additional).length === 0) {
    return undefined;
  }

  return { ...DEFAULT_PERMISSIONS, ...additional };
}
```

### Candidate 3 (least important)

- file_path: src/github/utils/actor-filter.ts
- snippet_url: https://github.com/anthropics/claude-code-action/blob/main/src/github/utils/actor-filter.ts
- reasoning: Implements the include/exclude-priority rule for which comment authors' content gets fed to Claude as context, a smaller optional configuration knob rather than a core mechanism of the action.

```typescript
export function shouldIncludeCommentByActor(
  actor: string,
  includeActors: string[],
  excludeActors: string[],
): boolean {
  // Check exclusion first (exclusion takes priority)
  if (excludeActors.length > 0) {
    for (const pattern of excludeActors) {
      if (actorMatchesPattern(actor, pattern)) {
        return false; // Excluded
      }
    }
  }

  // Check inclusion
  if (includeActors.length > 0) {
    for (const pattern of includeActors) {
      if (actorMatchesPattern(actor, pattern)) {
        return true; // Explicitly included
      }
    }
    return false; // Not in include list
  }

  // No filters or passed all checks
  return true;
}
```

## Repo 2 — oblien/openship

### Candidate 1 (most important)

- file_path: packages/platform/src/engine/modules/github/clone-auth.ts
- snippet_url: https://github.com/oblien/openship/blob/main/packages/platform/src/engine/modules/github/clone-auth.ts
- reasoning: Resolves the git credential used to clone a repo for a build — the entry point of Openship's "connect a repo, we deploy it" workflow, falling back from a local gh token to a GitHub App installation token.

```typescript
async function resolveLocalCredential(
  ctx: RequestContext,
  tokenCtx: TokenContext,
): Promise<{ token?: string }> {
  const customSource = tokenCtx.owner
    ? await resolveGitHubApiBaseUrl(
        ctx.organizationId,
        tokenCtx.owner,
        tokenCtx.installationId,
      ).catch(() => null)
    : null;
  if (!customSource) {
    const ghToken = await getLocalGhToken();
    if (ghToken) return { token: ghToken };
  }
  const r = await tokenFor(ctx, "local", {
    ...tokenCtx,
    ...(customSource ? { only: ["app-installation"] } : {}),
  });
  return r?.token ? { token: r.token } : {};
}
```

### Candidate 2

- file_path: packages/core/src/service-routing.ts
- snippet_url: https://github.com/oblien/openship/blob/main/packages/core/src/service-routing.ts
- reasoning: A hand-rolled FNV-1a hash that mints the deterministic suffix for every auto-generated `<slug>.opsh.io` hostname, so a truncated label stays unique and stable across redeploys.

```typescript
function labelHash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}
```

### Candidate 3 (least important)

- file_path: packages/platform/src/engine/modules/services/service.service.ts
- snippet_url: https://github.com/oblien/openship/blob/main/packages/platform/src/engine/modules/services/service.service.ts
- reasoning: A self-healing-bug repair predicate — it recognizes a phantom "ghost" service row the platform itself auto-created purely by its field signature, so a known incident class can be safely cleaned up.

```typescript
export function isMaterializedAppRow(
  project: Pick<Project, "slug">,
  row: Pick<
    Service,
    | "kind"
    | "name"
    | "sortOrder"
    | "image"
    | "build"
    | "dockerfile"
    | "framework"
    | "installCommand"
    | "buildCommand"
    | "startCommand"
    | "outputDirectory"
  >,
): boolean {
  return (
    row.kind === "monorepo" &&
    row.name === project.slug &&
    row.sortOrder === -1 &&
    !row.image &&
    !row.build &&
    !row.dockerfile &&
    !row.framework &&
    !row.installCommand &&
    !row.buildCommand &&
    !row.startCommand &&
    !row.outputDirectory
  );
}
```
