"""Qdrant-backed hybrid vector store.

Two collections, one interface (see plan "Optimized RAG pipeline"):
- `standard_clauses`: persistent, versioned corpus of market-standard contract clauses.
- `document_chunks`: ephemeral, per-uploaded-document chunks (payload-filtered by
  document_id, TTL-cleaned) that power document-grounded conversational Q&A.

Retrieval combines a dense embedding (semantic similarity) with a sparse BM25-style
embedding (exact legal-term matches like "force majeure") fused via Reciprocal Rank
Fusion using Qdrant's native Query API -- this is materially better than dense-only
search for legal text, which is full of exact, low-frequency terms of art.
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Literal

from fastembed import SparseTextEmbedding, TextEmbedding
from qdrant_client import AsyncQdrantClient, models

from legal_ai.config import Settings

DENSE_MODEL_NAME = "BAAI/bge-small-en-v1.5"
DENSE_VECTOR_SIZE = 384
SPARSE_MODEL_NAME = "Qdrant/bm25"

DENSE_VECTOR_NAME = "dense"
SPARSE_VECTOR_NAME = "sparse"

CollectionName = Literal["standards", "documents"]


@dataclass
class SearchHit:
    id: str
    score: float
    payload: dict[str, Any]


class VectorStore:
    def __init__(self, settings: Settings):
        self._settings = settings
        self.client = AsyncQdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)
        # fastembed models are downloaded once and cached on disk; construction is
        # cheap after the first run but inference is CPU-bound, so callers should
        # run embed_* via asyncio.to_thread from async request paths.
        self._dense = TextEmbedding(model_name=DENSE_MODEL_NAME)
        self._sparse = SparseTextEmbedding(model_name=SPARSE_MODEL_NAME)

    def _collection_name(self, collection: CollectionName) -> str:
        return (
            self._settings.qdrant_collection_standards
            if collection == "standards"
            else self._settings.qdrant_collection_documents
        )

    async def ensure_collections(self) -> None:
        for collection in ("standards", "documents"):
            name = self._collection_name(collection)
            exists = await self.client.collection_exists(name)
            if exists:
                continue
            await self.client.create_collection(
                collection_name=name,
                vectors_config={
                    DENSE_VECTOR_NAME: models.VectorParams(
                        size=DENSE_VECTOR_SIZE, distance=models.Distance.COSINE
                    )
                },
                sparse_vectors_config={
                    SPARSE_VECTOR_NAME: models.SparseVectorParams(
                        modifier=models.Modifier.IDF,
                    )
                },
            )
            if collection == "standards":
                await self.client.create_payload_index(
                    collection_name=name,
                    field_name="category",
                    field_schema=models.PayloadSchemaType.KEYWORD,
                )
                await self.client.create_payload_index(
                    collection_name=name,
                    field_name="clause_type",
                    field_schema=models.PayloadSchemaType.KEYWORD,
                )
            else:
                await self.client.create_payload_index(
                    collection_name=name,
                    field_name="document_id",
                    field_schema=models.PayloadSchemaType.KEYWORD,
                )
                await self.client.create_payload_index(
                    collection_name=name,
                    field_name="expires_at",
                    field_schema=models.PayloadSchemaType.INTEGER,
                )

    def embed_dense(self, texts: list[str]) -> list[list[float]]:
        return [vec.tolist() for vec in self._dense.embed(texts)]

    def embed_sparse(self, texts: list[str]) -> list[models.SparseVector]:
        return [
            models.SparseVector(indices=vec.indices.tolist(), values=vec.values.tolist())
            for vec in self._sparse.embed(texts)
        ]

    async def upsert(
        self,
        *,
        collection: CollectionName,
        ids: list[str],
        texts: list[str],
        payloads: list[dict[str, Any]],
    ) -> None:
        if not ids:
            return
        dense_vectors, sparse_vectors = await asyncio.to_thread(
            lambda: (self.embed_dense(texts), self.embed_sparse(texts))
        )
        points = [
            models.PointStruct(
                id=point_id,
                vector={DENSE_VECTOR_NAME: dense, SPARSE_VECTOR_NAME: sparse},
                payload=payload,
            )
            for point_id, dense, sparse, payload in zip(
                ids, dense_vectors, sparse_vectors, payloads, strict=True
            )
        ]
        await self.client.upsert(collection_name=self._collection_name(collection), points=points)

    async def hybrid_search(
        self,
        *,
        collection: CollectionName,
        query_text: str,
        top_k: int = 5,
        prefetch_limit: int = 20,
        query_filter: models.Filter | None = None,
    ) -> list[SearchHit]:
        dense_query, sparse_query = await asyncio.to_thread(
            lambda: (self.embed_dense([query_text])[0], self.embed_sparse([query_text])[0])
        )

        result = await self.client.query_points(
            collection_name=self._collection_name(collection),
            prefetch=[
                models.Prefetch(
                    query=dense_query,
                    using=DENSE_VECTOR_NAME,
                    limit=prefetch_limit,
                    filter=query_filter,
                ),
                models.Prefetch(
                    query=sparse_query,
                    using=SPARSE_VECTOR_NAME,
                    limit=prefetch_limit,
                    filter=query_filter,
                ),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=top_k,
            with_payload=True,
        )
        return [
            SearchHit(id=str(point.id), score=point.score, payload=point.payload or {})
            for point in result.points
        ]

    async def delete_expired_document_chunks(self, *, now: int | None = None) -> int:
        """Periodic cleanup for the ephemeral document_chunks collection (TTL enforcement)."""
        now = now or int(time.time())
        name = self._collection_name("documents")
        result = await self.client.delete(
            collection_name=name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[models.FieldCondition(key="expires_at", range=models.Range(lt=now))]
                )
            ),
        )
        return 1 if result.status == models.UpdateStatus.COMPLETED else 0

    async def delete_document(self, document_id: str) -> None:
        name = self._collection_name("documents")
        await self.client.delete(
            collection_name=name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[models.FieldCondition(key="document_id", match=models.MatchValue(value=document_id))]
                )
            ),
        )

    @staticmethod
    def category_filter(category: str | None) -> models.Filter | None:
        if not category:
            return None
        return models.Filter(
            must=[models.FieldCondition(key="category", match=models.MatchValue(value=category))]
        )

    @staticmethod
    def document_filter(document_id: str) -> models.Filter:
        return models.Filter(
            must=[
                models.FieldCondition(key="document_id", match=models.MatchValue(value=document_id))
            ]
        )
