declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[]
    Sheets: { [name: string]: WorkSheet }
  }
  
  export interface WorkSheet {
    [cell: string]: CellObject | ColInfo[] | undefined
    '!cols'?: ColInfo[]
    '!rows'?: RowInfo[]
  }
  
  export interface CellObject {
    t: string
    v: any
    r?: string
    h?: string
    w?: string
  }
  
  export interface ColInfo {
    wch?: number
    wpx?: number
  }
  
  export interface RowInfo {
    hpt?: number
    hpx?: number
  }
  
  export const utils: {
    book_new(): WorkBook
    book_append_sheet(workbook: WorkBook, worksheet: WorkSheet, name?: string): void
    aoa_to_sheet(data: any[][]): WorkSheet
    json_to_sheet(data: any[]): WorkSheet
  }
  
  export function writeFile(workbook: WorkBook, filename: string): void
  export function write(workbook: WorkBook, opts?: any): any
}
