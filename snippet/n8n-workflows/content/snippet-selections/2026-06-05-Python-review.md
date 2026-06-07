# Breakdown Review — 2026-06-05 — Python

Issue: #17
Date: 2026-06-05
Language: Python
Status: PENDING_APPROVAL

## Repo 1 — chopratejas/headroom

- file_path: headroom/compression/handlers/code_handler.py
- snippet_url: https://github.com/chopratejas/headroom/blob/main/headroom/compression/handlers/code_handler.py

file_intent: Regex-based code structure extractor
breakdown_what: Scans source code with language-specific regex patterns to mark import statements and function signatures as CodeSpans, then converts the span list into a structure mask flagging which tokens are load-bearing.
breakdown_responsibility: Serves as the fallback handler when a Tree-sitter AST parse isn't available for a language; its 0.7 confidence score explicitly signals downstream logic that this analysis is heuristic rather than syntactically authoritative.
breakdown_clever: The 0.7 hardcoded confidence score is a first-class API contract, not a debug artifact — callers use it to decide whether to trust or override the mask, making the regex handler's imprecision explicitly negotiable at the call site.
project_context: Headroom sits between your application and the LLM, compressing tool outputs, logs, and source files before they reach the model. It cuts context token counts by 60–95% while keeping answers accurate — used by AI agent developers who pay per token and need to control what the model actually sees.

### Reformatted Snippet

```python
def _extract_with_regex(
    self,
    content: str,
    tokens: list[str],
    language: str,
) -> HandlerResult:
    spans: list[CodeSpan] = []

    import_pattern = _IMPORT_PATTERNS.get(language)
    if import_pattern:
        for match in import_pattern.finditer(content):
            end = content.find("\n", match.end())
            if end == -1:
                end = len(content)
            spans.append(
                CodeSpan(
                    start=match.start(),
                    end=end,
                    role="import",
                    is_structural=True,
                )
            )

    signature_patterns = _SIGNATURE_PATTERNS.get(language, [])
    for pattern in signature_patterns:
        for match in pattern.finditer(content):
            spans.append(
                CodeSpan(
                    start=match.start(),
                    end=match.end(),
                    role="signature",
                    is_structural=True,
                )
            )

    mask = self._spans_to_mask(spans, len(content))

    return HandlerResult(
        mask=StructureMask(tokens=tokens, mask=mask),
        handler_name=self.name,
        confidence=0.7,
        metadata={
            "language": language,
            "parser": "regex",
            "structural_spans": len(spans),
        },
    )
```

## Repo 2 — microsoft/agent-governance-toolkit

- file_path: agent-governance-python/agent-hypervisor/src/hypervisor/core.py
- snippet_url: https://github.com/microsoft/agent-governance-toolkit/blob/main/agent-governance-python/agent-hypervisor/src/hypervisor/core.py

file_intent: Agent execution ring assignment engine
breakdown_what: Orchestrates an agent joining a managed session: enriches its manifest via IATP, registers actions for reversibility tracking, forces strong consistency if irreversible work is present, verifies identity, then resolves a trust score and maps it to an execution ring.
breakdown_responsibility: The central onboarding gate for every agent in the governance system — the point where the toolkit decides which execution ring (from full-trust to fully-sandboxed RING_3) an agent is permitted to operate in before it can take any action.
breakdown_clever: Sigma is always the minimum of the caller's raw score and the Nexus behavioral history — an agent can't self-promote trust by passing a high sigma_raw if its history contradicts it, making manipulation of the ring assignment architecturally impossible.
project_context: Microsoft's Agent Governance Toolkit is a runtime security layer for autonomous AI agents that intercepts every action before it executes, enforcing policy, identity verification, and execution sandboxing across frameworks like LangChain and CrewAI. It covers all 10 OWASP Agentic Top 10 risks and is being adopted in response to the Colorado AI Act (effective June 2026) and approaching EU AI Act obligations.

### Reformatted Snippet

```python
async def join_session(
    self,
    session_id: str,
    agent_did: str,
    actions: list[ActionDescriptor] | None = None,
    sigma_raw: float = 0.0,
    manifest: Any | None = None,
    agent_history: Any | None = None,
) -> ExecutionRing:
    managed = self._get_session(session_id)

    # Step 1: IATP manifest enrichment
    if self.iatp and manifest:
        if isinstance(manifest, dict):
            analysis = self.iatp.analyze_manifest_dict(
                manifest
            )
        else:
            analysis = self.iatp.analyze_manifest(manifest)
        if not actions:
            actions = analysis.actions
        if sigma_raw == 0.0:
            sigma_raw = analysis.sigma_hint
        logger.debug(
            "IATP manifest parsed for %s: ring_hint=%s",
            agent_did, analysis.ring_hint
        )

    # Step 2: Register actions
    if actions:
        managed.reversibility.register_from_manifest(
            actions
        )

    # Step 3: Mode negotiation
    if managed.reversibility.has_non_reversible_actions():
        managed.sso.force_consistency_mode(
            ConsistencyMode.STRONG
        )

    # Step 4: Verify history
    verification = self.verifier.verify(agent_did)

    # Step 5: Resolve effective score
    eff_score = sigma_raw

    if self.nexus and sigma_raw == 0.0:
        eff_score = self.nexus.resolve_sigma(
            agent_did, history=agent_history,
        )
    elif self.nexus and agent_history:
        nexus_sigma = self.nexus.resolve_sigma(
            agent_did, history=agent_history,
        )
        eff_score = min(sigma_raw, nexus_sigma)

    ring = self.ring_enforcer.compute_ring(eff_score)

    if not verification.is_trustworthy:
        ring = ExecutionRing.RING_3_SANDBOX

    managed.sso.join(
        agent_did=agent_did,
        sigma_raw=sigma_raw,
        eff_score=eff_score,
        ring=ring,
    )

    return ring
```
