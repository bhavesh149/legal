from legal_ai.llm.schemas import RetrievedChunk, SourceSpan
from legal_ai.pipeline.chat import _extract_citations


def _chunk(chunk_id: str, source: str = "document") -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=chunk_id,
        text="The Contractor assigns all IP perpetually to the Company.",
        source=source,
        span=SourceSpan(start=0, end=10),
        score=0.9,
    )


def test_extract_citations_strips_markers_and_resolves_known_chunks():
    doc_chunks = [_chunk("abc-123")]
    standard_chunks = [_chunk("std-999", source="standard_corpus")]
    answer = (
        "The IP clause assigns everything to the company. [[chunk:abc-123]] "
        "This is broader than typical market terms. [[chunk:std-999]]"
    )

    clean_text, citations = _extract_citations(answer, doc_chunks, standard_chunks)

    assert "[[chunk:" not in clean_text
    assert "assigns everything to the company" in clean_text
    assert {c.chunk_id for c in citations} == {"abc-123", "std-999"}
    assert {c.source for c in citations} == {"document", "standard_corpus"}


def test_extract_citations_drops_hallucinated_chunk_ids():
    answer = "This is risky. [[chunk:not-a-real-id]]"
    clean_text, citations = _extract_citations(answer, [], [])
    assert citations == []
    assert "[[chunk:" not in clean_text


def test_extract_citations_deduplicates_repeated_markers():
    doc_chunks = [_chunk("abc-123")]
    answer = "First point. [[chunk:abc-123]] Second point, same source. [[chunk:abc-123]]"
    _, citations = _extract_citations(answer, doc_chunks, [])
    assert len(citations) == 1
