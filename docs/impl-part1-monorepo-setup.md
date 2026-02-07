# Implementation Plan: Part 1 — Monorepo Setup

## Goal

Move files into `packages/` structure with npm workspaces. Extension compiles and works exactly as before. `iris-core` exists but is empty.

## Current State (verified)

- **Root**: No `package.json` exists at repo root.
- **Extension**: Lives at `vscode-extension/` with its own `package.json`, `tsconfig.json`, `node_modules/`, and `package-lock.json`.
- **Current `vscode-extension/tsconfig.json`**:
  ```json
  {
    "compilerOptions": {
      "module": "Node16",
      "target": "ES2022",
      "lib": ["ES2022"],
      "sourceMap": true,
      "rootDir": "src",
      "strict": true
    }
  }
  ```
  Note: no `outDir` (esbuild handles output), no `esModuleInterop`, no `declaration`.
- **Current `.gitignore`**: Has `node_modules/` but no `dist/` rule.
- **`CLAUDE.md`**: References `cd vscode-extension` and `vscode-extension/src/` paths — must be updated.

## Steps

### 1. Create root `package.json`

Create `/package.json` at repo root:

```json
{
  "name": "iris-monorepo",
  "private": true,
  "workspaces": ["packages/*"]
}
```

No dependencies at root level. `private: true` prevents accidental publishing.

### 2. Create root `tsconfig.base.json`

Create `/tsconfig.base.json` at repo root with shared compiler options:

```json
{
  "compilerOptions": {
    "module": "Node16",
    "target": "ES2022",
    "lib": ["ES2022"],
    "strict": true,
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

Key decisions:
- `declaration` and `declarationMap`: Added so `iris-core` emits `.d.ts` files. iris-vscode overrides this to `false` since esbuild bundles everything.
- **No `esModuleInterop`**: The current tsconfig does not have it, and existing code works without it. Adding it changes how `import * as X` works and could introduce subtle issues. Don't add what isn't needed.
- **No `outDir` or `rootDir`**: These are package-specific, set in each package's own tsconfig.

### 3. Create `packages/iris-core/` skeleton

Create the following directory structure:

```
packages/iris-core/
  package.json
  tsconfig.json
  src/
    index.ts
```

**`packages/iris-core/package.json`:**
```json
{
  "name": "@iris/core",
  "version": "0.0.1",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

**`packages/iris-core/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

**`packages/iris-core/src/index.ts`:**
```ts
// @iris/core — domain models, state machine, API client
// Will be populated in Part 2
export {};
```

Note: `export {}` makes the file a valid ES module and ensures `tsc` emits output. An empty file or a comment-only file emits nothing, and the build would succeed but produce no `dist/index.js`, which means `"main": "dist/index.js"` would point to nothing.

### 4. Move `vscode-extension/` → `packages/iris-vscode/`

This step requires care because of `node_modules/` and `package-lock.json`.

**Sequence:**

1. Delete `vscode-extension/node_modules/` — it will be recreated by `npm install` at the root. Git doesn't track it, but it must be removed before the move so it doesn't interfere.
2. Delete `vscode-extension/package-lock.json` — npm workspaces uses a single root-level lock file. The old lock file is stale after the move.
3. Move the directory: `git mv vscode-extension packages/iris-vscode`.
4. Use `git mv` (not plain `mv`) so git tracks the rename and preserves history.

All internal relative paths (imports, esbuild config, etc.) stay the same since the directory contents don't change.

### 5. Update `packages/iris-vscode/tsconfig.json`

Replace the contents with:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "declaration": false
  }
}
```

What changes from the original:
- Adds `"extends": "../../tsconfig.base.json"` to inherit shared options.
- Adds `"declaration": false` — the VS Code extension doesn't need `.d.ts` files (esbuild bundles everything).
- `module`, `target`, `lib`, `strict`, `sourceMap` are now inherited from base.
- `rootDir` stays (same value as before).

What stays the same: No `outDir` (esbuild handles output, `tsc` is only used for type checking via `--noEmit`).

### 6. Add `@iris/core` dependency to `iris-vscode`

In `packages/iris-vscode/package.json`, add a `dependencies` field (the file currently has no `dependencies`, only `devDependencies`):

```json
"dependencies": {
  "@iris/core": "*"
}
```

Add this block before or after the existing `"devDependencies"` block.

The `*` version resolves to the local workspace package via npm workspaces symlink. At this point nothing imports from `@iris/core` yet, but the dependency must exist for Part 2.

### 7. Update `.gitignore`

Add `dist/` to the root `.gitignore` to cover `packages/iris-core/dist/`:

```
# build output
dist/
```

Add this line to the existing `.gitignore`. The current file has no `dist/` rule.

### 8. Update `CLAUDE.md`

Replace all `vscode-extension` path references with `packages/iris-vscode`:

- `cd vscode-extension` → `cd packages/iris-vscode`
- `vscode-extension/src/` → `packages/iris-vscode/src/`
- `vscode-extension/current-status.md` → `packages/iris-vscode/current-status.md`

These appear in the "Build & Development Commands" section and the "Architecture" section.

### 9. Install and verify

Run from repo root:

```bash
npm install
```

This creates:
- A root-level `node_modules/` with workspace symlinks
- `node_modules/@iris/core` → symlink to `packages/iris-core`
- All devDependencies for iris-vscode installed in root `node_modules/`

Then verify both packages:

```bash
cd packages/iris-core && npm run build
```

Expected: Emits `dist/index.js` and `dist/index.d.ts`. Zero errors.

```bash
cd packages/iris-vscode && npm run compile
```

Expected: `check-types` passes, lint passes, esbuild produces `dist/extension.js`. Identical behavior to before.

## Files Created/Modified

| Action | Path |
|---|---|
| Create | `/package.json` |
| Create | `/tsconfig.base.json` |
| Create | `packages/iris-core/package.json` |
| Create | `packages/iris-core/tsconfig.json` |
| Create | `packages/iris-core/src/index.ts` |
| Delete | `vscode-extension/node_modules/` (before move) |
| Delete | `vscode-extension/package-lock.json` (before move) |
| Move | `vscode-extension/` → `packages/iris-vscode/` (via `git mv`) |
| Modify | `packages/iris-vscode/tsconfig.json` |
| Modify | `packages/iris-vscode/package.json` (add `@iris/core` dependency) |
| Modify | `.gitignore` (add `dist/`) |
| Modify | `CLAUDE.md` (update paths) |

## Verification Checklist

- [ ] `npm install` at root succeeds
- [ ] `node_modules/@iris/core` symlink exists and points to `packages/iris-core`
- [ ] `iris-core` builds with `npm run build` — emits `dist/index.js` and `dist/index.d.ts`
- [ ] `iris-vscode` compiles with `npm run compile` — zero errors
- [ ] No changes to any source code in `packages/iris-vscode/src/`
- [ ] `git status` shows the move was tracked (renamed files, not delete+create)
- [ ] `.gitignore` covers `dist/`
- [ ] `CLAUDE.md` has no remaining `vscode-extension/` references

## Risks

- **npm workspace hoisting** — npm workspaces hoists dependencies to the root `node_modules/`. If iris-vscode has a devDependency that conflicts with iris-core's, npm may fail. Unlikely with only `typescript` in iris-core, but watch for errors during `npm install`.
- **VS Code dev host `--extensionDevelopmentPath`** — The `.vscode/launch.json` inside `packages/iris-vscode/.vscode/` uses `${workspaceFolder}` which resolves relative to whichever folder is open in VS Code. If the root folder is open instead of `packages/iris-vscode/`, the extension won't launch correctly. This is a development workflow concern, not a build concern — can be addressed separately.
- **esbuild resolving dependencies** — After the move, esbuild runs from `packages/iris-vscode/` and resolves `node_modules` via npm workspace hoisting at root. This should work transparently, but if esbuild can't find a dependency, check that `npm install` was run from the root.
