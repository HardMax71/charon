"""Application configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    app_name: str = "Charon"
    version: str = "0.1.0"

    # API settings
    api_prefix: str = "/api"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Analysis limits
    max_upload_size_mb: int = 10
    max_files_count: int = 2000

    # GitHub API
    github_api_base: str = "https://api.github.com"
    github_raw_base: str = "https://raw.githubusercontent.com"

    # Metrics thresholds
    high_coupling_percentile: int = 80  # Top 20% = 80th percentile

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
