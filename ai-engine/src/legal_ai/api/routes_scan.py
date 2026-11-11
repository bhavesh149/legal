"""Free 'Risk Scanner' PLG flow: fast, cheap, score-only teaser (see PROJECT.md GTM
strategy). Deliberately synchronous (not queued) since it skips retrieval/chunking
and uses the small/fast model on a truncated excerpt -- it's meant to feel instant.
The file is parsed in-memory and never persisted, since this path is unauthenticated
free-tier and shouldn't carry the same storage/retention obligations as a paid analysis.
"""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from legal_ai.api.deps import enforce_user_rate_limit, get_state, verify_internal_token
from legal_ai.llm.schemas import SafetyScoreOnly
from legal_ai.pipeline.parsing import UnsupportedDocumentError, parse_pdf_bytes
from legal_ai.state import AppState
from legal_ai.utils.logging import get_logger

router = APIRouter(
    prefix="/v1",
    tags=["scan"],
    dependencies=[Depends(verify_internal_token), Depends(enforce_user_rate_limit)],
)
logger = get_logger(__name__)

_MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@router.post("/scan", response_model=SafetyScoreOnly)
async def quick_scan(
    file: UploadFile = File(...),
    state: AppState = Depends(get_state),
) -> SafetyScoreOnly:
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only application/pdf is accepted.",
        )

    content = await file.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large.")

    try:
        parsed = await parse_pdf_bytes(content, filename=file.filename or "scan.pdf", settings=state.settings)
    except UnsupportedDocumentError as exc:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail=str(exc)) from exc

    if not parsed.markdown.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract readable text from this document.",
        )

    result = await state.groq.generate_quick_scan(document_markdown=parsed.markdown)
    logger.info("quick_scan_complete", safety_score=result.safety_score)
    return result
