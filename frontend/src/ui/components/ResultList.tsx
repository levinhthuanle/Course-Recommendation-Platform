type Result = {
  id: string
  course_code?: string
  title?: string
  summary?: string
}

type Translations = {
  loading: string
  noResults: string
  coursesFound: string
}

const truncate = (text?: string, max = 300) => {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max) + '…' : t
}

export function ResultList({ 
  results, 
  loading,
  onCourseClick,
  translations = {
    loading: 'Searching...',
    noResults: 'No results found. Try a different query.',
    coursesFound: 'course(s) found'
  }
}: { 
  results: Result[]; 
  loading: boolean;
  onCourseClick?: (id: string) => void;
  translations?: Translations
}) {
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>{translations.loading}</span>
      </div>
    )
  }

  if (!results?.length) {
    return (
      <div className="empty">
        <p>{translations.noResults}</p>
      </div>
    )
  }

  return (
    <div className="results">
      <div className="resultsCount">{results.length} {translations.coursesFound}</div>
      {results.map((r) => (
        <article 
          key={r.id} 
          className="card" 
          onClick={() => onCourseClick?.(r.id)}
          style={{ cursor: onCourseClick ? 'pointer' : 'default' }}
        >
          <div className="cardHeader">
            <span className="code">{r.course_code || '—'}</span>
            {onCourseClick && (
              <span className="viewDetail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </span>
            )}
          </div>
          <h3 className="title">{truncate(r.title, 120)}</h3>
          <p className="summary">{truncate(r.summary, 280)}</p>
        </article>
      ))}
    </div>
  )
}
