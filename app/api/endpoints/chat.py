"""Chat API endpoint for course Q&A and per-user chat history."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.core.config import Settings, get_settings
from app.models.chat import (
    ChatMessagePayload,
    ChatRequest,
    ChatResponse,
    ChatStatusResponse,
    ChatThreadCreate,
    ChatThreadDetail,
    ChatThreadSummary,
)
from app.models.user import UserPublic
from app.services.analytics_service import AnalyticsService
from app.services.chat_history_service import ChatHistoryService
from app.services.chat_service import ChatService
from app.services.search_service import SearchService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["chat"])


def get_search_service(settings: Settings = Depends(get_settings)) -> SearchService:
    """Get search service instance."""
    service = SearchService(settings)
    service.connect()
    service.get_or_create_index()
    return service


def get_chat_service(
    settings: Settings = Depends(get_settings),
    search_service: SearchService = Depends(get_search_service),
) -> ChatService:
    """Get chat service instance."""
    return ChatService(settings, search_service)


def get_chat_history_service(settings: Settings = Depends(get_settings)) -> ChatHistoryService:
    """Get persistent chat history service instance."""
    return ChatHistoryService(settings)


def get_analytics_service(settings: Settings = Depends(get_settings)) -> AnalyticsService:
    return AnalyticsService(settings)


@router.get("/chat/status", response_model=ChatStatusResponse, summary="Chat service status")
async def chat_status(
    settings: Settings = Depends(get_settings),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: UserPublic = Depends(get_current_user),
) -> ChatStatusResponse:
    return ChatStatusResponse(
        available=chat_service.is_available(),
        model=settings.gemini_model if chat_service.is_available() else "none",
    )


@router.get("/chat/threads", response_model=list[ChatThreadSummary], summary="List my chat threads")
async def list_chat_threads(
    current_user: UserPublic = Depends(get_current_user),
    history_service: ChatHistoryService = Depends(get_chat_history_service),
) -> list[ChatThreadSummary]:
    threads = history_service.list_threads(current_user.id)
    return [ChatThreadSummary(**thread) for thread in threads]


@router.post("/chat/threads", response_model=ChatThreadSummary, summary="Create a new chat thread")
async def create_chat_thread(
    payload: ChatThreadCreate,
    current_user: UserPublic = Depends(get_current_user),
    history_service: ChatHistoryService = Depends(get_chat_history_service),
) -> ChatThreadSummary:
    thread = history_service.create_thread(current_user.id, payload.title)
    return ChatThreadSummary(**thread)


@router.get("/chat/threads/{thread_id}", response_model=ChatThreadDetail, summary="Get a chat thread")
async def get_chat_thread(
    thread_id: str,
    current_user: UserPublic = Depends(get_current_user),
    history_service: ChatHistoryService = Depends(get_chat_history_service),
) -> ChatThreadDetail:
    thread = history_service.get_thread(current_user.id, thread_id)
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat thread not found")

    messages = history_service.get_messages(current_user.id, thread_id)
    return ChatThreadDetail(
        **thread,
        messages=[ChatMessagePayload(role=msg["role"], content=msg["content"]) for msg in messages],
    )


@router.delete("/chat/threads/{thread_id}", summary="Delete a chat thread")
async def delete_chat_thread(
    thread_id: str,
    current_user: UserPublic = Depends(get_current_user),
    history_service: ChatHistoryService = Depends(get_chat_history_service),
) -> dict:
    deleted = history_service.delete_thread(current_user.id, thread_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat thread not found")
    return {"message": "Chat thread deleted", "thread_id": thread_id}


@router.post("/chat", response_model=ChatResponse, summary="Chat with AI assistant")
async def chat(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
    current_user: UserPublic = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
    history_service: ChatHistoryService = Depends(get_chat_history_service),
) -> ChatResponse:
    if not chat_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat service is not available. Please check Gemini API key configuration.",
        )

    try:
        analytics_service.log_query("chat", request.message)

        thread = history_service.ensure_thread(current_user.id, request.thread_id, request.message)

        existing_messages = history_service.get_messages(current_user.id, thread["id"])
        if request.history and not existing_messages:
            for msg in request.history:
                history_service.add_message(current_user.id, thread["id"], msg.role, msg.content)
            existing_messages = history_service.get_messages(current_user.id, thread["id"])

        chat_history = [
            {"role": msg["role"], "content": msg["content"]}
            for msg in existing_messages
        ]

        history_service.add_message(current_user.id, thread["id"], "user", request.message)

        response_text = await chat_service.chat(
            message=request.message,
            chat_history=chat_history,
        )

        history_service.add_message(current_user.id, thread["id"], "assistant", response_text)

        return ChatResponse(
            message=response_text,
            success=True,
            thread_id=thread["id"],
            thread_title=thread["title"],
        )

    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat message: {str(e)}",
        )
