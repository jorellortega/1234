"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-client"
import { ArrowLeft, Volume2, Save, RefreshCw, Play } from "lucide-react"

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
  
  // Voice preview state
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null)
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  
  // Custom voices state
  const [customVoices, setCustomVoices] = useState<any[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  const [showCustomVoices, setShowCustomVoices] = useState(false)
  
  // System-wide settings state
  const [systemSettings, setSystemSettings] = useState({
    available_voice_ids: [] as string[],
    default_voice_id: 'EXAVITQu4vr4xnSDxMaL',
    allow_custom_voices: true,
    voice_selection_enabled: true
  })
  const [selectedVoiceIds, setSelectedVoiceIds] = useState<string[]>([])
  const [selectedCustomVoiceIds, setSelectedCustomVoiceIds] = useState<string[]>([])

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
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profile?.role !== 'admin') {
          router.push('/')
          return
        }
        
        setIsAdmin(true)
        await loadSettings()
        await loadCustomVoices()
        await loadSystemSettings()
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

  const loadCustomVoices = async () => {
    try {
      setIsLoadingVoices(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/text-to-speech', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setCustomVoices(data.voices || [])
      } else {
        console.error('Failed to load custom voices')
      }
    } catch (error) {
      console.error('Error loading custom voices:', error)
    } finally {
      setIsLoadingVoices(false)
    }
  }

  const loadSystemSettings = async () => {
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
        setSystemSettings({
          available_voice_ids: settings.available_voice_ids || [],
          default_voice_id: settings.default_voice_id || 'EXAVITQu4vr4xnSDxMaL',
          allow_custom_voices: settings.allow_custom_voices ?? true,
          voice_selection_enabled: settings.voice_selection_enabled ?? true
        })
        
        // Parse available voice IDs to separate default and custom voices
        const availableIds = settings.available_voice_ids || []
        const defaultVoiceIds = ELEVENLABS_VOICES.map(v => v.id)
        const selectedDefaults = availableIds.filter(id => defaultVoiceIds.includes(id))
        const selectedCustoms = availableIds.filter(id => !defaultVoiceIds.includes(id))
        
        setSelectedVoiceIds(selectedDefaults)
        setSelectedCustomVoiceIds(selectedCustoms)
      }
    } catch (error) {
      console.error('Error loading system settings:', error)
    }
  }

  const saveSystemSettings = async () => {
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
          // System-wide settings
          available_voice_ids: [...selectedVoiceIds, ...selectedCustomVoiceIds],
          default_voice_id: systemSettings.default_voice_id,
          allow_custom_voices: systemSettings.allow_custom_voices,
          voice_selection_enabled: systemSettings.voice_selection_enabled,
        })
      })

      if (response.ok) {
        alert('✅ Audio settings saved successfully!')
        await loadSystemSettings()
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

  const saveSettings = async () => {
    await saveSystemSettings()
  }

  const generateTestAudio = async () => {
    try {
      setIsGeneratingTest(true)
      setTestAudioUrl(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Authentication required')
      }
      
      const testText = "Hello! This is a test of the INFINITO audio generation system. How do I sound?"
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
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

  const previewVoice = async (voiceIdToPreview: string) => {
    try {
      setIsGeneratingPreview(true)
      setPreviewVoiceId(voiceIdToPreview)
      setPreviewAudioUrl(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Authentication required')
      }
      
      const previewText = "Hello, I'm a sample voice. How do I sound?"
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          text: previewText,
          voice_id: voiceIdToPreview,
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
        setPreviewAudioUrl(data.audioUrl)
      } else {
        throw new Error('Failed to generate preview')
      }
    } catch (error) {
      console.error('Error generating voice preview:', error)
      alert('❌ Failed to generate voice preview')
    } finally {
      setIsGeneratingPreview(false)
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
                Save All Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        
        {/* Voice Selection */}
        <div className="bg-gradient-to-br from-orange-900/10 to-yellow-900/10 border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-orange-400">Voice Selection</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCustomVoices(false)}
                variant={!showCustomVoices ? "default" : "outline"}
                size="sm"
                className={!showCustomVoices ? "bg-orange-600 hover:bg-orange-700" : "border-orange-500 text-orange-400 hover:bg-orange-500/20"}
              >
                Default Voices
              </Button>
              <Button
                onClick={() => setShowCustomVoices(true)}
                variant={showCustomVoices ? "default" : "outline"}
                size="sm"
                className={showCustomVoices ? "bg-orange-600 hover:bg-orange-700" : "border-orange-500 text-orange-400 hover:bg-orange-500/20"}
                disabled={isLoadingVoices}
              >
                {isLoadingVoices ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Custom Voices (${customVoices.length})`
                )}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {!showCustomVoices ? ELEVENLABS_VOICES.map((voice) => (
              <div
                key={voice.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  voiceId === voice.id
                    ? 'border-orange-500 bg-orange-500/20'
                    : 'border-orange-500/20 bg-black/20 hover:border-orange-500/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setVoiceId(voice.id)}
                    className="flex-1 text-left"
              >
                <div className="font-bold text-orange-300">{voice.name}</div>
                <div className="text-xs text-gray-400 mt-1">{voice.description}</div>
                {voiceId === voice.id && (
                  <div className="text-orange-400 text-xs mt-2">✓ Selected</div>
                )}
              </button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      previewVoice(voice.id)
                    }}
                    disabled={isGeneratingPreview && previewVoiceId === voice.id}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 flex-shrink-0"
                    title="Preview voice"
                  >
                    {isGeneratingPreview && previewVoiceId === voice.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {previewAudioUrl && previewVoiceId === voice.id && (
                  <div className="mt-3 pt-3 border-t border-orange-500/20">
                    <audio 
                      controls 
                      src={previewAudioUrl} 
                      className="w-full h-8"
                      autoPlay
                    />
                  </div>
                )}
              </div>
            )) : customVoices.length > 0 ? customVoices.map((voice) => (
              <div
                key={voice.voice_id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  voiceId === voice.voice_id
                    ? 'border-orange-500 bg-orange-500/20'
                    : 'border-orange-500/20 bg-black/20 hover:border-orange-500/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => setVoiceId(voice.voice_id)}
                    className="flex-1 text-left"
                  >
                    <div className="font-bold text-orange-300">{voice.name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {voice.category === 'premade' ? 'Default Voice' : 'Custom Voice'}
                      {voice.labels && voice.labels.gender && ` • ${voice.labels.gender}`}
                      {voice.labels && voice.labels.age && ` • ${voice.labels.age}`}
                    </div>
                    {voiceId === voice.voice_id && (
                      <div className="text-orange-400 text-xs mt-2">✓ Selected</div>
                    )}
                  </button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      previewVoice(voice.voice_id)
                    }}
                    disabled={isGeneratingPreview && previewVoiceId === voice.voice_id}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 flex-shrink-0"
                    title="Preview voice"
                  >
                    {isGeneratingPreview && previewVoiceId === voice.voice_id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {previewAudioUrl && previewVoiceId === voice.voice_id && (
                  <div className="mt-3 pt-3 border-t border-orange-500/20">
                    <audio 
                      controls 
                      src={previewAudioUrl} 
                      className="w-full h-8"
                      autoPlay
                    />
                  </div>
                )}
              </div>
            )) : (
              <div className="col-span-full text-center py-8">
                <div className="text-gray-400 mb-2">No custom voices found</div>
                <div className="text-xs text-gray-500">
                  Create custom voices in your ElevenLabs account to see them here
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System-Wide Voice Settings */}
        <div className="bg-gradient-to-br from-orange-900/10 to-yellow-900/10 border border-orange-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-orange-400 mb-4">System-Wide Voice Settings</h2>
          <p className="text-gray-400 mb-6">Configure which voices are available to users and system defaults</p>
          
          {/* Voice Selection Enabled Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={systemSettings.voice_selection_enabled}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, voice_selection_enabled: e.target.checked }))}
                className="w-5 h-5 rounded border-orange-500 text-orange-500 focus:ring-orange-500"
              />
              <div>
                <div className="text-orange-300 font-semibold">Enable Voice Selection for Users</div>
                <div className="text-xs text-gray-400">Allow users to choose different voices for audio generation</div>
              </div>
            </label>
          </div>

          {/* Custom Voices Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={systemSettings.allow_custom_voices}
                onChange={(e) => setSystemSettings(prev => ({ ...prev, allow_custom_voices: e.target.checked }))}
                className="w-5 h-5 rounded border-orange-500 text-orange-500 focus:ring-orange-500"
              />
              <div>
                <div className="text-orange-300 font-semibold">Allow Custom Voices</div>
                <div className="text-xs text-gray-400">Let users access their custom ElevenLabs voices</div>
              </div>
            </label>
          </div>

          {/* Available Default Voices Selection */}
          {systemSettings.voice_selection_enabled && (
            <div className="mb-6">
              <label className="text-orange-300 font-semibold block mb-3">Available Default Voices</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {ELEVENLABS_VOICES.map((voice) => (
                  <label key={voice.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVoiceIds.includes(voice.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVoiceIds(prev => [...prev, voice.id])
                        } else {
                          setSelectedVoiceIds(prev => prev.filter(id => id !== voice.id))
                        }
                      }}
                      className="w-4 h-4 rounded border-orange-500 text-orange-500 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-orange-300 text-sm font-medium">{voice.name}</div>
                      <div className="text-xs text-gray-400">{voice.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Available Custom Voices Selection */}
          {systemSettings.voice_selection_enabled && customVoices.length > 0 && (
            <div className="mb-6">
              <label className="text-orange-300 font-semibold block mb-3">Available Custom Voices</label>
              <p className="text-gray-400 text-sm mb-3">Select which of your custom voices users can choose from</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {customVoices.map((voice) => (
                  <label key={voice.voice_id} className="flex items-center gap-2 cursor-pointer p-3 rounded border border-orange-500/20 hover:border-orange-500/50">
                    <input
                      type="checkbox"
                      checked={selectedCustomVoiceIds.includes(voice.voice_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCustomVoiceIds(prev => [...prev, voice.voice_id])
                        } else {
                          setSelectedCustomVoiceIds(prev => prev.filter(id => id !== voice.voice_id))
                        }
                      }}
                      className="w-4 h-4 rounded border-orange-500 text-orange-500 focus:ring-orange-500"
                    />
                    <div className="flex-1">
                      <div className="text-orange-300 text-sm font-medium">{voice.name}</div>
                      <div className="text-xs text-gray-400">
                        {voice.category === 'premade' ? 'Default Voice' : 'Custom Voice'}
                        {voice.labels && voice.labels.gender && ` • ${voice.labels.gender}`}
                        {voice.labels && voice.labels.age && ` • ${voice.labels.age}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Default Voice Selection */}
          <div className="mb-6">
            <label className="text-orange-300 font-semibold block mb-3">Default Voice for New Users</label>
            <select
              value={systemSettings.default_voice_id}
              onChange={(e) => setSystemSettings(prev => ({ ...prev, default_voice_id: e.target.value }))}
              className="w-full max-w-xs p-2 bg-black/50 border border-orange-500/50 rounded text-orange-300 focus:border-orange-400 focus:ring-orange-400/50"
            >
              {/* Default voices */}
              {ELEVENLABS_VOICES.map((voice) => (
                <option key={voice.id} value={voice.id} className="bg-black text-orange-300">
                  {voice.name} - {voice.description}
                </option>
              ))}
              {/* Custom voices */}
              {customVoices.map((voice) => (
                <option key={voice.voice_id} value={voice.voice_id} className="bg-black text-orange-300">
                  {voice.name} - Custom Voice
                </option>
              ))}
            </select>
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

