export const cleanText = (text?: string) => (text || '').replace(/\s+/g, ' ').trim()

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) return '---'
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export const isValidResult = (title?: string, code?: string): boolean => {
  const t = (title || '').toLowerCase()
  const c = (code || '').toLowerCase()

  if (t.includes('syllabus') || t.includes('apcs')) return false
  if (c.includes('syllabus') || c.includes('apcs')) return false
  return true
}
