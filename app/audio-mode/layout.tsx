import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Audio Mode - INFINITO | AI Text-to-Speech",
  description: "Convert text to natural-sounding speech with INFINITO's advanced text-to-speech tools. Support for ElevenLabs, Google TTS, Amazon Polly, and OpenAI TTS. Enhanced with AI prompt optimization.",
  keywords: [
    'AI text-to-speech',
    'TTS',
    'ElevenLabs',
    'speech synthesis',
    'voice generation',
    'AI audio',
    'voice AI',
    'text-to-voice',
    'audio generation',
    'prompt enhancement',
    'natural speech',
    'voice production',
  ],
}

export default function AudioModeLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}

