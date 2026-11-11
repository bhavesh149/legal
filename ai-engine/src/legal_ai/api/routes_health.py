from fastapi import APIRouter, Depends

from legal_ai.api.deps import get_state
from legal_ai.state import AppState

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/readyz")
async def readyz(state: AppState = Depends(get_state)) -> dict[str, str]:
    checks = {}
    try:
        await state.redis.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {exc}"

    try:
        await state.vector_store.client.get_collections()
        checks["qdrant"] = "ok"
    except Exception as exc:
        checks["qdrant"] = f"error: {exc}"

    return checks
