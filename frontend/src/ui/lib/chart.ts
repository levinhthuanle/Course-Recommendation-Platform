import type { AdminUsageDay } from '../types'

function scalePoints(data: AdminUsageDay[], width: number, height: number, selector: (day: AdminUsageDay) => number): string {
  if (data.length === 0) return ''

  const maxValue = Math.max(...data.map(selector), 1)
  const stepX = width / Math.max(data.length - 1, 1)

  return data
    .map((day, index) => {
      const x = index * stepX
      const y = height - (selector(day) / maxValue) * height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

export function renderUsagePath(data: AdminUsageDay[], width: number, height: number): string {
  const points = scalePoints(data, width, height, (day) => day.total)
  if (!points) return ''
  return `M ${points.replace(/ (\d+\.\d+,\d+\.\d+)/g, ' L $1')}`
}

export function renderUsageArea(data: AdminUsageDay[], width: number, height: number): string {
  const points = scalePoints(data, width, height, (day) => day.total)
  if (!points) return ''

  const path = points.replace(/ (\d+\.\d+,\d+\.\d+)/g, ' L $1')
  return `${path} L ${width},${height} L 0,${height} Z`
}
