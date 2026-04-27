# Breakdown Review — 2026-04-24 — JS/TS

Issue: #11
Date: 2026-04-24
Language: JS/TS
Status: COMPLETED

## Repo 1 — onlook-dev/onlook

- file_path: packages/parser/src/template-node/map.ts
- snippet_url: https://github.com/onlook-dev/onlook/blob/main/packages/parser/src/template-node/map.ts

file_intent: AST-to-TemplateNode mapping builder
breakdown_what: Traverses a Babel AST to build a map from component OID attributes to TemplateNode descriptors, tracking nested component scope and dynamic rendering context (array maps, conditionals) as it walks each JSX element.
breakdown_responsibility: Produces the bidirectional index Onlook needs to correlate a visually selected element in the browser with its exact source location — without this map, clicking a rendered component has no way to find its definition in the AST.
breakdown_clever: Two stacks run in parallel during traversal — `componentStack` for component scope and `dynamicTypeStack` for render-list context. Rather than walking the tree multiple times, the visitor resolves both dimensions simultaneously, so an element inside `.map()` nested in a conditional captures both facts in one pass.
project_context: Onlook is a visual React editor that syncs design changes back to source code in real time, used by designers and developers who want to edit live React components in a Figma-like interface without touching the codebase directly.

### Reformatted Snippet

```typescript
export function createTemplateNodeMap({
    ast,
    filename,
    branchId,
}: {
    ast: T.File;
    filename: string;
    branchId: string;
}): Map<string, TemplateNode> {
    const mapping = new Map<string, TemplateNode>();
    const componentStack: string[] = [];
    const dynamicTypeStack: DynamicType[] = [];

    traverse(ast, {
        FunctionDeclaration: {
            enter(path) {
                if (!path.node.id) return;
                componentStack.push(path.node.id.name);
            },
            exit() { componentStack.pop(); },
        },
        VariableDeclaration: {
            enter(path) {
                const decl = path.node.declarations[0]?.id;
                if (!decl || !t.isIdentifier(decl)) return;
                componentStack.push(decl.name);
            },
            exit() { componentStack.pop(); },
        },
        CallExpression: {
            enter(path) {
                if (isNodeElementArray(path.node)) {
                    dynamicTypeStack.push(DynamicType.ARRAY);
                }
            },
            exit(path) {
                if (isNodeElementArray(path.node)) {
                    dynamicTypeStack.pop();
                }
            },
        },
        ConditionalExpression: {
            enter() {
                dynamicTypeStack.push(
                    DynamicType.CONDITIONAL,
                );
            },
            exit() { dynamicTypeStack.pop(); },
        },
        JSXElement(path) {
            if (isReactFragment(
                path.node.openingElement,
            )) return;

            const existingOid = getExistingOid(
                path.node.openingElement.attributes,
            );
            if (!existingOid) return;

            const newTemplateNode = createTemplateNode(
                path,
                branchId,
                filename,
                componentStack,
                getDynamicTypeInfo(path),
                getCoreElementInfo(path),
            );
            mapping.set(existingOid.value, newTemplateNode);
        },
    });
    return mapping;
}
```

## Repo 2 — KeygraphHQ/shannon

- file_path: apps/worker/src/temporal/workflows.ts
- snippet_url: https://github.com/KeygraphHQ/shannon/blob/main/apps/worker/src/temporal/workflows.ts

file_intent: Bounded async exploit concurrency scheduler
breakdown_what: Runs an array of exploit pipeline thunks with a bounded concurrency limit, launching the next task only when a slot opens, and collecting all results — successes and failures — without short-circuiting on error.
breakdown_responsibility: Controls how many vulnerability exploits Shannon runs simultaneously against a target, preventing resource exhaustion and rate-limit detection while ensuring every planned attack attempt completes regardless of individual failures.
breakdown_clever: `slot` closes over itself in its own `.finally()`, making the promise its own cleanup token. This self-referential pattern works because `slot` is assigned before the microtask fires — rewrite it with `async/await` and the self-reference breaks unless you carefully hoist the variable declaration first.
project_context: Shannon is an autonomous AI penetration tester that analyzes source code and executes real exploits against running web applications, used by security teams to prove vulnerabilities before they reach production.

### Reformatted Snippet

```typescript
async function runWithConcurrencyLimit(
  thunks: Array<() => Promise<VulnExploitPipelineResult>>,
  limit: number,
): Promise<PromiseSettledResult<VulnExploitPipelineResult>[]> {
  const results: PromiseSettledResult<
    VulnExploitPipelineResult
  >[] = [];
  const inFlight = new Set<Promise<void>>();

  for (const thunk of thunks) {
    const slot = thunk()
      .then(
        (value) => {
          results.push({ status: 'fulfilled', value });
        },
        (reason: unknown) => {
          results.push({ status: 'rejected', reason });
        },
      )
      .finally(() => {
        inFlight.delete(slot);
      });

    inFlight.add(slot);

    if (inFlight.size >= limit) {
      await Promise.race(inFlight);
    }
  }

  await Promise.allSettled(inFlight);
  return results;
}
```
