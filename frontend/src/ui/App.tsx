import { useMemo, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
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
  course_name_en?: string
  course_name_vi?: string
  credit_points?: string
  prior_courses?: string
  course_description?: string
  course_goals?: string[]
}

type User = {
  id: number
  email: string
  role: 'user' | 'admin'
}

type Mode = 'home' | 'search' | 'chat' | 'admin'
type Theme = 'light' | 'dark'
type Language = 'vi' | 'en'

const translations = {
  vi: {
    logoTitle: 'Course Finder',
    logoSubtitle: 'by HCMUS',
    home: 'Trang chủ',
    search: 'Tìm kiếm',
    chatBot: 'Chat Bot',
    homeTitle: 'Chào mừng đến với Course Finder',
    homeSubtitle: 'Tìm kiếm và khám phá các khóa học phù hợp với bạn',
    browseCourse: 'Tìm kiếm khóa học',
    tryAIAssistant: 'Thử trợ lý AI',
    searchTitle: 'Tìm Kiếm Khóa Học Thông Minh',
    searchSubtitle: 'Được hỗ trợ bởi AI tiên tiến nhất. Tìm kiếm khóa học phù hợp với bạn trong vài giây.',
    chatTitle: 'Chat Bot Tư Vấn Khóa Học',
    chatSubtitle: 'Trò chuyện với AI để tìm khóa học phù hợp nhất cho bạn.',
    searchPlaceholder: 'Tìm kiếm khóa học...',
    searchButton: 'Tìm kiếm',
    chatPlaceholder: 'Nhập câu hỏi của bạn...',
    chatWelcome: 'Xin chào!',
    chatWelcomeSubtitle: 'Chúng ta nên bắt đầu từ đâu nhỉ?',
    chatResponse: 'Xin chào! Tôi là trợ lý AI giúp bạn tìm kiếm khóa học. Bạn muốn tìm khóa học gì?',
    suggestion1: 'Tìm khóa học Machine Learning',
    suggestion2: 'Khóa học Web Development',
    suggestion3: 'Khóa học cho người mới bắt đầu',
    suggestion4: 'Giúp tôi tìm khóa học phù hợp',
    suggestion5: 'Tư vấn lộ trình học tập',
    feature1: '20+ Khóa học',
    feature2: 'Tìm kiếm nhanh chóng',
    feature3: 'AI thông minh',
    loading: 'Đang tìm kiếm...',
    noResults: 'Không tìm thấy kết quả. Thử từ khóa khác.',
    coursesFound: 'khóa học được tìm thấy',
    // Modal translations
    close: 'Đóng',
    generalInfo: 'THÔNG TIN CHUNG',
    courseId: 'Mã môn (English)',
    courseNameEn: 'Tên môn (English)',
    courseNameVi: 'Tên môn (Vietnamese)',
    creditPoints: 'Số tín chỉ',
    priorCourses: 'Môn học trước',
    courseDescription: 'MÔ TẢ MÔN HỌC',
    courseGoals: 'MỤC TIÊU MÔN HỌC',
    // Export translations
    exportPDF: 'Xuất PDF',
    exportExcel: 'Xuất Excel',
    exporting: 'Đang xuất...',
    courseCode: 'Mã môn',
    courseName: 'Tên khóa học',
    sheetName: 'Khóa học',
    // Auth/Admin
    loginTitle: 'Đăng nhập',
    registerTitle: 'Đăng ký',
    emailLabel: 'Email',
    passwordLabel: 'Mật khẩu',
    login: 'Đăng nhập',
    register: 'Tạo tài khoản',
    switchToLogin: 'Đã có tài khoản? Đăng nhập',
    switchToRegister: 'Chưa có tài khoản? Đăng ký',
    logout: 'Đăng xuất',
    adminPanel: 'Quản trị',
    ingestAll: 'Ingest all',
    ingesting: 'Ingesting...',
    uploadPdf: 'Upload PDF and ingest',
    uploading: 'Uploading...',
    chooseFile: 'Choose PDF file',
    adminSubtitle: 'Manage ingestion and dataset resources',
    ingestAllDesc: 'Ingest all PDFs in the Resources folder',
    uploadDesc: 'Upload a PDF and ingest immediately',
    ingestedFiles: 'Ingested PDFs',
    noFiles: 'No PDFs found in Resources',
    authLoading: 'Đang xử lý...'
  },
  en: {
    logoTitle: 'Course Finder',
    logoSubtitle: 'by HCMUS',
    home: 'Home',
    search: 'Search',
    chatBot: 'Chat Bot',
    homeTitle: 'Welcome to Course Finder',
    homeSubtitle: 'Discover and explore courses that match your interests',
    browseCourse: 'Browse Course',
    tryAIAssistant: 'Try AI Assistant',
    searchTitle: 'Smart Course Search',
    searchSubtitle: 'Powered by the most advanced AI. Find the perfect course for you in seconds.',
    chatTitle: 'Course Advisor Chat Bot',
    chatSubtitle: 'Chat with AI to find the most suitable course for you.',
    searchPlaceholder: 'Search courses...',
    searchButton: 'Search',
    chatPlaceholder: 'Type your question...',
    chatWelcome: 'Hello!',
    chatWelcomeSubtitle: 'Where should we start?',
    chatResponse: 'Hello! I am an AI assistant to help you find courses. What course are you looking for?',
    suggestion1: 'Find Machine Learning courses',
    suggestion2: 'Web Development courses',
    suggestion3: 'Courses for Beginners',
    suggestion4: 'Help me find suitable courses',
    suggestion5: 'Advise on learning path',
    feature1: '20+ Courses',
    feature2: 'Fast Search',
    feature3: 'Smart AI',
    loading: 'Searching...',
    noResults: 'No results found. Try a different query.',
    coursesFound: 'course(s) found',
    // Modal translations
    close: 'Close',
    generalInfo: 'GENERAL INFORMATION',
    courseId: 'Course ID (English)',
    courseNameEn: 'Course name (English)',
    courseNameVi: 'Course name (Vietnamese)',
    creditPoints: 'Credit points',
    priorCourses: 'Prior course(s)',
    courseDescription: 'COURSE DESCRIPTION',
    courseGoals: 'COURSE GOALS',
    // Export translations
    exportPDF: 'Export PDF',
    exportExcel: 'Export Excel',
    exporting: 'Exporting...',
    courseCode: 'Course Code',
    courseName: 'Course Name',
    sheetName: 'Courses',
    // Auth/Admin
    loginTitle: 'Login',
    registerTitle: 'Register',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    login: 'Login',
    register: 'Create account',
    switchToLogin: 'Already have an account? Login',
    switchToRegister: 'New here? Register',
    logout: 'Logout',
    adminPanel: 'Admin',
    ingestAll: 'Ingest all',
    ingesting: 'Ingesting...',
    uploadPdf: 'Upload PDF and ingest',
    uploading: 'Uploading...',
    chooseFile: 'Choose PDF file',
    adminSubtitle: 'Manage ingestion and dataset resources',
    ingestAllDesc: 'Ingest all PDFs in the Resources folder',
    uploadDesc: 'Upload a PDF and ingest immediately',
    ingestedFiles: 'Ingested PDFs',
    noFiles: 'No PDFs found in Resources',
    authLoading: 'Working...'
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
  const [mode, setMode] = useState<Mode>('home')
  const [theme, setTheme] = useState<Theme>('light')
  const [language, setLanguage] = useState<Language>('en')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [ingestLoading, setIngestLoading] = useState(false)
  const [adminMessage, setAdminMessage] = useState<string | null>(null)
  const [adminFiles, setAdminFiles] = useState<string[]>([])
  const [adminFilesLoading, setAdminFilesLoading] = useState(false)
  
  // Advanced search options
  const [limit, setLimit] = useState(20)
  const [semanticRatio, setSemanticRatio] = useState(0.5)
  
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

  useEffect(() => {
    if (mode !== 'admin' || currentUser?.role !== 'admin') return
    setAdminFilesLoading(true)
    api.listIngestedFiles()
      .then((res) => setAdminFiles(res.files || []))
      .catch(() => setAdminFiles([]))
      .finally(() => setAdminFilesLoading(false))
  }, [mode, currentUser])

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    api.me()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        localStorage.removeItem('auth_token')
        setCurrentUser(null)
      })
  }, [])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const changeLanguage = (lang: Language) => {
    setLanguage(lang)
  }

  const handleAuthSubmit = async () => {
    const email = authEmail.trim()
    const password = authPassword.trim()
    if (!email || !password) return
    setAuthLoading(true)
    setAuthError(null)
    try {
      const response = authMode === 'login'
        ? await api.login(email, password)
        : await api.register(email, password)
      localStorage.setItem('auth_token', response.access_token)
      setCurrentUser(response.user)
      setAuthPassword('')
    } catch (e: any) {
      setAuthError(e?.message || 'Auth failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setCurrentUser(null)
    setMode('home')
  }

  const handleIngestAll = async () => {
    setIngestLoading(true)
    setAdminMessage(null)
    try {
      const res = await api.ingest(true)
      setAdminMessage(res?.message || 'Ingest completed')
    } catch (e: any) {
      setAdminMessage(e?.message || 'Ingest failed')
    } finally {
      setIngestLoading(false)
    }
  }

  const handleUploadPdf = async () => {
    if (!uploadFile) return
    setUploadLoading(true)
    setAdminMessage(null)
    try {
      const res = await api.uploadPdf(uploadFile)
      setAdminMessage(res?.message || 'Upload completed')
      setUploadFile(null)
    } catch (e: any) {
      setAdminMessage(e?.message || 'Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }

  const doSearch = async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.search(q, limit, semanticRatio)
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
              className={`modeButton ${mode === 'home' ? 'active' : ''}`}
              onClick={() => setMode('home')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              {t.home}
            </button>
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
            {currentUser?.role === 'admin' && (
              <button 
                className={`modeButton ${mode === 'admin' ? 'active' : ''}`}
                onClick={() => setMode('admin')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1v4"/>
                  <path d="M12 19v4"/>
                  <path d="M4.22 4.22l2.83 2.83"/>
                  <path d="M16.95 16.95l2.83 2.83"/>
                  <path d="M1 12h4"/>
                  <path d="M19 12h4"/>
                  <path d="M4.22 19.78l2.83-2.83"/>
                  <path d="M16.95 7.05l2.83-2.83"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {t.adminPanel}
              </button>
            )}
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
            {currentUser && (
              <div className="userMenu">
                <span className="userEmail">{currentUser.email}</span>
                <button className="logoutButton" onClick={handleLogout}>
                  {t.logout}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className={`container ${mode === 'chat' ? 'chatMode' : ''}`}>
        {!currentUser ? (
          <div className="authWrapper">
            <div className="authLayout">
              <div className="authHero">
                <div className="authBadge">HCMUS FIT</div>
                <h2>{t.logoTitle}</h2>
                <p>{t.homeSubtitle}</p>
                <div className="authHighlights">
                  <span>{t.feature1}</span>
                  <span>{t.feature2}</span>
                  <span>{t.feature3}</span>
                </div>
              </div>
              <div className="authCard">
                <div className="authTabs">
                  <button
                    className={authMode === 'login' ? 'active' : ''}
                    onClick={() => setAuthMode('login')}
                  >
                    {t.loginTitle}
                  </button>
                  <button
                    className={authMode === 'register' ? 'active' : ''}
                    onClick={() => setAuthMode('register')}
                  >
                    {t.registerTitle}
                  </button>
                </div>
                <h3>{authMode === 'login' ? t.loginTitle : t.registerTitle}</h3>
                <label className="authField">
                  <span>{t.emailLabel}</span>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@hcmus.edu.vn"
                  />
                </label>
                <label className="authField">
                  <span>{t.passwordLabel}</span>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>
                {authError && <div className="authError">{authError}</div>}
                <button
                  className="authSubmit"
                  onClick={handleAuthSubmit}
                  disabled={authLoading}
                >
                  {authLoading ? t.authLoading : authMode === 'login' ? t.login : t.register}
                </button>
                <button
                  className="authToggle"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                >
                  {authMode === 'login' ? t.switchToRegister : t.switchToLogin}
                </button>
              </div>
            </div>
          </div>
        ) : mode === 'home' ? (
          <>
            <header className="header">
              <div className="heroIcon">🎓</div>
              <h1>{t.homeTitle}</h1>
              <p>{t.homeSubtitle}</p>
            </header>

            <div className="homeButtons">
              <button 
                className="homeButton primary"
                onClick={() => setMode('search')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                {t.browseCourse}
              </button>
              <button 
                className="homeButton secondary"
                onClick={() => setMode('chat')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {t.tryAIAssistant}
              </button>
            </div>
          </>
        ) : mode === 'search' ? (
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
              limit={limit}
              onLimitChange={setLimit}
              semanticRatio={semanticRatio}
              onSemanticRatioChange={setSemanticRatio}
              showAdvanced={true}
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
        ) : mode === 'admin' ? (
          <div className="adminPanel">
            <div className="adminHeader">
              <div>
                <h2>{t.adminPanel}</h2>
                <p>{t.adminSubtitle}</p>
              </div>
            </div>
            <div className="adminActions">
              <div className="adminCard">
                <h3>{t.ingestAll}</h3>
                <p>{t.ingestAllDesc}</p>
                <button onClick={handleIngestAll} disabled={ingestLoading}>
                  {ingestLoading ? t.ingesting : t.ingestAll}
                </button>
              </div>
              <div className="adminCard adminUpload">
                <h3>{t.uploadPdf}</h3>
                <p>{t.uploadDesc}</p>
                <label className="uploadDrop">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <div className="uploadIcon">📄</div>
                  <div>
                    <strong>{t.chooseFile}</strong>
                    <span>{uploadFile ? uploadFile.name : 'PDF (A4) 1 course/trang'}</span>
                  </div>
                </label>
                <button onClick={handleUploadPdf} disabled={!uploadFile || uploadLoading}>
                  {uploadLoading ? t.uploading : t.uploadPdf}
                </button>
              </div>
              <div className="adminCard adminFiles">
                <h3>{t.ingestedFiles}</h3>
                {adminFilesLoading ? (
                  <div className="adminFilesEmpty">Loading...</div>
                ) : adminFiles.length === 0 ? (
                  <div className="adminFilesEmpty">{t.noFiles}</div>
                ) : (
                  <ul className="adminFilesList">
                    {adminFiles.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {adminMessage && <div className="adminMessage">{adminMessage}</div>}
          </div>
        ) : (
            <div className="chatContainer">
              <div className={`chatMessages ${chatMessages.length > 0 ? 'hasMessages' : ''}`}>
                {chatMessages.length === 0 ? (
                  <div className="chatEmpty">
                    <div className="chatWelcomeMessage">
                      <div className="welcomeIcon">⭐</div>
                      <h2 className="welcomeTitle">{t.chatWelcome}</h2>
                      <p className="welcomeSubtitle">{t.chatWelcomeSubtitle}</p>
                    </div>
                    <div className="chatSuggestions">
                      <div className="suggestionRow">
                        <button className="suggestionChip" onClick={() => handleChatSubmit(t.suggestion1)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                          </svg>
                          {t.suggestion1}
                        </button>
                        <button className="suggestionChip" onClick={() => handleChatSubmit(t.suggestion2)}>
                          {t.suggestion2}
                        </button>
                        <button className="suggestionChip" onClick={() => handleChatSubmit(t.suggestion3)}>
                          {t.suggestion3}
                        </button>
                        <button className="suggestionChip" onClick={() => handleChatSubmit(t.suggestion4)}>
                          {t.suggestion4}
                        </button>
                      </div>
                      <div className="suggestionRow">
                        <button className="suggestionChip" onClick={() => handleChatSubmit(t.suggestion5)}>
                          {t.suggestion5}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chatMessage ${msg.role}`}>
                      <div className="chatMessageContent">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
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
              <div className={`chatInput ${chatMessages.length > 0 ? 'hasMessages' : ''}`}>
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
        )}

      </div>

      {/* Course Detail Modal */}
      {showModal && (
        <CourseDetailModal
          course={selectedCourse}
          loading={modalLoading}
          onClose={closeModal}
          translations={{
            close: t.close,
            generalInfo: t.generalInfo,
            courseId: t.courseId,
            courseNameEn: t.courseNameEn,
            courseNameVi: t.courseNameVi,
            creditPoints: t.creditPoints,
            priorCourses: t.priorCourses,
            courseDescription: t.courseDescription,
            courseGoals: t.courseGoals
          }}
        />
      )}
    </div>
  )
}
