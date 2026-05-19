# Breakdown Review — 2026-05-15 — Python

Issue: #14
Date: 2026-05-15
Language: Python
Status: COMPLETED

## Repo 1 — anthropics/financial-services

- file_path: scripts/check.py
- snippet_url: https://github.com/anthropics/financial-services/blob/main/scripts/check.py

file_intent: Agent configuration reference validator
breakdown_what: Walks agent YAML configs to verify every referenced path — system prompts, skill directories, plugin bundles, and callable-agent manifests — actually exists on disk, reporting each broken reference with a precise location-tagged error message.
breakdown_responsibility: Acts as the pre-flight gate in the financial-services CI pipeline, catching dangling config references before agents are deployed — preventing silent failures in live investment banking workflows where a missing file path would break an MCP data connection mid-analysis.
breakdown_clever: The second half uses `filecmp.dircmp` to flag when a skill bundled into `agent-plugins/` has diverged from its canonical source in `vertical-plugins/`. Skills edited in the wrong directory drift silently; this surfaces that divergence at commit time instead of in a live financial workflow.
project_context: Anthropic's financial-services repo is a complete AI agent kit for investment banking, equity research, and wealth management, shipping as plugins for Claude Cowork and Claude Code. It connects to eleven financial data providers — FactSet, Morningstar, PitchBook, and S&P Global among them — via MCP connectors, enabling Claude to run DCF models, draft pitchbooks, and screen KYC files against live data.

### Reformatted Snippet

```python
def check_refs(yml: Path) -> None:
    try:
        data = yaml.safe_load(yml.read_text()) or {}
    except yaml.YAMLError:
        return
    base = yml.parent

    sys_spec = data.get("system")
    if isinstance(sys_spec, dict) and "file" in sys_spec:
        p = (base / sys_spec["file"]).resolve()
        if not p.is_file():
            err(
                f"ref: {rel(yml)}: system.file"
                f" -> {sys_spec['file']} (not found)"
            )

    for s in data.get("skills") or []:
        if isinstance(s, dict) and "path" in s:
            p = (base / s["path"]).resolve()
            if not p.exists():
                err(
                    f"ref: {rel(yml)}: skills.path"
                    f" -> {s['path']} (not found)"
                )
        if isinstance(s, dict) and "from_plugin" in s:
            p = (base / s["from_plugin"]).resolve()
            if not (p / "skills").is_dir():
                err(
                    f"ref: {rel(yml)}: skills.from_plugin"
                    f" -> {s['from_plugin']} (no skills/ dir)"
                )

    for c in data.get("callable_agents") or []:
        if isinstance(c, dict) and "manifest" in c:
            p = (base / c["manifest"]).resolve()
            if not p.is_file():
                err(
                    f"ref: {rel(yml)}: callable_agents"
                    f".manifest -> {c['manifest']}"
                    f" (not found)"
                )


# bundled-skill drift detection
src_by_name = {
    p.name: p
    for p in PLUGINS.glob(
        "vertical-plugins/*/skills/*"
    )
    if p.is_dir()
}
for bundled in sorted(
    PLUGINS.glob("agent-plugins/*/skills/*")
):
    if not bundled.is_dir():
        continue
    src = src_by_name.get(bundled.name)
    if not src:
        err(
            f"bundled-skill: {rel(bundled)}: "
            f"no vertical-plugins source named"
            f" '{bundled.name}'"
        )
        continue
    cmp = filecmp.dircmp(src, bundled)
    if cmp.diff_files or cmp.left_only or cmp.right_only:
        err(
            f"bundled-skill: {rel(bundled)}:"
            f" drifted from {rel(src)}"
            f" (run scripts/sync-agent-skills.py)"
        )
```

## Repo 2 — github/spec-kit

- file_path: src/specify_cli/workflows/expressions.py
- snippet_url: https://github.com/github/spec-kit/blob/main/src/specify_cli/workflows/expressions.py

file_intent: Workflow expression path resolver
breakdown_what: Resolves dotted accessor strings like `steps.specify.output.file` against a nested dict/list object, splitting on dots, detecting bracket-indexed arrays via regex, and returning `None` cleanly at any miss rather than raising an exception.
breakdown_responsibility: Powers the Specify CLI's cross-step data binding — when a later workflow phase references `steps.specify.output.file`, this function translates that string into the actual value from the execution context, letting spec phases chain outputs as inputs without manual wiring.
breakdown_clever: Every error branch — missing key, wrong type, out-of-range index — returns `None` rather than raising. This is a deliberate contract: callers in the workflow evaluator can chain multiple path lookups with plain `if` checks, with no try/except wrapping needed at any call site.
project_context: GitHub Spec-Kit is an open-source toolkit for Spec-Driven Development, a methodology that puts formal specifications at the center of AI-assisted coding. The Specify CLI drives a Spec → Plan → Tasks → Implement workflow that integrates with GitHub Copilot, Claude, and 30 other AI coding agents — positioning specs as the source of truth rather than ad-hoc prompts.

### Reformatted Snippet

```python
def _resolve_dot_path(obj: Any, path: str) -> Any:
    """Resolve a dotted path like
    ``steps.specify.output.file`` against *obj*.

    Supports dict key access and list indexing
    (e.g., ``task_list[0]``).
    """
    parts = path.split(".")
    current = obj
    for part in parts:
        # Handle list indexing: name[0]
        idx_match = re.match(
            r"^([\w-]+)\[(\d+)\]$", part
        )
        if idx_match:
            key = idx_match.group(1)
            idx = int(idx_match.group(2))
            if isinstance(current, dict):
                current = current.get(key)
            else:
                return None
            if (
                isinstance(current, list)
                and 0 <= idx < len(current)
            ):
                current = current[idx]
            else:
                return None
        elif isinstance(current, dict):
            current = current.get(part)
        else:
            return None
        if current is None:
            return None
    return current
```
