import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')
  
  if (!imageUrl) {
    return NextResponse.json({ error: 'No image URL provided' }, { status: 400 })
  }
  
  try {
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status })
    }
    
    const blob = await response.blob()
    
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="Infinito-Image.png"`,
      },
    })
  } catch (error) {
    console.error('Error downloading image:', error)
    return NextResponse.json({ error: 'Failed to download image' }, { status: 500 })
  }
}
