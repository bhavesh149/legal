"""Integration test against a real local Qdrant instance (docker-compose up qdrant).

Skipped automatically if Qdrant isn't reachable -- this is deliberately excluded from
the "no infra needed" unit-test suite, but exists to guard the exact hybrid-search
wiring bug class we hit during manual smoke testing (wrong Qdrant SDK kwarg name).
"""

import uuid

import pytest

from legal_ai.config import Settings
from legal_ai.storage.vectorstore import VectorStore


def _qdrant_available(settings: Settings) -> bool:
    import httpx

    try:
        response = httpx.get(f"{settings.qdrant_url}/collections", timeout=1.0)
        return response.status_code == 200
    except Exception:
        return False


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None,
        qdrant_collection_standards="test_standard_clauses",
        qdrant_collection_documents="test_document_chunks",
    )


@pytest.fixture
def store(settings: Settings):
    if not _qdrant_available(settings):
        pytest.skip("Qdrant is not reachable at QDRANT_URL; run `docker compose up -d qdrant` to enable this test.")
    return VectorStore(settings)


async def test_hybrid_search_with_category_filter_does_not_raise(store: VectorStore):
    await store.ensure_collections()
    doc_id = f"test-doc-{uuid.uuid4().hex[:8]}"

    await store.upsert(
        collection="standards",
        ids=[str(uuid.uuid4())],
        texts=["The Contractor assigns all intellectual property perpetually to the Company."],
        payloads=[{"text": "IP assignment clause", "category": "msa", "clause_type": "IP_ASSIGNMENT"}],
    )

    # This previously raised `Unknown arguments: ['filter']` due to a wrong Qdrant SDK kwarg.
    hits = await store.hybrid_search(
        collection="standards",
        query_text="intellectual property assignment",
        top_k=3,
        query_filter=store.category_filter("msa"),
    )
    assert isinstance(hits, list)

    await store.upsert(
        collection="documents",
        ids=[str(uuid.uuid4())],
        texts=["Some document chunk text."],
        payloads=[{"document_id": doc_id, "text": "Some document chunk text.", "expires_at": 9999999999}],
    )

    doc_hits = await store.hybrid_search(
        collection="documents",
        query_text="anything",
        top_k=3,
        query_filter=store.document_filter(doc_id),
    )
    assert isinstance(doc_hits, list)
