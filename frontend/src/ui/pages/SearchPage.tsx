import { SearchBar } from '../components/SearchBar'
import { ResultList } from '../components/ResultList'
import { ExportButtons } from '../components/ExportButtons'
import type { Translation } from '../i18n/translations'
import type { Hit, SearchSuggestion } from '../types'

type Props = {
  canSearch: boolean
  error: string | null
  limit: number
  loading: boolean
  query: string
  results: Hit[]
  semanticRatio: number
  suggestions: SearchSuggestion[]
  suggestionsLoading: boolean
  favorites: Hit[]
  favoritesLoading: boolean
  favoritesError: string | null
  favoriteIds: Set<string>
  t: Translation
  onCourseClick: (courseId: string) => void
  onAskFavorites: () => void
  onLimitChange: (value: number) => void
  onQueryChange: (value: string) => void
  onSearch: () => void
  onSemanticRatioChange: (value: number) => void
  onSuggestionSelect: (value: string) => void
  onToggleFavorite: (course: Hit) => void
  onRemoveFavorite: (courseId: string) => void
}

export function SearchPage({
  canSearch,
  error,
  limit,
  loading,
  query,
  results,
  semanticRatio,
  suggestions,
  suggestionsLoading,
  favorites,
  favoritesLoading,
  favoritesError,
  favoriteIds,
  t,
  onCourseClick,
  onAskFavorites,
  onLimitChange,
  onQueryChange,
  onSearch,
  onSemanticRatioChange,
  onSuggestionSelect,
  onToggleFavorite,
  onRemoveFavorite
}: Props) {
  return (
    <>
      <header className="header">
        <img className="heroIcon" src="/logo.png" alt="" />
        <h1>{t.searchTitle}</h1>
        <p>{t.searchSubtitle}</p>
      </header>

      <SearchBar
        value={query}
        onChange={onQueryChange}
        onSearch={onSearch}
        disabled={!canSearch || loading}
        placeholder={t.searchPlaceholder}
        buttonText={t.searchButton}
        limit={limit}
        onLimitChange={onLimitChange}
        semanticRatio={semanticRatio}
        onSemanticRatioChange={onSemanticRatioChange}
        showAdvanced={true}
        suggestions={suggestions}
        suggestionsLoading={suggestionsLoading}
        onSuggestionSelect={onSuggestionSelect}
      />

      {error && <div className="error">{error}</div>}
      {favoritesError && <div className="error">{favoritesError}</div>}

      <section className="favoritesPanel">
        <div className="favoritesHeader">
          <div>
            <h2>{t.savedCourses}</h2>
            <p>{favoritesLoading ? t.loadingFavorites : `${favorites.length} ${t.savedCoursesCount}`}</p>
          </div>
          <div className="favoritesActions">
            {favorites.length > 0 && (
              <>
                <ExportButtons
                  courses={favorites}
                  searchQuery="Saved Courses"
                  translations={{
                    exportPDF: t.exportPDF,
                    exportExcel: t.exportExcel,
                    exporting: t.exporting,
                    courseCode: t.courseCode,
                    courseName: t.courseName,
                    sheetName: t.sheetName
                  }}
                />
                <button className="askFavoritesButton" type="button" onClick={onAskFavorites}>
                  {t.askSavedCourses}
                </button>
              </>
            )}
          </div>
        </div>
        {favorites.length > 0 && (
          <div className="favoritesList">
            {favorites.map((course) => (
              <button
                key={course.id}
                className="favoritePill"
                type="button"
                onClick={() => onCourseClick(course.id)}
                title={course.title}
              >
                <span>{course.course_code || course.title}</span>
                <i
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveFavorite(course.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation()
                      onRemoveFavorite(course.id)
                    }
                  }}
                  aria-label={t.removeSavedCourse}
                >
                  x
                </i>
              </button>
            ))}
          </div>
        )}
      </section>

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
        onCourseClick={onCourseClick}
        translations={{
          loading: t.loading,
          noResults: t.noResults,
          coursesFound: t.coursesFound,
          saveCourse: t.saveCourse,
          savedCourse: t.savedCourse
        }}
        favoriteIds={favoriteIds}
        onToggleFavorite={onToggleFavorite}
      />
    </>
  )
}
