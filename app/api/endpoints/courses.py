"""Course search and ingestion API endpoints."""

import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from meilisearch.errors import MeilisearchApiError, MeilisearchCommunicationError

from app.core.auth import get_current_user, require_admin
from app.core.config import Settings, get_settings
from app.models.user import UserPublic
from app.models.course import CourseDetailResponse, HealthResponse, IngestionStatus, SearchResponse
from app.services.analytics_service import AnalyticsService
from app.services.auth_service import AuthService
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


def get_analytics_service(settings: Settings = Depends(get_settings)) -> AnalyticsService:
    return AnalyticsService(settings)


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
    current_user: UserPublic = Depends(get_current_user),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
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

        analytics_service.log_query("search", q)

        # Only use hybrid search if embedder is configured
        # For now, default to keyword search until embedder is confirmed working
        results = search_service.search(
            query=q,
            limit=limit,
            offset=offset,
            filters=filters,
            hybrid_search=semantic_ratio > 0,
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
    current_user: UserPublic = Depends(get_current_user),
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
            course_name_en=document.get("course_name_en"),
            course_name_vi=document.get("course_name_vi"),
            relation_to_curriculum=document.get("relation_to_curriculum"),
            credit_points=document.get("credit_points"),
            prior_courses=document.get("prior_courses"),
            course_description=document.get("course_description"),
            course_goals=document.get("course_goals"),
            required_reading=document.get("required_reading"),
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
    admin_user: UserPublic = Depends(require_admin),
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


@router.post(
    "/ingest/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest a PDF syllabus (admin only)",
)
async def upload_and_ingest_pdf(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
    admin_user: UserPublic = Depends(require_admin),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")

    resources_path = Path(settings.resources_path)
    resources_path.mkdir(parents=True, exist_ok=True)
    target_path = resources_path / file.filename

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file")
        target_path.write_bytes(contents)

        doc, success = ingestion_service.ingest_single_pdf(target_path)
        if not success:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to ingest file")

        return {
            "message": "File uploaded and ingested",
            "filename": file.filename,
            "course_id": doc.id if doc else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload ingest failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Upload ingest failed")


@router.get(
    "/admin/files",
    summary="List ingested PDF files (admin only)",
)
async def list_ingested_files(
    settings: Settings = Depends(get_settings),
    admin_user: UserPublic = Depends(require_admin),
):
    resources_path = Path(settings.resources_path)
    if not resources_path.exists():
        return {"files": []}

    files = []
    for path in sorted(resources_path.glob("*.pdf")):
        stat = path.stat()
        files.append({
            "name": path.name,
            "size": stat.st_size,
            "modified": int(stat.st_mtime),
        })

    return {"files": files}


@router.delete(
    "/admin/files/{filename}",
    summary="Delete an ingested PDF file (admin only)",
)
async def delete_ingested_file(
    filename: str,
    settings: Settings = Depends(get_settings),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
    search_service: SearchService = Depends(get_search_service),
    admin_user: UserPublic = Depends(require_admin),
):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")

    resources_path = Path(settings.resources_path)
    target = (resources_path / filename).resolve()
    if resources_path.resolve() not in target.parents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path")
    if not target.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    try:
        target.unlink()
        # Reindex after delete (as requested)
        search_service.delete_all_documents()
        ingestion_service.ingest_all_pdfs()
        return {"message": "File deleted and index rebuilt", "filename": filename}
    except Exception as e:
        logger.error(f"Failed to delete file {filename}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Delete failed")


@router.delete(
    "/admin/index/clear-file/{filename}",
    summary="Delete indexed data for a PDF without removing the file",
)
async def clear_index_for_file(
    filename: str,
    search_service: SearchService = Depends(get_search_service),
    admin_user: UserPublic = Depends(require_admin),
):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are supported")

    try:
        deleted = search_service.delete_documents_by_source_file(filename)
        return {"message": "Index cleared", "filename": filename, "deleted": deleted}
    except Exception as e:
        logger.error(f"Failed to clear index for {filename}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Index clear failed")


@router.get(
    "/admin/stats",
    summary="Admin dashboard stats",
)
async def get_admin_stats(
    settings: Settings = Depends(get_settings),
    admin_user: UserPublic = Depends(require_admin),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    auth_service = AuthService(settings)
    counts = analytics_service.get_counts()
    top_terms = analytics_service.get_top_terms()

    return {
        "users": {
            "total": auth_service.count_users(),
            "admins": auth_service.count_admins(),
        },
        "queries": counts,
        "top_terms": top_terms,
    }


@router.get(
    "/admin/usage",
    summary="Admin usage timeline",
)
async def get_admin_usage(
    days: int = Query(7, ge=1, le=90),
    admin_user: UserPublic = Depends(require_admin),
    analytics_service: AnalyticsService = Depends(get_analytics_service),
):
    return {"days": analytics_service.get_daily_counts(days=days)}


@router.get(
    "/index/stats",
    summary="Get index statistics",
)
async def get_index_stats(
    search_service: SearchService = Depends(get_search_service),
    admin_user: UserPublic = Depends(require_admin),
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
    admin_user: UserPublic = Depends(require_admin),
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
