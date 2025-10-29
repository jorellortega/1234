'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Check, X, Save } from 'lucide-react'

interface ModelConfig {
  id: string
  name: string
  inputCost: number // per 1M tokens
  outputCost: number // per 1M tokens
  cachedInputCost?: number // per 1M tokens
  enabled: boolean
  category: string
  description?: string
}

export default function GPTModelsPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [models, setModels] = useState<ModelConfig[]>([])
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
        loadModelPreferences()
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

  async function loadModelPreferences() {
    // Load from Supabase or initialize with defaults
    const defaultModels: ModelConfig[] = [
      // GPT-5 Series
      { id: 'gpt-5', name: 'GPT-5', inputCost: 1.25, outputCost: 10.00, cachedInputCost: 0.125, enabled: true, category: 'GPT-5 Series', description: 'Latest GPT-5 base model' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', inputCost: 0.25, outputCost: 2.00, cachedInputCost: 0.025, enabled: true, category: 'GPT-5 Series', description: 'Smaller/faster GPT-5' },
      { id: 'gpt-5-nano', name: 'GPT-5 Nano', inputCost: 0.05, outputCost: 0.40, cachedInputCost: 0.005, enabled: true, category: 'GPT-5 Series', description: 'Smallest GPT-5 variant' },
      { id: 'gpt-5-chat-latest', name: 'GPT-5 Chat Latest', inputCost: 1.25, outputCost: 10.00, cachedInputCost: 0.125, enabled: true, category: 'GPT-5 Series', description: 'Latest chat-optimized GPT-5' },
      { id: 'gpt-5-codex', name: 'GPT-5 Codex', inputCost: 1.25, outputCost: 10.00, cachedInputCost: 0.125, enabled: true, category: 'GPT-5 Series', description: 'Code-specialized GPT-5' },
      { id: 'gpt-5-pro', name: 'GPT-5 Pro', inputCost: 15.00, outputCost: 120.00, enabled: false, category: 'GPT-5 Series', description: 'Pro version of GPT-5' },
      { id: 'gpt-5-search-api', name: 'GPT-5 Search API', inputCost: 1.25, outputCost: 10.00, cachedInputCost: 0.125, enabled: false, category: 'GPT-5 Series', description: 'Search-enabled GPT-5' },

      // GPT-4.1 Series
      { id: 'gpt-4.1', name: 'GPT-4.1', inputCost: 2.00, outputCost: 8.00, cachedInputCost: 0.50, enabled: true, category: 'GPT-4.1 Series', description: 'Latest GPT-4.1 base' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', inputCost: 0.40, outputCost: 1.60, cachedInputCost: 0.10, enabled: true, category: 'GPT-4.1 Series', description: 'Smaller GPT-4.1' },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', inputCost: 0.10, outputCost: 0.40, cachedInputCost: 0.025, enabled: true, category: 'GPT-4.1 Series', description: 'Smallest GPT-4.1' },

      // GPT-4o Series
      { id: 'gpt-4o', name: 'GPT-4o', inputCost: 2.50, outputCost: 10.00, cachedInputCost: 1.25, enabled: true, category: 'GPT-4o Series', description: 'GPT-4 Optimized' },
      { id: 'gpt-4o-2024-05-13', name: 'GPT-4o (2024-05-13)', inputCost: 5.00, outputCost: 15.00, enabled: true, category: 'GPT-4o Series', description: 'Specific GPT-4o version' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', inputCost: 0.15, outputCost: 0.60, cachedInputCost: 0.075, enabled: true, category: 'GPT-4o Series', description: 'Smaller GPT-4o' },

      // O-Series (Reasoning Models)
      { id: 'o1', name: 'O1', inputCost: 15.00, outputCost: 60.00, cachedInputCost: 7.50, enabled: true, category: 'O-Series (Reasoning)', description: 'O1 reasoning model' },
      { id: 'o1-mini', name: 'O1 Mini', inputCost: 1.10, outputCost: 4.40, cachedInputCost: 0.55, enabled: true, category: 'O-Series (Reasoning)', description: 'Smaller O1 model' },
      { id: 'o1-pro', name: 'O1 Pro', inputCost: 150.00, outputCost: 600.00, enabled: false, category: 'O-Series (Reasoning)', description: 'Pro version of O1' },
      { id: 'o3', name: 'O3', inputCost: 2.00, outputCost: 8.00, cachedInputCost: 0.50, enabled: true, category: 'O-Series (Reasoning)', description: 'O3 reasoning model' },
      { id: 'o3-mini', name: 'O3 Mini', inputCost: 1.10, outputCost: 4.40, cachedInputCost: 0.55, enabled: true, category: 'O-Series (Reasoning)', description: 'Smaller O3 model' },
      { id: 'o3-pro', name: 'O3 Pro', inputCost: 20.00, outputCost: 80.00, enabled: false, category: 'O-Series (Reasoning)', description: 'Pro version of O3' },
      { id: 'o3-deep-research', name: 'O3 Deep Research', inputCost: 10.00, outputCost: 40.00, cachedInputCost: 2.50, enabled: false, category: 'O-Series (Reasoning)', description: 'Deep research variant' },
      { id: 'o4-mini', name: 'O4 Mini', inputCost: 1.10, outputCost: 4.40, cachedInputCost: 0.275, enabled: true, category: 'O-Series (Reasoning)', description: 'O4 mini model' },
      { id: 'o4-mini-deep-research', name: 'O4 Mini Deep Research', inputCost: 2.00, outputCost: 8.00, cachedInputCost: 0.50, enabled: false, category: 'O-Series (Reasoning)', description: 'O4 mini deep research' },

      // Real-Time Models
      { id: 'gpt-realtime', name: 'GPT Realtime', inputCost: 4.00, outputCost: 16.00, cachedInputCost: 0.40, enabled: false, category: 'Real-Time Models', description: 'Real-time capable model' },
      { id: 'gpt-realtime-mini', name: 'GPT Realtime Mini', inputCost: 0.60, outputCost: 2.40, cachedInputCost: 0.06, enabled: false, category: 'Real-Time Models', description: 'Smaller real-time model' },
      { id: 'gpt-4o-realtime-preview', name: 'GPT-4o Realtime Preview', inputCost: 5.00, outputCost: 20.00, cachedInputCost: 2.50, enabled: false, category: 'Real-Time Models', description: 'Preview of real-time GPT-4o' },
      { id: 'gpt-4o-mini-realtime-preview', name: 'GPT-4o Mini Realtime Preview', inputCost: 0.60, outputCost: 2.40, cachedInputCost: 0.30, enabled: false, category: 'Real-Time Models', description: 'Preview of real-time mini' },

      // Audio Models
      { id: 'gpt-audio', name: 'GPT Audio', inputCost: 2.50, outputCost: 10.00, enabled: false, category: 'Audio Models', description: 'Audio processing model' },
      { id: 'gpt-audio-mini', name: 'GPT Audio Mini', inputCost: 0.60, outputCost: 2.40, enabled: false, category: 'Audio Models', description: 'Smaller audio model' },
      { id: 'gpt-4o-audio-preview', name: 'GPT-4o Audio Preview', inputCost: 2.50, outputCost: 10.00, enabled: false, category: 'Audio Models', description: 'Audio preview' },
      { id: 'gpt-4o-mini-audio-preview', name: 'GPT-4o Mini Audio Preview', inputCost: 0.15, outputCost: 0.60, enabled: false, category: 'Audio Models', description: 'Mini audio preview' },

      // Image Models
      { id: 'gpt-image-1', name: 'GPT Image 1', inputCost: 5.00, outputCost: 0, cachedInputCost: 1.25, enabled: false, category: 'Image Models', description: 'Image processing GPT' },
      { id: 'gpt-image-1-mini', name: 'GPT Image 1 Mini', inputCost: 2.00, outputCost: 0, cachedInputCost: 0.20, enabled: false, category: 'Image Models', description: 'Mini image processing' },

      // Search Models
      { id: 'gpt-4o-search-preview', name: 'GPT-4o Search Preview', inputCost: 2.50, outputCost: 10.00, enabled: false, category: 'Search Models', description: 'Search preview' },
      { id: 'gpt-4o-mini-search-preview', name: 'GPT-4o Mini Search Preview', inputCost: 0.15, outputCost: 0.60, enabled: false, category: 'Search Models', description: 'Mini search preview' },

      // Codex Models
      { id: 'codex-mini-latest', name: 'Codex Mini Latest', inputCost: 1.50, outputCost: 6.00, cachedInputCost: 0.375, enabled: false, category: 'Codex Models', description: 'Latest codex mini' },

      // Special Models
      { id: 'computer-use-preview', name: 'Computer Use Preview', inputCost: 3.00, outputCost: 12.00, enabled: false, category: 'Special Models', description: 'Computer use model' },

      // Legacy GPT-4 Models
      { id: 'chatgpt-4o-latest', name: 'ChatGPT-4o Latest', inputCost: 5.00, outputCost: 15.00, enabled: true, category: 'Legacy GPT-4', description: 'Latest ChatGPT-4o' },
      { id: 'gpt-4-turbo-2024-04-09', name: 'GPT-4 Turbo (2024-04-09)', inputCost: 10.00, outputCost: 30.00, enabled: true, category: 'Legacy GPT-4', description: 'GPT-4 Turbo' },
      { id: 'gpt-4-0125-preview', name: 'GPT-4 (0125 Preview)', inputCost: 10.00, outputCost: 30.00, enabled: false, category: 'Legacy GPT-4', description: 'GPT-4 preview' },
      { id: 'gpt-4-1106-preview', name: 'GPT-4 (1106 Preview)', inputCost: 10.00, outputCost: 30.00, enabled: false, category: 'Legacy GPT-4', description: 'GPT-4 preview' },
      { id: 'gpt-4-1106-vision-preview', name: 'GPT-4 Vision (1106)', inputCost: 10.00, outputCost: 30.00, enabled: false, category: 'Legacy GPT-4', description: 'GPT-4 vision preview' },
      { id: 'gpt-4-0613', name: 'GPT-4 (0613)', inputCost: 30.00, outputCost: 60.00, enabled: false, category: 'Legacy GPT-4', description: 'GPT-4 snapshot' },
      { id: 'gpt-4-0314', name: 'GPT-4 (0314)', inputCost: 30.00, outputCost: 60.00, enabled: false, category: 'Legacy GPT-4', description: 'GPT-4 snapshot' },
      { id: 'gpt-4-32k', name: 'GPT-4 32K', inputCost: 60.00, outputCost: 120.00, enabled: false, category: 'Legacy GPT-4', description: 'GPT-4 with 32K context' },

      // Legacy GPT-3.5 Models
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', inputCost: 0.50, outputCost: 1.50, enabled: true, category: 'Legacy GPT-3.5', description: 'GPT-3.5 Turbo' },
      { id: 'gpt-3.5-turbo-0125', name: 'GPT-3.5 Turbo (0125)', inputCost: 0.50, outputCost: 1.50, enabled: false, category: 'Legacy GPT-3.5', description: 'GPT-3.5 snapshot' },
      { id: 'gpt-3.5-turbo-1106', name: 'GPT-3.5 Turbo (1106)', inputCost: 1.00, outputCost: 2.00, enabled: false, category: 'Legacy GPT-3.5', description: 'GPT-3.5 snapshot' },
      { id: 'gpt-3.5-turbo-0613', name: 'GPT-3.5 Turbo (0613)', inputCost: 1.50, outputCost: 2.00, enabled: false, category: 'Legacy GPT-3.5', description: 'GPT-3.5 snapshot' },
      { id: 'gpt-3.5-0301', name: 'GPT-3.5 (0301)', inputCost: 1.50, outputCost: 2.00, enabled: false, category: 'Legacy GPT-3.5', description: 'GPT-3.5 snapshot' },
      { id: 'gpt-3.5-turbo-instruct', name: 'GPT-3.5 Turbo Instruct', inputCost: 1.50, outputCost: 2.00, enabled: false, category: 'Legacy GPT-3.5', description: 'Instruction-following' },
      { id: 'gpt-3.5-turbo-16k-0613', name: 'GPT-3.5 Turbo 16K', inputCost: 3.00, outputCost: 4.00, enabled: false, category: 'Legacy GPT-3.5', description: '16K context window' },

      // Base Models
      { id: 'davinci-002', name: 'Davinci-002', inputCost: 2.00, outputCost: 2.00, enabled: false, category: 'Base Models', description: 'Base davinci model' },
      { id: 'babbage-002', name: 'Babbage-002', inputCost: 0.40, outputCost: 0.40, enabled: false, category: 'Base Models', description: 'Base babbage model' },
    ]

    setModels(defaultModels)
  }

  function toggleModel(modelId: string) {
    setModels(prev => prev.map(m => 
      m.id === modelId ? { ...m, enabled: !m.enabled } : m
    ))
  }

  async function savePreferences() {
    setSaving(true)
    try {
      // Save to Supabase admin_preferences table
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/admin/gpt-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ models })
      })

      if (response.ok) {
        alert('✅ Model preferences saved successfully!')
      } else {
        alert('❌ Failed to save preferences')
      }
    } catch (error) {
      console.error('Save error:', error)
      alert('❌ Error saving preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl font-mono animate-pulse">Loading GPT models...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const categories = [...new Set(models.map(m => m.category))]
  const enabledCount = models.filter(m => m.enabled).length

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-cyan-400 font-mono mb-2">
                🤖 OPENAI MODELS
              </h1>
              <p className="text-gray-400 font-mono">
                Configure which GPT models are available across INFINITO
              </p>
            </div>
            <Button 
              onClick={savePreferences}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1 font-mono">TOTAL MODELS</div>
            <div className="text-3xl font-bold text-cyan-400 font-mono">{models.length}</div>
            <div className="text-gray-500 text-xs mt-1 font-mono">OpenAI models available</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1 font-mono">ENABLED</div>
            <div className="text-3xl font-bold text-green-400 font-mono">{enabledCount}</div>
            <div className="text-gray-500 text-xs mt-1 font-mono">Active for users</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-1 font-mono">CATEGORIES</div>
            <div className="text-3xl font-bold text-purple-400 font-mono">{categories.length}</div>
            <div className="text-gray-500 text-xs mt-1 font-mono">Model categories</div>
          </div>
        </div>

        {/* Models by Category */}
        {categories.map(category => {
          const categoryModels = models.filter(m => m.category === category)
          const enabledInCategory = categoryModels.filter(m => m.enabled).length

          return (
            <div key={category} className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-cyan-400 font-mono">{category}</h2>
                <span className="text-gray-500 text-sm font-mono">
                  {enabledInCategory}/{categoryModels.length} enabled
                </span>
              </div>
              
              <div className="bg-black/50 border border-cyan-500/30 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full font-mono text-sm">
                  <thead className="bg-cyan-900/30 border-b border-cyan-500/30">
                    <tr>
                      <th className="text-left p-3 text-cyan-400">Model ID</th>
                      <th className="text-left p-3 text-cyan-400">Name</th>
                      <th className="text-right p-3 text-cyan-400">API Cost/msg</th>
                      <th className="text-right p-3 text-purple-400">INFINITO/msg</th>
                      <th className="text-right p-3 text-green-400">Profit/msg</th>
                      <th className="text-right p-3 text-yellow-400">Margin</th>
                      <th className="text-left p-3 text-gray-400 text-xs">Rate (per 1M)</th>
                      <th className="text-center p-3 text-cyan-400">Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryModels.map((model) => {
                      // Calculate per-message cost (assuming 500 input + 500 output tokens = 1000 tokens = 0.001M)
                      const apiCostPerMsg = (model.inputCost * 0.0005) + (model.outputCost * 0.0005)
                      const infinitoCostPerMsg = apiCostPerMsg * 1.6 // 60% markup
                      const profitPerMsg = infinitoCostPerMsg - apiCostPerMsg
                      const margin = apiCostPerMsg > 0 ? ((profitPerMsg / apiCostPerMsg) * 100).toFixed(0) : 'N/A'
                      
                      return (
                        <tr 
                          key={model.id} 
                          className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors"
                        >
                          <td className="p-3 text-gray-400 text-xs font-mono">{model.id}</td>
                          <td className="p-3 text-white font-semibold">{model.name}</td>
                          <td className="text-right p-3 text-cyan-300 font-mono">${apiCostPerMsg.toFixed(5)}</td>
                          <td className="text-right p-3 text-purple-300 font-mono">${infinitoCostPerMsg.toFixed(5)}</td>
                          <td className="text-right p-3 text-green-300 font-mono">+${profitPerMsg.toFixed(5)}</td>
                          <td className="text-right p-3 text-yellow-300">{margin}%</td>
                          <td className="p-3 text-gray-500 text-xs">
                            ${model.inputCost.toFixed(2)}/${model.outputCost.toFixed(2)}/1M
                            {model.cachedInputCost && <><br/>(cached: ${model.cachedInputCost.toFixed(2)})</>}
                          </td>
                          <td className="text-center p-3">
                            <button
                              onClick={() => toggleModel(model.id)}
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                                model.enabled 
                                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              }`}
                            >
                              {model.enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm font-mono mt-12">
          <p>Model preferences are saved to database and apply across all INFINITO pages</p>
          <p className="mt-2">Pricing from OpenAI Standard Tier (per 1M tokens)</p>
        </div>
      </div>
    </div>
  )
}

