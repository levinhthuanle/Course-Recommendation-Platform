"""Application configuration and environment variables management."""

from functools import lru_cache
from typing import List, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application Settings
    app_name: str = Field(default="Course Recommendation Platform", description="Application name")
    app_version: str = Field(default="1.0.0", description="Application version")
    debug: bool = Field(default=False, description="Debug mode")

    @field_validator('debug', mode='before')
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, str):
            value = v.strip().lower()
            if value in {"release", "prod", "production"}:
                return False
            if value in {"dev", "development"}:
                return True
        return v
    
    # Server Settings
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    
    # CORS Settings - accept string or list
    cors_origins: List[str] = Field(
        default=["*"],
        description="Allowed CORS origins"
    )
    
    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            # Handle comma-separated string
            if v.startswith('['):
                import json
                return json.loads(v)
            return [origin.strip() for origin in v.split(',')]
        return v
    
    # Meilisearch Settings
    meilisearch_url: str = Field(
        default="http://localhost:7700",
        description="Meilisearch server URL"
    )
    meilisearch_master_key: str = Field(
        default="",
        description="Meilisearch master key for authentication"
    )
    meilisearch_index_name: str = Field(
        default="courses",
        description="Meilisearch index name for courses"
    )
    
    # Data Ingestion Settings
    resources_path: str = Field(
        default="./Resources",
        description="Path to the folder containing PDF syllabus files"
    )
    batch_size: int = Field(
        default=100,
        description="Batch size for indexing documents"
    )
    
    # Search Settings
    search_limit: int = Field(
        default=20,
        description="Default number of search results to return"
    )
    typo_tolerance_min_word_size_for_typos_one: int = Field(
        default=4,
        description="Minimum word size for one typo tolerance"
    )
    typo_tolerance_min_word_size_for_typos_two: int = Field(
        default=8,
        description="Minimum word size for two typos tolerance"
    )
    
    # Gemini AI Settings
    gemini_api_key: str = Field(
        default="",
        description="Google Gemini API key for chat functionality"
    )
    gemini_model: str = Field(
        default="gemini-2.5-flash-lite",
        description="Gemini model to use (gemini-1.5-flash, gemini-1.5-pro, etc.)"
    )

    # Auth Settings
    auth_db_path: str = Field(
        default="./app/data/auth.db",
        description="SQLite database path for auth users"
    )
    analytics_db_path: str = Field(
        default="./app/data/analytics.db",
        description="SQLite database path for analytics"
    )
    # Database URL (PostgreSQL). If set, services will use PostgreSQL instead of SQLite.
    database_url: str = Field(
        default="",
        description="PostgreSQL database URL, e.g. postgresql://user:pass@host:5432/dbname"
    )
    jwt_secret: str = Field(
        default="change-me",
        description="JWT secret key"
    )
    jwt_algorithm: str = Field(
        default="HS256",
        description="JWT signing algorithm"
    )
    jwt_exp_minutes: int = Field(
        default=60 * 24,
        description="JWT expiration time in minutes"
    )
    admin_email: str = Field(
        default="",
        description="Bootstrap admin email"
    )
    admin_password: str = Field(
        default="",
        description="Bootstrap admin password"
    )


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings.
    
    Returns:
        Settings: Application settings instance
    """
    return Settings()
