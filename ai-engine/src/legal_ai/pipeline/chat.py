"""Conversational Q&A orchestrator: the follow-up chat that happens after a document
has been analyzed (see plan "Conversational Q&A layer").

Flow per turn: condense follow-up -> dual retrieval (the user's own document +
the market-standard corpus) -> stream a grounded, cited answer -> persist turn ->
collapse older history into a rolling summary once the thread gets long.
"""

import json
import re
from collections.abc import AsyncIterator
from typing import Any

import structlog

from legal_ai.llm.schemas import ChatTurn, Citation, RetrievedChunk
from legal_ai.state import AppState

logger = structlog.get_logger(__name__)

# Primary format we prompt for is `[[chunk:ID]]`, but weaker models occasionally drift
# to close variants (`[[chunk_id=ID]]`, `[[chunk_id:ID]]`, `[[chunk=ID]]`) -- accept those
# too rather than silently dropping a citation the model clearly intended to make.
_CITATION_MARKER_RE = re.compile(r"\[\[chunk(?:_id)?[:=]([A-Za-z0-9\-]+)\]\]")
_SAFE_REFUSAL = (
    "I can't process that message as written -- it looks like it may be trying to override "
    "my instructions rather than ask a genuine question about your contract. Please rephrase "
    "your question."
)


def _extract_citations(
    answer_text: str, doc_chunks: list[RetrievedChunk], standard_chunks: list[RetrievedChunk]
) -> tuple[str, list[Citation]]:
    by_id = {c.chunk_id: c for c in (*doc_chunks, *standard_chunks)}
    citations: list[Citation] = []
    seen: set[str] = set()

    for match in _CITATION_MARKER_RE.finditer(answer_text):
        chunk_id = match.group(1)
        if chunk_id in seen:
            continue
        chunk = by_id.get(chunk_id)
        if chunk is None:
            continue  # model hallucinated an id we never gave it; drop silently
        seen.add(chunk_id)
        citations.append(
            Citation(
                chunk_id=chunk.chunk_id,
                source=chunk.source,
                span=chunk.span,
                excerpt=chunk.text[:280],
            )
        )

    # Strip the raw markers from the user-visible text; citations are returned as structured data.
    clean_text = _CITATION_MARKER_RE.sub("", answer_text).strip()
    return clean_text, citations


async def stream_chat_turn(
    *, state: AppState, document_id: str, question: str
) -> AsyncIterator[dict[str, Any]]:
    """Yields SSE-ready event dicts: {"event": "token", "data": str}, then a final
    {"event": "citations", "data": [...]} and {"event": "done", "data": ""}.
    """
    if await state.groq.check_prompt_injection(question):
        logger.warning("chat_prompt_injection_flagged", document_id=document_id)
        await state.conversations.append_turn(document_id, ChatTurn(role="user", content=question))
        await state.conversations.append_turn(document_id, ChatTurn(role="assistant", content=_SAFE_REFUSAL))
        yield {"event": "token", "data": _SAFE_REFUSAL}
        yield {"event": "citations", "data": "[]"}
        yield {"event": "done", "data": ""}
        return

    conversation = await state.conversations.get(document_id)
    standalone_query = await state.groq.condense_query(question, conversation.turns)

    doc_chunks = await state.retriever.retrieve_document_chunks(document_id, standalone_query, top_k=5)
    standard_chunks = await state.retriever.retrieve_standard_clauses(standalone_query, top_k=5)

    await state.conversations.append_turn(document_id, ChatTurn(role="user", content=question))

    accumulated: list[str] = []
    async for delta in state.groq.stream_chat_answer(
        question=question,
        doc_chunks=doc_chunks,
        standard_chunks=standard_chunks,
        history_turns=conversation.turns,
        history_summary=conversation.summary,
    ):
        accumulated.append(delta)
        yield {"event": "token", "data": delta}

    full_answer = "".join(accumulated)
    clean_text, citations = _extract_citations(full_answer, doc_chunks, standard_chunks)

    await state.conversations.append_turn(
        document_id, ChatTurn(role="assistant", content=clean_text, citations=citations)
    )

    yield {"event": "citations", "data": json.dumps([c.model_dump(mode="json") for c in citations])}
    yield {"event": "done", "data": ""}

    await _maybe_collapse_history(state, document_id)


async def _maybe_collapse_history(state: AppState, document_id: str) -> None:
    settings = state.settings
    keep_last = settings.conversation_max_turns_verbatim
    conversation = await state.conversations.get(document_id)

    # Collapse once we have more than 2x the verbatim window, so we're not
    # re-summarizing on almost every turn.
    if len(conversation.turns) <= keep_last * 2:
        return

    to_collapse = conversation.turns[:-keep_last]
    new_summary = await state.groq.summarize_history(conversation.summary, to_collapse)
    await state.conversations.collapse_older_turns(document_id, summary=new_summary, keep_last=keep_last)
    logger.info("conversation_history_collapsed", document_id=document_id, collapsed_turns=len(to_collapse))
