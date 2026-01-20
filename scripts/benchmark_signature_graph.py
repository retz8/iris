"""Benchmark shallow AST vs signature graph extraction."""

from __future__ import annotations

import argparse
import os
import sys
import time
import tracemalloc
from typing import Iterable, List, Sequence, Tuple

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_SRC = os.path.join(PROJECT_ROOT, "backend", "src")
if BACKEND_SRC not in sys.path:
    sys.path.insert(0, BACKEND_SRC)

from iris_agent.ast_processor import (  # type: ignore[import-not-found]
    ShallowASTProcessor,
)
from iris_agent.signature_graph import (  # type: ignore[import-not-found]
    SignatureGraphExtractor,
)


def _iter_source_files(paths: Sequence[str], extensions: Sequence[str]) -> List[str]:
    """Collect source files from provided paths.

    Args:
        paths: Paths to files or directories to scan.
        extensions: File extensions to include.

    Returns:
        Sorted list of source file paths.
    """
    # Walk file system paths to gather input sources.
    files: List[str] = []
    for path in paths:
        if os.path.isfile(path):
            if os.path.splitext(path)[1] in extensions:
                files.append(path)
            continue

        for root, _, filenames in os.walk(path):
            for filename in filenames:
                if os.path.splitext(filename)[1] in extensions:
                    files.append(os.path.join(root, filename))

    return sorted(files)


def _read_sources(files: Sequence[str]) -> List[Tuple[str, str]]:
    """Read source code for each file.

    Args:
        files: File paths to read.

    Returns:
        List of tuples containing (path, source_code).
    """
    # Read all sources once to avoid timing disk I/O.
    sources: List[Tuple[str, str]] = []
    for path in files:
        with open(path, "r", encoding="utf-8") as handle:
            sources.append((path, handle.read()))
    return sources


def _time_run(func, iterations: int) -> float:
    """Measure wall time for repeated runs.

    Args:
        func: Callable to time.
        iterations: Number of iterations to run.

    Returns:
        Total elapsed seconds for all iterations.
    """
    # Use perf_counter for high resolution timing.
    start = time.perf_counter()
    for _ in range(iterations):
        func()
    end = time.perf_counter()
    return end - start


def _measure_peak_memory(func) -> int:
    """Measure peak memory usage for a callable.

    Args:
        func: Callable to measure.

    Returns:
        Peak memory in bytes during execution.
    """
    # Use tracemalloc to capture peak memory usage.
    tracemalloc.start()
    try:
        func()
        _, peak = tracemalloc.get_traced_memory()
        return peak
    finally:
        tracemalloc.stop()


def _run_shallow_ast(sources: Iterable[Tuple[str, str]], language: str) -> None:
    """Run shallow AST extraction for all sources.

    Args:
        sources: Iterable of (path, source_code) tuples.
        language: Language identifier for Tree-sitter.
    """
    # Reuse a single processor for consistent performance.
    processor = ShallowASTProcessor()
    for _, source in sources:
        processor.process(source, language)


def _run_signature_graph(sources: Iterable[Tuple[str, str]], language: str) -> None:
    """Run signature graph extraction for all sources.

    Args:
        sources: Iterable of (path, source_code) tuples.
        language: Language identifier for Tree-sitter.
    """
    # Reuse a single extractor for consistent performance.
    extractor = SignatureGraphExtractor(language)
    for _, source in sources:
        extractor.extract(source)


def _format_seconds(seconds: float) -> str:
    """Format seconds with millisecond precision.

    Args:
        seconds: Duration in seconds.

    Returns:
        Formatted duration string.
    """
    # Keep formatting concise for CLI output.
    return f"{seconds:.4f}s"


def _format_bytes(num_bytes: int) -> str:
    """Format bytes to a human-readable string.

    Args:
        num_bytes: Byte count.

    Returns:
        Human-readable memory string.
    """
    # Use a simple binary unit formatter.
    units = ["B", "KiB", "MiB", "GiB"]
    size = float(num_bytes)
    for unit in units:
        if size < 1024.0 or unit == units[-1]:
            return f"{size:.1f}{unit}"
        size /= 1024.0
    return f"{size:.1f}GiB"


def main() -> None:
    """Run benchmark comparisons for shallow AST vs signature graph."""
    parser = argparse.ArgumentParser(
        description="Benchmark shallow AST vs signature graph extraction."
    )
    parser.add_argument(
        "paths",
        nargs="+",
        help="Files or directories to benchmark.",
    )
    parser.add_argument(
        "--language",
        required=True,
        choices=["javascript", "typescript", "python"],
        help="Tree-sitter language identifier.",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=3,
        help="Number of iterations per benchmark.",
    )
    args = parser.parse_args()

    extensions = {
        "javascript": [".js", ".jsx"],
        "typescript": [".ts", ".tsx"],
        "python": [".py"],
    }[args.language]

    files = _iter_source_files(args.paths, extensions)
    if not files:
        raise SystemExit("No matching files found for benchmark.")

    sources = _read_sources(files)

    shallow_time = _time_run(
        lambda: _run_shallow_ast(sources, args.language), args.iterations
    )
    signature_time = _time_run(
        lambda: _run_signature_graph(sources, args.language), args.iterations
    )

    shallow_peak = _measure_peak_memory(
        lambda: _run_shallow_ast(sources, args.language)
    )
    signature_peak = _measure_peak_memory(
        lambda: _run_signature_graph(sources, args.language)
    )

    print("Benchmark results")
    print("-----------------")
    print(f"Files: {len(files)}")
    print(f"Iterations: {args.iterations}")
    print(f"Shallow AST total: {_format_seconds(shallow_time)}")
    print(f"Signature graph total: {_format_seconds(signature_time)}")
    print(f"Shallow AST peak: {_format_bytes(shallow_peak)}")
    print(f"Signature graph peak: {_format_bytes(signature_peak)}")


if __name__ == "__main__":
    main()
