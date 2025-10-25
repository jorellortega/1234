"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Brain, 
  Zap, 
  Database, 
  Shield, 
  Sparkles, 
  ArrowRight, 
  CheckCircle, 
  Star,
  Users,
  Globe,
  Cpu,
  FileText,
  Image,
  Mic,
  Code,
  Lock,
  Infinity,
  Rocket,
  Target,
  Lightbulb,
  TrendingUp
} from "lucide-react"

export default function InfinitoPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const features = [
    {
      icon: Brain,
      title: "Advanced AI Models",
      description: "Access to cutting-edge language models and open-source alternatives",
      color: "text-blue-400"
    },
    {
      icon: Database,
      title: "Memory Core",
      description: "Persistent memory system that learns and remembers your preferences",
      color: "text-purple-400"
    },
    {
      icon: FileText,
      title: "Document Processing",
      description: "Upload and process documents with AI-powered analysis and insights",
      color: "text-green-400"
    },
    {
      icon: Image,
      title: "Vision AI",
      description: "Image analysis, generation, and multimodal AI capabilities",
      color: "text-pink-400"
    },
    {
      icon: Mic,
      title: "Audio Processing",
      description: "Speech-to-text, text-to-speech, and audio analysis",
      color: "text-orange-400"
    },
    {
      icon: Code,
      title: "Code Generation",
      description: "AI-powered code generation, debugging, and optimization",
      color: "text-cyan-400"
    }
  ]

  const stats = [
    { number: "∞", label: "AI Generations", icon: Infinity },
    { number: "∞", label: "Memories Stored", icon: Database },
    { number: "∞", label: "Documents Processed", icon: FileText },
    { number: "∞", label: "Models Supported", icon: Cpu }
  ]

  const benefits = [
    "Unlimited AI interactions with credit system",
    "Persistent memory across all conversations",
    "Multi-modal AI capabilities (text, image, audio)",
    "Document processing and analysis",
    "Custom AI model integration",
    "Secure and private data handling",
    "Real-time AI responses",
    "Advanced prompt engineering tools"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "INFINITO",
            "description": "Advanced AI platform offering unlimited AI generations, persistent memory core, document processing, and multi-modal AI capabilities",
            "url": "https://infinito.ai/infinito",
            "applicationCategory": "AI Platform",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "description": "Free trial available"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "5.0",
              "ratingCount": "1000"
            },
            "featureList": [
              "Unlimited AI generations",
              "Persistent memory core",
              "Document processing",
              "Multi-modal AI capabilities",
              "Advanced language model integration",
              "Real-time AI responses",
              "Secure data handling",
              "Custom AI model integration"
            ],
            "screenshot": "/placeholder-logo.svg",
            "softwareVersion": "1.0",
            "datePublished": "2024-01-01",
            "dateModified": "2024-01-01",
            "author": {
              "@type": "Organization",
              "name": "INFINITO Team"
            },
            "publisher": {
              "@type": "Organization",
              "name": "INFINITO",
              "url": "https://infinito.ai"
            },
            "keywords": [
              "AI",
              "artificial intelligence",
              "GPT-4",
              "Claude",
              "Gemini",
              "AI platform",
              "machine learning",
              "AI memory",
              "document processing",
              "AI generation",
              "AI models",
              "open source AI"
            ]
          })
        }}
      />

      {/* Header with Home Button */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/">
            <Button variant="outline" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10">
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 animate-pulse"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Badge className="mb-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              <Sparkles className="h-4 w-4 mr-2" />
              The Future of AI is Here
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              INFINITO
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-4xl mx-auto leading-relaxed">
              Process text, images, audio, and video with intelligent memory, document analysis, 
              code generation, and unlimited AI interactions that understand your context.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:brightness-110 text-white font-bold px-8 py-4 text-lg">
                  <Rocket className="h-5 w-5 mr-2" />
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 px-8 py-4 text-lg">
                  <Users className="h-5 w-5 mr-2" />
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <stat.icon className="h-6 w-6 text-cyan-400 mr-2" />
                    <span className="text-3xl font-bold text-cyan-400">{stat.number}</span>
                  </div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Powerful AI Capabilities
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Experience the full spectrum of artificial intelligence with our comprehensive platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-black/40 backdrop-blur-md border-cyan-500/30 shadow-2xl shadow-cyan-500/20 hover:shadow-cyan-400/30 transition-all duration-300 hover:scale-105">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-slate-300 text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Why Choose INFINITO?
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                INFINITO isn't just another AI platform. It's a complete ecosystem designed 
                to enhance your productivity and creativity with advanced artificial intelligence.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                    <span className="text-slate-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl p-8 backdrop-blur-md border border-cyan-500/30">
                <div className="text-center">
                  <Brain className="h-16 w-16 text-cyan-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-4">AI Memory Core</h3>
                  <p className="text-slate-300 mb-6">
                    Our revolutionary memory system remembers every interaction, 
                    creating a personalized AI experience that grows with you.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-cyan-400">∞</div>
                      <div className="text-sm text-slate-400">Memories</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-cyan-400">∞</div>
                      <div className="text-sm text-slate-400">Context</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-24 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Powered by Advanced AI
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Built on the latest artificial intelligence models and cutting-edge technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-md border-blue-500/30 shadow-2xl shadow-blue-500/20">
              <CardContent className="text-center p-6">
                <Brain className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Language Models</h3>
                <p className="text-slate-300 text-sm">Latest AI models</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-md border-purple-500/30 shadow-2xl shadow-purple-500/20">
              <CardContent className="text-center p-6">
                <Database className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Memory Core</h3>
                <p className="text-slate-300 text-sm">Persistent AI memory</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-md border-green-500/30 shadow-2xl shadow-green-500/20">
              <CardContent className="text-center p-6">
                <Shield className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Secure</h3>
                <p className="text-slate-300 text-sm">Enterprise-grade security</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 backdrop-blur-md border-orange-500/30 shadow-2xl shadow-orange-500/20">
              <CardContent className="text-center p-6">
                <Zap className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Fast</h3>
                <p className="text-slate-300 text-sm">Real-time responses</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Experience the Future?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of users who are already using INFINITO to enhance their productivity 
            and creativity with advanced AI.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:brightness-110 text-white font-bold px-8 py-4 text-lg">
                <Rocket className="h-5 w-5 mr-2" />
                Get Started Free
              </Button>
            </Link>
            <Link href="/library">
              <Button size="lg" variant="outline" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 px-8 py-4 text-lg">
                <Database className="h-5 w-5 mr-2" />
                View Examples
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 backdrop-blur-md border-t border-cyan-500/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Infinity className="h-8 w-8 text-cyan-400" />
              <span className="text-2xl font-bold text-white">INFINITO</span>
            </div>
            <p className="text-slate-400 mb-6">
              The ultimate AI platform for unlimited creativity and productivity
            </p>
            <div className="flex justify-center gap-6">
              <Link href="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Home
              </Link>
              <Link href="/library" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Library
              </Link>
              <Link href="/profile" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Profile
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
