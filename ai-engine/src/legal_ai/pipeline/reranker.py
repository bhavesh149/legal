"""Cross-encoder reranking.

Hybrid dense+sparse retrieval returns good *candidates*; a cross-encoder that jointly
scores (query, candidate) pairs materially improves final precision before the top
handful of chunks are spent on LLM context. Runs on CPU, no external API call.
"""

from fastembed.rerank.cross_encoder import TextCrossEncoder

from legal_ai.storage.vectorstore import SearchHit

RERANKER_MODEL_NAME = "Xenova/ms-marco-MiniLM-L-6-v2"


class Reranker:
    def __init__(self) -> None:
        self._model = TextCrossEncoder(model_name=RERANKER_MODEL_NAME)

    def rerank(self, query: str, hits: list[SearchHit], top_k: int) -> list[SearchHit]:
        if not hits:
            return []
        documents = [hit.payload.get("text", "") for hit in hits]
        scores = list(self._model.rerank(query, documents))
        scored = sorted(zip(hits, scores, strict=True), key=lambda pair: pair[1], reverse=True)
        reranked = []
        for hit, score in scored[:top_k]:
            hit.score = float(score)
            reranked.append(hit)
        return reranked
