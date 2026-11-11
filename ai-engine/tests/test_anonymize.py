import pytest

from legal_ai.config import Settings
from legal_ai.pipeline.anonymize import Anonymizer, PiiEngineUnavailableError


def test_anonymize_is_passthrough_when_disabled():
    settings = Settings(_env_file=None, enable_pii_anonymization=False)
    anonymizer = Anonymizer(settings)
    result = anonymizer.anonymize("John Smith signed this contract for Acme Corp.")
    assert result.anonymized_text == "John Smith signed this contract for Acme Corp."
    assert result.token_map == {}


def test_anonymize_raises_helpful_error_when_extra_not_installed():
    # The 'pii' extra (presidio + spacy) is intentionally not part of the base install;
    # flipping the flag on without it must fail loudly with actionable guidance, not silently.
    settings = Settings(_env_file=None, enable_pii_anonymization=True)
    anonymizer = Anonymizer(settings)
    with pytest.raises(PiiEngineUnavailableError, match="uv sync --extra pii"):
        anonymizer.anonymize("Some contract text.")


def test_deanonymize_is_noop_with_empty_token_map():
    settings = Settings(_env_file=None, enable_pii_anonymization=False)
    anonymizer = Anonymizer(settings)
    text = "PERSON_1 signed on behalf of ORG_1."
    assert anonymizer.deanonymize(text, {}) == text


def test_deanonymize_handles_token_prefix_collisions():
    settings = Settings(_env_file=None, enable_pii_anonymization=False)
    anonymizer = Anonymizer(settings)
    token_map = {"PERSON_1": "Jane Doe", "PERSON_10": "John Roe"}
    text = "PERSON_1 met with PERSON_10 yesterday."
    result = anonymizer.deanonymize(text, token_map)
    assert result == "Jane Doe met with John Roe yesterday."
