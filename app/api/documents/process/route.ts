import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// This would typically use a document processing library
// For now, we'll simulate the process and create sample memories
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const filename = formData.get('filename') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      )
    }

    const supabase = supabaseServer()

    // 1. Store the actual document file in Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const fileName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    const { data: storageData, error: storageError } = await supabase.storage
      .from('files')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (storageError) {
      console.error('Storage error:', storageError)
      return NextResponse.json(
        { error: 'Failed to store document file' },
        { status: 500 }
      )
    }

    // 2. Get the public URL for the stored document
    const { data: urlData } = supabase.storage
      .from('files')
      .getPublicUrl(fileName)

    // 3. Create a document record in the database
    const { data: documentRecord, error: docError } = await supabase
      .from('documents')
      .insert({
        filename: filename,
        original_name: filename,
        file_path: fileName,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (docError) {
      console.error('Document record error:', docError)
      // Continue processing even if document record fails
    }

    // 4. Extract text content (simulated for now)
    // In a real implementation, you'd use libraries like pdf-parse, mammoth, etc.
    console.log('🔍 [DEBUG] Starting text extraction for:', filename, 'Type:', file.type, 'Size:', file.size)
    const extractedText = await simulateTextExtraction(file, filename)
    
    // DEBUG: Log extracted text
    console.log('🔍 [DEBUG] Text extraction result:', {
      hasExtractedText: !!extractedText,
      extractedTextLength: extractedText?.length || 0,
      extractedTextPreview: extractedText?.substring(0, 200) || 'NO TEXT',
      isError: extractedText?.startsWith('Error') || extractedText?.includes('Error parsing')
    })
    
    // Check if extraction failed
    if (!extractedText || extractedText.trim().length === 0 || extractedText.startsWith('Error')) {
      console.error('❌ [ERROR] Text extraction failed for:', filename, 'Result:', extractedText)
      return NextResponse.json(
        { 
          error: 'Failed to extract text from document',
          details: extractedText || 'No text content found',
          filename,
          fileType: file.type
        },
        { status: 400 }
      )
    }

    // 5. Process with AI to extract memories (like before)
    const simulatedMemories = await simulateDocumentProcessing(filename, file.type, extractedText)
    
    console.log('🔍 [DEBUG] Document processing complete:', {
      filename,
      memoriesCount: simulatedMemories?.length || 0,
      extractedTextLength: extractedText.length
    })

    // 6. Add document reference to each memory
    const memoriesWithDocument = simulatedMemories.map(memory => ({
      ...memory,
      document_id: documentRecord?.id,
      document_filename: filename,
      document_url: urlData.publicUrl
    }))

    return NextResponse.json({
      success: true,
      filename,
      fileType: file.type,
      fileSize: file.size,
      documentId: documentRecord?.id,
      documentUrl: urlData.publicUrl,
      extractedText: extractedText, // Full extracted text (like before)
      extractedTextPreview: extractedText.substring(0, 500) + '...', // First 500 chars for preview
      memories: memoriesWithDocument,
      message: 'Document processed, stored, and text extracted successfully'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    )
  }
}

// Extract actual text content from different file types
async function simulateTextExtraction(file: File, filename: string): Promise<string> {
  // For text files, we can actually read the content
  if (file.type === 'text/plain') {
    try {
      const textContent = await file.text()
      return textContent
    } catch (error) {
      console.error('Error reading text file:', error)
      return `Error reading text file: ${filename}`
    }
  }
  
  // For PDFs, use pdf-parse library with pdf2json fallback
  if (file.type.includes('pdf')) {
    try {
      console.log('🔍 [DEBUG] Attempting to parse PDF:', filename, 'Size:', file.size)
      
      const fileBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(fileBuffer)
      
      // Try pdf-parse first (faster and lighter)
      try {
        let pdfParse: any
        try {
          const pdfParseModule = await import('pdf-parse')
          pdfParse = pdfParseModule.default || pdfParseModule
          console.log('✅ [DEBUG] pdf-parse loaded via dynamic import')
        } catch (importError) {
          console.error('❌ [ERROR] Failed to load pdf-parse:', importError)
          throw new Error(`Failed to load PDF parser: ${importError instanceof Error ? importError.message : String(importError)}`)
        }
        
        console.log('🔍 [DEBUG] Calling pdfParse with buffer size:', buffer.length)
        const result = await pdfParse(buffer)
        
        const extractedText = result?.text || ''
        console.log('✅ [DEBUG] PDF parsed successfully with pdf-parse:', {
          textLength: extractedText.length,
          pages: result?.numpages || 0,
          textPreview: extractedText.substring(0, 200) || 'NO TEXT'
        })
        
        if (!extractedText || extractedText.trim().length === 0) {
          console.warn('⚠️ [WARN] PDF parsed but extracted text is empty')
          return `PDF ${filename} was parsed but contains no extractable text. This might be a scanned image PDF or an empty document.`
        }
        
        return extractedText
      } catch (pdfParseError) {
        // Fallback to pdf2json if pdf-parse fails (handles malformed PDFs better)
        console.warn('⚠️ [WARN] pdf-parse failed, trying pdf2json fallback:', pdfParseError instanceof Error ? pdfParseError.message : String(pdfParseError))
        
        try {
          // Use pdf2json as fallback (more robust for malformed PDFs in Node.js)
          const PDFParser = require('pdf2json')
          const pdfParser = new PDFParser(null, 1)
          
          console.log('🔍 [DEBUG] Loading PDF with pdf2json, buffer size:', buffer.length)
          
          return new Promise<string>((resolve, reject) => {
            // Set up event handlers before parsing
            pdfParser.on('pdfParser_dataError', (errData: any) => {
              console.error('❌ [ERROR] pdf2json parsing error:', errData.parserError)
              reject(new Error(`pdf2json parsing failed: ${errData.parserError}`))
            })
            
            pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
              try {
                console.log('✅ [DEBUG] PDF loaded with pdf2json, pages:', pdfData.Pages?.length || 0)
                
                if (!pdfData.Pages || pdfData.Pages.length === 0) {
                  console.warn('⚠️ [WARN] PDF parsed but contains no pages')
                  resolve(`PDF ${filename} was parsed but contains no pages. This might be an empty document.`)
                  return
                }
                
                // Extract text from all pages
                let extractedText = ''
                for (const page of pdfData.Pages) {
                  if (page.Texts && page.Texts.length > 0) {
                    const pageText = page.Texts.map((text: any) => {
                      // Decode the text if it's encoded
                      if (text.R && text.R.length > 0) {
                        return text.R.map((r: any) => {
                          try {
                            return decodeURIComponent(r.T)
                          } catch (e) {
                            return r.T
                          }
                        }).join('')
                      }
                      return text.T
                    }).join(' ')
                    extractedText += pageText + '\n\n'
                  }
                }
                
                console.log('✅ [DEBUG] PDF parsed successfully with pdf2json:', {
                  textLength: extractedText.length,
                  pages: pdfData.Pages.length,
                  textPreview: extractedText.substring(0, 200) || 'NO TEXT'
                })
                
                if (!extractedText || extractedText.trim().length === 0) {
                  console.warn('⚠️ [WARN] PDF parsed but extracted text is empty')
                  resolve(`PDF ${filename} was parsed but contains no extractable text. This might be a scanned image PDF or an empty document.`)
                  return
                }
                
                resolve(extractedText.trim())
              } catch (error) {
                reject(error)
              }
            })
            
            // Parse the PDF
            pdfParser.parseBuffer(buffer)
          })
        } catch (pdf2jsonError) {
          // Both methods failed
          console.error('❌ [ERROR] Both pdf-parse and pdf2json failed:', {
            pdfParseError: pdfParseError instanceof Error ? pdfParseError.message : String(pdfParseError),
            pdf2jsonError: pdf2jsonError instanceof Error ? pdf2jsonError.message : String(pdf2jsonError)
          })
          throw pdfParseError // Throw original error
        }
      }
    } catch (error) {
      console.error('❌ [ERROR] Error parsing PDF:', filename, error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const errorStack = error instanceof Error ? error.stack : String(error)
      console.error('❌ [ERROR] Full error details:', { errorMessage, errorStack })
      return `Error parsing PDF: ${filename}. ${errorMessage}`
    }
  }
  
  // For Word documents, use mammoth library
  if (file.type.includes('word') || file.type.includes('document')) {
    try {
      const mammoth = require('mammoth')
      const fileBuffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) })
      return result.value
    } catch (error) {
      console.error('Error parsing Word document:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return `Error parsing Word document: ${filename}. ${errorMessage}`
    }
  }
  
  // Fallback for other file types
  return `File: ${filename}

File type: ${file.type}
File size: ${(file.size / 1024 / 1024).toFixed(2)} MB

This file has been stored successfully. To extract text content, you may need to install appropriate libraries for this file type.`
}

// Simulate AI document processing
async function simulateDocumentProcessing(filename: string, fileType: string, extractedText: string): Promise<any[]> {
  // This simulates what an AI would extract from a document
  // In reality, you'd use OpenAI, Claude, or another AI service
  
  const baseMemories = [
    {
      concept: `Document Analysis: ${filename}`,
      data: `AI analysis of ${filename} (${fileType}). This document has been processed and stored, with key concepts extracted for memory storage. Original document is preserved in storage for future reference.`,
      salience: 0.85,
      connections: ['document_analysis', 'ai_processing', 'knowledge_extraction', 'file_storage'],
      memory_type: 'semantic',
      priority: 7,
      memory_category: 'project',
      parent_id: undefined,
      hierarchy_level: 0
    }
  ]

  // Add different types of extracted memories based on file type
  if (fileType.includes('pdf')) {
    baseMemories.push({
      concept: 'PDF Structure Analysis',
      data: 'Document contains structured sections with headers, paragraphs, and potentially tables or images. Text extraction successful. Original PDF stored for future reference.',
      salience: 0.75,
      connections: ['pdf_processing', 'document_structure', 'text_extraction', 'file_storage'],
      memory_type: 'procedural',
      priority: 6,
      memory_category: 'project',
      parent_id: undefined,
      hierarchy_level: 0
    })
  } else if (fileType.includes('word') || fileType.includes('document')) {
    baseMemories.push({
      concept: 'Word Document Processing',
      data: 'Microsoft Word document processed successfully. Extracted formatting, styles, and content structure. Original .docx file stored for future reference.',
      salience: 0.75,
      connections: ['word_processing', 'document_formatting', 'content_structure', 'file_storage'],
      memory_type: 'procedural',
      priority: 6,
      memory_category: 'project',
      parent_id: undefined,
      hierarchy_level: 0
    })
  }

  // Add some sample extracted concepts (simulating AI analysis)
  const extractedConcepts = [
    {
      concept: 'Key Theme: Information Architecture',
      data: 'Document appears to focus on organizing and structuring information in a logical, accessible manner. Content extracted and analyzed for key insights.',
      salience: 0.8,
      connections: ['information_architecture', 'organization', 'structure', 'content_analysis'],
      memory_type: 'semantic',
      priority: 8,
      memory_category: 'idea',
      parent_id: undefined,
      hierarchy_level: 0
    },
    {
      concept: 'Technical Implementation',
      data: 'Contains technical details about system implementation, architecture decisions, and development processes. Document stored for future technical reference.',
      salience: 0.7,
      connections: ['technical', 'implementation', 'architecture', 'documentation'],
      memory_type: 'procedural',
      priority: 7,
      memory_category: 'project',
      parent_id: undefined,
      hierarchy_level: 0
    }
  ]

  return [...baseMemories, ...extractedConcepts]
}
