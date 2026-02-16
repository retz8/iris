"""Pytest configuration and shared fixtures for IRIS backend tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest


FIXTURES_DIR = Path(__file__).parent / "fixtures"
SNAPSHOTS_DIR = FIXTURES_DIR / "snapshots"
SAMPLES_DIR = FIXTURES_DIR / "samples"


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers",
        "live: marks tests that require a running backend and API key",
    )


def load_snapshot(name: str) -> dict:
    """Load a cached LLM response snapshot by name.

    Args:
        name: Snapshot filename without extension (e.g. 'python_simple').

    Returns:
        Parsed JSON dict of the analysis result.
    """
    path = SNAPSHOTS_DIR / f"{name}.json"
    with open(path) as f:
        return json.load(f)


def get_all_snapshot_names() -> list[str]:
    """Return names of all available snapshots (without extension)."""
    if not SNAPSHOTS_DIR.exists():
        return []
    return [
        p.stem for p in sorted(SNAPSHOTS_DIR.glob("*.json"))
    ]


@pytest.fixture
def sample_analysis_result() -> dict:
    """A valid, clean analysis result for testing."""
    return {
        "file_intent": "Data processing utility",
        "responsibility_blocks": [
            {
                "label": "Data ingestion",
                "description": "Load and parse input files",
                "ranges": [[1, 15]],
            },
            {
                "label": "Transformation",
                "description": "Transform records",
                "ranges": [[17, 35]],
            },
            {
                "label": "Output persistence",
                "description": "Write results to disk",
                "ranges": [[37, 50]],
            },
        ],
    }


@pytest.fixture
def overlapping_result() -> dict:
    """An analysis result with cross-block overlaps."""
    return {
        "file_intent": "Test file with overlaps",
        "responsibility_blocks": [
            {
                "label": "Block A",
                "description": "First block",
                "ranges": [[1, 20]],
            },
            {
                "label": "Block B",
                "description": "Overlaps with A",
                "ranges": [[15, 30]],
            },
            {
                "label": "Block C",
                "description": "Overlaps with B",
                "ranges": [[25, 40]],
            },
        ],
    }
