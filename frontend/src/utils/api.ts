const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  health: () => fetchJson('/api/v1/health'),
  search: (q: string, limit = 20) => fetchJson(`/api/v1/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  ingest: (force = false) => fetchJson(`/api/v1/ingest?force_reindex=${force}`, { method: 'POST' }),
}
