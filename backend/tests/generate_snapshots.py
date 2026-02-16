#!/usr/bin/env python3
"""Generate LLM analysis snapshots for fixture-based testing.

Iterates all sample files in fixtures/samples/, calls the analysis
endpoint for each, and saves results as JSON snapshots.

Usage:
    # Requires running backend: python -m src.server
    python -m tests.generate_snapshots
    python -m tests.generate_snapshots --update   # regenerate all
    python -m tests.generate_snapshots --only python_simple_functions
"""

from __future__ import annotations

import argparse
import sys
import time

import requests

from tests.utils.snapshot_manager import (
    get_all_samples,
    save_snapshot,
    SNAPSHOTS_DIR,
)
from tests.utils.quality_validators import validate_analysis_quality

API_URL = "http://localhost:8080/api/iris/analyze"


def analyze_file(
    filename: str, language: str, source_code: str
) -> dict | None:
    """Call the analysis endpoint and return the result."""
    try:
        resp = requests.post(
            API_URL,
            json={
                "filename": filename,
                "language": language,
                "source_code": source_code,
            },
            timeout=60,
        )
        if resp.status_code != 200:
            print(f"  ERROR: HTTP {resp.status_code}: {resp.text[:200]}")
            return None
        data = resp.json()
        if not data.get("success"):
            print(f"  ERROR: {data.get('error', 'unknown')}")
            return None
        return {
            "file_intent": data["file_intent"],
            "responsibility_blocks": data["responsibility_blocks"],
            "metadata": data.get("metadata", {}),
        }
    except requests.ConnectionError:
        print("  ERROR: Cannot connect to backend at "
              f"{API_URL}. Is it running?")
        return None
    except Exception as e:
        print(f"  ERROR: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Generate analysis snapshots"
    )
    parser.add_argument(
        "--update", action="store_true",
        help="Regenerate all snapshots (overwrite existing)",
    )
    parser.add_argument(
        "--only", type=str, default=None,
        help="Only generate snapshot for this name",
    )
    args = parser.parse_args()

    samples = get_all_samples()
    if not samples:
        print("No sample files found in fixtures/samples/")
        sys.exit(1)

    if args.only:
        samples = [s for s in samples if s["snapshot_name"] == args.only]
        if not samples:
            print(f"No sample found with name: {args.only}")
            sys.exit(1)

    # Check backend is reachable
    try:
        health = requests.get(
            "http://localhost:8080/api/iris/health", timeout=5
        )
        if health.status_code != 200:
            print("Backend health check failed")
            sys.exit(1)
    except requests.ConnectionError:
        print("Cannot connect to backend. Start it with: "
              "python -m src.server")
        sys.exit(1)

    print(f"Generating snapshots for {len(samples)} sample files...")
    print()

    generated = 0
    skipped = 0
    failed = 0
    all_issues: dict[str, list[str]] = {}

    for sample in samples:
        name = sample["snapshot_name"]
        path = sample["path"]

        # Skip if snapshot exists and not updating
        if not args.update:
            existing = SNAPSHOTS_DIR / f"{name}.json"
            if existing.exists():
                print(f"  SKIP {name} (exists, use --update)")
                skipped += 1
                continue

        source_code = path.read_text()

        # Skip empty files
        if not source_code.strip():
            print(f"  SKIP {name} (empty file)")
            # Save a minimal snapshot for empty files
            save_snapshot(name, {
                "file_intent": "Empty file",
                "responsibility_blocks": [],
                "metadata": {"skipped": "empty_file"},
            })
            generated += 1
            continue

        print(f"  Analyzing {name} ({sample['language']})...", end=" ")
        t0 = time.monotonic()
        result = analyze_file(
            sample["name"], sample["language"], source_code
        )
        elapsed = time.monotonic() - t0

        if result is None:
            failed += 1
            continue

        save_snapshot(name, result)
        generated += 1

        # Quality check
        issues = validate_analysis_quality(result)
        blocks = len(result.get("responsibility_blocks", []))
        intent_words = len(result.get("file_intent", "").split())

        status = "OK" if not issues else f"ISSUES({len(issues)})"
        print(f"{status} [{elapsed:.1f}s, {blocks} blocks, "
              f"{intent_words}w intent]")

        if issues:
            all_issues[name] = issues
            for issue in issues:
                print(f"    - {issue}")

    print()
    print(f"Results: {generated} generated, {skipped} skipped, "
          f"{failed} failed")

    if all_issues:
        print()
        print(f"Quality issues in {len(all_issues)} snapshots:")
        for name, issues in all_issues.items():
            print(f"  {name}: {len(issues)} issue(s)")
    else:
        print("All snapshots passed quality checks.")

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
