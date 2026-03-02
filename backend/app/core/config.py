from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # LLM
    anthropic_api_key: str
    claude_haiku_model: str = "claude-haiku-4-5-20251001"
    claude_sonnet_model: str = "claude-sonnet-4-6"

    # Search
    tavily_api_key: str

    # Database
    database_url: str

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # Vector DB
    chroma_persist_dir: str = "./chroma_data"

    # Quality scoring thresholds
    quality_threshold_discard: float = 4.0
    quality_threshold_full: float = 6.0

    # CORS
    cors_origins: List[str] = ["http://localhost:5173"]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
