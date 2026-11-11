"""Deterministically resolve LLM-quoted clause excerpts back to character spans.

LLMs are unreliable at counting characters (see commit history: `gpt-oss-120b`
returned `source_span: [-1, -1]` and drifted from the requested schema entirely
when asked to compute offsets directly). Instead we ask the model to quote the
clause verbatim (`ClauseFindingDraft.quoted_text`) and locate it in the original
text ourselves with plain string search -- exact first, then whitespace-tolerant,
then a small Levenshtein-free fuzzy fallback for minor transcription drift.
"""

import re

import structlog

from legal_ai.llm.schemas import ClauseFinding, RiskReport, RiskReportDraft, SourceSpan

logger = structlog.get_logger(__name__)

# Below this ratio of (matched chars / quote chars) we don't trust the fuzzy match
# enough to claim a span -- better to omit the highlight than to highlight the wrong text.
_MIN_FUZZY_COVERAGE = 0.6


def _normalized_pattern(quoted_text: str) -> re.Pattern[str]:
    """Build a regex that matches `quoted_text` tolerating whitespace/newline differences
    introduced by markdown reflow, while keeping the rest of the text literal."""
    tokens = quoted_text.split()
    escaped = [re.escape(t) for t in tokens]
    return re.compile(r"\s+".join(escaped))


def locate_span(quoted_text: str, document_text: str) -> SourceSpan | None:
    quoted_text = quoted_text.strip()
    if not quoted_text:
        return None

    exact_idx = document_text.find(quoted_text)
    if exact_idx != -1:
        return SourceSpan(start=exact_idx, end=exact_idx + len(quoted_text))

    if len(quoted_text) > 400:
        # Long quotes are rarely reproduced verbatim by the model end-to-end; searching
        # for the whole thing via regex would also be needlessly expensive. Try anchoring
        # on the first ~200 chars instead, which is usually enough to find the real clause.
        quoted_text = quoted_text[:200]

    try:
        match = _normalized_pattern(quoted_text).search(document_text)
    except re.error:
        match = None
    if match:
        return SourceSpan(start=match.start(), end=match.end())

    # Last resort: find the longest run of consecutive words from the quote that does
    # appear verbatim, and accept it only if it covers a reasonable share of the quote.
    words = quoted_text.split()
    best: tuple[int, int, int] | None = None  # (start, end, word_count)
    for window in range(len(words), 0, -1):
        for start_i in range(0, len(words) - window + 1):
            candidate = " ".join(words[start_i : start_i + window])
            idx = document_text.find(candidate)
            if idx != -1:
                best = (idx, idx + len(candidate), window)
                break
        if best:
            break

    if best and best[2] / max(len(words), 1) >= _MIN_FUZZY_COVERAGE:
        return SourceSpan(start=best[0], end=best[1])
    return None


def resolve_report_spans(draft: RiskReportDraft, document_text: str, *, disclaimer: str) -> RiskReport:
    findings: list[ClauseFinding] = []
    unresolved = 0
    for item in draft.findings:
        span = locate_span(item.quoted_text, document_text)
        if span is None:
            unresolved += 1
        findings.append(
            ClauseFinding(
                category=item.category,
                severity=item.severity,
                title=item.title,
                explanation=item.explanation,
                market_comparison=item.market_comparison,
                suggested_redline=item.suggested_redline,
                quoted_text=item.quoted_text,
                source_span=span,
                confidence=item.confidence,
            )
        )

    if unresolved:
        logger.info(
            "clause_span_resolution",
            total=len(findings),
            unresolved=unresolved,
        )

    return RiskReport(
        safety_score=draft.safety_score,
        summary=draft.summary,
        findings=findings,
        disclaimer=disclaimer,
    )
