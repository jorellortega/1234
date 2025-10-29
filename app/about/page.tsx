import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Brain,
  Database,
  FileText,
  Image,
  Video,
  Mic,
  Code,
  Shield,
  Zap,
  Infinity,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Cpu,
  Globe,
  User,
  Target,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'About INFINITO - Advanced AI Platform | Our Mission & Features',
  description: 'Learn about INFINITO, the advanced AI platform offering unlimited AI generations, persistent memory core, document processing, image generation, video creation, and audio AI capabilities.',
}

export default function AboutPage() {
  const features = [
    {
      icon: Brain,
      title: 'Advanced AI Models',
      description: 'Access to cutting-edge language models and AI systems. Choose the perfect model for your needs from our curated selection.',
    },
    {
      icon: Database,
      title: 'Memory Core',
      description: 'Persistent memory system that learns and remembers your preferences, conversation history, and context across all interactions.',
    },
    {
      icon: FileText,
      title: 'Document Processing',
      description: 'Upload and process PDF, Word, and text documents with AI-powered analysis, summarization, and intelligent question answering.',
    },
    {
      icon: Image,
      title: 'Image Generation',
      description: 'Create stunning images with leading image generation models. Analyze images with advanced vision models and AI capabilities.',
    },
    {
      icon: Video,
      title: 'Video Generation',
      description: 'Generate professional videos using advanced video generation models. Transform text prompts into dynamic visual content.',
    },
    {
      icon: Mic,
      title: 'Audio AI',
      description: 'High-quality text-to-speech, speech-to-text conversion, and advanced audio processing capabilities for voice interactions.',
    },
    {
      icon: Code,
      title: 'Code Generation',
      description: 'AI-powered code generation, debugging, optimization, and technical assistance for developers and programmers.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Enterprise-grade security with encrypted data storage, secure API key management, and privacy-first architecture.',
    },
  ]

  const capabilities = [
    'Modern Web Architecture',
    'Advanced AI Integration',
    'Image & Video Processing',
    'Audio Processing',
    'Cloud Infrastructure',
    'Type-Safe Development',
    'Responsive Design',
    'Real-time Streaming',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700">
            <Infinity className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-slate-300">About INFINITO</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            The AI of Infinite Possibilities
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
            INFINITO is an advanced AI platform that combines cutting-edge artificial intelligence
            with a revolutionary memory core system, enabling unlimited creativity and productivity
            across text, image, video, and audio generation.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-500 hover:bg-blue-600">
              <Link href="/signup">Sign Up</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-700">
              <Link href="/">Try INFINITO Now</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-700">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-3xl mb-4 flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-purple-400" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300 text-lg leading-relaxed">
              <p>
                INFINITO was born from the vision of making advanced AI accessible to everyone.
                We believe that artificial intelligence should be powerful, intuitive, and
                personalized. Our platform bridges the gap between cutting-edge AI research
                and practical, everyday applications.
              </p>
              <p>
                Unlike traditional AI platforms, INFINITO features a revolutionary{" "}
                <strong className="text-white">Memory Core</strong> that learns and remembers
                your preferences, making every interaction more contextually aware and personalized.
                This persistent memory system ensures that your AI assistant grows smarter
                with every conversation.
              </p>
              <p>
                We integrate the world's best AI technologies and services into a single, unified
                platform. Whether you need to generate text, create images, produce videos, process
                documents, or interact with audio, INFINITO provides the tools you need in one place.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Comprehensive AI Capabilities
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card
                  key={index}
                  className="bg-slate-900/50 border-slate-800 hover:border-blue-500/50 transition-all duration-300"
                >
                  <CardHeader>
                    <div className="mb-4">
                      <Icon className="h-10 w-10 text-blue-400" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-slate-400">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">How INFINITO Works</h2>
          <div className="space-y-8">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Zap className="h-6 w-6 text-yellow-400" />
                  1. Powered by Modern AI Technology
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300">
                INFINITO leverages cutting-edge artificial intelligence technology to deliver
                powerful capabilities across text, images, videos, and audio. Our platform
                automatically selects the best AI solutions for your needs.
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Database className="h-6 w-6 text-purple-400" />
                  2. Memory Core Learns
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300">
                Our persistent memory system stores context, preferences, and conversation history.
                Every interaction builds upon previous knowledge, creating a truly personalized
                AI experience.
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-pink-400" />
                  3. Generate & Create
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300">
                Generate text, create images, produce videos, process documents, or interact with
                audio—all in real-time with streaming responses. Save your creations to your
                personal library for future reference.
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Globe className="h-6 w-6 text-cyan-400" />
                  4. Access Anywhere
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300">
                INFINITO is a web-based platform accessible from any device. Your memory core,
                library, and preferences sync seamlessly across all your devices.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Built With Modern Technology</h2>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {capabilities.map((capability, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                  >
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span className="text-slate-300">{capability}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Model */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-slate-800">
            <CardHeader>
              <CardTitle className="text-3xl mb-4 flex items-center gap-3">
                <Cpu className="h-8 w-8 text-blue-400" />
                Credit-Based Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-300 text-lg">
              <p>
                INFINITO uses a transparent, credit-based pricing model. Each AI operation
                consumes credits based on the model and complexity. This ensures you only
                pay for what you use, with no hidden fees or subscription locks.
              </p>
              <p>
                Our pricing includes a modest markup to cover platform maintenance,
                infrastructure costs, and continuous development. Credits never expire, and
                you can purchase additional credits at any time.
              </p>
              <Button asChild className="mt-4 bg-blue-500 hover:bg-blue-600">
                <Link href="/pricing">
                  View Detailed Pricing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Developer Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-slate-800">
            <CardHeader>
              <CardTitle className="text-3xl mb-4 flex items-center gap-3">
                <User className="h-8 w-8 text-purple-400" />
                About the Developer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-slate-300 text-lg leading-relaxed">
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-blue-400">JOR</span>
                  <span className="text-slate-400">/</span>
                  <span>Jorge Ortega Raya</span>
                </h3>
                <div className="p-6 rounded-lg bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-2 border-purple-500/30 mb-4">
                  <p className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    Going beyond our own limits
                  </p>
                  <p className="text-xl md:text-2xl font-semibold text-center text-white italic">
                    Poder Infinito
                  </p>
                </div>
                <p>
                  INFINITO is the vision of <strong className="text-white">Jorge Ortega Raya (JOR)</strong>,
                  a dedicated developer and AI enthusiast committed to pushing the boundaries of what's possible
                  with artificial intelligence.
                </p>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <Target className="h-6 w-6 text-yellow-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white mb-2">Mission</p>
                    <p>
                      <strong className="text-white">To build AI that replaces computers.</strong> This isn't just
                      about creating better software—it's about fundamentally reimagining how we interact with
                      technology. Every feature in INFINITO, from the memory core to advanced AI generation, is
                      a step toward a future where AI becomes the primary interface for computing, creativity, and
                      productivity.
                    </p>
                  </div>
                </div>
                <p>
                  Through INFINITO, JOR is building the foundation for a new paradigm where artificial intelligence
                  doesn't just assist users—it becomes the environment in which all digital interactions occur.
                  This platform represents the first steps toward that vision, combining cutting-edge AI models
                  with persistent memory and intuitive interfaces.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="py-12">
              <h2 className="text-4xl font-bold mb-4">Ready to Experience INFINITO?</h2>
              <p className="text-xl text-slate-300 mb-8">
                Join thousands of users who are already creating with AI. Get started today—
                it's free to sign up.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button asChild size="lg" className="bg-blue-500 hover:bg-blue-600">
                  <Link href="/signup">Get Started Free</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-slate-700">
                  <Link href="/">Try Demo</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Structured Data Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            mainEntity: {
              '@type': 'SoftwareApplication',
              name: 'INFINITO',
              applicationCategory: 'AI Platform',
              operatingSystem: 'Web',
              url: 'https://infinito.ai',
              description:
                'Advanced AI platform offering unlimited AI generations, persistent memory core, document processing, image generation, video creation, and audio AI capabilities.',
              featureList: [
                'Unlimited AI text generation with state-of-the-art language models',
                'Persistent memory core that learns and remembers',
                'Document processing (PDF, Word, Text)',
                'Image generation with leading AI models',
                'Video generation with advanced AI models',
                'Audio AI with text-to-speech and speech-to-text',
                'Advanced AI capabilities',
                'Real-time AI response streaming',
              ],
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                description: 'Free to sign up with credit-based pricing',
              },
              provider: {
                '@type': 'Organization',
                name: 'INFINITO Team',
                url: 'https://infinito.ai',
              },
            },
          }),
        }}
      />
    </div>
  )
}

