import pytest

from legal_ai.config import Settings


@pytest.fixture
def settings() -> Settings:
    return Settings(_env_file=None, enable_pii_anonymization=False, groq_api_key="test-key")
