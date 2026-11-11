"""Heavy contract analysis: enqueued onto the ARQ job queue since it takes 10-30s.

The NestJS gateway calls this with the already-authenticated user's file upload and
risk profile; this service never talks to end users directly.
"""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from legal_ai.api.deps import enforce_user_rate_limit, get_state, get_user_id, verify_internal_token
from legal_ai.llm.schemas import AnalyzeJobResult, RiskProfile
from legal_ai.state import AppState
from legal_ai.utils.ids import new_id
from legal_ai.utils.logging import get_logger

router = APIRouter(
    prefix="/v1",
    tags=["analyze"],
    dependencies=[Depends(verify_internal_token), Depends(enforce_user_rate_limit)],
)
logger = get_logger(__name__)

_MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25MB
_ALLOWED_CONTENT_TYPES = {"application/pdf"}


@router.post("/analyze", status_code=status.HTTP_202_ACCEPTED)
async def analyze_document(
    file: UploadFile = File(...),
    profile: str = Form(default="{}"),
    category: str | None = Form(default=None),
    user_id: str = Depends(get_user_id),
    state: AppState = Depends(get_state),
) -> dict[str, str]:
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported content type '{file.content_type}'. Only application/pdf is accepted.",
        )

    content = await file.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds max size of {_MAX_UPLOAD_BYTES // (1024 * 1024)}MB.",
        )

    try:
        risk_profile = RiskProfile.model_validate_json(profile)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid profile JSON: {exc}") from exc

    document_id = new_id("doc")
    job_id = new_id("job")
    s3_key = f"documents/{document_id}/{file.filename}"

    await state.object_store.upload_bytes(s3_key, content, content_type=file.content_type)
    await state.jobs.create(job_id, document_id)

    await state.arq_pool.enqueue_job(
        "analyze_document_task",
        job_id=job_id,
        document_id=document_id,
        s3_key=s3_key,
        filename=file.filename or "document.pdf",
        profile_json=risk_profile.model_dump_json(),
        category=category,
    )

    logger.info("analyze_job_enqueued", job_id=job_id, document_id=document_id, user_id=user_id)
    return {"job_id": job_id, "document_id": document_id, "status": "queued"}


@router.get("/jobs/{job_id}", response_model=AnalyzeJobResult)
async def get_job(job_id: str, state: AppState = Depends(get_state)) -> AnalyzeJobResult:
    result = await state.jobs.get(job_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found or expired")
    return result
