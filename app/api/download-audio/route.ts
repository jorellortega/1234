import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const audioUrl = searchParams.get('url')
  
  if (!audioUrl) {
    return NextResponse.json({ error: 'No audio URL provided' }, { status: 400 })
  }
  
  try {
    const response = await fetch(audioUrl)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch audio' }, { status: response.status })
    }
    
    const blob = await response.blob()
    
    // Determine content type from the fetched blob or default to mp3
    const contentType = blob.type || 'audio/mpeg'
    
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="Infinito-Audio.mp3"`,
      },
    })
  } catch (error) {
    console.error('Error downloading audio:', error)
    return NextResponse.json({ error: 'Failed to download audio' }, { status: 500 })
  }
}

