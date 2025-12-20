import { useEffect, useCallback, useMemo } from 'react'

type CourseDetail = {
  id: string
  course_code: string
  title: string
  summary: string
  content: string
}

type Props = {
  course: CourseDetail | null
  loading: boolean
  onClose: () => void
  translations?: {
    close: string
    courseCode: string
    description: string
    fullContent: string
    copyCode: string
    copied: string
  }
}

// Format raw PDF content into structured sections
function formatContent(rawContent: string): { sections: Array<{ title: string; content: string }> } {
  const sections: Array<{ title: string; content: string }> = []
  
  // Match section headers like "1. GENERAL INFORMATION" or "2. COURSE DESCRIPTION"
  // Only match uppercase words, stop before lowercase letter (which starts content)
  const combinedPattern = /(\d+\.\s*[A-Z][A-Z\s&]+)(?=[A-Z][a-z]|$)/g
  
  const matches = [...rawContent.matchAll(combinedPattern)]
  
  if (matches.length === 0) {
    // No sections found, return as single block
    return { sections: [{ title: '', content: cleanText(rawContent) }] }
  }
  
  // Split content by sections
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const nextMatch = matches[i + 1]
    const startIdx = match.index! + match[0].length
    const endIdx = nextMatch ? nextMatch.index! : rawContent.length
    
    const sectionTitle = match[1].trim()
    const sectionContent = rawContent.slice(startIdx, endIdx).trim()
    
    sections.push({
      title: sectionTitle,
      content: cleanText(sectionContent)
    })
  }
  
  // Add any content before first section
  if (matches[0].index! > 0) {
    const preContent = rawContent.slice(0, matches[0].index!).trim()
    if (preContent) {
      sections.unshift({ title: '', content: cleanText(preContent) })
    }
  }
  
  return { sections }
}

// Clean up text: fix spacing, remove page markers, etc.
function cleanText(text: string): string {
  return text
    // Remove page markers
    .replace(/Course Syllabus\s*\|\s*<[^>]+>\s*Page\s*\d+/gi, '')
    .replace(/VNUHCM[-\s]*UNIVERSITY OF SCIENCE/gi, '')
    .replace(/FACULTY OF INFORMATION TECHNOLOGY/gi, '')
    // Fix common PDF artifacts
    .replace(/\s*-\s*(?=\w)/g, '-')
    .replace(/(\w)\s*-\s*(\w)/g, '$1-$2')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Add line breaks before certain patterns
    .replace(/(G\d+\.\d+)/g, '\n• $1')
    .replace(/(A\d+)/g, '\n• $1')
    .replace(/(Chapter\s*\d+)/gi, '\n\n$1')
    .replace(/(ID\s+Description)/gi, '\n\n$1')
    .replace(/(ID\s+Topic)/gi, '\n\n$1')
    // Clean up
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function CourseDetailModal({ 
  course, 
  loading, 
  onClose,
  translations = {
    close: 'Close',
    courseCode: 'Course Code',
    description: 'Description',
    fullContent: 'Full Content',
    copyCode: 'Copy Code',
    copied: 'Copied!'
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

  const handleCopyCode = async () => {
    if (course?.course_code) {
      await navigator.clipboard.writeText(course.course_code)
      // Show brief feedback (could use state for better UX)
      const btn = document.querySelector('.copyButton') as HTMLButtonElement
      if (btn) {
        const original = btn.textContent
        btn.textContent = translations.copied
        setTimeout(() => { btn.textContent = original }, 1500)
      }
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

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
            {/* Header */}
            <div className="modalHeader">
              <span className="modalCode">{course.course_code}</span>
              <button className="copyButton" onClick={handleCopyCode} title={translations.copyCode}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                {translations.copyCode}
              </button>
            </div>

            <h2 className="modalTitle">{course.title}</h2>

            {/* Summary */}
            <div className="modalSection">
              <h3>{translations.description}</h3>
              <p className="modalSummary">{course.summary}</p>
            </div>

            {/* Full Content - Formatted Sections */}
            <FormattedContent content={course.content} title={translations.fullContent} />
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

// Component to render formatted content with sections
function FormattedContent({ content, title }: { content: string; title: string }) {
  const formatted = useMemo(() => formatContent(content), [content])
  
  return (
    <div className="modalSection">
      <h3>{title}</h3>
      <div className="modalContentText">
        {formatted.sections.map((section, idx) => (
          <div key={idx} className="contentSection">
            {section.title && (
              <h4 className="sectionTitle">{section.title}</h4>
            )}
            <div className="sectionContent">
              {section.content.split('\n').map((line, lineIdx) => {
                const trimmed = line.trim()
                if (!trimmed) return null
                
                // Detect bullet points
                if (trimmed.startsWith('•')) {
                  return (
                    <div key={lineIdx} className="bulletPoint">
                      {trimmed}
                    </div>
                  )
                }
                
                // Detect key-value pairs (e.g., "Course name: Calculus 3")
                const kvMatch = trimmed.match(/^([A-Za-z\s\-]+):\s*(.+)$/)
                if (kvMatch && kvMatch[1].length < 30) {
                  return (
                    <div key={lineIdx} className="keyValue">
                      <span className="key">{kvMatch[1]}:</span>
                      <span className="value">{kvMatch[2]}</span>
                    </div>
                  )
                }
                
                return <p key={lineIdx}>{trimmed}</p>
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
