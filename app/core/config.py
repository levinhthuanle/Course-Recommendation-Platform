"""Application configuration and environment variables management."""

from functools import lru_cache
from typing import List

from pydantic import Field
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
    
    # Server Settings
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    
    # CORS Settings
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Allowed CORS origins"
    )
    
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


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings.
    
    Returns:
        Settings: Application settings instance
    """
    return Settings()
