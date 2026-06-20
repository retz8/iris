# Snippet Candidates — 2026-06-19 — Python

Issue: #19
Date: 2026-06-19
Language: Python
Status: PENDING_SELECTION

## Repo 1 — NVIDIA/SkillSpector

### Candidate 1 (most important)

- file_path: src/skillspector/nodes/analyzers/behavioral_taint_tracking.py
- snippet_url: https://github.com/NVIDIA/SkillSpector/blob/main/src/skillspector/nodes/analyzers/behavioral_taint_tracking.py
- reasoning: The `_pick_rule` dispatch and `_TaintedVar` NamedTuple reveal how SkillSpector classifies source-to-sink data flows by specificity — credential-to-network earns CRITICAL/TT3 while a generic taint indirect flow falls back to MEDIUM/TT2 — making the threat taxonomy explicit and auditable.

```python
class _TaintedVar(NamedTuple):
    name: str
    source_call: str
    lineno: int


def _pick_rule(source_name: str, sink_name: str, is_direct: bool) -> str:
    """Choose the most specific rule ID for a source->sink pair."""
    if source_name in _CREDENTIAL_SOURCES and sink_name in _NETWORK_OUTPUT_SINKS:
        return "TT3"
    if source_name in _FILE_READ_SOURCES and sink_name in _NETWORK_OUTPUT_SINKS:
        return "TT4"
    if source_name in _EXTERNAL_INPUT_SOURCES and sink_name in _EXEC_SINKS:
        return "TT5"
    return "TT1" if is_direct else "TT2"
```

### Candidate 2

- file_path: src/skillspector/nodes/analyzers/mcp_least_privilege.py
- snippet_url: https://github.com/NVIDIA/SkillSpector/blob/main/src/skillspector/nodes/analyzers/mcp_least_privilege.py
- reasoning: `_detect_capabilities` scans raw source code with per-category regex patterns to infer what a skill actually does, forming one half of SkillSpector's least-privilege gap analysis where the inferred capabilities are then compared against what the skill's manifest actually declares.

```python
def _detect_capabilities(content: str) -> set[str]:
    """Return set of capability categories found in *content*."""
    found: set[str] = set()
    for cap, patterns in _CAPABILITY_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, content, re.IGNORECASE):
                found.add(cap)
                break
    return found
```

### Candidate 3 (least important)

- file_path: src/skillspector/nodes/analyzers/common.py
- snippet_url: https://github.com/NVIDIA/SkillSpector/blob/main/src/skillspector/nodes/analyzers/common.py
- reasoning: `build_type_map` uses a nested resolver that walks `import` and `from … import` statements to build an alias table, then resolves constructor calls like `p = Path(x)` to fully-qualified types — enabling `resolve_call_name_typed` to correctly identify `p.read_text()` as `pathlib.Path.read_text` rather than the opaque `p.read_text`.

```python
def build_type_map(tree: ast.Module) -> dict[str, str]:
    import_aliases = _build_import_aliases(tree)
    type_map: dict[str, str] = {}

    def _resolve_ctor(call_node: ast.Call) -> str | None:
        raw = resolve_dotted_name(call_node.func)
        if raw is None:
            return None
        root, _, rest = raw.partition(".")
        resolved_root = import_aliases.get(root, root)
        return f"{resolved_root}.{rest}" if rest else resolved_root

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Call):
            ctor = _resolve_ctor(node.value)
            if ctor:
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        type_map[target.id] = ctor
        elif isinstance(node, ast.With):
            for item in node.items:
                if (
                    isinstance(item.context_expr, ast.Call)
                    and item.optional_vars is not None
                    and isinstance(item.optional_vars, ast.Name)
                ):
                    ctor = _resolve_ctor(item.context_expr)
                    if ctor:
                        type_map[item.optional_vars.id] = ctor

    return type_map
```

## Repo 2 — calesthio/OpenMontage

### Candidate 1 (most important)

- file_path: .agents/skills/manimgl-best-practices/examples/lorenz_attractor.py
- snippet_url: https://github.com/calesthio/OpenMontage/blob/main/.agents/skills/manimgl-best-practices/examples/lorenz_attractor.py
- reasoning: These two utility functions are the computational heart of the repo — they encapsulate a scipy ODE solver integration that produces the chaotic trajectory data every Lorenz scene depends on, making them the clearest example of how the project bridges numerical simulation and visual animation.

```python
def lorenz_system(t, state, sigma=10, rho=28, beta=8/3):
    """
    The Lorenz system of differential equations.

    These equations model atmospheric convection and
    exhibit chaotic behavior for certain parameter values.
    """
    x, y, z = state
    dxdt = sigma * (y - x)
    dydt = x * (rho - z) - y
    dzdt = x * y - beta * z
    return [dxdt, dydt, dzdt]


def ode_solution_points(
    function, state0, time, dt=0.01
):
    """
    Solve an ODE system and return trajectory points.

    Returns:
        Array of shape (n_points, 3) with trajectory
    """
    solution = solve_ivp(
        function,
        t_span=(0, time),
        y0=state0,
        t_eval=np.arange(0, time, dt)
    )
    return solution.y.T
```

### Candidate 2

- file_path: .agents/skills/manimgl-best-practices/examples/attention_softmax_masking.py
- snippet_url: https://github.com/calesthio/OpenMontage/blob/main/.agents/skills/manimgl-best-practices/examples/attention_softmax_masking.py
- reasoning: The causal masking loop shows the exact transformer attention trick — iterating a flat index over a 2D grid to identify the below-diagonal positions, replacing their values with `-inf`, and then relying on softmax to collapse those to zero — which is the key insight behind autoregressive attention and makes this snippet non-obvious at a glance.

```python
def softmax(logits, temperature=1.0):
    """Compute softmax of logits array."""
    logits = np.array(logits)
    logits = logits - np.max(logits)  # numerical stability
    exps = np.exp(logits / temperature)
    if np.isinf(exps).any() or np.isnan(exps).any():
        result = np.zeros_like(logits)
        result[np.argmax(logits)] = 1
        return result
    return exps / np.sum(exps)


# Highlight lower triangle (future tokens to be masked)
changers = VGroup()
for n, dec in enumerate(raw_values):
    i = n // shape[1]
    j = n % shape[1]
    if i > j:  # Below diagonal - future tokens
        changers.add(dec)
        neg_inf = Tex(R"-\infty", font_size=36)
        neg_inf.move_to(dec)
        neg_inf.set_fill(RED, border_width=1.5)
        dec.target = neg_inf
        values_array[i, j] = -np.inf

# Compute and show normalized values
normalized_array = np.array([
    softmax(col)
    for col in values_array.T
]).T
```

### Candidate 3 (least important)

- file_path: .agents/skills/manimgl-best-practices/examples/eigenvector_flow_field.py
- snippet_url: https://github.com/calesthio/OpenMontage/blob/main/.agents/skills/manimgl-best-practices/examples/eigenvector_flow_field.py
- reasoning: The manual vector field construction — normalizing each arrow to a fixed display length while color-interpolating by raw magnitude — demonstrates a pattern for building readable phase portraits without relying on a built-in `VectorField` helper, which requires understanding both the linear algebra and Manim's coordinate system simultaneously.

```python
vector_field = VGroup()
for x in np.linspace(-3.5, 3.5, 12):
    for y in np.linspace(-3.5, 3.5, 12):
        if abs(x) < 0.4 and abs(y) < 0.4:
            continue  # Skip origin area
        dx, dy = deriv_func(x, y)
        start = plane.c2p(x, y)
        direction = np.array([dx, dy, 0])
        norm = np.linalg.norm(direction)
        if norm > 0.1:
            # Normalize and scale for visibility
            direction = (
                direction / norm * min(0.5, norm * 0.3)
            )
            end = start + direction
            arrow = Arrow(
                start, end, buff=0,
                stroke_width=2,
                max_tip_length_to_length_ratio=0.3
            )
            # Color based on magnitude
            alpha = min(1, norm / 3)
            arrow.set_color(
                interpolate_color(BLUE, RED, alpha)
            )
            vector_field.add(arrow)
```
