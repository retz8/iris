# Breakdown Review — 2026-08-14 — Python

Issue: #26
Date: 2026-08-14
Language: Python
Status: COMPLETED

## Repo 1 — cactus-compute/needle

- file_path: needle/model/quantize.py
- snippet_url: https://github.com/cactus-compute/needle/blob/main/needle/model/quantize.py

file_intent: Group-wise fake quantization layer
breakdown_what: Simulates INT4 quantization during training by grouping weights into fixed-size blocks, computing a per-group absolute-max scale, rounding values to quantized buckets, and returning the dequantized result — letting the model see quantization error on every forward pass.
breakdown_responsibility: Drives needle's training-time quantization for the CQ2-bit compression that produces the 14 MB binary — by running quantized arithmetic during every forward pass, the 45M-parameter model learns weight distributions that survive extreme compression at inference.
breakdown_clever: The return `w + stop_gradient(q - w)` equals `q` during the forward pass but passes gradients through `w` as if rounding never happened — the straight-through estimator trick that makes quantization differentiable at all, since the rounding step itself has zero gradient.
project_context: Needle is a 14 MB agentic language model from Cactus Compute built for phones, wearables, and embedded devices that run a full tool-calling session in under 28 MB of RAM. Needle 2 trains its 45M-parameter Simple Attention Network natively at CQ2-bit precision so the model learns to work within its compression constraints, rather than discovering them for the first time at deployment.

### Reformatted Snippet

```python
def fake_quant(w, group_size=128, bits=4):
    qmax = 2 ** (bits - 1) - 1
    D = w.shape[-1]
    pad = (-D) % group_size
    wp = (
        jnp.pad(
            w,
            [(0, 0)] * (w.ndim - 1) + [(0, pad)]
        )
        if pad else w
    )
    g = wp.reshape(
        *wp.shape[:-1], -1, group_size
    ).astype(jnp.float32)
    absmax = jnp.max(
        jnp.abs(g), axis=-1, keepdims=True
    )
    scale = jnp.where(
        absmax > 0, absmax / qmax, 1.0
    )
    q = (
        jnp.clip(
            jnp.round(g / scale),
            -qmax - 1, qmax
        ) * scale
    )
    q = q.reshape(wp.shape).astype(w.dtype)
    if pad:
        q = q[..., :D]
    return w + jax.lax.stop_gradient(q - w)
```

## Repo 2 — goauthentik/authentik

- file_path: authentik/core/expression/evaluator.py
- snippet_url: https://github.com/goauthentik/authentik/blob/main/authentik/core/expression/evaluator.py

file_intent: Policy expression exception audit logger
breakdown_what: Catches runtime exceptions from property mapping expressions, attaches the triggering HTTP request or user context, and persists them as structured audit events — skipping persistence entirely when the evaluator is running in dry-run mode.
breakdown_responsibility: Sits at the boundary between authentik's expression evaluator and its audit log, routing failures from the policy engine into queryable Event records that admins can inspect when a custom auth flow for SAML, OAuth2, or LDAP breaks silently.
breakdown_clever: The `if req.http_request` branch calls `event.from_http()` and returns immediately — `event.set_user()` in the `elif` is unreachable for web requests, so user attribution only fires for non-HTTP policy evaluations like LDAP binds or CLI policy checks.
project_context: authentik is a self-hosted identity provider that centralizes SSO, MFA, and user directory management under one open-source platform covering SAML, OAuth2/OIDC, LDAP, and RADIUS. Teams use it as a drop-in replacement for commercial IdPs like Okta or Auth0, scripting custom auth logic in Python property mappings that run inside flows for login, enrollment, and federation.

### Reformatted Snippet

```python
def handle_error(self, exc: Exception, expression_source: str):
    """Exception Handler"""
    # For dry-run requests we don't save exceptions
    if self.dry_run:
        return
    event = Event.new(
        EventAction.PROPERTY_MAPPING_EXCEPTION,
        expression=expression_source,
        message="Failed to execute property mapping",
    ).with_exception(exc)
    if "request" in self._context:
        req: PolicyRequest = self._context["request"]
        if req.http_request:
            event.from_http(req.http_request, req.user)
            return
        elif req.user:
            event.set_user(req.user)
    event.save()
```
