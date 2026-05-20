"""Chat history schemas for per-user conversations."""

from typing import List, Optional

from pydantic import BaseModel, Field


class ChatMessagePayload(BaseModel):
    """A single chat message in a thread."""

    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat request body."""

    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    thread_id: Optional[str] = Field(default=None, description="Existing conversation thread id")
    history: Optional[List[ChatMessagePayload]] = Field(
        default=None,
        description="Backward-compatible client-provided conversation history",
    )


class ChatResponse(BaseModel):
    """Chat response body."""

    message: str = Field(..., description="AI assistant response")
    success: bool = Field(default=True, description="Whether the request was successful")
    thread_id: Optional[str] = Field(default=None, description="Conversation thread id")
    thread_title: Optional[str] = Field(default=None, description="Conversation title")


class ChatThreadSummary(BaseModel):
    """Summary info for a conversation thread."""

    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0


class ChatThreadDetail(ChatThreadSummary):
    """Thread details including messages."""

    messages: List[ChatMessagePayload] = Field(default_factory=list)


class ChatThreadCreate(BaseModel):
    """Create-thread payload."""

    title: Optional[str] = Field(default=None, max_length=120)


class ChatStatusResponse(BaseModel):
    """Chat service status response."""

    available: bool = Field(..., description="Whether chat service is available")
    model: str = Field(..., description="AI model being used")
