"""Redis-backed async job store for the /v1/analyze pipeline.

Analysis takes 10-30s, so the API enqueues work onto ARQ and returns a job_id
immediately; this store is the shared source of truth for job status/result that
both the FastAPI process and the ARQ worker process read/write.
"""

from redis.asyncio import Redis

from legal_ai.config import Settings
from legal_ai.llm.schemas import AnalyzeJobResult, JobStatus, RiskReport

_KEY_PREFIX = "job"


class JobStore:
    def __init__(self, redis: Redis, settings: Settings):
        self._redis = redis
        self._settings = settings

    def _key(self, job_id: str) -> str:
        return f"{_KEY_PREFIX}:{job_id}"

    async def create(self, job_id: str, document_id: str) -> None:
        result = AnalyzeJobResult(job_id=job_id, document_id=document_id, status=JobStatus.QUEUED)
        await self._save(result)

    async def mark_processing(self, job_id: str) -> None:
        result = await self.get(job_id)
        if result is None:
            return
        result.status = JobStatus.PROCESSING
        await self._save(result)

    async def mark_complete(self, job_id: str, report: RiskReport) -> None:
        result = await self.get(job_id)
        if result is None:
            return
        result.status = JobStatus.COMPLETE
        result.report = report
        await self._save(result)

    async def mark_failed(self, job_id: str, error: str) -> None:
        result = await self.get(job_id)
        if result is None:
            return
        result.status = JobStatus.FAILED
        result.error = error
        await self._save(result)

    async def get(self, job_id: str) -> AnalyzeJobResult | None:
        raw = await self._redis.get(self._key(job_id))
        if raw is None:
            return None
        return AnalyzeJobResult.model_validate_json(raw)

    async def _save(self, result: AnalyzeJobResult) -> None:
        await self._redis.set(
            self._key(result.job_id),
            result.model_dump_json(),
            ex=self._settings.job_result_ttl_seconds,
        )
