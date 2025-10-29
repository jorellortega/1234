import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About INFINITO - Advanced AI Platform | Our Mission & Features',
  description: 'Learn about INFINITO, the advanced AI platform offering unlimited AI generations, persistent memory core, document processing, image generation, video creation, and audio AI capabilities. Discover our mission, features, and technology.',
  keywords: [
    'about INFINITO',
    'INFINITO AI platform',
    'AI platform features',
    'artificial intelligence platform',
    'advanced AI platform',
    'AI memory system',
    'document processing AI',
    'image generation platform',
    'video generation AI',
    'AI technology',
    'AI integration',
    'AI platform mission',
    'AI platform vision',
  ],
  authors: [{ name: 'INFINITO Team' }],
  creator: 'INFINITO',
  publisher: 'INFINITO',
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
    url: 'https://infinito.ai/about',
    title: 'About INFINITO - Advanced AI Platform',
    description: 'Learn about INFINITO, the AI platform with unlimited generations, memory core, document processing, image and video generation, and audio AI capabilities.',
    siteName: 'INFINITO',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'About INFINITO - Advanced AI Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About INFINITO - Advanced AI Platform',
    description: 'Learn about INFINITO, the AI platform with unlimited generations, memory core, and comprehensive AI capabilities.',
    images: ['/og-image.png'],
    creator: '@infinito_ai',
  },
  alternates: {
    canonical: 'https://infinito.ai/about',
  },
  category: 'Technology',
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

