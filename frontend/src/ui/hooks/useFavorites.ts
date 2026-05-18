import { useEffect, useMemo, useState } from 'react'
import { api } from '../../utils/api'
import type { Hit, User } from '../types'

export function useFavorites(currentUser: User | null) {
  const [favorites, setFavorites] = useState<Hit[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [favoritesError, setFavoritesError] = useState<string | null>(null)

  const favoriteIds = useMemo(() => new Set(favorites.map((course) => course.id)), [favorites])

  const loadFavorites = async () => {
    if (!currentUser) {
      setFavorites([])
      return
    }

    setFavoritesLoading(true)
    setFavoritesError(null)
    try {
      const data = await api.listFavorites()
      setFavorites(data || [])
    } catch (e: any) {
      setFavoritesError(e?.message || 'Failed to load saved courses')
    } finally {
      setFavoritesLoading(false)
    }
  }

  useEffect(() => {
    void loadFavorites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  const addFavorite = async (course: Hit) => {
    if (!currentUser || favoriteIds.has(course.id)) return

    setFavorites((prev) => [course, ...prev])
    try {
      const saved = await api.saveFavorite(course.id)
      setFavorites((prev) => [saved, ...prev.filter((item) => item.id !== course.id)])
    } catch (e: any) {
      setFavorites((prev) => prev.filter((item) => item.id !== course.id))
      setFavoritesError(e?.message || 'Failed to save course')
    }
  }

  const removeFavorite = async (courseId: string) => {
    const previous = favorites
    setFavorites((prev) => prev.filter((item) => item.id !== courseId))
    try {
      await api.removeFavorite(courseId)
    } catch (e: any) {
      setFavorites(previous)
      setFavoritesError(e?.message || 'Failed to remove saved course')
    }
  }

  const toggleFavorite = async (course: Hit) => {
    if (favoriteIds.has(course.id)) await removeFavorite(course.id)
    else await addFavorite(course)
  }

  return {
    favorites,
    favoritesLoading,
    favoritesError,
    favoriteIds,
    loadFavorites,
    addFavorite,
    removeFavorite,
    toggleFavorite
  }
}
