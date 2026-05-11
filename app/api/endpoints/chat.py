"""Chat API endpoint for course Q&A."""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.config import Settings, get_settings
from app.models.user import UserPublic
from app.services.analytics_service import AnalyticsService
from app.services.chat_service import ChatService
from app.services.search_service import SearchService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["chat"])


# Request/Response models
class ChatMessage(BaseModel):
    """A single chat message."""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat request body."""
    message: str = Field(..., min_length=1, max_length=2000, description="User's message")
    history: Optional[List[ChatMessage]] = Field(
        default=None, 
        description="Previous messages in the conversation"
    )


class ChatResponse(BaseModel):
    """Chat response body."""
    message: str = Field(..., description="AI assistant's response")
    success: bool = Field(default=True, description="Whether the request was successful")


class ChatStatusResponse(BaseModel):
    """Chat service status response."""
    available: bool = Field(..., description="Whether chat service is available")
    model: str = Field(..., description="AI model being used")


# Dependency injection
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


def get_analytics_service(settings: Settings = Depends(get_settings)) -> AnalyticsService:
    return AnalyticsService(settings)


@router.get("/chat/status", response_model=ChatStatusResponse, summary="Chat service status")
async def chat_status(
    settings: Settings = Depends(get_settings),
    chat_service: ChatService = Depends(get_chat_service),
    current_user: UserPublic = Depends(get_current_user),
) -> ChatStatusResponse:
    """
    Check if chat service is available and properly configured.

    Returns:
        ChatStatusResponse with availability status
    """
    return ChatStatusResponse(
        available=chat_service.is_available(),
        model=settings.gemini_model if chat_service.is_available() else "none"
    )


@router.post("/chat", response_model=ChatResponse, summary="Chat with AI assistant")
async def chat(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
    current_user: UserPublic = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
) -> ChatResponse:
    """
    Send a message to the AI assistant and get a response.

    The assistant uses RAG (Retrieval-Augmented Generation) to:
    1. Search for relevant courses based on the user's question
    2. Use that context to generate an informed response

    Args:
        request: Chat request with message and optional history

    Returns:
        ChatResponse with AI-generated answer

    Raises:
        HTTPException: If chat service is unavailable or fails
    """
    if not chat_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat service is not available. Please check Gemini API key configuration."
        )

    try:
        analytics_service.log_query("chat", request.message)

        # Convert history to dict format
        history = None
        if request.history:
            history = [{"role": msg.role, "content": msg.content} for msg in request.history]

        # Get AI response
        response_text = await chat_service.chat(
            message=request.message,
            chat_history=history
        )

        return ChatResponse(message=response_text, success=True)

    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat message: {str(e)}"
        )
