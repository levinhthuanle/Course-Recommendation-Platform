import { useState } from 'react'
import { api } from '../../utils/api'
import type { CourseDetail } from '../types'

export function useCourseModal() {
  const [selectedCourse, setSelectedCourse] = useState<CourseDetail | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const openCourse = async (courseId: string) => {
    setShowModal(true)
    setModalLoading(true)
    setSelectedCourse(null)
    try {
      const course = await api.getCourse(courseId)
      setSelectedCourse(course)
    } catch (e: any) {
      console.error('Failed to load course:', e)
    } finally {
      setModalLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedCourse(null)
  }

  return {
    selectedCourse,
    modalLoading,
    showModal,
    openCourse,
    closeModal
  }
}
