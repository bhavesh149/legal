import pytest
from fakeredis import FakeAsyncRedis

from legal_ai.config import Settings
from legal_ai.llm.schemas import ChatTurn, JobStatus, RiskReport
from legal_ai.storage.conversations import ConversationStore
from legal_ai.storage.jobs import JobStore


@pytest.fixture
async def redis():
    client = FakeAsyncRedis()
    yield client
    await client.aclose()


@pytest.fixture
def settings() -> Settings:
    return Settings(_env_file=None, conversation_max_turns_verbatim=2)


async def test_job_lifecycle(redis, settings):
    store = JobStore(redis, settings)
    await store.create("job-1", "doc-1")

    result = await store.get("job-1")
    assert result is not None
    assert result.status == JobStatus.QUEUED

    await store.mark_processing("job-1")
    assert (await store.get("job-1")).status == JobStatus.PROCESSING

    report = RiskReport(safety_score=80, summary="Looks mostly fine.")
    await store.mark_complete("job-1", report)
    completed = await store.get("job-1")
    assert completed.status == JobStatus.COMPLETE
    assert completed.report.safety_score == 80


async def test_job_failure_is_recorded(redis, settings):
    store = JobStore(redis, settings)
    await store.create("job-2", "doc-2")
    await store.mark_failed("job-2", "parsing exploded")
    result = await store.get("job-2")
    assert result.status == JobStatus.FAILED
    assert result.error == "parsing exploded"


async def test_unknown_job_returns_none(redis, settings):
    store = JobStore(redis, settings)
    assert await store.get("does-not-exist") is None


async def test_conversation_append_and_get(redis, settings):
    store = ConversationStore(redis, settings)
    await store.append_turn("doc-1", ChatTurn(role="user", content="What does clause 4 mean?"))
    await store.append_turn("doc-1", ChatTurn(role="assistant", content="It means X."))

    state = await store.get("doc-1")
    assert [t.content for t in state.turns] == ["What does clause 4 mean?", "It means X."]


async def test_conversation_collapse_keeps_only_last_n_turns(redis, settings):
    store = ConversationStore(redis, settings)
    for i in range(5):
        await store.append_turn("doc-1", ChatTurn(role="user", content=f"message {i}"))

    await store.collapse_older_turns("doc-1", summary="user asked 3 things", keep_last=2)
    state = await store.get("doc-1")
    assert state.summary == "user asked 3 things"
    assert [t.content for t in state.turns] == ["message 3", "message 4"]


async def test_conversation_clear(redis, settings):
    store = ConversationStore(redis, settings)
    await store.append_turn("doc-1", ChatTurn(role="user", content="hi"))
    await store.clear("doc-1")
    state = await store.get("doc-1")
    assert state.turns == []
