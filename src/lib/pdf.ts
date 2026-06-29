import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function generateQuotePdf(
  clientName: string,
  data: {
    quoteId: string
    customerName: string
    customerEmail: string
    customerPhone: string
    serviceType: string
    description: string
    estimatedBudget: number
    currency: string
    date: string
  }
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const page = doc.addPage([612, 792])
  const { width, height } = page.getSize()

  const primaryColor = rgb(0.15, 0.39, 0.92)
  const darkColor = rgb(0.11, 0.11, 0.11)
  const grayColor = rgb(0.4, 0.4, 0.4)

  page.drawRectangle({
    x: 0,
    y: height - 80,
    width,
    height: 80,
    color: primaryColor,
  })

  page.drawText('QUOTE', {
    x: 40,
    y: height - 50,
    size: 28,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  page.drawText(`#${data.quoteId.slice(0, 8)}`, {
    x: 40,
    y: height - 75,
    size: 12,
    font,
    color: rgb(0.9, 0.9, 1),
  })

  page.drawText(data.date, {
    x: width - 160,
    y: height - 50,
    size: 11,
    font,
    color: rgb(0.9, 0.9, 1),
  })

  page.drawText(`Prepared for: ${data.customerName}`, {
    x: 40,
    y: height - 140,
    size: 11,
    font,
    color: grayColor,
  })

  const lineY = height - 160
  page.drawLine({
    start: { x: 40, y: lineY },
    end: { x: width - 40, y: lineY },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  })

  let y = lineY - 50

  const fields = [
    { label: 'Client', value: clientName },
    { label: 'Customer', value: data.customerName },
    { label: 'Email', value: data.customerEmail },
    { label: 'Phone', value: data.customerPhone },
    { label: 'Service', value: data.serviceType },
    { label: 'Description', value: data.description },
  ]

  for (const f of fields) {
    page.drawText(f.label, { x: 40, y, size: 10, font: fontBold, color: darkColor })
    page.drawText(f.value, { x: 180, y, size: 10, font, color: grayColor })
    y -= 22
  }

  y -= 20

  page.drawLine({
    start: { x: 40, y },
    end: { x: width - 40, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  })

  y -= 40

  page.drawText('Estimated Budget', {
    x: 40,
    y,
    size: 14,
    font: fontBold,
    color: primaryColor,
  })

  page.drawText(`${data.currency} ${data.estimatedBudget.toFixed(2)}`, {
    x: 280,
    y,
    size: 20,
    font: fontBold,
    color: darkColor,
  })

  y -= 60

  page.drawText('This quote is valid for 30 days.', {
    x: 40,
    y,
    size: 9,
    font,
    color: grayColor,
  })

  const footerY = 40
  page.drawText('Generated automatically by Automation Kit', {
    x: 40,
    y: footerY,
    size: 8,
    font,
    color: grayColor,
  })

  return await doc.save()
}
