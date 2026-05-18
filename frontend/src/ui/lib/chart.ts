import type { AdminUsageDay } from '../types'

export const renderUsagePath = (data: AdminUsageDay[], width: number, height: number) => {
  if (data.length === 0) return ''
  const maxValue = Math.max(...data.map((d) => d.total), 1)
  const stepX = width / Math.max(data.length - 1, 1)

  return data
    .map((d, idx) => {
      const x = idx * stepX
      const y = height - (d.total / maxValue) * height
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

export const renderUsageArea = (data: AdminUsageDay[], width: number, height: number) => {
  const line = renderUsagePath(data, width, height)
  if (!line) return ''
  return `${line} L${width},${height} L0,${height} Z`
}
