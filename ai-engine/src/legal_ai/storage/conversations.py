"""Redis-backed conversation history for the chat layer.

MVP scope: one conversation thread per document (`document_id` doubles as the
conversation key), matching `POST /v1/documents/{document_id}/messages`. Memory is
bounded via a sliding window: the last `conversation_max_turns_verbatim` turns are
kept in full, older turns are collapsed into a rolling text summary by the chat
orchestrator (see pipeline/chat.py) so long threads don't blow the LLM's context
budget or Groq's per-minute token limits.
"""

from pydantic import BaseModel

from legal_ai.config import Settings
from legal_ai.llm.schemas import ChatTurn


class ConversationState(BaseModel):
    turns: list[ChatTurn] = []
    summary: str | None = None


class ConversationStore:
    def __init__(self, redis, settings: Settings):
        self._redis = redis
        self._settings = settings

    def _key(self, document_id: str) -> str:
        return f"conversation:{document_id}"

    async def get(self, document_id: str) -> ConversationState:
        raw = await self._redis.get(self._key(document_id))
        if raw is None:
            return ConversationState()
        return ConversationState.model_validate_json(raw)

    async def append_turn(self, document_id: str, turn: ChatTurn) -> ConversationState:
        state = await self.get(document_id)
        state.turns.append(turn)
        await self._save(document_id, state)
        return state

    async def collapse_older_turns(self, document_id: str, *, summary: str, keep_last: int) -> None:
        """Replace all but the last `keep_last` turns with an updated rolling summary."""
        state = await self.get(document_id)
        state.summary = summary
        state.turns = state.turns[-keep_last:]
        await self._save(document_id, state)

    async def clear(self, document_id: str) -> None:
        await self._redis.delete(self._key(document_id))

    async def _save(self, document_id: str, state: ConversationState) -> None:
        await self._redis.set(
            self._key(document_id),
            state.model_dump_json(),
            ex=self._settings.conversation_ttl_seconds,
        )
