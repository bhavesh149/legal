from legal_ai.llm.schemas import ClauseFindingDraft, RiskReportDraft, Severity
from legal_ai.pipeline.grounding import locate_span, resolve_report_spans

DOCUMENT = (
    "1. TERM. This lease begins on January 1 and ends on December 31.\n\n"
    "2. LATE FEES. A late fee of $25 plus $5 per day after the 4th of the "
    "month will be charged, with no exceptions.\n\n"
    "3. DEPOSIT. The security deposit will be returned within 60 days after "
    "the tenant vacates the property."
)


def test_locate_span_exact_match():
    quote = "A late fee of $25 plus $5 per day after the 4th of the month will be charged"
    span = locate_span(quote, DOCUMENT)
    assert span is not None
    assert DOCUMENT[span.start : span.end] == quote


def test_locate_span_tolerates_whitespace_reflow():
    # Simulate the model collapsing a line-wrapped quote onto one line.
    quote = "The security deposit will be returned within 60 days after the tenant vacates the property."
    span = locate_span(quote, DOCUMENT)
    assert span is not None
    assert "60 days" in DOCUMENT[span.start : span.end]


def test_locate_span_returns_none_for_fabricated_quote():
    span = locate_span("This sentence does not appear anywhere in the contract at all.", DOCUMENT)
    assert span is None


def test_locate_span_empty_quote():
    assert locate_span("", DOCUMENT) is None


def test_resolve_report_spans_builds_final_report_with_disclaimer():
    draft = RiskReportDraft(
        safety_score=40,
        summary="Several harsh clauses.",
        findings=[
            ClauseFindingDraft(
                category="PAYMENT_TERMS",
                severity=Severity.RED,
                title="Steep late fee",
                explanation="The daily penalty adds up fast.",
                market_comparison="Harsher than the typical flat $25-50 late fee.",
                quoted_text="A late fee of $25 plus $5 per day after the 4th of the month will be charged",
                confidence=0.9,
            ),
            ClauseFindingDraft(
                category="OTHER",
                severity=Severity.YELLOW,
                title="Fabricated clause",
                explanation="Quote doesn't exist in the doc.",
                market_comparison="n/a",
                quoted_text="not actually in the document",
                confidence=0.5,
            ),
        ],
    )

    report = resolve_report_spans(draft, DOCUMENT, disclaimer="TEST DISCLAIMER")

    assert report.disclaimer == "TEST DISCLAIMER"
    assert report.findings[0].source_span is not None
    assert report.findings[1].source_span is None
