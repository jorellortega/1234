import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Image Mode - INFINITO | AI Image Generation",
  description: "Create stunning AI-generated images with INFINITO's advanced image generation tools. Support for DALL-E 3, RunwayML Gen-4 Image, Gemini 2.5 Flash, and more. Enhanced with AI prompt optimization.",
  keywords: [
    'AI image generation',
    'image AI',
    'DALL-E 3',
    'RunwayML',
    'Gen-4 Image',
    'text-to-image',
    'AI image creation',
    'image synthesis',
    'AI art',
    'prompt enhancement',
    'digital art',
    'image production',
  ],
}

export default function ImageModeLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}

