"""Text processing utilities for cleaning and normalizing extracted text."""

import re
import unicodedata
from typing import Optional


def clean_text(text: str) -> str:
    """
    Clean and normalize text extracted from PDFs.

    Args:
        text: Raw text to clean

    Returns:
        Cleaned and normalized text
    """
    if not text:
        return ""

    # Normalize unicode characters
    text = unicodedata.normalize("NFKD", text)

    # Remove null bytes and other control characters
    text = re.sub(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]", "", text)

    # Replace multiple spaces with single space
    text = re.sub(r"\s+", " ", text)

    # Remove leading/trailing whitespace
    text = text.strip()

    return text


def extract_course_code(text: str) -> Optional[str]:
    """
    Extract course code from text using common patterns.

    Args:
        text: Text to extract course code from

    Returns:
        Extracted course code or None
    """
    # Common patterns: CS101, CS-101, CSCI 101, etc.
    patterns = [
        r"\b([A-Z]{2,4})\s*[-]?\s*(\d{3,4}[A-Z]?)\b",  # CS101, CS-101, CSCI 101
        r"\b([A-Z]+)(\d+)\b",  # CS101
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            if len(match.groups()) == 2:
                return f"{match.group(1).upper()}{match.group(2)}"
            else:
                return match.group(0).upper()

    return None


def truncate_text(text: str, max_length: int = 500) -> str:
    """
    Truncate text to a maximum length, ending at a word boundary.

    Args:
        text: Text to truncate
        max_length: Maximum length of truncated text

    Returns:
        Truncated text
    """
    if len(text) <= max_length:
        return text

    # Truncate at word boundary
    truncated = text[:max_length].rsplit(" ", 1)[0]
    return truncated + "..."


def extract_summary(text: str, max_length: int = 300) -> str:
    """
    Extract a summary from the beginning of the text.

    Args:
        text: Full text content
        max_length: Maximum length for summary

    Returns:
        Summary text
    """
    # Clean the text first
    text = clean_text(text)

    # Try to extract first paragraph or sentences
    paragraphs = text.split("\n")
    summary = paragraphs[0] if paragraphs else text

    # Truncate if necessary
    return truncate_text(summary, max_length)
