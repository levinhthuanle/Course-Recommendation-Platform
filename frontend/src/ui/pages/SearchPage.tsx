import { SearchBar } from '../components/SearchBar'
import { ResultList } from '../components/ResultList'
import { ExportButtons } from '../components/ExportButtons'
import type { Translation } from '../i18n/translations'
import type { Hit } from '../types'

type Props = {
  canSearch: boolean
  error: string | null
  limit: number
  loading: boolean
  query: string
  results: Hit[]
  semanticRatio: number
  t: Translation
  onCourseClick: (courseId: string) => void
  onLimitChange: (value: number) => void
  onQueryChange: (value: string) => void
  onSearch: () => void
  onSemanticRatioChange: (value: number) => void
}

export function SearchPage({
  canSearch,
  error,
  limit,
  loading,
  query,
  results,
  semanticRatio,
  t,
  onCourseClick,
  onLimitChange,
  onQueryChange,
  onSearch,
  onSemanticRatioChange
}: Props) {
  return (
    <>
      <header className="header">
        <div className="heroIcon">CF</div>
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
      />

      {error && <div className="error">{error}</div>}

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
          coursesFound: t.coursesFound
        }}
      />
    </>
  )
}
