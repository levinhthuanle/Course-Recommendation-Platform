"""Course data models and schemas for request/response validation."""

from typing import List, Optional

from pydantic import BaseModel, Field


class CourseDocument(BaseModel):
    """Meilisearch document schema for course data."""

    id: str = Field(..., description="Unique identifier for the course (hash)")
    course_code: str = Field(..., description="Course code (e.g., CS101)")
    title: str = Field(..., description="Course title")
    course_name_en: Optional[str] = Field(None, description="Course name in English")
    course_name_vi: Optional[str] = Field(None, description="Course name in Vietnamese")
    credit_points: Optional[str] = Field(None, description="Credit points")
    prior_courses: Optional[str] = Field(None, description="Prior courses or prerequisites")
    course_description: Optional[str] = Field(None, description="Course description")
    course_goals: Optional[List[str]] = Field(None, description="Course goals/outcomes list")
    content: str = Field(..., description="Full course content for full-text search")
    summary: str = Field(..., description="Short course description for display")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "a1b2c3d4e5f6",
                "course_code": "CS301",
                "title": "Web Backend Development",
                "content": "This course covers modern web backend development using Python and FastAPI...",
                "summary": "Learn to build scalable web backends with Python, FastAPI, and databases.",
            }
        }


class CourseResponse(BaseModel):
    """Response model for course search results."""

    id: str
    course_code: str
    title: str
    summary: str
    score: Optional[float] = Field(None, description="Search relevance score")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "a1b2c3d4e5f6",
                "course_code": "CS301",
                "title": "Web Backend Development",
                "summary": "Learn to build scalable web backends with Python, FastAPI, and databases.",
                "score": 0.95,
            }
        }


class CourseDetailResponse(BaseModel):
    """Response model for full course details."""

    id: str
    course_code: str
    title: str
    summary: str
    content: str = Field(..., description="Full course content")
    course_name_en: Optional[str] = None
    course_name_vi: Optional[str] = None
    credit_points: Optional[str] = None
    prior_courses: Optional[str] = None
    course_description: Optional[str] = None
    course_goals: Optional[List[str]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "a1b2c3d4e5f6",
                "course_code": "CS301",
                "title": "Web Backend Development",
                "summary": "Learn to build scalable web backends with Python, FastAPI, and databases.",
                "content": "Full course description and syllabus content...",
            }
        }


class SearchRequest(BaseModel):
    """Request model for search queries."""

    query: str = Field(..., min_length=1, description="Search query")
    limit: Optional[int] = Field(20, ge=1, le=100, description="Number of results to return")
    offset: Optional[int] = Field(0, ge=0, description="Offset for pagination")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "web backend development",
                "limit": 20,
                "offset": 0,
            }
        }


class SearchResponse(BaseModel):
    """Response model for search results."""

    query: str = Field(..., description="Original search query")
    hits: List[CourseResponse] = Field(default_factory=list, description="Search results")
    total: int = Field(..., description="Total number of results")
    limit: int = Field(..., description="Results limit")
    offset: int = Field(..., description="Results offset")
    processing_time_ms: int = Field(..., description="Search processing time in milliseconds")

    class Config:
        json_schema_extra = {
            "example": {
                "query": "web backend development",
                "hits": [
                    {
                        "id": "a1b2c3d4e5f6",
                        "course_code": "CS301",
                        "title": "Web Backend Development",
                        "summary": "Learn to build scalable web backends.",
                        "score": 0.95,
                    }
                ],
                "total": 1,
                "limit": 20,
                "offset": 0,
                "processing_time_ms": 12,
            }
        }


class IngestionStatus(BaseModel):
    """Response model for data ingestion status."""

    status: str = Field(..., description="Ingestion status")
    message: str = Field(..., description="Status message")
    total_files: int = Field(..., description="Total PDF files found")
    processed_files: int = Field(..., description="Number of files processed")
    indexed_documents: int = Field(..., description="Number of documents indexed")
    failed_files: List[str] = Field(default_factory=list, description="List of failed files")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "message": "Data ingestion completed successfully",
                "total_files": 10,
                "processed_files": 10,
                "indexed_documents": 10,
                "failed_files": [],
            }
        }


class HealthResponse(BaseModel):
    """Response model for health check."""

    status: str = Field(..., description="Service status")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    meilisearch_status: str = Field(..., description="Meilisearch connection status")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "app_name": "Course Recommendation Platform",
                "version": "1.0.0",
                "meilisearch_status": "connected",
            }
        }
