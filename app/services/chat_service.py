"""Chat service using Gemini API with RAG for course Q&A."""

import logging
import re
from typing import List, Dict, Optional, Set
import google.generativeai as genai

from app.core.config import Settings
from app.services.search_service import SearchService

logger = logging.getLogger(__name__)


class ChatService:
    """Service for AI-powered course Q&A using Gemini and RAG."""

    # Vietnamese to English keyword mapping for common academic terms
    KEYWORD_MAP = {
        # Programming
        "lập trình": ["programming", "computer science", "coding"],
        "lập trình cơ bản": ["CS161"],
        "lập trình nâng cao": ["advanced programming", "data structures", "algorithms"],
        "cấu trúc dữ liệu": ["data structures", "algorithms"],
        "giải thuật": ["algorithms", "algorithm design"],
        "thuật toán": ["algorithms", "algorithm"],
        
        # Math
        "toán": ["mathematics", "math", "calculus", "algebra", "discrete"],
        "toán cao cấp": ["calculus", "advanced mathematics"],
        "giải tích": ["calculus", "analysis"],
        "đại số": ["algebra", "linear algebra"],
        "xác suất": ["probability", "statistics"],
        "thống kê": ["statistics", "probability"],
        "toán rời rạc": ["discrete mathematics", "discrete math"],
        
        # Physics
        "vật lý": ["physics", "mechanics", "thermodynamics"],
        "cơ học": ["mechanics", "physics"],
        "điện từ": ["electromagnetism", "electromagnetic"],
        
        # CS Topics
        "trí tuệ nhân tạo": ["artificial intelligence", "AI", "machine learning"],
        "học máy": ["machine learning", "ML", "deep learning"],
        "mạng máy tính": ["computer networks", "networking"],
        "cơ sở dữ liệu": ["database", "SQL", "data management"],
        "hệ điều hành": ["operating systems", "OS"],
        "web": ["web development", "web programming", "frontend", "backend"],
        "di động": ["mobile development", "android", "iOS"],
        "bảo mật": ["security", "cryptography", "cybersecurity"],
        "đồ họa": ["graphics", "computer graphics", "visualization"],
        
        # General
        "cơ bản": ["introduction", "fundamentals", "basics", "101"],
        "nâng cao": ["advanced", "senior", "400", "500"],
        "nhập môn": ["introduction", "intro", "101", "fundamentals"],
    }

    def __init__(self, settings: Settings, search_service: SearchService):
        """
        Initialize the chat service.

        Args:
            settings: Application settings
            search_service: Search service for retrieving course context
        """
        self.settings = settings
        self.search_service = search_service
        self.model = None
        self._initialize_gemini()

    def _initialize_gemini(self) -> None:
        """Initialize Gemini API client."""
        api_key = self.settings.gemini_api_key
        if not api_key:
            logger.warning("Gemini API key not configured. Chat will not work.")
            return

        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(self.settings.gemini_model)
            logger.info(f"Gemini initialized with model: {self.settings.gemini_model}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
            self.model = None

    def _extract_course_codes(self, query: str) -> List[str]:
        """
        Extract course codes from user query.
        
        Examples:
            "mô tả rõ hơn khoá CS161" -> ["CS161"]
            "so sánh CS161 và CS162" -> ["CS161", "CS162"]
            "CSC10102 là gì" -> ["CSC10102"]
        """
        # Pattern for course codes: 2-5 letters + 2-6 digits + optional letter
        pattern = r'\b([A-Z]{2,5}\s*\d{2,6}[A-Z]?)\b'
        matches = re.findall(pattern, query.upper())
        # Remove spaces within course codes
        codes = [re.sub(r'\s+', '', code) for code in matches]
        if codes:
            logger.info(f"Extracted course codes from query: {codes}")
        return codes

    def _expand_query(self, query: str) -> List[str]:
        """
        Expand Vietnamese query to include English equivalents.
        
        Args:
            query: Original user query
            
        Returns:
            List of search queries (original + expanded)
        """
        queries = []
        
        # First, extract any course codes mentioned
        course_codes = self._extract_course_codes(query)
        queries.extend(course_codes)
        
        # Add original query
        queries.append(query)
        
        query_lower = query.lower()
        
        # Check each keyword mapping
        for vn_term, en_terms in self.KEYWORD_MAP.items():
            if vn_term in query_lower:
                queries.extend(en_terms)
        
        # Remove duplicates while preserving order
        seen: Set[str] = set()
        unique_queries = []
        for q in queries:
            if q.lower() not in seen:
                seen.add(q.lower())
                unique_queries.append(q)
        
        logger.info(f"Expanded query '{query}' to: {unique_queries}")
        return unique_queries

    async def _translate_query_with_gemini(self, query: str) -> str:
        """
        Use Gemini to translate/expand query to English search terms.
        
        Args:
            query: Original user query
            
        Returns:
            English search keywords
        """
        if not self.model:
            return query
            
        try:
            prompt = f"""Translate the following Vietnamese question about university courses into English search keywords.
Only return the keywords, no explanation. If already in English, just return relevant search terms.

Question: {query}

English keywords:"""
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=50,
                )
            )
            
            if response.text:
                translated = response.text.strip()
                logger.info(f"Gemini translated '{query}' to '{translated}'")
                return translated
        except Exception as e:
            logger.error(f"Translation error: {e}")
        
        return query

    def _retrieve_context(self, queries: List[str], limit: int = 5) -> str:
        """
        Retrieve relevant course information as context for the LLM.

        Args:
            queries: List of search queries (original + expanded)
            limit: Number of courses to retrieve per query

        Returns:
            Formatted context string with course information
        """
        try:
            # Collect unique courses from all queries
            seen_ids: Set[str] = set()
            all_courses = []
            
            for q in queries[:5]:  # Limit to 5 queries to avoid too many searches
                results = self.search_service.search(query=q, limit=limit)
                for course in results.hits:
                    course_id = getattr(course, 'id', None) or f"{course.course_code}_{course.title}"
                    if course_id not in seen_ids:
                        seen_ids.add(course_id)
                        all_courses.append(course)
            
            if not all_courses:
                return "Không tìm thấy khóa học liên quan trong cơ sở dữ liệu."

            context_parts = [f"Dưới đây là thông tin {len(all_courses)} khóa học liên quan:\n"]
            
            for i, course in enumerate(all_courses[:10], 1):  # Limit to 10 courses
                course_info = f"""
---
**Khóa học {i}:**
- Mã môn: {course.course_code or 'N/A'}
- Tên môn: {course.title or 'N/A'}
- Mô tả: {course.summary or 'Không có mô tả'}
"""
                # Include full content if available (truncated)
                if hasattr(course, 'content') and course.content:
                    content_preview = course.content[:800] + "..." if len(course.content) > 800 else course.content
                    course_info += f"- Nội dung chi tiết: {content_preview}\n"
                
                context_parts.append(course_info)

            return "\n".join(context_parts)

        except Exception as e:
            logger.error(f"Error retrieving context: {e}")
            return "Không thể truy xuất thông tin khóa học."

    def _build_prompt(self, user_message: str, context: str, chat_history: List[Dict]) -> str:
        """
        Build the prompt for Gemini with context and history.

        Args:
            user_message: Current user message
            context: Retrieved course information
            chat_history: Previous messages in the conversation

        Returns:
            Complete prompt string
        """
        system_prompt = """Bạn là trợ lý AI chuyên tư vấn về các khóa học của trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM (HCMUS).

Nhiệm vụ của bạn:
1. Trả lời câu hỏi về các khóa học dựa trên thông tin được cung cấp
2. Đề xuất khóa học phù hợp với nhu cầu của sinh viên
3. Giải thích nội dung, yêu cầu tiên quyết của các môn học
4. So sánh các khóa học khi được yêu cầu

Quy tắc:
- Chỉ trả lời dựa trên thông tin được cung cấp
- Nếu không có thông tin, hãy nói rõ là không biết
- Trả lời ngắn gọn, rõ ràng
- Sử dụng tiếng Việt hoặc tiếng Anh tùy theo ngôn ngữ của câu hỏi
- Đề cập mã môn học khi nói về một khóa học cụ thể
"""

        # Build conversation history
        history_text = ""
        if chat_history:
            history_text = "\n\nLịch sử cuộc trò chuyện:\n"
            for msg in chat_history[-6:]:  # Last 6 messages for context
                role = "Người dùng" if msg.get("role") == "user" else "Trợ lý"
                history_text += f"{role}: {msg.get('content', '')}\n"

        full_prompt = f"""{system_prompt}

{context}
{history_text}

Câu hỏi hiện tại: {user_message}

Trả lời:"""

        return full_prompt

    async def chat(
        self,
        message: str,
        chat_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Process a chat message and return AI response.

        Args:
            message: User's message
            chat_history: Previous messages in the conversation

        Returns:
            AI-generated response
        """
        if not self.model:
            return "Xin lỗi, dịch vụ chat chưa được cấu hình. Vui lòng kiểm tra API key của Gemini."

        chat_history = chat_history or []

        try:
            # Step 1: Expand query (Vietnamese to English mapping)
            expanded_queries = self._expand_query(message)
            
            # Step 2: If no expansion found, use Gemini to translate
            if len(expanded_queries) == 1:
                translated = await self._translate_query_with_gemini(message)
                if translated.lower() != message.lower():
                    expanded_queries.append(translated)
            
            # Step 3: Retrieve relevant course information
            context = self._retrieve_context(expanded_queries)
            
            # Step 4: Build prompt with context
            prompt = self._build_prompt(message, context, chat_history)
            
            # Step 5: Generate response from Gemini
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=1024,
                )
            )

            if response.text:
                return response.text.strip()
            else:
                return "Xin lỗi, tôi không thể tạo câu trả lời. Vui lòng thử lại."

        except Exception as e:
            logger.error(f"Chat error: {e}")
            return f"Đã xảy ra lỗi: {str(e)}. Vui lòng thử lại sau."

    def is_available(self) -> bool:
        """Check if chat service is properly configured."""
        return self.model is not None
