from pathlib import Path

# NOTE: will be added more in the future
SUPPORTED_LANGUAGES = ["python", "javascript", "typescript"]

# Single-shot inference configuration
SINGLE_SHOT_MODEL = "gpt-5-nano-2025-08-07"
SINGLE_SHOT_REASONING_EFFORT = "minimal"  # Options: minimal, low, medium, high

# Cache configuration
CACHE_DIR = Path(__file__).parent.parent / ".iris" / "cache"
CACHE_MAX_MEMORY_ENTRIES = 500
CACHE_DISK_TTL_DAYS = 30
CACHE_METRICS_PATH = Path(__file__).parent.parent / ".iris" / "metrics.json"
