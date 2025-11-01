'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PricingDashboard() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAdminStatus()
  }, [])

  async function checkAdminStatus() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/check-role', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      const data = await response.json()
      
      if (data.isAdmin) {
        setIsAdmin(true)
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Admin check error:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl font-mono animate-pulse">Loading pricing data...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  // Pricing data with 60% markup
  // OpenAI Standard Tier pricing per 1M tokens (input + output) converted to per-message cost
  // Assuming typical message: 500 input tokens + 500 output tokens = 1000 tokens = 0.001M tokens
  // Updated to match OpenAI's official pricing structure (Standard Tier by default)
  const textModels = [
    // GPT-5 Series (Standard)
    { name: 'GPT-5', apiCost: 0.00563, infinitoCost: 0.009, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.25/1M in + $10/1M out', tier: 'Standard', category: 'GPT-5 Series' },
    { name: 'GPT-5 Mini', apiCost: 0.001125, infinitoCost: 0.0018, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.25/1M in + $2.00/1M out', tier: 'Standard', category: 'GPT-5 Series' },
    { name: 'GPT-5 Nano', apiCost: 0.000225, infinitoCost: 0.00036, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.05/1M in + $0.40/1M out', tier: 'Standard', category: 'GPT-5 Series' },
    { name: 'GPT-5 Chat Latest', apiCost: 0.00563, infinitoCost: 0.009, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.25/1M in + $10/1M out', tier: 'Standard', category: 'GPT-5 Series' },
    { name: 'GPT-5 Codex', apiCost: 0.00563, infinitoCost: 0.009, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.25/1M in + $10/1M out', tier: 'Standard', category: 'GPT-5 Series' },
    { name: 'GPT-5 Pro', apiCost: 0.0675, infinitoCost: 0.108, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $15/1M in + $120/1M out', tier: 'Standard', category: 'GPT-5 Series' },
    { name: 'GPT-5 Search API', apiCost: 0.00563, infinitoCost: 0.009, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.25/1M in + $10/1M out', tier: 'Standard', category: 'GPT-5 Series' },

    // GPT-4.1 Series (Standard)
    { name: 'GPT-4.1', apiCost: 0.005, infinitoCost: 0.008, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $2.00/1M in + $8.00/1M out', tier: 'Standard', category: 'GPT-4.1 Series' },
    { name: 'GPT-4.1 Mini', apiCost: 0.001, infinitoCost: 0.0016, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.40/1M in + $1.60/1M out', tier: 'Standard', category: 'GPT-4.1 Series' },
    { name: 'GPT-4.1 Nano', apiCost: 0.00025, infinitoCost: 0.0004, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.10/1M in + $0.40/1M out', tier: 'Standard', category: 'GPT-4.1 Series' },

    // GPT-4o Series (Standard)
    { name: 'GPT-4o', apiCost: 0.00625, infinitoCost: 0.01, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $2.50/1M in + $10/1M out', tier: 'Standard', category: 'GPT-4o Series' },
    { name: 'GPT-4o (2024-05-13)', apiCost: 0.01, infinitoCost: 0.016, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $5.00/1M in + $15/1M out', tier: 'Standard', category: 'GPT-4o Series' },
    { name: 'GPT-4o Mini', apiCost: 0.000375, infinitoCost: 0.0006, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.15/1M in + $0.60/1M out', tier: 'Standard', category: 'GPT-4o Series' },

    // O-Series (Reasoning) - Standard
    { name: 'O1', apiCost: 0.0375, infinitoCost: 0.06, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $15/1M in + $60/1M out', tier: 'Standard', category: 'O-Series (Reasoning)' },
    { name: 'O1 Mini', apiCost: 0.00275, infinitoCost: 0.0044, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.10/1M in + $4.40/1M out', tier: 'Standard', category: 'O-Series (Reasoning)' },
    { name: 'O1 Pro', apiCost: 0.375, infinitoCost: 0.6, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $150/1M in + $600/1M out', tier: 'Standard', category: 'O-Series (Reasoning)' },
    { name: 'O3', apiCost: 0.005, infinitoCost: 0.008, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $2.00/1M in + $8.00/1M out', tier: 'Standard', category: 'O-Series (Reasoning)' },
    { name: 'O3 Mini', apiCost: 0.00275, infinitoCost: 0.0044, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.10/1M in + $4.40/1M out', tier: 'Standard', category: 'O-Series (Reasoning)' },
    { name: 'O3 Pro', apiCost: 0.05, infinitoCost: 0.08, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $20/1M in + $80/1M out', tier: 'Standard', category: 'O-Series (Reasoning)' },
    { name: 'O3 Deep Research', apiCost: 0.025, infinitoCost: 0.04, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $10/1M in + $40/1M out', tier: 'Standard', category: 'O-Series (Reasoning)' },
    { name: 'O4 Mini', apiCost: 0.00275, infinitoCost: 0.0044, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.10/1M in + $4.40/1M out', tier: 'Standard', category: 'O-Series (Reasoning)' },
    { name: 'O4 Mini Deep Research', apiCost: 0.005, infinitoCost: 0.008, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $2.00/1M in + $8.00/1M out', tier: 'Standard', category: 'O-Series (Reasoning)' },

    // Real-Time Models (Standard)
    { name: 'GPT Realtime', apiCost: 0.01, infinitoCost: 0.016, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $4.00/1M in + $16/1M out', tier: 'Standard', category: 'Real-Time Models' },
    { name: 'GPT Realtime Mini', apiCost: 0.0015, infinitoCost: 0.0024, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.60/1M in + $2.40/1M out', tier: 'Standard', category: 'Real-Time Models' },
    { name: 'GPT-4o Realtime Preview', apiCost: 0.0125, infinitoCost: 0.02, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $5.00/1M in + $20/1M out', tier: 'Standard', category: 'Real-Time Models' },
    { name: 'GPT-4o Mini Realtime Preview', apiCost: 0.0015, infinitoCost: 0.0024, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.60/1M in + $2.40/1M out', tier: 'Standard', category: 'Real-Time Models' },

    // Audio Models (Standard)
    { name: 'GPT Audio', apiCost: 0.00625, infinitoCost: 0.01, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $2.50/1M in + $10/1M out', tier: 'Standard', category: 'Audio Models' },
    { name: 'GPT Audio Mini', apiCost: 0.0015, infinitoCost: 0.0024, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.60/1M in + $2.40/1M out', tier: 'Standard', category: 'Audio Models' },
    { name: 'GPT-4o Audio Preview', apiCost: 0.00625, infinitoCost: 0.01, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $2.50/1M in + $10/1M out', tier: 'Standard', category: 'Audio Models' },
    { name: 'GPT-4o Mini Audio Preview', apiCost: 0.000375, infinitoCost: 0.0006, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.15/1M in + $0.60/1M out', tier: 'Standard', category: 'Audio Models' },

    // Search Models (Standard)
    { name: 'GPT-4o Search Preview', apiCost: 0.00625, infinitoCost: 0.01, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $2.50/1M in + $10/1M out', tier: 'Standard', category: 'Search Models' },
    { name: 'GPT-4o Mini Search Preview', apiCost: 0.000375, infinitoCost: 0.0006, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.15/1M in + $0.60/1M out', tier: 'Standard', category: 'Search Models' },

    // Codex Models (Standard)
    { name: 'Codex Mini Latest', apiCost: 0.00375, infinitoCost: 0.006, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.50/1M in + $6.00/1M out', tier: 'Standard', category: 'Codex Models' },

    // Special Models (Standard)
    { name: 'Computer Use Preview', apiCost: 0.0075, infinitoCost: 0.012, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $3.00/1M in + $12/1M out', tier: 'Standard', category: 'Special Models' },

    // Legacy GPT-4 (Standard)
    { name: 'ChatGPT-4o Latest', apiCost: 0.01, infinitoCost: 0.016, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $5.00/1M in + $15/1M out', tier: 'Standard', category: 'Legacy GPT-4' },
    { name: 'GPT-4 Turbo (2024-04-09)', apiCost: 0.02, infinitoCost: 0.032, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $10/1M in + $30/1M out', tier: 'Standard', category: 'Legacy GPT-4' },
    { name: 'GPT-4 (0125 Preview)', apiCost: 0.02, infinitoCost: 0.032, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $10/1M in + $30/1M out', tier: 'Standard', category: 'Legacy GPT-4' },
    { name: 'GPT-4 (1106 Preview)', apiCost: 0.02, infinitoCost: 0.032, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $10/1M in + $30/1M out', tier: 'Standard', category: 'Legacy GPT-4' },
    { name: 'GPT-4 Vision (1106)', apiCost: 0.02, infinitoCost: 0.032, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $10/1M in + $30/1M out', tier: 'Standard', category: 'Legacy GPT-4' },
    { name: 'GPT-4 (0613)', apiCost: 0.045, infinitoCost: 0.072, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $30/1M in + $60/1M out', tier: 'Standard', category: 'Legacy GPT-4' },
    { name: 'GPT-4 (0314)', apiCost: 0.045, infinitoCost: 0.072, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $30/1M in + $60/1M out', tier: 'Standard', category: 'Legacy GPT-4' },
    { name: 'GPT-4 32K', apiCost: 0.09, infinitoCost: 0.144, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $60/1M in + $120/1M out', tier: 'Standard', category: 'Legacy GPT-4' },

    // Legacy GPT-3.5 (Standard)
    { name: 'GPT-3.5 Turbo', apiCost: 0.001, infinitoCost: 0.0016, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.50/1M in + $1.50/1M out', tier: 'Standard', category: 'Legacy GPT-3.5' },
    { name: 'GPT-3.5 Turbo (0125)', apiCost: 0.001, infinitoCost: 0.0016, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.50/1M in + $1.50/1M out', tier: 'Standard', category: 'Legacy GPT-3.5' },
    { name: 'GPT-3.5 Turbo (1106)', apiCost: 0.0015, infinitoCost: 0.0024, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.00/1M in + $2.00/1M out', tier: 'Standard', category: 'Legacy GPT-3.5' },
    { name: 'GPT-3.5 Turbo (0613)', apiCost: 0.00175, infinitoCost: 0.0028, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.50/1M in + $2.00/1M out', tier: 'Standard', category: 'Legacy GPT-3.5' },
    { name: 'GPT-3.5 (0301)', apiCost: 0.00175, infinitoCost: 0.0028, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.50/1M in + $2.00/1M out', tier: 'Standard', category: 'Legacy GPT-3.5' },
    { name: 'GPT-3.5 Turbo Instruct', apiCost: 0.00175, infinitoCost: 0.0028, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $1.50/1M in + $2.00/1M out', tier: 'Standard', category: 'Legacy GPT-3.5' },
    { name: 'GPT-3.5 Turbo 16K', apiCost: 0.0035, infinitoCost: 0.0056, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $3.00/1M in + $4.00/1M out', tier: 'Standard', category: 'Legacy GPT-3.5' },

    // Base Models (Standard)
    { name: 'Davinci-002', apiCost: 0.002, infinitoCost: 0.0032, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $2.00/1M in + $2.00/1M out', tier: 'Standard', category: 'Base Models' },
    { name: 'Babbage-002', apiCost: 0.0004, infinitoCost: 0.00064, apiProvider: 'OpenAI', unit: 'per message', note: 'Standard: $0.40/1M in + $0.40/1M out', tier: 'Standard', category: 'Base Models' },

    // Local Models
    { name: 'Llama (Zephyr)', apiCost: 0, infinitoCost: 0, apiProvider: 'Local/Ollama', unit: 'per message', note: 'Free local model', tier: 'Local', category: 'Local Models' },
    { name: 'Mistral (Maestro)', apiCost: 0, infinitoCost: 0, apiProvider: 'Local/Ollama', unit: 'per message', note: 'Free local model', tier: 'Local', category: 'Local Models' },
  ]

  // Image Generation (Prices per image)
  const imageGenerationModels = [
    { name: 'GPT Image 1 - Low', apiCost: 0.011, infinitoCost: 0.0176, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1024', quality: 'Low' },
    { name: 'GPT Image 1 - Low', apiCost: 0.016, infinitoCost: 0.0256, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1536 / 1536x1024', quality: 'Low' },
    { name: 'GPT Image 1 - Medium', apiCost: 0.042, infinitoCost: 0.0672, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1024', quality: 'Medium' },
    { name: 'GPT Image 1 - Medium', apiCost: 0.063, infinitoCost: 0.1008, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1536 / 1536x1024', quality: 'Medium' },
    { name: 'GPT Image 1 - High', apiCost: 0.167, infinitoCost: 0.2672, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1024', quality: 'High' },
    { name: 'GPT Image 1 - High', apiCost: 0.25, infinitoCost: 0.4, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1536 / 1536x1024', quality: 'High' },
    { name: 'GPT Image 1 Mini - Low', apiCost: 0.005, infinitoCost: 0.008, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1024', quality: 'Low' },
    { name: 'GPT Image 1 Mini - Low', apiCost: 0.006, infinitoCost: 0.0096, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1536 / 1536x1024', quality: 'Low' },
    { name: 'GPT Image 1 Mini - Medium', apiCost: 0.011, infinitoCost: 0.0176, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1024', quality: 'Medium' },
    { name: 'GPT Image 1 Mini - Medium', apiCost: 0.015, infinitoCost: 0.024, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1536 / 1536x1024', quality: 'Medium' },
    { name: 'GPT Image 1 Mini - High', apiCost: 0.036, infinitoCost: 0.0576, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1024', quality: 'High' },
    { name: 'GPT Image 1 Mini - High', apiCost: 0.052, infinitoCost: 0.0832, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1536 / 1536x1024', quality: 'High' },
    { name: 'DALL·E 3 - Standard', apiCost: 0.04, infinitoCost: 0.064, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1024', quality: 'Standard' },
    { name: 'DALL·E 3 - Standard', apiCost: 0.08, infinitoCost: 0.128, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1536 / 1536x1024', quality: 'Standard' },
    { name: 'DALL·E 3 - HD', apiCost: 0.08, infinitoCost: 0.128, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1024', quality: 'HD' },
    { name: 'DALL·E 3 - HD', apiCost: 0.12, infinitoCost: 0.192, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1536 / 1536x1024', quality: 'HD' },
    { name: 'DALL·E 2 - Standard', apiCost: 0.016, infinitoCost: 0.0256, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1024', quality: 'Standard' },
    { name: 'DALL·E 2 - Standard', apiCost: 0.018, infinitoCost: 0.0288, apiProvider: 'OpenAI', unit: 'per image', note: '1024x1536', quality: 'Standard' },
    { name: 'DALL·E 2 - Standard', apiCost: 0.02, infinitoCost: 0.032, apiProvider: 'OpenAI', unit: 'per image', note: '1536x1024', quality: 'Standard' },
    // RunwayML models
    { name: 'Gen4 Image', apiCost: 5, infinitoCost: 8, apiProvider: 'RunwayML', unit: 'per 720p/1080p image' },
    { name: 'Gen4 Image Turbo', apiCost: 2, infinitoCost: 3, apiProvider: 'RunwayML', unit: 'per image (any res)' },
    { name: 'Gemini 2.5 Flash', apiCost: 5, infinitoCost: 8, apiProvider: 'RunwayML', unit: 'per image' },
    // Local models
    { name: 'BLIP (Vision)', apiCost: 0, infinitoCost: 0, apiProvider: 'Local/Ollama', unit: 'per image' },
    { name: 'LLaVA (Vision)', apiCost: 0, infinitoCost: 0, apiProvider: 'Local/Ollama', unit: 'per image' },
  ]

  // Video Models (Prices per second)
  const videoModels = [
    // OpenAI Sora models
    { name: 'Sora 2', apiCost: 0.10, infinitoCost: 0.16, apiProvider: 'OpenAI', unit: 'per second', note: '720x1280 Portrait / 1280x720 Landscape' },
    { name: 'Sora 2 Pro', apiCost: 0.30, infinitoCost: 0.48, apiProvider: 'OpenAI', unit: 'per second', note: '720x1280 Portrait / 1280x720 Landscape' },
    { name: 'Sora 2 Pro', apiCost: 0.50, infinitoCost: 0.80, apiProvider: 'OpenAI', unit: 'per second', note: '1024x1792 Portrait / 1792x1024 Landscape' },
    // RunwayML models
    { name: 'Gen4 Turbo (I2V)', apiCost: 5, infinitoCost: 8, apiProvider: 'RunwayML', unit: 'per second', note: '2-10s duration' },
    { name: 'Gen3a Turbo (I2V)', apiCost: 10, infinitoCost: 16, apiProvider: 'RunwayML', unit: 'per second', note: '5s or 10s duration' },
    { name: 'VEO 3.1 (T2V/I2V)', apiCost: 40, infinitoCost: 64, apiProvider: 'RunwayML', unit: 'per second', note: '4s, 6s, or 8s duration' },
    { name: 'VEO 3.1 Fast (T2V/I2V)', apiCost: 20, infinitoCost: 32, apiProvider: 'RunwayML', unit: 'per second', note: '4s, 6s, or 8s duration' },
    { name: 'VEO 3 (T2V/I2V)', apiCost: 40, infinitoCost: 64, apiProvider: 'RunwayML', unit: 'per second', note: '8s duration only' },
    { name: 'Gen4 Aleph (V2V)', apiCost: 15, infinitoCost: 24, apiProvider: 'RunwayML', unit: 'per second', note: 'Video-to-video' },
  ]

  // Image Tokens (Prices per 1M tokens)
  const imageTokenModels = [
    { name: 'GPT Image 1', apiCost: 10.00, infinitoCost: 16.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT Image 1', apiCost: 2.50, infinitoCost: 4.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Cached Input', type: 'Cached Input' },
    { name: 'GPT Image 1', apiCost: 40.00, infinitoCost: 64.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Output', type: 'Output' },
    { name: 'GPT Image 1 Mini', apiCost: 2.50, infinitoCost: 4.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT Image 1 Mini', apiCost: 0.25, infinitoCost: 0.40, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Cached Input', type: 'Cached Input' },
    { name: 'GPT Image 1 Mini', apiCost: 8.00, infinitoCost: 12.80, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Output', type: 'Output' },
    { name: 'GPT Realtime', apiCost: 5.00, infinitoCost: 8.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT Realtime', apiCost: 0.50, infinitoCost: 0.80, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Cached Input', type: 'Cached Input' },
    { name: 'GPT Realtime Mini', apiCost: 0.80, infinitoCost: 1.28, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT Realtime Mini', apiCost: 0.08, infinitoCost: 0.128, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Cached Input', type: 'Cached Input' },
  ]

  // Audio Tokens (Prices per 1M tokens)
  const audioTokenModels = [
    { name: 'GPT Realtime', apiCost: 32.00, infinitoCost: 51.20, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT Realtime', apiCost: 0.40, infinitoCost: 0.64, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Cached Input', type: 'Cached Input' },
    { name: 'GPT Realtime', apiCost: 64.00, infinitoCost: 102.40, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Output', type: 'Output' },
    { name: 'GPT Realtime Mini', apiCost: 10.00, infinitoCost: 16.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT Realtime Mini', apiCost: 0.30, infinitoCost: 0.48, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Cached Input', type: 'Cached Input' },
    { name: 'GPT Realtime Mini', apiCost: 20.00, infinitoCost: 32.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Output', type: 'Output' },
    { name: 'GPT-4o Realtime Preview', apiCost: 40.00, infinitoCost: 64.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT-4o Realtime Preview', apiCost: 2.50, infinitoCost: 4.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Cached Input', type: 'Cached Input' },
    { name: 'GPT-4o Realtime Preview', apiCost: 80.00, infinitoCost: 128.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Output', type: 'Output' },
    { name: 'GPT-4o Mini Realtime Preview', apiCost: 10.00, infinitoCost: 16.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT-4o Mini Realtime Preview', apiCost: 0.30, infinitoCost: 0.48, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Cached Input', type: 'Cached Input' },
    { name: 'GPT-4o Mini Realtime Preview', apiCost: 20.00, infinitoCost: 32.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Output', type: 'Output' },
    { name: 'GPT Audio', apiCost: 32.00, infinitoCost: 51.20, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT Audio', apiCost: 64.00, infinitoCost: 102.40, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Output', type: 'Output' },
    { name: 'GPT Audio Mini', apiCost: 10.00, infinitoCost: 16.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT Audio Mini', apiCost: 20.00, infinitoCost: 32.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Output', type: 'Output' },
    { name: 'GPT-4o Audio Preview', apiCost: 40.00, infinitoCost: 64.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT-4o Audio Preview', apiCost: 80.00, infinitoCost: 128.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Output', type: 'Output' },
    { name: 'GPT-4o Mini Audio Preview', apiCost: 10.00, infinitoCost: 16.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Input', type: 'Input' },
    { name: 'GPT-4o Mini Audio Preview', apiCost: 20.00, infinitoCost: 32.00, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Output', type: 'Output' },
  ]

  // Embeddings (Prices per 1M tokens)
  const embeddingModels = [
    { name: 'text-embedding-3-small', apiCost: 0.02, infinitoCost: 0.032, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Standard', type: 'Standard' },
    { name: 'text-embedding-3-small', apiCost: 0.01, infinitoCost: 0.016, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Batch', type: 'Batch' },
    { name: 'text-embedding-3-large', apiCost: 0.13, infinitoCost: 0.208, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Standard', type: 'Standard' },
    { name: 'text-embedding-3-large', apiCost: 0.065, infinitoCost: 0.104, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Batch', type: 'Batch' },
    { name: 'text-embedding-ada-002', apiCost: 0.10, infinitoCost: 0.16, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Standard', type: 'Standard' },
    { name: 'text-embedding-ada-002', apiCost: 0.05, infinitoCost: 0.08, apiProvider: 'OpenAI', unit: 'per 1M tokens', note: 'Batch', type: 'Batch' },
  ]

  const calculateProfit = (apiCost: number, infinitoCost: number) => {
    const profit = infinitoCost - apiCost
    const margin = apiCost > 0 ? ((profit / apiCost) * 100).toFixed(0) : 'N/A'
    return { profit, margin }
  }

  const getTotalStats = () => {
    // Separate text models (in dollars) from media models (in credits)
    const textApiCost = textModels.reduce((sum, m) => sum + m.apiCost, 0)
    const textInfinitoCost = textModels.reduce((sum, m) => sum + m.infinitoCost, 0)
    // Media models include: image generation (dollars), image tokens (dollars), video (mixed), audio tokens (dollars), embeddings (dollars)
    const imageGenApiCost = imageGenerationModels.filter(m => m.apiProvider === 'OpenAI').reduce((sum, m) => sum + m.apiCost, 0)
    const videoApiCost = videoModels.filter(m => m.apiProvider === 'OpenAI').reduce((sum, m) => sum + m.apiCost, 0)
    const mediaApiCost = imageGenApiCost + videoApiCost + imageTokenModels.reduce((sum, m) => sum + m.apiCost, 0) + audioTokenModels.reduce((sum, m) => sum + m.apiCost, 0) + embeddingModels.reduce((sum, m) => sum + m.apiCost, 0)
    const mediaInfinitoCost = imageGenerationModels.filter(m => m.apiProvider === 'OpenAI').reduce((sum, m) => sum + m.infinitoCost, 0) + videoModels.filter(m => m.apiProvider === 'OpenAI').reduce((sum, m) => sum + m.infinitoCost, 0) + imageTokenModels.reduce((sum, m) => sum + m.infinitoCost, 0) + audioTokenModels.reduce((sum, m) => sum + m.infinitoCost, 0) + embeddingModels.reduce((sum, m) => sum + m.infinitoCost, 0)
    
    const textProfit = textInfinitoCost - textApiCost
    const mediaProfit = mediaInfinitoCost - mediaApiCost
    const avgMargin = ((textApiCost + mediaApiCost) > 0) ? (((textProfit + mediaProfit) / (textApiCost + mediaApiCost)) * 100).toFixed(1) : '0'
    
    return { textApiCost, textInfinitoCost, textProfit, mediaApiCost, mediaInfinitoCost, mediaProfit, avgMargin }
  }

  const stats = getTotalStats()

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-cyan-400 font-mono mb-2">
            💰 PRICING DASHBOARD
          </h1>
          <p className="text-gray-400 font-mono">
            Complete breakdown of all model costs with 60% markup analysis
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1 font-mono">TEXT MODELS</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono">${stats.textApiCost.toFixed(2)}</div>
            <div className="text-gray-500 text-xs mt-1 font-mono">API cost → ${stats.textInfinitoCost.toFixed(2)} charged</div>
            <div className="text-green-400 text-xs mt-1 font-mono">+${stats.textProfit.toFixed(2)} profit</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1 font-mono">MEDIA MODELS</div>
            <div className="text-2xl font-bold text-purple-400 font-mono">{stats.mediaApiCost} cr</div>
            <div className="text-gray-500 text-xs mt-1 font-mono">API cost → {stats.mediaInfinitoCost} cr charged</div>
            <div className="text-green-400 text-xs mt-1 font-mono">+{stats.mediaProfit} cr profit</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1 font-mono">COMBINED PROFIT</div>
            <div className="text-xl font-bold text-green-400 font-mono">${stats.textProfit.toFixed(2)}</div>
            <div className="text-xl font-bold text-green-400 font-mono">+{stats.mediaProfit} cr</div>
            <div className="text-gray-500 text-xs mt-1 font-mono">from all models</div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1 font-mono">AVG MARGIN</div>
            <div className="text-3xl font-bold text-yellow-400 font-mono">{stats.avgMargin}%</div>
            <div className="text-gray-500 text-xs mt-1 font-mono">profit margin</div>
          </div>
        </div>

        {/* Markup Explanation */}
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-yellow-400 font-mono mb-3">📊 60% MARKUP FORMULA</h2>
          <div className="space-y-2 text-gray-300 font-mono text-sm">
            <p>• <span className="text-cyan-400">API Cost</span> = What we pay to OpenAI/RunwayML</p>
            <p>• <span className="text-purple-400">INFINITO Cost</span> = What users pay (API Cost × 1.6)</p>
            <p>• <span className="text-green-400">Net Profit</span> = INFINITO Cost - API Cost</p>
            <p>• <span className="text-yellow-400">Profit Margin</span> = (Net Profit ÷ API Cost) × 100%</p>
          </div>
        </div>

        {/* Pricing Units Explanation */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-blue-400 font-mono mb-3">💡 PRICING STRUCTURE</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300 font-mono text-sm">
            <div>
              <h3 className="text-cyan-400 font-bold mb-2">TEXT MODELS (OpenAI)</h3>
              <p className="text-xs leading-relaxed">
                • Priced in <span className="text-cyan-400">dollars per message</span><br/>
                • Based on OpenAI's Standard Tier per-token pricing<br/>
                • Assumes ~1000 tokens/message (500 in + 500 out)<br/>
                • Users pay in INFINITO credits (1 credit ≈ varies by model)
              </p>
            </div>
            <div>
              <h3 className="text-purple-400 font-bold mb-2">MEDIA MODELS (RunwayML)</h3>
              <p className="text-xs leading-relaxed">
                • Images: Priced in <span className="text-purple-400">RunwayML credits per image</span><br/>
                • Videos: Priced in <span className="text-purple-400">RunwayML credits per second</span><br/>
                • Direct credit-to-credit conversion with 60% markup<br/>
                • Users pay in INFINITO credits (1:1 with RunwayML credits + markup)
              </p>
            </div>
          </div>
        </div>

        {/* Text Models Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-cyan-400 font-mono mb-4">💬 TEXT MODELS ({textModels.length} models)</h2>
          
          {/* Group by category */}
          {[...new Set(textModels.map(m => m.category))].map((category) => {
            const categoryModels = textModels.filter(m => m.category === category)
            return (
              <div key={category} className="mb-6">
                <h3 className="text-lg font-bold text-cyan-300 font-mono mb-2 pl-2">{category}</h3>
                <div className="bg-black/50 border border-cyan-500/30 rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full font-mono text-sm">
                    <thead className="bg-cyan-900/30 border-b border-cyan-500/30">
                      <tr>
                        <th className="text-left p-3 text-cyan-400">Model</th>
                        <th className="text-left p-3 text-cyan-400">Provider</th>
                        <th className="text-right p-3 text-cyan-400">API Cost</th>
                        <th className="text-right p-3 text-purple-400">INFINITO</th>
                        <th className="text-right p-3 text-green-400">Net Profit</th>
                        <th className="text-right p-3 text-yellow-400">Margin</th>
                        <th className="text-left p-3 text-gray-400">OpenAI Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryModels.map((model, idx) => {
                        const { profit, margin } = calculateProfit(model.apiCost, model.infinitoCost)
                        const isFree = model.apiCost === 0
                        return (
                          <tr key={idx} className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors">
                            <td className="p-3 text-white">{model.name}</td>
                            <td className="p-3 text-gray-400">{model.apiProvider}</td>
                            <td className="text-right p-3 text-cyan-300">{isFree ? 'FREE' : `$${model.apiCost.toFixed(5)}`}</td>
                            <td className="text-right p-3 text-purple-300">{isFree ? 'FREE' : `$${model.infinitoCost.toFixed(5)}`}</td>
                            <td className="text-right p-3 text-green-300">{isFree ? '-' : `+$${profit.toFixed(5)}`}</td>
                            <td className="text-right p-3 text-yellow-300">{isFree ? '-' : `${margin}%`}</td>
                            <td className="text-left p-3 text-gray-500 text-xs">{model.note || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>

        {/* Image Generation Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-purple-400 font-mono mb-4">🖼️ IMAGE GENERATION (Prices per image)</h2>
          <div className="bg-black/50 border border-purple-500/30 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead className="bg-purple-900/30 border-b border-purple-500/30">
                <tr>
                  <th className="text-left p-4 text-purple-400">Model</th>
                  <th className="text-left p-4 text-purple-400">Quality</th>
                  <th className="text-left p-4 text-purple-400">Resolution</th>
                  <th className="text-left p-4 text-purple-400">Provider</th>
                  <th className="text-right p-4 text-cyan-400">API Cost</th>
                  <th className="text-right p-4 text-purple-400">INFINITO</th>
                  <th className="text-right p-4 text-green-400">Net Profit</th>
                  <th className="text-right p-4 text-yellow-400">Margin</th>
                </tr>
              </thead>
              <tbody>
                {imageGenerationModels.map((model, idx) => {
                  const { profit, margin } = calculateProfit(model.apiCost, model.infinitoCost)
                  const isFree = model.apiCost === 0
                  return (
                    <tr key={idx} className="border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors">
                      <td className="p-4 text-white">{model.name}</td>
                      <td className="p-4 text-gray-400">{model.quality || '-'}</td>
                      <td className="p-4 text-gray-400 text-xs">{model.note}</td>
                      <td className="p-4 text-gray-400">{model.apiProvider}</td>
                      <td className="text-right p-4 text-cyan-300">{isFree ? 'FREE' : `$${model.apiCost.toFixed(3)}`}</td>
                      <td className="text-right p-4 text-purple-300">{isFree ? 'FREE' : `$${model.infinitoCost.toFixed(3)}`}</td>
                      <td className="text-right p-4 text-green-300">{isFree ? '-' : `+$${profit.toFixed(3)}`}</td>
                      <td className="text-right p-4 text-yellow-300">{isFree ? '-' : `${margin}%`}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Image Tokens Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-purple-400 font-mono mb-4">🖼️ IMAGE TOKENS (Prices per 1M tokens)</h2>
          <div className="bg-black/50 border border-purple-500/30 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead className="bg-purple-900/30 border-b border-purple-500/30">
                <tr>
                  <th className="text-left p-4 text-purple-400">Model</th>
                  <th className="text-left p-4 text-purple-400">Type</th>
                  <th className="text-left p-4 text-purple-400">Provider</th>
                  <th className="text-right p-4 text-cyan-400">API Cost</th>
                  <th className="text-right p-4 text-purple-400">INFINITO</th>
                  <th className="text-right p-4 text-green-400">Net Profit</th>
                  <th className="text-right p-4 text-yellow-400">Margin</th>
                </tr>
              </thead>
              <tbody>
                {imageTokenModels.map((model, idx) => {
                  const { profit, margin } = calculateProfit(model.apiCost, model.infinitoCost)
                  return (
                    <tr key={idx} className="border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors">
                      <td className="p-4 text-white">{model.name}</td>
                      <td className="p-4 text-gray-400">{model.type}</td>
                      <td className="p-4 text-gray-400">{model.apiProvider}</td>
                      <td className="text-right p-4 text-cyan-300">${model.apiCost.toFixed(2)}</td>
                      <td className="text-right p-4 text-purple-300">${model.infinitoCost.toFixed(2)}</td>
                      <td className="text-right p-4 text-green-300">+${profit.toFixed(2)}</td>
                      <td className="text-right p-4 text-yellow-300">{margin}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Video Models Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-pink-400 font-mono mb-4">🎬 VIDEO MODELS (Prices per second)</h2>
          <div className="bg-black/50 border border-pink-500/30 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead className="bg-pink-900/30 border-b border-pink-500/30">
                <tr>
                  <th className="text-left p-4 text-pink-400">Model</th>
                  <th className="text-left p-4 text-pink-400">Resolution</th>
                  <th className="text-left p-4 text-pink-400">Provider</th>
                  <th className="text-right p-4 text-cyan-400">API Cost</th>
                  <th className="text-right p-4 text-purple-400">INFINITO</th>
                  <th className="text-right p-4 text-green-400">Net Profit</th>
                  <th className="text-right p-4 text-yellow-400">Margin</th>
                </tr>
              </thead>
              <tbody>
                {videoModels.map((model, idx) => {
                  const { profit, margin } = calculateProfit(model.apiCost, model.infinitoCost)
                  const isDollar = model.apiProvider === 'OpenAI'
                  return (
                    <tr key={idx} className="border-b border-pink-500/10 hover:bg-pink-500/5 transition-colors">
                      <td className="p-4 text-white">{model.name}</td>
                      <td className="p-4 text-gray-400 text-xs">{model.note}</td>
                      <td className="p-4 text-gray-400">{model.apiProvider}</td>
                      <td className="text-right p-4 text-cyan-300">{isDollar ? `$${model.apiCost.toFixed(2)}` : `${model.apiCost} credits`}</td>
                      <td className="text-right p-4 text-purple-300">{isDollar ? `$${model.infinitoCost.toFixed(2)}` : `${model.infinitoCost} credits`}</td>
                      <td className="text-right p-4 text-green-300">{isDollar ? `+$${profit.toFixed(2)}` : `+${profit} credits`}</td>
                      <td className="text-right p-4 text-yellow-300">{margin}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audio Tokens Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-orange-400 font-mono mb-4">🎵 AUDIO TOKENS (Prices per 1M tokens)</h2>
          <div className="bg-black/50 border border-orange-500/30 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead className="bg-orange-900/30 border-b border-orange-500/30">
                <tr>
                  <th className="text-left p-4 text-orange-400">Model</th>
                  <th className="text-left p-4 text-orange-400">Type</th>
                  <th className="text-left p-4 text-orange-400">Provider</th>
                  <th className="text-right p-4 text-cyan-400">API Cost</th>
                  <th className="text-right p-4 text-purple-400">INFINITO</th>
                  <th className="text-right p-4 text-green-400">Net Profit</th>
                  <th className="text-right p-4 text-yellow-400">Margin</th>
                </tr>
              </thead>
              <tbody>
                {audioTokenModels.map((model, idx) => {
                  const { profit, margin } = calculateProfit(model.apiCost, model.infinitoCost)
                  return (
                    <tr key={idx} className="border-b border-orange-500/10 hover:bg-orange-500/5 transition-colors">
                      <td className="p-4 text-white">{model.name}</td>
                      <td className="p-4 text-gray-400">{model.type}</td>
                      <td className="p-4 text-gray-400">{model.apiProvider}</td>
                      <td className="text-right p-4 text-cyan-300">${model.apiCost.toFixed(2)}</td>
                      <td className="text-right p-4 text-purple-300">${model.infinitoCost.toFixed(2)}</td>
                      <td className="text-right p-4 text-green-300">+${profit.toFixed(2)}</td>
                      <td className="text-right p-4 text-yellow-300">{margin}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Embeddings Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-indigo-400 font-mono mb-4">🔗 EMBEDDINGS (Prices per 1M tokens)</h2>
          <div className="bg-black/50 border border-indigo-500/30 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead className="bg-indigo-900/30 border-b border-indigo-500/30">
                <tr>
                  <th className="text-left p-4 text-indigo-400">Model</th>
                  <th className="text-left p-4 text-indigo-400">Tier</th>
                  <th className="text-left p-4 text-indigo-400">Provider</th>
                  <th className="text-right p-4 text-cyan-400">API Cost</th>
                  <th className="text-right p-4 text-purple-400">INFINITO</th>
                  <th className="text-right p-4 text-green-400">Net Profit</th>
                  <th className="text-right p-4 text-yellow-400">Margin</th>
                </tr>
              </thead>
              <tbody>
                {embeddingModels.map((model, idx) => {
                  const { profit, margin } = calculateProfit(model.apiCost, model.infinitoCost)
                  return (
                    <tr key={idx} className="border-b border-indigo-500/10 hover:bg-indigo-500/5 transition-colors">
                      <td className="p-4 text-white">{model.name}</td>
                      <td className="p-4 text-gray-400">{model.type}</td>
                      <td className="p-4 text-gray-400">{model.apiProvider}</td>
                      <td className="text-right p-4 text-cyan-300">${model.apiCost.toFixed(3)}</td>
                      <td className="text-right p-4 text-purple-300">${model.infinitoCost.toFixed(3)}</td>
                      <td className="text-right p-4 text-green-300">+${profit.toFixed(3)}</td>
                      <td className="text-right p-4 text-yellow-300">{margin}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Scenarios */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-green-400 font-mono mb-4">💵 REVENUE SCENARIOS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Light User */}
            <div className="bg-black/50 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-400 font-mono mb-3">Light User (Monthly)</h3>
              <div className="space-y-2 text-sm font-mono">
                <p className="text-gray-400">100× GPT-4o Mini = $0.06</p>
                <p className="text-gray-400">10× Gen4 Image Turbo = 30 cr</p>
                <p className="text-gray-400">2× Gen4 Turbo (5s) = 80 cr</p>
                <hr className="border-green-500/30 my-2" />
                <p className="text-white font-bold">Charged: $0.06 + 110 cr</p>
                <p className="text-cyan-400">API Cost: $0.0375 + 70 cr</p>
                <p className="text-green-400 font-bold">Profit: $0.0225 + 40 cr (60%)</p>
              </div>
            </div>

            {/* Heavy User */}
            <div className="bg-black/50 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-400 font-mono mb-3">Heavy User (Monthly)</h3>
              <div className="space-y-2 text-sm font-mono">
                <p className="text-gray-400">1,000× GPT-4o = $10.00</p>
                <p className="text-gray-400">50× Gen4 Image = 400 cr</p>
                <p className="text-gray-400">10× VEO 3.1 Fast (8s) = 2,560 cr</p>
                <hr className="border-green-500/30 my-2" />
                <p className="text-white font-bold">Charged: $10 + 2,960 cr</p>
                <p className="text-cyan-400">API Cost: $6.25 + 1,850 cr</p>
                <p className="text-green-400 font-bold">Profit: $3.75 + 1,110 cr (60%)</p>
              </div>
            </div>

            {/* Enterprise User */}
            <div className="bg-black/50 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-400 font-mono mb-3">Enterprise (Monthly)</h3>
              <div className="space-y-2 text-sm font-mono">
                <p className="text-gray-400">50,000× GPT-4o = $312.50</p>
                <p className="text-gray-400">200× Gen4 Image = 1,600 cr</p>
                <p className="text-gray-400">50× VEO 3.1 (8s) = 25,600 cr</p>
                <hr className="border-green-500/30 my-2" />
                <p className="text-white font-bold">Charged: $312.50 + 27,200 cr</p>
                <p className="text-cyan-400">API Cost: $195.31 + 17,000 cr</p>
                <p className="text-green-400 font-bold">Profit: $117.19 + 10,200 cr (60%)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm font-mono mt-12">
          <p>All pricing data updated with 60% markup formula</p>
          <p className="mt-2">Text models use OpenAI Standard tier pricing by default</p>
          <p className="mt-1">Last updated: January 2025</p>
        </div>
      </div>
    </div>
  )
}

