import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const runtime = "nodejs"

/**
 * Save Media Generation API
 * 
 * Downloads media from temporary URL, uploads to Supabase Storage,
 * and saves the generation with permanent storage URL
 */

export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component limitation
            }
          },
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await req.json()
    const { mediaUrl, mediaType, prompt, model } = body

    if (!mediaUrl || !mediaType || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: mediaUrl, mediaType, prompt' },
        { status: 400 }
      )
    }

    if (!['image', 'video', 'audio'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'Invalid mediaType. Must be "image", "video", or "audio"' },
        { status: 400 }
      )
    }

    try {
      // Step 1: Download the media from temporary URL
      console.log('Downloading media from:', mediaUrl)
      const response = await fetch(mediaUrl)
      
      if (!response.ok) {
        throw new Error(`Failed to download media: ${response.statusText}`)
      }

      const blob = await response.blob()
      const fileExt = mediaType === 'image' ? 'png' : mediaType === 'video' ? 'mp4' : 'mp3'
      const fileName = `${user.id}/${Date.now()}-${mediaType}.${fileExt}`

      // Step 2: Upload to Supabase Storage
      console.log('Uploading to storage:', fileName)
      
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json(
          { error: 'Storage not configured' },
          { status: 500 }
        )
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseKey, { 
        auth: { persistSession: false } 
      })

      // Convert blob to buffer for upload
      const arrayBuffer = await blob.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const contentType = mediaType === 'image' 
        ? 'image/png' 
        : mediaType === 'video' 
        ? 'video/mp4' 
        : 'audio/mpeg'
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('media-files')
        .upload(fileName, buffer, {
          contentType: blob.type || contentType,
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      console.log('Upload successful:', uploadData)

      // Step 3: Get public URL for the uploaded file
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('media-files')
        .getPublicUrl(fileName)

      console.log('Public URL:', publicUrl)

      // Step 4: Save to generations table with permanent URL
      const mediaTag = mediaType === 'image' 
        ? 'IMAGE_DISPLAY' 
        : mediaType === 'video' 
        ? 'VIDEO_DISPLAY' 
        : 'AUDIO_DISPLAY'
      const output = `[${mediaTag}:${publicUrl}]`

      const defaultModel = mediaType === 'image' 
        ? 'image_gen' 
        : mediaType === 'video' 
        ? 'video_gen' 
        : 'audio_gen'

      const { data: generation, error: saveError } = await supabaseAdmin
        .from('generations')
        .insert({
          user_id: user.id,
          prompt: prompt,
          output: output,
          model: model || defaultModel,
          temperature: null,
          top_k: null,
          parent_id: null
        })
        .select()
        .single()

      if (saveError) {
        console.error('Save error:', saveError)
        throw new Error(`Failed to save generation: ${saveError.message}`)
      }

      const mediaTypeLabel = mediaType === 'image' 
        ? 'Image' 
        : mediaType === 'video' 
        ? 'Video' 
        : 'Audio'

      return NextResponse.json({
        success: true,
        message: `${mediaTypeLabel} saved successfully!`,
        generation: generation,
        storageUrl: publicUrl,
        fileName: fileName
      })

    } catch (error: any) {
      console.error('Save media error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to save media',
          details: error.message 
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

