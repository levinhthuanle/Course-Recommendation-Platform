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
  search: (q: string, limit = 20, semanticRatio = 0.5) => 
    fetchJson(`/api/v1/search?q=${encodeURIComponent(q)}&limit=${limit}&semantic_ratio=${semanticRatio}`),
  ingest: (force = false) => fetchJson(`/api/v1/ingest?force_reindex=${force}`, { method: 'POST' }),
  chat: (message: string, history: Array<{role: string, content: string}> = []) => 
    fetchJson('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    }),
  chatStatus: () => fetchJson('/api/v1/chat/status'),
  getCourse: (id: string) => fetchJson(`/api/v1/courses/${encodeURIComponent(id)}`),
}
