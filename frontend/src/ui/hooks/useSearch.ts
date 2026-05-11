import { useMemo, useState } from 'react'
import { api } from '../../utils/api'
import { cleanText, isValidResult } from '../lib/text'
import type { Hit } from '../types'

export function useSearch() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Hit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(20)
  const [semanticRatio, setSemanticRatio] = useState(0.5)

  const canSearch = useMemo(() => query.trim().length > 0, [query])

  const search = async (q = query) => {
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

  return {
    query,
    setQuery,
    loading,
    results,
    error,
    limit,
    setLimit,
    semanticRatio,
    setSemanticRatio,
    canSearch,
    search
  }
}
