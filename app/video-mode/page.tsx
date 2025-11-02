"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Home, BookUser, BrainCircuit, User, LogOut, Settings, CreditCard, RefreshCw, Wand2, Video } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { CreditsPurchaseDialog } from "@/components/CreditsPurchaseDialog"

export default function VideoModePage() {
  // State
  const [prompt, setPrompt] = useState("")
  const [enhancedPrompt, setEnhancedPrompt] = useState("")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoImage, setVideoImage] = useState<File | null>(null)
  const [videoImagePreview, setVideoImagePreview] = useState<string | null>(null)
  const [selectedVideoModel, setSelectedVideoModel] = useState<string>("gen4_turbo")
  const [selectedLLM, setSelectedLLM] = useState<string>("gpt-4o")
  const [videoDuration, setVideoDuration] = useState(5)
  const [videoRatio, setVideoRatio] = useState("1280:720")
  const [generatedVideoRatio, setGeneratedVideoRatio] = useState<string | null>(null)
  
  // Act Two specific state
  const [actTwoCharacterImage, setActTwoCharacterImage] = useState<File | null>(null)
  const [actTwoCharacterPreview, setActTwoCharacterPreview] = useState<string | null>(null)
  const [actTwoReferenceVideo, setActTwoReferenceVideo] = useState<File | null>(null)
  const [actTwoReferencePreview, setActTwoReferencePreview] = useState<string | null>(null)
  
  // Kling AI specific state
  const [klingStartFrame, setKlingStartFrame] = useState<File | null>(null)
  const [klingStartFramePreview, setKlingStartFramePreview] = useState<string | null>(null)
  const [klingEndFrame, setKlingEndFrame] = useState<File | null>(null)
  const [klingEndFramePreview, setKlingEndFramePreview] = useState<string | null>(null)
  
  // Loading states
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoGenerationProgress, setVideoGenerationProgress] = useState<string>('')
  const [progressPercentage, setProgressPercentage] = useState<number>(0)
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // User state
  const [user, setUser] = useState<any>(null)
  const [userCredits, setUserCredits] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreditsDialog, setShowCreditsDialog] = useState(false)
  
  // Admin preferences
  const [adminPreferences, setAdminPreferences] = useState<any>(null)
  
  // Refs
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  const actTwoCharacterInputRef = useRef<HTMLInputElement>(null)
  const actTwoReferenceInputRef = useRef<HTMLInputElement>(null)
  const klingStartFrameInputRef = useRef<HTMLInputElement>(null)
  const klingEndFrameInputRef = useRef<HTMLInputElement>(null)
  
  // Save state to localStorage
  const saveGenerationState = () => {
    try {
      const state = {
        prompt,
        enhancedPrompt,
        selectedVideoModel,
        selectedLLM,
        videoDuration,
        videoRatio,
        // Note: File objects can't be serialized, so we save preview URLs
        videoImagePreview,
        actTwoCharacterPreview,
        actTwoReferencePreview,
        klingStartFramePreview,
        klingEndFramePreview,
        timestamp: Date.now()
      }
      localStorage.setItem('video_mode_state', JSON.stringify(state))
    } catch (error) {
      console.error('Error saving state:', error)
    }
  }

  // Restore state from localStorage
  const restoreGenerationState = () => {
    try {
      const saved = localStorage.getItem('video_mode_state')
      if (!saved) return false

      const state = JSON.parse(saved)
      // Only restore if state is recent (within 1 hour)
      if (Date.now() - state.timestamp > 3600000) {
        localStorage.removeItem('video_mode_state')
        return false
      }

      setPrompt(state.prompt || '')
      setEnhancedPrompt(state.enhancedPrompt || '')
      if (state.selectedVideoModel) setSelectedVideoModel(state.selectedVideoModel)
      if (state.selectedLLM) setSelectedLLM(state.selectedLLM)
      if (state.videoDuration) setVideoDuration(state.videoDuration)
      if (state.videoRatio) setVideoRatio(state.videoRatio)
      if (state.videoImagePreview) setVideoImagePreview(state.videoImagePreview)
      if (state.actTwoCharacterPreview) setActTwoCharacterPreview(state.actTwoCharacterPreview)
      if (state.actTwoReferencePreview) setActTwoReferencePreview(state.actTwoReferencePreview)
      if (state.klingStartFramePreview) setKlingStartFramePreview(state.klingStartFramePreview)
      if (state.klingEndFramePreview) setKlingEndFramePreview(state.klingEndFramePreview)

      // Clear saved state after restoring
      localStorage.removeItem('video_mode_state')
      return true
    } catch (error) {
      console.error('Error restoring state:', error)
      localStorage.removeItem('video_mode_state')
      return false
    }
  }

  // Listen for save state event from dialog
  useEffect(() => {
    const handleSaveState = () => {
      saveGenerationState()
    }
    window.addEventListener('save-generation-state', handleSaveState)
    return () => window.removeEventListener('save-generation-state', handleSaveState)
  }, [prompt, enhancedPrompt, selectedVideoModel, selectedLLM, videoDuration, videoRatio, videoImagePreview, actTwoCharacterPreview, actTwoReferencePreview, klingStartFramePreview, klingEndFramePreview])

  // Check authentication and restore state on mount
  useEffect(() => {
    const getUser = async () => {
      try {
        // Check if we're returning from payment and restore state
        const pendingReturn = localStorage.getItem('pending_return')
        if (pendingReturn) {
          try {
            const returnData = JSON.parse(pendingReturn)
            if (returnData.pathname === '/video-mode' && Date.now() - returnData.timestamp < 3600000) {
              restoreGenerationState()
              // Refresh credits after returning from payment
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                await fetchUserCredits(user.id)
              }
            }
            localStorage.removeItem('pending_return')
          } catch (e) {
            console.error('Error processing pending return:', e)
          }
        }

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

  // Update video aspect ratio and duration when model changes to ensure compatibility
  useEffect(() => {
    // Set default aspect ratio based on video model
    if (selectedVideoModel === 'veo3' || selectedVideoModel === 'veo3.1' || selectedVideoModel === 'veo3.1_fast') {
      // VEO models support: 720:1280, 1280:720, 1080:1920, 1920:1080
      if (!['720:1280', '1280:720', '1080:1920', '1920:1080'].includes(videoRatio)) {
        setVideoRatio('720:1280') // Default to portrait for VEO
      }
      // VEO 3.1 and 3.1_fast support: 4, 6, or 8 seconds
      if ((selectedVideoModel === 'veo3.1' || selectedVideoModel === 'veo3.1_fast') && ![4, 6, 8].includes(videoDuration)) {
        setVideoDuration(6) // Default to 6 seconds for VEO 3.1
      }
      // VEO 3 only supports 8 seconds
      if (selectedVideoModel === 'veo3' && videoDuration !== 8) {
        setVideoDuration(8) // Must be 8 seconds for VEO 3
      }
    } else if (selectedVideoModel === 'gen3a_turbo') {
      // GEN-3A supports: 1280:768, 768:1280
      if (!['1280:768', '768:1280'].includes(videoRatio)) {
        setVideoRatio('768:1280') // Default to portrait for GEN-3A
      }
      // GEN-3A supports: 5 or 10 seconds
      if (![5, 10].includes(videoDuration)) {
        setVideoDuration(5) // Default to 5 seconds for GEN-3A
      }
    } else if (selectedVideoModel === 'gen4_turbo') {
      // GEN-4 TURBO supports: 2-10 seconds
      if (![2, 5, 10].includes(videoDuration)) {
        setVideoDuration(5) // Default to 5 seconds for GEN-4
      }
    } else if (selectedVideoModel === 'kling_i2v' || selectedVideoModel === 'kling_t2v' || selectedVideoModel === 'kling_lipsync' || selectedVideoModel === 'kling_avatar') {
      // Kling AI models support: 1280:720 (16:9), 720:1280 (9:16), 960:960 (1:1)
      if (!['1280:720', '720:1280', '960:960'].includes(videoRatio)) {
        setVideoRatio('720:1280') // Default to portrait for Kling
      }
    }
  }, [selectedVideoModel, videoRatio, videoDuration])

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
        if (prefs.selected_video_model) {
          setSelectedVideoModel(prefs.selected_video_model)
        }
      }
    } catch (error) {
      console.error('Error fetching admin preferences:', error)
    }
  }

  // Enhance prompt with LLM
  const enhancePromptWithLLM = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt first')
      return
    }

    try {
      setIsEnhancingPrompt(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Please log in to enhance prompts')
      }

      // Call LLM to enhance the prompt
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt: `You are an expert video prompt engineer. Enhance the following video generation prompt to be more detailed, cinematic, and specific. Focus on:
1. Visual details (lighting, composition, camera movement)
2. Mood and atmosphere
3. Action and motion
4. Style and aesthetic
5. Technical cinematography terms

Original prompt: "${prompt}"

Return ONLY the enhanced prompt without any explanation or extra text.`,
          mode: selectedLLM,
          temperature: 0.8,
          max_tokens: 300,
          response_style: 'detailed'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to enhance prompt')
      }

      const data = await response.json()
      const enhanced = data.output || data.response || ''
      
      setEnhancedPrompt(enhanced.trim())
      // Auto-copy to main prompt
      setPrompt(enhanced.trim())
    } catch (error: any) {
      console.error('Prompt enhancement error:', error)
      setError(error.message || 'Failed to enhance prompt')
    } finally {
      setIsEnhancingPrompt(false)
    }
  }

  // Handle video image upload
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
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = ''
    }
  }

  // Act Two handlers
  const handleActTwoCharacterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setActTwoCharacterImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setActTwoCharacterPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError(null)
    } else {
      setError('Please select a valid image file for character')
    }
  }

  const handleActTwoReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('video/')) {
      setActTwoReferenceVideo(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setActTwoReferencePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError(null)
    } else {
      setError('Please select a valid video file for reference')
    }
  }

  const clearActTwoCharacter = () => {
    setActTwoCharacterImage(null)
    setActTwoCharacterPreview(null)
    if (actTwoCharacterInputRef.current) {
      actTwoCharacterInputRef.current.value = ''
    }
  }

  const clearActTwoReference = () => {
    setActTwoReferenceVideo(null)
    setActTwoReferencePreview(null)
    if (actTwoReferenceInputRef.current) {
      actTwoReferenceInputRef.current.value = ''
    }
  }

  // Kling AI handlers
  const handleKlingStartFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setKlingStartFrame(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setKlingStartFramePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError(null)
    } else {
      setError('Please select a valid image file for start frame')
    }
  }

  const handleKlingEndFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setKlingEndFrame(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setKlingEndFramePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError(null)
    } else {
      setError('Please select a valid image file for end frame')
    }
  }

  const clearKlingStartFrame = () => {
    setKlingStartFrame(null)
    setKlingStartFramePreview(null)
    if (klingStartFrameInputRef.current) {
      klingStartFrameInputRef.current.value = ''
    }
  }

  const clearKlingEndFrame = () => {
    setKlingEndFrame(null)
    setKlingEndFramePreview(null)
    if (klingEndFrameInputRef.current) {
      klingEndFrameInputRef.current.value = ''
    }
  }

  // Check if model is enabled (for non-admins)
  const isModelEnabled = (modelKey: string) => {
    if (isAdmin) return true
    if (!adminPreferences) return true
    return adminPreferences[`model_${modelKey}`] !== false
  }

  // Generate video
  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for video generation')
      return
    }

    // Check if model requires an image
    if ((selectedVideoModel === 'gen4_turbo' || selectedVideoModel === 'gen3a_turbo') && !videoImage) {
      setError(`${selectedVideoModel} requires an image input`)
      return
    }

    // Check Act Two requirements
    if (selectedVideoModel === 'act_two' && !actTwoCharacterImage) {
      setError('Act Two requires a character image')
      return
    }
    
    // Check Kling I2V requirements
    if (selectedVideoModel === 'kling_i2v' && !klingStartFrame && !videoImage) {
      setError('Kling I2V requires at least a start frame or image')
      return
    }
    
    if (!user) {
      setError('Please log in to generate videos')
      return
    }

    try {
      setIsGeneratingVideo(true)
      setError(null)
      setVideoUrl(null)
      setGeneratedVideoRatio(null)
      setVideoGenerationProgress('Preparing video generation...')
      setProgressPercentage(5)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }
      
      setVideoGenerationProgress('Checking credits...')
      setProgressPercentage(10)

      // Check credits
      const videoCredits: Record<string, number> = {
        'gen4_turbo': 40,
        'gen3a_turbo': 80,
        'veo3.1': 320,
        'veo3.1_fast': 160,
        'veo3': 512,
        'gen4_aleph': 120,
        'act_two': 40,
        'kling_t2v': 50,
        'kling_i2v': 50,
        'kling_lipsync': 50, // TBD pricing
        'kling_avatar': 50 // TBD pricing
      }
      const requiredCredits = videoCredits[selectedVideoModel] || 40
      
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
        setError(creditData.message || `Insufficient credits. Video generation costs ${requiredCredits} credits.`)
        setIsGeneratingVideo(false)
        setVideoGenerationProgress('')
        return
      }

      if (creditData.credits !== undefined) {
        setUserCredits(creditData.credits)
      }
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }

      // Prepare form data
      setVideoGenerationProgress('Preparing request...')
      setProgressPercentage(20)
      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('model', selectedVideoModel)
      formData.append('duration', videoDuration.toString())
      formData.append('ratio', videoRatio)
      
      // Add file(s) based on model type
      if (selectedVideoModel === 'act_two') {
        // Act Two needs character and reference
        if (actTwoCharacterImage) {
          formData.append('character_file', actTwoCharacterImage)
        }
        if (actTwoReferenceVideo) {
          formData.append('reference_file', actTwoReferenceVideo)
        }
      } else if (selectedVideoModel === 'kling_i2v') {
        // Kling I2V supports start/end frames
        if (klingStartFrame) {
          formData.append('start_frame', klingStartFrame)
        }
        if (klingEndFrame) {
          formData.append('end_frame', klingEndFrame)
        }
      } else if (videoImage) {
        formData.append('file', videoImage)
      }

      // Send to backend - route to appropriate API based on model
      const apiEndpoint = (selectedVideoModel.startsWith('kling')) ? '/api/kling' : '/api/runway'
      setVideoGenerationProgress('Sending to AI video engine...')
      setProgressPercentage(30)
      
      // Simulate progress during API call
      const progressInterval = setInterval(() => {
        setProgressPercentage(prev => Math.min(prev + 2, 90))
      }, 2000) // Update every 2 seconds
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      })
      
      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.refunded && errorData.newBalance !== undefined) {
          setUserCredits(errorData.newBalance)
        }
        const refundMessage = errorData.refunded 
          ? ` Your ${requiredCredits} credits have been refunded.` 
          : ''
        throw new Error((errorData.error || 'Video generation failed') + refundMessage)
      }

      const data = await response.json()
      
      if (data.success && data.url) {
        setVideoUrl(data.url)
        setGeneratedVideoRatio(videoRatio) // Store the aspect ratio used for generation
        setVideoGenerationProgress('Video generated successfully!')
        setProgressPercentage(100)
      } else {
        throw new Error('No video URL returned')
      }

      // Refresh credits
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    } catch (error: any) {
      console.error('Video generation error:', error)
      setError(error.message || 'Failed to generate video')
      setVideoGenerationProgress('')
      setProgressPercentage(0)
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    } finally {
      setIsGeneratingVideo(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // Get video model display info
  const getVideoModelInfo = (model: string) => {
    const models: Record<string, { cost: string, features: string }> = {
      'gen4_turbo': { 
        cost: '40 credits', 
        features: 'Fast I2V generation, 2-10s duration'
      },
      'gen3a_turbo': { 
        cost: '80 credits', 
        features: 'High-quality I2V, 5-10s only'
      },
      'veo3.1': { 
        cost: '320 credits', 
        features: 'Premium T2V/I2V, best quality'
      },
      'veo3.1_fast': { 
        cost: '160 credits', 
        features: 'Fast T2V/I2V, high quality'
      },
      'veo3': { 
        cost: '512 credits', 
        features: 'Highest quality T2V/I2V, 8s fixed'
      },
      'gen4_aleph': { 
        cost: '120 credits', 
        features: 'Video-to-Video transformation'
      },
      'act_two': { 
        cost: '40 credits', 
        features: 'Character animation, up to 30s'
      },
      'kling_t2v': { 
        cost: '50 credits', 
        features: 'Text-to-Video, cinematic quality'
      },
      'kling_i2v': { 
        cost: '50 credits', 
        features: 'Image-to-Video with start/end frames'
      },
      'kling_lipsync': { 
        cost: 'TBD', 
        features: 'Synchronize lip movements with audio'
      },
      'kling_avatar': { 
        cost: 'TBD', 
        features: 'Character-based video generation'
      }
    }
    return models[model] || { cost: '40 credits', features: 'Fast generation' }
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
              <span className="hidden sm:inline text-sm">Memory Core</span>
            </Link>
            <Link
              href="/ai-settings"
              className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
            >
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">AI Settings</span>
            </Link>
          </div>

          {/* User Actions */}
          {user ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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
        <main className="flex-1 space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="text-cyan-400">🎬</span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">
                VIDEO MODE
              </span>
            </h1>
            <p className="text-gray-300 text-lg">
              AI-powered video generation with prompt enhancement
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-6">
            {/* Model Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* LLM Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit className="h-5 w-5 text-cyan-400" />
                  <span className="text-cyan-400 text-sm font-semibold uppercase">Prompt Enhancement Model</span>
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
                  Enhances your video prompts with cinematic details
                </p>
              </div>

              {/* Video Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-pink-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Video className="h-5 w-5 text-pink-400" />
                  <span className="text-pink-400 text-sm font-semibold uppercase">Video Generation Model</span>
                </div>
                <Select value={selectedVideoModel} onValueChange={setSelectedVideoModel}>
                  <SelectTrigger className="bg-transparent border-pink-500/50 text-pink-300 hover:border-pink-400">
                    <SelectValue />
                  </SelectTrigger>
                    <SelectContent className="bg-black/90 border-pink-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                    {isModelEnabled('gen4_turbo') && <SelectItem value="gen4_turbo" className="text-pink-300 hover:bg-pink-500/20">GEN-4 TURBO (I2V)</SelectItem>}
                    {isModelEnabled('gen3a_turbo') && <SelectItem value="gen3a_turbo" className="text-pink-300 hover:bg-pink-500/20">GEN-3A TURBO (I2V)</SelectItem>}
                    {isModelEnabled('veo3.1') && <SelectItem value="veo3.1" className="text-pink-300 hover:bg-pink-500/20">VEO 3.1 (T2V/I2V)</SelectItem>}
                    {isModelEnabled('veo3.1_fast') && <SelectItem value="veo3.1_fast" className="text-pink-300 hover:bg-pink-500/20">VEO 3.1 FAST (T2V/I2V)</SelectItem>}
                    {isModelEnabled('veo3') && <SelectItem value="veo3" className="text-pink-300 hover:bg-pink-500/20">VEO 3 (T2V/I2V)</SelectItem>}
                    {isModelEnabled('gen4_aleph') && <SelectItem value="gen4_aleph" className="text-pink-300 hover:bg-pink-500/20">GEN-4 ALEPH (V2V)</SelectItem>}
                    {isModelEnabled('act_two') && <SelectItem value="act_two" className="text-pink-300 hover:bg-pink-500/20">ACT TWO (Character)</SelectItem>}
                    {/* Kling AI Models */}
                    {isModelEnabled('kling_t2v') && <SelectItem value="kling_t2v" className="text-pink-300 hover:bg-pink-500/20">🎬 KLING T2V (Text-to-Video)</SelectItem>}
                    {isModelEnabled('kling_i2v') && <SelectItem value="kling_i2v" className="text-pink-300 hover:bg-pink-500/20">🖼️ KLING I2V (Image-to-Video)</SelectItem>}
                    {isModelEnabled('kling_lipsync') && <SelectItem value="kling_lipsync" className="text-pink-300 hover:bg-pink-500/20">👄 KLING LIP-SYNC</SelectItem>}
                    {isModelEnabled('kling_avatar') && <SelectItem value="kling_avatar" className="text-pink-300 hover:bg-pink-500/20">👤 KLING AVATAR</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-pink-400 text-xs mt-2">
                  {getVideoModelInfo(selectedVideoModel).cost} • {getVideoModelInfo(selectedVideoModel).features}
                </p>
              </div>
            </div>

            {/* Prompt Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-pink-500/30 shadow-pink-500/20">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Video Prompt</h2>
                  <div className="flex items-center gap-2">
                    {userCredits <= 50 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreditsDialog(true)}
                        className={`${userCredits <= 10 ? 'text-red-400 hover:bg-red-400/10' : 'text-cyan-400 hover:bg-cyan-400/10'}`}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {userCredits} credits
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="text-cyan-400 hover:bg-cyan-400/10"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <textarea
                  placeholder="Describe the video you want to generate... (e.g., 'A cat playing with a ball', 'Ocean waves at sunset')"
                  className="w-full bg-black/30 text-lg text-white placeholder-pink-600 resize-none border border-pink-500/30 rounded-lg p-4 focus:ring-2 focus:ring-pink-400 min-h-[120px]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />

                {/* Enhance Prompt Button */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={enhancePromptWithLLM}
                    disabled={!prompt.trim() || isEnhancingPrompt}
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white"
                  >
                    {isEnhancingPrompt ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Enhance Prompt with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Image Upload Section */}
            {selectedVideoModel === 'act_two' ? (
              /* Act Two requires both character image and reference video */
              <div className="space-y-4">
                {/* Character Image */}
                <div className="bg-neutral-900/50 p-6 rounded-2xl border border-orange-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-orange-400 text-sm font-semibold">👤 Character Image (Required)</span>
                  </div>
                  {!actTwoCharacterImage ? (
                    <div className="flex items-center gap-3">
                      <input
                        ref={actTwoCharacterInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleActTwoCharacterUpload}
                        className="hidden"
                      />
                      <Button onClick={() => actTwoCharacterInputRef.current?.click()}>
                        Upload Character
                      </Button>
                      <span className="text-orange-300 text-sm">Upload character to animate</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {actTwoCharacterPreview && (
                        <img 
                          src={actTwoCharacterPreview} 
                          alt="Character" 
                          className="w-20 h-20 object-cover rounded border border-orange-500/50"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{actTwoCharacterImage.name}</p>
                        <p className="text-orange-400 text-xs">{(actTwoCharacterImage.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button variant="ghost" onClick={clearActTwoCharacter} size="sm">
                        ✕
                      </Button>
                    </div>
                  )}
                </div>
                {/* Reference Video */}
                <div className="bg-neutral-900/50 p-6 rounded-2xl border border-orange-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-orange-400 text-sm font-semibold">🎥 Reference Video (Optional)</span>
                  </div>
                  {!actTwoReferenceVideo ? (
                    <div className="flex items-center gap-3">
                      <input
                        ref={actTwoReferenceInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleActTwoReferenceUpload}
                        className="hidden"
                      />
                      <Button onClick={() => actTwoReferenceInputRef.current?.click()} variant="outline">
                        Upload Reference
                      </Button>
                      <span className="text-orange-300 text-sm">Driving performance video (optional)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {actTwoReferencePreview && (
                        <video 
                          src={actTwoReferencePreview} 
                          className="w-20 h-20 object-cover rounded border border-orange-500/50"
                          muted
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{actTwoReferenceVideo.name}</p>
                        <p className="text-orange-400 text-xs">{(actTwoReferenceVideo.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button variant="ghost" onClick={clearActTwoReference} size="sm">
                        ✕
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : selectedVideoModel === 'gen4_turbo' || selectedVideoModel === 'gen3a_turbo' ? (
              <div className="bg-neutral-900/50 p-6 rounded-2xl border border-purple-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-purple-400 text-sm font-semibold">📷 Starting Image (Required)</span>
                </div>
                {!videoImage ? (
                  <div className="flex items-center gap-3">
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleVideoImageUpload}
                      className="hidden"
                    />
                    <Button onClick={() => videoFileInputRef.current?.click()}>
                      Upload Image
                    </Button>
                    <span className="text-purple-300 text-sm">Required for this model</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {videoImagePreview && (
                      <img 
                        src={videoImagePreview} 
                        alt="Starting frame" 
                        className="w-20 h-20 object-cover rounded border border-purple-500/50"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{videoImage.name}</p>
                      <p className="text-purple-400 text-xs">{(videoImage.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button variant="ghost" onClick={clearVideoImage} size="sm">
                      ✕
                    </Button>
                  </div>
                )}
              </div>
            ) : selectedVideoModel === 'kling_i2v' ? (
              /* Kling I2V supports start/end frame control */
              <div className="space-y-4">
                {/* Start Frame */}
                <div className="bg-neutral-900/50 p-6 rounded-2xl border border-pink-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-pink-400 text-sm font-semibold">🎬 Start Frame (Optional)</span>
                  </div>
                  {!klingStartFrame ? (
                    <div className="flex items-center gap-3">
                      <input
                        ref={klingStartFrameInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleKlingStartFrameUpload}
                        className="hidden"
                      />
                      <Button onClick={() => klingStartFrameInputRef.current?.click()} variant="outline">
                        Upload Start Frame
                      </Button>
                      <span className="text-pink-300 text-sm">Optional starting image</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {klingStartFramePreview && (
                        <img 
                          src={klingStartFramePreview} 
                          alt="Start frame" 
                          className="w-20 h-20 object-cover rounded border border-pink-500/50"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{klingStartFrame.name}</p>
                        <p className="text-pink-400 text-xs">{(klingStartFrame.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button variant="ghost" onClick={clearKlingStartFrame} size="sm">
                        ✕
                      </Button>
                    </div>
                  )}
                </div>
                {/* End Frame */}
                <div className="bg-neutral-900/50 p-6 rounded-2xl border border-pink-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-pink-400 text-sm font-semibold">🏁 End Frame (Optional)</span>
                  </div>
                  {!klingEndFrame ? (
                    <div className="flex items-center gap-3">
                      <input
                        ref={klingEndFrameInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleKlingEndFrameUpload}
                        className="hidden"
                      />
                      <Button onClick={() => klingEndFrameInputRef.current?.click()} variant="outline">
                        Upload End Frame
                      </Button>
                      <span className="text-pink-300 text-sm">Optional ending image</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {klingEndFramePreview && (
                        <img 
                          src={klingEndFramePreview} 
                          alt="End frame" 
                          className="w-20 h-20 object-cover rounded border border-pink-500/50"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{klingEndFrame.name}</p>
                        <p className="text-pink-400 text-xs">{(klingEndFrame.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button variant="ghost" onClick={clearKlingEndFrame} size="sm">
                        ✕
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-neutral-900/50 p-6 rounded-2xl border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-cyan-400 text-sm font-semibold">📷 Starting Image (Optional)</span>
                </div>
                {!videoImage ? (
                  <div className="flex items-center gap-3">
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleVideoImageUpload}
                      className="hidden"
                    />
                    <Button onClick={() => videoFileInputRef.current?.click()} variant="outline">
                      Upload Image
                    </Button>
                    <span className="text-cyan-300 text-sm">Optional - text-to-video supported</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {videoImagePreview && (
                      <img 
                        src={videoImagePreview} 
                        alt="Starting frame" 
                        className="w-20 h-20 object-cover rounded border border-cyan-500/50"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{videoImage.name}</p>
                      <p className="text-cyan-400 text-xs">{(videoImage.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button variant="ghost" onClick={clearVideoImage} size="sm">
                      ✕
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Video Settings */}
            <div className="bg-neutral-900/50 p-6 rounded-2xl border border-indigo-500/30">
              <h3 className="text-lg font-semibold text-white mb-4">Video Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Duration */}
                <div>
                  <label className="text-indigo-400 text-sm font-medium mb-2 block">Duration (seconds)</label>
                  <Select value={videoDuration.toString()} onValueChange={(v) => setVideoDuration(parseInt(v))}>
                    <SelectTrigger className="bg-black/30 border-indigo-500/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-indigo-500/50">
                      {selectedVideoModel === 'veo3' && <SelectItem value="8">8</SelectItem>}
                      {(selectedVideoModel === 'veo3.1' || selectedVideoModel === 'veo3.1_fast') && (
                        <>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="8">8</SelectItem>
                        </>
                      )}
                      {(selectedVideoModel === 'gen4_turbo' || selectedVideoModel === 'gen3a_turbo') && (
                        <>
                          {selectedVideoModel !== 'gen3a_turbo' && <SelectItem value="2">2</SelectItem>}
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                        </>
                      )}
                      {selectedVideoModel === 'gen4_aleph' && (
                        <>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                        </>
                      )}
                      {selectedVideoModel === 'kling' && (
                        <>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className="text-indigo-400 text-sm font-medium mb-2 block">Aspect Ratio</label>
                  <Select value={videoRatio} onValueChange={setVideoRatio}>
                    <SelectTrigger className="bg-black/30 border-indigo-500/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-indigo-500/50">
                      {selectedVideoModel === 'kling' ? (
                        <>
                          <SelectItem value="1280:720">16:9 Landscape</SelectItem>
                          <SelectItem value="720:1280">9:16 Portrait</SelectItem>
                          <SelectItem value="960:960">1:1 Square</SelectItem>
                        </>
                      ) : selectedVideoModel === 'gen3a_turbo' ? (
                        <>
                          <SelectItem value="1280:768">5:3 Horizontal</SelectItem>
                          <SelectItem value="768:1280">3:5 Vertical</SelectItem>
                        </>
                      ) : (selectedVideoModel === 'veo3' || selectedVideoModel === 'veo3.1' || selectedVideoModel === 'veo3.1_fast') ? (
                        <>
                          <SelectItem value="1280:720">16:9 Landscape</SelectItem>
                          <SelectItem value="720:1280">9:16 Portrait</SelectItem>
                          <SelectItem value="1920:1080">1920:1080 Horizontal HD</SelectItem>
                          <SelectItem value="1080:1920">1080:1920 Vertical HD</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="1280:720">16:9 Landscape</SelectItem>
                          <SelectItem value="720:1280">9:16 Portrait</SelectItem>
                          <SelectItem value="1920:1080">1920:1080 HD</SelectItem>
                          <SelectItem value="1080:1920">1080:1920 Vertical HD</SelectItem>
                          <SelectItem value="960:960">1:1 Square</SelectItem>
                          <SelectItem value="1104:832">4:3 Landscape</SelectItem>
                          <SelectItem value="832:1104">3:4 Portrait</SelectItem>
                          <SelectItem value="1584:672">21:9 Ultra Wide</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Video Generation Progress */}
            {isGeneratingVideo && (
              <div className="space-y-3">
                <div className="relative overflow-hidden bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 p-5 rounded-md border-2 border-pink-400/60">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  <div className="relative flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/40 border-t-white"></div>
                    <span className="text-white/80 text-lg sm:text-xl font-bold tracking-[0.2em] uppercase">
                      {videoGenerationProgress || 'GENERATING VIDEO...'}
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-black/40 rounded-full h-3 border border-pink-500/50 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 transition-all duration-500 ease-out"
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
              onClick={handleGenerateVideo}
              disabled={isGeneratingVideo || !prompt.trim()}
              className="w-full bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 hover:from-pink-700 hover:via-purple-700 hover:to-cyan-700 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
            >
              {isGeneratingVideo ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                  GENERATING VIDEO...
                </>
              ) : (
                <>
                  <Video className="h-5 w-5 mr-3" />
                  GENERATE VIDEO
                </>
              )}
            </Button>

            {/* Generated Video */}
            {videoUrl && (
              <div className="bg-neutral-900/50 p-6 rounded-2xl border border-green-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Generated Video</h3>
                  {generatedVideoRatio && (
                    <span className="text-sm text-cyan-400 font-mono bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/30">
                      Aspect Ratio: {generatedVideoRatio}
                    </span>
                  )}
                </div>
                <video 
                  src={videoUrl} 
                  controls 
                  className="w-full rounded-lg border border-green-500/30"
                  style={{ maxHeight: '600px' }}
                >
                  Your browser does not support the video tag.
                </video>
                <div className="mt-4 flex gap-2">
                  <a 
                    href={videoUrl} 
                    download
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Download Video
                  </a>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Credits Purchase Dialog */}
        <CreditsPurchaseDialog 
          open={showCreditsDialog} 
          onOpenChange={setShowCreditsDialog}
          currentCredits={userCredits}
          returnUrl={typeof window !== 'undefined' ? window.location.href : '/video-mode'}
        />
      </div>
    </div>
  )
}

