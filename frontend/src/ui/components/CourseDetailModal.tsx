import { useEffect, useCallback } from 'react'

type CourseDetail = {
  id: string
  course_code: string
  title: string
  summary: string
  content: string
  course_name_en?: string
  course_name_vi?: string
  relation_to_curriculum?: string
  credit_points?: string
  prior_courses?: string
  course_description?: string
  course_goals?: string[]
  required_reading?: string[]
}

type Props = {
  course: CourseDetail | null
  loading: boolean
  onClose: () => void
  translations?: {
    close: string
    generalInfo: string
    courseId: string
    courseNameEn: string
    courseNameVi: string
    relationToCurriculum?: string
    creditPoints: string
    priorCourses: string
    courseDescription: string
    courseGoals: string
    requiredReading?: string
    fullContent?: string
  }
}

export function CourseDetailModal({ 
  course, 
  loading, 
  onClose,
  translations = {
    close: 'Close',
    generalInfo: 'GENERAL INFORMATION',
    courseId: 'Course ID (English)',
    courseNameEn: 'Course name (English)',
    courseNameVi: 'Course name (Vietnamese)',
    relationToCurriculum: 'Relation to curriculum',
    creditPoints: 'Credit points',
    priorCourses: 'Prior course(s)',
    courseDescription: 'COURSE DESCRIPTION',
    courseGoals: 'COURSE GOALS',
    requiredReading: 'REQUIRED AND RECOMMENDED READING',
    fullContent: 'FULL SYLLABUS CONTENT'
  }
}: Props) {
  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden' // Prevent background scroll
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const fullContent = course?.content?.trim()
  const description = course?.course_description || course?.summary || ''
  const shouldShowFullContent = Boolean(
    fullContent && fullContent.length > description.length + 80
  )

  return (
    <div className="modalBackdrop" onClick={handleBackdropClick}>
      <div className="modalContent">
        {/* Close button */}
        <button className="modalClose" onClick={onClose} aria-label={translations.close}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {loading ? (
          <div className="modalLoading">
            <div className="spinner"></div>
            <span>Loading...</span>
          </div>
        ) : course ? (
          <>
            <div className="a4Page">
              <div className="a4Header">
                <div className="a4Brand">
                  <div className="a4BrandTitle">fit@hcmus</div>
                  <div className="a4BrandSub">Faculty of Information Technology</div>
                </div>
                <div className="a4Code">{course.course_code || '—'}</div>
              </div>

              <div className="a4Title">{course.course_name_en || course.title}</div>
              {course.course_name_vi && (
                <div className="a4Title a4TitleVi">{course.course_name_vi}</div>
              )}

              <div className="a4Section">
                <div className="a4SectionTitle">{translations.generalInfo}</div>
                <div className="a4InfoTable">
                  <div className="a4InfoRow">
                    <span>{translations.courseId}:</span>
                    <span>{course.course_code || '—'}</span>
                  </div>
                  <div className="a4InfoRow">
                    <span>{translations.courseNameEn}:</span>
                    <span>{course.course_name_en || course.title || '—'}</span>
                  </div>
                  {course.course_name_vi && (
                    <div className="a4InfoRow">
                      <span>{translations.courseNameVi}:</span>
                      <span>{course.course_name_vi}</span>
                    </div>
                  )}
                  {course.credit_points && (
                    <div className="a4InfoRow">
                      <span>{translations.creditPoints}:</span>
                      <span>{course.credit_points}</span>
                    </div>
                  )}
                  {course.relation_to_curriculum && (
                    <div className="a4InfoRow">
                      <span>{translations.relationToCurriculum}:</span>
                      <span>{course.relation_to_curriculum}</span>
                    </div>
                  )}
                  {course.prior_courses && (
                    <div className="a4InfoRow">
                      <span>{translations.priorCourses}:</span>
                      <span>{course.prior_courses}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="a4Section">
                <div className="a4SectionTitle">{translations.courseDescription}</div>
                <p className="a4Paragraph">
                  {course.course_description || course.summary || '—'}
                </p>
              </div>

              {course.course_goals && course.course_goals.length > 0 && (
                <div className="a4Section">
                  <div className="a4SectionTitle">{translations.courseGoals}</div>
                  <ol className="a4List">
                    {course.course_goals.map((goal, idx) => (
                      <li key={idx}>{goal}</li>
                    ))}
                  </ol>
                </div>
              )}

              {course.required_reading && course.required_reading.length > 0 && (
                <div className="a4Section">
                  <div className="a4SectionTitle">{translations.requiredReading}</div>
                  <ol className="a4List a4ReadingList">
                    {course.required_reading.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}

              {shouldShowFullContent && (
                <div className="a4Section">
                  <div className="a4SectionTitle">{translations.fullContent}</div>
                  <div className="a4RawContent">
                    {fullContent!.split(/\n{2,}|(?<=\.)\s+(?=[A-Z0-9])/).map((paragraph, idx) => {
                      const clean = paragraph.trim()
                      return clean ? <p key={idx}>{clean}</p> : null
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="modalError">
            <p>Course not found</p>
          </div>
        )}
      </div>
    </div>
  )
}
