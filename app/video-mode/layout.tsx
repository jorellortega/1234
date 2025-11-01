import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Video Mode - INFINITO | AI Video Generation",
  description: "Create stunning AI-generated videos with INFINITO's advanced video generation tools. Support for RunwayML Gen-4 Turbo, Gen-3A Turbo, VEO 3.1, and more. Enhanced with AI prompt optimization.",
  keywords: [
    'AI video generation',
    'video AI',
    'RunwayML',
    'Gen-4 Turbo',
    'VEO 3.1',
    'text-to-video',
    'image-to-video',
    'AI video creation',
    'video synthesis',
    'AI animation',
    'prompt enhancement',
    'cinematic video',
    'video production',
  ],
}

export default function VideoModeLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}

