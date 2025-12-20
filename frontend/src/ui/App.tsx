import { useMemo, useState, useEffect } from 'react'
import { SearchBar } from './components/SearchBar'
import { ResultList } from './components/ResultList'
import { CourseDetailModal } from './components/CourseDetailModal'
import { ExportButtons } from './components/ExportButtons'
import { api } from '../utils/api'

type Hit = {
  id: string
  course_code?: string
  title?: string
  summary?: string
}

type CourseDetail = {
  id: string
  course_code: string
  title: string
  summary: string
  content: string
}

type Mode = 'search' | 'chat'
type Theme = 'light' | 'dark'
type Language = 'vi' | 'en'

const translations = {
  vi: {
    logoTitle: 'Course Finder',
    logoSubtitle: 'by HCMUS',
    search: 'Tìm kiếm',
    chatBot: 'Chat Bot',
    searchTitle: 'Tìm Kiếm Khóa Học Thông Minh',
    searchSubtitle: 'Được hỗ trợ bởi AI tiên tiến nhất. Tìm kiếm khóa học phù hợp với bạn trong vài giây.',
    chatTitle: 'Chat Bot Tư Vấn Khóa Học',
    chatSubtitle: 'Trò chuyện với AI để tìm khóa học phù hợp nhất cho bạn.',
    searchPlaceholder: 'Tìm kiếm khóa học...',
    searchButton: 'Tìm kiếm',
    chatPlaceholder: 'Nhập câu hỏi của bạn...',
    chatWelcome: '👋 Xin chào! Tôi có thể giúp gì cho bạn?',
    chatResponse: 'Xin chào! Tôi là trợ lý AI giúp bạn tìm kiếm khóa học. Bạn muốn tìm khóa học gì?',
    suggestion1: 'Học Machine Learning',
    suggestion2: 'Web Development',
    suggestion3: 'Khóa học cho người mới',
    feature1: '20+ Khóa học',
    feature2: 'Tìm kiếm nhanh chóng',
    feature3: 'AI thông minh',
    loading: 'Đang tìm kiếm...',
    noResults: 'Không tìm thấy kết quả. Thử từ khóa khác.',
    coursesFound: 'khóa học được tìm thấy',
    // Modal translations
    close: 'Đóng',
    courseCode: 'Mã môn',
    description: 'Mô tả',
    fullContent: 'Nội dung chi tiết',
    copyCode: 'Sao chép mã',
    copied: 'Đã sao chép!',
    // Export translations
    exportPDF: 'Xuất PDF',
    exportExcel: 'Xuất Excel',
    exporting: 'Đang xuất...',
    courseName: 'Tên khóa học',
    sheetName: 'Khóa học'
  },
  en: {
    logoTitle: 'Course Finder',
    logoSubtitle: 'by HCMUS',
    search: 'Search',
    chatBot: 'Chat Bot',
    searchTitle: 'Smart Course Search',
    searchSubtitle: 'Powered by the most advanced AI. Find the perfect course for you in seconds.',
    chatTitle: 'Course Advisor Chat Bot',
    chatSubtitle: 'Chat with AI to find the most suitable course for you.',
    searchPlaceholder: 'Search courses...',
    searchButton: 'Search',
    chatPlaceholder: 'Type your question...',
    chatWelcome: '👋 Hello! How can I help you?',
    chatResponse: 'Hello! I am an AI assistant to help you find courses. What course are you looking for?',
    suggestion1: 'Learn Machine Learning',
    suggestion2: 'Web Development',
    suggestion3: 'Courses for Beginners',
    feature1: '20+ Courses',
    feature2: 'Fast Search',
    feature3: 'Smart AI',
    loading: 'Searching...',
    noResults: 'No results found. Try a different query.',
    coursesFound: 'course(s) found',
    // Modal translations
    close: 'Close',
    courseCode: 'Course Code',
    description: 'Description',
    fullContent: 'Full Content',
    copyCode: 'Copy Code',
    copied: 'Copied!',
    // Export translations
    exportPDF: 'Export PDF',
    exportExcel: 'Export Excel',
    exporting: 'Exporting...',
    courseName: 'Course Name',
    sheetName: 'Courses'
  }
}

const cleanText = (text?: string) => (text || '').replace(/\s+/g, ' ').trim()

// Filter out incorrectly parsed results (generic syllabus entries)
const isValidResult = (title?: string, code?: string): boolean => {
  const t = (title || '').toLowerCase()
  const c = (code || '').toLowerCase()
  // Skip if title looks like a generic syllabus entry
  if (t.includes('syllabus') || t.includes('apcs')) return false
  // Skip if course code is clearly wrong
  if (c.includes('syllabus') || c.includes('apcs')) return false
  return true
}

export default function App() {
  const [mode, setMode] = useState<Mode>('search')
  const [theme, setTheme] = useState<Theme>('light')
  const [language, setLanguage] = useState<Language>('vi')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  
  // Modal state
  const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const t = translations[language]
  const canSearch = useMemo(() => query.trim().length > 0, [query])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('lang', language)
  }, [language])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const changeLanguage = (lang: Language) => {
    setLanguage(lang)
  }

  const doSearch = async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.search(q, 20)
      const next: Hit[] = (data.hits || [])
        .map((h: any) => ({
          id: String(h.id ?? ''),
          course_code: cleanText(h.course_code),
          title: cleanText(h.title),
          summary: cleanText(h.summary)
        }))
        .filter((h: Hit) => isValidResult(h.title, h.course_code))
      setResults(next)
    } catch (e: any) {
      setError(e?.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCourseClick = async (courseId: string) => {
    setShowModal(true)
    setModalLoading(true)
    setSelectedCourse(null)
    try {
      const course = await api.getCourse(courseId)
      setSelectedCourse(course)
    } catch (e: any) {
      console.error('Failed to load course:', e)
    } finally {
      setModalLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedCourse(null)
  }

  const [chatLoading, setChatLoading] = useState(false)

  const handleChatSubmit = async (message: string) => {
    if (!message.trim() || chatLoading) return
    
    const userMessage = { role: 'user' as const, content: message }
    setChatMessages(prev => [...prev, userMessage])
    setChatLoading(true)
    
    try {
      const response = await api.chat(message, chatMessages)
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.message
      }])
    } catch (e: any) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Xin lỗi, đã xảy ra lỗi: ${e?.message || 'Không thể kết nối đến server'}`
      }])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="app">
      {/* Floating Dots */}
      <div className="floatingDot" style={{
        width: '8px',
        height: '8px',
        background: '#FFD042',
        top: '15%',
        left: '10%',
        animationDelay: '0s',
        animationDuration: '25s'
      }}></div>
      <div className="floatingDot" style={{
        width: '6px',
        height: '6px',
        background: '#3B82F6',
        top: '60%',
        left: '85%',
        animationDelay: '2s',
        animationDuration: '20s'
      }}></div>
      <div className="floatingDot" style={{
        width: '10px',
        height: '10px',
        background: '#8B5CF6',
        top: '80%',
        left: '15%',
        animationDelay: '4s',
        animationDuration: '30s'
      }}></div>
      <div className="floatingDot" style={{
        width: '7px',
        height: '7px',
        background: '#10B981',
        top: '30%',
        left: '90%',
        animationDelay: '1s',
        animationDuration: '22s'
      }}></div>
      <div className="floatingDot" style={{
        width: '9px',
        height: '9px',
        background: '#F59E0B',
        top: '50%',
        left: '5%',
        animationDelay: '3s',
        animationDuration: '28s'
      }}></div>
      <div className="floatingDot" style={{
        width: '5px',
        height: '5px',
        background: '#EC4899',
        top: '20%',
        left: '75%',
        animationDelay: '5s',
        animationDuration: '18s'
      }}></div>

      {/* App Bar */}
      <nav className="appBar">
        <div className="appBarContent">
          <div className="appBarLeft">
            <div className="logo">
              <div className="logoIcon">🎓</div>
              <div className="logoText">
                <div className="logoTitle">{t.logoTitle}</div>
                <div className="logoSubtitle">{t.logoSubtitle}</div>
              </div>
            </div>
          </div>

          <div className="appBarCenter">
            <button 
              className={`modeButton ${mode === 'search' ? 'active' : ''}`}
              onClick={() => setMode('search')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              {t.search}
            </button>
            <button 
              className={`modeButton ${mode === 'chat' ? 'active' : ''}`}
              onClick={() => setMode('chat')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {t.chatBot}
            </button>
          </div>

          <div className="appBarRight">
            <button className="iconButton" onClick={toggleTheme}>
              {theme === 'light' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              )}
            </button>
            <select 
              className="langSelect" 
              value={language}
              onChange={(e) => changeLanguage(e.target.value as Language)}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container">
        {mode === 'search' ? (
          <>
            <header className="header">
              <div className="heroIcon">🎓</div>
              <h1>{t.searchTitle}</h1>
              <p>{t.searchSubtitle}</p>
            </header>

            <SearchBar
              value={query}
              onChange={setQuery}
              onSearch={() => doSearch(query)}
              disabled={!canSearch || loading}
              placeholder={t.searchPlaceholder}
              buttonText={t.searchButton}
            />

            {error && <div className="error">{error}</div>}

            {/* Export buttons - show when results exist */}
            {results.length > 0 && !loading && (
              <ExportButtons
                courses={results}
                searchQuery={query}
                translations={{
                  exportPDF: t.exportPDF,
                  exportExcel: t.exportExcel,
                  exporting: t.exporting,
                  courseCode: t.courseCode,
                  courseName: t.courseName,
                  sheetName: t.sheetName
                }}
              />
            )}

            <ResultList 
              results={results} 
              loading={loading} 
              onCourseClick={handleCourseClick}
              translations={{
                loading: t.loading,
                noResults: t.noResults,
                coursesFound: t.coursesFound
              }} 
            />
          </>
        ) : (
          <>
            <header className="header">
              <div className="heroIcon">🎓</div>
              <h1>{t.chatTitle}</h1>
              <p>{t.chatSubtitle}</p>
            </header>

            <div className="chatContainer">
              <div className="chatMessages">
                {chatMessages.length === 0 ? (
                  <div className="chatEmpty">
                    <p>{t.chatWelcome}</p>
                    <div className="chatSuggestions">
                      <button onClick={() => handleChatSubmit(t.suggestion1)}>
                        {t.suggestion1}
                      </button>
                      <button onClick={() => handleChatSubmit(t.suggestion2)}>
                        {t.suggestion2}
                      </button>
                      <button onClick={() => handleChatSubmit(t.suggestion3)}>
                        {t.suggestion3}
                      </button>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chatMessage ${msg.role}`}>
                      <div className="chatMessageContent">{msg.content}</div>
                    </div>
                  ))
                )}
                {chatLoading && (
                  <div className="chatMessage assistant">
                    <div className="chatMessageContent">
                      <span className="typingIndicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="chatInput">
                <input
                  type="text"
                  placeholder={t.chatPlaceholder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleChatSubmit((e.target as HTMLInputElement).value)
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }}
                />
                <button onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement
                  handleChatSubmit(input.value)
                  input.value = ''
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}

        <footer className="footer">
          <div className="footerFeatures">
            <div className="feature">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span>{t.feature1}</span>
            </div>
            <div className="feature">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{t.feature2}</span>
            </div>
            <div className="feature">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              <span>{t.feature3}</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Course Detail Modal */}
      {showModal && (
        <CourseDetailModal
          course={selectedCourse}
          loading={modalLoading}
          onClose={closeModal}
          translations={{
            close: t.close,
            courseCode: t.courseCode,
            description: t.description,
            fullContent: t.fullContent,
            copyCode: t.copyCode,
            copied: t.copied
          }}
        />
      )}
    </div>
  )
}
