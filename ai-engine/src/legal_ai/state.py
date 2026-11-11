"""Process-wide singleton clients, built once at startup and shared across requests.

Centralizing this avoids the classic "new client per request" anti-pattern that
defeats connection pooling and is a common source of latency/throughput problems
under concurrent load.
"""

from dataclasses import dataclass

from arq import ArqRedis
from arq.connections import RedisSettings, create_pool
from redis.asyncio import Redis

from legal_ai.config import Settings
from legal_ai.llm.client import GroqClient
from legal_ai.pipeline.anonymize import Anonymizer
from legal_ai.pipeline.reranker import Reranker
from legal_ai.pipeline.retrieval import Retriever
from legal_ai.storage.conversations import ConversationStore
from legal_ai.storage.jobs import JobStore
from legal_ai.storage.objects import ObjectStore
from legal_ai.storage.ratelimit import FixedWindowRateLimiter
from legal_ai.storage.vectorstore import VectorStore


@dataclass
class AppState:
    settings: Settings
    redis: Redis
    object_store: ObjectStore
    vector_store: VectorStore
    reranker: Reranker
    retriever: Retriever
    groq: GroqClient
    anonymizer: Anonymizer
    jobs: JobStore
    conversations: ConversationStore
    user_rate_limiter: FixedWindowRateLimiter
    arq_pool: ArqRedis


async def build_app_state(settings: Settings) -> AppState:
    redis = Redis.from_url(settings.redis_url, decode_responses=True)

    object_store = ObjectStore(settings)
    await object_store.ensure_bucket()

    vector_store = VectorStore(settings)
    await vector_store.ensure_collections()

    reranker = Reranker()
    retriever = Retriever(vector_store, reranker)
    groq = GroqClient(settings, redis)
    anonymizer = Anonymizer(settings)
    jobs = JobStore(redis, settings)
    conversations = ConversationStore(redis, settings)
    user_rate_limiter = FixedWindowRateLimiter(redis, prefix="user_rpm")
    arq_pool = await create_pool(RedisSettings.from_dsn(settings.redis_url))

    return AppState(
        settings=settings,
        redis=redis,
        object_store=object_store,
        vector_store=vector_store,
        reranker=reranker,
        retriever=retriever,
        groq=groq,
        anonymizer=anonymizer,
        jobs=jobs,
        conversations=conversations,
        user_rate_limiter=user_rate_limiter,
        arq_pool=arq_pool,
    )


async def close_app_state(state: AppState) -> None:
    await state.arq_pool.aclose()
    await state.redis.aclose()
    await state.vector_store.client.close()
