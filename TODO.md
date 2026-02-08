# IRIS — Before MVP Release

Difficulty: 1 (trivial) → 5 (major effort).

Tasks are grouped by workstream. Streams 1, 3, 4 can run in parallel. Stream 2 starts after Stream 3 finishes (shared `backend/` scope).

```
Time →
Stream 1 (Extension UX)      ████████████████
Stream 3 (Analysis Quality)   ████████████████
Stream 4 (Distribution)       ████████████████
Stream 2 (Backend Hardening)          ████████████
```

---

## Stream 1 — Extension UX

Scope: `packages/iris-vscode/`, `packages/iris-core/src/state/`
Agent: VS Code extension specialist. Reads current state machine in iris-core and decoration/webview code in iris-vscode. Builds on adapter pattern.

- [ ] **Error handling UX in extension** `[difficulty: 2]`
  What the user sees on: analysis failure, timeout, 401 (bad/missing key), network error. Currently no clear feedback.

- [ ] **Multi-file caching (client-side)** `[difficulty: 3]`
  Switching files re-triggers analysis every time. Cache recent results in extension memory so tab-switching is instant.

- [ ] **Analysis persistence across restarts** `[difficulty: 3]`
  Analysis results lost on extension reload. Persist to workspace storage so reopening VS Code doesn't lose everything.

---

## Stream 2 — Backend Hardening

Scope: `backend/src/` (routes, middleware, infra config)
Agent: Backend/DevOps engineer. Reads routes.py, server.py, deployment docs. Should not touch prompts.py. Run after Stream 3 to avoid merge conflicts.

- [ ] **Rate limiting** `[difficulty: 2]`
  Backend middleware to prevent abuse before going public. Per-key throttling.

- [ ] **Fix CloudWatch EMF ingestion** `[difficulty: 2]`
  EMF events emitted but not ingesting into CloudWatch metrics. Needed for production monitoring.

- [ ] **Delete legacy Lambda code** `[difficulty: 1]`
  Remove `authorizer.py`, `lambda_handler.py`, and related dead code. Update `backend/current-status.md`.

---

## Stream 3 — Analysis Quality

Scope: `backend/src/prompts.py`, `backend/tests/`
Agent: QA/prompt engineer. Reads prompts.py and output schema. Runs the backend locally to test analysis against sample files. Writes tests.

- [ ] **Prompt quality evaluation & tuning** `[difficulty: 3]`
  Systematically test analysis output across diverse real-world files. Tune prompt until consistently useful.

- [ ] **Edge case handling** `[difficulty: 2]`
  Very large files, empty files, minified code, generated code. Graceful behavior instead of silent failure.

- [ ] **Test coverage** `[difficulty: 3]`
  Backend unit tests, extension integration tests. Enough coverage to refactor with confidence.

---

## Stream 4 — Distribution & Marketing

Scope: marketplace config, new site files, `backend/src/` (auth)
Agent: Product/fullstack generalist. Handles marketplace packaging, landing page, API key system. Mostly new files — low conflict risk.

- [ ] **Publish extension to VS Code Marketplace** `[difficulty: 2]`
  Package, configure publisher account, publish. Gate for everything else.

- [ ] **API key distribution** `[difficulty: 4]`
  How do users get a key? Self-serve signup, waitlist, or manual? Needs a minimal auth system (generate, validate, revoke keys).

- [ ] **Landing page at iris-codes.com** `[difficulty: 2]`
  Simple marketing site — what IRIS is, demo/screenshots, install link. Domain already owned.

- [ ] **License** `[difficulty: 1]`
  Pick and add a license before public release.

---

## Post-MVP growth

- [ ] **Expand language support** `[difficulty: 2 per language]`
  Go, Rust, Java, C#, C/C++. Mainly tree-sitter grammars + prompt tuning per language.

- [ ] **Scaling plan** `[difficulty: 4]`
  `t3.micro` (1 GB RAM) won't hold under real load. Plan for vertical scaling or horizontal (load balancer, multiple instances).
