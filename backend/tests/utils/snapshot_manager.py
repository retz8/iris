"""Snapshot management for cached LLM analysis responses.

Provides load/save utilities for fixture-based testing.
Snapshots are JSON files stored in tests/fixtures/snapshots/.
"""

from __future__ import annotations

import json
from pathlib import Path

SNAPSHOTS_DIR = Path(__file__).parent.parent / "fixtures" / "snapshots"
SAMPLES_DIR = Path(__file__).parent.parent / "fixtures" / "samples"


def save_snapshot(name: str, result: dict) -> Path:
    """Save an analysis result as a JSON snapshot.

    Args:
        name: Snapshot name (without extension).
        result: Analysis result dict to save.

    Returns:
        Path to the saved snapshot file.
    """
    SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    path = SNAPSHOTS_DIR / f"{name}.json"
    with open(path, "w") as f:
        json.dump(result, f, indent=2)
    return path


def load_snapshot(name: str) -> dict:
    """Load a snapshot by name.

    Args:
        name: Snapshot name (without extension).

    Returns:
        Parsed analysis result dict.

    Raises:
        FileNotFoundError: If snapshot does not exist.
    """
    path = SNAPSHOTS_DIR / f"{name}.json"
    with open(path) as f:
        return json.load(f)


def get_all_snapshot_names() -> list[str]:
    """Return sorted list of all snapshot names (without extension)."""
    if not SNAPSHOTS_DIR.exists():
        return []
    return sorted(p.stem for p in SNAPSHOTS_DIR.glob("*.json"))


def get_all_samples() -> list[dict]:
    """Discover all sample files in the corpus.

    Returns:
        List of dicts with 'path', 'name', 'language', and
        'snapshot_name' keys.
    """
    language_map = {
        ".py": "python",
        ".js": "javascript",
        ".jsx": "javascriptreact",
        ".ts": "typescript",
        ".tsx": "typescriptreact",
    }

    samples = []
    for lang_dir in sorted(SAMPLES_DIR.iterdir()):
        if not lang_dir.is_dir():
            continue
        for filepath in sorted(lang_dir.iterdir()):
            if not filepath.is_file():
                continue
            suffix = filepath.suffix
            language = language_map.get(suffix)
            if language is None:
                continue
            snapshot_name = f"{lang_dir.name}_{filepath.stem}"
            samples.append({
                "path": filepath,
                "name": filepath.name,
                "language": language,
                "snapshot_name": snapshot_name,
            })
    return samples
