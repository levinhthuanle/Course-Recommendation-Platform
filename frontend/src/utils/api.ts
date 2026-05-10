const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

function getAuthToken() {
  return localStorage.getItem('auth_token') || ''
}

async function fetchJson(path: string, init?: RequestInit) {
  const token = getAuthToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  health: () => fetchJson('/api/v1/health'),
  register: (email: string, password: string) =>
    fetchJson('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  login: (email: string, password: string) =>
    fetchJson('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  me: () => fetchJson('/api/v1/auth/me'),
  search: (q: string, limit = 20, semanticRatio = 0.5) => 
    fetchJson(`/api/v1/search?q=${encodeURIComponent(q)}&limit=${limit}&semantic_ratio=${semanticRatio}`),
  ingest: (force = false) => fetchJson(`/api/v1/ingest?force_reindex=${force}`, { method: 'POST' }),
  listIngestedFiles: () => fetchJson('/api/v1/ingest/files'),
  uploadPdf: async (file: File) => {
    const token = localStorage.getItem('auth_token') || ''
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/api/v1/ingest/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: form
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  chat: (message: string, history: Array<{role: string, content: string}> = []) => 
    fetchJson('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history })
    }),
  chatStatus: () => fetchJson('/api/v1/chat/status'),
  getCourse: (id: string) => fetchJson(`/api/v1/courses/${encodeURIComponent(id)}`),
}
