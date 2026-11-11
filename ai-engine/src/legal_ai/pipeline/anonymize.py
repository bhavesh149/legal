"""Feature-flagged PII anonymization (Microsoft Presidio).

Per the MVP decision, this defaults to OFF (`ENABLE_PII_ANONYMIZATION=false`) -- the
blueprint's "local anonymization" moat is deferred post-MVP. The module is fully wired
so flipping the flag on later is a config change, not a rewrite.

When enabled: detected entities are replaced with stable per-document tokens
(`PERSON_1`, `ORG_1`, `MONEY_1`, ...); the token -> original-value map is kept only in
Redis (never sent to the LLM) and used to de-anonymize the LLM's output before it
reaches the client.
"""

from collections import defaultdict
from dataclasses import dataclass, field

import structlog

from legal_ai.config import Settings

logger = structlog.get_logger(__name__)

_SUPPORTED_ENTITIES = [
    "PERSON",
    "ORGANIZATION",
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "LOCATION",
    "MONEY",
    "DATE_TIME",
]


@dataclass
class AnonymizationResult:
    anonymized_text: str
    token_map: dict[str, str] = field(default_factory=dict)  # token -> original value


class PiiEngineUnavailableError(Exception):
    pass


class Anonymizer:
    """Lazily loads the (heavy) Presidio + spaCy analyzer only when PII is enabled."""

    def __init__(self, settings: Settings):
        self._settings = settings
        self._analyzer = None

    def _get_analyzer(self):
        if self._analyzer is not None:
            return self._analyzer
        try:
            from presidio_analyzer import AnalyzerEngine
        except ImportError as exc:
            raise PiiEngineUnavailableError(
                "ENABLE_PII_ANONYMIZATION=true but the 'pii' extra is not installed. "
                "Run: uv sync --extra pii  (and) uv run python -m spacy download en_core_web_lg"
            ) from exc
        self._analyzer = AnalyzerEngine()
        return self._analyzer

    def anonymize(self, text: str) -> AnonymizationResult:
        if not self._settings.enable_pii_anonymization:
            return AnonymizationResult(anonymized_text=text, token_map={})

        analyzer = self._get_analyzer()
        results = analyzer.analyze(text=text, entities=_SUPPORTED_ENTITIES, language="en")
        results.sort(key=lambda r: r.start)

        value_to_token: dict[str, str] = {}
        counters: dict[str, int] = defaultdict(int)
        token_map: dict[str, str] = {}

        # Rebuild the string left-to-right so we can assign stable tokens per unique value
        # (the same person's name always maps to the same PERSON_N token in this document).
        out_parts: list[str] = []
        cursor = 0
        for r in results:
            if r.start < cursor:
                continue  # overlapping match, skip
            original_value = text[r.start : r.end]
            token = value_to_token.get(original_value)
            if token is None:
                counters[r.entity_type] += 1
                token = f"{r.entity_type}_{counters[r.entity_type]}"
                value_to_token[original_value] = token
                token_map[token] = original_value

            out_parts.append(text[cursor : r.start])
            out_parts.append(token)
            cursor = r.end
        out_parts.append(text[cursor:])

        return AnonymizationResult(anonymized_text="".join(out_parts), token_map=token_map)

    def deanonymize(self, text: str, token_map: dict[str, str]) -> str:
        if not token_map:
            return text
        result = text
        # Replace longer tokens first to avoid partial-prefix collisions (e.g. PERSON_1 vs PERSON_10).
        for token in sorted(token_map, key=len, reverse=True):
            result = result.replace(token, token_map[token])
        return result
