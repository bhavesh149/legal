import pytest
from pydantic import ValidationError

from legal_ai.llm.schemas import (
    NOT_LEGAL_ADVICE_DISCLAIMER,
    ClauseFinding,
    RiskReport,
    SafetyScoreOnly,
    Severity,
    SourceSpan,
)


def test_risk_report_defaults_include_disclaimer():
    report = RiskReport(safety_score=70, summary="Reasonably standard NDA.")
    assert report.disclaimer == NOT_LEGAL_ADVICE_DISCLAIMER
    assert report.findings == []


def test_safety_score_bounds_are_enforced():
    with pytest.raises(ValidationError):
        SafetyScoreOnly(safety_score=101, summary="x", risk_area_count=0)
    with pytest.raises(ValidationError):
        SafetyScoreOnly(safety_score=0, summary="x", risk_area_count=0)


def test_clause_finding_requires_valid_severity():
    finding = ClauseFinding(
        category="ARBITRATION",
        severity=Severity.RED,
        title="Mandatory arbitration",
        explanation="You give up the right to sue in court.",
        market_comparison="Most standard agreements allow either.",
        source_span=SourceSpan(start=10, end=120),
        confidence=0.9,
    )
    assert finding.severity == "red"
    with pytest.raises(ValidationError):
        ClauseFinding.model_validate({**finding.model_dump(), "severity": "purple"})
