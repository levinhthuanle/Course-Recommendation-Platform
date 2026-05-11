import { useEffect } from 'react'
import type { Theme } from '../types'

export function useDocumentPreferences(theme: Theme) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('lang', 'en')
  }, [])
}
