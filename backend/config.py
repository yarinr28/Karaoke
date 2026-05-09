import os

# Read once at startup — docker-compose or .env sets OFFLINE_MODE=true to disable AI.
OFFLINE_MODE: bool = os.environ.get("OFFLINE_MODE", "false").lower() in ("true", "1", "yes")
