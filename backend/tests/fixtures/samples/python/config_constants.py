"""Application configuration and environment-aware defaults."""

import os


ENV = os.getenv("APP_ENV", "development")

DATABASE = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "name": os.getenv("DB_NAME", "myapp"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
    "pool_size": 5,
    "max_overflow": 10,
}

REDIS = {
    "host": os.getenv("REDIS_HOST", "localhost"),
    "port": int(os.getenv("REDIS_PORT", "6379")),
    "db": 0,
}

CORS_ORIGINS = [
    "http://localhost:3000",
    "https://app.example.com",
]

SUPPORTED_FILE_TYPES = frozenset([
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".go", ".rs", ".rb",
])

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
LOG_LEVEL = "DEBUG" if ENV == "development" else "INFO"

SESSION_TTL_SECONDS = 3600
MAX_UPLOAD_SIZE_MB = 50
