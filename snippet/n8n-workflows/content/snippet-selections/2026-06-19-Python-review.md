# Breakdown Review — 2026-06-19 — Python

Issue: #19
Date: 2026-06-19
Language: Python
Status: PENDING_APPROVAL

## Repo 1 — NVIDIA/SkillSpector

- file_path: src/skillspector/nodes/analyzers/mcp_least_privilege.py
- snippet_url: https://github.com/NVIDIA/SkillSpector/blob/main/src/skillspector/nodes/analyzers/mcp_least_privilege.py

file_intent: MCP least-privilege capability scanner
breakdown_what: Scans raw source code for capability-category patterns using per-category regex sets, returning which capability categories a skill exhibits — breaking on the first match per category to avoid redundant checks.
breakdown_responsibility: Provides the "what does this skill actually do" half of SkillSpector's least-privilege gap analysis — its output is compared against what the skill's manifest declares to surface over-permissioned agents before installation.
breakdown_clever: Most security analyzers parse an AST to filter out matches inside comments or string literals; this uses raw-text regex deliberately — trading precision for language-agnosticism so the same scanner works on Python, YAML manifests, and JavaScript tool definitions without modification. SkillSpector treats the resulting false positives as acceptable noise for a "flag broadly, verify semantically" strategy.
project_context: SkillSpector is NVIDIA's open-source static analyzer for AI agent skills, used by enterprise teams and skill marketplaces to catch vulnerabilities before installation — a study of 42,447 real-world skills found 26.1% contain security issues.

### Reformatted Snippet

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

## Repo 2 — calesthio/OpenMontage

- file_path: .agents/skills/manimgl-best-practices/examples/attention_softmax_masking.py
- snippet_url: https://github.com/calesthio/OpenMontage/blob/main/.agents/skills/manimgl-best-practices/examples/attention_softmax_masking.py

file_intent: Causal attention masking Manim animation
breakdown_what: Defines a temperature-scaled softmax with a NaN guard, then drives a Manim scene that replaces below-diagonal attention weights with −∞ markers and recomputes column-wise softmax values to animate causal masking in a transformer attention grid.
breakdown_responsibility: Serves as a self-contained animation recipe for OpenMontage's video agent — when the agent needs to explain transformer attention in a video, it calls this skill to produce a runnable Manim scene that renders the causal masking mechanic visually.
breakdown_clever: The `isinf` NaN guard looks redundant since `exp(-inf) = 0`, but it fires on a subtler path: when all inputs are `-inf` (a fully-masked attention row with no valid tokens), `logits - np.max(logits)` computes `(-inf) - (-inf) = nan`, and `exp(nan) = nan`. The guard returns a one-hot fallback before nan can propagate into the rendered animation frame.
project_context: OpenMontage is an open-source agentic video production system where AI agents handle research, scripting, Manim animation, and final rendering end-to-end — the `.agents/skills/` directory is the agent's library of reusable visual patterns it selects from when building video sequences.

### Reformatted Snippet

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
