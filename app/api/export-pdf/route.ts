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
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0) // Black color
    
    let yPos = 20
    const lineHeight = 6
    const paragraphSpacing = 8 // Extra spacing between paragraphs
    const pageMargin = 20
    const maxWidth = 170
    const pageHeight = 270 // Near bottom of page (A4 height is 297mm)
    
    // Split response into paragraphs (by double line breaks or single line breaks)
    const paragraphs = response.split(/\n\n+/).filter(p => p.trim().length > 0)
    
    // If no double line breaks found, try single line breaks
    const finalParagraphs = paragraphs.length > 1 
      ? paragraphs 
      : response.split(/\n/).filter(p => p.trim().length > 0)
    
    // Only include AI response - no prompt/question
    // Add each paragraph with proper spacing
    for (let i = 0; i < finalParagraphs.length; i++) {
      const paragraph = finalParagraphs[i].trim()
      if (!paragraph) continue
      
      // Split paragraph into lines that fit the page width
      const lines = doc.splitTextToSize(paragraph, maxWidth)
      
      // Add lines of this paragraph
      for (let j = 0; j < lines.length; j++) {
        if (yPos > pageHeight) {
          doc.addPage()
          yPos = pageMargin
        }
        doc.text(lines[j], pageMargin, yPos)
        yPos += lineHeight
      }
      
      // Add extra spacing after paragraph (except for last paragraph)
      if (i < finalParagraphs.length - 1) {
        yPos += paragraphSpacing
      }
    }
    
    // Generate PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="infinito-response.pdf"',
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
