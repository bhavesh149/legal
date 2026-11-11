"""Groq LLM adapter.

Design goals (see PROJECT plan "Concurrency & scaling architecture"):
- One thin wrapper around the OpenAI-compatible Groq SDK, reused for structured
  analysis, chat streaming, and small utility calls (query condensation, tagging).
- Model tiering: cheap/fast model for utility tasks, default model for analysis/chat,
  long-context model for oversized contracts.
- Self-throttling: Groq's base-tier RPM/TPM ceilings are easy to exceed under even
  light concurrency, so every call is gated by (a) a per-model in-process semaphore
  and (b) a proactive Redis fixed-window check, then (c) retried with backoff on 429.
"""

import asyncio
import re
from collections.abc import AsyncIterator
from typing import Any, Literal, TypeVar, cast

import instructor
import openai
import structlog
from openai import AsyncOpenAI
from pydantic import BaseModel
from redis.asyncio import Redis
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_random_exponential,
)

from legal_ai.config import Settings
from legal_ai.llm.prompts import (
    ANALYSIS_SYSTEM_PROMPT,
    CHAT_SYSTEM_PROMPT,
    CLAUSE_TAGGING_SYSTEM_PROMPT,
    HISTORY_SUMMARY_SYSTEM_PROMPT,
    QUERY_CONDENSE_SYSTEM_PROMPT,
    SCAN_SYSTEM_PROMPT,
    build_analysis_user_prompt,
    build_chat_user_prompt,
    build_scan_user_prompt,
)
from legal_ai.llm.schemas import (
    ChatTurn,
    RetrievedChunk,
    RiskProfile,
    RiskReportDraft,
    SafetyScoreOnly,
)
from legal_ai.storage.ratelimit import FixedWindowRateLimiter, RateLimitExceeded

logger = structlog.get_logger(__name__)

ModelTier = Literal["fast", "default", "long_context", "guard"]

# Conservative in-process concurrency caps derived from Groq base-tier RPM so we
# rarely rely on 429 retries to begin with. A model averaging ~3-5s per call at
# `concurrency` N sustains roughly N * (60 / avg_latency) requests/min.
_DEFAULT_CONCURRENCY = 4
_FAST_CONCURRENCY = 4

# Groq's `openai/gpt-oss-*` models support native Structured Outputs with
# `strict: true`, which uses constrained decoding to *guarantee* the response
# matches our JSON Schema exactly (see console.groq.com/docs/structured-outputs).
# In practice these models are unreliable with `instructor`'s TOOLS
# (function-calling) mode on non-trivial schemas -- they drift from the
# requested shape (renamed/omitted fields) even across instructor's own
# validation-retry loop. We route these specific models through Groq's native
# strict JSON Schema API instead and skip instructor's TOOLS mode entirely.
# Every other model falls back to instructor/TOOLS, which Groq's own tool-use
# feature supports much more broadly.
_STRICT_JSON_SCHEMA_MODELS = {"openai/gpt-oss-120b", "openai/gpt-oss-20b"}

_ModelT = TypeVar("_ModelT", bound=BaseModel)


def _make_strict_json_schema(response_model: type[BaseModel]) -> dict[str, Any]:
    """Recursively force `additionalProperties: false` + all-properties-required
    on every object node (including nested `$defs`), as required by Groq's
    `strict: true` Structured Outputs mode."""
    schema = response_model.model_json_schema()

    def _patch(node: object) -> None:
        if isinstance(node, dict):
            if node.get("type") == "object" and "properties" in node:
                node["additionalProperties"] = False
                node["required"] = list(node["properties"].keys())
            for value in node.values():
                _patch(value)
        elif isinstance(node, list):
            for item in node:
                _patch(item)

    _patch(schema)
    return schema


class PromptInjectionDetected(Exception):
    pass


class GroqClient:
    def __init__(self, settings: Settings, redis: Redis):
        self._settings = settings
        self._redis = redis
        self._rate_limiter = FixedWindowRateLimiter(redis, prefix="groq_rpm")

        self._async_client = AsyncOpenAI(
            base_url=settings.groq_base_url,
            api_key=settings.groq_api_key,
        )
        self._structured_client = instructor.from_openai(
            self._async_client, mode=instructor.Mode.TOOLS
        )

        self._semaphores: dict[str, asyncio.Semaphore] = {
            settings.llm_model_fast: asyncio.Semaphore(_FAST_CONCURRENCY),
            settings.llm_model_default: asyncio.Semaphore(_DEFAULT_CONCURRENCY),
            settings.llm_model_long_context: asyncio.Semaphore(2),
            settings.llm_model_guard: asyncio.Semaphore(_FAST_CONCURRENCY),
        }

    def _model_for(self, tier: ModelTier) -> str:
        return {
            "fast": self._settings.llm_model_fast,
            "default": self._settings.llm_model_default,
            "long_context": self._settings.llm_model_long_context,
            "guard": self._settings.llm_model_guard,
        }[tier]

    def _rpm_for(self, model: str) -> int:
        if model == self._settings.llm_model_fast:
            return self._settings.groq_rpm_fast
        return self._settings.groq_rpm_default

    async def _gate(self, model: str) -> None:
        """Proactively self-throttle before issuing a call to `model`."""
        try:
            await self._rate_limiter.check(model, limit=self._rpm_for(model), window_seconds=60)
        except RateLimitExceeded as exc:
            wait_s = min(exc.retry_after_seconds, 20.0)
            logger.warning("groq_self_throttle", model=model, wait_seconds=wait_s)
            await asyncio.sleep(wait_s)

    _RETRYABLE_ERRORS = (openai.RateLimitError, openai.APITimeoutError)

    @retry(
        retry=retry_if_exception_type(_RETRYABLE_ERRORS),
        wait=wait_random_exponential(multiplier=1, max=20),
        stop=stop_after_attempt(5),
        reraise=True,
    )
    async def _call_structured_strict_json(
        self, *, model: str, messages: list[dict[str, str]], response_model: type[_ModelT]
    ) -> _ModelT:
        """Groq native `strict: true` Structured Outputs -- constrained decoding
        guarantees the raw JSON always matches the schema (see module docstring
        on `_STRICT_JSON_SCHEMA_MODELS`), so no instructor validation-retry loop
        is needed here."""
        semaphore = self._semaphores.setdefault(model, asyncio.Semaphore(_DEFAULT_CONCURRENCY))
        async with semaphore:
            await self._gate(model)
            response = await self._async_client.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                response_format=cast(
                    Any,
                    {
                        "type": "json_schema",
                        "json_schema": {
                            "name": response_model.__name__,
                            "strict": True,
                            "schema": _make_strict_json_schema(response_model),
                        },
                    },
                ),
            )
            content = response.choices[0].message.content or "{}"
            return response_model.model_validate_json(content)

    async def _call_structured(
        self, *, model: str, messages: list[dict[str, str]], response_model: type[_ModelT]
    ) -> _ModelT:
        if model in _STRICT_JSON_SCHEMA_MODELS:
            return await self._call_structured_strict_json(
                model=model, messages=messages, response_model=response_model
            )

        semaphore = self._semaphores.setdefault(model, asyncio.Semaphore(_DEFAULT_CONCURRENCY))
        async with semaphore:
            await self._gate(model)
            return await self._structured_client.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                response_model=response_model,
                # instructor-level validation retries (re-prompts the model with the
                # validation error and asks it to fix its own output) -- weaker
                # tool-calling models occasionally drift from the schema on the first
                # attempt, so give it a couple of chances before giving up. The outer
                # `@retry` decorator handles 429/timeout retries separately.
                max_retries=2,
            )

    @retry(
        retry=retry_if_exception_type(_RETRYABLE_ERRORS),
        wait=wait_random_exponential(multiplier=1, max=20),
        stop=stop_after_attempt(5),
        reraise=True,
    )
    async def _call_text(self, *, model: str, messages: list[dict[str, str]], max_tokens: int = 256) -> str:
        semaphore = self._semaphores.setdefault(model, asyncio.Semaphore(_DEFAULT_CONCURRENCY))
        async with semaphore:
            await self._gate(model)
            response = await self._async_client.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                max_tokens=max_tokens,
                temperature=0.0,
            )
            return (response.choices[0].message.content or "").strip()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_risk_report(
        self,
        *,
        document_markdown: str,
        retrieved_standards: list[RetrievedChunk],
        profile: RiskProfile,
        use_long_context: bool = False,
    ) -> RiskReportDraft:
        model = self._model_for("long_context" if use_long_context else "default")
        user_prompt = build_analysis_user_prompt(document_markdown, retrieved_standards, profile)
        logger.info("groq_analysis_call", model=model, doc_chars=len(document_markdown))
        return await self._call_structured(
            model=model,
            messages=[
                {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_model=RiskReportDraft,
        )

    async def generate_quick_scan(self, *, document_markdown: str) -> SafetyScoreOnly:
        model = self._model_for("fast")
        # Only the first slice is used -- the free scanner is meant to be a fast teaser,
        # not a full analysis, so we deliberately trade completeness for speed/cost here.
        excerpt = document_markdown[:12_000]
        return await self._call_structured(
            model=model,
            messages=[
                {"role": "system", "content": SCAN_SYSTEM_PROMPT},
                {"role": "user", "content": build_scan_user_prompt(excerpt)},
            ],
            response_model=SafetyScoreOnly,
        )

    async def condense_query(self, question: str, history: list[ChatTurn]) -> str:
        if not history:
            return question
        history_text = "\n".join(f"{t.role}: {t.content}" for t in history[-6:])
        model = self._model_for("fast")
        result = await self._call_text(
            model=model,
            messages=[
                {"role": "system", "content": QUERY_CONDENSE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"CONVERSATION HISTORY:\n{history_text}\n\nLATEST MESSAGE: {question}",
                },
            ],
            max_tokens=128,
        )
        return result or question

    async def summarize_history(self, existing_summary: str | None, turns_to_collapse: list[ChatTurn]) -> str:
        transcript = "\n".join(f"{t.role}: {t.content}" for t in turns_to_collapse)
        prior = existing_summary or "(none yet)"
        model = self._model_for("fast")
        return await self._call_text(
            model=model,
            messages=[
                {"role": "system", "content": HISTORY_SUMMARY_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"PRIOR SUMMARY: {prior}\n\nNEW TURNS:\n{transcript}",
                },
            ],
            max_tokens=220,
        )

    async def tag_clause(self, text: str) -> str:
        model = self._model_for("fast")
        label = await self._call_text(
            model=model,
            messages=[
                {"role": "system", "content": CLAUSE_TAGGING_SYSTEM_PROMPT},
                {"role": "user", "content": text[:2000]},
            ],
            max_tokens=16,
        )
        cleaned = re.sub(r"[^A-Z_]", "", label.upper())
        return cleaned or "OTHER"

    async def check_prompt_injection(self, text: str) -> bool:
        """Best-effort guardrail using Llama Prompt Guard 2. Fails open (returns False)
        on any error so a guard-model hiccup never blocks the primary user flow."""
        model = self._model_for("guard")
        try:
            label = await self._call_text(
                model=model,
                messages=[{"role": "user", "content": text[:4000]}],
                max_tokens=8,
            )
        except Exception:
            logger.warning("prompt_guard_call_failed", exc_info=True)
            return False
        return any(flag in label.upper() for flag in ("INJECTION", "JAILBREAK", "MALICIOUS"))

    async def stream_chat_answer(
        self,
        *,
        question: str,
        doc_chunks: list[RetrievedChunk],
        standard_chunks: list[RetrievedChunk],
        history_turns: list[ChatTurn],
        history_summary: str | None,
    ) -> AsyncIterator[str]:
        model = self._model_for("default")
        user_prompt = build_chat_user_prompt(question, doc_chunks, standard_chunks, history_summary)

        messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
        for turn in history_turns[-8:]:
            messages.append({"role": turn.role, "content": turn.content})
        messages.append({"role": "user", "content": user_prompt})

        semaphore = self._semaphores.setdefault(model, asyncio.Semaphore(_DEFAULT_CONCURRENCY))
        async with semaphore:
            await self._gate(model)
            stream = await self._async_client.chat.completions.create(
                model=model,
                messages=messages,  # type: ignore[arg-type]
                stream=True,
                temperature=0.2,
            )
            async for chunk in stream:  # type: ignore[union-attr]
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield delta
