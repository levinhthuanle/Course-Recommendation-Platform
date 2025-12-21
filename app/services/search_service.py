"""Search service for interacting with Meilisearch."""

import logging
from typing import Dict, List, Optional

import meilisearch
from meilisearch.errors import MeilisearchApiError, MeilisearchCommunicationError

from app.core.config import Settings
from app.models.course import CourseDocument, CourseResponse, SearchResponse

logger = logging.getLogger(__name__)


class SearchService:
    """Service for managing Meilisearch operations."""

    def __init__(self, settings: Settings):
        """
        Initialize the search service.

        Args:
            settings: Application settings
        """
        self.settings = settings
        self.client: Optional[meilisearch.Client] = None
        self.index = None

    def connect(self) -> None:
        """
        Establish connection to Meilisearch server.

        Raises:
            MeilisearchCommunicationError: If connection fails
        """
        try:
            self.client = meilisearch.Client(
                self.settings.meilisearch_url,
                self.settings.meilisearch_master_key,
            )
            # Test connection
            self.client.health()
            logger.info(f"Connected to Meilisearch at {self.settings.meilisearch_url}")
        except MeilisearchCommunicationError as e:
            logger.error(f"Failed to connect to Meilisearch: {e}")
            raise

    def get_or_create_index(self) -> meilisearch.index.Index:
        """
        Get or create the courses index.

        Returns:
            Meilisearch index instance

        Raises:
            MeilisearchApiError: If index creation fails
        """
        if not self.client:
            self.connect()

        try:
            # Try to get existing index
            self.index = self.client.get_index(self.settings.meilisearch_index_name)
            logger.info(f"Using existing index: {self.settings.meilisearch_index_name}")
        except MeilisearchApiError as e:
            # Create new index if it doesn't exist
            if "index_not_found" in str(e):
                logger.info(f"Index not found, creating new index: {self.settings.meilisearch_index_name}")
                task = self.client.create_index(
                    self.settings.meilisearch_index_name,
                    {"primaryKey": "id"},
                )
                # Wait for index creation to complete
                self.client.wait_for_task(task.task_uid)
                self.index = self.client.get_index(self.settings.meilisearch_index_name)
                logger.info(f"Created new index: {self.settings.meilisearch_index_name}")
            else:
                raise

        return self.index

    def configure_index_settings(self) -> None:
        """
        Configure Meilisearch index settings for optimal search.

        This includes:
        - Searchable attributes
        - Ranking rules
        - Typo tolerance
        - Filterable attributes
        - Embedder configuration for hybrid search (v1.6+)
        """
        if not self.index:
            self.get_or_create_index()

        try:
            # Configure searchable attributes (order matters for ranking)
            # course_code first for exact code searches, then title for name searches
            self.index.update_searchable_attributes(
                ["course_code", "title", "summary", "content"]
            )

            # Configure ranking rules for relevance (prioritize exactness and words)
            self.index.update_ranking_rules(
                [
                    "exactness",      # Exact matches rank higher
                    "words",          # Number of matched query terms
                    "proximity",      # Proximity of query terms
                    "attribute",      # Matches in earlier attributes rank higher
                    "sort",           # Custom sorting
                    "typo",           # Fewer typos is better
                ]
            )

            # Configure typo tolerance - strict to reduce noisy matches
            self.index.update_typo_tolerance(
                {
                    "enabled": True,
                    "minWordSizeForTypos": {
                        "oneTypo": 5,   # Require at least 5 chars for 1 typo
                        "twoTypos": 9,  # Require at least 9 chars for 2 typos
                    },
                    # Disable typos on course codes entirely
                    "disableOnAttributes": ["course_code", "title"],
                }
            )

            # Configure filterable attributes
            self.index.update_filterable_attributes(["course_code"])

            # Configure displayed attributes
            self.index.update_displayed_attributes(
                ["id", "course_code", "title", "summary"]
            )

            # Configure embedder for hybrid search (Meilisearch v1.6+)
            # This enables vector search alongside keyword search
            try:
                embedder_config = {
                    "default": {
                        "source": "userProvided",
                        "dimensions": 384  # all-MiniLM-L6-v2 dimension
                    }
                }
                self.index.update_embedders(embedder_config)
                logger.info("Configured embedder for hybrid search (vector + keyword)")
            except Exception as e:
                logger.warning(f"Could not configure embedder (may require Meilisearch v1.6+): {e}")

            logger.info("Meilisearch index settings configured successfully")
        except MeilisearchApiError as e:
            logger.error(f"Failed to configure index settings: {e}")
            raise

    def add_documents(self, documents: List[Dict]) -> Dict:
        """
        Add documents to the search index.

        Args:
            documents: List of course documents to index

        Returns:
            Task information from Meilisearch

        Raises:
            MeilisearchApiError: If indexing fails
        """
        if not self.index:
            self.get_or_create_index()

        try:
            task = self.index.add_documents(documents)
            logger.info(f"Added {len(documents)} documents to index. Task UID: {task.task_uid}")
            return task.__dict__
        except MeilisearchApiError as e:
            logger.error(f"Failed to add documents: {e}")
            raise

    def search(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0,
        filters: Optional[str] = None,
        hybrid_search: bool = False,  # Default to False until embedder is confirmed working
        semantic_ratio: float = 0.5,
    ) -> SearchResponse:
        """
        Search for courses in Meilisearch using hybrid search (keyword + vector).

        Args:
            query: Search query string
            limit: Maximum number of results to return
            offset: Number of results to skip (for pagination)
            filters: Optional filter string (e.g., 'course_code = CS101')
            hybrid_search: Enable hybrid search combining keyword + semantic (default True)
            semantic_ratio: Weight for semantic search (0.0 = pure keyword, 1.0 = pure semantic)

        Returns:
            SearchResponse with search results

        Raises:
            MeilisearchApiError: If search fails
        """
        if not self.index:
            self.get_or_create_index()

        try:
            search_params = {
                "limit": limit,
                "offset": offset,
                "attributesToRetrieve": ["id", "course_code", "title", "summary"],
                "attributesToHighlight": ["title", "summary"],
                "showMatchesPosition": False,
                "showRankingScore": True,  # Show ranking scores
                # Require all query terms to be present to reduce noisy single-term matches
                "matchingStrategy": "all",
            }

            if filters:
                search_params["filter"] = filters

            # Enable hybrid search if embeddings are available
            if hybrid_search:
                try:
                    search_params["hybrid"] = {
                        "semanticRatio": semantic_ratio,
                        "embedder": "default"
                    }
                except Exception as e:
                    logger.warning(f"Hybrid search not available, falling back to keyword: {e}")

            results = self.index.search(query, search_params)

            # Convert results to CourseResponse objects
            hits = [
                CourseResponse(
                    id=hit.get("id"),
                    course_code=hit.get("course_code"),
                    title=hit.get("title"),
                    summary=hit.get("summary"),
                    score=hit.get("_rankingScore"),
                )
                for hit in results.get("hits", [])
            ]

            return SearchResponse(
                query=query,
                hits=hits,
                total=results.get("estimatedTotalHits", 0),
                limit=limit,
                offset=offset,
                processing_time_ms=results.get("processingTimeMs", 0),
            )

        except MeilisearchApiError as e:
            logger.error(f"Search failed for query '{query}': {e}")
            raise

    def get_index_stats(self) -> Dict:
        """
        Get statistics about the index.

        Returns:
            Dictionary with index statistics

        Raises:
            MeilisearchApiError: If stats retrieval fails
        """
        if not self.index:
            self.get_or_create_index()

        try:
            stats = self.index.get_stats()
            return stats
        except MeilisearchApiError as e:
            logger.error(f"Failed to get index stats: {e}")
            raise

    def delete_all_documents(self) -> Dict:
        """
        Delete all documents from the index.

        Returns:
            Task information from Meilisearch

        Raises:
            MeilisearchApiError: If deletion fails
        """
        if not self.index:
            self.get_or_create_index()

        try:
            task = self.index.delete_all_documents()
            logger.info("Deleted all documents from index")
            return task.__dict__
        except MeilisearchApiError as e:
            logger.error(f"Failed to delete documents: {e}")
            raise

    def check_connection(self) -> bool:
        """
        Check if Meilisearch is accessible.

        Returns:
            True if connected, False otherwise
        """
        try:
            if not self.client:
                self.connect()
            self.client.health()
            return True
        except (MeilisearchCommunicationError, MeilisearchApiError):
            return False

    def get_document_by_id(self, document_id: str) -> Optional[Dict]:
        """
        Get a single document by its ID.

        Args:
            document_id: The document ID

        Returns:
            Document dictionary or None if not found
        """
        if not self.index:
            self.get_or_create_index()

        try:
            document = self.index.get_document(document_id)
            # Convert Document object to dict if needed
            if hasattr(document, '__dict__'):
                return vars(document)
            elif hasattr(document, 'to_dict'):
                return document.to_dict()
            elif isinstance(document, dict):
                return document
            else:
                # Fallback: try to access as object attributes
                return {
                    "id": getattr(document, 'id', document_id),
                    "course_code": getattr(document, 'course_code', ''),
                    "title": getattr(document, 'title', ''),
                    "summary": getattr(document, 'summary', ''),
                    "content": getattr(document, 'content', ''),
                }
        except MeilisearchApiError as e:
            if "document_not_found" in str(e):
                return None
            logger.error(f"Failed to get document {document_id}: {e}")
            raise
