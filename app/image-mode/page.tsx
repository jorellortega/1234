"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Home, BookUser, BrainCircuit, User, LogOut, Settings, CreditCard, RefreshCw, Wand2, Image as ImageIcon } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { CreditsPurchaseDialog } from "@/components/CreditsPurchaseDialog"

export default function ImageModePage() {
  // State
  const [prompt, setPrompt] = useState("")
  const [enhancedPrompt, setEnhancedPrompt] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [selectedImageModel, setSelectedImageModel] = useState<string>("gen4_image")
  const [selectedLLM, setSelectedLLM] = useState<string>("gpt-4o")
  const [imageRatio, setImageRatio] = useState("1024:1024")
  
  // Loading states
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [imageGenerationProgress, setImageGenerationProgress] = useState<string>('')
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
  
  // Save state to localStorage
  const saveGenerationState = () => {
    try {
      const state = {
        prompt,
        enhancedPrompt,
        selectedImageModel,
        selectedLLM,
        imageRatio,
        // Note: File objects can't be serialized, so we save preview URLs if any
        timestamp: Date.now()
      }
      localStorage.setItem('image_mode_state', JSON.stringify(state))
    } catch (error) {
      console.error('Error saving state:', error)
    }
  }

  // Restore state from localStorage
  const restoreGenerationState = () => {
    try {
      const saved = localStorage.getItem('image_mode_state')
      if (!saved) return false

      const state = JSON.parse(saved)
      // Only restore if state is recent (within 1 hour)
      if (Date.now() - state.timestamp > 3600000) {
        localStorage.removeItem('image_mode_state')
        return false
      }

      setPrompt(state.prompt || '')
      setEnhancedPrompt(state.enhancedPrompt || '')
      if (state.selectedImageModel) setSelectedImageModel(state.selectedImageModel)
      if (state.selectedLLM) setSelectedLLM(state.selectedLLM)
      if (state.imageRatio) setImageRatio(state.imageRatio)

      // Clear saved state after restoring
      localStorage.removeItem('image_mode_state')
      return true
    } catch (error) {
      console.error('Error restoring state:', error)
      localStorage.removeItem('image_mode_state')
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
  }, [prompt, enhancedPrompt, selectedImageModel, selectedLLM, imageRatio])

  // Check authentication and restore state on mount
  useEffect(() => {
    const getUser = async () => {
      try {
        // Check if we're returning from payment and restore state
        const pendingReturn = localStorage.getItem('pending_return')
        if (pendingReturn) {
          try {
            const returnData = JSON.parse(pendingReturn)
            if (returnData.pathname === '/image-mode' && Date.now() - returnData.timestamp < 3600000) {
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
        if (prefs.selected_image_model) {
          setSelectedImageModel(prefs.selected_image_model)
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
          prompt: `You are an expert image prompt engineer. Enhance the following image generation prompt to be more detailed, artistic, and specific. Focus on:
1. Visual details (lighting, composition, colors, textures)
2. Mood and atmosphere
3. Style and aesthetic
4. Technical photography/art terms
5. Composition and framing

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

  // Check if model is enabled (for non-admins)
  const isModelEnabled = (modelKey: string) => {
    if (isAdmin) return true
    if (!adminPreferences) return true
    return adminPreferences[`model_${modelKey}`] !== false
  }

  // Generate image
  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for image generation')
      return
    }
    
    if (!user) {
      setError('Please log in to generate images')
      return
    }

    try {
      setIsGeneratingImage(true)
      setError(null)
      setImageUrl(null)
      setImageGenerationProgress('Preparing image generation...')
      setProgressPercentage(5)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }
      
      setImageGenerationProgress('Checking credits...')
      setProgressPercentage(10)

      // Check credits
      const imageCredits: Record<string, number> = {
        'dalle_image': 40,
        'gpt-image-1': 40,
        'gen4_image': 8,
        'gen4_image_turbo': 3,
        'gemini_2.5_flash': 8,
        'runway_image': 8,
        'blip': 0,
        'llava': 0
      }
      const requiredCredits = imageCredits[selectedImageModel] || 8
      
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
        setError(creditData.message || `Insufficient credits. Image generation costs ${requiredCredits} credits.`)
        setIsGeneratingImage(false)
        setImageGenerationProgress('')
        return
      }

      if (creditData.credits !== undefined) {
        setUserCredits(creditData.credits)
      }
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }

      // Prepare request
      setImageGenerationProgress('Preparing request...')
      setProgressPercentage(20)
      
      // Determine which API to use
      let apiEndpoint = '/api/runway-image'
      let modelName = 'RunwayML'
      
      if (selectedImageModel === 'dalle_image') {
        apiEndpoint = '/api/dalle-image'
        modelName = 'DALL-E 3'
      } else if (selectedImageModel === 'gpt-image-1') {
        apiEndpoint = '/api/dalle-image'
        modelName = 'GPT Image 1'
      } else if (selectedImageModel === 'gen4_image') {
        apiEndpoint = '/api/runway-image'
        modelName = 'RunwayML Gen4 Image'
      } else if (selectedImageModel === 'gen4_image_turbo') {
        apiEndpoint = '/api/runway-image'
        modelName = 'RunwayML Gen4 Image Turbo'
      } else if (selectedImageModel === 'gemini_2.5_flash') {
        apiEndpoint = '/api/runway-image'
        modelName = 'Gemini 2.5 Flash'
      } else if (selectedImageModel === 'runway_image') {
        apiEndpoint = '/api/runway-image'
        modelName = 'RunwayML Gen-4 (Legacy)'
      } else if (selectedImageModel === 'blip' || selectedImageModel === 'llava') {
        // These are vision models, not image generation
        setError('BLIP and LLAVA are vision models, not image generation models')
        setIsGeneratingImage(false)
        setImageGenerationProgress('')
        return
      }

      setImageGenerationProgress(`Sending to ${modelName}...`)
      setProgressPercentage(30)
      
      // Simulate progress during API call
      const progressInterval = setInterval(() => {
        setProgressPercentage(prev => Math.min(prev + 2, 90))
      }, 2000)
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: selectedImageModel,
        }),
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
        
        let errorMessage = errorData.error || 'Image generation failed'
        if (errorMessage.toLowerCase().includes('moderation') || 
            errorMessage.toLowerCase().includes('copyright') ||
            errorMessage.toLowerCase().includes('content policy')) {
          errorMessage = "Didn't pass content review. Remove copyrighted names/brands or explicit content and try again."
        }
        
        throw new Error(errorMessage + refundMessage)
      }

      const data = await response.json()
      
      if (data.success && data.url) {
        setImageUrl(data.url)
        setImageGenerationProgress('Image generated successfully!')
        setProgressPercentage(100)
      } else {
        throw new Error('No image URL returned')
      }

      // Refresh credits
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    } catch (error: any) {
      console.error('Image generation error:', error)
      setError(error.message || 'Failed to generate image')
      setImageGenerationProgress('')
      setProgressPercentage(0)
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // Get image model display info
  const getImageModelInfo = (model: string) => {
    const models: Record<string, { cost: string, features: string }> = {
      'dalle_image': { 
        cost: '40 credits', 
        features: 'High-quality images, fast generation'
      },
      'gpt-image-1': { 
        cost: '40 credits', 
        features: 'OpenAI GPT Image model'
      },
      'gen4_image': { 
        cost: '8 credits', 
        features: 'RunwayML Gen4, high quality'
      },
      'gen4_image_turbo': { 
        cost: '3 credits', 
        features: 'RunwayML Gen4 Turbo, fast'
      },
      'gemini_2.5_flash': { 
        cost: '8 credits', 
        features: 'Gemini 2.5 Flash, advanced'
      },
      'runway_image': { 
        cost: '8 credits', 
        features: 'RunwayML Gen-4 (Legacy)'
      }
    }
    return models[model] || { cost: '8 credits', features: 'High-quality generation' }
  }

  return (
    <div className="relative min-h-screen w-full">
      <div className="aztec-background" />
      <div className="animated-grid" />

      <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          {/* Navigation */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Link href="/" className="flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-400/10">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Home</span>
            </Link>
            <Link href="/library" className="flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-400/10">
              <BookUser className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Library</span>
            </Link>
            <Link
              href="/memory-core"
              className="flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-400/10"
            >
              <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Memory Core</span>
            </Link>
            <Link
              href="/ai-settings"
              className="flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-400/10"
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
                className="flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-400/10"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Profile</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-400/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Link
                href="/login"
                className="flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-400/10"
              >
                <span className="text-sm">Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-400/10"
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
              <span className="text-purple-400">🖼️</span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600">
                IMAGE MODE
              </span>
            </h1>
            <p className="text-gray-300 text-lg">
              AI-powered image generation with prompt enhancement
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-6">
            {/* Model Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* LLM Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-purple-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit className="h-5 w-5 text-purple-400" />
                  <span className="text-purple-400 text-sm font-semibold uppercase">Prompt Enhancement Model</span>
                </div>
                <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                  <SelectTrigger className="bg-transparent border-purple-500/50 text-purple-300 hover:border-purple-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-purple-500/50 backdrop-blur-md">
                    <SelectItem value="gpt-4o" className="text-purple-300 hover:bg-purple-500/20">GPT-4O</SelectItem>
                    <SelectItem value="gpt-4o-mini" className="text-purple-300 hover:bg-purple-500/20">GPT-4O MINI</SelectItem>
                    <SelectItem value="gpt-4-turbo" className="text-purple-300 hover:bg-purple-500/20">GPT-4 TURBO</SelectItem>
                    <SelectItem value="gpt-4" className="text-purple-300 hover:bg-purple-500/20">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo" className="text-purple-300 hover:bg-purple-500/20">GPT-3.5 TURBO</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-purple-400 text-xs mt-2">
                  Enhances your image prompts with artistic details
                </p>
              </div>

              {/* Image Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-purple-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="h-5 w-5 text-purple-400" />
                  <span className="text-purple-400 text-sm font-semibold uppercase">Image Generation Model</span>
                </div>
                <Select value={selectedImageModel} onValueChange={setSelectedImageModel}>
                  <SelectTrigger className="bg-transparent border-purple-500/50 text-purple-300 hover:border-purple-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-purple-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                    {isModelEnabled('dalle_image') && <SelectItem value="dalle_image" className="text-purple-300 hover:bg-purple-500/20">DALL-E 3</SelectItem>}
                    {isModelEnabled('gpt-image-1') && <SelectItem value="gpt-image-1" className="text-purple-300 hover:bg-purple-500/20">GPT IMAGE 1</SelectItem>}
                    {isModelEnabled('gen4_image') && <SelectItem value="gen4_image" className="text-purple-300 hover:bg-purple-500/20">RUNWAY GEN4 IMAGE</SelectItem>}
                    {isModelEnabled('gen4_image_turbo') && <SelectItem value="gen4_image_turbo" className="text-purple-300 hover:bg-purple-500/20">RUNWAY GEN4 IMAGE TURBO</SelectItem>}
                    {isModelEnabled('gemini_2.5_flash') && <SelectItem value="gemini_2.5_flash" className="text-purple-300 hover:bg-purple-500/20">GEMINI 2.5 FLASH</SelectItem>}
                    {isModelEnabled('runway_image') && <SelectItem value="runway_image" className="text-purple-300 hover:bg-purple-500/20">RUNWAY GEN-4 (LEGACY)</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-purple-400 text-xs mt-2">
                  {getImageModelInfo(selectedImageModel).cost} • {getImageModelInfo(selectedImageModel).features}
                </p>
              </div>
            </div>

            {/* Prompt Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-purple-500/30 shadow-purple-500/20">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Image Prompt</h2>
                  <div className="flex items-center gap-2">
                    {userCredits <= 50 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreditsDialog(true)}
                        className={`${userCredits <= 10 ? 'text-red-400 hover:bg-red-400/10' : 'text-purple-400 hover:bg-purple-400/10'}`}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {userCredits} credits
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="text-purple-400 hover:bg-purple-400/10"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <textarea
                  placeholder="Describe the image you want to generate... (e.g., 'A futuristic cityscape at sunset', 'A portrait of a cyberpunk warrior')"
                  className="w-full bg-black/30 text-lg text-white placeholder-purple-600 resize-none border border-purple-500/30 rounded-lg p-4 focus:ring-2 focus:ring-purple-400 min-h-[120px]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />

                {/* Enhance Prompt Button */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={enhancePromptWithLLM}
                    disabled={!prompt.trim() || isEnhancingPrompt}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
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

            {/* Image Settings */}
            <div className="bg-neutral-900/50 p-6 rounded-2xl border border-purple-500/30">
              <h3 className="text-lg font-semibold text-white mb-4">Image Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Aspect Ratio */}
                <div>
                  <label className="text-purple-400 text-sm font-medium mb-2 block">Aspect Ratio</label>
                  <Select value={imageRatio} onValueChange={setImageRatio}>
                    <SelectTrigger className="bg-black/30 border-purple-500/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-purple-500/50">
                      <SelectItem value="1024:1024">1:1 Square</SelectItem>
                      <SelectItem value="1024:1792">9:16 Portrait</SelectItem>
                      <SelectItem value="1792:1024">16:9 Landscape</SelectItem>
                      <SelectItem value="1536:640">21:9 Ultra Wide</SelectItem>
                      <SelectItem value="640:1536">9:21 Tall</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-purple-400/70 text-xs mt-2">
                    Note: Some models may have limited ratio support
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Image Generation Progress */}
            {isGeneratingImage && (
              <div className="space-y-3">
                <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 p-5 rounded-md border-2 border-purple-400/60">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  <div className="relative flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/40 border-t-white"></div>
                    <span className="text-white/80 text-lg sm:text-xl font-bold tracking-[0.2em] uppercase">
                      {imageGenerationProgress || 'GENERATING IMAGE...'}
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-black/40 rounded-full h-3 border border-purple-500/50 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                {/* Percentage Display */}
                <div className="text-center">
                  <span className="text-purple-400 text-2xl font-bold">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !prompt.trim()}
              className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-800 hover:from-purple-700 hover:via-pink-700 hover:to-purple-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
            >
              {isGeneratingImage ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                  GENERATING IMAGE...
                </>
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 mr-3" />
                  GENERATE IMAGE
                </>
              )}
            </Button>

            {/* Generated Image */}
            {imageUrl && (
              <div className="bg-neutral-900/50 p-6 rounded-2xl border border-green-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Generated Image</h3>
                  {imageRatio && (
                    <span className="text-sm text-purple-400 font-mono bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/30">
                      Ratio: {imageRatio}
                    </span>
                  )}
                </div>
                <img 
                  src={imageUrl} 
                  alt="Generated" 
                  className="w-full rounded-lg border border-green-500/30 max-h-[800px] object-contain"
                />
                <div className="mt-4 flex gap-2">
                  <a 
                    href={imageUrl} 
                    download
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Download Image
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
          returnUrl={typeof window !== 'undefined' ? window.location.href : '/image-mode'}
        />
      </div>
    </div>
  )
}

