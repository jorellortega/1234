import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const filename = formData.get('filename') as string

    if (!file || !filename) {
      return NextResponse.json(
        { error: 'Missing file or filename' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now()
    const uniqueFilename = `${timestamp}-${filename}`
    
    // Upload to Supabase storage bucket named 'files'
    const supabase = supabaseServer()
    const { data, error } = await supabase.storage
      .from('files')
      .upload(`vision-images/${uniqueFilename}`, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Supabase storage upload error:', error)
      return NextResponse.json(
        { error: 'Failed to upload image to storage' },
        { status: 500 }
      )
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('files')
      .getPublicUrl(`vision-images/${uniqueFilename}`)

    console.log('Image uploaded successfully:', {
      filename: uniqueFilename,
      url: urlData.publicUrl,
      size: file.size
    })

    return NextResponse.json({
      success: true,
      filename: uniqueFilename,
      url: urlData.publicUrl,
      size: file.size
    })

  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error during image upload' },
      { status: 500 }
    )
  }
}
