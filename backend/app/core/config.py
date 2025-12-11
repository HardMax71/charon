from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Charon"
    version: str = "0.1.0"

    # Logging
    log_level: str = "INFO"

    # API settings
    api_prefix: str = "/api"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Analysis limits
    max_upload_size_mb: int = 10
    max_files_count: int = 2000

    # GitHub API
    github_api_base: str = "https://api.github.com"
    github_raw_base: str = "https://raw.githubusercontent.com"

    # GitHub OAuth (optional - for private repo support)
    github_client_id: str | None = None
    github_client_secret: str | None = None

    # Session settings
    session_cookie_name: str = "charon_session"
    session_expiry_hours: int = 24
    session_cookie_secure: bool = True
    session_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    session_max_count: int = 10000

    # Metrics thresholds
    high_coupling_percentile: int = 80  # Top 20% = 80th percentile

    # HTTP client settings
    http_timeout_seconds: int = 30


settings = Settings()
