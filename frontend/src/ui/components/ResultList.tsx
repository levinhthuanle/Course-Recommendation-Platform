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
  translations = {
    loading: 'Searching...',
    noResults: 'No results found. Try a different query.',
    coursesFound: 'course(s) found'
  }
}: { 
  results: Result[]; 
  loading: boolean;
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
        <article key={r.id} className="card">
          <div className="cardHeader">
            <span className="code">{r.course_code || '—'}</span>
          </div>
          <h3 className="title">{truncate(r.title, 120)}</h3>
          <p className="summary">{truncate(r.summary, 280)}</p>
        </article>
      ))}
    </div>
  )
}
