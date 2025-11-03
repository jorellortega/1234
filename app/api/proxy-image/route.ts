import { NextRequest, NextResponse } from 'next/server'

/**
 * Image Proxy API
 * 
 * Proxies images from external sources (like CloudFront) with proper CORS headers
 * to allow canvas manipulation in the browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')
  
  if (!imageUrl) {
    return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
  }
  
  try {
    // Validate URL format
    let url: URL
    try {
      url = new URL(imageUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }
    
    // Fetch the image from the server-side (no CORS issues)
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)'
      }
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'image/png'
    
    // Get the image data
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Return the image with CORS headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    console.error('Error proxying image:', error)
    return NextResponse.json(
      { error: `Failed to proxy image: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
