import { useState } from 'react'
import { exportToPDF, exportToExcel } from '../../utils/exportUtils'

type CourseData = {
  id: string
  course_code?: string
  title?: string
  summary?: string
}

type Props = {
  courses: CourseData[]
  searchQuery: string
  disabled?: boolean
  translations?: {
    exportPDF: string
    exportExcel: string
    exporting: string
    courseCode: string
    courseName: string
    sheetName: string
  }
}

export function ExportButtons({
  courses,
  searchQuery,
  disabled = false,
  translations = {
    exportPDF: 'Export PDF',
    exportExcel: 'Export Excel',
    exporting: 'Exporting...',
    courseCode: 'Code',
    courseName: 'Course Name',
    sheetName: 'Courses'
  }
}: Props) {
  const [exportingPDF, setExportingPDF] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  const handleExportPDF = async () => {
    if (exportingPDF || disabled || !courses.length) return
    setExportingPDF(true)
    try {
      // PDF uses English internally (no translations needed)
      await exportToPDF(courses, searchQuery)
    } catch (error) {
      console.error('Failed to export PDF:', error)
    } finally {
      setExportingPDF(false)
    }
  }

  const handleExportExcel = async () => {
    if (exportingExcel || disabled || !courses.length) return
    setExportingExcel(true)
    try {
      await exportToExcel(courses, searchQuery, {
        sheetName: translations.sheetName,
        courseCode: translations.courseCode,
        courseName: translations.courseName
      })
    } catch (error) {
      console.error('Failed to export Excel:', error)
    } finally {
      setExportingExcel(false)
    }
  }

  const isDisabled = disabled || !courses.length

  return (
    <div className="exportButtons">
      {/* PDF Button */}
      <button
        className="exportBtn exportPDF"
        onClick={handleExportPDF}
        disabled={isDisabled || exportingPDF}
        title={translations.exportPDF}
      >
        {exportingPDF ? (
          <span className="exportSpinner"></span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <path d="M9 15h6"/>
            <path d="M9 11h6"/>
          </svg>
        )}
        <span>{exportingPDF ? translations.exporting : translations.exportPDF}</span>
      </button>

      {/* Excel Button */}
      <button
        className="exportBtn exportExcel"
        onClick={handleExportExcel}
        disabled={isDisabled || exportingExcel}
        title={translations.exportExcel}
      >
        {exportingExcel ? (
          <span className="exportSpinner"></span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="3" y1="15" x2="21" y2="15"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
            <line x1="15" y1="3" x2="15" y2="21"/>
          </svg>
        )}
        <span>{exportingExcel ? translations.exporting : translations.exportExcel}</span>
      </button>
    </div>
  )
}
