import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "INFINITO - Advanced AI Platform | Unlimited AI Generations & Memory Core",
  description: "INFINITO is the ultimate AI platform offering unlimited AI generations, persistent memory core, document processing, image generation, video creation, audio AI, and multi-modal AI capabilities. Experience the future of artificial intelligence with GPT models, OpenAI, RunwayML, and more.",
  keywords: [
    'AI',
    'artificial intelligence',
    'AI platform',
    'machine learning',
    'AI memory',
    'document processing',
    'AI generation',
    'AI models',
    'GPT-4',
    'GPT-4o',
    'OpenAI',
    'RunwayML',
    'image generation',
    'video generation',
    'text to speech',
    'speech to text',
    'AI assistant',
    'conversational AI',
    'AI chatbot',
    'AI automation',
    'AI productivity',
    'AI creativity',
    'AI tools',
    'AI software',
    'memory core',
    'personal AI',
    'open source AI',
    'AI development',
    'AI integration',
    'AI solutions',
    'AI technology',
    'AI innovation',
    'multimodal AI',
    'DALL-E',
    'ElevenLabs',
  ],
  authors: [{ name: 'INFINITO Team' }],
  creator: 'INFINITO',
  publisher: 'INFINITO',
  generator: 'Next.js',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://infinito.ai',
    title: 'INFINITO - Advanced AI Platform with Memory Core',
    description: 'Unlimited AI generations with persistent memory core. Generate text, images, videos, and audio. Process documents with AI. The future of artificial intelligence is here.',
    siteName: 'INFINITO',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'INFINITO - Advanced AI Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'INFINITO - Advanced AI Platform',
    description: 'Unlimited AI generations with persistent memory core. Generate text, images, videos, and audio with AI.',
    images: ['/og-image.png'],
    creator: '@infinito_ai',
  },
  alternates: {
    canonical: 'https://infinito.ai',
  },
  category: 'Technology',
  classification: 'AI Platform',
  other: {
    'application-name': 'INFINITO',
    'apple-mobile-web-app-title': 'INFINITO',
    'msapplication-TileColor': '#0ea5e9',
    'theme-color': '#0ea5e9',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "INFINITO",
    "applicationCategory": "AI Platform",
    "operatingSystem": "Web",
    "url": "https://infinito.ai",
    "description": "Advanced AI platform offering unlimited AI generations, persistent memory core, document processing, image generation, video creation, audio AI, and multi-modal AI capabilities with GPT models, OpenAI, RunwayML, and more.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "description": "Free trial available with credit-based pricing"
    },
    "featureList": [
      "Unlimited AI text generation with GPT-4, GPT-4o, O1, and more",
      "Persistent memory core that learns and remembers",
      "Document processing (PDF, Word, Text)",
      "Image generation with DALL-E 3 and RunwayML",
      "Video generation with RunwayML Gen-4 and Veo",
      "Audio AI with text-to-speech and speech-to-text",
      "Multi-modal AI capabilities",
      "Real-time AI response streaming",
      "Secure data handling",
      "Custom AI model integration"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5.0",
      "ratingCount": "1000"
    },
    "author": {
      "@type": "Organization",
      "name": "INFINITO Team"
    },
    "publisher": {
      "@type": "Organization",
      "name": "INFINITO",
      "url": "https://infinito.ai"
    },
    "keywords": "AI, artificial intelligence, GPT-4, OpenAI, RunwayML, image generation, video generation, AI memory, document processing, text to speech",
    "softwareVersion": "1.0",
    "datePublished": "2024-01-01",
    "dateModified": "2025-01-27"
  }

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData)
          }}
        />
        {children}
      </body>
    </html>
  )
}
