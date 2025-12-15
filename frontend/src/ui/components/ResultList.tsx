type Result = {
  id: string
  course_code?: string
  title?: string
  summary?: string
}

const truncate = (text?: string, max = 300) => {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max) + '…' : t
}

export function ResultList({ results, loading }: { results: Result[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Searching...</span>
      </div>
    )
  }

  if (!results?.length) {
    return (
      <div className="empty">
        <p>No results found. Try a different query.</p>
      </div>
    )
  }

  return (
    <div className="results">
      <div className="resultsCount">{results.length} course{results.length !== 1 ? 's' : ''} found</div>
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
