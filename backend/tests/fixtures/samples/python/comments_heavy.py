# ============================================================
# Configuration constants for the application
# ============================================================
# These values control core behavior and should be reviewed
# before deploying to production.
# ============================================================

# Maximum number of retry attempts for failed API calls.
# After this many failures, the request is abandoned and
# an error is logged.
MAX_RETRIES = 3

# Timeout in seconds for HTTP requests to external services.
# Increase this if working with slow third-party APIs.
REQUEST_TIMEOUT = 30

# Base URL for the primary API endpoint.
# Override via MYAPP_API_URL environment variable.
API_BASE_URL = "https://api.example.com/v2"

# Feature flags
# ============================================================
# These control gradual rollout of new features.
# Set to True to enable, False to disable.
# ============================================================

# Enable the new dashboard UI (redesigned in Q3)
ENABLE_NEW_DASHBOARD = False

# Enable real-time notifications via WebSocket
# Note: requires Redis to be configured
ENABLE_REALTIME_NOTIFICATIONS = True

# Enable experimental search ranking algorithm
# WARNING: may increase latency by 200ms
ENABLE_EXPERIMENTAL_SEARCH = False

# Database configuration
# ============================================================
# Connection pool settings for PostgreSQL
# ============================================================

DB_POOL_MIN = 2
DB_POOL_MAX = 10
DB_POOL_TIMEOUT = 30  # seconds to wait for a connection
DB_STATEMENT_TIMEOUT = 5000  # ms, kill slow queries

# Logging levels per module
# ============================================================
LOGGING_CONFIG = {
    "root": "WARNING",
    "api": "INFO",
    "database": "WARNING",
    "auth": "DEBUG",
    "scheduler": "INFO",
}

# Rate limiting
# ============================================================
# Requests per minute per user
RATE_LIMIT_DEFAULT = 60
RATE_LIMIT_PREMIUM = 300
RATE_LIMIT_ADMIN = 0  # unlimited
