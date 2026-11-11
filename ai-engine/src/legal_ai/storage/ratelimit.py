"""Redis-backed fixed-window rate limiter.

Reused for two purposes:
1. Per-user API-edge rate limiting (protects the service from one chatty client).
2. Proactive client-side gating of Groq calls per model, so we self-throttle to stay
   under Groq's published RPM/TPM ceilings instead of discovering the limit via 429s.

A fixed window is intentionally simple (vs. a sliding-log/token-bucket) -- it is precise
enough at this scale and keeps a single Redis round-trip per check.
"""

import time

from redis.asyncio import Redis


class RateLimitExceeded(Exception):
    def __init__(self, retry_after_seconds: float):
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Rate limit exceeded, retry after {retry_after_seconds:.1f}s")


class FixedWindowRateLimiter:
    def __init__(self, redis: Redis, *, prefix: str = "ratelimit"):
        self._redis = redis
        self._prefix = prefix

    async def check(self, key: str, *, limit: int, window_seconds: int = 60) -> None:
        """Raise RateLimitExceeded if `key` has exceeded `limit` calls in the current window."""
        now = int(time.time())
        window = now // window_seconds
        redis_key = f"{self._prefix}:{key}:{window}"

        count = await self._redis.incr(redis_key)
        if count == 1:
            await self._redis.expire(redis_key, window_seconds)

        if count > limit:
            ttl = await self._redis.ttl(redis_key)
            raise RateLimitExceeded(retry_after_seconds=max(ttl, 1))

    async def remaining(self, key: str, *, limit: int, window_seconds: int = 60) -> int:
        now = int(time.time())
        window = now // window_seconds
        redis_key = f"{self._prefix}:{key}:{window}"
        count = await self._redis.get(redis_key)
        return max(limit - int(count or 0), 0)
