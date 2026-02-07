"""
Application configuration using Pydantic Settings
Provides type-safe, validated configuration management
"""
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, field_validator


class Settings(BaseSettings):
    """Application settings with validation"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"  # Allow extra env vars without error
    )
    
    # Application
    app_name: str = "Atomic Notes Visualizer API"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = False
    
    # Database
    database_url: PostgresDsn = "postgresql://postgres:postgres@localhost:5432/atomic_notes"
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_echo: bool = False
    
    # CORS
    cors_origins: List[str] = ["*"]
    cors_allow_credentials: bool = True
    cors_allow_methods: List[str] = ["*"]
    cors_allow_headers: List[str] = ["*"]
    
    # Logging
    log_level: str = "INFO"
    json_logs: bool = False
    
    # OpenAI
    openai_api_key: Optional[str] = None
    
    # Redis (for Celery)
    redis_url: str = "redis://localhost:6379/0"
    
    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        """Parse CORS origins from comma-separated string or list"""
        if isinstance(v, str) and not v.startswith("["):
            return [origin.strip() for origin in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level is one of the standard levels"""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in valid_levels:
            raise ValueError(f"log_level must be one of {valid_levels}")
        return v_upper
    
    @property
    def async_database_url(self) -> str:
        """Convert sync database URL to asyncpg format"""
        return str(self.database_url).replace(
            "postgresql://", 
            "postgresql+asyncpg://"
        )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Export for easy import
settings = get_settings()
