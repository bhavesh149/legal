"""Analysis orchestrator: parse -> [anonymize] -> clause-chunk -> index for chat ->
hybrid-retrieve market-standard context -> Groq structured analysis -> de-anonymize.

This is the single source of truth for "what happens when a contract is analyzed",
called from the ARQ worker task (see worker/arq_worker.py). Keeping it separate from
the worker/API layers means the same function is trivially unit-testable and could be
invoked synchronously (e.g. from a CLI/eval script) without spinning up a queue.
"""

import structlog

from legal_ai.llm.schemas import NOT_LEGAL_ADVICE_DISCLAIMER, RiskProfile, RiskReport
from legal_ai.pipeline.anonymize import Anonymizer
from legal_ai.pipeline.chunking import chunk_document
from legal_ai.pipeline.grounding import resolve_report_spans
from legal_ai.pipeline.parsing import parse_pdf_bytes
from legal_ai.pipeline.retrieval import Retriever
from legal_ai.state import AppState

logger = structlog.get_logger(__name__)

# Rough chars-per-token proxy (~4 chars/token for English legal prose) used only to
# decide model tiering and truncation -- not an exact tokenizer.
_CHARS_PER_TOKEN_ESTIMATE = 4
# Groq's base-tier gpt-oss-120b TPM ceiling is small (see .env.example); anything that
# would meaningfully eat into that budget in a single call is routed to the
# long-context model instead, which we assume/require a higher limit for in production.
_LONG_CONTEXT_CHAR_THRESHOLD = 20_000
# Hard ceiling so a pathological document can't blow the LLM's context window or run away cost.
_MAX_DOCUMENT_CHARS = 180_000

_STANDARDS_PER_CHUNK = 2
_MAX_STANDARDS_FOR_PROMPT = 12
# Sampling cap: for very long documents we retrieve standards for a representative
# sample of chunks rather than every single one, to bound retrieval latency/cost.
_MAX_CHUNKS_SAMPLED_FOR_RETRIEVAL = 40


def _truncate_for_llm(text: str) -> tuple[str, bool]:
    if len(text) <= _MAX_DOCUMENT_CHARS:
        return text, False
    logger.warning("document_truncated_for_analysis", original_chars=len(text))
    return text[:_MAX_DOCUMENT_CHARS], True


async def _gather_standard_context(
    retriever: Retriever, chunks: list, category: str | None
) -> list:
    sampled = chunks[:_MAX_CHUNKS_SAMPLED_FOR_RETRIEVAL]
    best_by_id: dict[str, object] = {}
    for chunk in sampled:
        matches = await retriever.retrieve_standard_clauses(
            chunk.text, category=category, top_k=_STANDARDS_PER_CHUNK
        )
        for m in matches:
            existing = best_by_id.get(m.chunk_id)
            if existing is None or m.score > existing.score:  # type: ignore[attr-defined]
                best_by_id[m.chunk_id] = m
    merged = sorted(best_by_id.values(), key=lambda m: m.score, reverse=True)  # type: ignore[attr-defined]
    return merged[:_MAX_STANDARDS_FOR_PROMPT]


def _deanonymize_report(report: RiskReport, anonymizer: Anonymizer, token_map: dict[str, str]) -> RiskReport:
    if not token_map:
        return report
    report.summary = anonymizer.deanonymize(report.summary, token_map)
    for finding in report.findings:
        finding.title = anonymizer.deanonymize(finding.title, token_map)
        finding.explanation = anonymizer.deanonymize(finding.explanation, token_map)
        finding.market_comparison = anonymizer.deanonymize(finding.market_comparison, token_map)
        finding.suggested_redline = anonymizer.deanonymize(finding.suggested_redline, token_map)
    return report


async def run_analysis(
    *,
    state: AppState,
    document_id: str,
    document_bytes: bytes,
    filename: str,
    profile: RiskProfile,
    category: str | None = None,
) -> RiskReport:
    settings = state.settings

    parsed = await parse_pdf_bytes(document_bytes, filename=filename, settings=settings)
    logger.info(
        "document_parsed",
        document_id=document_id,
        page_count=parsed.page_count,
        used_ocr=parsed.used_ocr,
        char_count=parsed.char_count,
    )

    anonymization = state.anonymizer.anonymize(parsed.markdown)
    processed_text = anonymization.anonymized_text
    if anonymization.token_map:
        logger.info("document_anonymized", document_id=document_id, entity_count=len(anonymization.token_map))

    chunks = chunk_document(processed_text)
    logger.info("document_chunked", document_id=document_id, chunk_count=len(chunks))

    # Index for post-analysis conversational Q&A (see pipeline/chat.py) before the
    # (slower) LLM call, so chat is available even if the analysis step later fails.
    await state.retriever.index_document_chunks(document_id=document_id, chunks=chunks, settings=settings)

    retrieved_standards = await _gather_standard_context(state.retriever, chunks, category)

    text_for_llm, truncated = _truncate_for_llm(processed_text)
    use_long_context = len(text_for_llm) > _LONG_CONTEXT_CHAR_THRESHOLD

    draft = await state.groq.generate_risk_report(
        document_markdown=text_for_llm,
        retrieved_standards=retrieved_standards,
        profile=profile,
        use_long_context=use_long_context,
    )
    # The LLM only quotes clauses verbatim (`quoted_text`); we resolve the real
    # character span ourselves via deterministic string search (see grounding.py),
    # since LLMs cannot reliably compute/count character offsets on their own.
    report = resolve_report_spans(draft, text_for_llm, disclaimer=NOT_LEGAL_ADVICE_DISCLAIMER)

    if truncated:
        report.summary += " (Note: this document was long and was analyzed in truncated form.)"

    report = _deanonymize_report(report, state.anonymizer, anonymization.token_map)

    logger.info(
        "analysis_complete",
        document_id=document_id,
        safety_score=report.safety_score,
        finding_count=len(report.findings),
        model_tier="long_context" if use_long_context else "default",
    )
    return report
