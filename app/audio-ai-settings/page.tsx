"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-client"
import { ArrowLeft, Volume2, Save, RefreshCw } from "lucide-react"

// Popular ElevenLabs voices
const ELEVENLABS_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft, professional female voice' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, young female voice' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Strong, confident female voice' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Well-rounded male voice' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Emotional, young female voice' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Deep, young male voice' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Crisp, middle-aged male voice' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, middle-aged male voice' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Raspy, young male voice' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Casual, Australian male voice' },
]

const ELEVENLABS_MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', description: 'Best quality, supports 29 languages' },
  { id: 'eleven_monolingual_v1', name: 'Monolingual v1', description: 'English only, fast and stable' },
  { id: 'eleven_turbo_v2', name: 'Turbo v2', description: 'Fastest, lowest latency' },
]

const AUDIO_FORMATS = [
  { id: 'mp3_44100_128', name: 'MP3 44.1kHz 128kbps', description: 'Standard quality, small file size' },
  { id: 'mp3_44100_192', name: 'MP3 44.1kHz 192kbps', description: 'High quality' },
  { id: 'pcm_16000', name: 'PCM 16kHz', description: 'Raw audio, 16kHz' },
  { id: 'pcm_22050', name: 'PCM 22.05kHz', description: 'Raw audio, 22.05kHz' },
  { id: 'pcm_24000', name: 'PCM 24kHz', description: 'Raw audio, 24kHz' },
]

export default function AudioAISettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Audio settings state
  const [voiceId, setVoiceId] = useState('EXAVITQu4vr4xnSDxMaL')
  const [modelId, setModelId] = useState('eleven_multilingual_v2')
  const [stability, setStability] = useState(0.50)
  const [similarityBoost, setSimilarityBoost] = useState(0.75)
  const [style, setStyle] = useState(0.00)
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true)
  const [outputFormat, setOutputFormat] = useState('mp3_44100_128')
  const [optimizeLatency, setOptimizeLatency] = useState(0)
  
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null)
  const [isGeneratingTest, setIsGeneratingTest] = useState(false)

  // Check authentication and admin status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }
        
        setUser(user)
        
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profile?.role !== 'admin') {
          router.push('/')
          return
        }
        
        setIsAdmin(true)
        await loadSettings()
      } catch (error) {
        console.error('Auth check error:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [router])

  const loadSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/audio-settings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const settings = data.settings
        
        setVoiceId(settings.elevenlabs_voice_id || 'EXAVITQu4vr4xnSDxMaL')
        setModelId(settings.elevenlabs_model_id || 'eleven_multilingual_v2')
        setStability(settings.elevenlabs_stability || 0.50)
        setSimilarityBoost(settings.elevenlabs_similarity_boost || 0.75)
        setStyle(settings.elevenlabs_style || 0.00)
        setUseSpeakerBoost(settings.elevenlabs_use_speaker_boost ?? true)
        setOutputFormat(settings.audio_output_format || 'mp3_44100_128')
        setOptimizeLatency(settings.audio_optimize_streaming_latency || 0)
      }
    } catch (error) {
      console.error('Error loading audio settings:', error)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/audio-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          elevenlabs_voice_id: voiceId,
          elevenlabs_model_id: modelId,
          elevenlabs_stability: stability,
          elevenlabs_similarity_boost: similarityBoost,
          elevenlabs_style: style,
          elevenlabs_use_speaker_boost: useSpeakerBoost,
          audio_output_format: outputFormat,
          audio_optimize_streaming_latency: optimizeLatency,
        })
      })

      if (response.ok) {
        alert('✅ Audio settings saved successfully!')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving audio settings:', error)
      alert('❌ Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const generateTestAudio = async () => {
    try {
      setIsGeneratingTest(true)
      setTestAudioUrl(null)
      
      const testText = "Hello! This is a test of the INFINITO audio generation system. How do I sound?"
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: testText,
          voice_id: voiceId,
          model_id: modelId,
          stability: stability,
          similarity_boost: similarityBoost,
          style: style,
          use_speaker_boost: useSpeakerBoost,
          output_format: outputFormat,
          optimize_streaming_latency: optimizeLatency,
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTestAudioUrl(data.audioUrl)
      } else {
        throw new Error('Failed to generate test audio')
      }
    } catch (error) {
      console.error('Error generating test audio:', error)
      alert('❌ Failed to generate test audio')
    } finally {
      setIsGeneratingTest(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const selectedVoice = ELEVENLABS_VOICES.find(v => v.id === voiceId)
  const selectedModel = ELEVENLABS_MODELS.find(m => m.id === modelId)
  const selectedFormat = AUDIO_FORMATS.find(f => f.id === outputFormat)

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900/20 via-yellow-900/20 to-orange-900/20 border-b border-orange-500/30 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-orange-400 flex items-center gap-2">
                <Volume2 className="h-6 w-6" />
                Audio AI Settings
              </h1>
              <p className="text-orange-300 text-sm">Configure ElevenLabs text-to-speech settings</p>
            </div>
          </div>
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:brightness-110"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        
        {/* Voice Selection */}
        <div className="bg-gradient-to-br from-orange-900/10 to-yellow-900/10 border border-orange-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-orange-400 mb-4">Voice Selection</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ELEVENLABS_VOICES.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setVoiceId(voice.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  voiceId === voice.id
                    ? 'border-orange-500 bg-orange-500/20'
                    : 'border-orange-500/20 bg-black/20 hover:border-orange-500/50'
                }`}
              >
                <div className="font-bold text-orange-300">{voice.name}</div>
                <div className="text-xs text-gray-400 mt-1">{voice.description}</div>
                {voiceId === voice.id && (
                  <div className="text-orange-400 text-xs mt-2">✓ Selected</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        <div className="bg-gradient-to-br from-orange-900/10 to-yellow-900/10 border border-orange-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-orange-400 mb-4">Model Selection</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ELEVENLABS_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => setModelId(model.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  modelId === model.id
                    ? 'border-orange-500 bg-orange-500/20'
                    : 'border-orange-500/20 bg-black/20 hover:border-orange-500/50'
                }`}
              >
                <div className="font-bold text-orange-300">{model.name}</div>
                <div className="text-xs text-gray-400 mt-1">{model.description}</div>
                {modelId === model.id && (
                  <div className="text-orange-400 text-xs mt-2">✓ Selected</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Settings */}
        <div className="bg-gradient-to-br from-orange-900/10 to-yellow-900/10 border border-orange-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-orange-400 mb-6">Voice Settings</h2>
          
          <div className="space-y-6">
            {/* Stability */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-orange-300 font-semibold">Stability</label>
                <span className="text-orange-400">{stability.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={stability}
                onChange={(e) => setStability(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                Higher = more consistent voice, Lower = more expressive and variable
              </p>
            </div>

            {/* Similarity Boost */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-orange-300 font-semibold">Similarity Boost</label>
                <span className="text-orange-400">{similarityBoost.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={similarityBoost}
                onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                How closely to match the original voice characteristics
              </p>
            </div>

            {/* Style */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-orange-300 font-semibold">Style Exaggeration</label>
                <span className="text-orange-400">{style.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={style}
                onChange={(e) => setStyle(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                How much to exaggerate the speaking style (0 = neutral)
              </p>
            </div>

            {/* Speaker Boost */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSpeakerBoost}
                  onChange={(e) => setUseSpeakerBoost(e.target.checked)}
                  className="w-5 h-5 rounded border-orange-500 text-orange-500 focus:ring-orange-500"
                />
                <div>
                  <div className="text-orange-300 font-semibold">Enable Speaker Boost</div>
                  <div className="text-xs text-gray-400">Improves audio quality and clarity</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Output Settings */}
        <div className="bg-gradient-to-br from-orange-900/10 to-yellow-900/10 border border-orange-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-orange-400 mb-6">Output Settings</h2>
          
          {/* Audio Format */}
          <div className="mb-6">
            <label className="text-orange-300 font-semibold block mb-3">Audio Format</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AUDIO_FORMATS.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setOutputFormat(format.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    outputFormat === format.id
                      ? 'border-orange-500 bg-orange-500/20'
                      : 'border-orange-500/20 bg-black/20 hover:border-orange-500/50'
                  }`}
                >
                  <div className="font-bold text-orange-300 text-sm">{format.name}</div>
                  <div className="text-xs text-gray-400">{format.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Optimize Latency */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-orange-300 font-semibold">Optimize Streaming Latency</label>
              <span className="text-orange-400">{optimizeLatency}</span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={optimizeLatency}
              onChange={(e) => setOptimizeLatency(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Default (0)</span>
              <span>Lowest Latency (4)</span>
            </div>
          </div>
        </div>

        {/* Test Audio */}
        <div className="bg-gradient-to-br from-orange-900/10 to-yellow-900/10 border border-orange-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-orange-400 mb-4">Test Voice</h2>
          <p className="text-gray-400 mb-4">Generate a test audio to hear how your settings sound</p>
          
          <Button
            onClick={generateTestAudio}
            disabled={isGeneratingTest}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isGeneratingTest ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Generate Test Audio
              </>
            )}
          </Button>

          {testAudioUrl && (
            <div className="mt-4 p-4 bg-black/30 rounded-lg border border-orange-500/30">
              <p className="text-orange-300 mb-2">✅ Test audio generated!</p>
              <audio controls src={testAudioUrl} className="w-full" />
            </div>
          )}
        </div>

        {/* Current Settings Summary */}
        <div className="bg-gradient-to-br from-orange-900/10 to-yellow-900/10 border border-orange-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-orange-400 mb-4">Current Settings Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Voice:</span>
              <span className="text-orange-300 ml-2 font-semibold">{selectedVoice?.name}</span>
            </div>
            <div>
              <span className="text-gray-400">Model:</span>
              <span className="text-orange-300 ml-2 font-semibold">{selectedModel?.name}</span>
            </div>
            <div>
              <span className="text-gray-400">Stability:</span>
              <span className="text-orange-300 ml-2 font-semibold">{stability.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-400">Similarity:</span>
              <span className="text-orange-300 ml-2 font-semibold">{similarityBoost.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-400">Style:</span>
              <span className="text-orange-300 ml-2 font-semibold">{style.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-400">Format:</span>
              <span className="text-orange-300 ml-2 font-semibold">{selectedFormat?.name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

