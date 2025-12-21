"""Course search and ingestion API endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from meilisearch.errors import MeilisearchApiError, MeilisearchCommunicationError

from app.core.config import Settings, get_settings
from app.models.course import CourseDetailResponse, HealthResponse, IngestionStatus, SearchResponse
from app.services.ingest_service import IngestionService
from app.services.search_service import SearchService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["courses"])


# Dependency injection for services
def get_search_service(settings: Settings = Depends(get_settings)) -> SearchService:
    """Get search service instance."""
    service = SearchService(settings)
    service.connect()
    service.get_or_create_index()
    return service


def get_ingestion_service(
    settings: Settings = Depends(get_settings),
    search_service: SearchService = Depends(get_search_service),
) -> IngestionService:
    """Get ingestion service instance."""
    return IngestionService(settings, search_service)


@router.get("/health", response_model=HealthResponse, summary="Health check")
async def health_check(
    settings: Settings = Depends(get_settings),
    search_service: SearchService = Depends(get_search_service),
) -> HealthResponse:
    """
    Check the health status of the application and its dependencies.

    Returns:
        HealthResponse with service status information
    """
    meilisearch_status = "connected" if search_service.check_connection() else "disconnected"

    return HealthResponse(
        status="healthy" if meilisearch_status == "connected" else "degraded",
        app_name=settings.app_name,
        version=settings.app_version,
        meilisearch_status=meilisearch_status,
    )


@router.get("/search", response_model=SearchResponse, summary="Search for courses")
async def search_courses(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: Optional[int] = Query(
        None, ge=1, le=100, description="Number of results to return"
    ),
    offset: Optional[int] = Query(0, ge=0, description="Number of results to skip"),
    course_code: Optional[str] = Query(None, description="Filter by course code"),
    semantic_ratio: Optional[float] = Query(
        0.5, ge=0.0, le=1.0, description="Hybrid search semantic ratio (0.0 = keyword only, 1.0 = semantic only)"
    ),
    settings: Settings = Depends(get_settings),
    search_service: SearchService = Depends(get_search_service),
) -> SearchResponse:
    """
    Search for courses based on a query string.

    Args:
        q: Search query (e.g., "web backend development")
        limit: Maximum number of results (default from settings)
        offset: Pagination offset (default: 0)
        course_code: Optional filter by course code
        semantic_ratio: Balance between keyword (0.0) and semantic (1.0) search (default: 0.5)
        settings: Application settings
        search_service: Search service instance

    Returns:
        SearchResponse with matching courses

    Raises:
        HTTPException: If search fails
    """
    try:
        # Use default limit from settings if not provided
        if limit is None:
            limit = settings.search_limit

        # Build filter string if course_code is provided
        filters = None
        if course_code:
            filters = f'course_code = "{course_code}"'

        logger.info(f"Searching for: '{q}' (limit={limit}, offset={offset}, semantic_ratio={semantic_ratio})")

        # Only use hybrid search if embedder is configured
        # For now, default to keyword search until embedder is confirmed working
        results = search_service.search(
            query=q,
            limit=limit,
            offset=offset,
            filters=filters,
            hybrid_search=False,  # Temporarily disabled until embedder is confirmed
            semantic_ratio=semantic_ratio,
        )

        return results

    except MeilisearchApiError as e:
        logger.error(f"Meilisearch API error during search: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        )
    except MeilisearchCommunicationError as e:
        logger.error(f"Meilisearch communication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Search service unavailable",
        )
    except Exception as e:
        logger.error(f"Unexpected error during search: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@router.get("/courses/{course_id}", response_model=CourseDetailResponse, summary="Get course details")
async def get_course_detail(
    course_id: str,
    search_service: SearchService = Depends(get_search_service),
) -> CourseDetailResponse:
    """
    Get full details of a specific course by ID.

    Args:
        course_id: The unique course document ID
        search_service: Search service instance

    Returns:
        CourseDetailResponse with full course information

    Raises:
        HTTPException: If course not found or retrieval fails
    """
    try:
        document = search_service.get_document_by_id(course_id)
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID '{course_id}' not found",
            )
        
        return CourseDetailResponse(
            id=document.get("id", ""),
            course_code=document.get("course_code", ""),
            title=document.get("title", ""),
            summary=document.get("summary", ""),
            content=document.get("content", ""),
        )

    except HTTPException:
        raise
    except MeilisearchApiError as e:
        logger.error(f"Meilisearch API error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve course: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error getting course {course_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@router.post(
    "/ingest",
    response_model=IngestionStatus,
    status_code=status.HTTP_201_CREATED,
    summary="Ingest PDF syllabi",
)
async def ingest_pdfs(
    force_reindex: bool = Query(
        False, description="Force reindexing (delete existing documents first)"
    ),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
    search_service: SearchService = Depends(get_search_service),
) -> IngestionStatus:
    """
    Ingest all PDF files from the Resources directory and index them to Meilisearch.

    Args:
        force_reindex: If True, delete all existing documents before ingesting
        ingestion_service: Ingestion service instance
        search_service: Search service instance

    Returns:
        IngestionStatus with ingestion results

    Raises:
        HTTPException: If ingestion fails
    """
    try:
        logger.info("Starting PDF ingestion...")

        # Delete existing documents if force_reindex is True
        if force_reindex:
            logger.info("Force reindex requested - deleting existing documents")
            search_service.delete_all_documents()

        # Run ingestion
        status_result = ingestion_service.ingest_all_pdfs()

        return status_result

    except FileNotFoundError as e:
        logger.error(f"Resources directory not found: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except MeilisearchApiError as e:
        logger.error(f"Meilisearch API error during ingestion: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error during ingestion: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}",
        )


@router.get(
    "/index/stats",
    summary="Get index statistics",
)
async def get_index_stats(
    search_service: SearchService = Depends(get_search_service),
):
    """
    Get statistics about the Meilisearch index.

    Args:
        search_service: Search service instance

    Returns:
        Index statistics

    Raises:
        HTTPException: If stats retrieval fails
    """
    try:
        stats = search_service.get_index_stats()
        return stats
    except MeilisearchApiError as e:
        logger.error(f"Failed to get index stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve index stats: {str(e)}",
        )


@router.delete(
    "/index/documents",
    summary="Delete all documents",
)
async def delete_all_documents(
    search_service: SearchService = Depends(get_search_service),
):
    """
    Delete all documents from the search index.

    Args:
        search_service: Search service instance

    Returns:
        Task information

    Raises:
        HTTPException: If deletion fails
    """
    try:
        task = search_service.delete_all_documents()
        return {"message": "All documents deleted", "task": task}
    except MeilisearchApiError as e:
        logger.error(f"Failed to delete documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete documents: {str(e)}",
        )
