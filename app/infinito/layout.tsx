import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'INFINITO - Advanced AI Platform | Unlimited AI Generations & Memory Core',
  description: 'INFINITO is the ultimate AI platform offering unlimited AI generations, persistent memory core, document processing, and multi-modal AI capabilities. Experience the future of artificial intelligence.',
  keywords: [
    'AI',
    'artificial intelligence',
    'AI platform',
    'machine learning',
    'AI memory',
    'document processing',
    'AI generation',
    'AI models',
    'open source AI',
    'AI assistant',
    'conversational AI',
    'AI chatbot',
    'AI automation',
    'AI productivity',
    'AI creativity',
    'AI tools',
    'AI software',
    'AI development',
    'AI integration',
    'AI solutions',
    'AI technology',
    'AI innovation',
    'AI research',
    'AI applications',
    'AI services',
    'AI consulting',
    'AI implementation'
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
    url: 'https://infinito.ai/infinito',
    title: 'INFINITO - Advanced AI Platform',
    description: 'Unlimited AI generations with persistent memory core. The future of artificial intelligence is here.',
    siteName: 'INFINITO',
    images: [
      {
        url: '/placeholder-logo.svg',
        width: 1200,
        height: 630,
        alt: 'INFINITO - Advanced AI Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'INFINITO - Advanced AI Platform',
    description: 'Unlimited AI generations with persistent memory core. The future of artificial intelligence is here.',
    images: ['/placeholder-logo.svg'],
    creator: '@infinito_ai',
  },
  alternates: {
    canonical: 'https://infinito.ai/infinito',
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

export default function InfinitoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
