import type { ChatResponse, ChatThreadDetail, ChatThreadSummary } from '../ui/types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function getAuthToken() {
  return localStorage.getItem('auth_token') || ''
}

async function readErrorMessage(res: Response) {
  const text = await res.text()
  if (!text) return res.statusText || 'Request failed'

  try {
    const data = JSON.parse(text)
    if (typeof data?.detail === 'string') return data.detail
    if (Array.isArray(data?.detail)) return data.detail.map((item) => item.msg || item.message || 'Invalid input').join(', ')
    if (typeof data?.message === 'string') return data.message
  } catch {
    return text
  }

  return text
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
  if (!res.ok) throw new ApiError(await readErrorMessage(res), res.status)
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
  listAdminFiles: () => fetchJson('/api/v1/admin/files'),
  getAdminStats: () => fetchJson('/api/v1/admin/stats'),
  getAdminUsage: (days = 7) => fetchJson(`/api/v1/admin/usage?days=${days}`),
  deleteAdminFile: (filename: string) =>
    fetchJson(`/api/v1/admin/files/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
  clearAdminIndexForFile: (filename: string) =>
    fetchJson(`/api/v1/admin/index/clear-file/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
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
  chat: (message: string, history: Array<{role: string, content: string}> = [], threadId?: string | null) => 
    fetchJson('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, thread_id: threadId ?? undefined })
    }) as Promise<ChatResponse>,
  chatStatus: () => fetchJson('/api/v1/chat/status'),
  listChatThreads: () => fetchJson('/api/v1/chat/threads') as Promise<ChatThreadSummary[]>,
  createChatThread: (title?: string) =>
    fetchJson('/api/v1/chat/threads', {
      method: 'POST',
      body: JSON.stringify({ title })
    }) as Promise<ChatThreadSummary>,
  getChatThread: (threadId: string) =>
    fetchJson(`/api/v1/chat/threads/${encodeURIComponent(threadId)}`) as Promise<ChatThreadDetail>,
  deleteChatThread: (threadId: string) =>
    fetchJson(`/api/v1/chat/threads/${encodeURIComponent(threadId)}`, { method: 'DELETE' }),
  getCourse: (id: string) => fetchJson(`/api/v1/courses/${encodeURIComponent(id)}`),
}
