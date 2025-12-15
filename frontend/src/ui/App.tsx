import { useMemo, useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { ResultList } from './components/ResultList'
import { api } from '../utils/api'

type Hit = {
  id: string
  course_code?: string
  title?: string
  summary?: string
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
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const canSearch = useMemo(() => query.trim().length > 0, [query])

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

  return (
    <div className="container">
      <header className="header">
        <h1>Course Recommendations</h1>
        <p>Search syllabi across departments. Try "physics", "web backend", "machine learning".</p>
      </header>

      <SearchBar
        value={query}
        onChange={setQuery}
        onSearch={() => doSearch(query)}
        disabled={!canSearch || loading}
      />

      {error && <div className="error">{error}</div>}

      <ResultList results={results} loading={loading} />

      <footer className="footer">
        <span>Powered by FastAPI + Meilisearch</span>
      </footer>
    </div>
  )
}
