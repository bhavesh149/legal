"""High-level retrieval API: hybrid search + rerank, exposed as one function per
source (standard corpus vs. the user's own document), returning validated
`RetrievedChunk`s ready to hand to the LLM layer.
"""

import asyncio
import time

import structlog

from legal_ai.config import Settings
from legal_ai.llm.schemas import RetrievedChunk, SourceSpan
from legal_ai.pipeline.chunking import Chunk
from legal_ai.pipeline.reranker import Reranker
from legal_ai.storage.vectorstore import SearchHit, VectorStore

logger = structlog.get_logger(__name__)

RERANK_PREFETCH_MULTIPLIER = 4


def _hit_to_chunk(hit: SearchHit, source: str) -> RetrievedChunk:
    payload = hit.payload
    span = None
    if "start" in payload and "end" in payload:
        span = SourceSpan(start=payload["start"], end=payload["end"])
    return RetrievedChunk(
        chunk_id=str(hit.id),
        text=payload.get("text", ""),
        source=source,  # type: ignore[arg-type]
        category=payload.get("category"),
        clause_type=payload.get("clause_type"),
        span=span,
        score=hit.score,
    )


class Retriever:
    def __init__(self, vector_store: VectorStore, reranker: Reranker):
        self._store = vector_store
        self._reranker = reranker

    async def retrieve_standard_clauses(
        self, query: str, *, category: str | None = None, top_k: int = 5
    ) -> list[RetrievedChunk]:
        query_filter = self._store.category_filter(category)
        hits = await self._store.hybrid_search(
            collection="standards",
            query_text=query,
            top_k=top_k * RERANK_PREFETCH_MULTIPLIER,
            query_filter=query_filter,
        )
        reranked = await asyncio.to_thread(self._reranker.rerank, query, hits, top_k)
        return [_hit_to_chunk(h, "standard_corpus") for h in reranked]

    async def retrieve_document_chunks(
        self, document_id: str, query: str, *, top_k: int = 5
    ) -> list[RetrievedChunk]:
        hits = await self._store.hybrid_search(
            collection="documents",
            query_text=query,
            top_k=top_k * RERANK_PREFETCH_MULTIPLIER,
            query_filter=self._store.document_filter(document_id),
        )
        reranked = await asyncio.to_thread(self._reranker.rerank, query, hits, top_k)
        return [_hit_to_chunk(h, "document") for h in reranked]

    async def index_document_chunks(
        self,
        *,
        document_id: str,
        chunks: list[Chunk],
        settings: Settings,
    ) -> None:
        if not chunks:
            return
        expires_at = int(time.time()) + settings.document_chunk_ttl_seconds
        ids = [f"{document_id}:{c.index}" for c in chunks]
        texts = [c.text for c in chunks]
        payloads = [
            {
                "document_id": document_id,
                "text": c.text,
                "start": c.start,
                "end": c.end,
                "chunk_index": c.index,
                "expires_at": expires_at,
            }
            for c in chunks
        ]
        # Qdrant point IDs must be int/UUID; deterministic UUID5 keeps re-indexing idempotent.
        import uuid

        point_ids = [str(uuid.uuid5(uuid.NAMESPACE_URL, pid)) for pid in ids]
        await self._store.upsert(collection="documents", ids=point_ids, texts=texts, payloads=payloads)
        logger.info("document_chunks_indexed", document_id=document_id, chunk_count=len(chunks))
