"""Centralized, 12-factor configuration for the AI engine.

All runtime behavior is driven from environment variables (see .env.example).
Local vs production only differs in *values* (e.g. S3_ENDPOINT_URL pointing at
MinIO vs being unset for real AWS S3) -- never in code paths.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Service ---
    environment: Literal["local", "production"] = "local"
    log_level: str = "INFO"
    api_internal_token: str = "change-me-shared-secret"

    # --- Groq ---
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    llm_model_fast: str = "llama-3.1-8b-instant"
    llm_model_default: str = "openai/gpt-oss-120b"
    llm_model_long_context: str = "moonshotai/kimi-k2-instruct-0905"
    llm_model_guard: str = "meta-llama/llama-prompt-guard-2-86m"

    groq_rpm_default: int = 30
    groq_tpm_default: int = 8000
    groq_rpm_fast: int = 30
    groq_tpm_fast: int = 6000

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- Qdrant ---
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str | None = None
    qdrant_collection_standards: str = "standard_clauses"
    qdrant_collection_documents: str = "document_chunks"
    corpus_version: str = "v1"

    # --- Object storage (S3 / MinIO) ---
    s3_endpoint_url: str | None = "http://localhost:9000"
    s3_bucket: str = "legal-documents"
    s3_region: str = "us-east-1"
    s3_access_key_id: str = "minioadmin"
    s3_secret_access_key: str = "minioadmin"
    s3_use_path_style: bool = True

    # --- Feature flags ---
    enable_pii_anonymization: bool = False
    enable_ocr_fallback: bool = True

    # --- Retention ---
    document_chunk_ttl_seconds: int = 604_800
    job_result_ttl_seconds: int = 86_400
    conversation_ttl_seconds: int = 604_800
    conversation_max_turns_verbatim: int = 8

    # --- Rate limiting ---
    user_rate_limit_per_minute: int = 20

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
