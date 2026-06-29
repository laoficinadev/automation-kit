declare module 'pdf-lib' {
  export class PDFDocument {
    static create(): Promise<PDFDocument>
    addPage(size?: [number, number]): PDFPage
    embedFont(font: Font): Promise<PDFFont>
    save(): Promise<Uint8Array>
  }

  export class PDFPage {
    drawText(text: string, options?: PDFDrawTextOptions): void
    drawRectangle(options?: PDFDrawRectangleOptions): void
    drawLine(options?: PDFDrawLineOptions): void
    getSize(): { width: number; height: number }
  }

  export interface PDFDrawTextOptions {
    x?: number
    y?: number
    size?: number
    font?: PDFFont
    color?: PDFColor
  }

  export interface PDFDrawRectangleOptions {
    x?: number
    y?: number
    width?: number
    height?: number
    color?: PDFColor
  }

  export interface PDFDrawLineOptions {
    start?: { x: number; y: number }
    end?: { x: number; y: number }
    thickness?: number
    color?: PDFColor
  }

  export type PDFColor = { r: number; g: number; b: number; alpha?: number }
  export type PDFFont = any

  export enum StandardFonts {
    Helvetica = 'Helvetica',
    HelveticaBold = 'Helvetica-Bold',
  }

  export function rgb(r: number, g: number, b: number): PDFColor
}
