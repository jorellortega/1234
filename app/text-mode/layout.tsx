import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Text Mode - INFINITO | AI Text Generation",
  description: "Generate high-quality text with INFINITO's advanced AI language models. Support for GPT-4O, GPT-4, O1 Reasoning, and more. Enhanced with prompt optimization.",
  keywords: [
    'AI text generation',
    'GPT-4O',
    'GPT-4',
    'O1 reasoning',
    'language model',
    'AI chat',
    'text AI',
    'AI writing',
    'prompt enhancement',
    'natural language',
    'AI conversation',
    'text synthesis',
  ],
}

export default function TextModeLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}

