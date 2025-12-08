"""Data ingestion service for parsing PDFs and indexing to Meilisearch."""

import hashlib
import logging
from pathlib import Path
from typing import Dict, List, Tuple

from pypdf import PdfReader

from app.core.config import Settings
from app.models.course import CourseDocument, IngestionStatus
from app.services.search_service import SearchService
from app.utils.text_processing import clean_text, extract_course_code, extract_summary

logger = logging.getLogger(__name__)


class IngestionService:
    """Service for ingesting PDF syllabi and indexing to Meilisearch."""

    def __init__(self, settings: Settings, search_service: SearchService):
        """
        Initialize the ingestion service.

        Args:
            settings: Application settings
            search_service: Search service instance for indexing
        """
        self.settings = settings
        self.search_service = search_service
        self.resources_path = Path(settings.resources_path)

    def _generate_document_id(self, content: str) -> str:
        """
        Generate a unique ID for a document based on its content.

        Args:
            content: Document content

        Returns:
            Unique document ID (hash)
        """
        return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]

    def _extract_text_from_pdf(self, pdf_path: Path) -> str:
        """
        Extract text content from a PDF file.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            Extracted text content

        Raises:
            Exception: If PDF reading fails
        """
        try:
            reader = PdfReader(pdf_path)
            text_parts = []

            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)

            full_text = "\n".join(text_parts)
            return clean_text(full_text)

        except Exception as e:
            logger.error(f"Failed to extract text from {pdf_path.name}: {e}")
            raise

    def _parse_pdf_to_document(self, pdf_path: Path) -> CourseDocument:
        """
        Parse a PDF file and create a CourseDocument.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            CourseDocument instance

        Raises:
            Exception: If parsing fails
        """
        # Extract text from PDF
        content = self._extract_text_from_pdf(pdf_path)

        if not content:
            raise ValueError(f"No text content extracted from {pdf_path.name}")

        # Extract course code from filename or content
        course_code = extract_course_code(pdf_path.stem) or extract_course_code(content[:500])
        if not course_code:
            # Fallback: use filename as course code
            course_code = pdf_path.stem.upper().replace(" ", "_")

        # Use filename (without extension) as title if not found in content
        title = pdf_path.stem.replace("_", " ").title()

        # Try to extract a better title from the first few lines
        lines = content.split("\n")
        for line in lines[:5]:
            line = line.strip()
            if len(line) > 10 and len(line) < 100 and not line.startswith(("Page", "http")):
                # This might be a title
                title = line
                break

        # Generate summary
        summary = extract_summary(content, max_length=300)

        # Generate unique ID
        doc_id = self._generate_document_id(content)

        return CourseDocument(
            id=doc_id,
            course_code=course_code,
            title=title,
            content=content,
            summary=summary,
        )

    def _get_pdf_files(self) -> List[Path]:
        """
        Get all PDF files from the resources directory.

        Returns:
            List of PDF file paths

        Raises:
            FileNotFoundError: If resources directory doesn't exist
        """
        if not self.resources_path.exists():
            raise FileNotFoundError(
                f"Resources directory not found: {self.resources_path}"
            )

        pdf_files = list(self.resources_path.glob("*.pdf"))
        logger.info(f"Found {len(pdf_files)} PDF files in {self.resources_path}")
        return pdf_files

    def _batch_documents(
        self, documents: List[CourseDocument], batch_size: int
    ) -> List[List[Dict]]:
        """
        Split documents into batches for indexing.

        Args:
            documents: List of course documents
            batch_size: Size of each batch

        Returns:
            List of document batches
        """
        doc_dicts = [doc.model_dump() for doc in documents]
        batches = []

        for i in range(0, len(doc_dicts), batch_size):
            batches.append(doc_dicts[i : i + batch_size])

        return batches

    def ingest_all_pdfs(self) -> IngestionStatus:
        """
        Ingest all PDF files from the resources directory.

        Returns:
            IngestionStatus with details about the ingestion process

        Raises:
            Exception: If ingestion fails
        """
        logger.info("Starting PDF ingestion process...")

        try:
            # Get all PDF files
            pdf_files = self._get_pdf_files()
            total_files = len(pdf_files)

            if total_files == 0:
                return IngestionStatus(
                    status="warning",
                    message="No PDF files found in resources directory",
                    total_files=0,
                    processed_files=0,
                    indexed_documents=0,
                    failed_files=[],
                )

            # Parse PDFs and collect documents
            documents: List[CourseDocument] = []
            failed_files: List[str] = []

            for pdf_path in pdf_files:
                try:
                    logger.info(f"Processing {pdf_path.name}...")
                    document = self._parse_pdf_to_document(pdf_path)
                    documents.append(document)
                except Exception as e:
                    logger.error(f"Failed to process {pdf_path.name}: {e}")
                    failed_files.append(pdf_path.name)

            processed_files = len(documents)

            if processed_files == 0:
                return IngestionStatus(
                    status="error",
                    message="Failed to process any PDF files",
                    total_files=total_files,
                    processed_files=0,
                    indexed_documents=0,
                    failed_files=failed_files,
                )

            # Ensure index exists and is configured
            self.search_service.get_or_create_index()
            self.search_service.configure_index_settings()

            # Batch and index documents
            batches = self._batch_documents(documents, self.settings.batch_size)
            indexed_count = 0

            for i, batch in enumerate(batches, 1):
                logger.info(f"Indexing batch {i}/{len(batches)}...")
                self.search_service.add_documents(batch)
                indexed_count += len(batch)

            logger.info(f"Ingestion completed: {indexed_count} documents indexed")

            return IngestionStatus(
                status="success" if not failed_files else "partial_success",
                message=f"Ingestion completed. {indexed_count} documents indexed.",
                total_files=total_files,
                processed_files=processed_files,
                indexed_documents=indexed_count,
                failed_files=failed_files,
            )

        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            raise

    def ingest_single_pdf(self, pdf_path: Path) -> Tuple[CourseDocument, bool]:
        """
        Ingest a single PDF file.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            Tuple of (CourseDocument, success_flag)
        """
        try:
            document = self._parse_pdf_to_document(pdf_path)
            self.search_service.add_documents([document.model_dump()])
            logger.info(f"Successfully indexed {pdf_path.name}")
            return document, True
        except Exception as e:
            logger.error(f"Failed to ingest {pdf_path.name}: {e}")
            return None, False
