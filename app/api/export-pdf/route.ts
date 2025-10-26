import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const prompt = url.searchParams.get('prompt') || ''
    const response = url.searchParams.get('response') || ''
    const timestamp = url.searchParams.get('timestamp') || new Date().toISOString()
    
    if (!response) {
      return NextResponse.json(
        { error: 'No response content provided' },
        { status: 400 }
      )
    }

    // Dynamic import jsPDF
    const { jsPDF } = await import('jspdf')
    
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Set font
    doc.setFont('helvetica', 'normal')
    
    let yPos = 20
    
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0) // Black color
    
    // Split long text into lines that fit the page width
    const lines = doc.splitTextToSize(response, 170)
    
    // Add text with page breaks
    for (let i = 0; i < lines.length; i++) {
      if (yPos > 270) { // Near bottom of page (A4 height is 297mm)
        doc.addPage()
        yPos = 20
      }
      doc.text(lines[i], 20, yPos)
      yPos += 6
    }
    
    // Generate PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="ai-response.pdf"',
        'Cache-Control': 'no-store',
      },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
