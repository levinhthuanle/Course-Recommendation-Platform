declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf'
  
  interface AutoTableOptions {
    startY?: number
    head?: any[][]
    body?: any[][]
    theme?: 'striped' | 'grid' | 'plain'
    headStyles?: {
      fillColor?: [number, number, number]
      textColor?: [number, number, number]
      fontStyle?: string
      fontSize?: number
      cellPadding?: number
    }
    bodyStyles?: {
      textColor?: [number, number, number]
      fontSize?: number
      cellPadding?: number
    }
    alternateRowStyles?: {
      fillColor?: [number, number, number]
    }
    columnStyles?: {
      [key: number]: {
        cellWidth?: number | 'auto'
        halign?: 'left' | 'center' | 'right'
        fontStyle?: string
      }
    }
    margin?: {
      left?: number
      right?: number
      top?: number
      bottom?: number
    }
    didDrawPage?: (data: any) => void
  }
  
  export function autoTable(doc: jsPDF, options: AutoTableOptions): void
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}
