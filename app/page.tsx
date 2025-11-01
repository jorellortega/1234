"use client"

import { useState, useEffect, type ChangeEvent, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUp, Mic, BookUser, BrainCircuit, Copy, Check, Upload, FileText, X, Settings, LogOut, User, Eye, EyeOff, CreditCard, Download, ArrowLeft, Library, RefreshCw, Play, Music, ImageIcon, Video } from "lucide-react"
import { HudPanel } from "@/components/hud-panel"
import { AztecIcon } from "@/components/aztec-icon"
import { DocumentUpload } from "@/components/DocumentUpload"
import { MemoryReview } from "@/components/MemoryReview"
import { ProgressiveResponse } from "@/components/ProgressiveResponse"
import { MemoryFormData } from "@/lib/types"
import { supabase } from "@/lib/supabase-client"
import { CreditsPurchaseDialog } from "@/components/CreditsPurchaseDialog"

export default function AIPromptPage() {
  const [prompt, setPrompt] = useState("")
  const [lastPrompt, setLastPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [mode, setMode] = useState("openai")
  
  // Separate state for each model type
  const [selectedTextModel, setSelectedTextModel] = useState("openai")
  const [selectedImageModel, setSelectedImageModel] = useState<string | null>(null)
  const [selectedVideoModel, setSelectedVideoModel] = useState<string | null>(null)
  const [selectedAudioModel, setSelectedAudioModel] = useState<string | null>(null)
  const [imageToVideoModel, setImageToVideoModel] = useState<string>('gen4_turbo') // Separate model for image-to-video conversion (gen4_aleph is V2V, not I2V)
  
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  const needsOllama = mode === "llama" || mode === "mistral"
  const isVisionModel = mode === "blip" || mode === "llava"
  const isImageGenModel = mode === "dalle_image" || mode === "runway_image" || mode === "gen4_image" || mode === "gen4_image_turbo" || mode === "gemini_2.5_flash" || mode === "gpt-image-1"
  const isVideoModel = mode === "gen4_turbo" || mode === "gen3a_turbo" || mode === "gen4_aleph" || mode === "veo3.1" || mode === "veo3.1_fast" || mode === "veo3" || mode === "kling_t2v" || mode === "kling_i2v" || mode === "kling_lipsync" || mode === "kling_avatar"
  
  // Authentication state
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userCredits, setUserCredits] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [refundedCredits, setRefundedCredits] = useState<number | null>(null)
  
  // Admin preferences state
  const [adminPreferences, setAdminPreferences] = useState<any>(null)
  
  // Panel visibility state
  const [showPanels, setShowPanels] = useState(false)
  
  // Conversational signup state
  const [signupFlow, setSignupFlow] = useState<'idle' | 'asking' | 'collecting'>('idle')
  const [signupData, setSignupData] = useState({ name: '', email: '', phone: '', password: '' })
  const [signupStep, setSignupStep] = useState<'email' | 'name' | 'phone' | 'password'>('email')
  
  // Voice recognition state
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  
  // Track last saved generation ID for threading
  const [lastGenerationId, setLastGenerationId] = useState<string | null>(null)
  // Also use ref to track it synchronously (doesn't get lost)
  const lastGenerationIdRef = useRef<string | null>(null)
  
  // Check authentication status
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          // Fetch user credits
          await fetchUserCredits(user.id)
          // Check admin status
          await checkAdminStatus()
        }
      } catch (error) {
        console.error('Error getting user:', error)
      } finally {
        setAuthLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserCredits(session.user.id)
        checkAdminStatus()
        // Also fetch universal model selections for all users
        fetchAdminPreferences()
      } else {
        setUserCredits(0)
        setIsAdmin(false)
      }
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch user credits
  const fetchUserCredits = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('credits')
        .eq('id', userId)
        .single()
      
      setUserCredits(profile?.credits || 0)
    } catch (error) {
      // Silently fail - user may not be authenticated
      setUserCredits(0)
    }
  }

  // Check admin status
  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        console.log('❌ No session or user found for admin check')
        setIsAdmin(false)
        return
      }

      console.log('🔍 Checking admin status for user:', session.user.email)

      const response = await fetch('/api/admin/check-role', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      console.log('📡 Admin check response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Admin check result:', data)
        setIsAdmin(data.isAdmin || false)
        
        // Fetch preferences for all users (admin selections are universal defaults)
        await fetchAdminPreferences()
      } else {
        const errorText = await response.text()
        console.error('❌ Admin check failed:', response.status, errorText)
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('❌ Admin check error:', error)
      setIsAdmin(false)
    }
  }

  // Fetch admin preferences
  const fetchAdminPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/preferences', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Admin preferences:', data.preferences)
        setAdminPreferences(data.preferences)
        
        // Load saved model selections
        const prefs = data.preferences
        if (prefs.selected_text_model) {
          setSelectedTextModel(prefs.selected_text_model)
          setMode(prefs.selected_text_model) // Set active mode to text model
          console.log('📌 Restored text model:', prefs.selected_text_model)
        }
        if (prefs.selected_image_model) {
          setSelectedImageModel(prefs.selected_image_model)
          console.log('📌 Restored image model:', prefs.selected_image_model)
        }
        if (prefs.selected_video_model) {
          setSelectedVideoModel(prefs.selected_video_model)
          console.log('📌 Restored video model:', prefs.selected_video_model)
        }
        if (prefs.selected_audio_model) {
          setSelectedAudioModel(prefs.selected_audio_model)
          console.log('📌 Restored audio model:', prefs.selected_audio_model)
        }
        if (prefs.selected_image_to_video_model) {
          setImageToVideoModel(prefs.selected_image_to_video_model)
          console.log('📌 Restored image-to-video model:', prefs.selected_image_to_video_model)
        }
      }
    } catch (error) {
      console.error('❌ Error fetching admin preferences:', error)
    }
  }

  // Update admin preferences
  const updateAdminPreferences = async (preferences: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      })

      if (response.ok) {
        const data = await response.json()
        setAdminPreferences(data.preferences)
        console.log('✅ Preferences updated')
      }
    } catch (error) {
      console.error('❌ Error updating preferences:', error)
    }
  }

  // Check if a model is enabled (for non-admins) or always true for admins
  const isModelEnabled = (modelKey: string) => {
    // Admins can see all models regardless of preferences
    if (isAdmin) return true
    
    // If no preferences loaded yet, show all models
    if (!adminPreferences) return true
    
    // Check the specific model preference
    return adminPreferences[`model_${modelKey}`] !== false
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // Conversational signup handlers
  const handleSignupYes = () => {
    setOutput(`Great! Let's get started - what's your email address?`)
    setPrompt('') // Clear the prompt so placeholder shows
    setSignupFlow('collecting')
    setSignupStep('email')
    setSignupData({ name: '', email: '', phone: '', password: '' })
  }

  const handleSignupNo = () => {
    setOutput(`No worries! When you're ready to create an account, just click the "login/signup" button in the top right corner.

Is there anything else I can help you with?`)
    setSignupFlow('idle')
    setOutput('')
  }

  const handleSkipPhone = () => {
    const newData = { ...signupData, phone: '' }
    setSignupData(newData)
    setOutput(`Perfect! Last step - what would you like your password to be? (at least 6 characters)`)
    setPrompt('') // Clear prompt for next step
    setSignupStep('password')
  }

  const handleBackStep = () => {
    if (signupStep === 'name') {
      setSignupStep('email')
      setOutput(`Let's start over. What's your email address?`)
      setPrompt(signupData.email || '') // Restore previous email
    } else if (signupStep === 'phone') {
      setSignupStep('name')
      setOutput(`Got it! What's your full name?`)
      setPrompt(signupData.name || '') // Restore previous name
    } else if (signupStep === 'password') {
      setSignupStep('phone')
      setOutput(`Nice to meet you, ${signupData.name}! What's your phone number? (optional - you can say "skip" if you prefer)`)
      setPrompt(signupData.phone || '') // Restore previous phone
    }
  }

  const handleSignupInput = async (userInput: string) => {
    if (signupStep === 'email') {
      const newData = { ...signupData, email: userInput }
      setSignupData(newData)
      setOutput(`Got it! What's your full name?`)
      setPrompt('') // Clear prompt for next step
      setSignupStep('name')
    } else if (signupStep === 'name') {
      const newData = { ...signupData, name: userInput }
      setSignupData(newData)
      setOutput(`Nice to meet you, ${userInput}! What's your phone number? (optional - you can say "skip" if you prefer)`)
      setPrompt('') // Clear prompt for next step
      setSignupStep('phone')
    } else if (signupStep === 'phone') {
      const newData = { ...signupData, phone: userInput === 'skip' ? '' : userInput }
      setSignupData(newData)
      setOutput(`Perfect! Last step - what would you like your password to be? (at least 6 characters)`)
      setPrompt('') // Clear prompt for next step
      setSignupStep('password')
    } else if (signupStep === 'password') {
      const newData = { ...signupData, password: userInput }
      setSignupData(newData)
      
      // Store in localStorage and redirect to signup
      localStorage.setItem('signupData', JSON.stringify(newData))
      window.location.href = '/signup'
    }
  }

  // Load available voices and user preferences
  const loadVoicesAndPreferences = async () => {
    if (!user) {
      console.log('🎵 No user, skipping voice loading')
      return
    }
    
    try {
      console.log('🎵 Loading voices and preferences for user:', user.id)
      setIsLoadingVoices(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.log('🎵 No session token')
        return
      }

      // Load available voices
      console.log('🎵 Fetching available voices...')
      const voicesResponse = await fetch('/api/available-voices', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (voicesResponse.ok) {
        const voicesData = await voicesResponse.json()
        console.log('🎵 Voices data:', voicesData)
        setAvailableVoices(voicesData.voices || [])
        
        // If user has no preferences, use admin's default voice
        if (!selectedVoiceId && voicesData.admin_default_voice) {
          console.log('🎵 Setting admin default voice:', voicesData.admin_default_voice)
          setSelectedVoiceId(voicesData.admin_default_voice)
        }
      } else {
        console.error('🎵 Failed to load voices:', voicesResponse.status, await voicesResponse.text())
      }

      // Load user audio preferences
      console.log('🎵 Fetching user preferences...')
      const prefsResponse = await fetch('/api/user/audio-preferences', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (prefsResponse.ok) {
        const prefsData = await prefsResponse.json()
        console.log('🎵 User preferences:', prefsData)
        setUserAudioPreferences(prefsData.preferences)
        
        // Use user's preferred voice, or admin's default, or first available voice
        const voiceToUse = prefsData.preferences?.preferred_voice_id || 
                          voicesData?.admin_default_voice || 
                          availableVoices[0]?.voice_id || 
                          availableVoices[0]?.id
        console.log('🎵 Setting voice to use:', voiceToUse)
        setSelectedVoiceId(voiceToUse)
      } else {
        console.error('🎵 Failed to load user preferences:', prefsResponse.status, await prefsResponse.text())
      }
    } catch (error) {
      console.error('🎵 Error loading voices and preferences:', error)
    } finally {
      setIsLoadingVoices(false)
    }
  }

  // Generate audio from text using ElevenLabs
  const generateAudio = async (text: string) => {
    if (!text.trim()) return

    setIsGeneratingAudio(true)
    setAudioError(null)
    setAudioUrl(null)

    try {
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Authentication required. Please log in.')
      }

      // Use selected voice or fallback to user preferences, then admin default, then system default
      const voiceToUse = selectedVoiceId || 
                        userAudioPreferences?.preferred_voice_id || 
                        'EXAVITQu4vr4xnSDxMaL' // System fallback
      const modelToUse = userAudioPreferences?.preferred_model_id || 'eleven_multilingual_v2'

      console.log('🎵 Using voice for audio generation:', voiceToUse)

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          text: text.trim(),
          voice_id: voiceToUse,
          model_id: modelToUse,
          stability: userAudioPreferences?.stability || 0.50,
          similarity_boost: userAudioPreferences?.similarity_boost || 0.75,
          style: userAudioPreferences?.style || 0.00,
          use_speaker_boost: userAudioPreferences?.use_speaker_boost ?? true,
          output_format: userAudioPreferences?.output_format || 'mp3_44100_128',
          optimize_streaming_latency: userAudioPreferences?.optimize_streaming_latency || 0
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate audio')
      }

      const data = await response.json()
      setAudioUrl(data.audioUrl || data.audio)
    } catch (error) {
      console.error('Audio generation error:', error)
      setAudioError(error instanceof Error ? error.message : 'Failed to generate audio')
    } finally {
      setIsGeneratingAudio(false)
    }
  }
  
  // Save user voice preference
  const saveUserVoicePreference = async (voiceId: string) => {
    if (!user) return
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      await fetch('/api/user/audio-preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferred_voice_id: voiceId,
          preferred_model_id: userAudioPreferences?.preferred_model_id || 'eleven_multilingual_v2',
          stability: userAudioPreferences?.stability || 0.50,
          similarity_boost: userAudioPreferences?.similarity_boost || 0.75,
          style: userAudioPreferences?.style || 0.00,
          use_speaker_boost: userAudioPreferences?.use_speaker_boost ?? true,
          output_format: userAudioPreferences?.output_format || 'mp3_44100_128',
          optimize_streaming_latency: userAudioPreferences?.optimize_streaming_latency || 0
        })
      })
    } catch (error) {
      console.error('Error saving voice preference:', error)
    }
  }

  // Preview voice function
  const previewVoice = async (voiceId: string) => {
    if (!user) return
    
    try {
      setIsGeneratingPreview(true)
      setPreviewVoiceId(voiceId)
      setPreviewAudioUrl(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: "Hello! This is a preview of how I sound.",
          voice_id: voiceId,
          model_id: userAudioPreferences?.preferred_model_id || 'eleven_multilingual_v2',
          stability: userAudioPreferences?.stability || 0.50,
          similarity_boost: userAudioPreferences?.similarity_boost || 0.75,
          style: userAudioPreferences?.style || 0.00,
          use_speaker_boost: userAudioPreferences?.use_speaker_boost ?? true,
          output_format: userAudioPreferences?.output_format || 'mp3_44100_128',
          optimize_streaming_latency: userAudioPreferences?.optimize_streaming_latency || 0
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewAudioUrl(data.audioUrl || data.audio)
      } else {
        console.error('Failed to generate voice preview')
      }
    } catch (error) {
      console.error('Error generating voice preview:', error)
    } finally {
      setIsGeneratingPreview(false)
    }
  }
  
  // Function to get display name for modes
  const getModeDisplayName = (mode: string) => {
    switch (mode) {
      case "blip": return "One"
      case "llava": return "Dos"
      default: return mode.toUpperCase()
    }
  }
  
  // NEW: Streaming state for top console
  const [stream, setStream] = useState(true)
  const [temperature, setTemperature] = useState(0.7)
  const [topK, setTopK] = useState(20)
  const [maxTokens, setMaxTokens] = useState(1024)
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [glowEnabled, setGlowEnabled] = useState(false)
  const [responseStyle, setResponseStyle] = useState<"concise" | "detailed">("concise")
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  
  // Voice selection for all users
  const [availableVoices, setAvailableVoices] = useState<any[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('')
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false)
  const [userAudioPreferences, setUserAudioPreferences] = useState<any>(null)
  
  // Voice preview state
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null)
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  // NEW: Document import state
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [showMemoryReview, setShowMemoryReview] = useState(false)
  const [extractedMemories, setExtractedMemories] = useState<MemoryFormData[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessingDocument, setIsProcessingDocument] = useState(false)
  const [lastProcessedDocument, setLastProcessedDocument] = useState<string | null>(null)
  const [showDocumentReview, setShowDocumentReview] = useState(false)
  const [processedDocumentData, setProcessedDocumentData] = useState<any>(null)
  const [showFullTextDialog, setShowFullTextDialog] = useState(false)
  const [showCreditsDialog, setShowCreditsDialog] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<Array<{
    id: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    timestamp: Date,
    documentContext?: string,
    parentConversationId?: string
  }>>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showThreadView, setShowThreadView] = useState(false)
  const [threadGenerations, setThreadGenerations] = useState<Array<{
    id: string,
    created_at: string,
    prompt: string,
    output: string,
    model: string | null,
    is_root: boolean,
    thread_position: number
  }>>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const consoleRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Video generation state
  const [videoImage, setVideoImage] = useState<File | null>(null)
  const [videoImagePreview, setVideoImagePreview] = useState<string | null>(null)
  const [originalImageUrlForVideo, setOriginalImageUrlForVideo] = useState<string | null>(null) // Store original image URL when converting to video
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoGenerationProgress, setVideoGenerationProgress] = useState<string>('')
  const [videoProgressPercentage, setVideoProgressPercentage] = useState<number>(0)
  const [videoDuration, setVideoDuration] = useState<5 | 10>(5)
  const [videoRatio, setVideoRatio] = useState<string>('720:1280') // Default to portrait (RunwayML compatible)
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const [isConvertingImageToVideo, setIsConvertingImageToVideo] = useState(false) // Flag to track if converting from generated image
  
  // RunwayML Image Generation state
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [imageGenerationProgress, setImageGenerationProgress] = useState<string>('')

  const JOR_BINARY = "010010100100111101010010"

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const r = await fetch("/api/ollama-status", { cache: "no-store" })
        const j = await r.json()
        if (!cancelled) setOllamaOk(Boolean(j?.ok))
      } catch {
        if (!cancelled) setOllamaOk(false)
      }
    }
    check()
    return () => { cancelled = true }
  }, [mode])

  // Load voices and preferences when user changes
  useEffect(() => {
    if (user) {
      loadVoicesAndPreferences()
    }
  }, [user])

  // Update video aspect ratio when mode changes to ensure compatibility
  useEffect(() => {
    // Set default aspect ratio based on video model
    if (mode === 'veo3' || mode === 'veo3.1' || mode === 'veo3.1_fast') {
      // VEO models support: 720:1280, 1280:720, 1080:1920, 1920:1080
      if (!['720:1280', '1280:720', '1080:1920', '1920:1080'].includes(videoRatio)) {
        setVideoRatio('720:1280') // Default to portrait for VEO
      }
    } else if (mode === 'gen3a_turbo' || mode === 'gen4_turbo' || mode === 'gen4_aleph') {
      // GEN models support RunwayML's standard ratios
      if (!['720:1280', '1280:720', '1104:832', '832:1104', '960:960', '1584:672'].includes(videoRatio)) {
        setVideoRatio('720:1280') // Default to portrait for GEN
      }
    } else if (mode === 'kling_t2v' || mode === 'kling_i2v' || mode === 'kling_lipsync' || mode === 'kling_avatar') {
      // Kling AI models support: 1280:720 (16:9), 720:1280 (9:16), 960:960 (1:1)
      if (!['1280:720', '720:1280', '960:960'].includes(videoRatio)) {
        setVideoRatio('720:1280') // Default to portrait for Kling
      }
    }
  }, [mode])

  // Initialize voice recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      recognitionInstance.continuous = false
      recognitionInstance.interimResults = false
      recognitionInstance.lang = 'en-US'
      
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setPrompt(prev => prev + transcript)
        setIsListening(false)
      }
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
      
      recognitionInstance.onend = () => {
        setIsListening(false)
      }
      
      setRecognition(recognitionInstance)
    }
  }, [])

  const handleVoiceInput = () => {
    if (isListening) {
      recognition?.stop()
      setIsListening(false)
    } else {
      try {
        recognition?.start()
        setIsListening(true)
      } catch (error) {
        console.error('Failed to start speech recognition:', error)
        setError('Voice recognition not available in this browser')
      }
    }
  }

  const handlePromptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setPrompt(value)

    // Check if the input (ignoring spaces) matches the binary code for "JOR"
    if (value.replace(/\s/g, "") === JOR_BINARY) {
      setResponse("WELCOME INFINITO")
    } else {
      setResponse("")
    }
  }

  const handleModelChange = async (value: string, modelType: 'text' | 'image' | 'video' | 'audio') => {
    // Only update the global 'mode' for text models
    // Image, video, and audio models have their own separate state
    if (modelType === 'text') {
      setMode(value)
      setSelectedTextModel(value)
      console.log("Text model changed to:", value)
    } else if (modelType === 'image') {
      setSelectedImageModel(value)
      console.log("Image model changed to:", value)
    } else if (modelType === 'video') {
      setSelectedVideoModel(value)
      console.log("Video model changed to:", value)
    } else if (modelType === 'audio') {
      setSelectedAudioModel(value)
      console.log("Audio model changed to:", value)
    } else if (modelType === 'imageToVideo') {
      setImageToVideoModel(value)
      console.log("Image-to-video model changed to:", value)
    }
    
    // Save model selection to admin preferences if admin
    if (isAdmin) {
      const updatePayload: any = {}
      
      if (modelType === 'text') {
        updatePayload.selected_text_model = value
      } else if (modelType === 'image') {
        updatePayload.selected_image_model = value
      } else       if (modelType === 'video') {
        updatePayload.selected_video_model = value
      } else if (modelType === 'audio') {
        updatePayload.selected_audio_model = value
      } else if (modelType === 'imageToVideo') {
        updatePayload.selected_image_to_video_model = value
      }
      
      // Save to preferences
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await fetch('/api/admin/preferences', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
          })
          console.log(`💾 Saved ${modelType} model:`, value)
        }
      } catch (error) {
        console.error('Error saving model selection:', error)
      }
    }
  }



  // NEW: Document drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      
      // Smart image handling - import image and let user decide what to do with it
      if (file.type.startsWith('image/')) {
        // Import the image for both vision and video use
        setSelectedImage(file)
        setVideoImage(file)
        
        const reader = new FileReader()
        reader.onload = (e) => {
          const imageData = e.target?.result as string
          setImagePreview(imageData)
          setVideoImagePreview(imageData)
        }
        reader.readAsDataURL(file)
        setError(null)
        
        // Show helpful message
        setOutput('✅ Image loaded! You can now:\n• Ask me questions about this image\n• Type "generate video" or "animate this" to create a video from it')
        return
      }
      
      // Handle documents
      if (file.type === 'application/pdf' || file.type.includes('text/') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        await processAndSaveDocument(file)
      } else {
        setError('Please drop a valid image or document file')
      }
    }
  }

  // NEW: Direct document processing and saving
  const processAndSaveDocument = async (file: File) => {
    try {
      setError(null)
      setIsProcessingDocument(true)
      
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('filename', file.name)

      // Process document
      const response = await fetch('/api/documents/process', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to process document' }))
        const errorMessage = errorData.error || errorData.details || 'Failed to process document'
        console.error('❌ [ERROR] Document processing failed:', errorData)
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      // DEBUG: Log the API response
      console.log('🔍 [DEBUG] Document processing API response:', {
        hasResult: !!result,
        filename: result?.filename,
        hasMemories: !!result?.memories,
        memoriesCount: result?.memories?.length || 0,
        hasExtractedText: !!result?.extractedText,
        extractedTextLength: result?.extractedText?.length || 0,
        extractedTextPreview: result?.extractedText?.substring(0, 100) || 'NO TEXT',
        fullResult: result
      })
      
      if (result.memories && result.memories.length > 0) {
        // Get the current session token for authentication
        const { data: { session } } = await supabase.auth.getSession()
        
        // DEBUG: Check extractedText before proceeding
        if (!result.extractedText || result.extractedText.trim().length === 0) {
          console.error('❌ [ERROR] API returned no extractedText!', result)
          setError(`Document ${file.name} was processed but no text was extracted. Check server logs.`)
          setIsProcessingDocument(false)
          return
        }
        
        // Automatically save all extracted memories
        for (const memory of result.memories) {
          await fetch('/api/memories', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
            },
            body: JSON.stringify(memory),
          })
        }
        
        // Show success message
        setError(null)
        setLastProcessedDocument(`${file.name} (${result.memories.length} memories)`)
        
        // Set the processed document data to show the file icon
        console.log('✅ [DEBUG] Setting processedDocumentData with extractedText length:', result.extractedText?.length || 0)
        setProcessedDocumentData(result)
        // Don't automatically show the review window - let user click the icon
        
        // Start a new conversation for this document
        setCurrentConversationId(null)
        setConversationHistory([])
        
        // Add document loading event to conversation history
        setConversationHistory([{
          id: `doc-${Date.now()}`,
          role: 'system',
          content: `Document loaded: ${result.filename}`,
          timestamp: new Date(),
          documentContext: result.filename,
          parentConversationId: undefined
        }])
        
        // Clear success message after 5 seconds
        setTimeout(() => setLastProcessedDocument(null), 5000)
        
        console.log(`Successfully processed and saved ${result.memories.length} memories from ${file.name}`)
      } else {
        throw new Error('No memories extracted from document')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process document')
      console.error('Error processing document:', err)
    } finally {
      setIsProcessingDocument(false)
    }
  }

  // NEW: Image upload handler for vision models
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError(null)
    } else {
      setError('Please select a valid image file')
    }
  }

  // Video image upload handler
  const handleVideoImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setVideoImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setVideoImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError(null)
    } else {
      setError('Please select a valid image file')
    }
  }

  const clearVideoImage = () => {
    setVideoImage(null)
      setVideoImagePreview(null)
      setIsConvertingImageToVideo(false) // Clear flag when clearing video image
      setOriginalImageUrlForVideo(null) // Clear stored image URL
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = ''
      }
    }

  // Convert generated image to video
  const handleConvertImageToVideo = async (imageUrl: string) => {
    try {
      setError(null)
      
      // Store the original image URL so we can show both image and video together
      setOriginalImageUrlForVideo(imageUrl)
      
      // Fetch the image and convert to File
      const response = await fetch(`/api/download-image?url=${encodeURIComponent(imageUrl)}`)
      if (!response.ok) throw new Error('Failed to fetch image')
      
      const blob = await response.blob()
      const file = new File([blob], 'generated-image.png', { type: 'image/png' })
      
      // Create image preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setVideoImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      
      // Set the video image
      setVideoImage(file)
      
      // Set flag to use imageToVideoModel instead of selected video model
      setIsConvertingImageToVideo(true)
      
      // Switch to video mode - use current video model if already selected, otherwise default to gen4_turbo
      const isCurrentlyVideoModel = ['gen4_turbo', 'gen3a_turbo', 'veo3.1', 'veo3.1_fast', 'veo3', 'gen4_aleph'].includes(mode)
      if (!isCurrentlyVideoModel) {
        setMode('gen4_turbo')
      }
      
      // Set a helpful prompt
      setPrompt('Add motion and animation to this image')
      
      // Scroll to top to show video generation UI
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
      // Only set output message if not already in video mode to prevent duplicates
      if (!isVideoModel) {
        setOutput('✅ Image loaded! Ready to convert to video. You can edit the prompt or click "GENERATE VIDEO" to continue.')
      }
      
    } catch (error) {
      console.error('Error converting image to video:', error)
      setError('Failed to load image for video generation')
      setIsConvertingImageToVideo(false)
      setOriginalImageUrlForVideo(null)
    }
  }

  // NEW: Image drag and drop handlers
  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleImageDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        setSelectedImage(file)
        const reader = new FileReader()
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
        setError(null)
      } else {
        setError('Please drop a valid image file')
      }
    }
  }

  // Video image drag and drop handlers
  const handleVideoImageDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleVideoImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleVideoImageDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('image/')) {
        setVideoImage(file)
        const reader = new FileReader()
        reader.onload = (e) => {
          setVideoImagePreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
        setError(null)
      } else {
        setError('Please drop a valid image file')
      }
    }
  }

  const clearSelectedImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

    // NEW: Save image as a document-like memory and upload to storage
  const saveImageAsMemory = async () => {
    if (!selectedImage || !imagePreview) return
    
    try {
      // First, upload the image file to Supabase storage
      const formData = new FormData()
      formData.append('file', selectedImage)
      formData.append('filename', selectedImage.name)
      
      console.log('Uploading image to storage bucket...')
      
      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })
      
      let storageUrl = null
      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json()
        storageUrl = uploadData.url
        console.log('Image uploaded to storage:', storageUrl)
      } else {
        console.error('Failed to upload image to storage:', uploadResponse.status)
      }
      
      // Then save the memory with storage URL
      const imageMemory = {
        concept: `Image Document: ${selectedImage.name}`,
        data: `Image file uploaded for vision model analysis.\n\nFilename: ${selectedImage.name}\nSize: ${(selectedImage.size / 1024 / 1024).toFixed(2)} MB\nType: ${selectedImage.type}\nStorage URL: ${storageUrl || 'Upload failed'}\n\nImage Data: ${imagePreview ? 'Available' : 'Not available'}`,
        salience: 0.9,
        connections: ['image_document', 'vision_model', 'memory_core'],
        memory_type: 'semantic',
        priority: 8,
        memory_category: 'image_document',
        parent_id: null,
        hierarchy_level: 0
      }

      console.log('Saving image as memory document:', imageMemory)
      
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imageMemory)
      })
      
      if (response.ok) {
        const responseData = await response.json()
        console.log('Image document saved to memory:', responseData)
        
        // Set this as the current document context
        setProcessedDocumentData({
          filename: selectedImage.name,
          fileType: selectedImage.type,
          extractedText: 'Image document for vision analysis',
          memories: [imageMemory]
        })
        
        setLastProcessedDocument(`${selectedImage.name} (Image Document)`)
        setTimeout(() => setLastProcessedDocument(null), 5000)
      } else {
        console.error('Failed to save image document:', response.status)
      }
    } catch (error) {
      console.error('Error saving image document:', error)
    }
  }

  // NEW: Document processing handlers
  const handleDocumentProcessed = (memories: MemoryFormData[]) => {
    setExtractedMemories(memories)
    setShowDocumentUpload(false)
    setShowMemoryReview(true)
  }

  const handleSaveExtractedMemories = async (memories: MemoryFormData[]) => {
    try {
      // Save each extracted memory to the memory core
      for (const memory of memories) {
        await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(memory),
        })
      }
      
      setShowMemoryReview(false)
      setExtractedMemories([])
      
      // Show success message
      setError(null)
    } catch (err) {
      setError('Failed to save some extracted memories')
      console.error('Error saving extracted memories:', err)
    }
  }

  // NEW: Stream from API function for SSE
  async function* streamFromAPI(prompt: string, mode: string, customMaxTokens?: number) {
    const res = await fetch("/api/generate-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
          prompt, 
          mode, 
          max_tokens: customMaxTokens ?? maxTokens, 
          temperature, 
          top_k: topK,
          image: isVisionModel && selectedImage ? imagePreview : undefined, // Send actual image data for vision models
        }),
    });

    if (!res.body) throw new Error("No stream body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n"); // SSE delimiter
      buf = parts.pop() ?? "";
      for (const part of parts) {
        if (part.startsWith("data: ")) {
          yield part.slice(6);
        }
      }
    }
  }

  // Video generation handler
  const handleGenerateImage = async (forcedMode?: string) => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for image generation')
      return
    }
    
    // Use forced mode if provided, otherwise use current mode
    const activeMode = forcedMode || mode

    // Check authentication
    if (!user) {
      setError('Please log in to generate images')
      return
    }

    try {
      setIsGeneratingImage(true)
      setError(null)
      setGeneratedImageUrl(null)
      setImageGenerationProgress('Preparing your image generation...')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Check credits - Image generation with 60% markup on API costs
      const imageCredits: Record<string, number> = {
        'dalle_image': 40,           // OpenAI: ~$0.04 + 60% markup
        'gpt-image-1': 40,           // OpenAI: ~$0.04 + 60% markup
        'gen4_image': 8,             // RunwayML: 5 credits + 60% markup
        'gen4_image_turbo': 3,       // RunwayML: 2 credits + 60% markup
        'gemini_2.5_flash': 8,       // RunwayML: 5 credits + 60% markup
        'runway_image': 8            // RunwayML: 5 credits + 60% markup (legacy)
      }
      const requiredCredits = imageCredits[activeMode] || 8 // Default to gen4_image pricing
      const creditResponse = await fetch('/api/credits/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requiredCredits: requiredCredits,
          operation: 'check_and_deduct'
        })
      })

      const creditData = await creditResponse.json()
      if (!creditData.success) {
        // Admin sees API costs, regular users don't
        const adminCostInfo = isAdmin ? ` (API: ${
          activeMode === 'dalle_image' ? 'OpenAI ~$0.04' :
          activeMode === 'gpt-image-1' ? 'OpenAI ~$0.04' :
          activeMode === 'gen4_image' ? 'RunwayML 5 credits/720p, 8 credits/1080p' :
          activeMode === 'gen4_image_turbo' ? 'RunwayML 2 credits' :
          activeMode === 'gemini_2.5_flash' ? 'RunwayML 5 credits' :
          'RunwayML ~5 credits'
        })` : ''
        setError(creditData.message || `Insufficient credits. Image generation costs ${requiredCredits} INFINITO credits${adminCostInfo}.`)
        return
      }

      // Update credits and refresh from database to ensure accuracy
      if (creditData.credits !== undefined) {
        setUserCredits(creditData.credits)
      }
      // Also refresh credits after a short delay to ensure we have the latest
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }

      // Determine which API to use
      let apiEndpoint = '/api/runway-image' // Default to RunwayML
      let modelName = 'RunwayML'
      
      if (activeMode === 'dalle_image') {
        apiEndpoint = '/api/dalle-image'
        modelName = 'DALL-E 3'
      } else if (activeMode === 'gpt-image-1') {
        apiEndpoint = '/api/dalle-image'
        modelName = 'GPT Image 1'
      } else if (activeMode === 'gen4_image') {
        apiEndpoint = '/api/runway-image'
        modelName = 'RunwayML Gen4 Image'
      } else if (activeMode === 'gen4_image_turbo') {
        apiEndpoint = '/api/runway-image'
        modelName = 'RunwayML Gen4 Image Turbo'
      } else if (activeMode === 'gemini_2.5_flash') {
        apiEndpoint = '/api/runway-image'
        modelName = 'Gemini 2.5 Flash'
      } else if (activeMode === 'runway_image') {
        apiEndpoint = '/api/runway-image'
        modelName = 'RunwayML Gen-4 (Legacy)'
      }
      
      setImageGenerationProgress(`Sending request to ${modelName}...`)

      // Send to backend
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: activeMode, // Pass the active model name to the API
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Image generation failed'
        
        // Handle credit refund if provided (from copyright/moderation errors)
        if (errorData.refunded && errorData.refundAmount) {
          setUserCredits(errorData.newBalance || userCredits)
          setRefundedCredits(errorData.refundAmount)
          // Clear refund message after 10 seconds
          setTimeout(() => setRefundedCredits(null), 10000)
          console.log(`✅ Credits refunded. New balance: ${errorData.newBalance}`)
        }
        
        // Check if it's a moderation-related error
        if (errorMessage && (
          errorMessage.toLowerCase().includes('moderation') || 
          errorMessage.toLowerCase().includes('did not pass') ||
          errorMessage.toLowerCase().includes('content policy') ||
          errorMessage.toLowerCase().includes('copyright')
        )) {
          throw new Error("Didn't pass copyright review. Remove copyrighted names/brands or explicit content and try again.")
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (data.success && data.url) {
        setImageGenerationProgress('Image generated successfully!')
        setLastPrompt(prompt) // Save prompt for later use
        setPrompt('') // Clear prompt
        // Use IMAGE_DISPLAY format so it appears in the AI response
        setOutput(`[IMAGE_DISPLAY:${data.url}]`)
        
        // Refresh credits after successful generation
        if (user?.id) {
          setTimeout(() => fetchUserCredits(user.id), 500)
        }
      } else {
        throw new Error('No image URL returned')
      }

    } catch (error: any) {
      console.error('Image generation error:', error)
      
      // Check if it's a moderation-related error and provide a clearer message
      let errorMessage = error.message || 'Failed to generate image'
      if (errorMessage && (
        errorMessage.toLowerCase().includes('moderation') || 
        errorMessage.toLowerCase().includes('did not pass') ||
        errorMessage.toLowerCase().includes('content policy') ||
        errorMessage.toLowerCase().includes('copyright')
      )) {
        errorMessage = "Didn't pass copyright review. Remove copyrighted names/brands or explicit content and try again."
      }
      
      setError(errorMessage)
      setImageGenerationProgress('')
      
      // Refresh credits after error (in case there was a refund)
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    } finally {
      setIsGeneratingImage(false)
    }
  }

  // Helper function to handle video generation with a specific model
  const handleGenerateVideoWithModel = async (videoModel: string) => {
    console.log('🎬 handleGenerateVideoWithModel called with model:', videoModel)
    console.log('📝 Current prompt:', prompt)
    console.log('🖼️ Has videoImage:', !!videoImage)
    console.log('⚙️ Current settings:', { videoDuration, videoRatio })
    
    const modelToUse = videoModel
    
    if (!prompt.trim()) {
      console.log('❌ ERROR: Prompt is empty')
      setError('Please enter a prompt for video generation')
      return
    }

    // Check if model requires an image
    if ((modelToUse === 'gen4_turbo' || modelToUse === 'gen3a_turbo') && !videoImage) {
      console.log('❌ ERROR: Model requires image but no image provided')
      setError(`${modelToUse} requires an image input`)
      return
    }
    
    console.log('✅ Validation passed, proceeding with video generation...')

    // Check authentication
    if (!user) {
      setError('Please log in to generate videos')
      return
    }

    try {
      setIsGeneratingVideo(true)
      setError(null)
      setVideoUrl(null)
      setVideoGenerationProgress('INFINITO is preparing your video...')
      setVideoProgressPercentage(5)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Check credits (video generation - 60% markup on RunwayML API cost)
      const videoCredits: Record<string, number> = {
        'gen4_turbo': 40,        // RunwayML: 25 credits + 60% markup
        'gen3a_turbo': 80,       // RunwayML: 50 credits + 60% markup
        'veo3.1': 320,           // RunwayML: 200 credits + 60% markup
        'veo3.1_fast': 160,      // RunwayML: 100 credits + 60% markup
        'veo3': 512,             // RunwayML: 320 credits (8s) + 60% markup
        'gen4_aleph': 120,       // RunwayML: 75 credits + 60% markup
        'act_two': 40,           // RunwayML: 25 credits + 60% markup
        'kling_t2v': 50,         // Kling AI: TBD + markup
        'kling_i2v': 50,         // Kling AI: TBD + markup
        'kling_lipsync': 50,     // Kling AI: TBD + markup
        'kling_avatar': 50       // Kling AI: TBD + markup
      }
      const requiredCredits = videoCredits[modelToUse] || 40 // Default to gen4_turbo pricing
      
      const creditResponse = await fetch('/api/credits/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requiredCredits: requiredCredits,
          operation: 'check_and_deduct'
        })
      })

      const creditData = await creditResponse.json()
      if (!creditData.success) {
        setError(creditData.message || `Insufficient credits. Video generation costs ${requiredCredits} INFINITO credits.`)
        setVideoGenerationProgress('')
        return
      }

      // Update credits and refresh from database to ensure accuracy
      if (creditData.credits !== undefined) {
        setUserCredits(creditData.credits)
      }
      // Also refresh credits after a short delay to ensure we have the latest
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }

      setVideoGenerationProgress('Credits verified, preparing video...')
      setVideoProgressPercentage(20)

      // Prepare form data
      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('model', modelToUse)
      formData.append('duration', videoDuration.toString())
      formData.append('ratio', videoRatio)
      
      if (videoImage) {
        formData.append('file', videoImage)
      }

      setVideoGenerationProgress('INFINITO is processing your video...')
      setVideoProgressPercentage(30)
      
      // Simulate progress during API call
      const progressInterval = setInterval(() => {
        setVideoProgressPercentage(prev => Math.min(prev + 2, 90))
      }, 2000)
      
      // Send to backend - route to appropriate API based on model
      const apiEndpoint = modelToUse.startsWith('kling') ? '/api/kling' : '/api/runway'
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      })
      
      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        
        // Update credit balance if refund occurred
        if (errorData.refunded && errorData.newBalance !== undefined) {
          setUserCredits(errorData.newBalance)
          console.log(`✅ Credits refunded. New balance: ${errorData.newBalance}`)
        }
        
        // Show refund message in error
        const refundMessage = errorData.refunded 
          ? ` Your ${requiredCredits} INFINITO credits have been refunded.` 
          : ''
        
        throw new Error((errorData.error || 'Video generation failed') + refundMessage)
      }

      const data = await response.json()
      
      if (data.success && data.url) {
        setVideoUrl(data.url)
        setVideoGenerationProgress('Video generated successfully!')
        setVideoProgressPercentage(100)
        setLastPrompt(prompt) // Save prompt for later use
        // Don't clear prompt - allow user to edit and regenerate
        
        // If we have an original image URL (converting from image), show both image and video
        // This allows users to see the original image and know they can generate more videos from it
        if (originalImageUrlForVideo) {
          setOutput(`[IMAGE_DISPLAY:${originalImageUrlForVideo}]\n\n[VIDEO_DISPLAY:${data.url}]`)
        } else {
          // Regular video generation (not from image conversion)
          setOutput(`[VIDEO_DISPLAY:${data.url}]`)
        }
        
        // Keep isConvertingImageToVideo flag and videoImage state so user can generate more videos
        // from the same image with different settings (aspect ratio, prompt, etc.)
        // Only clear if user manually clears it or starts a new image conversion
        
        // Refresh credits after successful generation
        if (user?.id) {
          setTimeout(() => fetchUserCredits(user.id), 500)
        }
      } else {
        throw new Error('No video URL returned')
      }

    } catch (error: any) {
      console.error('Video generation error:', error)
      setError(error.message || 'Failed to generate video')
      setVideoGenerationProgress('')
      setVideoProgressPercentage(0)
      
      // Refresh credits after error (in case there was a refund)
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    } finally {
      console.log('Video generation completed, setting isGeneratingVideo to false')
      setIsGeneratingVideo(false)
    }
  }

  // Original handler that uses the current mode
  const handleGenerateVideo = async () => {
    // If converting from generated image, use the separate image-to-video model
    const modelToUse = isConvertingImageToVideo ? imageToVideoModel : mode
    await handleGenerateVideoWithModel(modelToUse)
    // DON'T clear the flag after generating - keep it so user can generate more videos
    // from the same image with different settings
  }

  // NEW: Handle TRANSMIT button click
  async function handleTransmit() {
    console.log('🚀 handleTransmit called')
    console.log('📝 Prompt:', prompt)
    console.log('🎬 isVideoModel:', isVideoModel)
    console.log('🎯 selectedVideoModel:', selectedVideoModel)
    console.log('📊 Current mode:', mode)
    console.log('🔄 isGeneratingVideo:', isGeneratingVideo)
    console.log('⏳ loading:', loading)
    
    if (!prompt.trim()) {
      console.log('❌ Prompt is empty, returning')
      return
    }
    
    // DON'T reset lastGenerationId here - it should persist for "generate more" requests
    // Only reset when starting a completely new conversation (clear button or new session)
    
    // Handle video generation mode - if we're already in video mode (panel is showing), generate!
    if (isVideoModel && mode) {
      console.log('✅ Video mode active, calling handleGenerateVideo with mode:', mode)
      // If converting from generated image, use the separate image-to-video model
      const modelToUse = isConvertingImageToVideo ? imageToVideoModel : mode
      await handleGenerateVideoWithModel(modelToUse)
      // DON'T clear the flag after generating - keep it so user can generate more videos
      // from the same image with different settings
      return
    }
    
    // Handle image generation mode (RunwayML/DALL-E)
    if (isImageGenModel) {
      await handleGenerateImage()
      return
    }
    
    // Auto-detect image generation requests in text prompts FIRST (before video defaults)
    // Check if user is asking for image generation
    const imageKeywords = ['image', 'picture', 'photo', 'draw', 'generate image', 'create image', 'show me an image', 'visualize', 'illustration', 'painting', 'sketch', 'artwork', 'cover art', 'album art', 'album cover', 'poster', 'banner', 'thumbnail', 'art', 'drawing', 'create a picture', 'make an image', 'generate a picture']
    const wantsImage = prompt.length < 500 && imageKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    )
    
    // Additional check: if the prompt is asking a factual question, don't generate images
    const factualKeywords = ['what', 'when', 'where', 'why', 'how', 'who', 'explain', 'tell me about', 'describe', 'define', 'meaning', 'history', 'origin', 'started', 'began', 'created', 'invented', 'discovered']
    const isFactualQuestion = factualKeywords.some(keyword => 
      prompt.toLowerCase().startsWith(keyword.toLowerCase()) || 
      prompt.toLowerCase().includes(` ${keyword.toLowerCase()}`)
    )
    
    // Don't generate images for factual questions
    const shouldGenerateImage = wantsImage && !isFactualQuestion
    
    // If user wants an image and has selected an image model, use it
    const imageGenModels = ['dalle_image', 'gpt-image-1', 'runway_image', 'gen4_image', 'gen4_image_turbo', 'gemini_2.5_flash']
    if (shouldGenerateImage && selectedImageModel && imageGenModels.includes(selectedImageModel)) {
      // Pass the selected model directly to avoid async state update issues
      await handleGenerateImage(selectedImageModel)
      return
    }
    
    // Smart video detection - only trigger video if user explicitly asks for it
    // Skip this check if already in video mode to prevent duplicate messages
    const isAlreadyInVideoMode = isVideoModel
    const videoKeywords = ['video', 'animate', 'animation', 'make it move', 'bring to life', 'make it come alive', 'generate video', 'create video', 'turn into video', 'video from', 'motion', 'come to life', 'video of', 'show me a video']
    const wantsVideo = !isAlreadyInVideoMode && videoKeywords.some(keyword => 
      prompt.toLowerCase().includes(keyword.toLowerCase())
    )
    
    if (wantsVideo && selectedVideoModel) {
      console.log('🎬 User explicitly wants video:', selectedVideoModel)
      // Switch to video mode to show the video generation panel
      setMode(selectedVideoModel)
      setOutput('✅ Ready to generate video! Please review the video settings below (duration, aspect ratio) and click "GENERATE VIDEO".')
      return
    }
    
    // Handle signup flow if active
    if (signupFlow === 'collecting') {
      handleSignupInput(prompt)
      setPrompt('')
      return
    }
    
    // For vision models (image analysis), check if an image is uploaded
    if (isVisionModel && !selectedImage) {
      setError("Please upload an image first to use image analysis. Use the image upload section above.")
      return
    }
    
    // Check if user is authenticated
    if (!user) {
      setOutput(`Hello! I'd love to help you, but first you'll need to sign in to use INFINITO AI - I can help you sign up, yes/no?`)
      setSignupFlow('asking')
      setError(null)
      setResponseStyle('concise')
      return
    }
    
    // Check credits before proceeding
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setOutput(`Hello! I'd love to help you, but first you'll need to sign in to use INFINITO AI - I can help you sign up, yes/no?`)
        setSignupFlow('asking')
        setError(null)
        setResponseStyle('concise')
        return
      }
      
      // Text model credits with 60% markup on OpenAI API costs
      const textCredits: Record<string, number> = {
        'gpt-4o': 5,                // OpenAI: ~$0.003/msg + 60% markup
        'gpt-4o-mini': 1,           // OpenAI: ~$0.0002/msg + 60% markup
        'gpt-4-turbo': 18,          // OpenAI: ~$0.011/msg + 60% markup
        'gpt-4': 43,                // OpenAI: ~$0.027/msg + 60% markup
        'gpt-3.5-turbo': 1,         // OpenAI: ~$0.0006/msg + 60% markup
        'o1': 32,                   // OpenAI: ~$0.020/msg + 60% markup
        'o1-mini': 6,               // OpenAI: ~$0.004/msg + 60% markup
        'o1-preview': 32,           // OpenAI: ~$0.020/msg + 60% markup
        'openai': 1,                // Legacy: maps to gpt-3.5-turbo
        'gpt': 43,                  // Legacy: maps to gpt-4
        'blip': 0,                  // FREE (local vision model)
        'llava': 0,                 // FREE (local vision model)
        'llama': 0,                 // FREE (local model)
        'mistral': 0,               // FREE (local model)
        'custom': 0                 // FREE (local custom model)
      }
      const requiredCredits = textCredits[mode] || 1 // Default to 1 credit
      
      const creditResponse = await fetch('/api/credits/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requiredCredits,
          operation: 'check_and_deduct'
        })
      })
      
      const creditData = await creditResponse.json()
      
      if (!creditData.success) {
        setError(creditData.message || 'Insufficient credits. Please buy more credits to continue.')
        return
      }
      
      // Update user credits in local state
      setUserCredits(creditData.credits)
      
    } catch (error) {
      console.error('Error checking credits:', error)
      setError('Failed to verify credits. Please try again.')
      return
    }
    
    setLoading(true)
    setError(null)
    setOutput("")
    setAudioUrl(null)
    setAudioError(null)

    // If there's a document loaded, include it in the context
    let enhancedPrompt = prompt
    
    // Add response style instruction
    const styleInstruction = responseStyle === "concise" 
      ? "CRITICAL: Give ONLY a direct, concise answer in 1-2 sentences maximum. Do NOT provide examples, code, or detailed explanations. Keep it brief and to the point."
      : "IMPORTANT: Provide a detailed, comprehensive explanation with examples and context."
    
    // Add conversation context if available (skip for image mode to avoid errors)
    let conversationContext = ''
    if (!isVisionModel) {
      try {
        conversationContext = await retrieveConversationContext()
      } catch (error) {
        console.error('Failed to retrieve conversation context, continuing without it:', error)
      }
    }
    
    if (conversationContext) {
      enhancedPrompt = `${styleInstruction}

Conversation History:
${conversationContext}

Current Question: ${prompt}

Please continue the conversation naturally, remembering the context above.`
    }
    
    // Add document context if available
    if (processedDocumentData) {
      // DEBUG: Log document data
      console.log('🔍 [DEBUG] Document Context Debug:', {
        hasProcessedDocumentData: !!processedDocumentData,
        filename: processedDocumentData?.filename,
        hasExtractedText: !!processedDocumentData?.extractedText,
        extractedTextLength: processedDocumentData?.extractedText?.length || 0,
        extractedTextPreview: processedDocumentData?.extractedText?.substring(0, 100) || 'NO TEXT',
        fullProcessedDocumentData: processedDocumentData
      })
      
      // Check if extractedText exists and is valid
      if (!processedDocumentData.extractedText || processedDocumentData.extractedText.trim().length === 0) {
        console.error('❌ [ERROR] No extracted text found in processedDocumentData!', processedDocumentData)
        setError(`Document ${processedDocumentData.filename} was processed but no text was extracted. This might be a processing error.`)
        return
      }
      
      // Check if extractedText is an error message
      if (processedDocumentData.extractedText.startsWith('Error') || processedDocumentData.extractedText.includes('Error parsing')) {
        console.error('❌ [ERROR] Extracted text contains an error:', processedDocumentData.extractedText)
        setError(`Failed to extract text from ${processedDocumentData.filename}: ${processedDocumentData.extractedText}`)
        return
      }
      
      enhancedPrompt = `${styleInstruction}

Document Context: ${processedDocumentData.filename}
Extracted Text: ${processedDocumentData.extractedText}

${conversationContext ? `Conversation History:
${conversationContext}

` : ''}Current Question: ${prompt}

Please answer the user's question based on the document content above, and continue the conversation naturally.`
      
      console.log('✅ [DEBUG] Enhanced prompt with document context created, text length:', processedDocumentData.extractedText.length)
    }
    
    // For simple questions without context, add style instruction
    if (!conversationContext && !processedDocumentData) {
      enhancedPrompt = `${styleInstruction}

Question: ${prompt}

Please provide a ${responseStyle} answer.`
    }

    const payload = JSON.stringify({
      prompt: enhancedPrompt,
      mode,
      max_tokens: maxTokens,
      temperature,
      top_k: topK,
      response_style: responseStyle,
      image: isVisionModel && selectedImage ? imagePreview : undefined, // Send actual image data for vision models
    })

    console.log("sending mode:", mode)
    console.log("Enhanced prompt being sent:", enhancedPrompt)

    try {
      if (!stream) {
        // Non-streaming path
        const r = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        })
        const data = await r.json()
        if (!r.ok || data.error) throw new Error(data.error || "Request failed")
        const text = String(data.output ?? "")
        setOutput(text)
        
        // Save user question to memory core (skip for image mode to avoid errors)
        if (!isVisionModel) {
          // Store the prompt before clearing it
          const userPrompt = prompt
          
          await saveConversationTurn('user', userPrompt, '')
          
          // Save AI response to memory core and library - THIS SETS lastGenerationId
          // IMPORTANT: Pass the actual prompt, not empty string!
          // AWAIT this to ensure it completes before allowing "generate more"
          await saveConversationTurn('assistant', userPrompt, text)
          
          console.log('✅ Initial response saved. lastGenerationId:', lastGenerationId, 'Ref:', lastGenerationIdRef.current)
        }
        
        // Clear the input for the next question
        setPrompt('')
        
        // REMOVED: Don't use /api/save-generation anymore - it doesn't set user_id or return ID
        // We use saveConversationTurn which uses /api/generations/create instead
      } else {
        // Streaming path
        let finalText = ""
        for await (const chunk of streamFromAPI(enhancedPrompt, mode)) {
          finalText += chunk
          setOutput(prev => prev + chunk)
        }
        
        // Save user question to memory core (skip for image mode to avoid errors)
        if (!isVisionModel) {
          // Store the prompt before clearing it
          const userPrompt = prompt
          
          await saveConversationTurn('user', userPrompt, '')
          
          // Save AI response to memory core and library - THIS SETS lastGenerationId
          // IMPORTANT: Pass the actual prompt, not empty string!
          // AWAIT this to ensure it completes before allowing "generate more"
          await saveConversationTurn('assistant', userPrompt, finalText)
          
          console.log('✅ Initial response saved (streaming). lastGenerationId:', lastGenerationId, 'Ref:', lastGenerationIdRef.current)
        }
        
        // Clear the input for the next question
        setPrompt('')
        
        // REMOVED: Don't use /api/save-generation anymore - it doesn't set user_id or return ID
        // We use saveConversationTurn which uses /api/generations/create instead
      }
    } catch (e: any) {
      setError(e.message || "Unknown error")
    } finally {
      setLoading(false)
      
      // Always refresh credits after text generation completes (in case of errors or refunds)
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    }
  }

  // NEW: Save conversation turn to memory core and library
  const saveConversationTurn = async (role: 'user' | 'assistant', userInput: string, aiResponse: string) => {
    // For image mode, save with image context
    if (isVisionModel && selectedImage) {
      try {
        const visionMemory = {
          concept: `Vision Model Analysis: ${role === 'user' ? 'User Question' : 'AI Response'} - ${selectedImage.name}`,
          data: `${role === 'user' ? 'User Question' : 'AI Response'}: ${role === 'user' ? userInput : aiResponse}\n\nImage: ${selectedImage.name} (${(selectedImage.size / 1024 / 1024).toFixed(2)} MB)\nVision Model: ${mode.toUpperCase()}`,
          salience: 0.8,
          connections: ['vision_model', 'image_analysis', 'ai_chat', 'memory_core'],
          memory_type: 'semantic',
          priority: 7,
          memory_category: 'vision_analysis',
          parent_id: currentConversationId || null,
          hierarchy_level: currentConversationId ? 1 : 0
        }

        console.log('Saving image mode memory:', visionMemory)
        
        // Get the current session token for authentication
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          console.error('No active session for vision memory save')
          return
        }

        const response = await fetch('/api/memories', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(visionMemory)
        })
        
        if (response.ok) {
          const responseData = await response.json()
          console.log('Image mode memory saved:', responseData)
          
          // Add to local conversation history
          const memoryId = responseData.memory?.id || responseData.id || `vision-${Date.now()}`
          if (!currentConversationId) {
            setCurrentConversationId(memoryId)
          }
          
          setConversationHistory(prev => [...prev, {
            id: memoryId,
            role,
            content: role === 'user' ? userInput : aiResponse,
            timestamp: new Date(),
            documentContext: `Image Analysis: ${selectedImage.name}`,
            parentConversationId: currentConversationId || memoryId
          }])
        } else {
          console.error('Failed to save image mode memory:', response.status)
        }
      } catch (error) {
        console.error('Error saving image mode memory:', error)
      }
      return
    }

    // Save to Library (generations table) - save complete conversations
    try {
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.warn('⚠️ [LIBRARY SAVE] No session found')
        return
      }
      
      // Only save when we have both user input and AI response (complete conversation)
      if (role === 'assistant' && userInput.trim() && aiResponse.trim()) {
        const generationData = {
          prompt: userInput, // User's question
          output: aiResponse, // AI's response
          model: mode,
          temperature: temperature,
          top_k: topK,
          parent_id: currentConversationId || null
        }

        console.log('🔄 [LIBRARY SAVE] Saving to /api/generations/create...', {
          prompt: userInput.substring(0, 50),
          outputLength: aiResponse.length,
          model: mode,
          hasSession: !!session
        })

        const libraryResponse = await fetch('/api/generations/create', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(generationData)
        })
        
        console.log('📡 [LIBRARY SAVE] Response status:', libraryResponse.status, libraryResponse.ok)
        
        if (libraryResponse.ok) {
          const responseData = await libraryResponse.json()
          console.log('📦 [LIBRARY SAVE] Response data:', responseData)
          
          const generationId = responseData.generation_id
          console.log('🆔 [LIBRARY SAVE] Extracted generation_id:', generationId)
          
          if (generationId) {
            console.log('🔄 [LIBRARY SAVE] Setting lastGenerationId. Before - State:', lastGenerationId, 'Ref:', lastGenerationIdRef.current)
            setLastGenerationId(generationId)
            lastGenerationIdRef.current = generationId // Keep ref in sync
            console.log('✅ [LIBRARY SAVE] Set lastGenerationId. After - State:', generationId, 'Ref:', lastGenerationIdRef.current)
            console.log('✅ Saved complete conversation to library. ID:', generationId, 'Prompt:', userInput.substring(0, 50))
          } else {
            console.error('❌ [LIBRARY SAVE] Save succeeded but no generation_id returned. Full response:', responseData)
            console.warn('⚠️ Save succeeded but no generation_id returned. Response:', responseData)
          }
        } else {
          const errorText = await libraryResponse.text()
          console.error('❌ [LIBRARY SAVE] Failed to save to library:', libraryResponse.status, errorText)
          console.error('❌ Failed to save to library:', libraryResponse.status, errorText)
        }
      } else {
        console.log('⏭️ [LIBRARY SAVE] Skipping save. Role:', role, 'hasUserInput:', !!userInput.trim(), 'hasAiResponse:', !!aiResponse.trim())
      }
    } catch (error) {
      console.error('❌ [LIBRARY SAVE] Error saving to library:', error)
      console.error('Error saving to library:', error)
    }
    
    // Skip memory saving for image mode without images to avoid database errors
    if (isVisionModel && !selectedImage) {
      console.log('Skipping memory save for image mode without image')
      return
    }
    
    let messageAdded = false
    
    try {
      // Clean and validate the data before sending
      const cleanData = role === 'user' ? userInput : aiResponse
      if (!cleanData || cleanData.trim() === '') {
        console.error('Empty content for conversation turn, skipping save')
        return
      }

      const conversationMemory = {
        concept: `Conversation Turn: ${role === 'user' ? 'User Question' : 'AI Response'}`,
        data: cleanData,
        salience: 0.7,
        connections: ['conversation', 'ai_chat', 'memory_core'],
        memory_type: 'semantic',
        priority: 6,
        memory_category: 'conversation',
        parent_id: null, // Always start without parent to avoid foreign key issues
        hierarchy_level: 0
        // Removed document fields for now to avoid foreign key issues
      }

      console.log('Sending conversation memory:', conversationMemory)
      
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No active session for conversation memory save')
        return
      }
      
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(conversationMemory)
      })
      
      console.log('Memory save response status:', response.status)

      if (response.ok) {
        const responseData = await response.json()
        console.log('Memory save response:', responseData)
        
        // Handle different possible response formats
        let savedMemory = null
        if (responseData.memory) {
          savedMemory = responseData.memory
        } else if (responseData.id) {
          savedMemory = responseData
        } else if (responseData.data && responseData.data.id) {
          savedMemory = responseData.data
        }
        
        if (savedMemory && savedMemory.id) {
          // If this is the first conversation turn, set it as the root
          if (!currentConversationId) {
            setCurrentConversationId(savedMemory.id)
          }

          // Add to local conversation history
          setConversationHistory(prev => [...prev, {
            id: savedMemory.id,
            role,
            content: role === 'user' ? userInput : aiResponse,
            timestamp: new Date(),
            documentContext: processedDocumentData?.filename,
            parentConversationId: currentConversationId || savedMemory.id
          }])

          messageAdded = true
          console.log(`Conversation turn saved to memory core: ${savedMemory.id}`)
        } else {
          console.error('Memory save response missing ID. Full response:', responseData)
          console.error('Response keys:', Object.keys(responseData))
        }
      } else {
        console.error('Failed to save memory:', response.status, response.statusText)
        // Try to get the error details
        try {
          const errorText = await response.text()
          console.error('Memory save error details:', errorText)
        } catch (e) {
          console.error('Could not read error response body')
        }
      }

      // Fallback: Only add to local conversation history if save failed and message wasn't added
      if (!messageAdded) {
        const fallbackId = `local-${Date.now()}`
        setConversationHistory(prev => [...prev, {
          id: fallbackId,
          role,
          content: role === 'user' ? userInput : aiResponse,
          timestamp: new Date(),
          documentContext: processedDocumentData?.filename,
          parentConversationId: null // Don't set fake parent
        }])
      }
    } catch (error) {
      console.error('Error saving conversation turn:', error)
      // Only add fallback if we caught an error and message wasn't added
      if (!messageAdded) {
    const fallbackId = `local-${Date.now()}`
    setConversationHistory(prev => [...prev, {
      id: fallbackId,
      role,
      content: role === 'user' ? userInput : aiResponse,
      timestamp: new Date(),
      documentContext: processedDocumentData?.filename,
      parentConversationId: null // Don't set fake parent
    }])
      }
    }
  }

  // NEW: Retrieve conversation context from memory core
  const retrieveConversationContext = async (): Promise<string> => {
    // For image mode, return local conversation history instead of database
    if (isVisionModel) {
      if (conversationHistory.length > 0) {
        return conversationHistory.map(msg => 
          `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`
        ).join('\n\n')
      }
      return ''
    }
    
    if (!currentConversationId) return ''

    try {
      // Get the current session token for authentication
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('No active session for conversation context retrieval')
        return ''
      }

      // First get the root conversation memory
      const rootResponse = await fetch(`/api/memories/${currentConversationId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!rootResponse.ok) {
        console.error('Failed to get root conversation:', rootResponse.status)
        // If the root memory doesn't exist, clear the currentConversationId
        setCurrentConversationId(null)
        return ''
      }
      
      const rootResponseData = await rootResponse.json()
      
      // Handle different response formats: {memory: {...}} or directly {...}
      const rootMemory = rootResponseData.memory || rootResponseData
      
      // Check if rootMemory is valid
      if (!rootMemory || !rootMemory.concept || !rootMemory.data) {
        console.error('Invalid root memory:', rootMemory)
        setCurrentConversationId(null)
        return ''
      }
      
      let conversationText = `${rootMemory.concept.includes('User Question') ? 'User' : 'AI'}: ${rootMemory.data}\n\n`
      
      // Then get all sub-memories (responses and follow-ups)
      const response = await fetch(`/api/memories?parent_id=${currentConversationId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (response.ok) {
        const conversationMemoriesData = await response.json()
        console.log('Retrieved conversation memories:', conversationMemoriesData)
        
        // Handle response format: {memories: [...]} or [...]
        const conversationMemories = conversationMemoriesData.memories || conversationMemoriesData
        
        if (conversationMemories && conversationMemories.length > 0) {
          conversationText += conversationMemories
            .filter((memory: any) => memory && memory.concept && memory.data) // Filter out invalid memories
            .map((memory: any) => 
              `${memory.concept.includes('User Question') ? 'User' : 'AI'}: ${memory.data}`
            ).join('\n\n')
        }
      } else {
        console.error('Failed to retrieve conversation context:', response.status, response.statusText)
        // Try to get response text for more details
        try {
          const errorText = await response.text()
          console.error('Error response body:', errorText)
        } catch (e) {
          console.error('Could not read error response body')
        }
      }
      
      return conversationText
    } catch (error) {
      console.error('Error retrieving conversation context:', error)
    }
    
    return ''
  }

  return (
    <div className="relative min-h-screen w-full">
      <div className="aztec-background" />
      <div className="animated-grid" />

      <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-6 lg:p-8">
        <header className="flex flex-row justify-between items-start gap-2 sm:gap-4">
          {/* Mobile: Stack navigation vertically */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {user && (
              <>
                <Link
                  href="/library"
                  className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
                >
                  <Library className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline text-sm">Library</span>
                </Link>
                <Link
                  href="/memory-core"
                  className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
                >
                  <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline text-sm">Memory</span>
                </Link>
              </>
            )}
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Profile</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <span className="text-sm">login/signup</span>
              </Link>
            )}
          </div>
          
          {/* Mobile: Keep controls on the right */}
          <div className="flex flex-col items-end gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setShowPanels(!showPanels)}
                  className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
                >
                  {showPanels ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  <span className="hidden sm:inline text-sm">{showPanels ? 'Hide Panels' : 'Show Panels'}</span>
                </button>
              )}
              
              {user && (
                <Link
                  href="/credits"
                  className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
                >
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline text-sm">Purchase Credits</span>
                </Link>
              )}
              
            </div>
            
            {user && (
              <div className="text-right">
                  <Link 
                    href="/credits" 
                  className="inline-flex flex-col items-end gap-1"
                  >
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg bg-black/20 hover:bg-black/30 border border-cyan-400/20 hover:border-cyan-400/40 transition-all cursor-pointer group">
                      <span className="text-cyan-400 text-xs sm:text-sm group-hover:text-cyan-300 transition-colors">
                        CREDITS:
                      </span>
                      <span className="text-amber-400 font-bold text-sm sm:text-base group-hover:text-amber-300 transition-colors">
                        {userCredits}
                      </span>
                    </div>
                    {refundedCredits !== null && (
                      <div className="text-green-400 text-xs animate-fade-in bg-green-900/20 border border-green-500/30 rounded px-2 py-1">
                        ✅ Refunded {refundedCredits} credits
                      </div>
                    )}
                  </Link>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
          {/* Left Panel */}
          {showPanels && isAdmin && (
            <div className="hidden lg:block lg:col-span-3 space-y-6">
            <HudPanel title="System Core">
              <p className="flex items-center gap-2">
                <AztecIcon name="sun-stone" className="text-amber-400 animate-icon-pulse" /> Cognitive Matrix:{" "}
                <span className="text-green-400">STABLE</span>
              </p>
              <p className="flex items-center gap-2">
                <AztecIcon
                  name="sun-stone"
                  className="text-amber-400 animate-icon-pulse"
                />{" "}
                Heuristic Engine: <span className="text-green-400">ACTIVE</span>
              </p>
              <p>
                Data Throughput: <span className="text-white">1.2 ZB/s</span>
              </p>

            </HudPanel>
            <HudPanel title="Active Threads">
              <p className="flex items-center gap-2">
                <AztecIcon
                  name="serpent"
                  className="text-cyan-400 animate-icon-pulse"
                />{" "}
                Predictive Analysis
              </p>
              <p className="flex items-center gap-2">
                <AztecIcon
                  name="serpent"
                  className="text-cyan-400 animate-icon-pulse"
                />{" "}
                Code Synthesis
              </p>
              <p className="flex items-center gap-2">
                <AztecIcon
                  name="serpent"
                  className="text-cyan-400 animate-icon-pulse"
                />{" "}
                Global Monitoring
              </p>
            </HudPanel>
          </div>
          )}

          {/* Center Panel - Main Interaction */}
          <div className={`flex flex-col justify-center items-center h-full -mt-12 ${showPanels && isAdmin ? 'col-span-1 lg:col-span-6' : 'col-span-1 lg:col-span-12'}`}>
            {/* Hide logo/title when AI response is shown */}
            {!output && (
              <div className="w-full max-w-3xl text-center mb-6 flex flex-col justify-center">
                {response ? (
                  <h2 className="text-6xl md:text-7xl font-bold tracking-widest infinito-gradient">
                    {response}
                  </h2>
                ) : (
                  <>
                    <svg className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-2 infinity-symbol" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M151.483 66.667C180.05 66.667 193.75 89.133 193.75 100c0 10.867-13.7 33.333-42.267 33.333-21.158 0-37.583-12.3-49.4-29.517l-1.983-2.875 1.983-2.883c11.817-17.133 28.242-29.391 49.4-29.391zm0 12.5c-15.25 0-28.6 8.208-39.108 20.833 10.508 12.625 23.858 20.833 39.108 20.833 21.158 0 29.767-14.133 29.767-20.833 0-6.7-8.609-20.833-29.767-20.833zm-102.966 0c-21.158 0-29.767 14.133-29.767 20.833 0 6.7 8.609 20.833 29.767 20.833 15.25 0 28.6-8.208 39.108-20.833-10.508-12.625-23.858-20.833-39.108-20.833zm0-12.5c21.158 0 37.583 12.258 49.4 29.516l1.983 2.875-1.983 2.884c-11.817 17.216-28.242 29.391-49.4 29.391C19.95 133.333 6.25 110.867 6.25 100c0-10.867 13.7-33.333 42.267-33.333z" 
                            fill="url(#infinito-main-gradient)" 
                            stroke="url(#infinito-stroke-gradient)" 
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"/>
                      <defs>
                        <linearGradient id="infinito-main-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" style={{stopColor: '#06b6d4', stopOpacity: 1}} />
                          <stop offset="25%" style={{stopColor: '#3b82f6', stopOpacity: 1}} />
                          <stop offset="50%" style={{stopColor: '#8b5cf6', stopOpacity: 1}} />
                          <stop offset="75%" style={{stopColor: '#3b82f6', stopOpacity: 1}} />
                          <stop offset="100%" style={{stopColor: '#06b6d4', stopOpacity: 1}} />
                        </linearGradient>
                        <linearGradient id="infinito-stroke-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" style={{stopColor: '#06b6d4', stopOpacity: 0.8}} />
                          <stop offset="50%" style={{stopColor: '#a78bfa', stopOpacity: 0.8}} />
                          <stop offset="100%" style={{stopColor: '#06b6d4', stopOpacity: 0.8}} />
                        </linearGradient>
                      </defs>
                    </svg>
                    <h2 className="text-5xl md:text-6xl font-bold mb-1 tracking-widest infinito-gradient">
                      INFINITO
                    </h2>
                    <p className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 tracking-[0.3em] uppercase text-sm">The AI of Infinite Possibilities</p>
                  </>
                )}
              </div>
            )}

            {/* Ollama Status Banner */}
            {needsOllama && ollamaOk === false && (
              <div className="w-full max-w-3xl bg-amber-900/40 border border-amber-500/40 text-amber-300 text-sm px-3 py-2 rounded-md mb-3">
                Local models unavailable: Ollama isn't reachable. Start Ollama or switch modes.
              </div>
            )}
            

            



            {/* Model Selector - Admin Only */}
            {isAdmin && (
              <div className="w-full max-w-3xl mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                {/* Main Model - Mobile: Full width, Desktop: Left side */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <span className="text-cyan-400 text-xs sm:text-sm font-semibold tracking-wide uppercase">MODEL:</span>
                  <Select value={selectedTextModel} onValueChange={(value) => handleModelChange(value, 'text')}>
                    <SelectTrigger className="w-full sm:w-32 h-10 sm:h-8 bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400 focus:border-cyan-400 focus:ring-cyan-400/50 text-sm font-mono uppercase tracking-wider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[400px] overflow-y-auto">
                      {/* OpenAI GPT Models */}
                      {isModelEnabled('gpt-4o') && <SelectItem value="gpt-4o" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">GPT-4O {isAdmin && '- $0.00625/msg'}</SelectItem>}
                      {isModelEnabled('gpt-4o-mini') && <SelectItem value="gpt-4o-mini" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">GPT-4O MINI {isAdmin && '- $0.000375/msg'}</SelectItem>}
                      {isModelEnabled('gpt-4-turbo') && <SelectItem value="gpt-4-turbo" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">GPT-4 TURBO {isAdmin && '- $0.01125/msg'}</SelectItem>}
                      {isModelEnabled('gpt-4') && <SelectItem value="gpt-4" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">GPT-4 {isAdmin && '- $0.0675/msg'}</SelectItem>}
                      {isModelEnabled('gpt-3.5-turbo') && <SelectItem value="gpt-3.5-turbo" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">GPT-3.5 TURBO {isAdmin && '- $0.000375/msg'}</SelectItem>}
                      {/* OpenAI Reasoning Models */}
                      {isModelEnabled('o1') && <SelectItem value="o1" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">O1 (REASONING) {isAdmin && '- $0.0375/msg'}</SelectItem>}
                      {isModelEnabled('o1-mini') && <SelectItem value="o1-mini" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">O1-MINI {isAdmin && '- $0.00275/msg'}</SelectItem>}
                      {isModelEnabled('o1-preview') && <SelectItem value="o1-preview" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">O1-PREVIEW {isAdmin && '- $0.0375/msg'}</SelectItem>}
                      {/* Legacy shortcuts (for backward compatibility) */}
                      {isModelEnabled('openai') && <SelectItem value="openai" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">AiO (GPT-3.5) {isAdmin && '- $0.000375/msg'}</SelectItem>}
                      {isModelEnabled('gpt') && <SelectItem value="gpt" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">GPT (GPT-4) {isAdmin && '- $0.0675/msg'}</SelectItem>}
                      {/* Local Models */}
                      {isModelEnabled('llama') && <SelectItem value="llama" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">Zephyr {isAdmin && '- FREE'}</SelectItem>}
                      {isModelEnabled('mistral') && <SelectItem value="mistral" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">Maestro {isAdmin && '- FREE'}</SelectItem>}
                      {isModelEnabled('custom') && <SelectItem value="custom" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">Custom {isAdmin && '- FREE'}</SelectItem>}
                      {/* Enhanced Modes */}
                      {isModelEnabled('rag') && <SelectItem value="rag" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">RAG {isAdmin && '- varies'}</SelectItem>}
                      {isModelEnabled('web') && <SelectItem value="web" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">WEB {isAdmin && '- varies'}</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Image Model - Mobile: Full width, Desktop: Right side */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <span className="text-purple-400 text-xs sm:text-sm font-semibold tracking-wide uppercase">IMAGE MODEL:</span>
                  <Select value={selectedImageModel || ""} onValueChange={(value) => handleModelChange(value, 'image')}>
                    <SelectTrigger className="w-full sm:w-56 h-10 sm:h-8 bg-transparent border-purple-500/50 text-purple-300 hover:border-purple-400 focus:border-purple-400 focus:ring-purple-400/50 text-sm font-mono uppercase tracking-wider">
                      <SelectValue placeholder="Select Image Model" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-purple-500/50 backdrop-blur-md">
                      {isModelEnabled('blip') && <SelectItem value="blip" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">"One" (BLIP) {isAdmin && '- FREE'}</SelectItem>}
                      {isModelEnabled('llava') && <SelectItem value="llava" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">"Dos" (LLAVA) {isAdmin && '- FREE'}</SelectItem>}
                      {isModelEnabled('dalle_image') && <SelectItem value="dalle_image" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">DALL-E 3 {isAdmin && '- $0.04/img'}</SelectItem>}
                      {isModelEnabled('gpt-image-1') && <SelectItem value="gpt-image-1" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">GPT IMAGE 1 {isAdmin && '- $0.04/img'}</SelectItem>}
                      {isModelEnabled('gen4_image') && <SelectItem value="gen4_image" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">RUNWAY GEN4 IMAGE {isAdmin && '- 5cr/img'}</SelectItem>}
                      {isModelEnabled('gen4_image_turbo') && <SelectItem value="gen4_image_turbo" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">RUNWAY GEN4 IMAGE TURBO {isAdmin && '- 2cr/img'}</SelectItem>}
                      {isModelEnabled('gemini_2.5_flash') && <SelectItem value="gemini_2.5_flash" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">GEMINI 2.5 FLASH {isAdmin && '- 5cr/img'}</SelectItem>}
                      {isModelEnabled('runway_image') && <SelectItem value="runway_image" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">RUNWAY GEN-4 (LEGACY) {isAdmin && '- 5cr/img'}</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Video Model - Mobile: Full width, Desktop: Right side */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <span className="text-pink-400 text-xs sm:text-sm font-semibold tracking-wide uppercase">VIDEO MODEL:</span>
                  <Select value={selectedVideoModel || ""} onValueChange={(value) => handleModelChange(value, 'video')}>
                    <SelectTrigger className="w-full sm:w-48 h-10 sm:h-8 bg-transparent border-pink-500/50 text-pink-300 hover:border-pink-400 focus:border-pink-400 focus:ring-pink-400/50 text-sm font-mono uppercase tracking-wider">
                      <SelectValue placeholder="Select Video Model" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-pink-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                      {/* Image to Video Only Models */}
                      {isModelEnabled('gen4_turbo') && <SelectItem value="gen4_turbo" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">GEN-4 TURBO (I2V) {isAdmin && '- 2.5cr/s'}</SelectItem>}
                      {isModelEnabled('gen3a_turbo') && <SelectItem value="gen3a_turbo" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">GEN-3A TURBO (I2V) {isAdmin && '- 5cr/s'}</SelectItem>}
                      {/* Text-to-Video + Image-to-Video Models */}
                      {isModelEnabled('veo3.1') && <SelectItem value="veo3.1" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">VEO 3.1 (T2V/I2V) {isAdmin && '- 20cr/s'}</SelectItem>}
                      {isModelEnabled('veo3.1_fast') && <SelectItem value="veo3.1_fast" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">VEO 3.1 FAST (T2V/I2V) {isAdmin && '- 10cr/s'}</SelectItem>}
                      {isModelEnabled('veo3') && <SelectItem value="veo3" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">VEO 3 (T2V/I2V) {isAdmin && '- 32cr/s'}</SelectItem>}
                      {/* Video to Video Model */}
                      {isModelEnabled('gen4_aleph') && <SelectItem value="gen4_aleph" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">GEN-4 ALEPH (V2V) {isAdmin && '- 7.5cr/s'}</SelectItem>}
                      {/* Act Two and Kling AI */}
                      {isModelEnabled('act_two') && <SelectItem value="act_two" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">ACT TWO (Character) {isAdmin && '- 2.5cr/s'}</SelectItem>}
                      {/* Kling AI Models */}
                      {isModelEnabled('kling_t2v') && <SelectItem value="kling_t2v" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">🎬 KLING T2V {isAdmin && '- TBD'}</SelectItem>}
                      {isModelEnabled('kling_i2v') && <SelectItem value="kling_i2v" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">🖼️ KLING I2V {isAdmin && '- TBD'}</SelectItem>}
                      {isModelEnabled('kling_lipsync') && <SelectItem value="kling_lipsync" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">👄 KLING LIP-SYNC {isAdmin && '- TBD'}</SelectItem>}
                      {isModelEnabled('kling_avatar') && <SelectItem value="kling_avatar" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">👤 KLING AVATAR {isAdmin && '- TBD'}</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Admin-Only Cost Info Panel */}
            {isAdmin && (selectedImageModel || selectedVideoModel) && (
              <div className="w-full max-w-3xl mb-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
                <p className="text-yellow-300 text-xs font-mono">
                  <span className="font-bold">💰 ADMIN COST INFO:</span>
                  {selectedImageModel && (
                    <span className="ml-2">
                      Image: {selectedImageModel === 'dalle_image' ? '40 INFINITO (OpenAI: ~$0.04 + 60%)' :
                             selectedImageModel === 'gpt-image-1' ? '40 INFINITO (OpenAI: ~$0.04 + 60%)' :
                             selectedImageModel === 'gen4_image' ? '8 INFINITO (RunwayML: 5 credits + 60%)' :
                             selectedImageModel === 'gen4_image_turbo' ? '3 INFINITO (RunwayML: 2 credits + 60%)' :
                             selectedImageModel === 'gemini_2.5_flash' ? '8 INFINITO (RunwayML: 5 credits + 60%)' :
                             selectedImageModel === 'blip' || selectedImageModel === 'llava' ? 'FREE (Local)' :
                             '8 INFINITO (RunwayML: ~5 credits + 60%)'}
                    </span>
                  )}
                  {selectedVideoModel && (
                    <span className="ml-2">
                      Video: {
                        selectedVideoModel === 'gen4_turbo' ? '40' :
                        selectedVideoModel === 'gen3a_turbo' ? '80' :
                        selectedVideoModel === 'veo3.1' ? '320' :
                        selectedVideoModel === 'veo3.1_fast' ? '160' :
                        selectedVideoModel === 'veo3' ? '512' :
                        selectedVideoModel === 'gen4_aleph' ? '120' :
                        selectedVideoModel === 'act_two' ? '40' :
                        (selectedVideoModel === 'kling_t2v' || selectedVideoModel === 'kling_i2v' || selectedVideoModel === 'kling_lipsync' || selectedVideoModel === 'kling_avatar') ? '50' :
                        '40'
                      } INFINITO {(selectedVideoModel === 'kling_t2v' || selectedVideoModel === 'kling_i2v' || selectedVideoModel === 'kling_lipsync' || selectedVideoModel === 'kling_avatar') ? '(Kling AI: TBD)' : `(RunwayML: ${
                        selectedVideoModel === 'gen4_turbo' ? '25' :
                        selectedVideoModel === 'gen3a_turbo' ? '50' :
                        selectedVideoModel === 'veo3.1' ? '200' :
                        selectedVideoModel === 'veo3.1_fast' ? '100' :
                        selectedVideoModel === 'veo3' ? '320' :
                        selectedVideoModel === 'gen4_aleph' ? '75' :
                        selectedVideoModel === 'act_two' ? '25' :
                        '25'
                      } credits + 60%)`}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* NEW: Drag and Drop Zone */}
            <div 
              ref={consoleRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full max-w-3xl transition-all duration-300 ${
                isDragOver 
                  ? 'scale-105 border-2 border-dashed border-cyan-400 bg-cyan-900/20' 
                  : ''
              }`}
            >
              {/* Drag Overlay */}
              {isDragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-cyan-900/50 backdrop-blur-sm rounded-lg z-20">
                  <div className="text-center text-cyan-400">
                    <Upload className="h-16 w-16 mx-auto mb-4 animate-bounce" />
                    <p className="text-xl font-bold">Drop File Here</p>
                    <p className="text-sm">Images or Documents (PDF, Word, Text)</p>
                  </div>
                </div>
              )}

              <div className={`aztec-panel backdrop-blur-md shadow-2xl p-2 relative transition-all duration-300 border-infinito ${
                isVisionModel 
                  ? 'shadow-purple-500/20' 
                  : 'shadow-infinito'
              } ${glowEnabled ? 'glow' : ''}`}>

                
                {isProcessingDocument && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg z-10">
                    <div className="text-center text-cyan-400">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                      <p className="text-lg font-bold">Processing Document...</p>
                      <p className="text-sm">Extracting memories with AI</p>
                    </div>
                  </div>
                )}
                
                
                
                                        {/* Document Preview - appears inside console when document is ready (hidden when thread is open) */}
            {processedDocumentData && !showDocumentReview && !showThreadView && (
              <div className={`mb-2 p-2 bg-gradient-to-r from-cyan-900/20 via-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded ${glowEnabled ? 'glow' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="text-cyan-400">
                      {processedDocumentData.fileType.includes('pdf') ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                          <path d="M14 2v6h6"/>
                          <path d="M9 13h6"/>
                          <path d="M9 17h6"/>
                          <path d="M9 9h1"/>
                        </svg>
                      ) : processedDocumentData.fileType.includes('word') || processedDocumentData.fileType.includes('document') ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                          <path d="M14 2v6h6"/>
                          <path d="M16 13H8"/>
                          <path d="M16 17H8"/>
                          <path d="M10 9H8"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                          <path d="M14 2v6h6"/>
                          <path d="M16 13H8"/>
                          <path d="M16 17H8"/>
                          <path d="M10 9H8"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-cyan-300">
                        {processedDocumentData.filename}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => setShowFullTextDialog(true)}
                      className="text-xs px-1.5 py-0.5 bg-purple-600/60 hover:bg-purple-500/80 text-white"
                      title="Preview full text"
                    >
                      Preview
                    </Button>
                    <Button
                      onClick={() => setShowDocumentReview(true)}
                      className="text-xs px-1.5 py-0.5 bg-cyan-600/60 hover:bg-cyan-500/80 text-white"
                      title="View full details"
                    >
                      Details
                    </Button>
                    <Button
                      onClick={() => {
                        setProcessedDocumentData(null)
                        setShowDocumentReview(false)
                      }}
                      className="text-xs px-1.5 py-0.5 bg-gray-600/60 hover:bg-gray-500/80 text-white"
                      title="Dismiss document"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
                
                {/* Extracted Text Preview */}
                <div 
                  className={`mt-2 p-1.5 bg-black/30 rounded border border-cyan-500/20 ${glowEnabled ? 'glow' : ''} cursor-pointer hover:bg-black/40 transition-colors`}
                  onClick={() => setShowFullTextDialog(true)}
                  title="Click to view full text"
                >
                  <div className="text-xs text-cyan-500">Text Preview:</div>
                </div>


              </div>
            )}
                
                {/* Universal Image Preview - shows for any loaded image */}
                {(selectedImage || videoImage) && !isVisionModel && (
                  <div className="mb-3 p-3 bg-gradient-to-r from-cyan-900/20 via-purple-900/20 to-pink-900/20 border border-cyan-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-cyan-400 text-sm font-medium">🖼️ Loaded Image</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setSelectedImage(null)
                          setImagePreview(null)
                          setVideoImage(null)
                          setVideoImagePreview(null)
                        }}
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 text-xs px-2 py-1"
                      >
                        ✕ Clear
                      </Button>
                    </div>
                    <div className="flex items-start gap-3">
                      {(imagePreview || videoImagePreview) && (
                        <img 
                          src={imagePreview || videoImagePreview || ''} 
                          alt="Loaded image" 
                          className="w-32 h-32 object-cover rounded border border-cyan-500/50 shadow-lg"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-cyan-300 text-sm font-medium">{selectedImage?.name || videoImage?.name}</p>
                        <p className="text-cyan-400 text-xs mb-2">{((selectedImage?.size || videoImage?.size || 0) / 1024 / 1024).toFixed(2)} MB</p>
                        <p className="text-green-400 text-xs">✅ Ready! You can ask questions about it or generate a video from it.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Mode Image Upload - integrated into prompt area */}
                {isVisionModel && (
                  <div 
                    className={`mb-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg transition-all duration-300 relative ${
                      isDragOver ? 'scale-105 border-2 border-dashed border-purple-400 bg-purple-900/40' : ''
                    }`}
                    onDragOver={handleImageDragOver}
                    onDragLeave={handleImageDragLeave}
                    onDrop={handleImageDrop}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-400 text-sm font-medium">📷 Image Mode: {getModeDisplayName(mode)}</span>
                      {selectedImage && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearSelectedImage}
                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 text-xs px-2 py-1"
                        >
                          ✕ Clear
                        </Button>
                      )}
                    </div>
                    
                    {!selectedImage ? (
                      <div className="text-center">
                        {/* Drag Overlay */}
                        {isDragOver && (
                          <div className="absolute inset-0 flex items-center justify-center bg-purple-900/50 backdrop-blur-sm rounded-lg z-20">
                            <div className="text-center text-purple-400">
                              <div className="text-4xl mb-2">📷</div>
                              <p className="text-lg font-bold">Drop Image Here</p>
                              <p className="text-sm">JPG, PNG, GIF, or other image formats</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <Button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm"
                          >
                            📷 Upload Image
                          </Button>
                          <span className="text-purple-300 text-xs">or drag & drop an image here</span>
                        </div>
                        <p className="text-purple-300 text-xs mt-2">Select an image to analyze with {getModeDisplayName(mode)}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {imagePreview && (
                            <img 
                              src={imagePreview} 
                              alt="Selected image" 
                              className="w-12 h-12 object-cover rounded border border-purple-500/50"
                            />
                          )}
                          <div className="flex-1">
                            <p className="text-purple-300 text-sm font-medium">{selectedImage.name}</p>
                            <p className="text-purple-400 text-xs">{(selectedImage.size / 1024 / 1024).toFixed(2)} MB • Ready for analysis</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={saveImageAsMemory}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs"
                            title="Save image to memory core"
                          >
                            💾 Save to Memory
                          </Button>
                          <p className="text-green-400 text-sm">✅ Image ready for analysis! Ask questions about it below.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Video Mode - integrated into prompt area */}
                {isVideoModel && (
                  <div data-video-section className="mb-3 p-3 bg-pink-900/20 border border-pink-500/30 rounded-lg transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-pink-400 text-sm font-medium">🎬 Video Generation</span>
                      {videoImage && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={clearVideoImage}
                          className="text-pink-400 hover:text-pink-300 hover:bg-pink-500/20 text-xs px-2 py-1"
                        >
                          ✕ Clear Image
                        </Button>
                      )}
                    </div>
                    {videoImage && originalImageUrlForVideo && (
                      <div className="mb-3 p-2 bg-green-900/20 border border-green-500/30 rounded text-green-300 text-xs">
                        ✅ Image loaded! Change aspect ratio, duration, or prompt and click "GENERATE VIDEO" to create more variations from this image.
                      </div>
                    )}
                    
                    {/* Video Settings */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-pink-400 text-xs block mb-1">Duration (seconds)</label>
                        <select
                          value={videoDuration}
                          onChange={(e) => setVideoDuration(parseInt(e.target.value) as 5 | 10)}
                          className="w-full bg-black/30 border border-pink-500/30 rounded px-2 py-1 text-pink-300 text-sm"
                        >
                          <option value="5">5 seconds</option>
                          <option value="10">10 seconds</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-pink-400 text-xs block mb-1">Aspect Ratio</label>
                        <select
                          value={videoRatio}
                          onChange={(e) => setVideoRatio(e.target.value)}
                          className="w-full bg-black/30 border border-pink-500/30 rounded px-2 py-1 text-pink-300 text-sm"
                        >
                          {/* GEN-3A, GEN-4 TURBO, and GEN-4 ALEPH options */}
                          {(mode === 'gen3a_turbo' || mode === 'gen4_turbo' || mode === 'gen4_aleph') && (
                            <>
                              <option value="720:1280">Portrait (720:1280)</option>
                              <option value="1280:720">Landscape (1280:720)</option>
                              <option value="1104:832">Horizontal (1104:832)</option>
                              <option value="832:1104">Vertical (832:1104)</option>
                              <option value="960:960">Square (960:960)</option>
                              <option value="1584:672">Ultra-wide (1584:672)</option>
                            </>
                          )}
                          
                          {/* VEO models options (text-to-video and image-to-video) */}
                          {(mode === 'veo3' || mode === 'veo3.1' || mode === 'veo3.1_fast') && (
                            <>
                              <option value="720:1280">Portrait (720:1280)</option>
                              <option value="1280:720">Landscape (1280:720)</option>
                              <option value="1080:1920">Vertical HD (1080:1920)</option>
                              <option value="1920:1080">Horizontal HD (1920:1080)</option>
                            </>
                          )}
                          
                          {/* Kling AI models options */}
                          {(mode === 'kling_t2v' || mode === 'kling_i2v' || mode === 'kling_lipsync' || mode === 'kling_avatar') && (
                            <>
                              <option value="1280:720">16:9 Landscape</option>
                              <option value="720:1280">9:16 Portrait</option>
                              <option value="960:960">1:1 Square</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Image Upload for Image-to-Video models */}
                    {(mode === 'gen4_turbo' || mode === 'gen3a_turbo' || (mode === 'gen4_aleph' && !videoImage)) && (
                      <div 
                        className={`mb-3 p-3 bg-pink-900/20 border border-pink-500/30 rounded-lg transition-all duration-300 relative ${
                          isDragOver ? 'scale-105 border-2 border-dashed border-pink-400 bg-pink-900/40' : ''
                        }`}
                        onDragOver={handleVideoImageDragOver}
                        onDragLeave={handleVideoImageDragLeave}
                        onDrop={handleVideoImageDrop}
                      >
                        {!videoImage ? (
                          <div className="text-center">
                            <input
                              ref={videoFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleVideoImageUpload}
                              className="hidden"
                            />
                            
                            {/* Drag Overlay */}
                            {isDragOver && (
                              <div className="absolute inset-0 flex items-center justify-center bg-pink-900/50 backdrop-blur-sm rounded-lg z-20">
                                <div className="text-center text-pink-400">
                                  <Upload className="h-12 w-12 mx-auto mb-2 animate-bounce" />
                                  <p className="text-lg font-bold">Drop Image Here</p>
                                  <p className="text-sm">For video generation</p>
                                </div>
                              </div>
                            )}
                            
                            <Button 
                              onClick={() => videoFileInputRef.current?.click()}
                              className="bg-pink-600 hover:bg-pink-700 text-white px-3 py-1.5 rounded text-sm"
                            >
                              🖼️ Upload Starting Image
                            </Button>
                            <p className="text-pink-300 text-xs mt-2">
                              {mode === 'gen4_aleph' 
                                ? 'Optional: Upload an image as the starting frame for your video' 
                                : 'Required: Upload an image as the starting frame for your video'}
                            </p>
                            <p className="text-pink-400 text-xs mt-1">
                              Or drag and drop an image file here
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 bg-black/30 p-2 rounded border border-pink-500/30">
                            {videoImagePreview && (
                              <img 
                                src={videoImagePreview} 
                                alt="Video starting frame" 
                                className="w-16 h-16 object-cover rounded border border-pink-500/50"
                              />
                            )}
                            <div className="flex-1">
                              <p className="text-pink-300 text-sm font-medium">{videoImage.name}</p>
                              <p className="text-pink-400 text-xs">{(videoImage.size / 1024 / 1024).toFixed(2)} MB • Ready</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Image Generation Progress */}
                    {isGeneratingImage && (
                      <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 p-5 rounded-md border-2 border-cyan-400/60 mb-3">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                        <div className="relative flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/40 border-t-white"></div>
                          <span className="text-white/80 text-lg sm:text-xl font-bold tracking-[0.2em] uppercase">{imageGenerationProgress || 'GENERATING IMAGE...'}</span>
                        </div>
                      </div>
                    )}

                    {/* Video Generation Progress */}
                    {isGeneratingVideo && (
                      <div className="space-y-3 mb-3">
                        <div className="relative overflow-hidden bg-gradient-to-r from-pink-600 via-purple-600 to-pink-700 p-5 rounded-md border-2 border-pink-400/60">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                          <div className="relative flex items-center justify-center gap-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/40 border-t-white"></div>
                            <span className="text-white/80 text-lg sm:text-xl font-bold tracking-[0.2em] uppercase">{videoGenerationProgress || 'GENERATING VIDEO...'}</span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-black/40 rounded-full h-3 border border-pink-500/50 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 transition-all duration-500 ease-out"
                            style={{ width: `${videoProgressPercentage}%` }}
                          />
                        </div>
                        {/* Percentage Display */}
                        <div className="text-center">
                          <span className="text-cyan-400 text-2xl font-bold">
                            {videoProgressPercentage}%
                          </span>
                        </div>
                      </div>
                    )}


                    <p className="text-pink-300 text-xs mt-2">
                      💰 Cost: {
                        mode === 'gen4_turbo' ? '40' :
                        mode === 'gen3a_turbo' ? '80' :
                        mode === 'veo3.1' ? '320' :
                        mode === 'veo3.1_fast' ? '160' :
                        mode === 'veo3' ? '512' :
                        mode === 'gen4_aleph' ? '120' :
                        '40'
                      } INFINITO credits
                      {isAdmin && mode && (
                        <span className="ml-2 text-yellow-300">
                          (RunwayML: {
                            mode === 'gen4_turbo' ? '25' :
                            mode === 'gen3a_turbo' ? '50' :
                            mode === 'veo3.1' ? '200' :
                            mode === 'veo3.1_fast' ? '100' :
                            mode === 'veo3' ? '320' :
                            mode === 'gen4_aleph' ? '75' :
                            '25'
                          } credits + 60% markup)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Thread View - Only show when expanded */}
                {showThreadView && (
                  <div className={`mb-2 bg-black/30 rounded border border-cyan-500/20 ${glowEnabled ? 'glow' : ''}`}>
                    {/* Document Header - Only show if document is loaded */}
                    {processedDocumentData && (
                      <div className="p-3 border-b border-cyan-500/20 bg-black/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="text-cyan-400">
                              {processedDocumentData.fileType.includes('pdf') ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                                  <path d="M14 2v6h6"/>
                                  <path d="M9 13h6"/>
                                  <path d="M9 17h6"/>
                                  <path d="M9 9h1"/>
                                </svg>
                              ) : processedDocumentData.fileType.includes('word') || processedDocumentData.fileType.includes('document') ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                                  <path d="M14 2v6h6"/>
                                  <path d="M16 13H8"/>
                                  <path d="M16 17H8"/>
                                  <path d="M10 9H8"/>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                                  <path d="M14 2v6h6"/>
                                  <path d="M16 13H8"/>
                                  <path d="M16 17H8"/>
                                  <path d="M10 9H8"/>
                                </svg>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-cyan-300">
                                {processedDocumentData.filename}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => {
                              setProcessedDocumentData(null)
                              setConversationHistory([])
                              setCurrentConversationId(null)
                            }}
                            className="text-xs px-2 py-1 bg-red-600/60 hover:bg-red-500/80 text-white"
                            title="Clear document and conversation"
                          >
                            ✕
                          </Button>
                        </div>
                        <div className="text-xs text-cyan-400/80 mb-2">
                          AI ready to help with questions about this document
                        </div>
                      </div>
                    )}

                    {/* Conversation Thread */}
                    <div className="p-3">
                      <div className="text-xs text-cyan-500 mb-3">
                        Conversation Thread ({threadGenerations.length > 0 ? threadGenerations.length : conversationHistory.length} messages):
                      </div>
                      <div className="text-xs text-cyan-300 max-h-96 overflow-y-auto space-y-3">
                        {loadingThread ? (
                          <div className="text-cyan-400">Loading thread...</div>
                        ) : threadGenerations.length > 0 ? (
                          // Show generations from database (includes "generate more" responses)
                          threadGenerations.map((gen, index) => (
                            <div key={gen.id} className="border-l-2 border-cyan-500/30 pl-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`text-xs font-medium ${
                                  gen.is_root ? 'text-green-400' : 'text-cyan-400'
                                }`}>
                                  {gen.is_root ? 'Original' : `Expand #${gen.thread_position}`}
                                </span>
                                <span className="text-xs text-cyan-600">
                                  {new Date(gen.created_at).toLocaleTimeString()}
                                </span>
                              </div>
                              {gen.prompt && gen.prompt.trim() && (
                                <div className="text-xs text-cyan-400 mb-1 font-medium">
                                  Q: {gen.prompt}
                                </div>
                              )}
                              <div className="text-xs text-cyan-300 leading-relaxed whitespace-pre-wrap">
                                {gen.output}
                              </div>
                            </div>
                          ))
                        ) : conversationHistory.length > 0 ? (
                          // Fallback to local state if database thread not loaded
                          conversationHistory.map((msg, index) => (
                            <div key={msg.id || `msg-${index}`} className="border-l-2 border-cyan-500/30 pl-3">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`text-xs font-medium ${
                                  msg.role === 'user' ? 'text-cyan-400' : 
                                  msg.role === 'assistant' ? 'text-green-400' : 
                                  'text-blue-400'
                                }`}>
                                  {msg.role === 'user' ? 'You' : 
                                   msg.role === 'assistant' ? 'AI' : 
                                   'System'}
                                </span>
                                <span className="text-xs text-cyan-600">
                                  {msg.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="text-xs text-cyan-300 leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-cyan-400/60">No conversation thread yet. Start a conversation to see it here.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Reset Button - Above prompt window on the right */}
                <div className="flex justify-end mb-2">
                  <Button
                    onClick={() => {
                      setLastGenerationId(null) // Clear generation ID for new conversation
                      window.location.reload()
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white text-xs px-3 py-1 h-8"
                    title="Reset page"
                  >
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    Reset
                  </Button>
                </div>

                <textarea
                  placeholder={
                    signupFlow === 'collecting' && signupStep === 'email'
                      ? "Tell me your email here"
                      : signupFlow === 'collecting' && signupStep === 'name'
                        ? "Tell me your name here"
                        : signupFlow === 'collecting' && signupStep === 'phone'
                          ? "Tell me your phone number here (optional)"
                          : signupFlow === 'collecting' && signupStep === 'password'
                            ? "Tell me your password here (at least 6 characters)"
                            : isProcessingDocument 
                              ? "Processing document..." 
                              : isVideoModel
                                ? "Describe the video you want to generate... (e.g., 'A cat playing with a ball', 'Ocean waves at sunset')"
                              : isVisionModel 
                                ? selectedImage 
                                  ? `Ask ${mode.toUpperCase()} about this image... (e.g., "What do you see?", "Describe this image", "What objects are visible?")`
                                  : "Ask about an image or describe what you see... (upload image first)"
                                : processedDocumentData 
                                  ? "AI ready to help with questions about this document" 
                                  : "Ask question or drop file"
                  }
                  className={`w-full bg-transparent text-lg resize-none border-none focus:ring-0 p-4 transition-all duration-300 ${
                    isVideoModel
                      ? 'text-pink-300 placeholder-pink-600 border-pink-500/30'
                      : isVisionModel 
                        ? 'text-purple-300 placeholder-purple-600 border-purple-500/30' 
                        : 'text-blue-300 placeholder-blue-700'
                  } ${isVisionModel || isVideoModel ? 'h-40' : 'h-32'}`}
                  value={prompt}
                  onChange={handlePromptChange}
                  onKeyDown={(e) => {
                    // Trigger handleTransmit on Enter (without Shift)
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault() // Prevent new line
                      if (!loading && !isGeneratingVideo && !isProcessingDocument && signupFlow !== 'asking') {
                        handleTransmit()
                      }
                    }
                    // Allow Shift+Enter for new line (default behavior)
                  }}
                  disabled={isProcessingDocument || signupFlow === 'asking' || isGeneratingVideo}
                />
                
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 sm:p-2 border-t border-blue-500/30">
                  {/* Mobile: Stack buttons vertically */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white h-10 w-10"
                      onClick={() => setShowDocumentUpload(true)}
                      title="Import File"
                    >
                      <FileUp className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleVoiceInput}
                      className={`h-10 w-10 ${isListening ? 'bg-red-900/20 text-red-400 animate-pulse' : 'text-cyan-400 hover:bg-cyan-400/10 hover:text-white'}`}
                      title={isListening ? 'Listening... Click to stop' : 'Voice input'}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-10 ${userCredits <= 10 ? 'text-red-400 hover:bg-red-400/10 hover:text-red-300' : 'text-cyan-400 hover:bg-cyan-400/10 hover:text-white'} ${userCredits <= 10 ? 'w-auto px-3 gap-2' : 'w-10'}`}
                      onClick={() => setShowCreditsDialog(true)}
                      title={userCredits <= 10 ? "Low credits - Purchase Credits" : "Purchase Credits"}
                    >
                      <CreditCard className="h-5 w-5" />
                      {userCredits <= 10 && (
                        <span className="text-xs font-semibold">Buy Credits</span>
                      )}
                    </Button>
                  </div>
                  
                  {/* Thread Button - Mobile: Full width, Desktop: Middle */}
                  {(conversationHistory.length > 0 || lastGenerationId) && (
                    <Button
                      onClick={async () => {
                        const newShowThreadView = !showThreadView
                        setShowThreadView(newShowThreadView)
                        
                        if (lastGenerationId) {
                          try {
                            const { data: { session } } = await supabase.auth.getSession()
                            if (session) {
                              const response = await fetch(`/api/generations/thread?id=${lastGenerationId}`, {
                                headers: {
                                  'Authorization': `Bearer ${session.access_token}`
                                }
                              })
                              
                              if (response.ok) {
                                const data = await response.json()
                                const thread = data.thread || []
                                setThreadGenerations(thread)
                                
                                // When hiding thread view, restore combined output to show in AI response view
                                if (!newShowThreadView && thread.length > 0) {
                                  console.log('🔄 [THREAD] Restoring combined output from thread...')
                                  // Combine root + all children outputs
                                  const combinedOutput = thread
                                    .map((gen: any) => gen.output || '')
                                    .filter((o: string) => o.trim())
                                    .join('\n\n')
                                    .trim()
                                  
                                  if (combinedOutput && combinedOutput !== output) {
                                    console.log('✅ [THREAD] Updating output with combined content. Length:', combinedOutput.length)
                                    setOutput(combinedOutput)
                                  }
                                }
                                
                                // When opening thread view, just show the thread data
                                if (newShowThreadView) {
                                  setLoadingThread(true)
                                }
                              } else {
                                console.error('Failed to load thread:', response.status)
                              }
                            }
                          } catch (error) {
                            console.error('Error loading thread:', error)
                          } finally {
                            setLoadingThread(false)
                          }
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2 bg-transparent border border-cyan-500/40 text-cyan-400 hover:border-cyan-500/60 hover:text-cyan-300 transition-all text-sm font-medium"
                      title={showThreadView ? "Hide conversation thread" : "Show conversation thread"}
                    >
                      {showThreadView ? "HIDE THREAD" : "SHOW THREAD"}
                    </Button>
                  )}
                  
                  {/* Process Button - Mobile: Full width, Desktop: Right */}
                  <Button 
                    onClick={handleTransmit}
                    disabled={loading || isGeneratingVideo || isGeneratingImage}
                    title={needsOllama && ollamaOk === false ? "May fail while Ollama is down." : undefined}
                    className={`relative overflow-hidden w-full sm:w-auto ${
                      isVideoModel
                        ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500'
                        : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500'
                    } text-white font-bold hover:brightness-110 hover:shadow-lg hover:shadow-purple-400/50 rounded-lg px-6 sm:px-8 py-3 text-base sm:text-lg tracking-widest transition-all disabled:opacity-80`}
                  >
                    {(loading || isGeneratingVideo || isGeneratingImage) && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                    )}
                    <div className="relative flex items-center justify-center gap-2">
                      {(loading || isGeneratingVideo || isGeneratingImage) && (
                        <div className="animate-spin rounded-full h-5 w-5 border-3 border-white/40 border-t-white"></div>
                      )}
                      <span>
                        {isGeneratingVideo
                          ? "GENERATING VIDEO..."
                          : isGeneratingImage
                            ? "GENERATING IMAGE..."
                            : loading 
                              ? "PROCESSING..." 
                              : isVideoModel
                                ? "GENERATE VIDEO"
                                : isImageGenModel
                                  ? "GENERATE IMAGE"
                                  : isVisionModel 
                                    ? "ANALYZE IMAGE" 
                                    : "PROCESS"
                        }
                      </span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            {/* Audio Model Selector - Admin Only - Below prompt window */}
            {isAdmin && (
              <div className="w-full max-w-3xl mt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 text-xs sm:text-sm font-semibold tracking-wide uppercase">AUDIO MODEL:</span>
                    <Link href="/audio-ai-settings">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-all"
                        title="Audio AI Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  <Select value={selectedAudioModel || ""} onValueChange={(value) => handleModelChange(value, 'audio')}>
                    <SelectTrigger className="w-full sm:w-48 h-10 sm:h-8 bg-transparent border-orange-500/50 text-orange-300 hover:border-orange-400 focus:border-orange-400 focus:ring-orange-400/50 text-sm font-mono uppercase tracking-wider">
                      <SelectValue placeholder="Select Audio Model" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-orange-500/50 backdrop-blur-md">
                      <SelectItem value="elevenlabs" className="text-orange-300 hover:bg-orange-500/20 focus:bg-orange-500/20 font-mono uppercase">ELEVENLABS</SelectItem>
                      <SelectItem value="google_tts" className="text-orange-300 hover:bg-orange-500/20 focus:bg-orange-500/20 font-mono uppercase">GOOGLE TTS</SelectItem>
                      <SelectItem value="amazon_polly" className="text-orange-300 hover:bg-orange-500/20 focus:bg-orange-500/20 font-mono uppercase">AMAZON POLLY</SelectItem>
                      <SelectItem value="openai_tts" className="text-orange-300 hover:bg-orange-500/20 focus:bg-orange-500/20 font-mono uppercase">OPENAI TTS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Mode Selector - Admin Only */}
            {isAdmin && (
              <div className="w-full max-w-3xl mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-cyan-400 text-xs sm:text-sm font-semibold tracking-wide uppercase">MODE:</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 bg-transparent border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/20 hover:text-white hover:border-cyan-400 transition-all"
                  >
                    <Music className="h-4 w-4 mr-2" />
                    A
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 bg-transparent border-purple-500/50 text-purple-300 hover:bg-purple-500/20 hover:text-white hover:border-purple-400 transition-all"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    P
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 bg-transparent border-red-500/50 text-red-300 hover:bg-red-500/20 hover:text-white hover:border-red-400 transition-all"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    V
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-10 bg-transparent border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20 hover:text-white hover:border-yellow-400 transition-all"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    T
                  </Button>
                </div>
              </div>
            )}

            {/* Voice Selection - For All Users */}
            {user && (
              <div className="w-full max-w-3xl mt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  {/* Check if selected voice is custom - hide text if custom voice selected */}
                  {(() => {
                    const selectedVoice = availableVoices.find(v => (v.voice_id || v.id) === selectedVoiceId)
                    // Default voice IDs list
                    const defaultVoiceIds = [
                      'EXAVITQu4vr4xnSDxMaL', '21m00Tcm4TlvDq8ikWAM', 'AZnzlk1XvdvUeBnXmlld',
                      'ErXwobaYiN019PkySvjV', 'MF3mGyEYCl7XYWbV9V6O', 'TxGEqnHWrfWFTfGW9XjX',
                      'VR6AewLTigWG4xSOukaG', 'pNInz6obpgDQGcFmaJgB', 'yoZ06aMxZJJ28mfd3POQ',
                      'IKne3meq5aSn9XLyUdCD'
                    ]
                    // A voice is custom if it's not in the default voices list
                    const voiceId = selectedVoiceId
                    const isDefaultVoice = defaultVoiceIds.includes(voiceId) || 
                                           (selectedVoice && selectedVoice.category === 'premade')
                    const isCustomVoice = selectedVoice && !isDefaultVoice
                    const showText = isVoiceDropdownOpen || !isCustomVoice
                    
                    return showText ? (
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 text-xs sm:text-sm font-semibold tracking-wide uppercase">DEFAULT VOICE:</span>
                        {isLoadingVoices && (
                          <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                        )}
                      </div>
                    ) : null
                  })()}
                  <Select 
                    value={selectedVoiceId || ""} 
                    onValueChange={(value) => {
                      setSelectedVoiceId(value)
                      // Save user preference
                      saveUserVoicePreference(value)
                    }}
                    onOpenChange={setIsVoiceDropdownOpen}
                    disabled={isLoadingVoices}
                  >
                    <SelectTrigger className="w-full sm:w-64 h-10 sm:h-8 bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400 focus:border-cyan-400 focus:ring-cyan-400/50 text-sm font-mono uppercase tracking-wider">
                      <SelectValue placeholder={isLoadingVoices ? "Loading voices..." : availableVoices.length === 0 ? "No voices available" : "Select Voice"} />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-60">
                      {availableVoices.length > 0 ? (
                        availableVoices.map((voice) => (
                          <div key={voice.voice_id || voice.id} className="flex items-center justify-between p-2 hover:bg-cyan-500/20">
                            <SelectItem 
                              value={voice.voice_id || voice.id}
                              className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono flex-1"
                            >
                              {voice.name} {voice.category === 'cloned' || voice.category === 'custom' ? '(Custom)' : ''}
                            </SelectItem>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                previewVoice(voice.voice_id || voice.id)
                              }}
                              disabled={isGeneratingPreview && previewVoiceId === (voice.voice_id || voice.id)}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 flex-shrink-0 ml-2"
                              title="Preview voice"
                            >
                              {isGeneratingPreview && previewVoiceId === (voice.voice_id || voice.id) ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-gray-400 text-sm">
                          {isLoadingVoices ? "Loading voices..." : "No voices available. Please run the SQL setup first."}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {(() => {
                    const selectedVoice = availableVoices.find(v => (v.voice_id || v.id) === selectedVoiceId)
                    // Default voice IDs list
                    const defaultVoiceIds = [
                      'EXAVITQu4vr4xnSDxMaL', '21m00Tcm4TlvDq8ikWAM', 'AZnzlk1XvdvUeBnXmlld',
                      'ErXwobaYiN019PkySvjV', 'MF3mGyEYCl7XYWbV9V6O', 'TxGEqnHWrfWFTfGW9XjX',
                      'VR6AewLTigWG4xSOukaG', 'pNInz6obpgDQGcFmaJgB', 'yoZ06aMxZJJ28mfd3POQ',
                      'IKne3meq5aSn9XLyUdCD'
                    ]
                    // A voice is custom if it's not in the default voices list
                    const voiceId = selectedVoiceId
                    const isDefaultVoice = defaultVoiceIds.includes(voiceId) || 
                                           (selectedVoice && selectedVoice.category === 'premade')
                    const isCustomVoice = selectedVoice && !isDefaultVoice
                    const showText = isVoiceDropdownOpen || !isCustomVoice
                    
                    return showText ? (
                      <div className="text-xs text-gray-400 mt-1 sm:mt-0">
                        This will be your default voice for all audio generation
                      </div>
                    ) : null
                  })()}
                </div>
                
                {/* Voice Preview Audio */}
                {previewAudioUrl && (
                  <div className="mt-3 p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
                    <div className="text-xs text-cyan-400 mb-2">Voice Preview:</div>
                    <audio 
                      controls 
                      src={previewAudioUrl} 
                      className="w-full h-8"
                      autoPlay
                    />
                  </div>
                )}
                
              </div>
            )}

            {/* NEW: Document Processing Success Message */}
            {lastProcessedDocument && (
              <div className="w-full max-w-3xl mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
                ✅ Document processed successfully! {lastProcessedDocument}
              </div>
            )}

            {/* NEW: Advanced Settings Toggle - Only visible to admins */}
            {isAdmin && (
              <div className="w-full max-w-3xl mt-4">
                {/* Advanced Settings Toggle Button */}
                <div className="flex items-center justify-center mb-3">
                  <button
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="flex items-center gap-2 text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 transition-colors px-4 py-2 rounded border border-cyan-500/30 hover:border-cyan-400/50 touch-manipulation"
                  >
                    <Settings className="h-4 w-4" />
                    <span>{showAdvancedSettings ? "Hide Advanced" : "Advanced Settings"}</span>
                    <span className={`transform transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                </div>
                
                {/* All Settings (Conditional) */}
                {showAdvancedSettings && (
                  <div className="space-y-4 p-4 bg-black/10 rounded-lg border border-cyan-500/20">
                    {/* Stream, Glow, Response Controls - Mobile: Stack vertically */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm text-cyan-400">
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={stream} 
                            onChange={(e) => setStream(e.target.checked)}
                            className="rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                          />
                          <span>Stream tokens</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={glowEnabled} 
                            onChange={(e) => setGlowEnabled(e.target.checked)}
                            className="rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 w-4 h-4"
                          />
                          <span>Glow effect</span>
                        </label>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                        <span>Response:</span>
                        <select
                          value={responseStyle}
                          onChange={(e) => setResponseStyle(e.target.value as "concise" | "detailed")}
                          className="rounded border-cyan-500 text-cyan-500 bg-black/20 px-3 py-2 text-sm focus:ring-cyan-500 w-full sm:w-auto"
                        >
                          <option value="concise">Concise</option>
                          <option value="detailed">Detailed</option>
                        </select>
                        <span className={`text-xs px-3 py-1 rounded ${
                          responseStyle === "concise" 
                            ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}>
                          {responseStyle === "concise" ? "🎯 Direct" : "📚 Detailed"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Temperature, Top-K, Max Controls - Mobile: Stack vertically */}
                    <div className="flex flex-col sm:flex-row gap-4 text-xs text-cyan-400">
                      <label className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                        <span>Temp:</span>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="range" min={0.1} max={1.5} step={0.05}
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                            className="flex-1 sm:w-16"
                          />
                          <span className="w-12 text-center">{temperature.toFixed(2)}</span>
                        </div>
                      </label>
                      <label className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                        <span>Top-K:</span>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="range" min={0} max={200} step={5}
                            value={topK}
                            onChange={(e) => setTopK(parseInt(e.target.value))}
                            className="flex-1 sm:w-16"
                          />
                          <span className="w-12 text-center">{topK}</span>
                        </div>
                      </label>
                      <label className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                        <span>Max:</span>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="range" min={50} max={2048} step={50}
                            value={maxTokens}
                            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                            className="flex-1 sm:w-16"
                          />
                          <span className="w-12 text-center">{maxTokens}</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* NEW: Output display */}
            {error && (
              <div className="w-full max-w-3xl mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            

            
            {/* AI Response Window - Only show when thread is closed */}
            {output && !showThreadView && (
              <div className="w-full max-w-3xl mx-auto pb-8">
              <ProgressiveResponse 
                content={output} 
                responseStyle={responseStyle}
                audioUrl={audioUrl || undefined}
                isGeneratingAudio={isGeneratingAudio}
                audioError={audioError || undefined}
                onGenerateAudio={generateAudio}
                onConvertToVideo={handleConvertImageToVideo}
                prompt={lastPrompt}
                model={mode}
                isAdmin={isAdmin}
                imageToVideoModel={imageToVideoModel}
                onImageToVideoModelChange={(value) => handleModelChange(value, 'imageToVideo')}
                isModelEnabled={isModelEnabled}
                generationId={lastGenerationId}
                onContentChange={async (newContent: string) => {
                  // CRITICAL: Update local output state immediately with the edited content
                  // This replaces the old combined content with the new edited version
                  console.log('🔄 [PAGE] Updating output state. Old length:', output.length, 'New length:', newContent.length)
                  console.log('🔄 [PAGE] New content preview:', newContent.substring(0, 100))
                  
                  // Use functional update to ensure we're setting the exact new content
                  setOutput(() => newContent)
                  
                  console.log('✅ [PAGE] Output state set to:', newContent.substring(0, 100))
                }}
                onShowPrevious={async () => {
                  // Fetch and display previous "generate more" responses
                  if (lastGenerationId) {
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (session) {
                        const threadResponse = await fetch(`/api/generations/thread?id=${lastGenerationId}`, {
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`
                          }
                        })
                        
                          if (threadResponse.ok) {
                            const threadData = await threadResponse.json()
                            const thread = threadData.thread || []
                            
                            // Check if there are any child generations (generate more responses)
                            if (thread.length > 1) {
                              const children = thread.slice(1) // All children after root
                              const existingChildOutput = children.map((c: any) => c.output || '').filter((o: string) => o.trim()).join('\n\n')
                              
                              if (existingChildOutput) {
                                console.log('✅ [SHOW PREVIOUS] Found existing "generate more" response. Showing it.')
                                // Combine root + existing children
                                const rootOutput = thread[0]?.output || ''
                                const combinedOutput = rootOutput && existingChildOutput
                                  ? `${rootOutput}\n\n${existingChildOutput}`
                                  : existingChildOutput || rootOutput
                                
                                setOutput(combinedOutput)
                              } else {
                                console.log('ℹ️ [SHOW PREVIOUS] No previous "generate more" responses found.')
                                // Update the button visibility by triggering a re-check
                                // The useEffect in ProgressiveResponse will handle this
                              }
                            } else {
                              console.log('ℹ️ [SHOW PREVIOUS] No previous "generate more" responses found.')
                            }
                          }
                      }
                    } catch (error) {
                      console.error('Error fetching previous generate more:', error)
                    }
                  }
                }}
                onShowMore={async (topic: string) => {
                  // Reset audio state when expanding content so user can generate audio for expanded content
                  setAudioUrl(null)
                  setAudioError(null)
                  
                  // Make a follow-up API call asking for more details
                  const followUpPrompt = `Expand on this topic: "${topic}"

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. Write EXACTLY 3-4 paragraphs ONLY. NO MORE. STOP after paragraph 4.
2. Each paragraph must be 3-5 sentences MAXIMUM.
3. Separate paragraphs with TWO line breaks (press Enter twice between paragraphs).
4. Total word count should be approximately 150-250 words MAXIMUM.
5. Be concise and focused - do not provide extensive detail.

Paragraph 1 (3-5 sentences): Main historical or foundational information
Paragraph 2 (3-5 sentences): Evolution, development, or key details  
Paragraph 3 (3-5 sentences): Modern practices, traditions, or examples
Paragraph 4 OPTIONAL (2-4 sentences): Brief conclusion or cultural impact

IMPORTANT RESTRICTIONS:
- NO bullet points, NO numbered lists, NO code blocks
- NO additional paragraphs beyond 4
- Keep it SHORT and CONCISE
- Stop writing after completing paragraph 4`
                  
                  // Limit max_tokens to ensure concise 3-4 paragraph response (approximately 150-250 words = 200-350 tokens)
                  const limitedMaxTokens = Math.min(maxTokens, 400)
                  
                  // Helper function to truncate to exactly 4 paragraphs
                  const truncateToFourParagraphs = (text: string): string => {
                    // Split by double line breaks (paragraphs)
                    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
                    
                    // Take only first 4 paragraphs
                    if (paragraphs.length > 4) {
                      return paragraphs.slice(0, 4).join('\n\n')
                    }
                    
                    return text
                  }
                  
                  const payload = JSON.stringify({
                    prompt: followUpPrompt,
                    mode,
                    max_tokens: limitedMaxTokens,
                    temperature,
                    top_k: topK,
                    response_style: "detailed", // Force detailed for follow-up
                    is_show_more: true // Flag to indicate this is a show more request
                  })

                  try {
                    // Use non-streaming for show more (faster for small responses)
                      const r = await fetch("/api/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: payload,
                      })
                      const data = await r.json()
                      if (!r.ok || data.error) throw new Error(data.error || "Request failed")
                    
                    let response = String(data.output ?? "")
                    
                    // Truncate to exactly 4 paragraphs
                    response = truncateToFourParagraphs(response)
                    
                    // IMMEDIATELY update output to include "generate more" text so it persists
                    // This makes it editable/exportable and prevents it from disappearing
                    setOutput(prevOutput => {
                      // If there's existing output, append the generate more text with a separator
                      if (prevOutput && prevOutput.trim()) {
                        return `${prevOutput}\n\n${response}`
                      }
                      return response
                    })
                    
                    // Return response immediately (don't wait for save - makes it faster)
                    // Save happens in background AFTER response is shown
                    // Use ref to ensure we have the latest value even if state hasn't updated
                    const currentGenerationId = lastGenerationIdRef.current || lastGenerationId
                    
                    console.log('🔍 [GENERATE MORE] Checking IDs for save:', {
                      lastGenerationId: lastGenerationId,
                      lastGenerationIdRef: lastGenerationIdRef.current,
                      currentGenerationId: currentGenerationId,
                      hasResponse: !!response && response.trim().length > 0,
                      responseLength: response?.length || 0
                    })
                    
                    // Save in background (fire and forget) - AFTER returning response
                    // This makes the response appear faster
                    if (response && response.trim() && currentGenerationId) {
                      console.log('✅ [GENERATE MORE] All checks passed. Queuing background save. Parent ID:', currentGenerationId)
                      
                      // Use setTimeout to save after response is displayed
                      setTimeout(async () => {
                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          if (!session) {
                            console.warn('⚠️ No session for background save')
                            return
                          }
                          
                          const showMorePrompt = `Expand on: "${topic}"`
                          const showMoreData = {
                            prompt: showMorePrompt,
                            output: response,
                            model: mode,
                            temperature: temperature,
                            top_k: topK,
                            parent_id: currentGenerationId // Link to original generation
                          }
                          
                          console.log('🔄 Background saving "generate more" response...')
                          
                          // Save to generations table
                          const saveResponse = await fetch('/api/generations/create', {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session.access_token}`
                            },
                            body: JSON.stringify(showMoreData)
                          })
                          
                          if (saveResponse.ok) {
                            const saveData = await saveResponse.json()
                            console.log('✅ Saved "generate more" response to library. Parent ID:', currentGenerationId, 'New ID:', saveData.generation_id)
                            
                            // The ProgressiveResponse component will detect the new child on its next check
                            // No need to manually update hasPreviousResponse - the useEffect will handle it
                            
                            // Refresh thread view if it's currently open
                            if (showThreadView && currentGenerationId) {
                              try {
                                console.log('🔄 Refreshing thread view...')
                                const threadResponse = await fetch(`/api/generations/thread?id=${currentGenerationId}`, {
                                  headers: {
                                    'Authorization': `Bearer ${session.access_token}`
                                  }
                                })
                                
                                if (threadResponse.ok) {
                                  const threadData = await threadResponse.json()
                                  console.log('✅ Thread refreshed. Found', threadData.thread?.length || 0, 'generations')
                                  setThreadGenerations(threadData.thread || [])
                                }
                              } catch (refreshError) {
                                console.error('❌ Error refreshing thread:', refreshError)
                              }
                            }
                            
                            // Also save to memory core
                            try {
                              const memoryData = {
                                concept: `Conversation Turn: AI Response (Generate More)`,
                                data: response,
                                salience: 0.7,
                                connections: ['conversation', 'ai_chat', 'memory_core', 'generate_more'],
                                memory_type: 'semantic',
                                priority: 6,
                                memory_category: 'conversation',
                                parent_id: null,
                                hierarchy_level: 0
                              }
                              
                              const memoryResponse = await fetch('/api/memories', {
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session.access_token}`
                                },
                                body: JSON.stringify(memoryData)
                              })
                              
                              if (memoryResponse.ok) {
                                console.log('✅ Saved "generate more" response to memory core')
                              }
                            } catch (memoryError) {
                              console.error('❌ Error saving to memory core:', memoryError)
                            }
                          } else {
                            const errorText = await saveResponse.text()
                            console.error('❌ Failed to save "generate more":', saveResponse.status, errorText)
                          }
                        } catch (saveError) {
                          console.error('❌ Error in background save:', saveError)
                        }
                      }, 100) // Small delay to ensure response is displayed first
                    } else {
                      if (!currentGenerationId) {
                        console.warn('⚠️ Cannot save "generate more" - lastGenerationId is null. Make sure initial response is saved first.')
                      }
                    }
                    
                    return response
                  } catch (error) {
                    console.error('Follow-up API call failed:', error)
                    throw error
                  }
                }}
                className={`w-full max-w-3xl mt-4 ${glowEnabled ? 'glow' : ''}`}
              />
              
              {/* YES/NO buttons for signup flow */}
              {signupFlow === 'asking' && (
                <div className="flex gap-4 justify-center mt-4">
                  <Button
                    onClick={handleSignupYes}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-2"
                  >
                    YES
                  </Button>
                  <Button
                    onClick={handleSignupNo}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-2"
                  >
                    NO
                  </Button>
                </div>
              )}

              {/* Back and Skip buttons for signup flow */}
              {signupFlow === 'collecting' && signupStep !== 'email' && (
                <div className="flex gap-4 justify-center mt-4">
                  {/* Back button - show for name, phone, and password steps */}
                  <Button
                    onClick={handleBackStep}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-6 py-2 flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  
                  {/* Skip button - only show for phone step */}
                  {signupStep === 'phone' && (
                    <Button
                      onClick={handleSkipPhone}
                      className="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-8 py-2"
                    >
                      Skip
                    </Button>
                  )}
                </div>
              )}
              </div>
            )}
          </div>

          {/* Right Panel */}
          {showPanels && isAdmin && (
            <div className="hidden lg:block lg:col-span-3 space-y-6">
            <HudPanel title="Security Matrix">
              <p className="flex items-center gap-2">
                <AztecIcon
                  name="jaguar"
                  className="text-green-400 animate-icon-pulse"
                />{" "}
                End-to-End Encryption
              </p>
              <p className="flex items-center gap-2">
                <AztecIcon
                  name="jaguar"
                  className="text-green-400 animate-icon-pulse"
                />{" "}
                Anomaly Detection
              </p>
              <p className="flex items-center gap-2">
                <AztecIcon
                  name="jaguar"
                  className="text-green-400 animate-icon-pulse"
                />{" "}
                Anti-Cognitive Hazard
              </p>
            </HudPanel>
            <HudPanel title="Data Stream">
              <p className="truncate">[20:41:12] SYNC: Global Weather Patterns</p>
              <p className="truncate">[20:41:10] QUERY: Dark Matter Composition</p>
              <p className="truncate">[20:41:08] RCV: Subspace Transmission</p>
              <p className="truncate text-gray-600">[20:41:05] IDLE: Awaiting Input...</p>
            </HudPanel>
            
            {/* NEW: Document Processing Status */}
            {(isProcessingDocument || lastProcessedDocument) && (
              <HudPanel title="Document Processing">
                {isProcessingDocument ? (
                  <div className="flex items-center gap-2 text-cyan-400">
                    <FileText className="h-4 w-4 animate-pulse" />
                    <span className="text-sm">Processing Document...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-400">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Document Processed!</span>
                  </div>
                )}
                {lastProcessedDocument && (
                  <p className="text-xs text-gray-400 mt-1">
                    {lastProcessedDocument}
                  </p>
                )}
              </HudPanel>
            )}
            
            {/* Vision Model Status */}
            {isVisionModel && (
              <HudPanel title="Vision Model Active">
                <div className="flex items-center gap-2 text-purple-400">
                  <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold">{mode.toUpperCase()}</span>
                </div>
                <p className="text-xs text-purple-300 mt-1">
                  Ready for image analysis
                </p>
                <p className="text-xs text-purple-500 mt-1">
                  Upload an image to begin
                </p>
              </HudPanel>
            )}
            
            {/* Video Model Status */}
            {isVideoModel && (
              <HudPanel title="Video Generation Active">
                <div className="flex items-center gap-2 text-pink-400">
                  <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold">{mode.toUpperCase()}</span>
                </div>
                <p className="text-xs text-pink-300 mt-1">
                  {isGeneratingVideo ? 'Generating video...' : 'Ready for video generation'}
                </p>
                <p className="text-xs text-pink-500 mt-1">
                  {isGeneratingVideo ? videoGenerationProgress : 'Configure settings and prompt'}
                </p>
                {videoUrl && (
                  <p className="text-xs text-green-400 mt-2">
                    ✅ Video ready!
                  </p>
                )}
              </HudPanel>
            )}
          </div>
          )}
        </main>

        <footer className="text-center text-cyan-800 text-xs mt-4">
          <p>Developed by JOR • Powered by Covion Studio © 2025 • V.1.0</p>
        </footer>

        {/* Document Review Window - Inline below console */}
        {showDocumentReview && processedDocumentData && (
          <div className={`aztec-panel backdrop-blur-md shadow-2xl shadow-cyan-500/20 p-4 mt-6 ${glowEnabled ? 'glow' : ''}`}>
            <div className="flex justify-between items-center mb-4 border-b border-cyan-500/30 pb-3">
              <div>
                <h2 className="text-xl font-bold text-cyan-400">
                  Document Ready: {processedDocumentData.filename}
                </h2>
                <p className="text-sm text-cyan-300">
                  {processedDocumentData.fileType} • {(processedDocumentData.fileSize / 1024 / 1024).toFixed(2)} MB • {processedDocumentData.memories.length} memories extracted
                </p>
              </div>
              <Button
                onClick={() => setShowDocumentReview(false)}
                className="aztec-button text-xs px-2 py-1"
              >
                ✕ Close
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left - File Info & Memories */}
              <div className="space-y-3">
                <div className="bg-black/20 p-3 rounded border border-cyan-500/20">
                  <h3 className="text-sm font-semibold text-cyan-400 mb-2">File Details</h3>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-cyan-600">ID:</span>
                      <span className="text-cyan-300 font-mono">{processedDocumentData.documentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-600">Type:</span>
                      <span className="text-cyan-300">{processedDocumentData.fileType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-600">Size:</span>
                      <span className="text-cyan-300">{(processedDocumentData.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 p-3 rounded border border-cyan-500/20">
                  <h3 className="text-sm font-semibold text-cyan-400 mb-2">Extracted Memories</h3>
                  <div className="text-xs text-cyan-300">
                    <p className="mb-2">AI found <span className="text-cyan-400 font-bold">{processedDocumentData.memories.length}</span> key concepts:</p>
                    <ul className="space-y-1">
                      {processedDocumentData.memories.slice(0, 3).map((memory: any, index: number) => (
                        <li key={index} className="flex items-center">
                          <span className="text-cyan-500 mr-2">•</span>
                          <span className="truncate">{memory.concept}</span>
                        </li>
                      ))}
                      {processedDocumentData.memories.length > 3 && (
                        <li className="text-cyan-600">... and {processedDocumentData.memories.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right - Extracted Text */}
              <div className="bg-black/20 p-3 rounded border border-cyan-500/20">
                <h3 className="text-sm font-semibold text-cyan-400 mb-2">Extracted Text Content</h3>
                <div className="text-xs text-cyan-300">
                  <p className="mb-2 text-cyan-600">AI extracted text for analysis:</p>
                  <div className="bg-black/30 p-2 rounded border border-cyan-500/20 max-h-32 overflow-y-auto">
                    <pre className="whitespace-pre-wrap leading-relaxed text-xs">
                      {processedDocumentData.extractedText}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-cyan-500/30 text-center">
              <p className="text-sm text-cyan-300 mb-3">
                Document processed and stored. {processedDocumentData.memories.length} memories saved to memory core.
              </p>
              <div className="flex justify-center space-x-3">
                <Button
                  onClick={() => {
                    setShowDocumentReview(false)
                    // You could navigate to memory-core here
                  }}
                  className="aztec-button text-xs"
                >
                  View Memories
                </Button>
                <Button
                  onClick={() => setShowDocumentReview(false)}
                  className="aztec-button bg-cyan-600 hover:bg-cyan-700 text-xs"
                >
                  Continue Working
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {showDocumentUpload && (
          <DocumentUpload
            onCancel={() => setShowDocumentUpload(false)}
            onDocumentProcessed={handleDocumentProcessed}
            onProcessAndSave={processAndSaveDocument}
          />
        )}

        {showMemoryReview && (
          <MemoryReview
            memories={extractedMemories}
            onCancel={() => setShowMemoryReview(false)}
            onSave={handleSaveExtractedMemories}
          />
        )}

        {/* Credits Purchase Dialog */}
        <CreditsPurchaseDialog
          open={showCreditsDialog}
          onOpenChange={setShowCreditsDialog}
          currentCredits={userCredits}
          returnUrl={typeof window !== 'undefined' ? window.location.href : undefined}
        />

        {/* Full Text Dialog */}
        {showFullTextDialog && processedDocumentData && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-black/95 border border-cyan-500/30 rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-cyan-500/30">
                <div>
                  <h2 className="text-xl font-bold text-cyan-400">
                    Full Text: {processedDocumentData.filename}
                  </h2>
                  <p className="text-xs text-cyan-500 mt-1">
                    Complete extracted text content
                  </p>
                </div>
                <Button
                  onClick={() => setShowFullTextDialog(false)}
                  className="text-cyan-400 hover:text-white hover:bg-cyan-400/10 p-2 rounded"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-black/30 p-4 rounded border border-cyan-500/20">
                  <pre className="text-sm text-cyan-200 whitespace-pre-wrap leading-relaxed font-mono">
                    {processedDocumentData.extractedText}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 p-4 border-t border-cyan-500/30">
                <Button
                  onClick={() => setShowFullTextDialog(false)}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white px-6"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
