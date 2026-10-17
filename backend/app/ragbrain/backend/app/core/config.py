"""
Code Arena AI Brain — Application Configuration
All settings are loaded from environment variables (or .env file).
Pydantic Settings validates types at startup.
"""
from __future__ import annotations

import secrets
from enum import Enum
from functools import lru_cache
from typing import List, Optional

from pydantic import AnyHttpUrl, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppEnv(str, Enum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TEST = "test"


class AuthMode(str, Enum):
    JWT = "jwt"
    EXTERNAL = "external"
    DEV_BYPASS_UNSAFE = "dev_bypass_UNSAFE"


class InferenceProvider(str, Enum):
    OLLAMA = "ollama"
    OPENAI_COMPAT = "openai_compat"
    MOCK = "mock"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_env: AppEnv = AppEnv.DEVELOPMENT
    app_secret_key: str = Field(default_factory=lambda: secrets.token_hex(32))
    app_debug: bool = False
    app_version: str = "1.0.0"
    log_level: str = "INFO"

    # --- API ---
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    api_max_request_size_mb: int = 10
    api_rate_limit_per_minute: int = 60

    # --- Database ---
    database_url: str = "postgresql+asyncpg://aibrain:changeme_dev@localhost:5433/code_arena_ai_brain"
    database_pool_size: int = 10
    database_max_overflow: int = 5

    # --- Qdrant ---
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: Optional[str] = None
    qdrant_collection_name: str = "code_arena_knowledge"

    # --- AI Inference ---
    inference_provider: InferenceProvider = InferenceProvider.OLLAMA
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:4b"
    inference_timeout_seconds: int = 60
    inference_max_tokens: int = 2048
    inference_max_concurrent: int = 4
    inference_retry_attempts: int = 2

    # --- Embeddings ---
    embedding_model: str = "BAAI/bge-m3"
    embedding_device: str = "cpu"
    embedding_batch_size: int = 32
    embedding_cache_dir: str = "./model_cache"

    # --- Reranker ---
    reranker_enabled: bool = False
    reranker_model: str = "BAAI/bge-reranker-v2-m3"
    reranker_top_n: int = 5

    # --- RAG ---
    rag_chunk_size: int = 512
    rag_chunk_overlap: int = 64
    rag_top_k: int = 5
    rag_similarity_threshold: float = 0.6

    # --- Judge0 ---
    judge0_base_url: str = "http://localhost:2358"
    judge0_auth_token: Optional[str] = None
    judge0_max_cpu_time: int = 5
    judge0_max_memory_kb: int = 262144
    judge0_max_file_size_kb: int = 1024
    judge0_timeout_seconds: int = 30

    # --- Authentication ---
    auth_mode: AuthMode = AuthMode.JWT
    jwt_secret_key: str = Field(default_factory=lambda: secrets.token_hex(32))
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    # --- Dev credentials (development only) ---
    dev_admin_email: str = "admin@dev.local"
    dev_admin_password: str = "changeme_dev_only"

    # --- Mastery algorithm ---
    mastery_window_attempts: int = 5
    mastery_pass_threshold: float = 0.7
    mastery_strong_ratio: float = 0.8
    mastery_weak_ratio: float = 0.4

    # --- CORS ---
    cors_allow_credentials: bool = True

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if v.upper() not in allowed:
            raise ValueError(f"log_level must be one of {allowed}")
        return v.upper()

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.api_allowed_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def validate_production_safety(self) -> "Settings":
        if self.app_env == AppEnv.PRODUCTION:
            if self.auth_mode == AuthMode.DEV_BYPASS_UNSAFE:
                raise ValueError(
                    "AUTH_MODE=dev_bypass_UNSAFE must not be used in production."
                )
            if self.app_debug:
                raise ValueError("APP_DEBUG must be false in production.")
        return self

    @property
    def is_development(self) -> bool:
        return self.app_env == AppEnv.DEVELOPMENT

    @property
    def is_test(self) -> bool:
        return self.app_env == AppEnv.TEST

    @property
    def is_production(self) -> bool:
        return self.app_env == AppEnv.PRODUCTION


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
