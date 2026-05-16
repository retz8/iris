# Snippet Candidates — 2026-05-15 — Python

Issue: #14
Date: 2026-05-15
Language: Python
Status: PENDING_SELECTION

## Repo 1 — anthropics/financial-services

### Candidate 1 (most important)

- file_path: scripts/orchestrate.py
- snippet_url: https://github.com/anthropics/financial-services/blob/main/scripts/orchestrate.py
- reasoning: This is the central orchestration loop for the entire multi-agent system — it streams events from a Claude managed-agent session, extracts handoff requests from model output using a regex + JSON parse, validates them against a hard allowlist and JSON Schema to defeat prompt-injection, and steers the target agent, making it the linchpin that wires every specialist agent together.

```python
ALLOWED_TARGETS = {
    "pitch-agent", "market-researcher",
    "earnings-reviewer", "meeting-prep-agent",
    "model-builder", "gl-reconciler",
    "kyc-screener", "valuation-reviewer",
    "month-end-closer", "statement-auditor",
}

HANDOFF_PAYLOAD_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["event"],
    "properties": {
        "event": {
            "type": "string",
            "maxLength": 2000,
        },
        "context_ref": {
            "type": "string",
            "maxLength": 256,
            "pattern": r"^[A-Za-z0-9 ._/:#-]+$",
        },
    },
}

HANDOFF_RE = re.compile(
    r'\{"type":\s*"handoff_request".*?\}',
    re.DOTALL,
)


def extract_handoff(text: str) -> dict | None:
    m = HANDOFF_RE.search(text)
    if not m:
        return None
    try:
        obj = json.loads(m.group(0))
    except json.JSONDecodeError:
        return None
    target = obj.get("target_agent")
    payload = obj.get("payload")
    if target not in ALLOWED_TARGETS:
        return None
    try:
        jsonschema.validate(
            instance=payload,
            schema=HANDOFF_PAYLOAD_SCHEMA,
        )
    except jsonschema.ValidationError:
        return None
    return {"target_agent": target, "payload": payload}


def run(
    source_session_id: str,
    agent_ids: dict[str, str],
) -> None:
    """agent_ids maps slug -> deployed CMA agent_id."""
    client = anthropic.Anthropic()
    with client.beta.agents.sessions.stream(
        session_id=source_session_id
    ) as stream:  # type: ignore[attr-defined]
        for event in stream:
            if (
                event.type != "message_delta"
                or not getattr(event, "text", None)
            ):
                continue
            handoff = extract_handoff(event.text)
            if not handoff:
                continue
            target_slug = handoff["target_agent"]
            target_id = agent_ids.get(target_slug)
            if not target_id:
                continue
            client.beta.agents.sessions.steer(  # type: ignore[attr-defined]
                agent_id=target_id,
                input=handoff["payload"]["event"],
            )
```

### Candidate 2

- file_path: scripts/version_bump.py
- snippet_url: https://github.com/anthropics/financial-services/blob/main/scripts/version_bump.py
- reasoning: This idempotent semver enforcer guarantees every modified plugin is exactly one patch version ahead of main — the `is_ahead` check prevents double-bumps across multiple commits on a branch, and `changed_plugins` uses a parent-path traversal to correctly attribute any file change to its owning plugin, making this non-obvious tooling that gates update delivery to end users.

```python
def is_ahead(
    work: str | None,
    base: str | None,
) -> bool:
    """True if working version is strictly > base."""
    if base is None:
        # Plugin is new on this branch.
        return True
    wv = parse_semver(work or "")
    bv = parse_semver(base)
    if wv is None or bv is None:
        return (work or "") != base
    return wv > bv


def changed_plugins(
    base: str,
    staged_only: bool,
) -> list[Path]:
    """Plugin roots touched relative to base."""
    if staged_only:
        files = (
            git_ok("diff", "--cached", "--name-only") or ""
        )
    else:
        files = (
            git_ok(
                "diff", "--name-only", f"{base}...HEAD"
            ) or ""
        )
    changed = {
        Path(line)
        for line in files.splitlines()
        if line
    }

    hits: list[Path] = []
    for pj in all_plugin_jsons():
        root_rel = Path(rel(plugin_root(pj)))
        if any(
            c == root_rel
            or root_rel in c.parents
            or str(c).startswith(f"{root_rel}/")
            for c in changed
        ):
            hits.append(pj)
    return hits


def cmd_apply(base: str) -> int:
    bumped = []
    for pj in changed_plugins(base, staged_only=True):
        work = working_version(pj)
        bv = base_version(base, pj)
        if is_ahead(work, bv):
            continue  # already bumped — idempotent no-op
        new = patch_bump(bv or work or "0.0.0")
        data = json.loads(pj.read_text())
        data["version"] = new
        pj.write_text(json.dumps(data, indent=2) + "\n")
        git("add", rel(pj))
        bumped.append((rel(plugin_root(pj)), bv, new))

    for name, old, new in bumped:
        print(
            f"[version-bump] {name}: "
            f"{old or '(new)'} -> {new}"
        )
    return 0
```

### Candidate 3 (least important)

- file_path: scripts/check.py
- snippet_url: https://github.com/anthropics/financial-services/blob/main/scripts/check.py
- reasoning: The `check_refs` function and the bundled-skill drift detection block implement the monorepo's cross-file integrity layer — resolving `system.file`, `skills[].path`, and `callable_agents[].manifest` references from YAML against the filesystem, and using `filecmp.dircmp` to detect when a vendored skill copy has silently drifted from its canonical vertical-plugin source.

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

### Candidate 1 (most important)

- file_path: src/specify_cli/workflows/expressions.py
- snippet_url: https://github.com/github/spec-kit/blob/main/src/specify_cli/workflows/expressions.py
- reasoning: This is the sandboxed expression evaluator that powers all workflow condition and template logic — understanding how it walks dot-paths with list-index notation and short-circuits operator precedence by hand reveals exactly how spec-kit keeps untrusted YAML safe from arbitrary code execution.

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

### Candidate 2

- file_path: src/specify_cli/workflows/engine.py
- snippet_url: https://github.com/github/spec-kit/blob/main/src/specify_cli/workflows/engine.py
- reasoning: `_coerce_input` encodes a subtle correctness trap — Python's `bool` is a subclass of `int`, so `float(True)` silently succeeds; the explicit `isinstance(value, bool)` early-exit guard is the only thing preventing YAML `default: true` from coercing to `1` when `type: number` is declared.

```python
@staticmethod
def _coerce_input(
    name: str, value: Any, input_def: dict[str, Any]
) -> Any:
    """Coerce a provided input value to the declared type."""
    input_type = input_def.get("type", "string")
    enum_values = input_def.get("enum")

    if input_type == "number":
        # Reject bools explicitly: bool is a subclass of
        # int so float(True) succeeds and would silently
        # coerce a YAML authoring mistake like
        # type: number + default: true into 1.
        if isinstance(value, bool):
            msg = (
                f"Input {name!r} expected a number,"
                f" got {value!r}."
            )
            raise ValueError(msg)
        try:
            value = float(value)
            if value == int(value):
                value = int(value)
        except (ValueError, TypeError):
            msg = (
                f"Input {name!r} expected a number,"
                f" got {value!r}."
            )
            raise ValueError(msg) from None
    elif input_type == "boolean":
        if isinstance(value, str):
            if value.lower() in ("true", "1", "yes"):
                value = True
            elif value.lower() in ("false", "0", "no"):
                value = False
            else:
                msg = (
                    f"Input {name!r} expected a boolean,"
                    f" got {value!r}."
                )
                raise ValueError(msg)
        elif not isinstance(value, bool):
            msg = (
                f"Input {name!r} expected a boolean,"
                f" got {value!r}."
            )
            raise ValueError(msg)
    elif input_type == "string":
        if not isinstance(value, str):
            msg = (
                f"Input {name!r} expected a string,"
                f" got {value!r}."
            )
            raise ValueError(msg)

    if enum_values is not None and value not in enum_values:
        msg = (
            f"Input {name!r} value {value!r} not in"
            f" allowed values: {enum_values}."
        )
        raise ValueError(msg)

    return value
```

### Candidate 3 (least important)

- file_path: src/specify_cli/agents.py
- snippet_url: https://github.com/github/spec-kit/blob/main/src/specify_cli/agents.py
- reasoning: `render_toml_command` shows a practical multi-strategy fallback for generating valid TOML — it prefers triple-double-quote multiline strings, falls back to triple-single-quote when the body itself contains `"""`, and escapes to a basic string only as a last resort, preventing silent TOML parse failures when command bodies contain delimiter sequences.

```python
def render_toml_command(
    self, frontmatter: dict, body: str, source_id: str
) -> str:
    """Render command in TOML format."""
    toml_lines = []

    if "description" in frontmatter:
        toml_lines.append(
            "description = "
            + self._render_basic_toml_string(
                frontmatter["description"]
            )
        )
        toml_lines.append("")

    toml_lines.append(f"# Source: {source_id}")
    toml_lines.append("")

    # Keep TOML output valid even when body contains
    # triple-quote delimiters.
    # Prefer multiline forms, then fall back to
    # escaped basic string.
    if '"""' not in body:
        toml_lines.append('prompt = """')
        toml_lines.append(body)
        toml_lines.append('"""')
    elif "'''" not in body:
        toml_lines.append("prompt = '''")
        toml_lines.append(body)
        toml_lines.append("'''")
    else:
        toml_lines.append(
            "prompt = "
            + self._render_basic_toml_string(body)
        )

    return "\n".join(toml_lines)
```
