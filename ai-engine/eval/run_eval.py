"""Eval harness: measures finding precision/recall against a small labeled golden set.

This is intentionally lightweight (no Qdrant/S3 dependency -- it calls the LLM layer
directly against `golden_set.jsonl`'s raw contract text) so it can run in CI without
spinning up the full local infra stack. It requires a real `GROQ_API_KEY` since it
exercises the actual model.

Usage:
    uv run python eval/run_eval.py
"""

import asyncio
import json
from pathlib import Path

from fakeredis import FakeAsyncRedis

from legal_ai.config import get_settings
from legal_ai.llm.client import GroqClient
from legal_ai.llm.schemas import RiskProfile
from legal_ai.utils.logging import configure_logging, get_logger

logger = get_logger(__name__)
GOLDEN_SET_PATH = Path(__file__).resolve().parent / "golden_set.jsonl"

_SEVERITY_RANK = {"green": 0, "yellow": 1, "red": 2}


def load_golden_set() -> list[dict]:
    cases = []
    with GOLDEN_SET_PATH.open() as f:
        for line in f:
            line = line.strip()
            if line:
                cases.append(json.loads(line))
    return cases


async def evaluate_case(groq: GroqClient, case: dict) -> dict:
    report = await groq.generate_risk_report(
        document_markdown=case["contract_text"],
        retrieved_standards=[],
        profile=RiskProfile(),
    )

    score_ok = True
    if "expected_safety_score_min" in case:
        score_ok = report.safety_score >= case["expected_safety_score_min"]
    if "expected_safety_score_max" in case:
        score_ok = score_ok and report.safety_score <= case["expected_safety_score_max"]

    expected = case.get("expected_findings", [])
    matched = 0
    for exp in expected:
        for finding in report.findings:
            same_category = finding.category.upper() == exp["category"].upper()
            severe_enough = _SEVERITY_RANK.get(finding.severity, 0) >= _SEVERITY_RANK.get(exp["severity"], 0)
            if same_category and severe_enough:
                matched += 1
                break

    return {
        "id": case["id"],
        "safety_score": report.safety_score,
        "score_ok": score_ok,
        "expected_count": len(expected),
        "matched_count": matched,
        "actual_finding_count": len(report.findings),
    }


async def main_async() -> None:
    settings = get_settings()
    configure_logging(settings)
    if not settings.groq_api_key or settings.groq_api_key in {"", "gsk_xxx"}:
        print("GROQ_API_KEY is not set in .env -- the eval harness needs live Groq calls to run.")
        return

    redis = FakeAsyncRedis()
    groq = GroqClient(settings, redis)
    cases = load_golden_set()

    results = []
    for case in cases:
        try:
            result = await evaluate_case(groq, case)
        except Exception as exc:
            logger.exception("eval_case_failed", case_id=case["id"])
            result = {"id": case["id"], "error": str(exc)}
        results.append(result)
        print(json.dumps(result, indent=2))

    total_expected = sum(r.get("expected_count", 0) for r in results)
    total_matched = sum(r.get("matched_count", 0) for r in results)
    total_actual = sum(r.get("actual_finding_count", 0) for r in results)
    score_pass = sum(1 for r in results if r.get("score_ok"))

    recall = (total_matched / total_expected) if total_expected else float("nan")
    precision = (total_matched / total_actual) if total_actual else float("nan")

    print("\n=== Summary ===")
    print(f"Cases: {len(results)}  Safety-score checks passed: {score_pass}/{len(results)}")
    print(f"Finding recall:    {recall:.2%}  ({total_matched}/{total_expected} expected findings caught)")
    print(f"Finding precision: {precision:.2%}  ({total_matched}/{total_actual} raised findings were expected)")
    await redis.aclose()


def main() -> None:
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
