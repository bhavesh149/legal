"""Shared FastAPI dependencies: app-state access, internal auth, and per-user rate limiting.

Trust model: this service sits behind the NestJS gateway, never directly exposed to
end users. The gateway authenticates the end user and forwards a shared internal
bearer token plus the authenticated user's ID (`X-User-Id`) on every request. This
service does not implement its own user auth/session logic -- that stays in Node.
"""

from fastapi import Depends, Header, HTTPException, Request, status

from legal_ai.state import AppState
from legal_ai.storage.ratelimit import RateLimitExceeded


def get_state(request: Request) -> AppState:
    return request.app.state.app_state


async def verify_internal_token(
    request: Request,
    authorization: str = Header(default=""),
) -> None:
    state: AppState = request.app.state.app_state
    expected = f"Bearer {state.settings.api_internal_token}"
    if not authorization or authorization != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing internal token")


async def get_user_id(x_user_id: str = Header(alias="X-User-Id")) -> str:
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing X-User-Id header")
    return x_user_id


async def enforce_user_rate_limit(
    request: Request,
    user_id: str = Depends(get_user_id),
) -> None:
    state: AppState = request.app.state.app_state
    try:
        await state.user_rate_limiter.check(
            user_id, limit=state.settings.user_rate_limit_per_minute, window_seconds=60
        )
    except RateLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded, please slow down.",
            headers={"Retry-After": str(int(exc.retry_after_seconds))},
        ) from exc
