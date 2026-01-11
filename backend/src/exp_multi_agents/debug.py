# backend/src/exp_multi_agents/debug.py
"""
Debug utilities for tracking graph execution and token usage.
"""

import sys
import time
from typing import Any, Dict, Optional
from dataclasses import dataclass, field


@dataclass
class NodeMetrics:
    """Metrics for a single node execution."""

    node_name: str
    iteration: int
    duration_ms: float
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    timestamp: float = field(default_factory=time.time)


@dataclass
class GraphDebugger:
    """Debug tracker for graph execution."""

    enabled: bool = False
    track_tokens: bool = True
    node_metrics: list[NodeMetrics] = field(default_factory=list)

    # Token pricing (update based on your model)
    # GPT-4o-mini pricing as of Jan 2025
    input_token_price: float = 0.150 / 1_000_000  # $0.150 per 1M input tokens
    output_token_price: float = 0.600 / 1_000_000  # $0.600 per 1M output tokens

    def log_node_start(self, node_name: str, iteration: int) -> None:
        """Log when a node starts execution."""
        if not self.enabled:
            return

        print(f"\n{'='*70}", file=sys.stderr)
        print(
            f"🔵 NODE START: {node_name.upper()} (Iteration {iteration})",
            file=sys.stderr,
        )
        print(f"{'='*70}", file=sys.stderr)

    def log_node_end(
        self,
        node_name: str,
        iteration: int,
        duration_ms: float,
        state: Optional[Dict[str, Any]] = None,
        usage: Optional[Dict[str, int]] = None,
    ) -> None:
        """Log when a node completes execution."""
        if not self.enabled:
            return

        metrics = NodeMetrics(
            node_name=node_name,
            iteration=iteration,
            duration_ms=duration_ms,
        )

        # Extract token usage if available
        if usage and self.track_tokens:
            metrics.input_tokens = usage.get("prompt_tokens", 0)
            metrics.output_tokens = usage.get("completion_tokens", 0)
            metrics.total_tokens = usage.get("total_tokens", 0)

            # Calculate cost
            metrics.cost_usd = (
                metrics.input_tokens * self.input_token_price
                + metrics.output_tokens * self.output_token_price
            )

        self.node_metrics.append(metrics)

        # Print summary
        print(f"\n🟢 NODE END: {node_name.upper()}", file=sys.stderr)
        print(f"⏱️  Duration: {duration_ms:.2f}ms", file=sys.stderr)

        if self.track_tokens and metrics.total_tokens > 0:
            print(
                f"🪙 Tokens: {metrics.input_tokens:,} in + {metrics.output_tokens:,} out = {metrics.total_tokens:,} total",
                file=sys.stderr,
            )
            print(f"💰 Cost: ${metrics.cost_usd:.6f}", file=sys.stderr)

        # Print state summary if available
        if state:
            self._print_state_summary(state)

        print(f"{'='*70}\n", file=sys.stderr)

    def _print_state_summary(self, state: Dict[str, Any]) -> None:
        """Print a summary of the current state."""
        print(f"\n📋 OUTPUT:", file=sys.stderr)

        # Compressor output
        if state.get("mid_level_abstraction"):
            abstraction = state["mid_level_abstraction"]
            functions = abstraction.get("functions", [])
            global_state = abstraction.get("global_state", "")
            control_flow = abstraction.get("control_flow_patterns", [])
            imports = abstraction.get("imports_dependencies", [])
            file_structure = abstraction.get("file_structure", "")

            print(f"   📦 Compression Summary:", file=sys.stderr)
            print(f"      - Total functions: {len(functions)}", file=sys.stderr)
            print(
                f"      - Control flow patterns: {len(control_flow)}", file=sys.stderr
            )
            print(f"      - Dependencies: {len(imports)}", file=sys.stderr)

            if functions:
                print(f"\n   📄 Compressed Functions:", file=sys.stderr)
                for i, func in enumerate(functions[:5], 1):
                    name = func.get("name", "unnamed")
                    line_range = func.get("line_range", [0, 0])
                    role = func.get("role", "")
                    print(
                        f"      {i}. {name} [L{line_range[0]}-{line_range[1]}]",
                        file=sys.stderr,
                    )
                    if role:
                        print(f"         Role: {role[:100]}...", file=sys.stderr)

                if len(functions) > 5:
                    print(
                        f"      ... and {len(functions) - 5} more functions",
                        file=sys.stderr,
                    )

            if global_state:
                print(f"\n   🌐 Global State:", file=sys.stderr)
                print(f"      {global_state[:200]}...", file=sys.stderr)

            if control_flow:
                print(f"\n   🔀 Control Flow Patterns:", file=sys.stderr)
                for pattern in control_flow[:3]:
                    print(f"      - {pattern}", file=sys.stderr)
                if len(control_flow) > 3:
                    print(
                        f"      ... and {len(control_flow) - 3} more", file=sys.stderr
                    )

            if imports:
                print(f"\n   📦 Dependencies:", file=sys.stderr)
                print(f"      {', '.join(imports[:5])}", file=sys.stderr)
                if len(imports) > 5:
                    print(f"      ... and {len(imports) - 5} more", file=sys.stderr)

            if file_structure:
                print(f"\n   📁 File Structure:", file=sys.stderr)
                print(f"      {file_structure[:150]}...", file=sys.stderr)

        # Question Generator output
        if state.get("questions"):
            questions = state["questions"]
            print(f"\n   ❓ Generated {len(questions)} Questions:", file=sys.stderr)
            for i, question in enumerate(questions, 1):
                print(f"      {i}. {question}", file=sys.stderr)

        # Explainer output
        if state.get("file_intent"):
            intent = state["file_intent"]
            intent_text = (
                intent.get("text", "") if isinstance(intent, dict) else str(intent)
            )
            print(f"\n   🎯 File Intent:", file=sys.stderr)
            print(f"      {intent_text}", file=sys.stderr)

        if state.get("responsibilities"):
            responsibilities = state["responsibilities"]
            print(
                f"\n   📋 Responsibilities ({len(responsibilities)}):", file=sys.stderr
            )
            for i, resp in enumerate(responsibilities, 1):
                if isinstance(resp, dict):
                    label = resp.get("label", "N/A")
                    desc = resp.get("description", "")
                    ranges = resp.get("ranges", [])

                    print(f"\n      {i}. {label}", file=sys.stderr)
                    print(f"         Description: {desc}", file=sys.stderr)
                    if ranges:
                        range_str = ", ".join([f"[{r[0]}-{r[1]}]" for r in ranges[:3]])
                        if len(ranges) > 3:
                            range_str += f" ... +{len(ranges) - 3} more"
                        print(f"         Line ranges: {range_str}", file=sys.stderr)
                else:
                    print(f"      {i}. {resp}", file=sys.stderr)

        # Skeptic output
        if state.get("skeptic_feedback"):
            feedback = state["skeptic_feedback"]

            if isinstance(feedback, dict):
                objections = feedback.get("objections", [])
                weak_claims = feedback.get("weak_claims", [])
                suggestions = feedback.get("suggestions", [])
                confidence = feedback.get("confidence_score", 0.0)

                print(f"\n   🔍 Skeptic Analysis:", file=sys.stderr)
                print(f"      Confidence Score: {confidence:.2f}", file=sys.stderr)

                if objections:
                    print(
                        f"\n      ⚠️  Objections ({len(objections)}):", file=sys.stderr
                    )
                    for i, obj in enumerate(objections, 1):
                        print(f"         {i}. {obj}", file=sys.stderr)
                else:
                    print(f"      ✅ No objections", file=sys.stderr)

                if weak_claims:
                    print(
                        f"\n      ⚡ Weak Claims ({len(weak_claims)}):", file=sys.stderr
                    )
                    for i, claim in enumerate(weak_claims, 1):
                        print(f"         {i}. {claim}", file=sys.stderr)

                if suggestions:
                    print(
                        f"\n      💡 Suggestions ({len(suggestions)}):", file=sys.stderr
                    )
                    for i, sug in enumerate(suggestions, 1):
                        print(f"         {i}. {sug}", file=sys.stderr)

                # Determine if continuing or ending
                is_complete = state.get("is_complete", False)
                iteration = state.get("iteration_count", 0)

                if is_complete:
                    print(f"\n      ✅ Analysis COMPLETE (converged)", file=sys.stderr)
                else:
                    print(
                        f"\n      🔄 Will continue to iteration {iteration + 1}",
                        file=sys.stderr,
                    )
            else:
                print(f"   {feedback}", file=sys.stderr)

        if state.get("error"):
            print(f"\n   ❌ ERROR: {state['error']}", file=sys.stderr)

    def print_summary(self) -> None:
        """Print overall execution summary."""
        if not self.enabled or not self.node_metrics:
            return

        print("\n" + "=" * 70, file=sys.stderr)
        print("📊 EXECUTION SUMMARY", file=sys.stderr)
        print("=" * 70, file=sys.stderr)

        total_duration = sum(m.duration_ms for m in self.node_metrics)
        total_tokens = sum(m.total_tokens for m in self.node_metrics)
        total_cost = sum(m.cost_usd for m in self.node_metrics)

        print(
            f"\n⏱️  Total Duration: {total_duration:.2f}ms ({total_duration/1000:.2f}s)",
            file=sys.stderr,
        )
        print(f"🪙 Total Tokens: {total_tokens:,}", file=sys.stderr)
        print(f"💰 Total Cost: ${total_cost:.6f}", file=sys.stderr)

        # Per-node breakdown
        print(f"\n📋 Per-Node Breakdown:", file=sys.stderr)
        print(
            f"{'Node':<20} {'Iter':<6} {'Tokens':<10} {'Cost':<12} {'Duration':<12}",
            file=sys.stderr,
        )
        print("-" * 70, file=sys.stderr)

        for m in self.node_metrics:
            print(
                f"{m.node_name:<20} "
                f"{m.iteration:<6} "
                f"{m.total_tokens:<10,} "
                f"${m.cost_usd:<11.6f} "
                f"{m.duration_ms:<11.2f}ms",
                file=sys.stderr,
            )

        # Aggregate by node type (across iterations)
        node_totals: Dict[str, Dict[str, float]] = {}
        for m in self.node_metrics:
            if m.node_name not in node_totals:
                node_totals[m.node_name] = {
                    "tokens": 0,
                    "cost": 0.0,
                    "duration": 0.0,
                    "count": 0,
                }
            node_totals[m.node_name]["tokens"] += m.total_tokens
            node_totals[m.node_name]["cost"] += m.cost_usd
            node_totals[m.node_name]["duration"] += m.duration_ms
            node_totals[m.node_name]["count"] += 1

        print(f"\n📊 Aggregated by Node Type:", file=sys.stderr)
        print(
            f"{'Node':<20} {'Calls':<6} {'Tokens':<10} {'Cost':<12} {'Duration':<12}",
            file=sys.stderr,
        )
        print("-" * 70, file=sys.stderr)

        for node_name, totals in sorted(node_totals.items()):
            print(
                f"{node_name:<20} "
                f"{int(totals['count']):<6} "
                f"{int(totals['tokens']):<10,} "
                f"${totals['cost']:<11.6f} "
                f"{totals['duration']:<11.2f}ms",
                file=sys.stderr,
            )

        print("=" * 70 + "\n", file=sys.stderr)

    def get_metrics_dict(self) -> Dict[str, Any]:
        """Return metrics as a dictionary for API responses."""
        if not self.node_metrics:
            return {}

        return {
            "total_duration_ms": sum(m.duration_ms for m in self.node_metrics),
            "total_tokens": sum(m.total_tokens for m in self.node_metrics),
            "total_cost_usd": sum(m.cost_usd for m in self.node_metrics),
            "iterations": max(m.iteration for m in self.node_metrics) + 1,
            "node_executions": len(self.node_metrics),
            "per_node": [
                {
                    "node_name": m.node_name,
                    "iteration": m.iteration,
                    "duration_ms": m.duration_ms,
                    "tokens": {
                        "input": m.input_tokens,
                        "output": m.output_tokens,
                        "total": m.total_tokens,
                    },
                    "cost_usd": m.cost_usd,
                }
                for m in self.node_metrics
            ],
        }


# Global debugger instance
_debugger: Optional[GraphDebugger] = None


def get_debugger() -> GraphDebugger:
    """Get the global debugger instance."""
    global _debugger
    if _debugger is None:
        _debugger = GraphDebugger(enabled=False)
    return _debugger


def enable_debug(track_tokens: bool = True) -> None:
    """Enable debug mode."""
    global _debugger
    _debugger = GraphDebugger(enabled=True, track_tokens=track_tokens)


def disable_debug() -> None:
    """Disable debug mode."""
    global _debugger
    if _debugger:
        _debugger.enabled = False
