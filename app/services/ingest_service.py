"""Data ingestion service for parsing PDFs and indexing to Meilisearch."""

import hashlib
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from pypdf import PdfReader

from app.core.config import Settings
from app.models.course import CourseDocument, IngestionStatus
from app.services.search_service import SearchService
from app.services.embedding_service import get_embedding_service

logger = logging.getLogger(__name__)

# Course code pattern: 2-5 uppercase letters + optional space + 2-6 digits + optional letter
# Examples: CS161, PH 212, MTH251, STAT451, ECE341, CSC10102, CSC10001
COURSE_CODE_PATTERN = re.compile(r"^([A-Z]{2,5})\s*(\d{2,6}[A-Z]?)$")

# Course header pattern: CODE – Title (using various dash types)
# Examples: "CS161 – Introduction to Computer Science I", "CSC10102 - Career Observation"
COURSE_HEADER_PATTERN = re.compile(
    r"^([A-Z]{2,5})\s*(\d{2,6}[A-Z]?)\s*[\-–—]\s*(.+)$"
)


class IngestionService:
    """Service for ingesting PDF syllabi and indexing to Meilisearch."""

    def __init__(self, settings: Settings, search_service: SearchService):
        self.settings = settings
        self.search_service = search_service
        self.resources_path = Path(settings.resources_path)
        self.embedding_service = get_embedding_service()

    def _generate_document_id(self, course_code: str, title: str) -> str:
        """Generate a unique ID based on course code and title."""
        key = f"{course_code}:{title}".lower()
        return hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]

    def _fix_broken_text(self, text: str) -> str:
        """Fix broken text from PDF extraction where letters are separated by spaces.
        
        Example: "Data Mode ling a nd" -> "Data Modeling and"
        
        NOTE: This is a conservative fix - only fix known broken patterns.
        The aggressive regex was removing all spaces between words.
        """
        if not text:
            return ""
        
        # Common specific fixes for known broken words from PDF extraction
        broken_words = {
            r'Introduc\s+tion': 'Introduction',
            r'Data\s+base': 'Database',
            r'Mode\s+ling': 'Modeling',
            r'In\s+tegration': 'Integration',
            r'Sys\s+tems': 'Systems',
            r'Pro\s+gram\s*ming': 'Programming',
            r'Com\s+puter': 'Computer',
            r'Sci\s+ence': 'Science',
            r'Algo\s+rithms': 'Algorithms',
            r'Soft\s+ware': 'Software',
            r'Engi\s+neering': 'Engineering',
            r'Net\s+works': 'Networks',
            r'Oper\s+ating': 'Operating',
            r'Manage\s+ment': 'Management',
            r'Develop\s+ment': 'Development',
            r'Archi\s+tecture': 'Architecture',
            r'Secu\s+rity': 'Security',
            r'Appli\s+cation': 'Application',
            r'Appli\s+cations': 'Applications',
            r'Infor\s+mation': 'Information',
            r'Intel\s+ligence': 'Intelligence',
            r'Arti\s+ficial': 'Artificial',
            r'Ma\s+chine': 'Machine',
            r'Learn\s+ing': 'Learning',
            r'Struc\s+tures': 'Structures',
            r'Dis\s+tributed': 'Distributed',
            r'Paral\s+lel': 'Parallel',
            r'Theo\s+ry': 'Theory',
            r'Funda\s+mentals': 'Fundamentals',
            r'Prin\s+ciples': 'Principles',
            r'Analy\s+sis': 'Analysis',
            r'De\s+sign': 'Design',
            r'Imple\s+mentation': 'Implementation',
            r'Visu\s+alization': 'Visualization',
            r'Compu\s+tation': 'Computation',
            r'Compu\s*tational': 'Computational',
        }
        
        for pattern, replacement in broken_words.items():
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        return text

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        if not text:
            return ""
        # Remove control characters
        text = re.sub(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]", "", text)
        # Normalize whitespace
        text = re.sub(r"\s+", " ", text)
        # Fix broken text from PDF extraction
        text = self._fix_broken_text(text)
        return text.strip()

    def _clean_title(self, title: str) -> str:
        """Clean a course title - remove TOC artifacts like dots and page numbers."""
        if not title:
            return ""
        # Remove trailing dots and page numbers (e.g., "... 45" or "...... 12")
        title = re.sub(r"[\.\s]+\d+\s*$", "", title)
        # Remove leading/trailing dots
        title = re.sub(r"^[\.\s]+|[\.\s]+$", "", title)
        # Clean whitespace
        title = re.sub(r"\s+", " ", title)
        # Fix broken text from PDF extraction
        title = self._fix_broken_text(title)
        return title.strip()

    def _extract_summary(self, content: str, max_length: int = 300) -> str:
        """Extract a clean summary from course content."""
        if not content:
            return ""

        # Look for course description section
        desc_patterns = [
            r"(?:Course\s+)?Description[:\s]+(.+?)(?=\d+\.|Course\s+Goals|Course\s+Outcomes|$)",
            r"(?:COURSE\s+)?DESCRIPTION[:\s]+(.+?)(?=\d+\.|COURSE\s+GOALS|COURSE\s+OUTCOMES|$)",
        ]

        for pattern in desc_patterns:
            match = re.search(pattern, content, re.IGNORECASE | re.DOTALL)
            if match:
                desc = self._clean_text(match.group(1))
                if len(desc) > 50:
                    return desc[:max_length] + "..." if len(desc) > max_length else desc

        # Fallback: first meaningful paragraph
        sentences = re.split(r"(?<=[.!?])\s+", content)
        summary_parts = []
        total_len = 0

        for sentence in sentences:
            sentence = self._clean_text(sentence)
            # Skip short or header-like sentences
            if len(sentence) < 20:
                continue
            if sentence.isupper():
                continue
            summary_parts.append(sentence)
            total_len += len(sentence)
            if total_len >= max_length:
                break

        summary = " ".join(summary_parts)
        return summary[:max_length] + "..." if len(summary) > max_length else summary

    def _extract_text_from_pdf(self, pdf_path: Path) -> str:
        """Extract text content from a PDF file."""
        try:
            reader = PdfReader(pdf_path)
            text_parts = []

            for page in reader.pages:
                # Try layout mode first (better spacing preservation)
                try:
                    text = page.extract_text(extraction_mode="layout")
                except:
                    text = page.extract_text()
                
                if text:
                    # Fix common PDF extraction issues
                    # Some PDFs have no spaces between words
                    # Try to detect and fix by adding spaces before capital letters
                    # that follow lowercase letters (camelCase detection)
                    text = self._fix_missing_spaces(text)
                    text_parts.append(text)

            return "\n".join(text_parts)
        except Exception as e:
            logger.error(f"Failed to extract text from {pdf_path.name}: {e}")
            raise

    def _fix_missing_spaces(self, text: str) -> str:
        """Fix text where spaces are missing between words.
        
        Detects patterns like 'conceptsPrinciples' and adds spaces.
        """
        if not text:
            return ""
        
        # Add space before uppercase letter that follows lowercase letter
        # "conceptsPrinciples" -> "concepts Principles"
        text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)
        
        # Add space after period/comma if followed by uppercase letter without space
        # "systems.The" -> "systems. The"
        text = re.sub(r'([.,:;])([A-Z])', r'\1 \2', text)
        
        # Fix common compound words that got merged
        # "DatabaseManagement" -> "Database Management"
        text = re.sub(r'(Database)(Management)', r'\1 \2', text)
        text = re.sub(r'(Information)(System)', r'\1 \2', text)
        text = re.sub(r'(Computer)(Science)', r'\1 \2', text)
        text = re.sub(r'(Machine)(Learning)', r'\1 \2', text)
        text = re.sub(r'(Data)(Structures)', r'\1 \2', text)
        text = re.sub(r'(Operating)(Systems)', r'\1 \2', text)
        text = re.sub(r'(Software)(Engineering)', r'\1 \2', text)
        
        return text

    def _normalize_page_text(self, text: str) -> str:
        """Normalize page text while preserving line breaks for section parsing."""
        if not text:
            return ""

        # Remove control characters
        text = re.sub(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]", "", text)
        text = text.replace("\r", "\n")
        text = self._fix_missing_spaces(text)
        text = self._fix_broken_text(text)
        # Normalize spaces but keep newlines
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{2,}", "\n", text)
        return text.strip()

    def _extract_line_value(self, text: str, patterns: List[str]) -> str:
        """Extract a single line value using multiple regex patterns."""
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return self._clean_text(match.group(1))
        return ""

    def _extract_section(self, text: str, start_patterns: List[str], end_patterns: List[str]) -> str:
        """Extract a section between headings (case-insensitive)."""
        start = "|".join(start_patterns)
        end = "|".join(end_patterns)
        pattern = rf"(?:{start})\s*(.+?)(?=(?:{end})|$)"
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if not match:
            return ""

        section = match.group(1).strip()
        section = re.sub(r"[ \t]+", " ", section)
        section = re.sub(r"\n{2,}", "\n", section)
        return section.strip()

    def _parse_course_goals(self, text: str) -> List[str]:
        """Parse course goals into a list from a section string."""
        if not text:
            return []

        lines = [line.strip() for line in text.split("\n") if line.strip()]
        goals: List[str] = []
        current = ""

        for line in lines:
            numbered = re.match(r"^\s*(\d+)[\.|\)]\s*(.+)$", line)
            if numbered:
                if current:
                    goals.append(self._clean_text(current))
                current = numbered.group(2)
                continue

            if current:
                current = f"{current} {line}".strip()
            else:
                current = line

        if current:
            goals.append(self._clean_text(current))

        return goals

    def _build_document_from_page(self, page_text: str, source_file: str, page_index: int) -> Optional[CourseDocument]:
        """Build a CourseDocument from a single page of a multi-course PDF."""
        normalized = self._normalize_page_text(page_text)
        if not normalized or len(normalized) < 100:
            return None

        lines = [line.strip() for line in normalized.split("\n") if line.strip()]

        course_code = ""
        title = ""
        for line in lines[:12]:
            parsed = self._parse_course_header(line)
            if parsed:
                course_code, title = parsed
                break

        course_id = self._extract_line_value(
            normalized,
            [r"Course\s*ID\s*\(English\)\s*:\s*(.+)", r"Course\s*ID\s*:\s*(.+)"],
        )
        if course_id:
            course_code = course_code or course_id

        course_name_en = self._extract_line_value(
            normalized,
            [r"Course\s*name\s*\(English\)\s*:\s*(.+)", r"Course\s*name\s*\(ENG\)\s*:\s*(.+)"],
        )
        course_name_vi = self._extract_line_value(
            normalized,
            [r"Course\s*name\s*\(Vietnamese\)\s*:\s*(.+)", r"Course\s*name\s*\(VI\)\s*:\s*(.+)"],
        )

        if course_name_en:
            title = course_name_en

        credit_points = self._extract_line_value(
            normalized,
            [r"Credit\s*points?\s*:\s*(.+)"],
        )
        prior_courses = self._extract_line_value(
            normalized,
            [r"Prior\s*course\(s\)\s*:\s*(.+)", r"Prerequisite\(s\)\s*:\s*(.+)"],
        )

        course_description = self._extract_section(
            normalized,
            [r"COURSE\s*DESCRIPTION"],
            [
                r"COURSE\s*GOALS",
                r"COURSE\s*OUTCOMES",
                r"REQUIRED\s+AND\s+RECOMMENDED\s+READING",
                r"REQUIRED\s+READING",
            ],
        )

        goals_section = self._extract_section(
            normalized,
            [r"COURSE\s*GOALS", r"COURSE\s*OUTCOMES"],
            [r"REQUIRED\s+AND\s+RECOMMENDED\s+READING", r"REQUIRED\s+READING"],
        )
        course_goals = self._parse_course_goals(goals_section)

        if not course_code:
            course_code = f"PAGE{page_index:03d}"
        if not title:
            title = course_name_en or course_name_vi or f"Course Page {page_index}"

        summary = course_description or self._extract_summary(normalized)
        content_parts = [
            course_code,
            title,
            course_name_vi,
            credit_points,
            prior_courses,
            course_description,
            " ".join(course_goals) if course_goals else "",
        ]
        content = self._clean_text("\n".join([p for p in content_parts if p]))

        doc_id = self._generate_document_id(course_code, title)

        return CourseDocument(
            id=doc_id,
            course_code=course_code,
            title=title,
            course_name_en=course_name_en or title,
            course_name_vi=course_name_vi or None,
            credit_points=credit_points or None,
            prior_courses=prior_courses or None,
            course_description=course_description or None,
            course_goals=course_goals or None,
            content=content,
            summary=summary,
        )

    def _split_course_pdf_by_page(self, pdf_path: Path) -> List[CourseDocument]:
        """Split a single multi-page PDF into course documents by page."""
        documents: List[CourseDocument] = []

        try:
            reader = PdfReader(pdf_path)
        except Exception as e:
            logger.error(f"Failed to read PDF {pdf_path.name}: {e}")
            return documents

        for page_index, page in enumerate(reader.pages, start=1):
            try:
                try:
                    text = page.extract_text(extraction_mode="layout")
                except Exception:
                    text = page.extract_text()

                if not text:
                    continue

                doc = self._build_document_from_page(text, pdf_path.name, page_index)
                if doc:
                    documents.append(doc)
            except Exception as e:
                logger.warning(f"Failed to parse page {page_index} of {pdf_path.name}: {e}")

        logger.info(f"Parsed {len(documents)} courses from {pdf_path.name} by page")
        return documents

    def _parse_course_header(self, line: str) -> Optional[Tuple[str, str]]:
        """
        Parse a course header line.

        Args:
            line: A line of text

        Returns:
            Tuple of (course_code, title) or None if not a valid header
        """
        line = line.strip()
        if not line:
            return None

        match = COURSE_HEADER_PATTERN.match(line)
        if match:
            prefix = match.group(1).upper()
            number = match.group(2)
            title = match.group(3)

            course_code = f"{prefix}{number}"
            clean_title = self._clean_title(title)

            # Validate: title should be reasonable (not just page numbers or dots)
            if len(clean_title) < 5:
                return None
            if clean_title.replace(".", "").replace(" ", "").isdigit():
                return None

            return course_code, clean_title

        return None

    def _split_multi_course_pdf(self, content: str, source_file: str) -> List[CourseDocument]:
        """
        Split a multi-course PDF into individual course documents.

        Detects course boundaries using the pattern: CODE – Title
        (e.g., "CS161 – Introduction to Computer Science I")

        Args:
            content: Full PDF text content
            source_file: Source filename for reference

        Returns:
            List of CourseDocument objects
        """
        lines = content.split("\n")
        documents: List[CourseDocument] = []

        # Find all course header positions
        course_positions: List[Tuple[int, str, str]] = []  # (line_index, code, title)

        for i, line in enumerate(lines):
            result = self._parse_course_header(line)
            if result:
                code, title = result
                # Avoid duplicates (same code appearing multiple times, e.g., in TOC)
                if course_positions and course_positions[-1][1] == code:
                    # Update if this title is longer/cleaner (likely the actual header vs TOC)
                    if len(title) > len(course_positions[-1][2]):
                        course_positions[-1] = (i, code, title)
                else:
                    course_positions.append((i, code, title))

        logger.info(f"Found {len(course_positions)} course sections in {source_file}")

        if not course_positions:
            return []

        # Extract content for each course
        for idx, (start_line, code, title) in enumerate(course_positions):
            # Determine end of this course section
            if idx + 1 < len(course_positions):
                end_line = course_positions[idx + 1][0]
            else:
                end_line = len(lines)

            # Extract section content
            section_lines = lines[start_line:end_line]
            section_content = self._clean_text("\n".join(section_lines))

            # Skip if content is too short (likely TOC entry)
            if len(section_content) < 200:
                logger.debug(f"Skipping {code} - content too short ({len(section_content)} chars)")
                continue

            summary = self._extract_summary(section_content)
            doc_id = self._generate_document_id(code, title)

            documents.append(
                CourseDocument(
                    id=doc_id,
                    course_code=code,
                    title=title,
                    content=section_content,
                    summary=summary,
                )
            )

        logger.info(f"Created {len(documents)} course documents from {source_file}")
        return documents

    def _build_single_document(self, pdf_path: Path, content: str) -> CourseDocument:
        """
        Build a single CourseDocument from a PDF (when no multi-course structure detected).

        Args:
            pdf_path: Path to PDF file
            content: Extracted text content

        Returns:
            CourseDocument
        """
        content = self._clean_text(content)

        # Try to extract course code from filename or content
        course_code = None
        title = pdf_path.stem.replace("_", " ").title()

        # Check filename for course code pattern
        filename = pdf_path.stem.upper().replace("_", "").replace(" ", "")
        code_match = COURSE_CODE_PATTERN.match(filename)
        if code_match:
            course_code = f"{code_match.group(1)}{code_match.group(2)}"

        # Check first few lines for course header
        lines = content.split(" ")[:100]
        content_start = " ".join(lines)
        for line in content_start.split("\n")[:20]:
            result = self._parse_course_header(line.strip())
            if result:
                course_code, title = result
                break

        if not course_code:
            # Last resort: extract from content
            match = re.search(r"\b([A-Z]{2,5})\s*(\d{2,4}[A-Z]?)\b", content[:500])
            if match:
                course_code = f"{match.group(1)}{match.group(2)}"
            else:
                course_code = pdf_path.stem.upper().replace(" ", "")[:10]

        summary = self._extract_summary(content)
        doc_id = self._generate_document_id(course_code, title)

        return CourseDocument(
            id=doc_id,
            course_code=course_code,
            title=title,
            content=content,
            summary=summary,
        )

    def _get_pdf_files(self) -> List[Path]:
        """Get all PDF files from the resources directory."""
        if not self.resources_path.exists():
            raise FileNotFoundError(f"Resources directory not found: {self.resources_path}")

        pdf_files = list(self.resources_path.glob("*.pdf"))
        logger.info(f"Found {len(pdf_files)} PDF files in {self.resources_path}")
        return pdf_files

    def _batch_documents(self, documents: List[CourseDocument], batch_size: int) -> List[List[Dict]]:
        """Split documents into batches for indexing."""
        doc_dicts = [doc.model_dump() for doc in documents]
        batches: List[List[Dict]] = []

        for i in range(0, len(doc_dicts), batch_size):
            batches.append(doc_dicts[i : i + batch_size])

        return batches

    def _add_embeddings_to_documents(self, documents: List[CourseDocument]) -> List[Dict]:
        """
        Generate embeddings for documents and add them to the document dicts.
        
        Args:
            documents: List of CourseDocument objects
            
        Returns:
            List of document dicts with embeddings added under '_vectors' field
        """
        logger.info(f"Generating embeddings for {len(documents)} documents...")
        
        # Prepare text for embedding: combine title + summary (most relevant fields)
        texts_to_embed = [
            f"{doc.title}. {doc.summary}" 
            for doc in documents
        ]
        
        # Generate embeddings in batch
        try:
            embeddings = self.embedding_service.generate_embeddings(texts_to_embed)
            logger.info(f"Generated {len(embeddings)} embeddings")
        except Exception as e:
            logger.error(f"Failed to generate embeddings: {e}")
            # Fall back to documents without embeddings
            return [doc.model_dump() for doc in documents]
        
        # Add embeddings to document dicts
        doc_dicts = []
        for doc, embedding in zip(documents, embeddings):
            doc_dict = doc.model_dump()
            # Meilisearch v1.6+ expects embeddings in _vectors field
            doc_dict["_vectors"] = {
                "default": embedding  # 'default' matches the embedder name in config
            }
            doc_dicts.append(doc_dict)
        
        return doc_dicts

    def ingest_all_pdfs(self) -> IngestionStatus:
        """
        Ingest all PDF files from the resources directory.

        Returns:
            IngestionStatus with ingestion results
        """
        logger.info("Starting PDF ingestion process...")

        try:
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

            documents: List[CourseDocument] = []
            failed_files: List[str] = []

            use_page_split = len(pdf_files) == 1

            for pdf_path in pdf_files:
                try:
                    logger.info(f"Processing {pdf_path.name}...")
                    if use_page_split:
                        page_docs = self._split_course_pdf_by_page(pdf_path)
                        if page_docs:
                            documents.extend(page_docs)
                            logger.info(f"  -> Page split into {len(page_docs)} courses")
                            continue
                    else:
                        page_docs = self._split_course_pdf_by_page(pdf_path)
                        if len(page_docs) == 1:
                            documents.extend(page_docs)
                            logger.info(f"  -> Single page parsed into 1 course")
                            continue

                    content = self._extract_text_from_pdf(pdf_path)

                    if not content or len(content) < 100:
                        logger.warning(f"Skipping {pdf_path.name} - no content extracted")
                        failed_files.append(pdf_path.name)
                        continue

                    # Try multi-course split first
                    multi_docs = self._split_multi_course_pdf(content, pdf_path.name)

                    if multi_docs:
                        documents.extend(multi_docs)
                        logger.info(f"  -> Split into {len(multi_docs)} courses")
                    else:
                        # Single document fallback
                        doc = self._build_single_document(pdf_path, content)
                        documents.append(doc)
                        logger.info(f"  -> Single document: {doc.course_code}")

                except Exception as e:
                    logger.error(f"Failed to process {pdf_path.name}: {e}")
                    failed_files.append(pdf_path.name)

            if not documents:
                return IngestionStatus(
                    status="error",
                    message="Failed to process any PDF files",
                    total_files=total_files,
                    processed_files=0,
                    indexed_documents=0,
                    failed_files=failed_files,
                )

            # Ensure index exists and configure settings
            self.search_service.get_or_create_index()
            self.search_service.configure_index_settings()

            # Generate embeddings and batch index
            logger.info("Generating embeddings for documents...")
            doc_dicts_with_embeddings = self._add_embeddings_to_documents(documents)
            
            # Batch the dict documents
            batches = [
                doc_dicts_with_embeddings[i:i + self.settings.batch_size]
                for i in range(0, len(doc_dicts_with_embeddings), self.settings.batch_size)
            ]
            indexed_count = 0

            for i, batch in enumerate(batches, 1):
                logger.info(f"Indexing batch {i}/{len(batches)} ({len(batch)} documents)...")
                self.search_service.add_documents(batch)
                indexed_count += len(batch)

            logger.info(f"Ingestion completed: {indexed_count} documents indexed")

            return IngestionStatus(
                status="success" if not failed_files else "partial_success",
                message=f"Ingestion completed. {indexed_count} documents indexed from {len(pdf_files)} files.",
                total_files=total_files,
                processed_files=len(pdf_files) - len(failed_files),
                indexed_documents=indexed_count,
                failed_files=failed_files,
            )

        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            raise

    def ingest_single_pdf(self, pdf_path: Path) -> Tuple[Optional[CourseDocument], bool]:
        """
        Ingest a single PDF file.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            Tuple of (CourseDocument or None, success_flag)
        """
        try:
            page_docs = self._split_course_pdf_by_page(pdf_path)
            if page_docs:
                docs_with_embeddings = self._add_embeddings_to_documents(page_docs)
                self.search_service.add_documents(docs_with_embeddings)
                logger.info(f"Indexed {len(page_docs)} courses from {pdf_path.name}")
                return page_docs[0], True

            content = self._extract_text_from_pdf(pdf_path)

            if not content:
                logger.warning(f"No content extracted from {pdf_path.name}")
                return None, False

            # Try multi-course split
            multi_docs = self._split_multi_course_pdf(content, pdf_path.name)

            if multi_docs:
                # Generate embeddings for multi-course documents
                docs_with_embeddings = self._add_embeddings_to_documents(multi_docs)
                self.search_service.add_documents(docs_with_embeddings)
                logger.info(f"Indexed {len(multi_docs)} courses from {pdf_path.name}")
                return multi_docs[0], True
            else:
                doc = self._build_single_document(pdf_path, content)
                # Generate embedding for single document
                docs_with_embeddings = self._add_embeddings_to_documents([doc])
                self.search_service.add_documents(docs_with_embeddings)
                logger.info(f"Indexed single document: {doc.course_code} from {pdf_path.name}")
                return doc, True

        except Exception as e:
            logger.error(f"Failed to ingest {pdf_path.name}: {e}")
            return None, False
