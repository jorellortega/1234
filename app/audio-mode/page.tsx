"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Home, BookUser, BrainCircuit, User, LogOut, CreditCard, RefreshCw, Wand2, Volume2, Play, Pause, Download, MessageSquare, Copy, Check, Sparkles, Eye, EyeOff, ChevronDown, ChevronUp, Save } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { CreditsPurchaseDialog } from "@/components/CreditsPurchaseDialog"
import { Textarea } from "@/components/ui/textarea"
import { HudPanel } from "@/components/hud-panel"
import { AztecIcon } from "@/components/aztec-icon"

// Format text into paragraphs for better display
function formatTextIntoParagraphs(text: string): string[] {
  if (!text) return []
  
  // First try to split by double line breaks (paragraphs)
  let paragraphs = text.split('\n\n').filter(p => p.trim().length > 0)
  
  // If no paragraphs found, try single line breaks
  if (paragraphs.length <= 1) {
    paragraphs = text.split('\n').filter(p => p.trim().length > 0)
  }
  
  // If still no breaks and text is long, try to create paragraphs from sentences
  if (paragraphs.length <= 1 && text.length > 150) {
    // Split by sentence endings, but keep reasonable paragraph length
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
    paragraphs = []
    let currentParagraph = ""
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim()
      if ((currentParagraph + trimmedSentence).length > 300 && currentParagraph) {
        paragraphs.push(currentParagraph.trim())
        currentParagraph = trimmedSentence + " "
      } else {
        currentParagraph += trimmedSentence + " "
      }
    }
    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim())
    }
  }
  
  // Return array of paragraphs
  return paragraphs.map(p => p.trim()).filter(p => p.length > 0)
}

export default function AudioModePage() {
  // State
  const [prompt, setPrompt] = useState("")
  const [generatedText, setGeneratedText] = useState("")
  const [text, setText] = useState("")
  const [enhancedText, setEnhancedText] = useState("")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [selectedAudioModel, setSelectedAudioModel] = useState<string>("elevenlabs")
  const [selectedLLM, setSelectedLLM] = useState<string>("gpt-4o")
  const [selectedTextModel, setSelectedTextModel] = useState<string>("gpt-4o")
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Loading states
  const [isGeneratingText, setIsGeneratingText] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const [audioGenerationProgress, setAudioGenerationProgress] = useState<string>('')
  const [progressPercentage, setProgressPercentage] = useState<number>(0)
  const [textGenerationProgress, setTextGenerationProgress] = useState<string>('')
  const [textProgressPercentage, setTextProgressPercentage] = useState<number>(0)
  const [isEnhancingText, setIsEnhancingText] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditingGeneratedText, setIsEditingGeneratedText] = useState(false)
  const [editedGeneratedText, setEditedGeneratedText] = useState("")
  const [copied, setCopied] = useState(false)
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false)
  const [savedToLibrary, setSavedToLibrary] = useState(false)
  
  // User state
  const [user, setUser] = useState<any>(null)
  const [userCredits, setUserCredits] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreditsDialog, setShowCreditsDialog] = useState(false)
  
  // Panel visibility state
  const [showPanels, setShowPanels] = useState(false)
  
  // Admin preferences
  const [adminPreferences, setAdminPreferences] = useState<any>(null)
  
  // Audio player state
  const [audioDuration, setAudioDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  
  // ElevenLabs-specific settings
  const [availableVoices, setAvailableVoices] = useState<any[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("")
  const [selectedElevenLabsModel, setSelectedElevenLabsModel] = useState<string>("eleven_turbo_v2_5")
  const [stability, setStability] = useState<number>(0.50)
  const [similarityBoost, setSimilarityBoost] = useState<number>(0.75)
  const [style, setStyle] = useState<number>(0.00)
  const [useSpeakerBoost, setUseSpeakerBoost] = useState<boolean>(true)
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  
  // Voice creation/cloning state
  const [showVoiceCreator, setShowVoiceCreator] = useState(false)
  const [voiceCreatorTab, setVoiceCreatorTab] = useState<'clone' | 'design' | 'changer'>('clone')
  const [cloneName, setCloneName] = useState("")
  const [cloneFiles, setCloneFiles] = useState<File[]>([])
  const [cloneType, setCloneType] = useState<'instant' | 'professional'>('instant')
  const [isCloningVoice, setIsCloningVoice] = useState(false)
  const [voiceDesignDescription, setVoiceDesignDescription] = useState("")
  const [voiceDesignText, setVoiceDesignText] = useState("")
  const [isDesigningVoice, setIsDesigningVoice] = useState(false)
  
  // Voice changer state
  const [voiceChangerFile, setVoiceChangerFile] = useState<File | null>(null)
  const [voiceChangerModel, setVoiceChangerModel] = useState<string>('eleven_multilingual_sts_v2')
  const [voiceChangerStability, setVoiceChangerStability] = useState<number>(1.0)
  const [voiceChangerStyle, setVoiceChangerStyle] = useState<number>(0.0)
  const [voiceChangerRemoveNoise, setVoiceChangerRemoveNoise] = useState<boolean>(false)
  const [isChangingVoice, setIsChangingVoice] = useState(false)
  const [changedVoiceUrl, setChangedVoiceUrl] = useState<string | null>(null)
  
  // Dubbing state
  const [dubbingFile, setDubbingFile] = useState<File | null>(null)
  const [dubbingSourceLanguage, setDubbingSourceLanguage] = useState<string>("en")
  const [dubbingTargetLanguage, setDubbingTargetLanguage] = useState<string>("es")
  const [dubbingUseWatermark, setDubbingUseWatermark] = useState<boolean>(false)
  const [isDubbing, setIsDubbing] = useState(false)
  const [dubbingProgress, setDubbingProgress] = useState<string>('')
  const [dubbingUrl, setDubbingUrl] = useState<string | null>(null)
  
  // Voice isolator state
  const [voiceIsolatorFile, setVoiceIsolatorFile] = useState<File | null>(null)
  const [isIsolatingVoice, setIsIsolatingVoice] = useState(false)
  const [voiceIsolationProgress, setVoiceIsolationProgress] = useState<string>('')
  const [isolatedVoiceUrl, setIsolatedVoiceUrl] = useState<string | null>(null)
  
  // Forced alignment state
  const [forcedAlignmentFile, setForcedAlignmentFile] = useState<File | null>(null)
  const [forcedAlignmentText, setForcedAlignmentText] = useState<string>("")
  const [forcedAlignmentLanguage, setForcedAlignmentLanguage] = useState<string>("en")
  const [isAligning, setIsAligning] = useState(false)
  const [alignmentProgress, setAlignmentProgress] = useState<string>('')
  const [alignedTranscript, setAlignedTranscript] = useState<any>(null)
  
  // Music generation state
  const [musicPrompt, setMusicPrompt] = useState("")
  const [enhancedMusicPrompt, setEnhancedMusicPrompt] = useState("")
  const [isEnhancingMusicPrompt, setIsEnhancingMusicPrompt] = useState(false)
  const [musicDuration, setMusicDuration] = useState<number>(60)
  const [musicHasVocals, setMusicHasVocals] = useState<boolean>(true)
  const [musicIsInstrumental, setMusicIsInstrumental] = useState<boolean>(false)
  const [musicLanguage, setMusicLanguage] = useState<string>("en")
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false)
  const [musicGenerationProgress, setMusicGenerationProgress] = useState<string>('')
  
  // Sound effects generation state
  const [soundEffectPrompt, setSoundEffectPrompt] = useState("")
  const [soundEffectDuration, setSoundEffectDuration] = useState<number | null>(null) // null = auto
  const [soundEffectLooping, setSoundEffectLooping] = useState<boolean>(false)
  const [soundEffectPromptInfluence, setSoundEffectPromptInfluence] = useState<'high' | 'low'>('high')
  const [isGeneratingSoundEffect, setIsGeneratingSoundEffect] = useState(false)
  const [soundEffectGenerationProgress, setSoundEffectGenerationProgress] = useState<string>('')
  
  // Agent conversation state
  const [availableAgents, setAvailableAgents] = useState<any[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>("")
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [agentMessage, setAgentMessage] = useState("")
  const [agentConversation, setAgentConversation] = useState<Array<{role: 'user' | 'assistant' | 'system', content: string, audio?: string}>>([])
  const [isLoadingAgents, setIsLoadingAgents] = useState(false)
  const [isAgentResponding, setIsAgentResponding] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [showAgentSettings, setShowAgentSettings] = useState(false)
  
  // Agent configuration settings
  const [agentName, setAgentName] = useState("")
  const [agentSystemPrompt, setAgentSystemPrompt] = useState("")
  const [agentVoiceId, setAgentVoiceId] = useState("")
  const [agentLanguage, setAgentLanguage] = useState("en")
  const [agentModel, setAgentModel] = useState("")
  const [agentTools, setAgentTools] = useState<string[]>([])
  const [agentKnowledgeBase, setAgentKnowledgeBase] = useState<string[]>([])
  const [conversationFlow, setConversationFlow] = useState({
    turnTaking: true,
    interruptions: true,
    timeout: 30
  })
  const [agentPersonalization, setAgentPersonalization] = useState<Record<string, string>>({})
  const [agentPersonalizationRaw, setAgentPersonalizationRaw] = useState<string>("{}")
  const [isSavingAgentSettings, setIsSavingAgentSettings] = useState(false)
  
  // Card expansion state (multiple cards can be expanded at once)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  
  // Check authentication
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          await fetchUserCredits(user.id)
          await checkAdminStatus()
          await fetchAdminPreferences()
        }
      } catch (error) {
        console.error('Error getting user:', error)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserCredits(session.user.id)
        checkAdminStatus()
        fetchAdminPreferences()
      } else {
        setUserCredits(0)
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Audio player controls
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setAudioDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioUrl])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

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
      console.error('Error fetching credits:', error)
      setUserCredits(0)
    }
  }

  // Check admin status
  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setIsAdmin(false)
        return
      }

      const response = await fetch('/api/admin/check-role', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.isAdmin || false)
      } else {
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Admin check error:', error)
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
        setAdminPreferences(data.preferences)
        
        const prefs = data.preferences
        if (prefs.selected_audio_model) {
          setSelectedAudioModel(prefs.selected_audio_model)
        }
      }
    } catch (error) {
      console.error('Error fetching admin preferences:', error)
    }
  }

  // Fetch available voices for ElevenLabs
  const fetchAvailableVoices = async () => {
    if (selectedAudioModel !== 'elevenlabs') {
      setAvailableVoices([])
      return
    }

    try {
      setIsLoadingVoices(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/available-voices', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableVoices(data.voices || [])
        
        // Set default voice if available
        if (data.default_voice_id && !selectedVoiceId) {
          setSelectedVoiceId(data.default_voice_id)
        } else if (data.voices && data.voices.length > 0 && !selectedVoiceId) {
          setSelectedVoiceId(data.voices[0].id || data.voices[0].voice_id)
        }
      }
    } catch (error) {
      console.error('Error fetching voices:', error)
    } finally {
      setIsLoadingVoices(false)
    }
  }

  // Fetch voices when ElevenLabs is selected
  useEffect(() => {
    if (selectedAudioModel === 'elevenlabs' && user) {
      fetchAvailableVoices()
      fetchAvailableAgents()
    } else {
      setAvailableVoices([])
      setSelectedVoiceId("")
    }
  }, [selectedAudioModel, user])

  // Fetch available agents
  const fetchAvailableAgents = async () => {
    try {
      setIsLoadingAgents(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.log('No session token, skipping agent fetch')
        return
      }

      const response = await fetch('/api/elevenlabs/agents', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      
      if (response.ok) {
        // Handle different response structures
        const agents = data.agents || data || []
        console.log('Fetched agents:', agents)
        setAvailableAgents(Array.isArray(agents) ? agents : [])
        
        // Auto-select first agent if available
        const agentsArray = Array.isArray(agents) ? agents : []
        if (agentsArray.length > 0 && !selectedAgentId) {
          const firstAgent = agentsArray[0]
          const agentId = firstAgent.agent_id || firstAgent.id
          setSelectedAgentId(agentId)
          setSelectedAgent(firstAgent)
          loadAgentSettings(firstAgent)
        }
      } else {
        console.error('Error fetching agents:', data.error || data.message || 'Unknown error')
        setAvailableAgents([])
        // Show error to user if there's a specific error message
        if (data.error && !data.error.includes('not yet available')) {
          setError(data.error)
        }
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
      setAvailableAgents([])
    } finally {
      setIsLoadingAgents(false)
    }
  }

  // Start recording audio for agent
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' })
        await sendMessageToAgent(null, audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      setError('Failed to access microphone. Please check permissions.')
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  // Send message to agent
  const sendMessageToAgent = async (textMessage: string | null, audioBlob?: Blob) => {
    if (!selectedAgentId) {
      setError('Please select an agent')
      return
    }

    if (!textMessage && !audioBlob) {
      setError('Please enter a message or record audio')
      return
    }

    try {
      setIsAgentResponding(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const formData = new FormData()
      formData.append('agent_id', selectedAgentId)
      if (conversationId) {
        formData.append('conversation_id', conversationId)
      }
      if (textMessage) {
        formData.append('message', textMessage)
      }
      if (audioBlob) {
        formData.append('audio', audioBlob, 'audio.webm')
      }

      const response = await fetch('/api/elevenlabs/agents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Agent communication failed')
      }

      const data = await response.json()

      // Update conversation
      if (textMessage || audioBlob) {
        setAgentConversation(prev => [...prev, {
          role: 'user',
          content: textMessage || '[Audio message]',
          audio: audioBlob ? URL.createObjectURL(audioBlob) : undefined
        }])
      }

      if (data.response || data.audio) {
        setAgentConversation(prev => [...prev, {
          role: 'assistant',
          content: data.response || '[Audio response]',
          audio: data.audio
        }])

        // Set conversation ID if this is a new conversation
        if (data.conversation_id && !conversationId) {
          setConversationId(data.conversation_id)
        }

        // If agent responds with audio, play it
        if (data.audio) {
          setAudioUrl(data.audio)
          setSavedToLibrary(false) // Reset save status for new agent audio
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.load()
            }
          }, 100)
        }
      }

      setAgentMessage("")
    } catch (error: any) {
      console.error('Agent communication error:', error)
      setError(error.message || 'Failed to communicate with agent')
    } finally {
      setIsAgentResponding(false)
    }
  }

  // Handle text message send
  const handleSendAgentMessage = () => {
    if (agentMessage.trim()) {
      sendMessageToAgent(agentMessage)
    }
  }

  // Sync raw JSON string when personalization object changes
  useEffect(() => {
    setAgentPersonalizationRaw(JSON.stringify(agentPersonalization, null, 2))
  }, [agentPersonalization])

  // Load agent settings when agent is selected
  useEffect(() => {
    if (selectedAgentId && availableAgents.length > 0) {
      const agent = availableAgents.find(a => (a.agent_id || a.id) === selectedAgentId)
      if (agent) {
        setSelectedAgent(agent)
        loadAgentSettings(agent)
      }
    }
  }, [selectedAgentId, availableAgents])

  // Load agent settings from agent object or API
  const loadAgentSettings = async (agent: any) => {
    if (!agent) return

    // Set basic settings from agent object
    if (agent.name) setAgentName(agent.name)
    if (agent.system_prompt) setAgentSystemPrompt(agent.system_prompt)
    if (agent.voice_id) setAgentVoiceId(agent.voice_id)
    if (agent.language) setAgentLanguage(agent.language)
    if (agent.model_id || agent.model) setAgentModel(agent.model_id || agent.model)
    if (agent.tools) setAgentTools(Array.isArray(agent.tools) ? agent.tools : [])
    if (agent.knowledge_base) setAgentKnowledgeBase(Array.isArray(agent.knowledge_base) ? agent.knowledge_base : [])
    if (agent.conversation_flow) {
      setConversationFlow({
        turnTaking: agent.conversation_flow.turn_taking !== false,
        interruptions: agent.conversation_flow.allow_interruptions !== false,
        timeout: agent.conversation_flow.timeout_seconds || 30
      })
    }
    if (agent.personalization) setAgentPersonalization(agent.personalization || {})

    // Try to fetch detailed settings from API if agent_id is available
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token || (!agent.agent_id && !agent.id)) return

      const response = await fetch(`/api/elevenlabs/agents/${agent.agent_id || agent.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.system_prompt) setAgentSystemPrompt(data.system_prompt)
        if (data.voice_id) setAgentVoiceId(data.voice_id)
        if (data.language) setAgentLanguage(data.language)
        if (data.model_id || data.model) setAgentModel(data.model_id || data.model)
        if (data.tools) setAgentTools(Array.isArray(data.tools) ? data.tools : [])
        if (data.knowledge_base) setAgentKnowledgeBase(Array.isArray(data.knowledge_base) ? data.knowledge_base : [])
        if (data.conversation_flow) {
          setConversationFlow({
            turnTaking: data.conversation_flow.turn_taking !== false,
            interruptions: data.conversation_flow.allow_interruptions !== false,
            timeout: data.conversation_flow.timeout_seconds || 30
          })
        }
        if (data.personalization) setAgentPersonalization(data.personalization || {})
      }
    } catch (error) {
      console.error('Error loading agent settings:', error)
      // Continue with settings from agent object
    }
  }

  // Save agent settings (create or update)
  const saveAgentSettings = async () => {
    const isCreating = selectedAgentId === 'new' || !selectedAgentId
    
    if (isCreating) {
      // Validate required fields for creation
      if (!agentName.trim()) {
        setError('Agent name is required')
        return
      }
      if (!agentSystemPrompt.trim()) {
        setError('System prompt is required')
        return
      }
    } else {
      if (!selectedAgentId) {
        setError('No agent selected')
        return
      }
    }

    try {
      setIsSavingAgentSettings(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      if (isCreating) {
        // Create new agent
        const createData = {
          name: agentName.trim(),
          system_prompt: agentSystemPrompt,
          voice_id: agentVoiceId || null,
          language: agentLanguage,
          model_id: agentModel || null,
          tools: agentTools,
          knowledge_base: agentKnowledgeBase,
          conversation_flow: conversationFlow,
          personalization: agentPersonalization
        }

        const response = await fetch('/api/elevenlabs/agents/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(createData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create agent')
        }

        const data = await response.json()
        const newAgentId = data.agent_id || data.agent?.agent_id || data.agent?.id

        // Show success message
        alert('Agent created successfully!')
        
        // Refresh agents and select the new one
        await fetchAvailableAgents()
        if (newAgentId) {
          setSelectedAgentId(newAgentId)
        }
      } else {
        // Update existing agent
        const settings = {
          agent_id: selectedAgentId,
          system_prompt: agentSystemPrompt,
          voice_id: agentVoiceId || null,
          language: agentLanguage,
          model_id: agentModel || null,
          tools: agentTools,
          knowledge_base: agentKnowledgeBase,
          conversation_flow: conversationFlow,
          personalization: agentPersonalization
        }

        const response = await fetch(`/api/elevenlabs/agents/${selectedAgentId}/settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(settings)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to save settings')
        }

        // Show success message
        alert('Agent settings saved successfully!')
        
        // Refresh agents to get updated data
        await fetchAvailableAgents()
      }
    } catch (error: any) {
      console.error('Save settings error:', error)
      setError(error.message || 'Failed to save agent settings')
    } finally {
      setIsSavingAgentSettings(false)
    }
  }

  // Handle voice cloning
  const handleVoiceClone = async () => {
    if (!cloneName.trim() || cloneFiles.length === 0) {
      setError('Please provide a name and at least one audio file')
      return
    }

    try {
      setIsCloningVoice(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const formData = new FormData()
      formData.append('name', cloneName)
      formData.append('clone_type', cloneType)
      cloneFiles.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch('/api/elevenlabs/voice-clone', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Voice cloning failed')
      }

      const data = await response.json()
      
      // Refresh voices list
      await fetchAvailableVoices()
      
      // Reset form
      setCloneName("")
      setCloneFiles([])
      setShowVoiceCreator(false)
      
      setError(null)
      // Show success message (you could use a toast here)
      alert(data.message || 'Voice cloned successfully!')
    } catch (error: any) {
      console.error('Voice cloning error:', error)
      setError(error.message || 'Failed to clone voice')
    } finally {
      setIsCloningVoice(false)
    }
  }

  // Handle voice design
  const handleVoiceDesign = async () => {
    if (!voiceDesignDescription.trim() || !voiceDesignText.trim()) {
      setError('Please provide both description and preview text')
      return
    }

    if (voiceDesignDescription.length < 20 || voiceDesignDescription.length > 1000) {
      setError('Description must be between 20 and 1000 characters')
      return
    }

    if (voiceDesignText.length < 100 || voiceDesignText.length > 1000) {
      setError('Preview text must be between 100 and 1000 characters')
      return
    }

    try {
      setIsDesigningVoice(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch('/api/elevenlabs/voice-design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          description: voiceDesignDescription,
          text: voiceDesignText,
          model_id: selectedElevenLabsModel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Voice design failed')
      }

      const data = await response.json()
      
      // Refresh voices list
      await fetchAvailableVoices()
      
      // Reset form
      setVoiceDesignDescription("")
      setVoiceDesignText("")
      setShowVoiceCreator(false)
      
      setError(null)
      alert(data.message || 'Voice designed successfully!')
    } catch (error: any) {
      console.error('Voice design error:', error)
      setError(error.message || 'Failed to design voice')
    } finally {
      setIsDesigningVoice(false)
    }
  }

  // Handle file selection for cloning
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCloneFiles(Array.from(e.target.files))
    }
  }

  // Handle voice changer
  const handleVoiceChange = async () => {
    if (!voiceChangerFile || !selectedVoiceId) {
      setError('Please select an audio file and a target voice')
      return
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (voiceChangerFile.size > maxSize) {
      setError('Audio file is too large. Maximum size is 50MB.')
      return
    }

    try {
      setIsChangingVoice(true)
      setError(null)
      setChangedVoiceUrl(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const formData = new FormData()
      formData.append('audio', voiceChangerFile)
      formData.append('voice_id', selectedVoiceId)
      formData.append('model_id', voiceChangerModel)
      formData.append('stability', voiceChangerStability.toString())
      formData.append('style', voiceChangerStyle.toString())
      formData.append('remove_background_noise', voiceChangerRemoveNoise.toString())

      const response = await fetch('/api/elevenlabs/voice-changer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Voice change failed')
      }

      const data = await response.json()
      
      setChangedVoiceUrl(data.audioUrl || data.audio)
      setError(null)
      
      // Set the audio URL to play it
      if (data.audioUrl || data.audio) {
        setAudioUrl(data.audioUrl || data.audio)
        setSavedToLibrary(false) // Reset save status for new voice-changed audio
      }
      
    } catch (error: any) {
      console.error('Voice changer error:', error)
      setError(error.message || 'Failed to change voice')
    } finally {
      setIsChangingVoice(false)
    }
  }

  // Handle voice changer file selection
  const handleVoiceChangerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVoiceChangerFile(e.target.files[0])
    }
  }

  // Handle dubbing file selection
  const handleDubbingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDubbingFile(e.target.files[0])
    }
  }

  // Handle voice isolator file selection
  const handleVoiceIsolatorFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVoiceIsolatorFile(e.target.files[0])
    }
  }

  // Handle forced alignment file selection
  const handleForcedAlignmentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForcedAlignmentFile(e.target.files[0])
    }
  }

  // Handle forced alignment
  const handleForcedAlignment = async () => {
    if (!forcedAlignmentFile) {
      setError('Please select an audio file')
      return
    }

    if (!forcedAlignmentText.trim()) {
      setError('Please enter the transcript text')
      return
    }

    // Check text length (max 675k characters)
    if (forcedAlignmentText.length > 675000) {
      setError('Transcript text is too long. Maximum is 675,000 characters.')
      return
    }

    // Check file size (max 3GB)
    const maxSize = 3 * 1024 * 1024 * 1024; // 3GB
    if (forcedAlignmentFile.size > maxSize) {
      setError('File is too large. Maximum size is 3GB.')
      return
    }

    try {
      setIsAligning(true)
      setError(null)
      setAlignedTranscript(null)
      setAlignmentProgress('Preparing forced alignment...')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      setAlignmentProgress('Aligning audio with transcript...')

      const formData = new FormData()
      formData.append('audio', forcedAlignmentFile)
      formData.append('text', forcedAlignmentText)
      formData.append('language', forcedAlignmentLanguage)

      const response = await fetch('/api/elevenlabs/forced-alignment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Forced alignment failed')
      }

      const data = await response.json()

      if (data.success && data.transcript) {
        setAlignedTranscript(data.transcript)
        setAlignmentProgress('Forced alignment completed successfully!')
      } else {
        throw new Error('No aligned transcript returned')
      }
    } catch (error: any) {
      console.error('Forced alignment error:', error)
      setError(error.message || 'Failed to align audio with transcript')
      setAlignmentProgress('')
    } finally {
      setIsAligning(false)
    }
  }

  // Handle voice isolation
  const handleVoiceIsolation = async () => {
    if (!voiceIsolatorFile) {
      setError('Please select an audio or video file to isolate voice from')
      return
    }

    // Check file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (voiceIsolatorFile.size > maxSize) {
      setError('File is too large. Maximum size is 500MB.')
      return
    }

    try {
      setIsIsolatingVoice(true)
      setError(null)
      setIsolatedVoiceUrl(null)
      setVoiceIsolationProgress('Preparing voice isolation...')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      setVoiceIsolationProgress('Isolating speech from background noise...')

      const formData = new FormData()
      formData.append('file', voiceIsolatorFile)

      const response = await fetch('/api/elevenlabs/voice-isolator', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Voice isolation failed')
      }

      const data = await response.json()

      if (data.success && (data.url || data.isolatedUrl || data.audioUrl)) {
        const url = data.url || data.isolatedUrl || data.audioUrl
        setIsolatedVoiceUrl(url)
        setVoiceIsolationProgress('Voice isolation completed successfully!')
        setSavedToLibrary(false) // Reset save status for new isolated audio
        
        // If it's audio, set it to play
        if (voiceIsolatorFile.type.startsWith('audio/')) {
          setAudioUrl(url)
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.load()
            }
          }, 100)
        }
      } else {
        throw new Error('No isolated audio URL returned')
      }
    } catch (error: any) {
      console.error('Voice isolation error:', error)
      setError(error.message || 'Failed to isolate voice')
      setVoiceIsolationProgress('')
    } finally {
      setIsIsolatingVoice(false)
    }
  }

  // Handle dubbing
  const handleDubbing = async () => {
    if (!dubbingFile) {
      setError('Please select an audio or video file to dub')
      return
    }

    if (dubbingSourceLanguage === dubbingTargetLanguage) {
      setError('Source and target languages must be different')
      return
    }

    // Check file size (max 1GB for API, 500MB for UI)
    const maxSize = 500 * 1024 * 1024; // 500MB for UI
    if (dubbingFile.size > maxSize) {
      setError('File is too large. Maximum size is 500MB for UI (1GB via API).')
      return
    }

    try {
      setIsDubbing(true)
      setError(null)
      setDubbingUrl(null)
      setDubbingProgress('Preparing dubbing...')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      setDubbingProgress('Uploading file and processing...')

      const formData = new FormData()
      formData.append('file', dubbingFile)
      formData.append('source_language', dubbingSourceLanguage)
      formData.append('target_language', dubbingTargetLanguage)
      if (dubbingUseWatermark && dubbingFile.type.startsWith('video/')) {
        formData.append('use_watermark', 'true')
      }

      const response = await fetch('/api/elevenlabs/dubbing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Dubbing failed')
      }

      const data = await response.json()

      if (data.success && (data.url || data.dubbedUrl || data.audioUrl)) {
        const url = data.url || data.dubbedUrl || data.audioUrl
        setDubbingUrl(url)
        setDubbingProgress('Dubbing completed successfully!')
        setSavedToLibrary(false) // Reset save status for new dubbed content
        
        // If it's audio, set it to play
        if (dubbingFile.type.startsWith('audio/')) {
          setAudioUrl(url)
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.load()
            }
          }, 100)
        }
      } else {
        throw new Error('No dubbed file URL returned')
      }
    } catch (error: any) {
      console.error('Dubbing error:', error)
      setError(error.message || 'Failed to dub file')
      setDubbingProgress('')
    } finally {
      setIsDubbing(false)
    }
  }

  // Enhance music prompt with LLM
  const enhanceMusicPromptWithLLM = async () => {
    if (!musicPrompt.trim()) {
      setError('Please enter a music prompt first')
      return
    }

    try {
      setIsEnhancingMusicPrompt(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Please log in to enhance prompts')
      }

      // Call LLM to enhance the music prompt
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt: `You are an expert music prompt engineer specializing in AI music generation. Enhance the following music generation prompt to be more detailed, specific, and effective. Focus on:
1. Genre and style specifications (be specific: "electronic" → "progressive house with deep bass and melodic synths")
2. Musical elements (tempo, key, rhythm patterns, instrumentation)
3. Mood and emotion (energetic, melancholic, uplifting, etc.)
4. Production details (mixing style, effects, spatial elements)
5. Reference artists or musical eras when appropriate
6. Dynamics and structure (build-up, drop, breakdown sections)
7. Vocal characteristics (if vocals are desired: style, gender, language, effects)

Original prompt: "${musicPrompt}"
${musicHasVocals ? 'Note: Vocals are enabled for this track.' : ''}
${musicIsInstrumental ? 'Note: This should be instrumental only, no vocals.' : ''}
Language: ${musicLanguage}

Return ONLY the enhanced prompt without any explanation or extra text. Make it detailed but concise (150-300 words ideal).`,
          mode: selectedLLM,
          temperature: 0.8,
          max_tokens: 400,
          response_style: 'detailed'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to enhance prompt')
      }

      const data = await response.json()
      const enhanced = data.output || data.response || ''
      
      setEnhancedMusicPrompt(enhanced.trim())
      // Auto-copy to main prompt
      setMusicPrompt(enhanced.trim())
    } catch (error: any) {
      console.error('Music prompt enhancement error:', error)
      setError(error.message || 'Failed to enhance music prompt')
    } finally {
      setIsEnhancingMusicPrompt(false)
    }
  }

  // Handle music generation
  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim()) {
      setError('Please enter a music prompt')
      return
    }

    if (musicDuration < 10 || musicDuration > 300) {
      setError('Duration must be between 10 and 300 seconds (5 minutes)')
      return
    }

    try {
      setIsGeneratingMusic(true)
      setError(null)
      setAudioUrl(null)
      setMusicGenerationProgress('Preparing music generation...')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      setMusicGenerationProgress('Generating studio-grade music...')

      const response = await fetch('/api/elevenlabs/music', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt: musicPrompt,
          duration: musicDuration,
          vocals: musicHasVocals && !musicIsInstrumental,
          instrumental: musicIsInstrumental,
          language: musicLanguage,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Music generation failed')
      }

      const data = await response.json()

      if (data.success && (data.audioUrl || data.audio)) {
        const url = data.audioUrl || data.audio
        setAudioUrl(url)
        setMusicGenerationProgress('Music generated successfully!')
        setSavedToLibrary(false) // Reset save status for new music
        
        // Auto-play if user wants
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.load()
          }
        }, 100)
      } else {
        throw new Error('No audio URL returned')
      }
    } catch (error: any) {
      console.error('Music generation error:', error)
      setError(error.message || 'Failed to generate music')
      setMusicGenerationProgress('')
    } finally {
      setIsGeneratingMusic(false)
    }
  }

  // Generate sound effects
  const handleGenerateSoundEffect = async () => {
    if (!soundEffectPrompt.trim()) {
      setError('Please enter a sound effect description')
      return
    }

    if (soundEffectDuration !== null && (soundEffectDuration < 0.1 || soundEffectDuration > 30)) {
      setError('Duration must be between 0.1 and 30 seconds')
      return
    }

    try {
      setIsGeneratingSoundEffect(true)
      setError(null)
      setAudioUrl(null)
      setSoundEffectGenerationProgress('Preparing sound effect generation...')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      setSoundEffectGenerationProgress('Generating high-quality sound effect...')

      const requestBody: any = {
        prompt: soundEffectPrompt,
        prompt_influence: soundEffectPromptInfluence,
      }

      if (soundEffectDuration !== null) {
        requestBody.duration = soundEffectDuration
      }

      if (soundEffectLooping) {
        requestBody.looping = true
      }

      const response = await fetch('/api/elevenlabs/sound-effects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Sound effect generation failed')
      }

      const data = await response.json()

      if (data.success && (data.audioUrl || data.audio)) {
        const url = data.audioUrl || data.audio
        setAudioUrl(url)
        setSoundEffectGenerationProgress('Sound effect generated successfully!')
        setSavedToLibrary(false) // Reset save status for new sound effect
        
        // Auto-play if user wants
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.load()
          }
        }, 100)
      } else {
        throw new Error('No audio URL returned')
      }
    } catch (error: any) {
      console.error('Sound effect generation error:', error)
      setError(error.message || 'Failed to generate sound effect')
      setSoundEffectGenerationProgress('')
    } finally {
      setIsGeneratingSoundEffect(false)
    }
  }

  // Generate text from prompt
  const handleGenerateText = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for text generation')
      return
    }
    
    if (!user) {
      setError('Please log in to generate text')
      return
    }

    try {
      setIsGeneratingText(true)
      setIsStreaming(true)
      setError(null)
      setGeneratedText("")
      setTextGenerationProgress('Preparing text generation...')
      setTextProgressPercentage(5)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }
      
      setTextGenerationProgress('Sending request to AI...')
      setTextProgressPercentage(10)

      // Check if model requires streaming (most do)
      const streamingModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o1-preview']
      const useStreaming = streamingModels.includes(selectedTextModel)
      
      if (useStreaming) {
        // Use streaming API
        const response = await fetch('/api/generate-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            prompt: prompt,
            mode: selectedTextModel,
            temperature: 0.7,
            max_tokens: 2000,
            response_style: 'detailed'
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Text generation failed')
        }

        // Handle streaming response
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        
        if (!reader) {
          throw new Error('No response body')
        }

        setTextGenerationProgress('Generating response...')
        setTextProgressPercentage(30)

        let fullText = ""
        let buffer = ""
        
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            break
          }
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          
          for (const line of lines) {
            if (!line || line.trim() === '') continue
            
            if (line.startsWith('data: ')) {
              let content = line.slice(6)
              content = content.replace(/\r?\n$/, '')
              
              if (content.trim() === '[DONE]') {
                break
              }
              
              if (!content || content.trim() === '') continue
              
              fullText += content
              setGeneratedText(fullText)
              setTextProgressPercentage(Math.min(30 + (fullText.length / 50), 90))
            } else if (line.trim() === 'event: done' || line.includes('event: done')) {
              break
            }
          }
        }
        
        if (buffer) {
          const trimmedBuffer = buffer.trim()
          if (trimmedBuffer.startsWith('data: ')) {
            const text = trimmedBuffer.slice(6)
            if (text && text.trim() !== '[DONE]') {
              fullText += text
              setGeneratedText(fullText)
            }
          }
        }

        if (fullText.trim()) {
          setGeneratedText(fullText.trim())
          setTextGenerationProgress('Text generated successfully!')
          setTextProgressPercentage(100)
        } else {
          throw new Error('No text was generated. Please try again.')
        }
      } else {
        // Use non-streaming API for local models
        setTextGenerationProgress('Generating response...')
        setTextProgressPercentage(30)

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            prompt: prompt,
            mode: selectedTextModel,
            temperature: 0.7,
            max_tokens: 2000,
            response_style: 'detailed'
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Text generation failed')
        }

        const data = await response.json()
        const generated = data.output || data.response || data.generated || ''
        
        if (generated.trim()) {
          setGeneratedText(generated.trim())
          setTextGenerationProgress('Text generated successfully!')
          setTextProgressPercentage(100)
        } else {
          throw new Error('No text was generated. Please try again.')
        }
      }

      // Refresh credits after generation
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    } catch (error: any) {
      console.error('Text generation error:', error)
      setError(error.message || 'Failed to generate text')
      setTextGenerationProgress('')
      setTextProgressPercentage(0)
    } finally {
      setIsGeneratingText(false)
      setIsStreaming(false)
    }
  }

  // Copy generated text to audio textarea
  const copyToAudioTextarea = () => {
    if (generatedText.trim()) {
      setText(generatedText.trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Copy generated text
  const copyGeneratedText = async () => {
    try {
      await navigator.clipboard.writeText(generatedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Enhance text with LLM
  const enhanceTextWithLLM = async () => {
    if (!text.trim()) {
      setError('Please enter text first')
      return
    }

    try {
      setIsEnhancingText(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Please log in to enhance text')
      }

      // Call LLM to enhance the text for better speech
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt: `You are an expert at writing natural-sounding speech text. Improve the following text to sound more natural when spoken aloud. Focus on:
1. Natural phrasing and flow
2. Clear pronunciation cues
3. Appropriate pacing
4. Conversational tone

Original text: "${text}"

Return ONLY the enhanced text without any explanation or extra text.`,
          mode: selectedLLM,
          temperature: 0.7,
          max_tokens: 500,
          response_style: 'natural'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to enhance text')
      }

      const data = await response.json()
      const enhanced = data.output || data.response || ''
      
      setEnhancedText(enhanced.trim())
      // Auto-copy to main text
      setText(enhanced.trim())
    } catch (error: any) {
      console.error('Text enhancement error:', error)
      setError(error.message || 'Failed to enhance text')
    } finally {
      setIsEnhancingText(false)
    }
  }

  // Check if model is enabled (for non-admins)
  const isModelEnabled = (modelKey: string) => {
    if (isAdmin) return true
    if (!adminPreferences) return true
    return adminPreferences[`model_${modelKey}`] !== false
  }

  // Generate audio
  const handleGenerateAudio = async () => {
    if (!text.trim()) {
      setError('Please enter text for audio generation')
      return
    }
    
    if (!user) {
      setError('Please log in to generate audio')
      return
    }

    try {
      setIsGeneratingAudio(true)
      setError(null)
      setAudioUrl(null)
      setAudioGenerationProgress('Preparing audio generation...')
      setProgressPercentage(5)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }
      
      setAudioGenerationProgress('Checking API configuration...')
      setProgressPercentage(10)

      // Calculate credits based on character count (48 credits per 1000 chars, minimum 5 credits)
      const charCount = text.length
      const requiredCredits = Math.max(5, Math.ceil((charCount / 1000) * 48))
      
      // Note: Currently audio is free, but we can enable credit checking later
      // const creditResponse = await fetch('/api/credits/check', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${session.access_token}`
      //   },
      //   body: JSON.stringify({
      //     requiredCredits: requiredCredits,
      //     operation: 'check_and_deduct'
      //   })
      // })

      setAudioGenerationProgress('Generating speech...')
      setProgressPercentage(30)
      
      // Simulate progress during API call
      const progressInterval = setInterval(() => {
        setProgressPercentage(prev => Math.min(prev + 5, 90))
      }, 500)
      
      // Build request body based on selected model
      const requestBody: any = {
        text: text,
      }

      // Add ElevenLabs-specific parameters
      if (selectedAudioModel === 'elevenlabs') {
        if (selectedVoiceId) {
          requestBody.voice_id = selectedVoiceId
        }
        requestBody.model_id = selectedElevenLabsModel
        requestBody.stability = stability
        requestBody.similarity_boost = similarityBoost
        requestBody.style = style
        requestBody.use_speaker_boost = useSpeakerBoost
      } else {
        requestBody.model = selectedAudioModel
      }

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody),
      })
      
      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        let errorMessage = errorData.error || 'Audio generation failed'
        
        if (errorMessage.includes('API key not found')) {
          errorMessage = 'ElevenLabs API key not configured. Please set it up in AI Settings.'
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (data.success && (data.audioUrl || data.audio)) {
        const url = data.audioUrl || data.audio
        setAudioUrl(url)
        setAudioGenerationProgress('Audio generated successfully!')
        setProgressPercentage(100)
        setSavedToLibrary(false) // Reset save status for new audio
        
        // Auto-play if user wants
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.load()
          }
        }, 100)
      } else {
        throw new Error('No audio URL returned')
      }
    } catch (error: any) {
      console.error('Audio generation error:', error)
      setError(error.message || 'Failed to generate audio')
      setAudioGenerationProgress('')
      setProgressPercentage(0)
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const handleSaveToLibrary = async () => {
    if (!audioUrl || !text.trim() || !user) {
      setError('Cannot save: Missing audio URL, text, or user session')
      return
    }

    try {
      setIsSavingToLibrary(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch('/api/generations/save-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          mediaUrl: audioUrl,
          mediaType: 'audio',
          prompt: text,
          model: selectedAudioModel
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save to library')
      }

      const data = await response.json()
      setSavedToLibrary(true)
      
      // Show success message briefly
      setTimeout(() => {
        // Keep saved state visible
      }, 2000)
    } catch (error: any) {
      console.error('Save to library error:', error)
      setError(error.message || 'Failed to save audio to library')
    } finally {
      setIsSavingToLibrary(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // Get audio model display info
  // Get character limit for selected ElevenLabs model
  const getElevenLabsCharLimit = (model: string): number => {
    const limits: Record<string, number> = {
      'eleven_multilingual_v2': 10000,
      'eleven_turbo_v2_5': 40000,
      'eleven_flash_v2_5': 40000,
      'eleven_v3': 3000,
      'eleven_turbo_v2': 40000,
      'eleven_monolingual_v1': 10000
    }
    return limits[model] || 10000
  }

  const getAudioModelInfo = (model: string) => {
    const models: Record<string, { cost: string, features: string }> = {
      'elevenlabs': { 
        cost: '48 credits/1K chars', 
        features: 'High-quality natural speech with advanced voice control'
      },
      'google_tts': { 
        cost: 'TBD', 
        features: 'Google Text-to-Speech'
      },
      'amazon_polly': { 
        cost: 'TBD', 
        features: 'Amazon Polly TTS'
      },
      'openai_tts': { 
        cost: 'TBD', 
        features: 'OpenAI Text-to-Speech'
      }
    }
    return models[model] || { cost: '48 credits/1K chars', features: 'High-quality generation' }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="relative min-h-screen w-full">
      <div className="aztec-background" />
      <div className="animated-grid" />

      <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          {/* Navigation */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Link href="/" className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Home</span>
            </Link>
            <Link href="/library" className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10">
              <BookUser className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Library</span>
            </Link>
            <Link
              href="/memory-core"
              className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
            >
              <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Memory</span>
            </Link>
          </div>

          {/* User Actions */}
          {user ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {isAdmin && (
                <button
                  onClick={() => setShowPanels(!showPanels)}
                  className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
                >
                  {showPanels ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  <span className="hidden sm:inline text-sm">{showPanels ? 'Hide Panels' : 'Show Panels'}</span>
                </button>
              )}
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
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Link
                href="/login"
                className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <span className="text-sm">Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <span className="text-sm">Sign Up</span>
              </Link>
            </div>
          )}
        </header>

        {/* Main Content */}
        {showPanels && isAdmin ? (
          <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
            {/* Left Panel */}
            <div className="hidden lg:block lg:col-span-3 space-y-6">
              <HudPanel title="Audio Generation Core">
                <p className="flex items-center gap-2">
                  <AztecIcon name="sun-stone" className="text-cyan-400 animate-icon-pulse" /> 
                  Model Status: <span className="text-green-400">ACTIVE</span>
                </p>
                <p className="flex items-center gap-2">
                  <AztecIcon name="sun-stone" className="text-cyan-400 animate-icon-pulse" /> 
                  Audio Model: <span className="text-white">{selectedAudioModel.toUpperCase()}</span>
                </p>
                <p className="flex items-center gap-2">
                  <AztecIcon name="sun-stone" className="text-cyan-400 animate-icon-pulse" /> 
                  Text Model: <span className="text-white">{selectedTextModel.toUpperCase()}</span>
                </p>
                {selectedAudioModel === 'elevenlabs' && selectedVoiceId && (
                  <p className="text-xs text-gray-400 mt-1">
                    Voice ID: {selectedVoiceId.substring(0, 20)}...
                  </p>
                )}
              </HudPanel>
              
              <HudPanel title="Generation Status">
                {isGeneratingText ? (
                  <>
                    <p className="flex items-center gap-2 text-cyan-400">
                      <AztecIcon name="serpent" className="text-cyan-400 animate-icon-pulse" /> 
                      Generating Text...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {textGenerationProgress || 'Processing request'}
                    </p>
                    <p className="text-xs text-yellow-400 mt-1">
                      Progress: {textProgressPercentage}%
                    </p>
                  </>
                ) : isGeneratingAudio ? (
                  <>
                    <p className="flex items-center gap-2 text-purple-400">
                      <AztecIcon name="serpent" className="text-purple-400 animate-icon-pulse" /> 
                      Generating Audio...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {audioGenerationProgress || 'Processing request'}
                    </p>
                    <p className="text-xs text-yellow-400 mt-1">
                      Progress: {progressPercentage}%
                    </p>
                  </>
                ) : generatedText || audioUrl ? (
                  <p className="flex items-center gap-2 text-green-400">
                    <AztecIcon name="serpent" className="text-green-400 animate-icon-pulse" /> 
                    Ready
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-gray-500">
                    <AztecIcon name="serpent" className="text-gray-500" /> 
                    Awaiting Generation
                  </p>
                )}
              </HudPanel>
            </div>

            {/* Center Panel - Main Content */}
            <div className="flex flex-col space-y-6 col-span-1 lg:col-span-6">
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  <span className="text-cyan-400">🔊</span>{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-600">
                    AUDIO MODE
                  </span>
                </h1>
                <p className="text-gray-300 text-lg">
                  AI-powered text-to-speech generation with natural voices
                </p>
              </div>

              <div className="max-w-full space-y-6">
            {/* Model Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Text Generation Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-5 w-5 text-cyan-400" />
                  <span className="text-cyan-400 text-sm font-semibold uppercase">Text Generation Model</span>
                </div>
                <Select value={selectedTextModel} onValueChange={setSelectedTextModel}>
                  <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                    {isModelEnabled('gpt-4o') && <SelectItem value="gpt-4o" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4O</SelectItem>}
                    {isModelEnabled('gpt-4o-mini') && <SelectItem value="gpt-4o-mini" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4O MINI</SelectItem>}
                    {isModelEnabled('gpt-4-turbo') && <SelectItem value="gpt-4-turbo" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4 TURBO</SelectItem>}
                    {isModelEnabled('gpt-4') && <SelectItem value="gpt-4" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4</SelectItem>}
                    {isModelEnabled('gpt-3.5-turbo') && <SelectItem value="gpt-3.5-turbo" className="text-cyan-300 hover:bg-cyan-500/20">GPT-3.5 TURBO</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-cyan-400 text-xs mt-2">
                  Generates text from prompts
                </p>
              </div>

              {/* LLM Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit className="h-5 w-5 text-cyan-400" />
                  <span className="text-cyan-400 text-sm font-semibold uppercase">Text Enhancement Model</span>
                </div>
                <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                  <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md">
                    <SelectItem value="gpt-4o" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4O</SelectItem>
                    <SelectItem value="gpt-4o-mini" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4O MINI</SelectItem>
                    <SelectItem value="gpt-4-turbo" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4 TURBO</SelectItem>
                    <SelectItem value="gpt-4" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo" className="text-cyan-300 hover:bg-cyan-500/20">GPT-3.5 TURBO</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-cyan-400 text-xs mt-2">
                  Enhances your text for natural speech
                </p>
              </div>

              {/* Audio Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 className="h-5 w-5 text-cyan-400" />
                  <span className="text-cyan-400 text-sm font-semibold uppercase">Text-to-Speech Model</span>
                </div>
                <Select value={selectedAudioModel} onValueChange={setSelectedAudioModel}>
                  <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                    {isModelEnabled('elevenlabs') && <SelectItem value="elevenlabs" className="text-cyan-300 hover:bg-cyan-500/20">ELEVENLABS</SelectItem>}
                    {isModelEnabled('google_tts') && <SelectItem value="google_tts" className="text-cyan-300 hover:bg-cyan-500/20">GOOGLE TTS</SelectItem>}
                    {isModelEnabled('amazon_polly') && <SelectItem value="amazon_polly" className="text-cyan-300 hover:bg-cyan-500/20">AMAZON POLLY</SelectItem>}
                    {isModelEnabled('openai_tts') && <SelectItem value="openai_tts" className="text-cyan-300 hover:bg-cyan-500/20">OPENAI TTS</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-cyan-400 text-xs mt-2">
                  {getAudioModelInfo(selectedAudioModel).cost} • {getAudioModelInfo(selectedAudioModel).features}
                </p>
              </div>
            </div>

            {/* Music Generation Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-purple-500/30 shadow-purple-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('music-generator')) {
                        newSet.delete('music-generator')
                      } else {
                        newSet.add('music-generator')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-purple-400" />
                    <h2 className="text-xl font-semibold text-white">🎵 Eleven Music Generator</h2>
                  </div>
                  {expandedCards.has('music-generator') ? (
                    <ChevronUp className="h-5 w-5 text-purple-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-purple-400" />
                  )}
                </div>

                {expandedCards.has('music-generator') && (
                  <>
                    <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 mb-4">
                  <p className="text-xs text-purple-300">
                    🎼 Create studio-grade music with natural language prompts. Supports vocals, instrumental, 
                    multiple languages, and duration from 10 seconds to 5 minutes. 
                    <strong className="ml-1">Commercial use cleared!</strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-purple-400 text-sm font-semibold">Music Prompt</label>
                      <Button
                        onClick={enhanceMusicPromptWithLLM}
                        disabled={isEnhancingMusicPrompt || !musicPrompt.trim()}
                        variant="outline"
                        size="sm"
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                      >
                        {isEnhancingMusicPrompt ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-400/40 border-t-purple-400 mr-2"></div>
                            Enhancing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-2" />
                            Enhance Prompt
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={musicPrompt}
                      onChange={(e) => setMusicPrompt(e.target.value)}
                      placeholder="Describe the music you want (e.g., 'Upbeat electronic dance music with synthesizers and bass drops', 'Acoustic guitar ballad with emotional vocals', 'Jazzy piano piece in the style of Thelonious Monk')"
                      className="w-full bg-black/30 border-purple-500/50 text-white placeholder-gray-500 min-h-[120px]"
                    />
                    {enhancedMusicPrompt && enhancedMusicPrompt !== musicPrompt && (
                      <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-purple-300 font-semibold">✨ Enhanced Prompt:</p>
                          <Button
                            onClick={() => setMusicPrompt(enhancedMusicPrompt)}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-purple-400 hover:text-purple-300"
                          >
                            Use Enhanced
                          </Button>
                        </div>
                        <p className="text-xs text-purple-200">{enhancedMusicPrompt}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      💡 <strong>Tip:</strong> Click "Enhance Prompt" to automatically improve your prompt with AI. Describe the genre, style, mood, instruments, vocals, and any other musical characteristics.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Duration */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-purple-400 text-sm font-semibold">Duration (seconds)</label>
                        <span className="text-purple-300 text-sm">{musicDuration}s</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="300"
                        step="5"
                        value={musicDuration}
                        onChange={(e) => setMusicDuration(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-purple-400/70">
                        <span>10s</span>
                        <span>5min</span>
                      </div>
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                      <label className="text-purple-400 text-sm font-semibold">Language</label>
                      <Select value={musicLanguage} onValueChange={setMusicLanguage}>
                        <SelectTrigger className="bg-transparent border-purple-500/50 text-purple-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-purple-500/50">
                          <SelectItem value="en" className="text-purple-300 hover:bg-purple-500/20">English</SelectItem>
                          <SelectItem value="es" className="text-purple-300 hover:bg-purple-500/20">Spanish</SelectItem>
                          <SelectItem value="de" className="text-purple-300 hover:bg-purple-500/20">German</SelectItem>
                          <SelectItem value="ja" className="text-purple-300 hover:bg-purple-500/20">Japanese</SelectItem>
                          <SelectItem value="fr" className="text-purple-300 hover:bg-purple-500/20">French</SelectItem>
                          <SelectItem value="it" className="text-purple-300 hover:bg-purple-500/20">Italian</SelectItem>
                          <SelectItem value="pt" className="text-purple-300 hover:bg-purple-500/20">Portuguese</SelectItem>
                          <SelectItem value="zh" className="text-purple-300 hover:bg-purple-500/20">Chinese</SelectItem>
                          <SelectItem value="ko" className="text-purple-300 hover:bg-purple-500/20">Korean</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Vocals/Instrumental Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-purple-500/20">
                      <div>
                        <label className="text-purple-400 text-sm font-semibold">With Vocals</label>
                        <p className="text-xs text-gray-400">Include vocal tracks</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={musicHasVocals}
                          onChange={(e) => {
                            setMusicHasVocals(e.target.checked)
                            if (e.target.checked) setMusicIsInstrumental(false)
                          }}
                          disabled={musicIsInstrumental}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-purple-500/20">
                      <div>
                        <label className="text-purple-400 text-sm font-semibold">Instrumental Only</label>
                        <p className="text-xs text-gray-400">No vocals, just instruments</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={musicIsInstrumental}
                          onChange={(e) => {
                            setMusicIsInstrumental(e.target.checked)
                            if (e.target.checked) setMusicHasVocals(false)
                          }}
                          disabled={musicHasVocals}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerateMusic}
                    disabled={isGeneratingMusic || !musicPrompt.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 hover:from-purple-700 hover:via-pink-700 hover:to-purple-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                  >
                    {isGeneratingMusic ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                        GENERATING MUSIC...
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-5 w-5 mr-3" />
                        GENERATE MUSIC
                      </>
                    )}
                  </Button>

                  {/* Music Generation Progress */}
                  {isGeneratingMusic && (
                    <div className="space-y-2">
                      <div className="w-full bg-black/40 rounded-full h-2 border border-purple-500/50 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 transition-all duration-500 ease-out animate-pulse"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <p className="text-purple-400 text-sm text-center">
                        {musicGenerationProgress || 'Creating studio-grade music...'}
                      </p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <p className="text-xs text-purple-300">
                      💡 <strong>Tips:</strong> Be specific about genre, mood, instruments, and style. 
                      Duration: 10 seconds to 5 minutes. Commercial use cleared for film, TV, podcasts, ads, gaming!
                    </p>
                  </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sound Effects Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-orange-500/30 shadow-orange-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('sound-effects')) {
                        newSet.delete('sound-effects')
                      } else {
                        newSet.add('sound-effects')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-orange-400" />
                    <h2 className="text-xl font-semibold text-white">🎬 Sound Effects</h2>
                  </div>
                  {expandedCards.has('sound-effects') ? (
                    <ChevronUp className="h-5 w-5 text-orange-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-orange-400" />
                  )}
                </div>

                {expandedCards.has('sound-effects') && (
                  <>
                    <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 mb-4">
                      <p className="text-xs text-orange-300">
                        🔊 Create high-quality sound effects from text descriptions. Perfect for cinematic sound design, 
                        game audio, Foley, and ambient sounds. Supports precise timing, style control, and seamless looping.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-orange-400 text-sm font-semibold">Sound Effect Description</label>
                        <Textarea
                          value={soundEffectPrompt}
                          onChange={(e) => setSoundEffectPrompt(e.target.value)}
                          placeholder="Describe the sound effect (e.g., 'Glass shattering on concrete', 'Thunder rumbling in the distance', '90s hip-hop drum loop, 90 BPM', 'Footsteps on gravel, then a metallic door opens')"
                          className="w-full bg-black/30 border-orange-500/50 text-white placeholder-gray-500 min-h-[120px]"
                        />
                        <p className="text-xs text-gray-400">
                          💡 <strong>Tip:</strong> Use clear, concise descriptions. For complex sequences, describe the sequence of events. 
                          Supports audio terminology like "impact", "whoosh", "ambience", "braam", "glitch", "drone".
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Duration */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-orange-400 text-sm font-semibold">Duration (seconds)</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={soundEffectDuration !== null}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSoundEffectDuration(5)
                                  } else {
                                    setSoundEffectDuration(null)
                                  }
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                              <span className="ml-2 text-xs text-orange-300">Set Duration</span>
                            </label>
                          </div>
                          {soundEffectDuration !== null ? (
                            <>
                              <input
                                type="range"
                                min="0.1"
                                max="30"
                                step="0.1"
                                value={soundEffectDuration}
                                onChange={(e) => setSoundEffectDuration(parseFloat(e.target.value))}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-orange-400/70">
                                <span>0.1s</span>
                                <span className="text-orange-300 font-semibold">{soundEffectDuration.toFixed(1)}s</span>
                                <span>30s</span>
                              </div>
                              <p className="text-xs text-gray-400">Cost: 40 credits per second when duration is specified</p>
                            </>
                          ) : (
                            <p className="text-xs text-orange-300/70">Auto-determined based on prompt (default)</p>
                          )}
                        </div>

                        {/* Prompt Influence */}
                        <div className="space-y-2">
                          <label className="text-orange-400 text-sm font-semibold">Prompt Influence</label>
                          <Select value={soundEffectPromptInfluence} onValueChange={(value: 'high' | 'low') => setSoundEffectPromptInfluence(value)}>
                            <SelectTrigger className="bg-transparent border-orange-500/50 text-orange-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-orange-500/50">
                              <SelectItem value="high" className="text-orange-300 hover:bg-orange-500/20">High - More literal interpretation</SelectItem>
                              <SelectItem value="low" className="text-orange-300 hover:bg-orange-500/20">Low - More creative with variations</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-400">
                            {soundEffectPromptInfluence === 'high' 
                              ? 'Strictly follows your prompt description'
                              : 'More creative interpretation with added variations'}
                          </p>
                        </div>
                      </div>

                      {/* Looping Option */}
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-orange-500/20">
                        <div>
                          <label className="text-orange-400 text-sm font-semibold">Enable Looping</label>
                          <p className="text-xs text-gray-400">Seamless looping for sounds longer than 30 seconds</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={soundEffectLooping}
                            onChange={(e) => setSoundEffectLooping(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      {/* Generate Button */}
                      <Button
                        onClick={handleGenerateSoundEffect}
                        disabled={isGeneratingSoundEffect || !soundEffectPrompt.trim()}
                        className="w-full bg-gradient-to-r from-orange-600 via-red-600 to-orange-800 hover:from-orange-700 hover:via-red-700 hover:to-orange-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                      >
                        {isGeneratingSoundEffect ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                            GENERATING SOUND EFFECT...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-5 w-5 mr-3" />
                            GENERATE SOUND EFFECT
                          </>
                        )}
                      </Button>

                      {/* Sound Effect Generation Progress */}
                      {isGeneratingSoundEffect && (
                        <div className="space-y-2">
                          <div className="w-full bg-black/40 rounded-full h-2 border border-orange-500/50 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-orange-600 via-red-600 to-orange-800 transition-all duration-500 ease-out animate-pulse"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <p className="text-orange-400 text-sm text-center">
                            {soundEffectGenerationProgress || 'Creating high-quality sound effect...'}
                          </p>
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <p className="text-xs text-orange-300">
                          💡 <strong>Tips:</strong> Maximum duration is 30 seconds per generation. For longer sequences, 
                          generate multiple effects and combine them. Use looping for seamless repeating sounds. 
                          Supports simple effects, complex sequences, and musical elements.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Voice Changer Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-green-500/30 shadow-green-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('voice-changer')) {
                        newSet.delete('voice-changer')
                      } else {
                        newSet.add('voice-changer')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-green-400" />
                    <h2 className="text-xl font-semibold text-white">🎭 Voice Changer</h2>
                  </div>
                  {expandedCards.has('voice-changer') ? (
                    <ChevronUp className="h-5 w-5 text-green-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-green-400" />
                  )}
                </div>

                {expandedCards.has('voice-changer') && (
                  <>
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 mb-4">
                      <p className="text-xs text-green-300">
                        🎭 Transform any source audio into a different voice while preserving emotion, delivery, and nuances. 
                        Captures whispers, laughs, cries, accents, and subtle emotional cues. Best for segments under 5 minutes.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Source Audio Upload */}
                      <div className="space-y-2">
                        <label className="text-green-400 text-sm font-semibold">Source Audio</label>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleVoiceChangerFileSelect}
                          className="w-full bg-black/30 border border-green-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                        />
                        {voiceChangerFile && (
                          <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                            <p className="text-xs text-green-300">
                              ✓ Selected: {voiceChangerFile.name} ({(voiceChangerFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          💡 Upload audio file (.mp3, .wav, etc.). Recommended: under 5 minutes for optimal processing. Max 50MB. 
                          Record in a quiet environment and maintain appropriate microphone levels.
                        </p>
                      </div>

                      {/* Target Voice Selection */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-green-400 text-sm font-semibold">Target Voice</label>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              fetchAvailableVoices()
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            disabled={isLoadingVoices}
                            title="Refresh voices list"
                          >
                            <RefreshCw className={`h-3 w-3 ${isLoadingVoices ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        {isLoadingVoices ? (
                          <div className="flex items-center gap-2 text-green-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-400/40 border-t-green-400"></div>
                            Loading voices...
                          </div>
                        ) : (
                          <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                            <SelectTrigger className="bg-transparent border-green-500/50 text-green-300 hover:border-green-400">
                              <SelectValue placeholder="Select target voice" />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-green-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                              {availableVoices.length > 0 ? (
                                availableVoices.map((voice) => (
                                  <SelectItem 
                                    key={voice.id || voice.voice_id} 
                                    value={voice.id || voice.voice_id}
                                    className="text-green-300 hover:bg-green-500/20"
                                  >
                                    <div className="flex items-center gap-2">
                                      {voice.name || voice.voice_id}
                                      {voice.category && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">
                                          {voice.category}
                                        </span>
                                      )}
                                    </div>
                                    {voice.description && (
                                      <span className="text-xs text-gray-400 ml-2 block">- {voice.description}</span>
                                    )}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-voices" disabled className="text-gray-500">
                                  No voices available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        <p className="text-xs text-gray-400">
                          The voice to convert your audio to. Can use default, cloned, or designed voices. 
                          Custom/cloned voices are supported.
                        </p>
                      </div>

                      {/* Model Selection */}
                      <div className="space-y-2">
                        <label className="text-green-400 text-sm font-semibold">Model</label>
                        <Select value={voiceChangerModel} onValueChange={setVoiceChangerModel}>
                          <SelectTrigger className="bg-transparent border-green-500/50 text-green-300 hover:border-green-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-green-500/50">
                            <SelectItem value="eleven_multilingual_sts_v2" className="text-green-300 hover:bg-green-500/20">
                              Multilingual STS v2 (29 languages, recommended)
                            </SelectItem>
                            <SelectItem value="eleven_english_sts_v2" className="text-green-300 hover:bg-green-500/20">
                              English STS v2 (English only)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">
                          Multilingual v2 supports 29 languages. English v2 only supports English. 
                          Multilingual often outperforms English even for English material.
                        </p>
                      </div>

                      {/* Voice Settings Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Stability */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-green-400 text-sm font-semibold">Stability</label>
                            <span className="text-green-300 text-sm">{voiceChangerStability.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={voiceChangerStability}
                            onChange={(e) => setVoiceChangerStability(parseFloat(e.target.value))}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-400">100% recommended for maximum voice consistency</p>
                        </div>

                        {/* Style */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-green-400 text-sm font-semibold">Style</label>
                            <span className="text-green-300 text-sm">{voiceChangerStyle.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={voiceChangerStyle}
                            onChange={(e) => setVoiceChangerStyle(parseFloat(e.target.value))}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-400">Set to 0% when input audio is already expressive</p>
                        </div>
                      </div>

                      {/* Remove Background Noise */}
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-green-500/20">
                        <div>
                          <label className="text-green-400 text-sm font-semibold">Remove Background Noise</label>
                          <p className="text-xs text-gray-400">Minimize environmental sounds in the output</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={voiceChangerRemoveNoise}
                            onChange={(e) => setVoiceChangerRemoveNoise(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      {/* Generate Button */}
                      <Button
                        onClick={handleVoiceChange}
                        disabled={isChangingVoice || !voiceChangerFile || !selectedVoiceId}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                      >
                        {isChangingVoice ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                            CHANGING VOICE...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-5 w-5 mr-3" />
                            CHANGE VOICE
                          </>
                        )}
                      </Button>

                      {/* Voice Change Progress */}
                      {isChangingVoice && (
                        <div className="space-y-2">
                          <div className="w-full bg-black/40 rounded-full h-2 border border-green-500/50 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-600 to-emerald-600 transition-all duration-500 ease-out animate-pulse"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <p className="text-green-400 text-sm text-center">
                            Transforming voice while preserving emotion and delivery...
                          </p>
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <p className="text-xs text-green-300">
                          💡 <strong>Tips:</strong> Keep segments under 5 minutes for optimal processing. 
                          For longer audio, split into smaller chunks. Billing: 1000 characters per minute of processed audio. 
                          The source audio's accent and language will be preserved in the output.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dubbing Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-indigo-500/30 shadow-indigo-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('dubbing')) {
                        newSet.delete('dubbing')
                      } else {
                        newSet.add('dubbing')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-xl font-semibold text-white">🌍 Dubbing</h2>
                  </div>
                  {expandedCards.has('dubbing') ? (
                    <ChevronUp className="h-5 w-5 text-indigo-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-indigo-400" />
                  )}
                </div>

                {expandedCards.has('dubbing') && (
                  <>
                    <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 mb-4">
                      <p className="text-xs text-indigo-300">
                        🌍 Translate audio and video across 32 languages while preserving emotion, timing, tone, and unique characteristics. 
                        Automatically detects multiple speakers and preserves original voices. Creator plan or higher required.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* File Upload */}
                      <div className="space-y-2">
                        <label className="text-indigo-400 text-sm font-semibold">Audio or Video File</label>
                        <input
                          type="file"
                          accept="audio/*,video/*"
                          onChange={handleDubbingFileSelect}
                          className="w-full bg-black/30 border border-indigo-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                        />
                        {dubbingFile && (
                          <div className="p-2 bg-indigo-500/10 rounded border border-indigo-500/20">
                            <p className="text-xs text-indigo-300">
                              ✓ Selected: {dubbingFile.name} ({(dubbingFile.size / 1024 / 1024).toFixed(2)} MB)
                              {dubbingFile.type.startsWith('video/') && ' - Video'}
                              {dubbingFile.type.startsWith('audio/') && ' - Audio'}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          💡 Upload audio or video file. UI supports up to 500MB and 45 minutes. 
                          API supports up to 1GB and 2.5 hours. Supports YouTube, X, TikTok, Vimeo URLs, or file uploads.
                        </p>
                      </div>

                      {/* Language Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Source Language */}
                        <div className="space-y-2">
                          <label className="text-indigo-400 text-sm font-semibold">Source Language</label>
                          <Select value={dubbingSourceLanguage} onValueChange={setDubbingSourceLanguage}>
                            <SelectTrigger className="bg-transparent border-indigo-500/50 text-indigo-300 hover:border-indigo-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-indigo-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                              <SelectItem value="en" className="text-indigo-300 hover:bg-indigo-500/20">English</SelectItem>
                              <SelectItem value="hi" className="text-indigo-300 hover:bg-indigo-500/20">Hindi</SelectItem>
                              <SelectItem value="pt" className="text-indigo-300 hover:bg-indigo-500/20">Portuguese</SelectItem>
                              <SelectItem value="zh" className="text-indigo-300 hover:bg-indigo-500/20">Chinese</SelectItem>
                              <SelectItem value="es" className="text-indigo-300 hover:bg-indigo-500/20">Spanish</SelectItem>
                              <SelectItem value="fr" className="text-indigo-300 hover:bg-indigo-500/20">French</SelectItem>
                              <SelectItem value="de" className="text-indigo-300 hover:bg-indigo-500/20">German</SelectItem>
                              <SelectItem value="ja" className="text-indigo-300 hover:bg-indigo-500/20">Japanese</SelectItem>
                              <SelectItem value="ar" className="text-indigo-300 hover:bg-indigo-500/20">Arabic</SelectItem>
                              <SelectItem value="ru" className="text-indigo-300 hover:bg-indigo-500/20">Russian</SelectItem>
                              <SelectItem value="ko" className="text-indigo-300 hover:bg-indigo-500/20">Korean</SelectItem>
                              <SelectItem value="id" className="text-indigo-300 hover:bg-indigo-500/20">Indonesian</SelectItem>
                              <SelectItem value="it" className="text-indigo-300 hover:bg-indigo-500/20">Italian</SelectItem>
                              <SelectItem value="nl" className="text-indigo-300 hover:bg-indigo-500/20">Dutch</SelectItem>
                              <SelectItem value="tr" className="text-indigo-300 hover:bg-indigo-500/20">Turkish</SelectItem>
                              <SelectItem value="pl" className="text-indigo-300 hover:bg-indigo-500/20">Polish</SelectItem>
                              <SelectItem value="sv" className="text-indigo-300 hover:bg-indigo-500/20">Swedish</SelectItem>
                              <SelectItem value="fil" className="text-indigo-300 hover:bg-indigo-500/20">Filipino</SelectItem>
                              <SelectItem value="ms" className="text-indigo-300 hover:bg-indigo-500/20">Malay</SelectItem>
                              <SelectItem value="ro" className="text-indigo-300 hover:bg-indigo-500/20">Romanian</SelectItem>
                              <SelectItem value="uk" className="text-indigo-300 hover:bg-indigo-500/20">Ukrainian</SelectItem>
                              <SelectItem value="el" className="text-indigo-300 hover:bg-indigo-500/20">Greek</SelectItem>
                              <SelectItem value="cs" className="text-indigo-300 hover:bg-indigo-500/20">Czech</SelectItem>
                              <SelectItem value="da" className="text-indigo-300 hover:bg-indigo-500/20">Danish</SelectItem>
                              <SelectItem value="fi" className="text-indigo-300 hover:bg-indigo-500/20">Finnish</SelectItem>
                              <SelectItem value="bg" className="text-indigo-300 hover:bg-indigo-500/20">Bulgarian</SelectItem>
                              <SelectItem value="hr" className="text-indigo-300 hover:bg-indigo-500/20">Croatian</SelectItem>
                              <SelectItem value="sk" className="text-indigo-300 hover:bg-indigo-500/20">Slovak</SelectItem>
                              <SelectItem value="ta" className="text-indigo-300 hover:bg-indigo-500/20">Tamil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Target Language */}
                        <div className="space-y-2">
                          <label className="text-indigo-400 text-sm font-semibold">Target Language</label>
                          <Select value={dubbingTargetLanguage} onValueChange={setDubbingTargetLanguage}>
                            <SelectTrigger className="bg-transparent border-indigo-500/50 text-indigo-300 hover:border-indigo-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-indigo-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                              <SelectItem value="en" className="text-indigo-300 hover:bg-indigo-500/20">English</SelectItem>
                              <SelectItem value="hi" className="text-indigo-300 hover:bg-indigo-500/20">Hindi</SelectItem>
                              <SelectItem value="pt" className="text-indigo-300 hover:bg-indigo-500/20">Portuguese</SelectItem>
                              <SelectItem value="zh" className="text-indigo-300 hover:bg-indigo-500/20">Chinese</SelectItem>
                              <SelectItem value="es" className="text-indigo-300 hover:bg-indigo-500/20">Spanish</SelectItem>
                              <SelectItem value="fr" className="text-indigo-300 hover:bg-indigo-500/20">French</SelectItem>
                              <SelectItem value="de" className="text-indigo-300 hover:bg-indigo-500/20">German</SelectItem>
                              <SelectItem value="ja" className="text-indigo-300 hover:bg-indigo-500/20">Japanese</SelectItem>
                              <SelectItem value="ar" className="text-indigo-300 hover:bg-indigo-500/20">Arabic</SelectItem>
                              <SelectItem value="ru" className="text-indigo-300 hover:bg-indigo-500/20">Russian</SelectItem>
                              <SelectItem value="ko" className="text-indigo-300 hover:bg-indigo-500/20">Korean</SelectItem>
                              <SelectItem value="id" className="text-indigo-300 hover:bg-indigo-500/20">Indonesian</SelectItem>
                              <SelectItem value="it" className="text-indigo-300 hover:bg-indigo-500/20">Italian</SelectItem>
                              <SelectItem value="nl" className="text-indigo-300 hover:bg-indigo-500/20">Dutch</SelectItem>
                              <SelectItem value="tr" className="text-indigo-300 hover:bg-indigo-500/20">Turkish</SelectItem>
                              <SelectItem value="pl" className="text-indigo-300 hover:bg-indigo-500/20">Polish</SelectItem>
                              <SelectItem value="sv" className="text-indigo-300 hover:bg-indigo-500/20">Swedish</SelectItem>
                              <SelectItem value="fil" className="text-indigo-300 hover:bg-indigo-500/20">Filipino</SelectItem>
                              <SelectItem value="ms" className="text-indigo-300 hover:bg-indigo-500/20">Malay</SelectItem>
                              <SelectItem value="ro" className="text-indigo-300 hover:bg-indigo-500/20">Romanian</SelectItem>
                              <SelectItem value="uk" className="text-indigo-300 hover:bg-indigo-500/20">Ukrainian</SelectItem>
                              <SelectItem value="el" className="text-indigo-300 hover:bg-indigo-500/20">Greek</SelectItem>
                              <SelectItem value="cs" className="text-indigo-300 hover:bg-indigo-500/20">Czech</SelectItem>
                              <SelectItem value="da" className="text-indigo-300 hover:bg-indigo-500/20">Danish</SelectItem>
                              <SelectItem value="fi" className="text-indigo-300 hover:bg-indigo-500/20">Finnish</SelectItem>
                              <SelectItem value="bg" className="text-indigo-300 hover:bg-indigo-500/20">Bulgarian</SelectItem>
                              <SelectItem value="hr" className="text-indigo-300 hover:bg-indigo-500/20">Croatian</SelectItem>
                              <SelectItem value="sk" className="text-indigo-300 hover:bg-indigo-500/20">Slovak</SelectItem>
                              <SelectItem value="ta" className="text-indigo-300 hover:bg-indigo-500/20">Tamil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Watermark Option (Video Only) */}
                      {dubbingFile && dubbingFile.type.startsWith('video/') && (
                        <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-indigo-500/20">
                          <div>
                            <label className="text-indigo-400 text-sm font-semibold">Use Watermark (Video Only)</label>
                            <p className="text-xs text-gray-400">Reduce credit usage with watermarked output</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dubbingUseWatermark}
                              onChange={(e) => setDubbingUseWatermark(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      )}

                      {/* Generate Button */}
                      <Button
                        onClick={handleDubbing}
                        disabled={isDubbing || !dubbingFile || dubbingSourceLanguage === dubbingTargetLanguage}
                        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                      >
                        {isDubbing ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                            DUBBING...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-5 w-5 mr-3" />
                            START DUBBING
                          </>
                        )}
                      </Button>

                      {/* Dubbing Progress */}
                      {isDubbing && (
                        <div className="space-y-2">
                          <div className="w-full bg-black/40 rounded-full h-2 border border-indigo-500/50 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 transition-all duration-500 ease-out animate-pulse"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <p className="text-indigo-400 text-sm text-center">
                            {dubbingProgress || 'Translating and preserving emotion, timing, and tone...'}
                          </p>
                        </div>
                      )}

                      {/* Dubbed File Result */}
                      {dubbingUrl && (
                        <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                          <p className="text-xs text-indigo-300 mb-2">
                            ✓ Dubbing completed successfully!
                          </p>
                          {dubbingFile?.type.startsWith('video/') ? (
                            <video 
                              src={dubbingUrl} 
                              controls 
                              className="w-full rounded-lg max-h-[400px]"
                            >
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div className="space-y-2">
                              <audio src={dubbingUrl} controls className="w-full" />
                              <p className="text-xs text-indigo-300">
                                Audio is also available in the audio player below.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <p className="text-xs text-indigo-300">
                          💡 <strong>Features:</strong> Automatically detects multiple speakers (up to 9 recommended), 
                          preserves original voices and emotional tone, keeps background audio, supports 32 languages. 
                          For fine-tuning, use Dubbing Studio for interactive editing. Creator plan or higher required.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Voice Isolator Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-teal-500/30 shadow-teal-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('voice-isolator')) {
                        newSet.delete('voice-isolator')
                      } else {
                        newSet.add('voice-isolator')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-teal-400" />
                    <h2 className="text-xl font-semibold text-white">🎤 Voice Isolator</h2>
                  </div>
                  {expandedCards.has('voice-isolator') ? (
                    <ChevronUp className="h-5 w-5 text-teal-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-teal-400" />
                  )}
                </div>

                {expandedCards.has('voice-isolator') && (
                  <>
                    <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20 mb-4">
                      <p className="text-xs text-teal-300">
                        🎤 Transform audio recordings with background noise into clean, studio-quality speech. 
                        Isolates speech from background noise, music, and ambient sounds. Perfect for noisy environments.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* File Upload */}
                      <div className="space-y-2">
                        <label className="text-teal-400 text-sm font-semibold">Audio or Video File</label>
                        <input
                          type="file"
                          accept="audio/*,video/*"
                          onChange={handleVoiceIsolatorFileSelect}
                          className="w-full bg-black/30 border border-teal-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700"
                        />
                        {voiceIsolatorFile && (
                          <div className="p-2 bg-teal-500/10 rounded border border-teal-500/20">
                            <p className="text-xs text-teal-300">
                              ✓ Selected: {voiceIsolatorFile.name} ({(voiceIsolatorFile.size / 1024 / 1024).toFixed(2)} MB)
                              {voiceIsolatorFile.type.startsWith('video/') && ' - Video'}
                              {voiceIsolatorFile.type.startsWith('audio/') && ' - Audio'}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          💡 Upload audio or video file. Supports files up to 500MB and 1 hour in length. 
                          Audio formats: AAC, AIFF, OGG, MP3, OPUS, WAV, FLAC, M4A. 
                          Video formats: MP4, AVI, MKV, MOV, WMV, FLV, WEBM, MPEG, 3GPP.
                        </p>
                      </div>

                      {/* Generate Button */}
                      <Button
                        onClick={handleVoiceIsolation}
                        disabled={isIsolatingVoice || !voiceIsolatorFile}
                        className="w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-800 hover:from-teal-700 hover:via-cyan-700 hover:to-teal-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                      >
                        {isIsolatingVoice ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                            ISOLATING VOICE...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-5 w-5 mr-3" />
                            ISOLATE VOICE
                          </>
                        )}
                      </Button>

                      {/* Voice Isolation Progress */}
                      {isIsolatingVoice && (
                        <div className="space-y-2">
                          <div className="w-full bg-black/40 rounded-full h-2 border border-teal-500/50 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-800 transition-all duration-500 ease-out animate-pulse"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <p className="text-teal-400 text-sm text-center">
                            {voiceIsolationProgress || 'Isolating speech from background noise...'}
                          </p>
                        </div>
                      )}

                      {/* Isolated Voice Result */}
                      {isolatedVoiceUrl && (
                        <div className="p-4 bg-teal-500/10 rounded-lg border border-teal-500/20">
                          <p className="text-xs text-teal-300 mb-2">
                            ✓ Voice isolation completed successfully!
                          </p>
                          {voiceIsolatorFile?.type.startsWith('video/') ? (
                            <video 
                              src={isolatedVoiceUrl} 
                              controls 
                              className="w-full rounded-lg max-h-[400px]"
                            >
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div className="space-y-2">
                              <audio src={isolatedVoiceUrl} controls className="w-full" />
                              <p className="text-xs text-teal-300">
                                Isolated audio is also available in the audio player below.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                        <p className="text-xs text-teal-300">
                          💡 <strong>Cost:</strong> 1000 characters for every minute of audio. 
                          <strong> File limits:</strong> Up to 500MB and 1 hour in length. 
                          <strong> Note:</strong> Not specifically optimized for isolating vocals from music, but may work depending on the content.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Forced Alignment Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-pink-500/30 shadow-pink-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('forced-alignment')) {
                        newSet.delete('forced-alignment')
                      } else {
                        newSet.add('forced-alignment')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-pink-400" />
                    <h2 className="text-xl font-semibold text-white">⏱️ Forced Alignment</h2>
                  </div>
                  {expandedCards.has('forced-alignment') ? (
                    <ChevronUp className="h-5 w-5 text-pink-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-pink-400" />
                  )}
                </div>

                {expandedCards.has('forced-alignment') && (
                  <>
                    <div className="p-3 bg-pink-500/10 rounded-lg border border-pink-500/20 mb-4">
                      <p className="text-xs text-pink-300">
                        ⏱️ Turn spoken audio and text into a time-aligned transcript with exact timestamps for each word or phrase. 
                        Perfect for matching subtitles to video or generating timings for audiobooks.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Audio File Upload */}
                      <div className="space-y-2">
                        <label className="text-pink-400 text-sm font-semibold">Audio File</label>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleForcedAlignmentFileSelect}
                          className="w-full bg-black/30 border border-pink-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-700"
                        />
                        {forcedAlignmentFile && (
                          <div className="p-2 bg-pink-500/10 rounded border border-pink-500/20">
                            <p className="text-xs text-pink-300">
                              ✓ Selected: {forcedAlignmentFile.name} ({(forcedAlignmentFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          💡 Upload audio file. Maximum file size: 3GB. Maximum duration: 10 hours.
                        </p>
                      </div>

                      {/* Transcript Text Input */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-pink-400 text-sm font-semibold">Transcript Text</label>
                          <span className="text-xs text-pink-300/70">
                            {forcedAlignmentText.length.toLocaleString()} / 675,000 characters
                          </span>
                        </div>
                        <Textarea
                          value={forcedAlignmentText}
                          onChange={(e) => setForcedAlignmentText(e.target.value)}
                          placeholder="Enter the transcript text that matches your audio file. Use plain text format (no JSON or special formatting). Example: 'Hello, how are you?'"
                          className="w-full bg-black/30 border-pink-500/50 text-white placeholder-gray-500 min-h-[150px]"
                          maxLength={675000}
                        />
                        <p className="text-xs text-gray-400">
                          💡 Enter plain text transcript (no JSON formatting). Maximum: 675,000 characters. 
                          The text should match the spoken content in the audio file.
                        </p>
                      </div>

                      {/* Language Selection */}
                      <div className="space-y-2">
                        <label className="text-pink-400 text-sm font-semibold">Language</label>
                        <Select value={forcedAlignmentLanguage} onValueChange={setForcedAlignmentLanguage}>
                          <SelectTrigger className="bg-transparent border-pink-500/50 text-pink-300 hover:border-pink-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-pink-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                            <SelectItem value="en" className="text-pink-300 hover:bg-pink-500/20">English (USA, UK, Australia, Canada)</SelectItem>
                            <SelectItem value="ja" className="text-pink-300 hover:bg-pink-500/20">Japanese</SelectItem>
                            <SelectItem value="zh" className="text-pink-300 hover:bg-pink-500/20">Chinese</SelectItem>
                            <SelectItem value="de" className="text-pink-300 hover:bg-pink-500/20">German</SelectItem>
                            <SelectItem value="hi" className="text-pink-300 hover:bg-pink-500/20">Hindi</SelectItem>
                            <SelectItem value="fr" className="text-pink-300 hover:bg-pink-500/20">French (France, Canada)</SelectItem>
                            <SelectItem value="ko" className="text-pink-300 hover:bg-pink-500/20">Korean</SelectItem>
                            <SelectItem value="pt" className="text-pink-300 hover:bg-pink-500/20">Portuguese (Brazil, Portugal)</SelectItem>
                            <SelectItem value="it" className="text-pink-300 hover:bg-pink-500/20">Italian</SelectItem>
                            <SelectItem value="es" className="text-pink-300 hover:bg-pink-500/20">Spanish (Spain, Mexico)</SelectItem>
                            <SelectItem value="id" className="text-pink-300 hover:bg-pink-500/20">Indonesian</SelectItem>
                            <SelectItem value="nl" className="text-pink-300 hover:bg-pink-500/20">Dutch</SelectItem>
                            <SelectItem value="tr" className="text-pink-300 hover:bg-pink-500/20">Turkish</SelectItem>
                            <SelectItem value="fil" className="text-pink-300 hover:bg-pink-500/20">Filipino</SelectItem>
                            <SelectItem value="pl" className="text-pink-300 hover:bg-pink-500/20">Polish</SelectItem>
                            <SelectItem value="sv" className="text-pink-300 hover:bg-pink-500/20">Swedish</SelectItem>
                            <SelectItem value="bg" className="text-pink-300 hover:bg-pink-500/20">Bulgarian</SelectItem>
                            <SelectItem value="ro" className="text-pink-300 hover:bg-pink-500/20">Romanian</SelectItem>
                            <SelectItem value="ar" className="text-pink-300 hover:bg-pink-500/20">Arabic (Saudi Arabia, UAE)</SelectItem>
                            <SelectItem value="cs" className="text-pink-300 hover:bg-pink-500/20">Czech</SelectItem>
                            <SelectItem value="el" className="text-pink-300 hover:bg-pink-500/20">Greek</SelectItem>
                            <SelectItem value="fi" className="text-pink-300 hover:bg-pink-500/20">Finnish</SelectItem>
                            <SelectItem value="hr" className="text-pink-300 hover:bg-pink-500/20">Croatian</SelectItem>
                            <SelectItem value="ms" className="text-pink-300 hover:bg-pink-500/20">Malay</SelectItem>
                            <SelectItem value="sk" className="text-pink-300 hover:bg-pink-500/20">Slovak</SelectItem>
                            <SelectItem value="da" className="text-pink-300 hover:bg-pink-500/20">Danish</SelectItem>
                            <SelectItem value="ta" className="text-pink-300 hover:bg-pink-500/20">Tamil</SelectItem>
                            <SelectItem value="uk" className="text-pink-300 hover:bg-pink-500/20">Ukrainian</SelectItem>
                            <SelectItem value="ru" className="text-pink-300 hover:bg-pink-500/20">Russian</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">
                          Select the language of the audio and transcript. Supports 29 languages.
                        </p>
                      </div>

                      {/* Generate Button */}
                      <Button
                        onClick={handleForcedAlignment}
                        disabled={isAligning || !forcedAlignmentFile || !forcedAlignmentText.trim()}
                        className="w-full bg-gradient-to-r from-pink-600 via-rose-600 to-pink-800 hover:from-pink-700 hover:via-rose-700 hover:to-pink-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                      >
                        {isAligning ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                            ALIGNING...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-5 w-5 mr-3" />
                            ALIGN AUDIO & TRANSCRIPT
                          </>
                        )}
                      </Button>

                      {/* Alignment Progress */}
                      {isAligning && (
                        <div className="space-y-2">
                          <div className="w-full bg-black/40 rounded-full h-2 border border-pink-500/50 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-pink-600 via-rose-600 to-pink-800 transition-all duration-500 ease-out animate-pulse"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <p className="text-pink-400 text-sm text-center">
                            {alignmentProgress || 'Aligning audio with transcript...'}
                          </p>
                        </div>
                      )}

                      {/* Aligned Transcript Result */}
                      {alignedTranscript && (
                        <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/20">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-pink-300 font-semibold">
                              ✓ Time-aligned transcript generated!
                            </p>
                            <Button
                              onClick={() => {
                                const jsonStr = JSON.stringify(alignedTranscript, null, 2)
                                navigator.clipboard.writeText(jsonStr)
                                setCopied(true)
                                setTimeout(() => setCopied(false), 2000)
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-pink-400 hover:text-pink-300"
                            >
                              {copied ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy JSON
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="bg-black/30 rounded-lg p-3 max-h-[400px] overflow-y-auto">
                            <pre className="text-xs text-pink-200 font-mono whitespace-pre-wrap break-words">
                              {JSON.stringify(alignedTranscript, null, 2)}
                            </pre>
                          </div>
                          <p className="text-xs text-pink-300/70 mt-2">
                            The transcript includes timestamps for each word or phrase aligned with the audio.
                          </p>
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-pink-500/10 rounded-lg border border-pink-500/20">
                        <p className="text-xs text-pink-300">
                          💡 <strong>Use cases:</strong> Matching subtitles to video recordings, generating timings for audiobook recordings. 
                          <strong> Cost:</strong> Same as Speech to Text API. 
                          <strong> Note:</strong> Does not support diarization. Use plain text format (no JSON).
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ElevenLabs Agents Platform - Only shown when ElevenLabs is selected */}
            {selectedAudioModel === 'elevenlabs' && (
              <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-blue-500/30 shadow-blue-500/20">
                <div className="space-y-4">
                  <div 
                    className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setExpandedCards(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has('agents-platform')) {
                          newSet.delete('agents-platform')
                        } else {
                          newSet.add('agents-platform')
                        }
                        return newSet
                      })
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5 text-blue-400" />
                      <h2 className="text-xl font-semibold text-white">🤖 ElevenLabs Agents Platform</h2>
                    </div>
                    {expandedCards.has('agents-platform') ? (
                      <ChevronUp className="h-5 w-5 text-blue-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-blue-400" />
                    )}
                  </div>

                  {expandedCards.has('agents-platform') && (
                    <>
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 mb-4">
                    <p className="text-xs text-blue-300">
                      🎯 Build, deploy, and scale voice agents with natural dialogue. Multimodal agents that handle 
                      complex workflows through conversation. Create agents in the ElevenLabs dashboard first.
                    </p>
                  </div>

                  {/* Agent Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-blue-400 text-sm font-semibold">Select Agent</label>
                      <Button
                        onClick={fetchAvailableAgents}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        disabled={isLoadingAgents}
                        title="Refresh agents list"
                      >
                        <RefreshCw className={`h-3 w-3 ${isLoadingAgents ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    {isLoadingAgents ? (
                      <div className="flex items-center gap-2 text-blue-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400/40 border-t-blue-400"></div>
                        Loading agents...
                      </div>
                    ) : (
                      <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                        <SelectTrigger className="bg-transparent border-blue-500/50 text-blue-300 hover:border-blue-400">
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-blue-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                          <SelectItem 
                            value="new"
                            className="text-green-400 hover:bg-green-500/20 font-semibold"
                          >
                            ➕ Create New Agent
                          </SelectItem>
                          {availableAgents.length > 0 && (
                            <div className="border-t border-blue-500/30 my-1" />
                          )}
                          {availableAgents.length > 0 ? (
                            availableAgents.map((agent) => (
                              <SelectItem 
                                key={agent.agent_id || agent.id} 
                                value={agent.agent_id || agent.id}
                                className="text-blue-300 hover:bg-blue-500/20"
                              >
                                {agent.name || agent.agent_id || agent.id}
                                {agent.description && (
                                  <span className="text-xs text-gray-400 ml-2">- {agent.description}</span>
                                )}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-agents" disabled className="text-gray-500">
                              No existing agents
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-gray-400">
                      {availableAgents.length === 0 && "Create agents in the ElevenLabs dashboard, then refresh to see them here."}
                    </p>
                    
                    {/* Agent Settings Toggle - Always visible */}
                    <Button
                      onClick={() => setShowAgentSettings(!showAgentSettings)}
                      variant="outline"
                      size="sm"
                      className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/20 mt-2"
                      disabled={isLoadingAgents}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      {showAgentSettings ? 'Hide' : 'Show'} Agent Settings
                    </Button>
                    
                    {availableAgents.length === 0 && (
                      <p className="text-xs text-blue-400 mt-2">
                        💡 You can still view and configure default settings below, even without selecting an agent.
                      </p>
                    )}
                  </div>

                  {/* Agent Settings Panel - Always visible when toggled */}
                  {showAgentSettings && (
                    <div className="mt-4 p-4 bg-black/40 rounded-lg border border-blue-500/30 space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-blue-400">Agent Configuration</h3>
                        {selectedAgentId === 'new' ? (
                          <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                            Creating New Agent
                          </span>
                        ) : !selectedAgentId || selectedAgentId === 'no-agents' ? (
                          <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                            No agent selected - settings for reference only
                          </span>
                        ) : (
                          <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                            Editing: {availableAgents.find(a => (a.agent_id || a.id) === selectedAgentId)?.name || selectedAgentId}
                          </span>
                        )}
                      </div>
                      
                      {selectedAgentId === 'new' && (
                        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 mb-4">
                          <p className="text-xs text-green-300">
                            ✨ <strong>Creating New Agent:</strong> Fill in the details below and click "Create Agent" to save.
                          </p>
                        </div>
                      )}
                      
                      {(!selectedAgentId || selectedAgentId === 'no-agents') && selectedAgentId !== 'new' && (
                        <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 mb-4">
                          <p className="text-xs text-yellow-300">
                            ⚠️ <strong>Note:</strong> Select "Create New Agent" or an existing agent to save changes.
                          </p>
                        </div>
                      )}
                      
                      {/* Agent Name - Required for new agents */}
                      {(selectedAgentId === 'new' || selectedAgentId === '') && (
                        <div className="space-y-2">
                          <label className="text-blue-300 text-sm font-semibold">Agent Name <span className="text-red-400">*</span></label>
                          <input
                            type="text"
                            value={agentName}
                            onChange={(e) => setAgentName(e.target.value)}
                            placeholder="Enter a name for your agent"
                            className="w-full px-3 py-2 bg-black/30 border-blue-500/50 rounded text-white placeholder-gray-500"
                          />
                          <p className="text-xs text-gray-400">A unique name to identify this agent.</p>
                        </div>
                      )}
                      
                      {/* System Prompt */}
                      <div className="space-y-2">
                        <label className="text-blue-300 text-sm font-semibold">System Prompt</label>
                        <Textarea
                          value={agentSystemPrompt}
                          onChange={(e) => setAgentSystemPrompt(e.target.value)}
                          placeholder="Enter the system prompt that defines the agent's behavior, personality, and instructions..."
                          className="bg-black/30 border-blue-500/50 text-white placeholder-gray-500 min-h-[120px]"
                        />
                        <p className="text-xs text-gray-400">Define how the agent behaves, its role, and instructions for task completion.</p>
                      </div>

                      {/* Voice & Language */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-blue-300 text-sm font-semibold">Voice</label>
                          <Select value={agentVoiceId} onValueChange={setAgentVoiceId}>
                            <SelectTrigger className="bg-black/30 border-blue-500/50 text-white">
                              <SelectValue placeholder="Select voice" />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-blue-500/50">
                              {availableVoices.map((voice) => (
                                <SelectItem key={voice.voice_id} value={voice.voice_id} className="text-white">
                                  {voice.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-blue-300 text-sm font-semibold">Language</label>
                          <Select value={agentLanguage} onValueChange={setAgentLanguage}>
                            <SelectTrigger className="bg-black/30 border-blue-500/50 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-blue-500/50">
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
                              <SelectItem value="de">German</SelectItem>
                              <SelectItem value="it">Italian</SelectItem>
                              <SelectItem value="pt">Portuguese</SelectItem>
                              <SelectItem value="zh">Chinese</SelectItem>
                              <SelectItem value="ja">Japanese</SelectItem>
                              <SelectItem value="ko">Korean</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Model Selection */}
                      <div className="space-y-2">
                        <label className="text-blue-300 text-sm font-semibold">Language Model</label>
                        <Select value={agentModel} onValueChange={setAgentModel}>
                          <SelectTrigger className="bg-black/30 border-blue-500/50 text-white">
                            <SelectValue placeholder="Select LLM model" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-blue-500/50">
                            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                            <SelectItem value="gpt-4">GPT-4</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                            <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                            <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                            <SelectItem value="custom">Custom Model</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">The language model powering the agent's responses.</p>
                      </div>

                      {/* Conversation Flow Settings */}
                      <div className="space-y-3 p-3 bg-black/20 rounded border border-blue-500/20">
                        <h4 className="text-blue-300 text-sm font-semibold">Conversation Flow</h4>
                        
                        <div className="flex items-center justify-between">
                          <label className="text-white text-sm">Turn Taking</label>
                          <button
                            onClick={() => setConversationFlow(prev => ({ ...prev, turnTaking: !prev.turnTaking }))}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              conversationFlow.turnTaking ? 'bg-blue-500' : 'bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                              conversationFlow.turnTaking ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <label className="text-white text-sm">Allow Interruptions</label>
                          <button
                            onClick={() => setConversationFlow(prev => ({ ...prev, interruptions: !prev.interruptions }))}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              conversationFlow.interruptions ? 'bg-blue-500' : 'bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                              conversationFlow.interruptions ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-white text-sm">Timeout (seconds)</label>
                          <input
                            type="number"
                            min="5"
                            max="120"
                            value={conversationFlow.timeout}
                            onChange={(e) => setConversationFlow(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                            className="w-full px-3 py-2 bg-black/30 border border-blue-500/50 rounded text-white"
                          />
                        </div>
                      </div>

                      {/* Tools & Knowledge Base */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-blue-300 text-sm font-semibold">Tools Enabled</label>
                          <Textarea
                            value={agentTools.join(', ')}
                            onChange={(e) => setAgentTools(e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                            placeholder="tool1, tool2, tool3"
                            className="bg-black/30 border-blue-500/50 text-white placeholder-gray-500 min-h-[60px]"
                          />
                          <p className="text-xs text-gray-400">Comma-separated list of enabled tools/APIs.</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-blue-300 text-sm font-semibold">Knowledge Base IDs</label>
                          <Textarea
                            value={agentKnowledgeBase.join(', ')}
                            onChange={(e) => setAgentKnowledgeBase(e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                            placeholder="kb1, kb2, kb3"
                            className="bg-black/30 border-blue-500/50 text-white placeholder-gray-500 min-h-[60px]"
                          />
                          <p className="text-xs text-gray-400">Comma-separated list of knowledge base IDs.</p>
                        </div>
                      </div>

                      {/* Personalization Variables */}
                      <div className="space-y-2">
                        <label className="text-blue-300 text-sm font-semibold">Personalization Variables (JSON)</label>
                        <Textarea
                          value={agentPersonalizationRaw}
                          onChange={(e) => {
                            const newValue = e.target.value
                            setAgentPersonalizationRaw(newValue)
                            try {
                              setAgentPersonalization(JSON.parse(newValue))
                            } catch {
                              // Invalid JSON, allow typing but don't update parsed state
                            }
                          }}
                          placeholder='{"variable1": "value1", "variable2": "value2"}'
                          className="bg-black/30 border-blue-500/50 text-white placeholder-gray-500 min-h-[80px] font-mono text-xs"
                        />
                        <p className="text-xs text-gray-400">JSON object for dynamic variables used in conversations.</p>
                      </div>

                      {/* Save Button */}
                      <Button
                        onClick={saveAgentSettings}
                        disabled={isSavingAgentSettings || (!selectedAgentId || selectedAgentId === 'no-agents')}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingAgentSettings ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                            {selectedAgentId === 'new' ? 'Creating Agent...' : 'Saving Settings...'}
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 mr-2" />
                            {selectedAgentId === 'new' ? 'Create Agent' : selectedAgentId && selectedAgentId !== 'no-agents' ? 'Save Agent Settings' : 'Select an Agent to Save'}
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Agent Conversation */}
                  {selectedAgentId && selectedAgentId !== 'no-agents' && (
                    <div className="space-y-4 mt-4">
                      {/* Conversation History */}
                      <div className="bg-black/30 rounded-lg border border-blue-500/20 p-4 max-h-[400px] overflow-y-auto space-y-3">
                        {agentConversation.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm py-8">
                            Start a conversation with your agent. Type a message or record audio.
                          </p>
                        ) : (
                          agentConversation.map((msg, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg ${
                                msg.role === 'user'
                                  ? 'bg-blue-500/20 ml-auto max-w-[80%]'
                                  : msg.role === 'system'
                                  ? 'bg-green-500/20 mx-auto max-w-[80%] border border-green-500/30'
                                  : 'bg-blue-500/10 mr-auto max-w-[80%]'
                              }`}
                            >
                              <p className="text-xs text-blue-400 mb-1 font-semibold">
                                {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'Agent'}
                              </p>
                              <p className="text-white text-sm">{msg.content}</p>
                              {msg.audio && (
                                <audio src={msg.audio} controls className="mt-2 w-full" />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Message Input */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Textarea
                            value={agentMessage}
                            onChange={(e) => setAgentMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSendAgentMessage()
                              }
                            }}
                            placeholder="Type your message to the agent... (or use voice recording)"
                            className="flex-1 bg-black/30 border-blue-500/50 text-white placeholder-gray-500 min-h-[80px]"
                            disabled={isAgentResponding}
                          />
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={handleSendAgentMessage}
                            disabled={isAgentResponding || !agentMessage.trim() || !selectedAgentId}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                          >
                            {isAgentResponding ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                                Agent Responding...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
                              </>
                            )}
                          </Button>
                          
                          {!isRecording ? (
                            <Button
                              onClick={startRecording}
                              disabled={isAgentResponding || !selectedAgentId}
                              variant="outline"
                              className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                            >
                              <Volume2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              onClick={stopRecording}
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {isRecording && (
                          <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <p className="text-xs text-red-400">Recording... Click stop when finished</p>
                          </div>
                        )}
                      </div>

                      {/* New Conversation Button */}
                      {conversationId && (
                        <Button
                          onClick={() => {
                            setConversationId(null)
                            setAgentConversation([])
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                        >
                          Start New Conversation
                        </Button>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <p className="text-xs text-blue-300">
                          💡 <strong>Tip:</strong> Agents can handle complex workflows through natural conversation. 
                          Use text messages or voice recordings. Agents maintain context throughout the conversation.
                        </p>
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ElevenLabs Advanced Settings - Only shown when ElevenLabs is selected */}
            {selectedAudioModel === 'elevenlabs' && (
              <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-cyan-500/30 shadow-cyan-500/20">
                <div className="space-y-6">
                  <div 
                    className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setExpandedCards(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has('voice-settings')) {
                          newSet.delete('voice-settings')
                        } else {
                          newSet.add('voice-settings')
                        }
                        return newSet
                      })
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5 text-cyan-400" />
                      <h2 className="text-xl font-semibold text-white">ElevenLabs Voice Settings</h2>
                    </div>
                    {expandedCards.has('voice-settings') ? (
                      <ChevronUp className="h-5 w-5 text-cyan-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-cyan-400" />
                    )}
                  </div>

                  {expandedCards.has('voice-settings') && (
                    <>
                      {/* Voice Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-cyan-400 text-sm font-semibold">Voice</label>
                      <Button
                        onClick={() => setShowVoiceCreator(!showVoiceCreator)}
                        variant="outline"
                        size="sm"
                        className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 text-xs"
                      >
                        {showVoiceCreator ? 'Hide Creator' : '+ Create Voice'}
                      </Button>
                    </div>
                    {isLoadingVoices ? (
                      <div className="flex items-center gap-2 text-cyan-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400/40 border-t-cyan-400"></div>
                        Loading voices...
                      </div>
                    ) : (
                      <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                        <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                          {availableVoices.map((voice) => (
                            <SelectItem 
                              key={voice.id || voice.voice_id} 
                              value={voice.id || voice.voice_id}
                              className="text-cyan-300 hover:bg-cyan-500/20"
                            >
                              <div className="flex items-center gap-2">
                                {voice.name || voice.voice_id}
                                {voice.category && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                                    {voice.category}
                                  </span>
                                )}
                              </div>
                              {voice.description && (
                                <span className="text-xs text-gray-400 ml-2 block">- {voice.description}</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Voice Creator Section */}
                  {showVoiceCreator && (
                    <div className="mt-4 p-4 bg-black/30 rounded-lg border border-cyan-500/20">
                      {/* Tabs */}
                      <div className="flex gap-2 mb-4 border-b border-cyan-500/20">
                        <button
                          onClick={() => setVoiceCreatorTab('clone')}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            voiceCreatorTab === 'clone'
                              ? 'text-cyan-400 border-b-2 border-cyan-400'
                              : 'text-gray-400 hover:text-cyan-300'
                          }`}
                        >
                          Voice Cloning
                        </button>
                        <button
                          onClick={() => setVoiceCreatorTab('design')}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            voiceCreatorTab === 'design'
                              ? 'text-cyan-400 border-b-2 border-cyan-400'
                              : 'text-gray-400 hover:text-cyan-300'
                          }`}
                        >
                          Voice Design
                        </button>
                        <button
                          onClick={() => setVoiceCreatorTab('changer')}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            voiceCreatorTab === 'changer'
                              ? 'text-cyan-400 border-b-2 border-cyan-400'
                              : 'text-gray-400 hover:text-cyan-300'
                          }`}
                        >
                          Voice Changer
                        </button>
                      </div>

                      {/* Voice Cloning Tab */}
                      {voiceCreatorTab === 'clone' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <p className="text-xs text-blue-300">
                              💡 <strong>Voice Cloning:</strong> Upload audio samples to clone a voice. 
                              Instant cloning works with short samples, Professional requires longer samples for better quality.
                              Creator plan or higher required.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">Voice Name</label>
                            <input
                              type="text"
                              value={cloneName}
                              onChange={(e) => setCloneName(e.target.value)}
                              placeholder="Enter a name for your cloned voice"
                              className="w-full bg-black/30 border border-cyan-500/50 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-400"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">Clone Type</label>
                            <Select value={cloneType} onValueChange={(v: 'instant' | 'professional') => setCloneType(v)}>
                              <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 border-cyan-500/50">
                                <SelectItem value="instant" className="text-cyan-300 hover:bg-cyan-500/20">
                                  Instant (Quick, short samples)
                                </SelectItem>
                                <SelectItem value="professional" className="text-cyan-300 hover:bg-cyan-500/20">
                                  Professional (Better quality, longer samples)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">
                              Audio Files {cloneFiles.length > 0 && `(${cloneFiles.length} selected)`}
                            </label>
                            <input
                              type="file"
                              accept="audio/*"
                              multiple
                              onChange={handleFileSelect}
                              className="w-full bg-black/30 border border-cyan-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
                            />
                            <p className="text-xs text-gray-400">
                              Upload audio files (.mp3, .wav, etc.). For instant cloning: 1-5 files. For professional: 5+ files recommended.
                            </p>
                          </div>

                          <Button
                            onClick={handleVoiceClone}
                            disabled={isCloningVoice || !cloneName.trim() || cloneFiles.length === 0}
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                          >
                            {isCloningVoice ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                                Cloning Voice...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4 mr-2" />
                                Clone Voice
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Voice Design Tab */}
                      {voiceCreatorTab === 'design' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <p className="text-xs text-purple-300">
                              ✨ <strong>Voice Design:</strong> Create new voices using text descriptions. 
                              Specify age, gender, accent, tone, and other characteristics. 
                              Generates 3 voice previews to choose from.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">
                              Voice Description ({voiceDesignDescription.length}/1000)
                            </label>
                            <Textarea
                              value={voiceDesignDescription}
                              onChange={(e) => setVoiceDesignDescription(e.target.value)}
                              placeholder="Describe your voice: age, gender, accent, tone, personality (e.g., 'A young female voice with a British accent, warm and friendly tone')"
                              className="w-full bg-black/30 border-cyan-500/50 text-white placeholder-gray-500 min-h-[100px]"
                              maxLength={1000}
                            />
                            <p className="text-xs text-gray-400">
                              Must be between 20-1000 characters. Describe the voice characteristics you want.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">
                              Preview Text ({voiceDesignText.length}/1000)
                            </label>
                            <Textarea
                              value={voiceDesignText}
                              onChange={(e) => setVoiceDesignText(e.target.value)}
                              placeholder="Enter text to preview how the voice sounds (e.g., 'Hello, this is a preview of the generated voice. How does it sound?')"
                              className="w-full bg-black/30 border-cyan-500/50 text-white placeholder-gray-500 min-h-[120px]"
                              maxLength={1000}
                            />
                            <p className="text-xs text-gray-400">
                              Must be between 100-1000 characters. This text will be used to generate voice previews.
                            </p>
                          </div>

                          <Button
                            onClick={handleVoiceDesign}
                            disabled={
                              isDesigningVoice || 
                              voiceDesignDescription.length < 20 || 
                              voiceDesignDescription.length > 1000 ||
                              voiceDesignText.length < 100 || 
                              voiceDesignText.length > 1000
                            }
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                          >
                            {isDesigningVoice ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                                Designing Voice...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4 mr-2" />
                                Design Voice
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Voice Changer Tab */}
                      {voiceCreatorTab === 'changer' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                            <p className="text-xs text-green-300">
                              🎭 <strong>Voice Changer:</strong> Transform any audio to a different voice while preserving emotion, delivery, and nuances. 
                              Captures whispers, laughs, accents, and emotional cues. Best for segments under 5 minutes.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">Source Audio</label>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleVoiceChangerFileSelect}
                              className="w-full bg-black/30 border border-cyan-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                            />
                            {voiceChangerFile && (
                              <p className="text-xs text-green-300">
                                Selected: {voiceChangerFile.name} ({(voiceChangerFile.size / 1024 / 1024).toFixed(2)} MB)
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              Upload audio file (.mp3, .wav, etc.). Recommended: under 5 minutes for optimal processing. Max 50MB.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">Target Voice</label>
                            <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                              <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300">
                                <SelectValue placeholder="Select target voice" />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                                {availableVoices.map((voice) => (
                                  <SelectItem 
                                    key={voice.id || voice.voice_id} 
                                    value={voice.id || voice.voice_id}
                                    className="text-cyan-300 hover:bg-cyan-500/20"
                                  >
                                    {voice.name || voice.voice_id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-400">
                              The voice to convert your audio to. Can use default, cloned, or designed voices.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">Model</label>
                            <Select value={voiceChangerModel} onValueChange={setVoiceChangerModel}>
                              <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 border-cyan-500/50">
                                <SelectItem value="eleven_multilingual_sts_v2" className="text-cyan-300 hover:bg-cyan-500/20">
                                  Multilingual STS v2 (29 languages, recommended)
                                </SelectItem>
                                <SelectItem value="eleven_english_sts_v2" className="text-cyan-300 hover:bg-cyan-500/20">
                                  English STS v2 (English only)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Voice Settings Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Stability */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-cyan-400 text-sm font-semibold">Stability</label>
                                <span className="text-cyan-300 text-sm">{voiceChangerStability.toFixed(2)}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={voiceChangerStability}
                                onChange={(e) => setVoiceChangerStability(parseFloat(e.target.value))}
                                className="w-full"
                              />
                              <p className="text-xs text-gray-400">100% recommended for maximum consistency</p>
                            </div>

                            {/* Style */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-cyan-400 text-sm font-semibold">Style</label>
                                <span className="text-cyan-300 text-sm">{voiceChangerStyle.toFixed(2)}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={voiceChangerStyle}
                                onChange={(e) => setVoiceChangerStyle(parseFloat(e.target.value))}
                                className="w-full"
                              />
                              <p className="text-xs text-gray-400">Set to 0% when input is already expressive</p>
                            </div>
                          </div>

                          {/* Remove Background Noise */}
                          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-cyan-500/20">
                            <div>
                              <label className="text-cyan-400 text-sm font-semibold">Remove Background Noise</label>
                              <p className="text-xs text-gray-400">Minimize environmental sounds in the output</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={voiceChangerRemoveNoise}
                                onChange={(e) => setVoiceChangerRemoveNoise(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                          </div>

                          <Button
                            onClick={handleVoiceChange}
                            disabled={isChangingVoice || !voiceChangerFile || !selectedVoiceId}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                          >
                            {isChangingVoice ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                                Changing Voice...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4 mr-2" />
                                Change Voice
                              </>
                            )}
                          </Button>

                          {/* Success Message */}
                          {changedVoiceUrl && (
                            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                              <p className="text-xs text-green-300 mb-2">
                                ✅ Voice changed successfully! The audio player below will now play your converted audio.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <label className="text-cyan-400 text-sm font-semibold">Model</label>
                    <Select value={selectedElevenLabsModel} onValueChange={setSelectedElevenLabsModel}>
                      <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[400px] overflow-y-auto">
                        <SelectItem value="eleven_multilingual_v2" className="text-cyan-300 hover:bg-cyan-500/20">
                          <div>
                            <div className="font-semibold">Multilingual v2</div>
                            <div className="text-xs text-gray-400">Best quality, 29 languages, 10K chars</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="eleven_turbo_v2_5" className="text-cyan-300 hover:bg-cyan-500/20">
                          <div>
                            <div className="font-semibold">Turbo v2.5</div>
                            <div className="text-xs text-gray-400">High quality, low latency (~250ms), 32 languages, 40K chars, 50% cheaper</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="eleven_flash_v2_5" className="text-cyan-300 hover:bg-cyan-500/20">
                          <div>
                            <div className="font-semibold">Flash v2.5</div>
                            <div className="text-xs text-gray-400">Ultra-low latency (~75ms), 32 languages, 40K chars, 50% cheaper</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="eleven_v3" className="text-cyan-300 hover:bg-cyan-500/20">
                          <div>
                            <div className="font-semibold">Eleven v3 (Alpha)</div>
                            <div className="text-xs text-gray-400">Most expressive, 70+ languages, 3K chars, multi-speaker</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedElevenLabsModel === 'eleven_multilingual_v2' && 'Best for: Long-form content, most stable'}
                      {selectedElevenLabsModel === 'eleven_turbo_v2_5' && 'Best for: Real-time applications, balanced quality/speed'}
                      {selectedElevenLabsModel === 'eleven_flash_v2_5' && 'Best for: Fast responses, interactive applications'}
                      {selectedElevenLabsModel === 'eleven_v3' && 'Best for: Dramatic performances, emotional content'}
                    </p>
                  </div>

                  {/* Voice Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stability */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-cyan-400 text-sm font-semibold">Stability</label>
                        <span className="text-cyan-300 text-sm">{stability.toFixed(2)}</span>
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
                      <p className="text-xs text-gray-400">Higher = more consistent, Lower = more expressive</p>
                    </div>

                    {/* Similarity Boost */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-cyan-400 text-sm font-semibold">Similarity Boost</label>
                        <span className="text-cyan-300 text-sm">{similarityBoost.toFixed(2)}</span>
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
                      <p className="text-xs text-gray-400">Higher = more like original voice</p>
                    </div>

                    {/* Style */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-cyan-400 text-sm font-semibold">Style</label>
                        <span className="text-cyan-300 text-sm">{style.toFixed(2)}</span>
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
                      <p className="text-xs text-gray-400">Higher = more style exaggeration</p>
                    </div>

                    {/* Speaker Boost */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-cyan-400 text-sm font-semibold">Speaker Boost</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useSpeakerBoost}
                            onChange={(e) => setUseSpeakerBoost(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-400">Enhances voice quality and clarity</p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                    <p className="text-xs text-cyan-300">
                      💡 <strong>Tip:</strong> Adjust these settings to fine-tune your voice output. Stability controls consistency, Similarity Boost affects voice matching, Style adds expressiveness, and Speaker Boost enhances overall quality.
                    </p>
                  </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Text Generation Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-cyan-500/30 shadow-cyan-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('generate-text')) {
                        newSet.delete('generate-text')
                      } else {
                        newSet.add('generate-text')
                      }
                      return newSet
                    })
                  }}
                >
                  <h2 className="text-xl font-semibold text-white">Generate Text</h2>
                  {expandedCards.has('generate-text') ? (
                    <ChevronUp className="h-5 w-5 text-cyan-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-cyan-400" />
                  )}
                </div>

                {expandedCards.has('generate-text') && (
                  <>
                    <textarea
                  placeholder="Enter a prompt to generate text... (e.g., 'Write a story about a futuristic city', 'Create a narration about space exploration')"
                  className="w-full bg-black/30 text-lg text-white placeholder-cyan-600 resize-none border border-cyan-500/30 rounded-lg p-4 focus:ring-2 focus:ring-cyan-400 min-h-[100px]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />

                {/* Generate Text Button */}
                <Button
                  onClick={handleGenerateText}
                  disabled={isGeneratingText || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                >
                  {isGeneratingText ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                      Generating Text...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Generate Text
                    </>
                  )}
                </Button>

                {/* Text Generation Progress */}
                {isGeneratingText && (
                  <div className="space-y-2">
                    <div className="w-full bg-black/40 rounded-full h-2 border border-cyan-500/50 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 transition-all duration-500 ease-out"
                        style={{ width: `${textProgressPercentage}%` }}
                      />
                    </div>
                    <p className="text-cyan-400 text-sm text-center">
                      {textGenerationProgress || 'Generating...'} ({Math.round(textProgressPercentage)}%)
                    </p>
                  </div>
                )}

                {/* Generated Text Display */}
                {generatedText && generatedText.trim() && (
                  <div className="space-y-4 mt-4">
                    <div className="bg-neutral-900/50 p-4 rounded-2xl border border-green-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white">Generated Text</h3>
                        <div className="flex gap-2">
                          {!isEditingGeneratedText ? (
                            <>
                              <Button
                                onClick={() => {
                                  setEditedGeneratedText(generatedText)
                                  setIsEditingGeneratedText(true)
                                }}
                                variant="outline"
                                size="sm"
                                className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                onClick={copyToAudioTextarea}
                                variant="outline"
                                size="sm"
                                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Use for Audio
                              </Button>
                              <Button
                                onClick={copyGeneratedText}
                                variant="ghost"
                                size="sm"
                                className="text-cyan-400 hover:bg-cyan-400/10"
                              >
                                {copied ? (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => {
                                  setGeneratedText(editedGeneratedText)
                                  setIsEditingGeneratedText(false)
                                }}
                                variant="outline"
                                size="sm"
                                className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Save
                              </Button>
                              <Button
                                onClick={() => {
                                  setIsEditingGeneratedText(false)
                                  setEditedGeneratedText("")
                                }}
                                variant="outline"
                                size="sm"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditingGeneratedText ? (
                        <Textarea
                          value={editedGeneratedText}
                          onChange={(e) => setEditedGeneratedText(e.target.value)}
                          className="w-full bg-black/20 text-white border-green-500/10 rounded-lg p-4 text-base leading-relaxed whitespace-pre-wrap break-words resize-none min-h-[150px]"
                          placeholder="Edit your generated text here..."
                        />
                      ) : (
                        <div 
                          className="text-white leading-relaxed break-words p-4 bg-black/20 rounded-lg border border-green-500/10"
                          style={{
                            wordSpacing: 'normal',
                            lineHeight: '1.8',
                            fontFamily: 'inherit'
                          }}
                        >
                          {(() => {
                            const paragraphs = formatTextIntoParagraphs(generatedText)
                            return paragraphs.map((paragraph, index) => (
                              <p 
                                key={index} 
                                className="mb-4 last:mb-0"
                                style={{
                                  textIndent: '0',
                                  textAlign: 'left',
                                  marginBottom: index < paragraphs.length - 1 ? '1rem' : '0'
                                }}
                              >
                                {paragraph}
                              </p>
                            ))
                          })()}
                          {isStreaming && (
                            <span className="inline-block w-2 h-5 bg-cyan-400 ml-1 animate-pulse"></span>
                          )}
                        </div>
                      )}
                      <p className="text-cyan-400/70 text-sm mt-2">
                        {generatedText.length} characters
                      </p>
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>

            {/* Text to Audio Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-cyan-500/30 shadow-cyan-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('text-to-audio')) {
                        newSet.delete('text-to-audio')
                      } else {
                        newSet.add('text-to-audio')
                      }
                      return newSet
                    })
                  }}
                >
                  <h2 className="text-xl font-semibold text-white">Text to Convert to Audio</h2>
                  <div className="flex items-center gap-2">
                    {expandedCards.has('text-to-audio') ? (
                      <ChevronUp className="h-5 w-5 text-cyan-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-cyan-400" />
                    )}
                    {userCredits <= 50 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowCreditsDialog(true)
                        }}
                        className={`${userCredits <= 10 ? 'text-red-400 hover:bg-red-400/10' : 'text-cyan-400 hover:bg-cyan-400/10'}`}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {userCredits} credits
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.reload()
                      }}
                      className="text-cyan-400 hover:bg-cyan-400/10"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expandedCards.has('text-to-audio') && (
                  <>
                    <textarea
                  placeholder="Enter the text you want to convert to speech... (e.g., 'Hello, welcome to INFINITO AI. How can I help you today?')"
                  className="w-full bg-black/30 text-lg text-white placeholder-cyan-600 resize-none border border-cyan-500/30 rounded-lg p-4 focus:ring-2 focus:ring-cyan-400 min-h-[120px]"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                {/* Character count */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className={`text-sm ${
                      selectedAudioModel === 'elevenlabs' && text.length > getElevenLabsCharLimit(selectedElevenLabsModel)
                        ? 'text-red-400'
                        : selectedAudioModel === 'elevenlabs' && text.length > getElevenLabsCharLimit(selectedElevenLabsModel) * 0.8
                        ? 'text-yellow-400'
                        : 'text-cyan-400/70'
                    }`}>
                      {text.length} characters
                      {selectedAudioModel === 'elevenlabs' && (
                        <span className="text-xs ml-2">
                          / {getElevenLabsCharLimit(selectedElevenLabsModel).toLocaleString()} limit ({selectedElevenLabsModel})
                        </span>
                      )}
                    </p>
                    {selectedAudioModel === 'elevenlabs' && text.length > getElevenLabsCharLimit(selectedElevenLabsModel) && (
                      <p className="text-xs text-red-400 mt-1">
                        ⚠️ Text exceeds limit for {selectedElevenLabsModel}. Please shorten your text or select a different model.
                      </p>
                    )}
                  </div>
                  {/* Enhance Text Button */}
                  <Button
                    onClick={enhanceTextWithLLM}
                    disabled={!text.trim() || isEnhancingText}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                  >
                    {isEnhancingText ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Enhance Text with AI
                      </>
                    )}
                  </Button>
                </div>
                  </>
                )}
              </div>
            </div>

            {/* Custom Voice Selector - Only shown when ElevenLabs is selected */}
            {selectedAudioModel === 'elevenlabs' && (
              <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-cyan-500/30 shadow-cyan-500/20">
                <div className="space-y-4">
                  <div 
                    className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setExpandedCards(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has('custom-voice')) {
                          newSet.delete('custom-voice')
                        } else {
                          newSet.add('custom-voice')
                        }
                        return newSet
                      })
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5 text-cyan-400" />
                      <h2 className="text-xl font-semibold text-white">Select Custom Voice</h2>
                    </div>
                    {expandedCards.has('custom-voice') ? (
                      <ChevronUp className="h-5 w-5 text-cyan-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-cyan-400" />
                    )}
                  </div>

                  {expandedCards.has('custom-voice') && (
                    <>
                      <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20 mb-4">
                        <p className="text-xs text-cyan-300">
                          🎤 Choose a custom voice for your text-to-speech conversion. Select from your available ElevenLabs voices.
                        </p>
                      </div>

                      {/* Voice Selection */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-cyan-400 text-sm font-semibold">Custom Voice</label>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              fetchAvailableVoices()
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                            disabled={isLoadingVoices}
                            title="Refresh voices list"
                          >
                            <RefreshCw className={`h-3 w-3 ${isLoadingVoices ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        {isLoadingVoices ? (
                          <div className="flex items-center gap-2 text-cyan-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400/40 border-t-cyan-400"></div>
                            Loading voices...
                          </div>
                        ) : (
                          <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                            <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                              <SelectValue placeholder="Select a custom voice" />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                              {availableVoices.length > 0 ? (
                                availableVoices.map((voice) => (
                                  <SelectItem 
                                    key={voice.id || voice.voice_id} 
                                    value={voice.id || voice.voice_id}
                                    className="text-cyan-300 hover:bg-cyan-500/20"
                                  >
                                    <div className="flex items-center gap-2">
                                      {voice.name || voice.voice_id}
                                      {voice.category && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                                          {voice.category}
                                        </span>
                                      )}
                                    </div>
                                    {voice.description && (
                                      <span className="text-xs text-gray-400 ml-2 block">- {voice.description}</span>
                                    )}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-voices" disabled className="text-gray-500">
                                  No custom voices available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        {selectedVoiceId && availableVoices.length > 0 && (
                          <p className="text-xs text-cyan-400/70 mt-2">
                            Selected voice will be used for text-to-speech conversion
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Audio Generation Progress */}
            {isGeneratingAudio && (
              <div className="space-y-3">
                <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-800 p-5 rounded-md border-2 border-cyan-400/60">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  <div className="relative flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/40 border-t-white"></div>
                    <span className="text-white/80 text-lg sm:text-xl font-bold tracking-[0.2em] uppercase">
                      {audioGenerationProgress || 'GENERATING AUDIO...'}
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-black/40 rounded-full h-3 border border-cyan-500/50 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-800 transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                {/* Percentage Display */}
                <div className="text-center">
                  <span className="text-cyan-400 text-2xl font-bold">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerateAudio}
              disabled={
                isGeneratingAudio || 
                !text.trim() || 
                (selectedAudioModel === 'elevenlabs' && text.length > getElevenLabsCharLimit(selectedElevenLabsModel))
              }
              className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-800 hover:from-cyan-700 hover:via-blue-700 hover:to-cyan-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
            >
              {isGeneratingAudio ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                  GENERATING AUDIO...
                </>
              ) : (
                <>
                  <Volume2 className="h-5 w-5 mr-3" />
                  GENERATE AUDIO
                </>
              )}
            </Button>

            {/* Generated Audio Player */}
            {audioUrl && (
              <div className="bg-neutral-900/50 p-6 rounded-2xl border border-green-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Generated Audio</h3>
                  <span className="text-sm text-cyan-400 font-mono bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/30">
                    {text.length} chars
                  </span>
                </div>
                
                {/* Hidden audio element */}
                <audio ref={audioRef} src={audioUrl} className="hidden" />
                
                {/* Audio Player Controls */}
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="w-full bg-black/40 rounded-full h-2 border border-cyan-500/30 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 transition-all duration-100"
                      style={{ width: audioDuration > 0 ? `${(currentTime / audioDuration) * 100}%` : '0%' }}
                    />
                  </div>
                  
                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={togglePlayPause}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-full p-3"
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </Button>
                      <div className="text-white">
                        <span className="text-sm">{formatTime(currentTime)}</span>
                        <span className="text-sm text-gray-400"> / {formatTime(audioDuration)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleSaveToLibrary}
                        disabled={isSavingToLibrary || savedToLibrary}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          savedToLibrary
                            ? 'bg-green-600 text-white cursor-default'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isSavingToLibrary ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white"></div>
                            Saving...
                          </>
                        ) : savedToLibrary ? (
                          <>
                            <Check className="h-4 w-4" />
                            Saved to Library
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save to Library
                          </>
                        )}
                      </Button>
                      <a 
                        href={audioUrl} 
                        download
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Audio
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>
            </div>

            {/* Right Panel */}
            <div className="hidden lg:block lg:col-span-3 space-y-6">
              <HudPanel title="Audio Player Status">
                {audioUrl ? (
                  <>
                    <p className="flex items-center gap-2 text-green-400">
                      <AztecIcon name="jaguar" className="text-green-400 animate-icon-pulse" /> 
                      Audio Ready
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Duration: {formatTime(audioDuration)}
                    </p>
                    {isPlaying ? (
                      <p className="text-xs text-cyan-400 mt-1">
                        Currently Playing
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        Paused
                      </p>
                    )}
                  </>
                ) : (
                  <p className="flex items-center gap-2 text-gray-500">
                    <AztecIcon name="jaguar" className="text-gray-500" /> 
                    No audio generated
                  </p>
                )}
              </HudPanel>

              <HudPanel title="User Stats">
                <p className="flex items-center gap-2">
                  <AztecIcon name="jaguar" className="text-green-400 animate-icon-pulse" /> 
                  Credits: <span className="text-white">{userCredits}</span>
                </p>
                {generatedText && (
                  <p className="text-xs text-gray-400 mt-2">
                    Text Length: {generatedText.length.toLocaleString()} chars
                  </p>
                )}
                {prompt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Prompt Length: {prompt.length} chars
                  </p>
                )}
                {text && (
                  <p className="text-xs text-gray-400 mt-1">
                    Input Text: {text.length} chars
                  </p>
                )}
              </HudPanel>

              <HudPanel title="Data Stream">
                {isStreaming ? (
                  <p className="truncate text-cyan-400">[LIVE] Streaming Response...</p>
                ) : generatedText ? (
                  <p className="truncate text-green-400">[DONE] Text Generated</p>
                ) : (
                  <p className="truncate text-gray-600">[IDLE] Awaiting Input...</p>
                )}
                {isGeneratingAudio && (
                  <p className="truncate text-purple-400 mt-1">[PROC] Generating Audio...</p>
                )}
                {error && (
                  <p className="truncate text-red-400 mt-1">[ERROR] {error.substring(0, 30)}...</p>
                )}
              </HudPanel>
            </div>
          </main>
        ) : (
          <main className="flex-1 space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                <span className="text-cyan-400">🔊</span>{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-600">
                  AUDIO MODE
                </span>
              </h1>
              <p className="text-gray-300 text-lg">
                AI-powered text-to-speech generation with natural voices
              </p>
            </div>

            <div className="max-w-5xl mx-auto space-y-6">
            {/* NOTE: Content is in the center panel above - this section needs all the same content */}
            {/* For now, redirecting to show panels for admins, but non-admins see regular layout */}
            {/* The full content should be duplicated here from lines 1542-3098 */}
            {/* Model Selectors - duplicate from center panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Text Generation Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-5 w-5 text-cyan-400" />
                  <span className="text-cyan-400 text-sm font-semibold uppercase">Text Generation Model</span>
                </div>
                <Select value={selectedTextModel} onValueChange={setSelectedTextModel}>
                  <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                    {isModelEnabled('gpt-4o') && <SelectItem value="gpt-4o" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4O</SelectItem>}
                    {isModelEnabled('gpt-4o-mini') && <SelectItem value="gpt-4o-mini" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4O MINI</SelectItem>}
                    {isModelEnabled('gpt-4-turbo') && <SelectItem value="gpt-4-turbo" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4 TURBO</SelectItem>}
                    {isModelEnabled('gpt-4') && <SelectItem value="gpt-4" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4</SelectItem>}
                    {isModelEnabled('gpt-3.5-turbo') && <SelectItem value="gpt-3.5-turbo" className="text-cyan-300 hover:bg-cyan-500/20">GPT-3.5 TURBO</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-cyan-400 text-xs mt-2">
                  Generates text from prompts
                </p>
              </div>

              {/* LLM Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit className="h-5 w-5 text-cyan-400" />
                  <span className="text-cyan-400 text-sm font-semibold uppercase">Text Enhancement Model</span>
                </div>
                <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                  <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md">
                    <SelectItem value="gpt-4o" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4O</SelectItem>
                    <SelectItem value="gpt-4o-mini" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4O MINI</SelectItem>
                    <SelectItem value="gpt-4-turbo" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4 TURBO</SelectItem>
                    <SelectItem value="gpt-4" className="text-cyan-300 hover:bg-cyan-500/20">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo" className="text-cyan-300 hover:bg-cyan-500/20">GPT-3.5 TURBO</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-cyan-400 text-xs mt-2">
                  Enhances your text for natural speech
                </p>
              </div>

              {/* Audio Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Volume2 className="h-5 w-5 text-cyan-400" />
                  <span className="text-cyan-400 text-sm font-semibold uppercase">Text-to-Speech Model</span>
                </div>
                <Select value={selectedAudioModel} onValueChange={setSelectedAudioModel}>
                  <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                    {isModelEnabled('elevenlabs') && <SelectItem value="elevenlabs" className="text-cyan-300 hover:bg-cyan-500/20">ELEVENLABS</SelectItem>}
                    {isModelEnabled('google_tts') && <SelectItem value="google_tts" className="text-cyan-300 hover:bg-cyan-500/20">GOOGLE TTS</SelectItem>}
                    {isModelEnabled('amazon_polly') && <SelectItem value="amazon_polly" className="text-cyan-300 hover:bg-cyan-500/20">AMAZON POLLY</SelectItem>}
                    {isModelEnabled('openai_tts') && <SelectItem value="openai_tts" className="text-cyan-300 hover:bg-cyan-500/20">OPENAI TTS</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-cyan-400 text-xs mt-2">
                  {getAudioModelInfo(selectedAudioModel).cost} • {getAudioModelInfo(selectedAudioModel).features}
                </p>
              </div>
            </div>

            {/* Music Generation Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-purple-500/30 shadow-purple-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('music-generator')) {
                        newSet.delete('music-generator')
                      } else {
                        newSet.add('music-generator')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-purple-400" />
                    <h2 className="text-xl font-semibold text-white">🎵 Eleven Music Generator</h2>
                  </div>
                  {expandedCards.has('music-generator') ? (
                    <ChevronUp className="h-5 w-5 text-purple-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-purple-400" />
                  )}
                </div>

                {expandedCards.has('music-generator') && (
                  <>
                    <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 mb-4">
                  <p className="text-xs text-purple-300">
                    🎼 Create studio-grade music with natural language prompts. Supports vocals, instrumental, 
                    multiple languages, and duration from 10 seconds to 5 minutes. 
                    <strong className="ml-1">Commercial use cleared!</strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-purple-400 text-sm font-semibold">Music Prompt</label>
                      <Button
                        onClick={enhanceMusicPromptWithLLM}
                        disabled={isEnhancingMusicPrompt || !musicPrompt.trim()}
                        variant="outline"
                        size="sm"
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                      >
                        {isEnhancingMusicPrompt ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-purple-400/40 border-t-purple-400 mr-2"></div>
                            Enhancing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 mr-2" />
                            Enhance Prompt
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={musicPrompt}
                      onChange={(e) => setMusicPrompt(e.target.value)}
                      placeholder="Describe the music you want (e.g., 'Upbeat electronic dance music with synthesizers and bass drops', 'Acoustic guitar ballad with emotional vocals', 'Jazzy piano piece in the style of Thelonious Monk')"
                      className="w-full bg-black/30 border-purple-500/50 text-white placeholder-gray-500 min-h-[120px]"
                    />
                    {enhancedMusicPrompt && enhancedMusicPrompt !== musicPrompt && (
                      <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-purple-300 font-semibold">✨ Enhanced Prompt:</p>
                          <Button
                            onClick={() => setMusicPrompt(enhancedMusicPrompt)}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-purple-400 hover:text-purple-300"
                          >
                            Use Enhanced
                          </Button>
                        </div>
                        <p className="text-xs text-purple-200">{enhancedMusicPrompt}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      💡 <strong>Tip:</strong> Click "Enhance Prompt" to automatically improve your prompt with AI. Describe the genre, style, mood, instruments, vocals, and any other musical characteristics.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Duration */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-purple-400 text-sm font-semibold">Duration (seconds)</label>
                        <span className="text-purple-300 text-sm">{musicDuration}s</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="300"
                        step="5"
                        value={musicDuration}
                        onChange={(e) => setMusicDuration(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-purple-400/70">
                        <span>10s</span>
                        <span>5min</span>
                      </div>
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                      <label className="text-purple-400 text-sm font-semibold">Language</label>
                      <Select value={musicLanguage} onValueChange={setMusicLanguage}>
                        <SelectTrigger className="bg-transparent border-purple-500/50 text-purple-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-purple-500/50">
                          <SelectItem value="en" className="text-purple-300 hover:bg-purple-500/20">English</SelectItem>
                          <SelectItem value="es" className="text-purple-300 hover:bg-purple-500/20">Spanish</SelectItem>
                          <SelectItem value="de" className="text-purple-300 hover:bg-purple-500/20">German</SelectItem>
                          <SelectItem value="ja" className="text-purple-300 hover:bg-purple-500/20">Japanese</SelectItem>
                          <SelectItem value="fr" className="text-purple-300 hover:bg-purple-500/20">French</SelectItem>
                          <SelectItem value="it" className="text-purple-300 hover:bg-purple-500/20">Italian</SelectItem>
                          <SelectItem value="pt" className="text-purple-300 hover:bg-purple-500/20">Portuguese</SelectItem>
                          <SelectItem value="zh" className="text-purple-300 hover:bg-purple-500/20">Chinese</SelectItem>
                          <SelectItem value="ko" className="text-purple-300 hover:bg-purple-500/20">Korean</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Vocals/Instrumental Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-purple-500/20">
                      <div>
                        <label className="text-purple-400 text-sm font-semibold">With Vocals</label>
                        <p className="text-xs text-gray-400">Include vocal tracks</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={musicHasVocals}
                          onChange={(e) => {
                            setMusicHasVocals(e.target.checked)
                            if (e.target.checked) setMusicIsInstrumental(false)
                          }}
                          disabled={musicIsInstrumental}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-purple-500/20">
                      <div>
                        <label className="text-purple-400 text-sm font-semibold">Instrumental Only</label>
                        <p className="text-xs text-gray-400">No vocals, just instruments</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={musicIsInstrumental}
                          onChange={(e) => {
                            setMusicIsInstrumental(e.target.checked)
                            if (e.target.checked) setMusicHasVocals(false)
                          }}
                          disabled={musicHasVocals}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50"></div>
                      </label>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerateMusic}
                    disabled={isGeneratingMusic || !musicPrompt.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 hover:from-purple-700 hover:via-pink-700 hover:to-purple-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                  >
                    {isGeneratingMusic ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                        GENERATING MUSIC...
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-5 w-5 mr-3" />
                        GENERATE MUSIC
                      </>
                    )}
                  </Button>

                  {/* Music Generation Progress */}
                  {isGeneratingMusic && (
                    <div className="space-y-2">
                      <div className="w-full bg-black/40 rounded-full h-2 border border-purple-500/50 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 transition-all duration-500 ease-out animate-pulse"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <p className="text-purple-400 text-sm text-center">
                        {musicGenerationProgress || 'Creating studio-grade music...'}
                      </p>
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <p className="text-xs text-purple-300">
                      💡 <strong>Tips:</strong> Be specific about genre, mood, instruments, and style. 
                      Duration: 10 seconds to 5 minutes. Commercial use cleared for film, TV, podcasts, ads, gaming!
                    </p>
                  </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sound Effects Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-orange-500/30 shadow-orange-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('sound-effects')) {
                        newSet.delete('sound-effects')
                      } else {
                        newSet.add('sound-effects')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-orange-400" />
                    <h2 className="text-xl font-semibold text-white">🎬 Sound Effects</h2>
                  </div>
                  {expandedCards.has('sound-effects') ? (
                    <ChevronUp className="h-5 w-5 text-orange-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-orange-400" />
                  )}
                </div>

                {expandedCards.has('sound-effects') && (
                  <>
                    <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 mb-4">
                      <p className="text-xs text-orange-300">
                        🔊 Create high-quality sound effects from text descriptions. Perfect for cinematic sound design, 
                        game audio, Foley, and ambient sounds. Supports precise timing, style control, and seamless looping.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-orange-400 text-sm font-semibold">Sound Effect Description</label>
                        <Textarea
                          value={soundEffectPrompt}
                          onChange={(e) => setSoundEffectPrompt(e.target.value)}
                          placeholder="Describe the sound effect (e.g., 'Glass shattering on concrete', 'Thunder rumbling in the distance', '90s hip-hop drum loop, 90 BPM', 'Footsteps on gravel, then a metallic door opens')"
                          className="w-full bg-black/30 border-orange-500/50 text-white placeholder-gray-500 min-h-[120px]"
                        />
                        <p className="text-xs text-gray-400">
                          💡 <strong>Tip:</strong> Use clear, concise descriptions. For complex sequences, describe the sequence of events. 
                          Supports audio terminology like "impact", "whoosh", "ambience", "braam", "glitch", "drone".
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Duration */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-orange-400 text-sm font-semibold">Duration (seconds)</label>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={soundEffectDuration !== null}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSoundEffectDuration(5)
                                  } else {
                                    setSoundEffectDuration(null)
                                  }
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                              <span className="ml-2 text-xs text-orange-300">Set Duration</span>
                            </label>
                          </div>
                          {soundEffectDuration !== null ? (
                            <>
                              <input
                                type="range"
                                min="0.1"
                                max="30"
                                step="0.1"
                                value={soundEffectDuration}
                                onChange={(e) => setSoundEffectDuration(parseFloat(e.target.value))}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-orange-400/70">
                                <span>0.1s</span>
                                <span className="text-orange-300 font-semibold">{soundEffectDuration.toFixed(1)}s</span>
                                <span>30s</span>
                              </div>
                              <p className="text-xs text-gray-400">Cost: 40 credits per second when duration is specified</p>
                            </>
                          ) : (
                            <p className="text-xs text-orange-300/70">Auto-determined based on prompt (default)</p>
                          )}
                        </div>

                        {/* Prompt Influence */}
                        <div className="space-y-2">
                          <label className="text-orange-400 text-sm font-semibold">Prompt Influence</label>
                          <Select value={soundEffectPromptInfluence} onValueChange={(value: 'high' | 'low') => setSoundEffectPromptInfluence(value)}>
                            <SelectTrigger className="bg-transparent border-orange-500/50 text-orange-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-orange-500/50">
                              <SelectItem value="high" className="text-orange-300 hover:bg-orange-500/20">High - More literal interpretation</SelectItem>
                              <SelectItem value="low" className="text-orange-300 hover:bg-orange-500/20">Low - More creative with variations</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-400">
                            {soundEffectPromptInfluence === 'high' 
                              ? 'Strictly follows your prompt description'
                              : 'More creative interpretation with added variations'}
                          </p>
                        </div>
                      </div>

                      {/* Looping Option */}
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-orange-500/20">
                        <div>
                          <label className="text-orange-400 text-sm font-semibold">Enable Looping</label>
                          <p className="text-xs text-gray-400">Seamless looping for sounds longer than 30 seconds</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={soundEffectLooping}
                            onChange={(e) => setSoundEffectLooping(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      {/* Generate Button */}
                      <Button
                        onClick={handleGenerateSoundEffect}
                        disabled={isGeneratingSoundEffect || !soundEffectPrompt.trim()}
                        className="w-full bg-gradient-to-r from-orange-600 via-red-600 to-orange-800 hover:from-orange-700 hover:via-red-700 hover:to-orange-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                      >
                        {isGeneratingSoundEffect ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                            GENERATING SOUND EFFECT...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-5 w-5 mr-3" />
                            GENERATE SOUND EFFECT
                          </>
                        )}
                      </Button>

                      {/* Sound Effect Generation Progress */}
                      {isGeneratingSoundEffect && (
                        <div className="space-y-2">
                          <div className="w-full bg-black/40 rounded-full h-2 border border-orange-500/50 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-orange-600 via-red-600 to-orange-800 transition-all duration-500 ease-out animate-pulse"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <p className="text-orange-400 text-sm text-center">
                            {soundEffectGenerationProgress || 'Creating high-quality sound effect...'}
                          </p>
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                        <p className="text-xs text-orange-300">
                          💡 <strong>Tips:</strong> Maximum duration is 30 seconds per generation. For longer sequences, 
                          generate multiple effects and combine them. Use looping for seamless repeating sounds. 
                          Supports simple effects, complex sequences, and musical elements.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Voice Changer Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-green-500/30 shadow-green-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('voice-changer')) {
                        newSet.delete('voice-changer')
                      } else {
                        newSet.add('voice-changer')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-green-400" />
                    <h2 className="text-xl font-semibold text-white">🎭 Voice Changer</h2>
                  </div>
                  {expandedCards.has('voice-changer') ? (
                    <ChevronUp className="h-5 w-5 text-green-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-green-400" />
                  )}
                </div>

                {expandedCards.has('voice-changer') && (
                  <>
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 mb-4">
                      <p className="text-xs text-green-300">
                        🎭 Transform any source audio into a different voice while preserving emotion, delivery, and nuances. 
                        Captures whispers, laughs, cries, accents, and subtle emotional cues. Best for segments under 5 minutes.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Source Audio Upload */}
                      <div className="space-y-2">
                        <label className="text-green-400 text-sm font-semibold">Source Audio</label>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleVoiceChangerFileSelect}
                          className="w-full bg-black/30 border border-green-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                        />
                        {voiceChangerFile && (
                          <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                            <p className="text-xs text-green-300">
                              ✓ Selected: {voiceChangerFile.name} ({(voiceChangerFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          💡 Upload audio file (.mp3, .wav, etc.). Recommended: under 5 minutes for optimal processing. Max 50MB. 
                          Record in a quiet environment and maintain appropriate microphone levels.
                        </p>
                      </div>

                      {/* Target Voice Selection */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-green-400 text-sm font-semibold">Target Voice</label>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              fetchAvailableVoices()
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            disabled={isLoadingVoices}
                            title="Refresh voices list"
                          >
                            <RefreshCw className={`h-3 w-3 ${isLoadingVoices ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        {isLoadingVoices ? (
                          <div className="flex items-center gap-2 text-green-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-400/40 border-t-green-400"></div>
                            Loading voices...
                          </div>
                        ) : (
                          <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                            <SelectTrigger className="bg-transparent border-green-500/50 text-green-300 hover:border-green-400">
                              <SelectValue placeholder="Select target voice" />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-green-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                              {availableVoices.length > 0 ? (
                                availableVoices.map((voice) => (
                                  <SelectItem 
                                    key={voice.id || voice.voice_id} 
                                    value={voice.id || voice.voice_id}
                                    className="text-green-300 hover:bg-green-500/20"
                                  >
                                    <div className="flex items-center gap-2">
                                      {voice.name || voice.voice_id}
                                      {voice.category && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">
                                          {voice.category}
                                        </span>
                                      )}
                                    </div>
                                    {voice.description && (
                                      <span className="text-xs text-gray-400 ml-2 block">- {voice.description}</span>
                                    )}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-voices" disabled className="text-gray-500">
                                  No voices available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        <p className="text-xs text-gray-400">
                          The voice to convert your audio to. Can use default, cloned, or designed voices. 
                          Custom/cloned voices are supported.
                        </p>
                      </div>

                      {/* Model Selection */}
                      <div className="space-y-2">
                        <label className="text-green-400 text-sm font-semibold">Model</label>
                        <Select value={voiceChangerModel} onValueChange={setVoiceChangerModel}>
                          <SelectTrigger className="bg-transparent border-green-500/50 text-green-300 hover:border-green-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-green-500/50">
                            <SelectItem value="eleven_multilingual_sts_v2" className="text-green-300 hover:bg-green-500/20">
                              Multilingual STS v2 (29 languages, recommended)
                            </SelectItem>
                            <SelectItem value="eleven_english_sts_v2" className="text-green-300 hover:bg-green-500/20">
                              English STS v2 (English only)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">
                          Multilingual v2 supports 29 languages. English v2 only supports English. 
                          Multilingual often outperforms English even for English material.
                        </p>
                      </div>

                      {/* Voice Settings Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Stability */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-green-400 text-sm font-semibold">Stability</label>
                            <span className="text-green-300 text-sm">{voiceChangerStability.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={voiceChangerStability}
                            onChange={(e) => setVoiceChangerStability(parseFloat(e.target.value))}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-400">100% recommended for maximum voice consistency</p>
                        </div>

                        {/* Style */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-green-400 text-sm font-semibold">Style</label>
                            <span className="text-green-300 text-sm">{voiceChangerStyle.toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={voiceChangerStyle}
                            onChange={(e) => setVoiceChangerStyle(parseFloat(e.target.value))}
                            className="w-full"
                          />
                          <p className="text-xs text-gray-400">Set to 0% when input audio is already expressive</p>
                        </div>
                      </div>

                      {/* Remove Background Noise */}
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-green-500/20">
                        <div>
                          <label className="text-green-400 text-sm font-semibold">Remove Background Noise</label>
                          <p className="text-xs text-gray-400">Minimize environmental sounds in the output</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={voiceChangerRemoveNoise}
                            onChange={(e) => setVoiceChangerRemoveNoise(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      {/* Generate Button */}
                      <Button
                        onClick={handleVoiceChange}
                        disabled={isChangingVoice || !voiceChangerFile || !selectedVoiceId}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                      >
                        {isChangingVoice ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                            CHANGING VOICE...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-5 w-5 mr-3" />
                            CHANGE VOICE
                          </>
                        )}
                      </Button>

                      {/* Voice Change Progress */}
                      {isChangingVoice && (
                        <div className="space-y-2">
                          <div className="w-full bg-black/40 rounded-full h-2 border border-green-500/50 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-600 to-emerald-600 transition-all duration-500 ease-out animate-pulse"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <p className="text-green-400 text-sm text-center">
                            Transforming voice while preserving emotion and delivery...
                          </p>
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <p className="text-xs text-green-300">
                          💡 <strong>Tips:</strong> Keep segments under 5 minutes for optimal processing. 
                          For longer audio, split into smaller chunks. Billing: 1000 characters per minute of processed audio. 
                          The source audio's accent and language will be preserved in the output.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Dubbing Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-indigo-500/30 shadow-indigo-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('dubbing')) {
                        newSet.delete('dubbing')
                      } else {
                        newSet.add('dubbing')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-xl font-semibold text-white">🌍 Dubbing</h2>
                  </div>
                  {expandedCards.has('dubbing') ? (
                    <ChevronUp className="h-5 w-5 text-indigo-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-indigo-400" />
                  )}
                </div>

                {expandedCards.has('dubbing') && (
                  <>
                    <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 mb-4">
                      <p className="text-xs text-indigo-300">
                        🌍 Translate audio and video across 32 languages while preserving emotion, timing, tone, and unique characteristics. 
                        Automatically detects multiple speakers and preserves original voices. Creator plan or higher required.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* File Upload */}
                      <div className="space-y-2">
                        <label className="text-indigo-400 text-sm font-semibold">Audio or Video File</label>
                        <input
                          type="file"
                          accept="audio/*,video/*"
                          onChange={handleDubbingFileSelect}
                          className="w-full bg-black/30 border border-indigo-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                        />
                        {dubbingFile && (
                          <div className="p-2 bg-indigo-500/10 rounded border border-indigo-500/20">
                            <p className="text-xs text-indigo-300">
                              ✓ Selected: {dubbingFile.name} ({(dubbingFile.size / 1024 / 1024).toFixed(2)} MB)
                              {dubbingFile.type.startsWith('video/') && ' - Video'}
                              {dubbingFile.type.startsWith('audio/') && ' - Audio'}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          💡 Upload audio or video file. UI supports up to 500MB and 45 minutes. 
                          API supports up to 1GB and 2.5 hours. Supports YouTube, X, TikTok, Vimeo URLs, or file uploads.
                        </p>
                      </div>

                      {/* Language Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Source Language */}
                        <div className="space-y-2">
                          <label className="text-indigo-400 text-sm font-semibold">Source Language</label>
                          <Select value={dubbingSourceLanguage} onValueChange={setDubbingSourceLanguage}>
                            <SelectTrigger className="bg-transparent border-indigo-500/50 text-indigo-300 hover:border-indigo-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-indigo-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                              <SelectItem value="en" className="text-indigo-300 hover:bg-indigo-500/20">English</SelectItem>
                              <SelectItem value="hi" className="text-indigo-300 hover:bg-indigo-500/20">Hindi</SelectItem>
                              <SelectItem value="pt" className="text-indigo-300 hover:bg-indigo-500/20">Portuguese</SelectItem>
                              <SelectItem value="zh" className="text-indigo-300 hover:bg-indigo-500/20">Chinese</SelectItem>
                              <SelectItem value="es" className="text-indigo-300 hover:bg-indigo-500/20">Spanish</SelectItem>
                              <SelectItem value="fr" className="text-indigo-300 hover:bg-indigo-500/20">French</SelectItem>
                              <SelectItem value="de" className="text-indigo-300 hover:bg-indigo-500/20">German</SelectItem>
                              <SelectItem value="ja" className="text-indigo-300 hover:bg-indigo-500/20">Japanese</SelectItem>
                              <SelectItem value="ar" className="text-indigo-300 hover:bg-indigo-500/20">Arabic</SelectItem>
                              <SelectItem value="ru" className="text-indigo-300 hover:bg-indigo-500/20">Russian</SelectItem>
                              <SelectItem value="ko" className="text-indigo-300 hover:bg-indigo-500/20">Korean</SelectItem>
                              <SelectItem value="id" className="text-indigo-300 hover:bg-indigo-500/20">Indonesian</SelectItem>
                              <SelectItem value="it" className="text-indigo-300 hover:bg-indigo-500/20">Italian</SelectItem>
                              <SelectItem value="nl" className="text-indigo-300 hover:bg-indigo-500/20">Dutch</SelectItem>
                              <SelectItem value="tr" className="text-indigo-300 hover:bg-indigo-500/20">Turkish</SelectItem>
                              <SelectItem value="pl" className="text-indigo-300 hover:bg-indigo-500/20">Polish</SelectItem>
                              <SelectItem value="sv" className="text-indigo-300 hover:bg-indigo-500/20">Swedish</SelectItem>
                              <SelectItem value="fil" className="text-indigo-300 hover:bg-indigo-500/20">Filipino</SelectItem>
                              <SelectItem value="ms" className="text-indigo-300 hover:bg-indigo-500/20">Malay</SelectItem>
                              <SelectItem value="ro" className="text-indigo-300 hover:bg-indigo-500/20">Romanian</SelectItem>
                              <SelectItem value="uk" className="text-indigo-300 hover:bg-indigo-500/20">Ukrainian</SelectItem>
                              <SelectItem value="el" className="text-indigo-300 hover:bg-indigo-500/20">Greek</SelectItem>
                              <SelectItem value="cs" className="text-indigo-300 hover:bg-indigo-500/20">Czech</SelectItem>
                              <SelectItem value="da" className="text-indigo-300 hover:bg-indigo-500/20">Danish</SelectItem>
                              <SelectItem value="fi" className="text-indigo-300 hover:bg-indigo-500/20">Finnish</SelectItem>
                              <SelectItem value="bg" className="text-indigo-300 hover:bg-indigo-500/20">Bulgarian</SelectItem>
                              <SelectItem value="hr" className="text-indigo-300 hover:bg-indigo-500/20">Croatian</SelectItem>
                              <SelectItem value="sk" className="text-indigo-300 hover:bg-indigo-500/20">Slovak</SelectItem>
                              <SelectItem value="ta" className="text-indigo-300 hover:bg-indigo-500/20">Tamil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Target Language */}
                        <div className="space-y-2">
                          <label className="text-indigo-400 text-sm font-semibold">Target Language</label>
                          <Select value={dubbingTargetLanguage} onValueChange={setDubbingTargetLanguage}>
                            <SelectTrigger className="bg-transparent border-indigo-500/50 text-indigo-300 hover:border-indigo-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-indigo-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                              <SelectItem value="en" className="text-indigo-300 hover:bg-indigo-500/20">English</SelectItem>
                              <SelectItem value="hi" className="text-indigo-300 hover:bg-indigo-500/20">Hindi</SelectItem>
                              <SelectItem value="pt" className="text-indigo-300 hover:bg-indigo-500/20">Portuguese</SelectItem>
                              <SelectItem value="zh" className="text-indigo-300 hover:bg-indigo-500/20">Chinese</SelectItem>
                              <SelectItem value="es" className="text-indigo-300 hover:bg-indigo-500/20">Spanish</SelectItem>
                              <SelectItem value="fr" className="text-indigo-300 hover:bg-indigo-500/20">French</SelectItem>
                              <SelectItem value="de" className="text-indigo-300 hover:bg-indigo-500/20">German</SelectItem>
                              <SelectItem value="ja" className="text-indigo-300 hover:bg-indigo-500/20">Japanese</SelectItem>
                              <SelectItem value="ar" className="text-indigo-300 hover:bg-indigo-500/20">Arabic</SelectItem>
                              <SelectItem value="ru" className="text-indigo-300 hover:bg-indigo-500/20">Russian</SelectItem>
                              <SelectItem value="ko" className="text-indigo-300 hover:bg-indigo-500/20">Korean</SelectItem>
                              <SelectItem value="id" className="text-indigo-300 hover:bg-indigo-500/20">Indonesian</SelectItem>
                              <SelectItem value="it" className="text-indigo-300 hover:bg-indigo-500/20">Italian</SelectItem>
                              <SelectItem value="nl" className="text-indigo-300 hover:bg-indigo-500/20">Dutch</SelectItem>
                              <SelectItem value="tr" className="text-indigo-300 hover:bg-indigo-500/20">Turkish</SelectItem>
                              <SelectItem value="pl" className="text-indigo-300 hover:bg-indigo-500/20">Polish</SelectItem>
                              <SelectItem value="sv" className="text-indigo-300 hover:bg-indigo-500/20">Swedish</SelectItem>
                              <SelectItem value="fil" className="text-indigo-300 hover:bg-indigo-500/20">Filipino</SelectItem>
                              <SelectItem value="ms" className="text-indigo-300 hover:bg-indigo-500/20">Malay</SelectItem>
                              <SelectItem value="ro" className="text-indigo-300 hover:bg-indigo-500/20">Romanian</SelectItem>
                              <SelectItem value="uk" className="text-indigo-300 hover:bg-indigo-500/20">Ukrainian</SelectItem>
                              <SelectItem value="el" className="text-indigo-300 hover:bg-indigo-500/20">Greek</SelectItem>
                              <SelectItem value="cs" className="text-indigo-300 hover:bg-indigo-500/20">Czech</SelectItem>
                              <SelectItem value="da" className="text-indigo-300 hover:bg-indigo-500/20">Danish</SelectItem>
                              <SelectItem value="fi" className="text-indigo-300 hover:bg-indigo-500/20">Finnish</SelectItem>
                              <SelectItem value="bg" className="text-indigo-300 hover:bg-indigo-500/20">Bulgarian</SelectItem>
                              <SelectItem value="hr" className="text-indigo-300 hover:bg-indigo-500/20">Croatian</SelectItem>
                              <SelectItem value="sk" className="text-indigo-300 hover:bg-indigo-500/20">Slovak</SelectItem>
                              <SelectItem value="ta" className="text-indigo-300 hover:bg-indigo-500/20">Tamil</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Watermark Option (Video Only) */}
                      {dubbingFile && dubbingFile.type.startsWith('video/') && (
                        <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-indigo-500/20">
                          <div>
                            <label className="text-indigo-400 text-sm font-semibold">Use Watermark (Video Only)</label>
                            <p className="text-xs text-gray-400">Reduce credit usage with watermarked output</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dubbingUseWatermark}
                              onChange={(e) => setDubbingUseWatermark(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      )}

                      {/* Generate Button */}
                      <Button
                        onClick={handleDubbing}
                        disabled={isDubbing || !dubbingFile || dubbingSourceLanguage === dubbingTargetLanguage}
                        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                      >
                        {isDubbing ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                            DUBBING...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-5 w-5 mr-3" />
                            START DUBBING
                          </>
                        )}
                      </Button>

                      {/* Dubbing Progress */}
                      {isDubbing && (
                        <div className="space-y-2">
                          <div className="w-full bg-black/40 rounded-full h-2 border border-indigo-500/50 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 transition-all duration-500 ease-out animate-pulse"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <p className="text-indigo-400 text-sm text-center">
                            {dubbingProgress || 'Translating and preserving emotion, timing, and tone...'}
                          </p>
                        </div>
                      )}

                      {/* Dubbed File Result */}
                      {dubbingUrl && (
                        <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                          <p className="text-xs text-indigo-300 mb-2">
                            ✓ Dubbing completed successfully!
                          </p>
                          {dubbingFile?.type.startsWith('video/') ? (
                            <video 
                              src={dubbingUrl} 
                              controls 
                              className="w-full rounded-lg max-h-[400px]"
                            >
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div className="space-y-2">
                              <audio src={dubbingUrl} controls className="w-full" />
                              <p className="text-xs text-indigo-300">
                                Audio is also available in the audio player below.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <p className="text-xs text-indigo-300">
                          💡 <strong>Features:</strong> Automatically detects multiple speakers (up to 9 recommended), 
                          preserves original voices and emotional tone, keeps background audio, supports 32 languages. 
                          For fine-tuning, use Dubbing Studio for interactive editing. Creator plan or higher required.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Voice Isolator Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-teal-500/30 shadow-teal-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('voice-isolator')) {
                        newSet.delete('voice-isolator')
                      } else {
                        newSet.add('voice-isolator')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-teal-400" />
                    <h2 className="text-xl font-semibold text-white">🎤 Voice Isolator</h2>
                  </div>
                  {expandedCards.has('voice-isolator') ? (
                    <ChevronUp className="h-5 w-5 text-teal-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-teal-400" />
                  )}
                </div>

                {expandedCards.has('voice-isolator') && (
                  <>
                    <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20 mb-4">
                      <p className="text-xs text-teal-300">
                        🎤 Transform audio recordings with background noise into clean, studio-quality speech. 
                        Isolates speech from background noise, music, and ambient sounds. Perfect for noisy environments.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* File Upload */}
                      <div className="space-y-2">
                        <label className="text-teal-400 text-sm font-semibold">Audio or Video File</label>
                        <input
                          type="file"
                          accept="audio/*,video/*"
                          onChange={handleVoiceIsolatorFileSelect}
                          className="w-full bg-black/30 border border-teal-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700"
                        />
                        {voiceIsolatorFile && (
                          <div className="p-2 bg-teal-500/10 rounded border border-teal-500/20">
                            <p className="text-xs text-teal-300">
                              ✓ Selected: {voiceIsolatorFile.name} ({(voiceIsolatorFile.size / 1024 / 1024).toFixed(2)} MB)
                              {voiceIsolatorFile.type.startsWith('video/') && ' - Video'}
                              {voiceIsolatorFile.type.startsWith('audio/') && ' - Audio'}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          💡 Upload audio or video file. Supports files up to 500MB and 1 hour in length. 
                          Audio formats: AAC, AIFF, OGG, MP3, OPUS, WAV, FLAC, M4A. 
                          Video formats: MP4, AVI, MKV, MOV, WMV, FLV, WEBM, MPEG, 3GPP.
                        </p>
                      </div>

                      {/* Generate Button */}
                      <Button
                        onClick={handleVoiceIsolation}
                        disabled={isIsolatingVoice || !voiceIsolatorFile}
                        className="w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-800 hover:from-teal-700 hover:via-cyan-700 hover:to-teal-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                      >
                        {isIsolatingVoice ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                            ISOLATING VOICE...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-5 w-5 mr-3" />
                            ISOLATE VOICE
                          </>
                        )}
                      </Button>

                      {/* Voice Isolation Progress */}
                      {isIsolatingVoice && (
                        <div className="space-y-2">
                          <div className="w-full bg-black/40 rounded-full h-2 border border-teal-500/50 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-800 transition-all duration-500 ease-out animate-pulse"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <p className="text-teal-400 text-sm text-center">
                            {voiceIsolationProgress || 'Isolating speech from background noise...'}
                          </p>
                        </div>
                      )}

                      {/* Isolated Voice Result */}
                      {isolatedVoiceUrl && (
                        <div className="p-4 bg-teal-500/10 rounded-lg border border-teal-500/20">
                          <p className="text-xs text-teal-300 mb-2">
                            ✓ Voice isolation completed successfully!
                          </p>
                          {voiceIsolatorFile?.type.startsWith('video/') ? (
                            <video 
                              src={isolatedVoiceUrl} 
                              controls 
                              className="w-full rounded-lg max-h-[400px]"
                            >
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <div className="space-y-2">
                              <audio src={isolatedVoiceUrl} controls className="w-full" />
                              <p className="text-xs text-teal-300">
                                Isolated audio is also available in the audio player below.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                        <p className="text-xs text-teal-300">
                          💡 <strong>Cost:</strong> 1000 characters for every minute of audio. 
                          <strong> File limits:</strong> Up to 500MB and 1 hour in length. 
                          <strong> Note:</strong> Not specifically optimized for isolating vocals from music, but may work depending on the content.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Forced Alignment Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-pink-500/30 shadow-pink-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('forced-alignment')) {
                        newSet.delete('forced-alignment')
                      } else {
                        newSet.add('forced-alignment')
                      }
                      return newSet
                    })
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-pink-400" />
                    <h2 className="text-xl font-semibold text-white">⏱️ Forced Alignment</h2>
                  </div>
                  {expandedCards.has('forced-alignment') ? (
                    <ChevronUp className="h-5 w-5 text-pink-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-pink-400" />
                  )}
                </div>

                {expandedCards.has('forced-alignment') && (
                  <>
                    <div className="p-3 bg-pink-500/10 rounded-lg border border-pink-500/20 mb-4">
                      <p className="text-xs text-pink-300">
                        ⏱️ Turn spoken audio and text into a time-aligned transcript with exact timestamps for each word or phrase. 
                        Perfect for matching subtitles to video or generating timings for audiobooks.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Audio File Upload */}
                      <div className="space-y-2">
                        <label className="text-pink-400 text-sm font-semibold">Audio File</label>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleForcedAlignmentFileSelect}
                          className="w-full bg-black/30 border border-pink-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-700"
                        />
                        {forcedAlignmentFile && (
                          <div className="p-2 bg-pink-500/10 rounded border border-pink-500/20">
                            <p className="text-xs text-pink-300">
                              ✓ Selected: {forcedAlignmentFile.name} ({(forcedAlignmentFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          💡 Upload audio file. Maximum file size: 3GB. Maximum duration: 10 hours.
                        </p>
                      </div>

                      {/* Transcript Text Input */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-pink-400 text-sm font-semibold">Transcript Text</label>
                          <span className="text-xs text-pink-300/70">
                            {forcedAlignmentText.length.toLocaleString()} / 675,000 characters
                          </span>
                        </div>
                        <Textarea
                          value={forcedAlignmentText}
                          onChange={(e) => setForcedAlignmentText(e.target.value)}
                          placeholder="Enter the transcript text that matches your audio file. Use plain text format (no JSON or special formatting). Example: 'Hello, how are you?'"
                          className="w-full bg-black/30 border-pink-500/50 text-white placeholder-gray-500 min-h-[150px]"
                          maxLength={675000}
                        />
                        <p className="text-xs text-gray-400">
                          💡 Enter plain text transcript (no JSON formatting). Maximum: 675,000 characters. 
                          The text should match the spoken content in the audio file.
                        </p>
                      </div>

                      {/* Language Selection */}
                      <div className="space-y-2">
                        <label className="text-pink-400 text-sm font-semibold">Language</label>
                        <Select value={forcedAlignmentLanguage} onValueChange={setForcedAlignmentLanguage}>
                          <SelectTrigger className="bg-transparent border-pink-500/50 text-pink-300 hover:border-pink-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-pink-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                            <SelectItem value="en" className="text-pink-300 hover:bg-pink-500/20">English (USA, UK, Australia, Canada)</SelectItem>
                            <SelectItem value="ja" className="text-pink-300 hover:bg-pink-500/20">Japanese</SelectItem>
                            <SelectItem value="zh" className="text-pink-300 hover:bg-pink-500/20">Chinese</SelectItem>
                            <SelectItem value="de" className="text-pink-300 hover:bg-pink-500/20">German</SelectItem>
                            <SelectItem value="hi" className="text-pink-300 hover:bg-pink-500/20">Hindi</SelectItem>
                            <SelectItem value="fr" className="text-pink-300 hover:bg-pink-500/20">French (France, Canada)</SelectItem>
                            <SelectItem value="ko" className="text-pink-300 hover:bg-pink-500/20">Korean</SelectItem>
                            <SelectItem value="pt" className="text-pink-300 hover:bg-pink-500/20">Portuguese (Brazil, Portugal)</SelectItem>
                            <SelectItem value="it" className="text-pink-300 hover:bg-pink-500/20">Italian</SelectItem>
                            <SelectItem value="es" className="text-pink-300 hover:bg-pink-500/20">Spanish (Spain, Mexico)</SelectItem>
                            <SelectItem value="id" className="text-pink-300 hover:bg-pink-500/20">Indonesian</SelectItem>
                            <SelectItem value="nl" className="text-pink-300 hover:bg-pink-500/20">Dutch</SelectItem>
                            <SelectItem value="tr" className="text-pink-300 hover:bg-pink-500/20">Turkish</SelectItem>
                            <SelectItem value="fil" className="text-pink-300 hover:bg-pink-500/20">Filipino</SelectItem>
                            <SelectItem value="pl" className="text-pink-300 hover:bg-pink-500/20">Polish</SelectItem>
                            <SelectItem value="sv" className="text-pink-300 hover:bg-pink-500/20">Swedish</SelectItem>
                            <SelectItem value="bg" className="text-pink-300 hover:bg-pink-500/20">Bulgarian</SelectItem>
                            <SelectItem value="ro" className="text-pink-300 hover:bg-pink-500/20">Romanian</SelectItem>
                            <SelectItem value="ar" className="text-pink-300 hover:bg-pink-500/20">Arabic (Saudi Arabia, UAE)</SelectItem>
                            <SelectItem value="cs" className="text-pink-300 hover:bg-pink-500/20">Czech</SelectItem>
                            <SelectItem value="el" className="text-pink-300 hover:bg-pink-500/20">Greek</SelectItem>
                            <SelectItem value="fi" className="text-pink-300 hover:bg-pink-500/20">Finnish</SelectItem>
                            <SelectItem value="hr" className="text-pink-300 hover:bg-pink-500/20">Croatian</SelectItem>
                            <SelectItem value="ms" className="text-pink-300 hover:bg-pink-500/20">Malay</SelectItem>
                            <SelectItem value="sk" className="text-pink-300 hover:bg-pink-500/20">Slovak</SelectItem>
                            <SelectItem value="da" className="text-pink-300 hover:bg-pink-500/20">Danish</SelectItem>
                            <SelectItem value="ta" className="text-pink-300 hover:bg-pink-500/20">Tamil</SelectItem>
                            <SelectItem value="uk" className="text-pink-300 hover:bg-pink-500/20">Ukrainian</SelectItem>
                            <SelectItem value="ru" className="text-pink-300 hover:bg-pink-500/20">Russian</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">
                          Select the language of the audio and transcript. Supports 29 languages.
                        </p>
                      </div>

                      {/* Generate Button */}
                      <Button
                        onClick={handleForcedAlignment}
                        disabled={isAligning || !forcedAlignmentFile || !forcedAlignmentText.trim()}
                        className="w-full bg-gradient-to-r from-pink-600 via-rose-600 to-pink-800 hover:from-pink-700 hover:via-rose-700 hover:to-pink-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
                      >
                        {isAligning ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                            ALIGNING...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-5 w-5 mr-3" />
                            ALIGN AUDIO & TRANSCRIPT
                          </>
                        )}
                      </Button>

                      {/* Alignment Progress */}
                      {isAligning && (
                        <div className="space-y-2">
                          <div className="w-full bg-black/40 rounded-full h-2 border border-pink-500/50 overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-pink-600 via-rose-600 to-pink-800 transition-all duration-500 ease-out animate-pulse"
                              style={{ width: '100%' }}
                            />
                          </div>
                          <p className="text-pink-400 text-sm text-center">
                            {alignmentProgress || 'Aligning audio with transcript...'}
                          </p>
                        </div>
                      )}

                      {/* Aligned Transcript Result */}
                      {alignedTranscript && (
                        <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/20">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs text-pink-300 font-semibold">
                              ✓ Time-aligned transcript generated!
                            </p>
                            <Button
                              onClick={() => {
                                const jsonStr = JSON.stringify(alignedTranscript, null, 2)
                                navigator.clipboard.writeText(jsonStr)
                                setCopied(true)
                                setTimeout(() => setCopied(false), 2000)
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-pink-400 hover:text-pink-300"
                            >
                              {copied ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy JSON
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="bg-black/30 rounded-lg p-3 max-h-[400px] overflow-y-auto">
                            <pre className="text-xs text-pink-200 font-mono whitespace-pre-wrap break-words">
                              {JSON.stringify(alignedTranscript, null, 2)}
                            </pre>
                          </div>
                          <p className="text-xs text-pink-300/70 mt-2">
                            The transcript includes timestamps for each word or phrase aligned with the audio.
                          </p>
                        </div>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-pink-500/10 rounded-lg border border-pink-500/20">
                        <p className="text-xs text-pink-300">
                          💡 <strong>Use cases:</strong> Matching subtitles to video recordings, generating timings for audiobook recordings. 
                          <strong> Cost:</strong> Same as Speech to Text API. 
                          <strong> Note:</strong> Does not support diarization. Use plain text format (no JSON).
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* ElevenLabs Agents Platform - Only shown when ElevenLabs is selected */}
            {selectedAudioModel === 'elevenlabs' && (
              <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-blue-500/30 shadow-blue-500/20">
                <div className="space-y-4">
                  <div 
                    className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setExpandedCards(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has('agents-platform')) {
                          newSet.delete('agents-platform')
                        } else {
                          newSet.add('agents-platform')
                        }
                        return newSet
                      })
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5 text-blue-400" />
                      <h2 className="text-xl font-semibold text-white">🤖 ElevenLabs Agents Platform</h2>
                    </div>
                    {expandedCards.has('agents-platform') ? (
                      <ChevronUp className="h-5 w-5 text-blue-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-blue-400" />
                    )}
                  </div>

                  {expandedCards.has('agents-platform') && (
                    <>
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 mb-4">
                    <p className="text-xs text-blue-300">
                      🎯 Build, deploy, and scale voice agents with natural dialogue. Multimodal agents that handle 
                      complex workflows through conversation. Create agents in the ElevenLabs dashboard first.
                    </p>
                  </div>

                  {/* Agent Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-blue-400 text-sm font-semibold">Select Agent</label>
                      <Button
                        onClick={fetchAvailableAgents}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        disabled={isLoadingAgents}
                        title="Refresh agents list"
                      >
                        <RefreshCw className={`h-3 w-3 ${isLoadingAgents ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    {isLoadingAgents ? (
                      <div className="flex items-center gap-2 text-blue-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400/40 border-t-blue-400"></div>
                        Loading agents...
                      </div>
                    ) : (
                      <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                        <SelectTrigger className="bg-transparent border-blue-500/50 text-blue-300 hover:border-blue-400">
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-blue-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                          <SelectItem 
                            value="new"
                            className="text-green-400 hover:bg-green-500/20 font-semibold"
                          >
                            ➕ Create New Agent
                          </SelectItem>
                          {availableAgents.length > 0 && (
                            <div className="border-t border-blue-500/30 my-1" />
                          )}
                          {availableAgents.length > 0 ? (
                            availableAgents.map((agent) => (
                              <SelectItem 
                                key={agent.agent_id || agent.id} 
                                value={agent.agent_id || agent.id}
                                className="text-blue-300 hover:bg-blue-500/20"
                              >
                                {agent.name || agent.agent_id || agent.id}
                                {agent.description && (
                                  <span className="text-xs text-gray-400 ml-2">- {agent.description}</span>
                                )}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-agents" disabled className="text-gray-500">
                              No existing agents
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-gray-400">
                      {availableAgents.length === 0 && "Create agents in the ElevenLabs dashboard, then refresh to see them here."}
                    </p>
                    
                    {/* Agent Settings Toggle - Always visible */}
                    <Button
                      onClick={() => setShowAgentSettings(!showAgentSettings)}
                      variant="outline"
                      size="sm"
                      className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/20 mt-2"
                      disabled={isLoadingAgents}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      {showAgentSettings ? 'Hide' : 'Show'} Agent Settings
                    </Button>
                    
                    {availableAgents.length === 0 && (
                      <p className="text-xs text-blue-400 mt-2">
                        💡 You can still view and configure default settings below, even without selecting an agent.
                      </p>
                    )}
                  </div>

                  {/* Agent Settings Panel - Always visible when toggled */}
                  {showAgentSettings && (
                    <div className="mt-4 p-4 bg-black/40 rounded-lg border border-blue-500/30 space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-blue-400">Agent Configuration</h3>
                        {selectedAgentId === 'new' ? (
                          <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                            Creating New Agent
                          </span>
                        ) : !selectedAgentId || selectedAgentId === 'no-agents' ? (
                          <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                            No agent selected - settings for reference only
                          </span>
                        ) : (
                          <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                            Editing: {availableAgents.find(a => (a.agent_id || a.id) === selectedAgentId)?.name || selectedAgentId}
                          </span>
                        )}
                      </div>
                      
                      {selectedAgentId === 'new' && (
                        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 mb-4">
                          <p className="text-xs text-green-300">
                            ✨ <strong>Creating New Agent:</strong> Fill in the details below and click "Create Agent" to save.
                          </p>
                        </div>
                      )}
                      
                      {(!selectedAgentId || selectedAgentId === 'no-agents') && selectedAgentId !== 'new' && (
                        <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 mb-4">
                          <p className="text-xs text-yellow-300">
                            ⚠️ <strong>Note:</strong> Select "Create New Agent" or an existing agent to save changes.
                          </p>
                        </div>
                      )}
                      
                      {/* Agent Name - Required for new agents */}
                      {(selectedAgentId === 'new' || selectedAgentId === '') && (
                        <div className="space-y-2">
                          <label className="text-blue-300 text-sm font-semibold">Agent Name <span className="text-red-400">*</span></label>
                          <input
                            type="text"
                            value={agentName}
                            onChange={(e) => setAgentName(e.target.value)}
                            placeholder="Enter a name for your agent"
                            className="w-full px-3 py-2 bg-black/30 border-blue-500/50 rounded text-white placeholder-gray-500"
                          />
                          <p className="text-xs text-gray-400">A unique name to identify this agent.</p>
                        </div>
                      )}
                      
                      {/* System Prompt */}
                      <div className="space-y-2">
                        <label className="text-blue-300 text-sm font-semibold">System Prompt</label>
                        <Textarea
                          value={agentSystemPrompt}
                          onChange={(e) => setAgentSystemPrompt(e.target.value)}
                          placeholder="Enter the system prompt that defines the agent's behavior, personality, and instructions..."
                          className="bg-black/30 border-blue-500/50 text-white placeholder-gray-500 min-h-[120px]"
                        />
                        <p className="text-xs text-gray-400">Define how the agent behaves, its role, and instructions for task completion.</p>
                      </div>

                      {/* Voice & Language */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-blue-300 text-sm font-semibold">Voice</label>
                          <Select value={agentVoiceId} onValueChange={setAgentVoiceId}>
                            <SelectTrigger className="bg-black/30 border-blue-500/50 text-white">
                              <SelectValue placeholder="Select voice" />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-blue-500/50">
                              {availableVoices.map((voice) => (
                                <SelectItem key={voice.voice_id} value={voice.voice_id} className="text-white">
                                  {voice.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-blue-300 text-sm font-semibold">Language</label>
                          <Select value={agentLanguage} onValueChange={setAgentLanguage}>
                            <SelectTrigger className="bg-black/30 border-blue-500/50 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-blue-500/50">
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
                              <SelectItem value="de">German</SelectItem>
                              <SelectItem value="it">Italian</SelectItem>
                              <SelectItem value="pt">Portuguese</SelectItem>
                              <SelectItem value="zh">Chinese</SelectItem>
                              <SelectItem value="ja">Japanese</SelectItem>
                              <SelectItem value="ko">Korean</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Model Selection */}
                      <div className="space-y-2">
                        <label className="text-blue-300 text-sm font-semibold">Language Model</label>
                        <Select value={agentModel} onValueChange={setAgentModel}>
                          <SelectTrigger className="bg-black/30 border-blue-500/50 text-white">
                            <SelectValue placeholder="Select LLM model" />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-blue-500/50">
                            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                            <SelectItem value="gpt-4">GPT-4</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                            <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                            <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                            <SelectItem value="custom">Custom Model</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">The language model powering the agent's responses.</p>
                      </div>

                      {/* Conversation Flow Settings */}
                      <div className="space-y-3 p-3 bg-black/20 rounded border border-blue-500/20">
                        <h4 className="text-blue-300 text-sm font-semibold">Conversation Flow</h4>
                        
                        <div className="flex items-center justify-between">
                          <label className="text-white text-sm">Turn Taking</label>
                          <button
                            onClick={() => setConversationFlow(prev => ({ ...prev, turnTaking: !prev.turnTaking }))}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              conversationFlow.turnTaking ? 'bg-blue-500' : 'bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                              conversationFlow.turnTaking ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <label className="text-white text-sm">Allow Interruptions</label>
                          <button
                            onClick={() => setConversationFlow(prev => ({ ...prev, interruptions: !prev.interruptions }))}
                            className={`w-12 h-6 rounded-full transition-colors ${
                              conversationFlow.interruptions ? 'bg-blue-500' : 'bg-gray-600'
                            }`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                              conversationFlow.interruptions ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          </button>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-white text-sm">Timeout (seconds)</label>
                          <input
                            type="number"
                            min="5"
                            max="120"
                            value={conversationFlow.timeout}
                            onChange={(e) => setConversationFlow(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                            className="w-full px-3 py-2 bg-black/30 border border-blue-500/50 rounded text-white"
                          />
                        </div>
                      </div>

                      {/* Tools & Knowledge Base */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-blue-300 text-sm font-semibold">Tools Enabled</label>
                          <Textarea
                            value={agentTools.join(', ')}
                            onChange={(e) => setAgentTools(e.target.value.split(',').map(t => t.trim()).filter(t => t))}
                            placeholder="tool1, tool2, tool3"
                            className="bg-black/30 border-blue-500/50 text-white placeholder-gray-500 min-h-[60px]"
                          />
                          <p className="text-xs text-gray-400">Comma-separated list of enabled tools/APIs.</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-blue-300 text-sm font-semibold">Knowledge Base IDs</label>
                          <Textarea
                            value={agentKnowledgeBase.join(', ')}
                            onChange={(e) => setAgentKnowledgeBase(e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                            placeholder="kb1, kb2, kb3"
                            className="bg-black/30 border-blue-500/50 text-white placeholder-gray-500 min-h-[60px]"
                          />
                          <p className="text-xs text-gray-400">Comma-separated list of knowledge base IDs.</p>
                        </div>
                      </div>

                      {/* Personalization Variables */}
                      <div className="space-y-2">
                        <label className="text-blue-300 text-sm font-semibold">Personalization Variables (JSON)</label>
                        <Textarea
                          value={agentPersonalizationRaw}
                          onChange={(e) => {
                            const newValue = e.target.value
                            setAgentPersonalizationRaw(newValue)
                            try {
                              setAgentPersonalization(JSON.parse(newValue))
                            } catch {
                              // Invalid JSON, allow typing but don't update parsed state
                            }
                          }}
                          placeholder='{"variable1": "value1", "variable2": "value2"}'
                          className="bg-black/30 border-blue-500/50 text-white placeholder-gray-500 min-h-[80px] font-mono text-xs"
                        />
                        <p className="text-xs text-gray-400">JSON object for dynamic variables used in conversations.</p>
                      </div>

                      {/* Save Button */}
                      <Button
                        onClick={saveAgentSettings}
                        disabled={isSavingAgentSettings || (!selectedAgentId || selectedAgentId === 'no-agents')}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingAgentSettings ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                            {selectedAgentId === 'new' ? 'Creating Agent...' : 'Saving Settings...'}
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-4 w-4 mr-2" />
                            {selectedAgentId === 'new' ? 'Create Agent' : selectedAgentId && selectedAgentId !== 'no-agents' ? 'Save Agent Settings' : 'Select an Agent to Save'}
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Agent Conversation */}
                  {selectedAgentId && selectedAgentId !== 'no-agents' && (
                    <div className="space-y-4 mt-4">
                      {/* Conversation History */}
                      <div className="bg-black/30 rounded-lg border border-blue-500/20 p-4 max-h-[400px] overflow-y-auto space-y-3">
                        {agentConversation.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm py-8">
                            Start a conversation with your agent. Type a message or record audio.
                          </p>
                        ) : (
                          agentConversation.map((msg, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg ${
                                msg.role === 'user'
                                  ? 'bg-blue-500/20 ml-auto max-w-[80%]'
                                  : msg.role === 'system'
                                  ? 'bg-green-500/20 mx-auto max-w-[80%] border border-green-500/30'
                                  : 'bg-blue-500/10 mr-auto max-w-[80%]'
                              }`}
                            >
                              <p className="text-xs text-blue-400 mb-1 font-semibold">
                                {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'Agent'}
                              </p>
                              <p className="text-white text-sm">{msg.content}</p>
                              {msg.audio && (
                                <audio src={msg.audio} controls className="mt-2 w-full" />
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Message Input */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Textarea
                            value={agentMessage}
                            onChange={(e) => setAgentMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSendAgentMessage()
                              }
                            }}
                            placeholder="Type your message to the agent... (or use voice recording)"
                            className="flex-1 bg-black/30 border-blue-500/50 text-white placeholder-gray-500 min-h-[80px]"
                            disabled={isAgentResponding}
                          />
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={handleSendAgentMessage}
                            disabled={isAgentResponding || !agentMessage.trim() || !selectedAgentId}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                          >
                            {isAgentResponding ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                                Agent Responding...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Send Message
                              </>
                            )}
                          </Button>
                          
                          {!isRecording ? (
                            <Button
                              onClick={startRecording}
                              disabled={isAgentResponding || !selectedAgentId}
                              variant="outline"
                              className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                            >
                              <Volume2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              onClick={stopRecording}
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {isRecording && (
                          <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <p className="text-xs text-red-400">Recording... Click stop when finished</p>
                          </div>
                        )}
                      </div>

                      {/* New Conversation Button */}
                      {conversationId && (
                        <Button
                          onClick={() => {
                            setConversationId(null)
                            setAgentConversation([])
                          }}
                          variant="outline"
                          size="sm"
                          className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                        >
                          Start New Conversation
                        </Button>
                      )}

                      {/* Info */}
                      <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <p className="text-xs text-blue-300">
                          💡 <strong>Tip:</strong> Agents can handle complex workflows through natural conversation. 
                          Use text messages or voice recordings. Agents maintain context throughout the conversation.
                        </p>
                      </div>
                    </div>
                  )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ElevenLabs Advanced Settings - Only shown when ElevenLabs is selected */}
            {selectedAudioModel === 'elevenlabs' && (
              <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-cyan-500/30 shadow-cyan-500/20">
                <div className="space-y-6">
                  <div 
                    className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setExpandedCards(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has('voice-settings')) {
                          newSet.delete('voice-settings')
                        } else {
                          newSet.add('voice-settings')
                        }
                        return newSet
                      })
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5 text-cyan-400" />
                      <h2 className="text-xl font-semibold text-white">ElevenLabs Voice Settings</h2>
                    </div>
                    {expandedCards.has('voice-settings') ? (
                      <ChevronUp className="h-5 w-5 text-cyan-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-cyan-400" />
                    )}
                  </div>

                  {expandedCards.has('voice-settings') && (
                    <>
                      {/* Voice Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-cyan-400 text-sm font-semibold">Voice</label>
                      <Button
                        onClick={() => setShowVoiceCreator(!showVoiceCreator)}
                        variant="outline"
                        size="sm"
                        className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 text-xs"
                      >
                        {showVoiceCreator ? 'Hide Creator' : '+ Create Voice'}
                      </Button>
                    </div>
                    {isLoadingVoices ? (
                      <div className="flex items-center gap-2 text-cyan-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400/40 border-t-cyan-400"></div>
                        Loading voices...
                      </div>
                    ) : (
                      <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                        <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                          <SelectValue placeholder="Select a voice" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                          {availableVoices.map((voice) => (
                            <SelectItem 
                              key={voice.id || voice.voice_id} 
                              value={voice.id || voice.voice_id}
                              className="text-cyan-300 hover:bg-cyan-500/20"
                            >
                              <div className="flex items-center gap-2">
                                {voice.name || voice.voice_id}
                                {voice.category && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                                    {voice.category}
                                  </span>
                                )}
                              </div>
                              {voice.description && (
                                <span className="text-xs text-gray-400 ml-2 block">- {voice.description}</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Voice Creator Section */}
                  {showVoiceCreator && (
                    <div className="mt-4 p-4 bg-black/30 rounded-lg border border-cyan-500/20">
                      {/* Tabs */}
                      <div className="flex gap-2 mb-4 border-b border-cyan-500/20">
                        <button
                          onClick={() => setVoiceCreatorTab('clone')}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            voiceCreatorTab === 'clone'
                              ? 'text-cyan-400 border-b-2 border-cyan-400'
                              : 'text-gray-400 hover:text-cyan-300'
                          }`}
                        >
                          Voice Cloning
                        </button>
                        <button
                          onClick={() => setVoiceCreatorTab('design')}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            voiceCreatorTab === 'design'
                              ? 'text-cyan-400 border-b-2 border-cyan-400'
                              : 'text-gray-400 hover:text-cyan-300'
                          }`}
                        >
                          Voice Design
                        </button>
                        <button
                          onClick={() => setVoiceCreatorTab('changer')}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            voiceCreatorTab === 'changer'
                              ? 'text-cyan-400 border-b-2 border-cyan-400'
                              : 'text-gray-400 hover:text-cyan-300'
                          }`}
                        >
                          Voice Changer
                        </button>
                      </div>

                      {/* Voice Cloning Tab */}
                      {voiceCreatorTab === 'clone' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <p className="text-xs text-blue-300">
                              💡 <strong>Voice Cloning:</strong> Upload audio samples to clone a voice. 
                              Instant cloning works with short samples, Professional requires longer samples for better quality.
                              Creator plan or higher required.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">Voice Name</label>
                            <input
                              type="text"
                              value={cloneName}
                              onChange={(e) => setCloneName(e.target.value)}
                              placeholder="Enter a name for your cloned voice"
                              className="w-full bg-black/30 border border-cyan-500/50 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-cyan-400"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">Clone Type</label>
                            <Select value={cloneType} onValueChange={(v: 'instant' | 'professional') => setCloneType(v)}>
                              <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 border-cyan-500/50">
                                <SelectItem value="instant" className="text-cyan-300 hover:bg-cyan-500/20">
                                  Instant (Quick, short samples)
                                </SelectItem>
                                <SelectItem value="professional" className="text-cyan-300 hover:bg-cyan-500/20">
                                  Professional (Better quality, longer samples)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">
                              Audio Files {cloneFiles.length > 0 && `(${cloneFiles.length} selected)`}
                            </label>
                            <input
                              type="file"
                              accept="audio/*"
                              multiple
                              onChange={handleFileSelect}
                              className="w-full bg-black/30 border border-cyan-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
                            />
                            <p className="text-xs text-gray-400">
                              Upload audio files (.mp3, .wav, etc.). For instant cloning: 1-5 files. For professional: 5+ files recommended.
                            </p>
                          </div>

                          <Button
                            onClick={handleVoiceClone}
                            disabled={isCloningVoice || !cloneName.trim() || cloneFiles.length === 0}
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                          >
                            {isCloningVoice ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                                Cloning Voice...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4 mr-2" />
                                Clone Voice
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Voice Design Tab */}
                      {voiceCreatorTab === 'design' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <p className="text-xs text-purple-300">
                              ✨ <strong>Voice Design:</strong> Create new voices using text descriptions. 
                              Specify age, gender, accent, tone, and other characteristics. 
                              Generates 3 voice previews to choose from.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">
                              Voice Description ({voiceDesignDescription.length}/1000)
                            </label>
                            <Textarea
                              value={voiceDesignDescription}
                              onChange={(e) => setVoiceDesignDescription(e.target.value)}
                              placeholder="Describe your voice: age, gender, accent, tone, personality (e.g., 'A young female voice with a British accent, warm and friendly tone')"
                              className="w-full bg-black/30 border-cyan-500/50 text-white placeholder-gray-500 min-h-[100px]"
                              maxLength={1000}
                            />
                            <p className="text-xs text-gray-400">
                              Must be between 20-1000 characters. Describe the voice characteristics you want.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">
                              Preview Text ({voiceDesignText.length}/1000)
                            </label>
                            <Textarea
                              value={voiceDesignText}
                              onChange={(e) => setVoiceDesignText(e.target.value)}
                              placeholder="Enter text to preview how the voice sounds (e.g., 'Hello, this is a preview of the generated voice. How does it sound?')"
                              className="w-full bg-black/30 border-cyan-500/50 text-white placeholder-gray-500 min-h-[120px]"
                              maxLength={1000}
                            />
                            <p className="text-xs text-gray-400">
                              Must be between 100-1000 characters. This text will be used to generate voice previews.
                            </p>
                          </div>

                          <Button
                            onClick={handleVoiceDesign}
                            disabled={
                              isDesigningVoice || 
                              voiceDesignDescription.length < 20 || 
                              voiceDesignDescription.length > 1000 ||
                              voiceDesignText.length < 100 || 
                              voiceDesignText.length > 1000
                            }
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                          >
                            {isDesigningVoice ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                                Designing Voice...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4 mr-2" />
                                Design Voice
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Voice Changer Tab */}
                      {voiceCreatorTab === 'changer' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                            <p className="text-xs text-green-300">
                              🎭 <strong>Voice Changer:</strong> Transform any audio to a different voice while preserving emotion, delivery, and nuances. 
                              Captures whispers, laughs, accents, and emotional cues. Best for segments under 5 minutes.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">Source Audio</label>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleVoiceChangerFileSelect}
                              className="w-full bg-black/30 border border-cyan-500/50 rounded-lg px-3 py-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                            />
                            {voiceChangerFile && (
                              <p className="text-xs text-green-300">
                                Selected: {voiceChangerFile.name} ({(voiceChangerFile.size / 1024 / 1024).toFixed(2)} MB)
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              Upload audio file (.mp3, .wav, etc.). Recommended: under 5 minutes for optimal processing. Max 50MB.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">Target Voice</label>
                            <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                              <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300">
                                <SelectValue placeholder="Select target voice" />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                                {availableVoices.map((voice) => (
                                  <SelectItem 
                                    key={voice.id || voice.voice_id} 
                                    value={voice.id || voice.voice_id}
                                    className="text-cyan-300 hover:bg-cyan-500/20"
                                  >
                                    {voice.name || voice.voice_id}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-400">
                              The voice to convert your audio to. Can use default, cloned, or designed voices.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <label className="text-cyan-400 text-sm font-semibold">Model</label>
                            <Select value={voiceChangerModel} onValueChange={setVoiceChangerModel}>
                              <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 border-cyan-500/50">
                                <SelectItem value="eleven_multilingual_sts_v2" className="text-cyan-300 hover:bg-cyan-500/20">
                                  Multilingual STS v2 (29 languages, recommended)
                                </SelectItem>
                                <SelectItem value="eleven_english_sts_v2" className="text-cyan-300 hover:bg-cyan-500/20">
                                  English STS v2 (English only)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Voice Settings Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Stability */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-cyan-400 text-sm font-semibold">Stability</label>
                                <span className="text-cyan-300 text-sm">{voiceChangerStability.toFixed(2)}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={voiceChangerStability}
                                onChange={(e) => setVoiceChangerStability(parseFloat(e.target.value))}
                                className="w-full"
                              />
                              <p className="text-xs text-gray-400">100% recommended for maximum consistency</p>
                            </div>

                            {/* Style */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-cyan-400 text-sm font-semibold">Style</label>
                                <span className="text-cyan-300 text-sm">{voiceChangerStyle.toFixed(2)}</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={voiceChangerStyle}
                                onChange={(e) => setVoiceChangerStyle(parseFloat(e.target.value))}
                                className="w-full"
                              />
                              <p className="text-xs text-gray-400">Set to 0% when input is already expressive</p>
                            </div>
                          </div>

                          {/* Remove Background Noise */}
                          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-cyan-500/20">
                            <div>
                              <label className="text-cyan-400 text-sm font-semibold">Remove Background Noise</label>
                              <p className="text-xs text-gray-400">Minimize environmental sounds in the output</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={voiceChangerRemoveNoise}
                                onChange={(e) => setVoiceChangerRemoveNoise(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                          </div>

                          <Button
                            onClick={handleVoiceChange}
                            disabled={isChangingVoice || !voiceChangerFile || !selectedVoiceId}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                          >
                            {isChangingVoice ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                                Changing Voice...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4 mr-2" />
                                Change Voice
                              </>
                            )}
                          </Button>

                          {/* Success Message */}
                          {changedVoiceUrl && (
                            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                              <p className="text-xs text-green-300 mb-2">
                                ✅ Voice changed successfully! The audio player below will now play your converted audio.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <label className="text-cyan-400 text-sm font-semibold">Model</label>
                    <Select value={selectedElevenLabsModel} onValueChange={setSelectedElevenLabsModel}>
                      <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[400px] overflow-y-auto">
                        <SelectItem value="eleven_multilingual_v2" className="text-cyan-300 hover:bg-cyan-500/20">
                          <div>
                            <div className="font-semibold">Multilingual v2</div>
                            <div className="text-xs text-gray-400">Best quality, 29 languages, 10K chars</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="eleven_turbo_v2_5" className="text-cyan-300 hover:bg-cyan-500/20">
                          <div>
                            <div className="font-semibold">Turbo v2.5</div>
                            <div className="text-xs text-gray-400">High quality, low latency (~250ms), 32 languages, 40K chars, 50% cheaper</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="eleven_flash_v2_5" className="text-cyan-300 hover:bg-cyan-500/20">
                          <div>
                            <div className="font-semibold">Flash v2.5</div>
                            <div className="text-xs text-gray-400">Ultra-low latency (~75ms), 32 languages, 40K chars, 50% cheaper</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="eleven_v3" className="text-cyan-300 hover:bg-cyan-500/20">
                          <div>
                            <div className="font-semibold">Eleven v3 (Alpha)</div>
                            <div className="text-xs text-gray-400">Most expressive, 70+ languages, 3K chars, multi-speaker</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedElevenLabsModel === 'eleven_multilingual_v2' && 'Best for: Long-form content, most stable'}
                      {selectedElevenLabsModel === 'eleven_turbo_v2_5' && 'Best for: Real-time applications, balanced quality/speed'}
                      {selectedElevenLabsModel === 'eleven_flash_v2_5' && 'Best for: Fast responses, interactive applications'}
                      {selectedElevenLabsModel === 'eleven_v3' && 'Best for: Dramatic performances, emotional content'}
                    </p>
                  </div>

                  {/* Voice Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Stability */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-cyan-400 text-sm font-semibold">Stability</label>
                        <span className="text-cyan-300 text-sm">{stability.toFixed(2)}</span>
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
                      <p className="text-xs text-gray-400">Higher = more consistent, Lower = more expressive</p>
                    </div>

                    {/* Similarity Boost */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-cyan-400 text-sm font-semibold">Similarity Boost</label>
                        <span className="text-cyan-300 text-sm">{similarityBoost.toFixed(2)}</span>
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
                      <p className="text-xs text-gray-400">Higher = more like original voice</p>
                    </div>

                    {/* Style */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-cyan-400 text-sm font-semibold">Style</label>
                        <span className="text-cyan-300 text-sm">{style.toFixed(2)}</span>
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
                      <p className="text-xs text-gray-400">Higher = more style exaggeration</p>
                    </div>

                    {/* Speaker Boost */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-cyan-400 text-sm font-semibold">Speaker Boost</label>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useSpeakerBoost}
                            onChange={(e) => setUseSpeakerBoost(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                      </div>
                      <p className="text-xs text-gray-400">Enhances voice quality and clarity</p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                    <p className="text-xs text-cyan-300">
                      💡 <strong>Tip:</strong> Adjust these settings to fine-tune your voice output. Stability controls consistency, Similarity Boost affects voice matching, Style adds expressiveness, and Speaker Boost enhances overall quality.
                    </p>
                  </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Text Generation Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-cyan-500/30 shadow-cyan-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('generate-text')) {
                        newSet.delete('generate-text')
                      } else {
                        newSet.add('generate-text')
                      }
                      return newSet
                    })
                  }}
                >
                  <h2 className="text-xl font-semibold text-white">Generate Text</h2>
                  {expandedCards.has('generate-text') ? (
                    <ChevronUp className="h-5 w-5 text-cyan-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-cyan-400" />
                  )}
                </div>

                {expandedCards.has('generate-text') && (
                  <>
                    <textarea
                  placeholder="Enter a prompt to generate text... (e.g., 'Write a story about a futuristic city', 'Create a narration about space exploration')"
                  className="w-full bg-black/30 text-lg text-white placeholder-cyan-600 resize-none border border-cyan-500/30 rounded-lg p-4 focus:ring-2 focus:ring-cyan-400 min-h-[100px]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />

                {/* Generate Text Button */}
                <Button
                  onClick={handleGenerateText}
                  disabled={isGeneratingText || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                >
                  {isGeneratingText ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                      Generating Text...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Generate Text
                    </>
                  )}
                </Button>

                {/* Text Generation Progress */}
                {isGeneratingText && (
                  <div className="space-y-2">
                    <div className="w-full bg-black/40 rounded-full h-2 border border-cyan-500/50 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 transition-all duration-500 ease-out"
                        style={{ width: `${textProgressPercentage}%` }}
                      />
                    </div>
                    <p className="text-cyan-400 text-sm text-center">
                      {textGenerationProgress || 'Generating...'} ({Math.round(textProgressPercentage)}%)
                    </p>
                  </div>
                )}

                {/* Generated Text Display */}
                {generatedText && generatedText.trim() && (
                  <div className="space-y-4 mt-4">
                    <div className="bg-neutral-900/50 p-4 rounded-2xl border border-green-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white">Generated Text</h3>
                        <div className="flex gap-2">
                          {!isEditingGeneratedText ? (
                            <>
                              <Button
                                onClick={() => {
                                  setEditedGeneratedText(generatedText)
                                  setIsEditingGeneratedText(true)
                                }}
                                variant="outline"
                                size="sm"
                                className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Edit
                              </Button>
                              <Button
                                onClick={copyToAudioTextarea}
                                variant="outline"
                                size="sm"
                                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Use for Audio
                              </Button>
                              <Button
                                onClick={copyGeneratedText}
                                variant="ghost"
                                size="sm"
                                className="text-cyan-400 hover:bg-cyan-400/10"
                              >
                                {copied ? (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => {
                                  setGeneratedText(editedGeneratedText)
                                  setIsEditingGeneratedText(false)
                                }}
                                variant="outline"
                                size="sm"
                                className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Save
                              </Button>
                              <Button
                                onClick={() => {
                                  setIsEditingGeneratedText(false)
                                  setEditedGeneratedText("")
                                }}
                                variant="outline"
                                size="sm"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {isEditingGeneratedText ? (
                        <Textarea
                          value={editedGeneratedText}
                          onChange={(e) => setEditedGeneratedText(e.target.value)}
                          className="w-full bg-black/20 text-white border-green-500/10 rounded-lg p-4 text-base leading-relaxed whitespace-pre-wrap break-words resize-none min-h-[150px]"
                          placeholder="Edit your generated text here..."
                        />
                      ) : (
                        <div 
                          className="text-white leading-relaxed break-words p-4 bg-black/20 rounded-lg border border-green-500/10"
                          style={{
                            wordSpacing: 'normal',
                            lineHeight: '1.8',
                            fontFamily: 'inherit'
                          }}
                        >
                          {(() => {
                            const paragraphs = formatTextIntoParagraphs(generatedText)
                            return paragraphs.map((paragraph, index) => (
                              <p 
                                key={index} 
                                className="mb-4 last:mb-0"
                                style={{
                                  textIndent: '0',
                                  textAlign: 'left',
                                  marginBottom: index < paragraphs.length - 1 ? '1rem' : '0'
                                }}
                              >
                                {paragraph}
                              </p>
                            ))
                          })()}
                          {isStreaming && (
                            <span className="inline-block w-2 h-5 bg-cyan-400 ml-1 animate-pulse"></span>
                          )}
                        </div>
                      )}
                      <p className="text-cyan-400/70 text-sm mt-2">
                        {generatedText.length} characters
                      </p>
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            </div>

            {/* Text to Audio Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-cyan-500/30 shadow-cyan-500/20">
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setExpandedCards(prev => {
                      const newSet = new Set(prev)
                      if (newSet.has('text-to-audio')) {
                        newSet.delete('text-to-audio')
                      } else {
                        newSet.add('text-to-audio')
                      }
                      return newSet
                    })
                  }}
                >
                  <h2 className="text-xl font-semibold text-white">Text to Convert to Audio</h2>
                  <div className="flex items-center gap-2">
                    {expandedCards.has('text-to-audio') ? (
                      <ChevronUp className="h-5 w-5 text-cyan-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-cyan-400" />
                    )}
                    {userCredits <= 50 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowCreditsDialog(true)
                        }}
                        className={`${userCredits <= 10 ? 'text-red-400 hover:bg-red-400/10' : 'text-cyan-400 hover:bg-cyan-400/10'}`}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {userCredits} credits
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.reload()
                      }}
                      className="text-cyan-400 hover:bg-cyan-400/10"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expandedCards.has('text-to-audio') && (
                  <>
                    <textarea
                  placeholder="Enter the text you want to convert to speech... (e.g., 'Hello, welcome to INFINITO AI. How can I help you today?')"
                  className="w-full bg-black/30 text-lg text-white placeholder-cyan-600 resize-none border border-cyan-500/30 rounded-lg p-4 focus:ring-2 focus:ring-cyan-400 min-h-[120px]"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                {/* Character count */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className={`text-sm ${
                      selectedAudioModel === 'elevenlabs' && text.length > getElevenLabsCharLimit(selectedElevenLabsModel)
                        ? 'text-red-400'
                        : selectedAudioModel === 'elevenlabs' && text.length > getElevenLabsCharLimit(selectedElevenLabsModel) * 0.8
                        ? 'text-yellow-400'
                        : 'text-cyan-400/70'
                    }`}>
                      {text.length} characters
                      {selectedAudioModel === 'elevenlabs' && (
                        <span className="text-xs ml-2">
                          / {getElevenLabsCharLimit(selectedElevenLabsModel).toLocaleString()} limit ({selectedElevenLabsModel})
                        </span>
                      )}
                    </p>
                    {selectedAudioModel === 'elevenlabs' && text.length > getElevenLabsCharLimit(selectedElevenLabsModel) && (
                      <p className="text-xs text-red-400 mt-1">
                        ⚠️ Text exceeds limit for {selectedElevenLabsModel}. Please shorten your text or select a different model.
                      </p>
                    )}
                  </div>
                  {/* Enhance Text Button */}
                  <Button
                    onClick={enhanceTextWithLLM}
                    disabled={!text.trim() || isEnhancingText}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white"
                  >
                    {isEnhancingText ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Enhance Text with AI
                      </>
                    )}
                  </Button>
                </div>
                  </>
                )}
              </div>
            </div>

            {/* Custom Voice Selector - Only shown when ElevenLabs is selected */}
            {selectedAudioModel === 'elevenlabs' && (
              <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-cyan-500/30 shadow-cyan-500/20">
                <div className="space-y-4">
                  <div 
                    className="flex items-center justify-between gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setExpandedCards(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has('custom-voice')) {
                          newSet.delete('custom-voice')
                        } else {
                          newSet.add('custom-voice')
                        }
                        return newSet
                      })
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5 text-cyan-400" />
                      <h2 className="text-xl font-semibold text-white">Select Custom Voice</h2>
                    </div>
                    {expandedCards.has('custom-voice') ? (
                      <ChevronUp className="h-5 w-5 text-cyan-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-cyan-400" />
                    )}
                  </div>

                  {expandedCards.has('custom-voice') && (
                    <>
                      <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20 mb-4">
                        <p className="text-xs text-cyan-300">
                          🎤 Choose a custom voice for your text-to-speech conversion. Select from your available ElevenLabs voices.
                        </p>
                      </div>

                      {/* Voice Selection */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-cyan-400 text-sm font-semibold">Custom Voice</label>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              fetchAvailableVoices()
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                            disabled={isLoadingVoices}
                            title="Refresh voices list"
                          >
                            <RefreshCw className={`h-3 w-3 ${isLoadingVoices ? 'animate-spin' : ''}`} />
                          </Button>
                        </div>
                        {isLoadingVoices ? (
                          <div className="flex items-center gap-2 text-cyan-400">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400/40 border-t-cyan-400"></div>
                            Loading voices...
                          </div>
                        ) : (
                          <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                            <SelectTrigger className="bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400">
                              <SelectValue placeholder="Select a custom voice" />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                              {availableVoices.length > 0 ? (
                                availableVoices.map((voice) => (
                                  <SelectItem 
                                    key={voice.id || voice.voice_id} 
                                    value={voice.id || voice.voice_id}
                                    className="text-cyan-300 hover:bg-cyan-500/20"
                                  >
                                    <div className="flex items-center gap-2">
                                      {voice.name || voice.voice_id}
                                      {voice.category && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                                          {voice.category}
                                        </span>
                                      )}
                                    </div>
                                    {voice.description && (
                                      <span className="text-xs text-gray-400 ml-2 block">- {voice.description}</span>
                                    )}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-voices" disabled className="text-gray-500">
                                  No custom voices available
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        {selectedVoiceId && availableVoices.length > 0 && (
                          <p className="text-xs text-cyan-400/70 mt-2">
                            Selected voice will be used for text-to-speech conversion
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Audio Generation Progress */}
            {isGeneratingAudio && (
              <div className="space-y-3">
                <div className="relative overflow-hidden bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-800 p-5 rounded-md border-2 border-cyan-400/60">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  <div className="relative flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/40 border-t-white"></div>
                    <span className="text-white/80 text-lg sm:text-xl font-bold tracking-[0.2em] uppercase">
                      {audioGenerationProgress || 'GENERATING AUDIO...'}
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-black/40 rounded-full h-3 border border-cyan-500/50 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-800 transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                {/* Percentage Display */}
                <div className="text-center">
                  <span className="text-cyan-400 text-2xl font-bold">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerateAudio}
              disabled={
                isGeneratingAudio || 
                !text.trim() || 
                (selectedAudioModel === 'elevenlabs' && text.length > getElevenLabsCharLimit(selectedElevenLabsModel))
              }
              className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-800 hover:from-cyan-700 hover:via-blue-700 hover:to-cyan-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
            >
              {isGeneratingAudio ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                  GENERATING AUDIO...
                </>
              ) : (
                <>
                  <Volume2 className="h-5 w-5 mr-3" />
                  GENERATE AUDIO
                </>
              )}
            </Button>

            {/* Generated Audio Player */}
            {audioUrl && (
              <div className="bg-neutral-900/50 p-6 rounded-2xl border border-green-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Generated Audio</h3>
                  <span className="text-sm text-cyan-400 font-mono bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/30">
                    {text.length} chars
                  </span>
                </div>
                
                {/* Hidden audio element */}
                <audio ref={audioRef} src={audioUrl} className="hidden" />
                
                {/* Audio Player Controls */}
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div className="w-full bg-black/40 rounded-full h-2 border border-cyan-500/30 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 transition-all duration-100"
                      style={{ width: audioDuration > 0 ? `${(currentTime / audioDuration) * 100}%` : '0%' }}
                    />
                  </div>
                  
                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={togglePlayPause}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-full p-3"
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </Button>
                      <div className="text-white">
                        <span className="text-sm">{formatTime(currentTime)}</span>
                        <span className="text-sm text-gray-400"> / {formatTime(audioDuration)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleSaveToLibrary}
                        disabled={isSavingToLibrary || savedToLibrary}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          savedToLibrary
                            ? 'bg-green-600 text-white cursor-default'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isSavingToLibrary ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white"></div>
                            Saving...
                          </>
                        ) : savedToLibrary ? (
                          <>
                            <Check className="h-4 w-4" />
                            Saved to Library
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save to Library
                          </>
                        )}
                      </Button>
                      <a 
                        href={audioUrl} 
                        download
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Audio
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </main>
        )}

        {/* Credits Purchase Dialog */}
        <CreditsPurchaseDialog 
          open={showCreditsDialog} 
          onOpenChange={setShowCreditsDialog}
          currentCredits={userCredits}
        />
      </div>
    </div>
  )
}

