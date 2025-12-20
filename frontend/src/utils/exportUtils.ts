/**
 * Export utilities for course search results
 * Supports PDF and Excel export with nice formatting
 */

type CourseData = {
  id: string
  course_code?: string
  title?: string
  summary?: string
}

// Dynamic import for PDF library (loaded only when needed)
async function loadJsPDF() {
  const jspdfModule = await import('jspdf') as any
  await import('jspdf-autotable')
  return jspdfModule.jsPDF || jspdfModule.default
}

// Dynamic import for Excel library  
async function loadXLSX() {
  return await import('xlsx') as any
}

/**
 * Export courses to PDF with nice table formatting
 * Note: Uses English labels because jsPDF doesn't support Vietnamese fonts by default
 */
export async function exportToPDF(
  courses: CourseData[],
  searchQuery: string
): Promise<void> {
  const JsPDF = await loadJsPDF()
  const doc = new JsPDF('p', 'mm', 'a4')
  
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  
  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246] // Blue
  const textColor: [number, number, number] = [31, 41, 55]
  const mutedColor: [number, number, number] = [107, 114, 128]
  
  // Header background
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, pageWidth, 35, 'F')
  
  // Title (English to avoid font issues)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Course Search Results', margin, 18)
  
  // Subtitle
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('HCMUS - Course Finder', margin, 28)
  
  // Search query info (English labels)
  doc.setTextColor(...textColor)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`Search: "${searchQuery}"`, margin, 45)
  
  // Stats
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...mutedColor)
  doc.setFontSize(9)
  const now = new Date().toLocaleString('en-US')
  doc.text(`Generated: ${now}`, margin, 52)
  doc.text(`Total: ${courses.length} courses`, pageWidth - margin - 45, 52)
  
  // Table data - only course code and title
  const tableData = courses.map((course, index) => [
    (index + 1).toString(),
    course.course_code || '-',
    course.title || '-'
  ])
  
  // Create table using autoTable
  ;(doc as any).autoTable({
    startY: 58,
    head: [['#', 'Code', 'Course Name']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 4
    },
    bodyStyles: {
      textColor: textColor,
      fontSize: 9,
      cellPadding: 4
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 30, fontStyle: 'bold' },
      2: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      // Footer on each page
      const pageNumber = doc.getCurrentPageInfo().pageNumber
      const totalPages = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(...mutedColor)
      doc.text(
        `Page ${pageNumber}/${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )
    }
  })
  
  // Save the PDF
  const filename = `courses_${sanitizeFilename(searchQuery)}_${formatDate()}.pdf`
  doc.save(filename)
}

/**
 * Export courses to Excel - only course code and title
 * Excel supports Unicode so Vietnamese is fine
 */
export async function exportToExcel(
  courses: CourseData[],
  searchQuery: string,
  translations: {
    sheetName: string
    courseCode: string
    courseName: string
  }
): Promise<void> {
  const XLSX = await loadXLSX()
  
  // Prepare data with headers - only code and name
  const data = [
    // Header row
    [translations.courseCode, translations.courseName],
    // Data rows
    ...courses.map(course => [
      course.course_code || '',
      course.title || ''
    ])
  ]
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet(data)
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 },  // Course code
    { wch: 60 }   // Course name
  ]
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, translations.sheetName)
  
  // Generate filename and save
  const filename = `courses_${sanitizeFilename(searchQuery)}_${formatDate()}.xlsx`
  XLSX.writeFile(workbook, filename)
}

// Helper functions
function sanitizeFilename(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30)
}

function formatDate(): string {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
}
