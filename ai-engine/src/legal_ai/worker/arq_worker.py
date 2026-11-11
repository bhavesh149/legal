"""ARQ worker: runs the heavy `/v1/analyze` pipeline out-of-band.

Scale by running more replicas of this worker process (`uv run arq legal_ai.worker.arq_worker.WorkerSettings`)
-- each replica pulls jobs from the same Redis queue, so throughput scales horizontally
without any code change. A cron job periodically purges expired ephemeral document
vectors (TTL enforcement for the `document_chunks` Qdrant collection).
"""

from typing import Any

from arq import cron
from arq.connections import RedisSettings

from legal_ai.config import get_settings
from legal_ai.llm.schemas import RiskProfile
from legal_ai.pipeline.analyze import run_analysis
from legal_ai.state import AppState, build_app_state, close_app_state
from legal_ai.utils.logging import configure_logging, get_logger

logger = get_logger(__name__)

_settings = get_settings()


async def startup(ctx: dict[str, Any]) -> None:
    configure_logging(_settings)
    ctx["app_state"] = await build_app_state(_settings)
    logger.info("worker_started")


async def shutdown(ctx: dict[str, Any]) -> None:
    await close_app_state(ctx["app_state"])
    logger.info("worker_stopped")


async def analyze_document_task(
    ctx: dict[str, Any],
    *,
    job_id: str,
    document_id: str,
    s3_key: str,
    filename: str,
    profile_json: str,
    category: str | None = None,
) -> None:
    state: AppState = ctx["app_state"]
    await state.jobs.mark_processing(job_id)
    try:
        document_bytes = await state.object_store.download_bytes(s3_key)
        profile = RiskProfile.model_validate_json(profile_json)
        report = await run_analysis(
            state=state,
            document_id=document_id,
            document_bytes=document_bytes,
            filename=filename,
            profile=profile,
            category=category,
        )
        await state.jobs.mark_complete(job_id, report)
    except Exception as exc:
        logger.exception("analyze_job_failed", job_id=job_id, document_id=document_id)
        await state.jobs.mark_failed(job_id, str(exc))


async def cleanup_expired_document_chunks(ctx: dict[str, Any]) -> None:
    state: AppState = ctx["app_state"]
    await state.vector_store.delete_expired_document_chunks()
    logger.debug("expired_document_chunks_cleanup_ran")


class WorkerSettings:
    functions = [analyze_document_task]
    cron_jobs = [cron(cleanup_expired_document_chunks, minute=set(range(0, 60, 15)))]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(_settings.redis_url)
    max_jobs = 5
    job_timeout = 180
    keep_result = 0  # job results live in JobStore (Redis), not ARQ's own result cache
