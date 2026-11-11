import pytest
from fakeredis import FakeAsyncRedis

from legal_ai.storage.ratelimit import FixedWindowRateLimiter, RateLimitExceeded


@pytest.fixture
async def redis():
    client = FakeAsyncRedis()
    yield client
    await client.aclose()


async def test_allows_calls_under_the_limit(redis):
    limiter = FixedWindowRateLimiter(redis)
    for _ in range(5):
        await limiter.check("user-1", limit=5, window_seconds=60)


async def test_raises_once_limit_exceeded(redis):
    limiter = FixedWindowRateLimiter(redis)
    for _ in range(3):
        await limiter.check("user-1", limit=3, window_seconds=60)
    with pytest.raises(RateLimitExceeded):
        await limiter.check("user-1", limit=3, window_seconds=60)


async def test_different_keys_have_independent_budgets(redis):
    limiter = FixedWindowRateLimiter(redis)
    for _ in range(3):
        await limiter.check("user-1", limit=3, window_seconds=60)
    # user-2 should be unaffected by user-1's usage
    await limiter.check("user-2", limit=3, window_seconds=60)


async def test_remaining_reflects_usage(redis):
    limiter = FixedWindowRateLimiter(redis)
    assert await limiter.remaining("user-1", limit=5, window_seconds=60) == 5
    await limiter.check("user-1", limit=5, window_seconds=60)
    assert await limiter.remaining("user-1", limit=5, window_seconds=60) == 4
