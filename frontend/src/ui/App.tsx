import { useState } from 'react'
import { CourseDetailModal } from './components/CourseDetailModal'
import { useAdminDashboard } from './hooks/useAdminDashboard'
import { useAuth } from './hooks/useAuth'
import { useChat } from './hooks/useChat'
import { useCourseModal } from './hooks/useCourseModal'
import { useDocumentPreferences } from './hooks/useDocumentPreferences'
import { useFavorites } from './hooks/useFavorites'
import { useSearch } from './hooks/useSearch'
import { translations } from './i18n/translations'
import { AppShell } from './layout/AppShell'
import { AdminPage } from './pages/AdminPage'
import { AuthPage } from './pages/AuthPage'
import { ChatPage } from './pages/ChatPage'
import { HomePage } from './pages/HomePage'
import { SearchPage } from './pages/SearchPage'
import type { Mode, Theme } from './types'

export default function App() {
  const [mode, setMode] = useState<Mode>('home')
  const [theme, setTheme] = useState<Theme>('light')

  const t = translations
  const auth = useAuth()
  const search = useSearch()
  const courseModal = useCourseModal()
  const chat = useChat(auth.currentUser)
  const favorites = useFavorites(auth.currentUser)
  const admin = useAdminDashboard(mode, auth.currentUser)

  useDocumentPreferences(theme)

  const changeMode = (nextMode: Mode) => setMode(nextMode)

  const logout = () => {
    auth.logout()
    setMode('home')
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const askAboutFavorites = () => {
    if (!favorites.favorites.length) return
    const courseList = favorites.favorites
      .map((course) => `${course.course_code || 'Course'} - ${course.title || 'Untitled course'}`)
      .join('\n')
    setMode('chat')
    void chat.submitChat(`Please advise me based on these saved courses:\n${courseList}\n\nCompare them and suggest a good learning plan.`)
  }

  return (
    <AppShell
      currentUser={auth.currentUser}
      mode={mode}
      theme={theme}
      t={t}
      onChangeMode={changeMode}
      onLogout={logout}
      onToggleTheme={toggleTheme}
    >
      <div className={`container ${mode === 'chat' ? 'chatMode' : ''}`}>
        {!auth.currentUser ? (
          <AuthPage
            authEmail={auth.authEmail}
            authError={auth.authError}
            authLoading={auth.authLoading}
            authMode={auth.authMode}
            authPassword={auth.authPassword}
            t={t}
            onAuthEmailChange={auth.setAuthEmail}
            onAuthModeChange={auth.setAuthMode}
            onAuthPasswordChange={auth.setAuthPassword}
            onSubmit={auth.submitAuth}
          />
        ) : mode === 'home' ? (
          <HomePage t={t} onOpenChat={() => changeMode('chat')} onOpenSearch={() => changeMode('search')} />
        ) : mode === 'search' ? (
          <SearchPage
            canSearch={search.canSearch}
            error={search.error}
            limit={search.limit}
            loading={search.loading}
            query={search.query}
            results={search.results}
            semanticRatio={search.semanticRatio}
            suggestions={search.suggestions}
            suggestionsLoading={search.suggestionsLoading}
            favorites={favorites.favorites}
            favoritesLoading={favorites.favoritesLoading}
            favoritesError={favorites.favoritesError}
            favoriteIds={favorites.favoriteIds}
            t={t}
            onAskFavorites={askAboutFavorites}
            onCourseClick={courseModal.openCourse}
            onLimitChange={search.setLimit}
            onQueryChange={search.setQuery}
            onSearch={() => search.search()}
            onSemanticRatioChange={search.setSemanticRatio}
            onSuggestionSelect={(value) => {
              search.setQuery(value)
              void search.search(value)
            }}
            onToggleFavorite={favorites.toggleFavorite}
            onRemoveFavorite={favorites.removeFavorite}
          />
        ) : mode === 'admin' ? (
          <AdminPage
            adminFiles={admin.adminFiles}
            adminFilesLoading={admin.adminFilesLoading}
            adminMessage={admin.adminMessage}
            adminStats={admin.adminStats}
            adminUsage={admin.adminUsage}
            ingestLoading={admin.ingestLoading}
            t={t}
            uploadFile={admin.uploadFile}
            uploadLoading={admin.uploadLoading}
            onClearIndex={admin.clearIndex}
            onDeleteFile={admin.deleteFile}
            onIngestAll={admin.ingestAll}
            onUploadFileChange={admin.setUploadFile}
            onUploadPdf={admin.uploadPdf}
          />
        ) : (
          <ChatPage
            activeThreadId={chat.activeThreadId}
            chatLoading={chat.chatLoading}
            chatThreadsLoading={chat.chatThreadsLoading}
            messages={chat.chatMessages}
            threads={chat.chatThreads}
            t={t}
            onDeleteThread={chat.deleteThread}
            onNewChat={chat.createNewChat}
            onSelectThread={chat.selectThread}
            onSubmit={chat.submitChat}
          />
        )}
      </div>

      {courseModal.showModal && (
        <CourseDetailModal
          course={courseModal.selectedCourse}
          loading={courseModal.modalLoading}
          onClose={courseModal.closeModal}
          translations={{
            close: t.close,
            generalInfo: t.generalInfo,
            courseId: t.courseId,
            courseNameEn: t.courseNameEn,
            courseNameVi: t.courseNameVi,
            relationToCurriculum: t.relationToCurriculum,
            creditPoints: t.creditPoints,
            priorCourses: t.priorCourses,
            courseDescription: t.courseDescription,
            courseGoals: t.courseGoals,
            requiredReading: t.requiredReading,
            fullContent: t.fullContent
          }}
        />
      )}
    </AppShell>
  )
}
