"""FastAPI app factory.

Owns the process lifecycle for shared singleton clients (Redis, Qdrant, Groq, S3,
ARQ pool) via the lifespan context manager -- built once at startup, reused across
all concurrent requests, torn down cleanly at shutdown.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from legal_ai.api import routes_analyze, routes_chat, routes_health, routes_scan
from legal_ai.config import get_settings
from legal_ai.state import build_app_state, close_app_state
from legal_ai.storage.ratelimit import RateLimitExceeded
from legal_ai.utils.logging import configure_logging

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings)
    logger.info("starting_ai_engine", environment=settings.environment)

    app.state.app_state = await build_app_state(settings)
    try:
        yield
    finally:
        await close_app_state(app.state.app_state)
        logger.info("ai_engine_stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Private Legal Agent -- AI Engine",
        description="Isolated Python microservice: document parsing, RAG-grounded contract "
        "risk analysis, and conversational Q&A.",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.include_router(routes_health.router)
    app.include_router(routes_analyze.router)
    app.include_router(routes_scan.router)
    app.include_router(routes_chat.router)

    @app.exception_handler(RateLimitExceeded)
    async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded"},
            headers={"Retry-After": str(int(exc.retry_after_seconds))},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        # Never leak internal stack traces/messages to clients; full detail goes to logs only.
        logger.exception("unhandled_exception", path=request.url.path, method=request.method)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error. Please try again or contact support."},
        )

    return app


app = create_app()
