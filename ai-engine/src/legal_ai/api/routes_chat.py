"""Conversational follow-up Q&A, scoped to a previously analyzed document.

Streamed via Server-Sent Events so multi-turn chat feels responsive despite each
Groq call taking 1-3s -- see plan "Conversational Q&A layer".
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from legal_ai.api.deps import enforce_user_rate_limit, get_state, verify_internal_token
from legal_ai.llm.schemas import ChatTurn
from legal_ai.pipeline.chat import stream_chat_turn
from legal_ai.state import AppState
from legal_ai.utils.logging import get_logger

router = APIRouter(
    prefix="/v1/documents",
    tags=["chat"],
    dependencies=[Depends(verify_internal_token), Depends(enforce_user_rate_limit)],
)
logger = get_logger(__name__)


class ChatMessageRequest(BaseModel):
    question: str


@router.post("/{document_id}/messages")
async def post_message(
    document_id: str,
    body: ChatMessageRequest,
    state: AppState = Depends(get_state),
) -> EventSourceResponse:
    logger.info("chat_turn_started", document_id=document_id)
    event_generator = stream_chat_turn(state=state, document_id=document_id, question=body.question)
    return EventSourceResponse(event_generator)


@router.get("/{document_id}/messages", response_model=list[ChatTurn])
async def get_messages(document_id: str, state: AppState = Depends(get_state)) -> list[ChatTurn]:
    conversation = await state.conversations.get(document_id)
    return conversation.turns


@router.delete("/{document_id}/messages", status_code=204)
async def clear_messages(document_id: str, state: AppState = Depends(get_state)) -> None:
    await state.conversations.clear(document_id)
