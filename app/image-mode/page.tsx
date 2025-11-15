"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Home, BookUser, BrainCircuit, User, LogOut, CreditCard, RefreshCw, Wand2, Image as ImageIcon, Upload, X, Eye, EyeOff, Check, Loader2, Paintbrush, Eraser, Square, Crop, ZoomIn, ZoomOut, Move } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { CreditsPurchaseDialog } from "@/components/CreditsPurchaseDialog"
import { HudPanel } from "@/components/hud-panel"
import { AztecIcon } from "@/components/aztec-icon"
import { Switch } from "@/components/ui/switch"

export default function ImageModePage() {
  // State
  const [prompt, setPrompt] = useState("")
  const [enhancedPrompt, setEnhancedPrompt] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null) // Original before any edits
  const [imageHistory, setImageHistory] = useState<Array<{ url: string, label: string, timestamp: number }>>([]) // All versions
  const [selectedImageModel, setSelectedImageModel] = useState<string>("gen4_image")
  const [selectedLLM, setSelectedLLM] = useState<string>("gpt-4o")
  const [imageRatio, setImageRatio] = useState("1024:1024")
  
  // Image upload for scanning
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [imageAnalysisResult, setImageAnalysisResult] = useState<string | null>(null)
  const [useImageAsReference, setUseImageAsReference] = useState(false)
  const [storedImageReference, setStoredImageReference] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Inpainting state
  const [showInpainting, setShowInpainting] = useState(false)
  const [inpaintingPrompt, setInpaintingPrompt] = useState("")
  const [selectedInpaintModel, setSelectedInpaintModel] = useState<string>("dall-e-2")
  const [isInpainting, setIsInpainting] = useState(false)
  const [inpaintingProgress, setInpaintingProgress] = useState<string>('')
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(30)
  
  // Crop state
  const [enableCrop, setEnableCrop] = useState(false)
  const [showCrop, setShowCrop] = useState(false)
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const cropImageCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const cropImageRef = useRef<HTMLImageElement | null>(null)
  const isCenteringRef = useRef(false)
  const isInitialCropSetupRef = useRef(false)
  const prevCropAreaRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null)
  const [isCropSelecting, setIsCropSelecting] = useState(false)
  const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [cropInputValues, setCropInputValues] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; cropX: number; cropY: number; cropWidth: number; cropHeight: number } | null>(null)
  // Zoom and pan state for crop tool
  const [cropZoom, setCropZoom] = useState(1.0)
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null)
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null)
  
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
  
  // Panel visibility state
  const [showPanels, setShowPanels] = useState(false)
  
  // Get supported aspect ratios for each model
  const getSupportedRatios = (model: string): Array<{ value: string; label: string }> => {
    const ratios: Record<string, Array<{ value: string; label: string }>> = {
      'dalle_image': [
        { value: '1024:1024', label: '1:1 Square (1024×1024)' },
        { value: '1024:1792', label: '9:16 Portrait (1024×1792)' },
        { value: '1792:1024', label: '16:9 Landscape (1792×1024)' }
      ],
      'gpt-image-1': [
        { value: '1024:1024', label: '1:1 Square (1024×1024)' },
        { value: '1024:1792', label: '9:16 Portrait (1024×1792)' },
        { value: '1792:1024', label: '16:9 Landscape (1792×1024)' }
      ],
      'gen4_image': [
        { value: '1024:1024', label: '1:1 Square (1024×1024)' },
        { value: '1280:720', label: '16:9 Landscape (1280×720)' },
        { value: '720:1280', label: '9:16 Portrait (720×1280)' },
        { value: '1104:832', label: '4:3 Horizontal (1104×832)' },
        { value: '832:1104', label: '3:4 Vertical (832×1104)' },
        { value: '960:960', label: '1:1 Square (960×960)' },
        { value: '1584:672', label: '21:9 Ultra Wide (1584×672)' }
      ],
      'gen4_image_turbo': [
        { value: '1024:1024', label: '1:1 Square (1024×1024)' },
        { value: '1280:720', label: '16:9 Landscape (1280×720)' },
        { value: '720:1280', label: '9:16 Portrait (720×1280)' },
        { value: '1104:832', label: '4:3 Horizontal (1104×832)' },
        { value: '832:1104', label: '3:4 Vertical (832×1104)' },
        { value: '960:960', label: '1:1 Square (960×960)' },
        { value: '1584:672', label: '21:9 Ultra Wide (1584×672)' }
      ],
      'gemini_2.5_flash': [
        { value: '1024:1024', label: '1:1 Square (1024×1024)' },
        { value: '1280:720', label: '16:9 Landscape (1280×720)' },
        { value: '720:1280', label: '9:16 Portrait (720×1280)' },
        { value: '1104:832', label: '4:3 Horizontal (1104×832)' },
        { value: '832:1104', label: '3:4 Vertical (832×1104)' },
        { value: '960:960', label: '1:1 Square (960×960)' },
        { value: '1584:672', label: '21:9 Ultra Wide (1584×672)' }
      ],
      'runway_image': [
        { value: '1024:1024', label: '1:1 Square (1024×1024)' },
        { value: '1280:720', label: '16:9 Landscape (1280×720)' },
        { value: '720:1280', label: '9:16 Portrait (720×1280)' },
        { value: '1104:832', label: '4:3 Horizontal (1104×832)' },
        { value: '832:1104', label: '3:4 Vertical (832×1104)' },
        { value: '960:960', label: '1:1 Square (960×960)' },
        { value: '1584:672', label: '21:9 Ultra Wide (1584×672)' }
      ]
    }
    return ratios[model] || ratios['gen4_image']
  }

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

  // Update aspect ratio when model changes to ensure it's valid
  useEffect(() => {
    const supportedRatios = getSupportedRatios(selectedImageModel)
    const currentRatioValid = supportedRatios.some(r => r.value === imageRatio)
    
    if (!currentRatioValid && supportedRatios.length > 0) {
      // Set to first supported ratio (usually square)
      setImageRatio(supportedRatios[0].value)
    }
  }, [selectedImageModel, imageRatio])

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
          prompt: `You are an expert image prompt engineer. Enhance the following image generation prompt by adding 2-3 key visual details (like lighting, colors, or style) while keeping the same meaning and length similar. Keep it concise - maximum 2-3 sentences. Do NOT write a long description.

Original prompt: "${prompt}"

Return ONLY the enhanced prompt without any explanation or extra text. Keep it short and similar to the original.`,
          mode: selectedLLM,
          temperature: 0.7,
          max_tokens: 150,
          response_style: 'concise'
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
      setOriginalImageUrl(null)
      setImageHistory([])
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
      
      // Check if user wants to use the image as reference
      let finalPrompt = prompt
      if (useImageAsReference && selectedImage && imagePreview) {
        // If we have stored analysis, use it
        if (storedImageReference) {
          finalPrompt = `${prompt}\n\nReference image description: ${storedImageReference}\n\nGenerate an image that matches the style, composition, and visual elements described above.`
        } else {
          // Need to analyze first
          setImageGenerationProgress('Analyzing uploaded image for reference...')
          setProgressPercentage(25)
          
          try {
            const analysisResponse = await fetch('/api/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                prompt: 'Please describe this image in detail, focusing on visual elements, style, composition, colors, mood, and key features that would help generate a similar image.',
                mode: 'blip',
                temperature: 0.7,
                max_tokens: 300,
                response_style: 'detailed',
                image: imagePreview
              })
            })
            
            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json()
              const imageDescription = analysisData.output || analysisData.response || ''
              
              // Extract the actual description (remove BLIP Analysis prefix if present)
              let cleanDescription = imageDescription
                .replace(/^\[BLIP Analysis\]\s*/i, '')
                .replace(/^\[BLIP Error\].*/i, '')
                .trim()
              
              if (cleanDescription && !cleanDescription.startsWith('[BLIP Error]')) {
                // Store it for future use
                setStoredImageReference(cleanDescription)
                // Enhance the prompt with the image description
                finalPrompt = `${prompt}\n\nReference image description: ${cleanDescription}\n\nGenerate an image that matches the style, composition, and visual elements described above.`
                setImageGenerationProgress('Image analyzed, generating...')
              } else {
                // If analysis failed, just use the original prompt
                console.warn('Image analysis failed, using original prompt')
                setUseImageAsReference(false)
              }
            } else {
              console.warn('Image analysis failed, using original prompt')
              setUseImageAsReference(false)
            }
          } catch (analysisError) {
            // If analysis fails, continue with original prompt
            console.warn('Image analysis error:', analysisError)
            setUseImageAsReference(false)
          }
        }
      } else if (selectedImage && imagePreview) {
        // Legacy keyword-based detection (kept for backward compatibility)
        const promptLower = prompt.toLowerCase()
        const imageReferenceKeywords = [
          'like this', 'similar to this', 'like the uploaded image', 'like the image',
          'similar to the image', 'based on this', 'like this image', 'similar image',
          'generate like this', 'create like this', 'make like this'
        ]
        
        const isReferencingImage = imageReferenceKeywords.some(keyword => promptLower.includes(keyword))
        
        if (isReferencingImage) {
          // Automatically analyze the uploaded image first
          setImageGenerationProgress('Analyzing uploaded image...')
          setProgressPercentage(25)
          
          try {
            const analysisResponse = await fetch('/api/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                prompt: 'Please describe this image in detail, focusing on visual elements, style, composition, colors, mood, and key features that would help generate a similar image.',
                mode: 'blip',
                temperature: 0.7,
                max_tokens: 300,
                response_style: 'detailed',
                image: imagePreview
              })
            })
            
            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json()
              const imageDescription = analysisData.output || analysisData.response || ''
              
              // Extract the actual description (remove BLIP Analysis prefix if present)
              let cleanDescription = imageDescription
                .replace(/^\[BLIP Analysis\]\s*/i, '')
                .replace(/^\[BLIP Error\].*/i, '')
                .trim()
              
              if (cleanDescription && !cleanDescription.startsWith('[BLIP Error]')) {
                // Enhance the prompt with the image description
                finalPrompt = `${prompt}\n\nReference image description: ${cleanDescription}\n\nGenerate an image that matches the style, composition, and visual elements described above.`
                setImageGenerationProgress('Image analyzed, generating...')
              } else {
                // If analysis failed, just use the original prompt
                console.warn('Image analysis failed, using original prompt')
              }
            }
          } catch (analysisError) {
            // If analysis fails, continue with original prompt
            console.warn('Image analysis error:', analysisError)
          }
        }
      }
      
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

      setImageGenerationProgress('GENERATING IMAGE...')
      setProgressPercentage(30)
      
      // Simulate progress during API call
      const progressInterval = setInterval(() => {
        setProgressPercentage(prev => Math.min(prev + 2, 90))
      }, 2000)
      
      // Map frontend model names to API model names
      const modelMapping: Record<string, string> = {
        'dalle_image': 'dall-e-3',
        'gpt-image-1': 'gpt-image-1',
        'gen4_image': 'gen4_image',
        'gen4_image_turbo': 'gen4_image_turbo',
        'gemini_2.5_flash': 'gemini_2.5_flash',
        'runway_image': 'runway_image'
      }
      const apiModel = modelMapping[selectedImageModel] || selectedImageModel
      
      // Log what's being sent for debugging
      console.log('[IMAGE GEN DEBUG] useImageAsReference:', useImageAsReference)
      console.log('[IMAGE GEN DEBUG] storedImageReference:', storedImageReference ? 'exists' : 'null')
      console.log('[IMAGE GEN DEBUG] Original prompt:', prompt)
      console.log('[IMAGE GEN DEBUG] Final prompt being sent:', finalPrompt)
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          model: apiModel,
          ratio: imageRatio,
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
        // Set as original since this is the first generated image
        const cacheBustUrl = `${data.url}${data.url.includes('?') ? '&' : '?'}_t=${Date.now()}`
        setImageUrl(cacheBustUrl)
        setOriginalImageUrl(cacheBustUrl)
        setImageHistory([{ url: cacheBustUrl, label: 'Original', timestamp: Date.now() }])
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

  // Drag and drop handlers for image upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      
      if (file.type.startsWith('image/')) {
        setSelectedImage(file)
        const reader = new FileReader()
        reader.onload = (e) => {
          const imageData = e.target?.result as string
          setImagePreview(imageData)
        }
        reader.readAsDataURL(file)
        setError(null)
        setImageAnalysisResult(null)
      } else {
        setError('Please drop a valid image file (JPG, PNG, GIF, etc.)')
      }
    }
  }

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setImagePreview(imageData)
      }
      reader.readAsDataURL(file)
      setError(null)
      setImageAnalysisResult(null)
    } else {
      setError('Please select a valid image file')
    }
  }

  const clearSelectedImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setImageAnalysisResult(null)
    setUseImageAsReference(false)
    setStoredImageReference(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Analyze image with AI vision model
  const handleAnalyzeImage = async () => {
    if (!selectedImage || !imagePreview) {
      setError('Please upload an image first')
      return
    }

    if (!user) {
      setError('Please log in to analyze images')
      return
    }

    try {
      setIsAnalyzingImage(true)
      setError(null)
      setImageAnalysisResult(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Use BLIP model for image analysis (it's free)
      const analysisPrompt = prompt.trim() || 'Please describe this image in detail. What do you see? What are the key elements, colors, composition, and overall mood or theme?'
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt: analysisPrompt,
          mode: 'blip', // Use BLIP vision model
          temperature: 0.7,
          max_tokens: 500,
          response_style: 'detailed',
          image: imagePreview
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze image')
      }

      const data = await response.json()
      const analysis = data.output || data.response || 'Analysis completed'
      // Remove [BLIP Analysis] prefix if present
      const cleanAnalysis = analysis.replace(/^\[BLIP Analysis\]\s*/i, '').trim()
      setImageAnalysisResult(cleanAnalysis)
      // Reset reference when new analysis is done (user needs to click button again)
      setUseImageAsReference(false)
      setStoredImageReference(null)

      // Refresh credits
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    } catch (error: any) {
      console.error('Image analysis error:', error)
      setError(error.message || 'Failed to analyze image')
    } finally {
      setIsAnalyzingImage(false)
    }
  }

  // Handle using image as reference - just toggles the state
  const handleUseImageAsReference = () => {
    if (!selectedImage || !imagePreview) {
      setError('Please upload an image first')
      return
    }

    // If already using as reference, turn it off
    if (useImageAsReference) {
      setUseImageAsReference(false)
      setStoredImageReference(null)
      return
    }

    // If we have existing analysis, use it
    if (imageAnalysisResult) {
      const cleanAnalysis = imageAnalysisResult.replace(/\*\*/g, '').trim()
      setUseImageAsReference(true)
      setStoredImageReference(cleanAnalysis)
      return
    }

    // Otherwise, just mark it as reference (will analyze when generating)
    setUseImageAsReference(true)
    setStoredImageReference(null) // Will be set when analyzing during generation
  }

  // Download image
  const handleDownloadImage = async () => {
    if (!imageUrl) {
      setError('No image to download')
      return
    }

    try {
      // Use the server-side download endpoint to handle CORS issues
      const downloadUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`
      
      // Try iframe method first (works better on Mac)
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = downloadUrl
      document.body.appendChild(iframe)
      
      // Clean up iframe after a delay
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 5000)
      
      // Also try the blob method as backup
      try {
        const response = await fetch(downloadUrl)
        if (response.ok) {
          const blob = await response.blob()
          const blobUrl = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = blobUrl
          link.download = `infinito-image-${Date.now()}.png`
          link.style.display = 'none'
          document.body.appendChild(link)
          link.click()
          setTimeout(() => {
            document.body.removeChild(link)
            window.URL.revokeObjectURL(blobUrl)
          }, 100)
        }
      } catch (blobError) {
        // Iframe method should still work
        console.log('Blob download method failed, using iframe method')
      }
    } catch (error: any) {
      console.error('Download error:', error)
      setError('Failed to download image. Please try right-clicking the image and selecting "Save Image As".')
    }
  }

  // Save image to library
  const handleSaveImage = async () => {
    if (!imageUrl) {
      setSaveError('No image to save')
      return
    }

    const promptToSave = prompt || enhancedPrompt || 'Image generation'
    if (!promptToSave.trim()) {
      setSaveError('Cannot save: Please provide a prompt')
      return
    }

    setIsSaving(true)
    setSaveStatus('saving')
    setSaveError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Please log in to save images')
      }

      // Get the image URL - use cropped version if crop is enabled and area is selected
      let imageToSave = imageUrl
      if (enableCrop && cropArea) {
        const croppedImageUrl = await getCroppedImage()
        if (croppedImageUrl) {
          imageToSave = croppedImageUrl
        }
      }

      // Map frontend model names to API model names for saving
      const modelMapping: Record<string, string> = {
        'dalle_image': 'dall-e-3',
        'gpt-image-1': 'gpt-image-1',
        'gen4_image': 'gen4_image',
        'gen4_image_turbo': 'gen4_image_turbo',
        'gemini_2.5_flash': 'gemini_2.5_flash',
        'runway_image': 'runway_image'
      }
      const apiModel = modelMapping[selectedImageModel] || selectedImageModel

      // If it's a blob URL, we need to convert it to a data URL or upload it first
      let finalImageUrl = imageToSave
      if (imageToSave.startsWith('blob:')) {
        // Convert blob URL to data URL
        const response = await fetch(imageToSave)
        const blob = await response.blob()
        finalImageUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
      }

      const response = await fetch('/api/generations/save-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          mediaUrl: finalImageUrl,
          mediaType: 'image',
          prompt: promptToSave,
          model: apiModel
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save image')
      }

      setSaveStatus('saved')
      console.log('Image saved successfully:', data)
      
      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)

    } catch (error: any) {
      console.error('Save image error:', error)
      setSaveStatus('error')
      setSaveError(error.message || 'Failed to save image')
      
      // Reset to idle after 5 seconds
      setTimeout(() => {
        setSaveStatus('idle')
        setSaveError(null)
      }, 5000)
    } finally {
      setIsSaving(false)
    }
  }

  // Debug: Monitor imageUrl changes
  useEffect(() => {
    console.log('[INPAINT DEBUG] imageUrl state changed:', imageUrl)
    if (imageUrl) {
      console.log('[INPAINT DEBUG] imageUrl length:', imageUrl.length, 'starts with:', imageUrl.substring(0, 50))
    }
  }, [imageUrl])

  // Canvas setup for inpainting mask - only run when entering inpainting mode
  useEffect(() => {
    // Only set up canvas when entering inpainting mode (showInpainting becomes true)
    // Don't re-run when imageUrl changes while in inpainting mode
    if (!showInpainting || !imageUrl) {
      console.log('[INPAINT DEBUG] Canvas setup skipped - showInpainting:', showInpainting, 'hasImageUrl:', !!imageUrl)
      return
    }
    
    console.log('[INPAINT DEBUG] Canvas setup triggered, showInpainting:', showInpainting, 'imageUrl:', imageUrl.substring(0, 100))
    // Store current imageUrl to prevent stale closure issues
    const currentImageUrl = imageUrl
    
    // Small delay to ensure canvas refs are set
    const timeoutId = setTimeout(() => {
      // Double-check we're still in inpainting mode before proceeding
      if (!showInpainting) {
        console.log('[INPAINT DEBUG] Canvas setup cancelled - inpainting mode closed')
        return
      }
      
      if (!imageCanvasRef.current || !maskCanvasRef.current) {
        console.log('[INPAINT DEBUG] Canvas refs not ready')
        return
      }
      
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      // Use proxy route for external images to avoid CORS issues
      const loadImage = async () => {
        try {
          // Check if it's an external URL (not a data URL or blob URL)
          const isExternalUrl = currentImageUrl.startsWith('http://') || currentImageUrl.startsWith('https://')
          
          if (isExternalUrl) {
            // Use our proxy API to load the image with CORS headers
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(currentImageUrl)}`
            img.src = proxyUrl
          } else {
            // Data URLs or blob URLs don't need proxying
            img.src = currentImageUrl
          }
        } catch (error) {
          console.error('[INPAINT DEBUG] Error setting up image source:', error)
          setError('Failed to load image for inpainting. Please try again.')
        }
      }
      
      img.onload = () => {
          // Keep the same size as displayed (max 800px height to match image display)
          const maxHeight = 800
          let width = img.width
          let height = img.height
          
          // Scale down if needed
          if (height > maxHeight) {
            const scale = maxHeight / height
            width = img.width * scale
            height = maxHeight
          }
          
          // Set both canvases to same size - use displayed size for canvas dimensions
          // but keep internal resolution at image resolution for quality
          if (imageCanvasRef.current) {
            imageCanvasRef.current.width = img.width
            imageCanvasRef.current.height = img.height
            // Set display size
            imageCanvasRef.current.style.width = `${width}px`
            imageCanvasRef.current.style.height = `${height}px`
            imageCanvasRef.current.style.maxWidth = '100%'
            imageCanvasRef.current.style.maxHeight = '800px'
          }
          if (maskCanvasRef.current) {
            maskCanvasRef.current.width = img.width
            maskCanvasRef.current.height = img.height
            // Set display size to match image canvas
            maskCanvasRef.current.style.width = `${width}px`
            maskCanvasRef.current.style.height = `${height}px`
            maskCanvasRef.current.style.maxWidth = '100%'
            maskCanvasRef.current.style.maxHeight = '800px'
            // Position absolutely over image canvas
            maskCanvasRef.current.style.position = 'absolute'
            maskCanvasRef.current.style.top = '0'
            maskCanvasRef.current.style.left = '0'
          }
          
          // Draw the actual image on the background canvas
          const imgCtx = imageCanvasRef.current.getContext('2d')
          if (imgCtx) {
            imgCtx.drawImage(img, 0, 0, img.width, img.height)
          }
          
          // Initialize mask canvas - start with fully white (white = keep, black = edit)
          const maskCtx = maskCanvasRef.current.getContext('2d')
          if (maskCtx) {
            // Fill entire canvas with white (transparent white won't work - need solid white)
            maskCtx.fillStyle = 'white'
            maskCtx.fillRect(0, 0, img.width, img.height)
            console.log('[INPAINT DEBUG] Mask canvas initialized with white background (all areas will be kept)')
          }
        }
        img.onerror = (error) => {
          console.error('[INPAINT DEBUG] Failed to load image for inpainting:', error)
          console.error('[INPAINT DEBUG] Failed URL was:', currentImageUrl)
          setError('Failed to load image. Please ensure the image URL is accessible.')
        }
        
        loadImage()
      }, 100)
      
      // Cleanup function to clear timeout if component unmounts or state changes
      return () => {
        clearTimeout(timeoutId)
      }
    // Only depend on showInpainting - when it becomes true, set up canvas with current imageUrl
    // Don't re-run when imageUrl changes during inpainting mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInpainting])

  // Handle mask drawing
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskCanvasRef.current) return
    setIsDrawing(true)
    const rect = maskCanvasRef.current.getBoundingClientRect()
    const ctx = maskCanvasRef.current.getContext('2d')
    if (!ctx) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Scale coordinates to match actual canvas size
    const scaleX = maskCanvasRef.current.width / rect.width
    const scaleY = maskCanvasRef.current.height / rect.height
    const canvasX = x * scaleX
    const canvasY = y * scaleY
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)' // Black with some transparency so image shows through
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !maskCanvasRef.current) return
    const rect = maskCanvasRef.current.getBoundingClientRect()
    const ctx = maskCanvasRef.current.getContext('2d')
    if (!ctx) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Scale coordinates to match actual canvas size
    const scaleX = maskCanvasRef.current.width / rect.width
    const scaleY = maskCanvasRef.current.height / rect.height
    const canvasX = x * scaleX
    const canvasY = y * scaleY
    
    // Draw with fully opaque black for better mask detection
    ctx.fillStyle = 'rgba(0, 0, 0, 1)' // Fully opaque black for clear mask
    ctx.beginPath()
    ctx.arc(canvasX, canvasY, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
  }

  const handleCanvasMouseUp = () => {
    setIsDrawing(false)
  }

  const clearMask = () => {
    if (!maskCanvasRef.current) return
    const ctx = maskCanvasRef.current.getContext('2d')
    if (!ctx) return
    // Clear mask - reset to white (keep everything)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height)
    console.log('[INPAINT DEBUG] Mask cleared - reset to white')
  }

  // Handle inpainting
  const handleInpaint = async () => {
    console.log('[INPAINT DEBUG] Starting inpainting process...')
    console.log('[INPAINT DEBUG] Current imageUrl:', imageUrl)
    console.log('[INPAINT DEBUG] Has maskCanvas:', !!maskCanvasRef.current)
    console.log('[INPAINT DEBUG] Inpainting prompt:', inpaintingPrompt)
    
    if (!imageUrl || !maskCanvasRef.current || !inpaintingPrompt.trim()) {
      console.error('[INPAINT DEBUG] Validation failed:', {
        hasImageUrl: !!imageUrl,
        hasMaskCanvas: !!maskCanvasRef.current,
        hasPrompt: !!inpaintingPrompt.trim()
      })
      setError('Please draw a mask and enter an inpainting prompt')
      return
    }

    if (!user) {
      console.error('[INPAINT DEBUG] No user logged in')
      setError('Please log in to use inpainting')
      return
    }

    // Store original image URL before processing
    const originalImageUrl = imageUrl
    console.log('[INPAINT DEBUG] Stored original imageUrl:', originalImageUrl)

    try {
      setIsInpainting(true)
      setError(null)
      setInpaintingProgress('Preparing inpainting...')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }
      console.log('[INPAINT DEBUG] Session obtained')

      // Check credits (inpainting costs 15 credits)
      const requiredCredits = 15
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
      console.log('[INPAINT DEBUG] Credit check result:', creditData)
      if (!creditData.success) {
        console.error('[INPAINT DEBUG] Credit check failed:', creditData)
        setError(creditData.message || `Insufficient credits. Inpainting costs ${requiredCredits} credits.`)
        setIsInpainting(false)
        return
      }

      if (creditData.credits !== undefined) {
        setUserCredits(creditData.credits)
        console.log('[INPAINT DEBUG] Credits updated:', creditData.credits)
      }

      // Get mask as data URL - invert colors for OpenAI API (white = keep, black = edit)
      if (!maskCanvasRef.current) {
        throw new Error('Mask canvas not initialized')
      }
      
      console.log('[INPAINT DEBUG] Creating mask canvas:', {
        width: maskCanvasRef.current.width,
        height: maskCanvasRef.current.height
      })
      
      // Create a temporary canvas to create the proper mask format
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = maskCanvasRef.current.width
      tempCanvas.height = maskCanvasRef.current.height
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) throw new Error('Failed to create temp canvas context')
      
      // First, fill with white background (keep everything)
      tempCtx.fillStyle = 'white'
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
      
      // Then draw the mask canvas on top (user's black drawings)
      tempCtx.drawImage(maskCanvasRef.current, 0, 0)
      console.log('[INPAINT DEBUG] Mask drawn to temp canvas with white background')
      
      // Get image data and process for OpenAI (white = keep, black = edit)
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
      const pixelData = imageData.data
      console.log('[INPAINT DEBUG] Processing pixel data, length:', pixelData.length)
      
      let darkPixels = 0
      let totalPixels = 0
      let whitePixels = 0
      let transparentPixels = 0
      
      // Sample pixels from different areas for debugging
      const samplePixels: Array<{ r: number, g: number, b: number, a: number, index: number, isDrawn?: boolean }> = []
      const sampleIndices = [
        0, // Top-left corner (should be white)
        Math.floor(pixelData.length / 8), // Top-middle
        Math.floor(pixelData.length / 4), // Left-middle
        Math.floor(pixelData.length / 2), // Center
        Math.floor(pixelData.length * 3 / 4), // Right-middle
        Math.floor(pixelData.length * 7 / 8) // Bottom-right
      ]
      
      for (let i = 0; i < pixelData.length; i += 4) {
        totalPixels++
        const r = pixelData[i]
        const g = pixelData[i + 1]
        const b = pixelData[i + 2]
        const a = pixelData[i + 3]
        const avg = (r + g + b) / 3
        
        // Sample pixels at specific indices for debugging
        const pixelIndex = i / 4
        if (sampleIndices.includes(pixelIndex)) {
          samplePixels.push({ r, g, b, a, index: pixelIndex })
        }
        
        // Check if this is a drawn pixel - user draws black on white canvas
        // White pixels (255,255,255) = keep (should be white in mask)
        // Black pixels (avg < 100) = edit (should be black in mask)
        // We start with white canvas, user draws black, so we look for very dark pixels
        const isDrawn = avg < 50 // Very dark (black) - strict threshold
        
        if (isDrawn) {
          darkPixels++
          // Dark/drawn area - make it black (area to edit)
          pixelData[i] = 0      // R
          pixelData[i + 1] = 0  // G
          pixelData[i + 2] = 0  // B
          pixelData[i + 3] = 255 // A - fully opaque
          
          // Mark in sample if this was drawn
          const existingSample = samplePixels.find(s => s.index === pixelIndex)
          if (existingSample) {
            existingSample.isDrawn = true
          }
        } else {
          if (avg > 200 && a > 200) whitePixels++
          if (a < 50) transparentPixels++
          
          // Light/transparent area - make it white (area to keep)
          pixelData[i] = 255     // R
          pixelData[i + 1] = 255 // G
          pixelData[i + 2] = 255 // B
          pixelData[i + 3] = 255 // A - fully opaque
        }
      }
      
      const maskPercentage = (darkPixels / totalPixels) * 100
      console.log('[INPAINT DEBUG] Mask analysis:', {
        darkPixels,
        totalPixels,
        whitePixels,
        transparentPixels,
        maskPercentage: `${maskPercentage.toFixed(2)}%`,
        hasMaskContent: darkPixels > 0,
        threshold: 'avg < 50',
        samplePixels: samplePixels.map(p => ({
          ...p,
          avg: ((p.r + p.g + p.b) / 3).toFixed(1),
          detected: p.isDrawn ? 'DRAWN' : 'KEEP'
        }))
      })
      
      if (darkPixels === 0) {
        throw new Error('No mask drawn! Please draw on the image to mark areas to inpaint.')
      }
      
      if (maskPercentage > 95) {
        console.warn('[INPAINT DEBUG] WARNING: Mask covers 95%+ of image. This might be a detection issue.')
        throw new Error('Mask appears to cover the entire image. Please clear the mask and draw only on the areas you want to change.')
      }
      
      if (maskPercentage < 0.1) {
        console.warn('[INPAINT DEBUG] Very small mask detected:', maskPercentage, '%. Proceeding anyway...')
      }
      
      console.log('[INPAINT DEBUG] Mask processed successfully. Areas to edit:', maskPercentage.toFixed(2), '%')
      
      tempCtx.putImageData(imageData, 0, 0)
      const maskDataUrl = tempCanvas.toDataURL('image/png')
      console.log('[INPAINT DEBUG] Mask data URL created, length:', maskDataUrl.length)
      console.log('[INPAINT DEBUG] Image URL being sent:', imageUrl)
      console.log('[INPAINT DEBUG] Prompt being sent:', inpaintingPrompt)
      console.log('[INPAINT DEBUG] Model being used:', selectedInpaintModel)

      setInpaintingProgress('Sending to inpainting API...')

      const requestBody = {
        imageUrl: imageUrl,
        maskDataUrl: maskDataUrl,
        prompt: inpaintingPrompt,
        model: selectedInpaintModel
      }
      console.log('[INPAINT DEBUG] Request body prepared:', {
        imageUrl: requestBody.imageUrl,
        maskDataUrlLength: requestBody.maskDataUrl.length,
        prompt: requestBody.prompt,
        model: requestBody.model
      })

      const response = await fetch('/api/inpaint-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestBody)
      })

      console.log('[INPAINT DEBUG] API response status:', response.status, response.statusText)
      const data = await response.json()
      console.log('[INPAINT DEBUG] API response data:', {
        success: data.success,
        hasUrl: !!data.url,
        url: data.url,
        error: data.error,
        refunded: data.refunded
      })

      if (!response.ok) {
        console.error('[INPAINT DEBUG] API returned error:', data)
        if (data.refunded && data.newBalance !== undefined) {
          console.log('[INPAINT DEBUG] Credits refunded, new balance:', data.newBalance)
          setUserCredits(data.newBalance)
        }
        throw new Error(data.error || 'Inpainting failed')
      }

      if (data.success && data.url) {
        console.log('[INPAINT DEBUG] Inpainting successful!')
        console.log('[INPAINT DEBUG] Old imageUrl:', imageUrl)
        console.log('[INPAINT DEBUG] New imageUrl:', data.url)
        console.log('[INPAINT DEBUG] Setting new image URL and closing inpainting mode...')
        
        // Update image URL with the new inpainted image FIRST
        // Add cache-busting parameter to force browser to reload
        const cacheBustUrl = `${data.url}${data.url.includes('?') ? '&' : '?'}_t=${Date.now()}`
        console.log('[INPAINT DEBUG] imageUrl state update called with:', cacheBustUrl)
        console.log('[INPAINT DEBUG] Current imageUrl before update:', imageUrl)
        
        // Preserve original if this is the first edit
        if (!originalImageUrl) {
          setOriginalImageUrl(imageUrl)
          setImageHistory([{ url: imageUrl || '', label: 'Original', timestamp: Date.now() - 1 }])
        }
        
        // Add new version to history
        const newVersion = { url: cacheBustUrl, label: `Edit ${imageHistory.length + 1}`, timestamp: Date.now() }
        setImageHistory(prev => [...prev, newVersion])
        
        // Force update the image URL with cache-busting
        setImageUrl(cacheBustUrl)
        
        // Use a callback to verify the state update
        setTimeout(() => {
          console.log('[INPAINT DEBUG] Verifying imageUrl update after 50ms...')
          // This will log in the useEffect that monitors imageUrl changes
        }, 50)
        
        // Wait a moment for state to update, then close inpainting mode
        // This ensures the imageUrl state is set before showInpainting changes
        setTimeout(() => {
          console.log('[INPAINT DEBUG] Closing inpainting mode after state update...')
          // Close inpainting mode
          setShowInpainting(false)
          console.log('[INPAINT DEBUG] showInpainting set to false')
          
          // Clear inpainting prompt
          setInpaintingPrompt("")
          console.log('[INPAINT DEBUG] inpaintingPrompt cleared')
          
          setInpaintingProgress('Inpainting completed!')
          console.log('[INPAINT DEBUG] Inpainting progress set to completed')
        }, 200)
        
        // Refresh credits
        if (user?.id) {
          setTimeout(() => fetchUserCredits(user.id), 500)
        }
        
        console.log('[INPAINT DEBUG] State update initiated, will close inpainting mode shortly')
      } else {
        console.error('[INPAINT DEBUG] No image URL in response:', data)
        throw new Error('No image URL returned from inpainting')
      }

    } catch (error: any) {
      console.error('[INPAINT DEBUG] Inpainting error caught:', error)
      console.error('[INPAINT DEBUG] Error message:', error.message)
      console.error('[INPAINT DEBUG] Error stack:', error.stack)
      console.error('[INPAINT DEBUG] Current imageUrl at error:', imageUrl)
      setError(error.message || 'Failed to inpaint image')
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    } finally {
      console.log('[INPAINT DEBUG] Finally block - resetting inpainting state')
      setIsInpainting(false)
      setInpaintingProgress('')
      console.log('[INPAINT DEBUG] Final imageUrl state:', imageUrl)
    }
  }

  // Crop canvas setup - only initialize default crop area, don't reset canvas size
  useEffect(() => {
    console.log('[CROP TOGGLE] showCrop changed:', {
      showCrop,
      hasImageUrl: !!imageUrl,
      hasImageRef: !!cropImageRef.current,
      imageComplete: cropImageRef.current?.complete
    })
    
    if (!showCrop || !imageUrl || !cropImageRef.current) {
      if (!showCrop) {
        console.log('[CROP TOGGLE] Crop disabled, clearing state')
      }
      return
    }

    const img = cropImageRef.current
    if (img && img.complete && img.offsetWidth > 0 && img.offsetHeight > 0) {
      // Initialize crop area with default values (centered, 80% of image size) if not set
      // Only initialize once when crop is first enabled
      if (cropInputValues.width === 0 && cropInputValues.height === 0 && !cropArea) {
        const defaultWidth = Math.floor(img.offsetWidth * 0.8)
        const defaultHeight = Math.floor(img.offsetHeight * 0.8)
        const defaultX = Math.floor((img.offsetWidth - defaultWidth) / 2)
        const defaultY = Math.floor((img.offsetHeight - defaultHeight) / 2)
        
        const defaultArea = {
          x: defaultX,
          y: defaultY,
          width: defaultWidth,
          height: defaultHeight
        }
        console.log('[CROP INIT] ========== INITIALIZING CROP ==========')
        console.log('[CROP INIT] Image dimensions:', {
          offsetWidth: img.offsetWidth,
          offsetHeight: img.offsetHeight,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          getBoundingClientRect: img.getBoundingClientRect()
        })
        console.log('[CROP INIT] Default crop area:', defaultArea)
        const cropCenterX = defaultArea.x + defaultArea.width / 2
        const cropCenterY = defaultArea.y + defaultArea.height / 2
        console.log('[CROP INIT] Crop center:', {
          x: cropCenterX,
          y: cropCenterY
        })
        const imgCenterX = img.offsetWidth / 2
        const imgCenterY = img.offsetHeight / 2
        console.log('[CROP INIT] Image center (before transform):', {
          x: imgCenterX,
          y: imgCenterY
        })
        
        // Keep image visually in place when crop is enabled
        // Image is displayed at (0, 0) when crop is off, so keep it at (0, 0) when crop is enabled
        // This ensures the image doesn't move when crop is turned on
        console.log('[CROP INIT] Keeping image at pan (0, 0) to maintain visual position')
        
        isInitialCropSetupRef.current = true
        setCropInputValues(defaultArea)
        setCropArea(defaultArea)
        // Keep pan at (0, 0) to maintain visual position, zoom at 1.0
        setCropPan({ x: 0, y: 0 })
        setCropZoom(1.0)
        console.log('[CROP INIT] ========== INITIALIZATION COMPLETE ==========')
        // Reset flag after a short delay to allow state to update
        setTimeout(() => {
          isInitialCropSetupRef.current = false
          console.log('[CROP INIT] Initial setup flag cleared')
        }, 200)
      }
    }
  }, [showCrop, imageUrl])

  // Draw crop selection overlay
  useEffect(() => {
    if (!showCrop || !cropCanvasRef.current) return

    const canvas = cropCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Update canvas size - use crop area size if larger than image, otherwise use image size
    const img = cropImageRef.current
    let canvasWidth = 0
    let canvasHeight = 0
    
    if (img && img.complete) {
      const imgWidth = img.offsetWidth
      const imgHeight = img.offsetHeight
      
      if (cropArea) {
        // Canvas should be at least as large as the crop area
        canvasWidth = Math.max(imgWidth, cropArea.x + cropArea.width)
        canvasHeight = Math.max(imgHeight, cropArea.y + cropArea.height)
        console.log('[CROP DEBUG] Canvas size calculation:', {
          imgWidth,
          imgHeight,
          cropArea,
          calculatedWidth: canvasWidth,
          calculatedHeight: canvasHeight,
          currentCanvasSize: { width: canvas.width, height: canvas.height }
        })
        
        // Only update canvas size if it needs to be larger
        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
          console.log('[CROP DEBUG] Updating canvas size from', canvas.width, 'x', canvas.height, 'to', canvasWidth, 'x', canvasHeight)
          canvas.width = canvasWidth
          canvas.height = canvasHeight
        }
      } else {
        // No crop area yet, use image size
        if (canvas.width !== imgWidth || canvas.height !== imgHeight) {
          canvasWidth = imgWidth
          canvasHeight = imgHeight
          console.log('[CROP DEBUG] Setting canvas to image size:', canvasWidth, 'x', canvasHeight)
          canvas.width = canvasWidth
          canvas.height = canvasHeight
        }
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const area = cropArea || (cropStart && cropEnd ? {
      x: Math.min(cropStart.x, cropEnd.x),
      y: Math.min(cropStart.y, cropEnd.y),
      width: Math.abs(cropEnd.x - cropStart.x),
      height: Math.abs(cropEnd.y - cropStart.y)
    } : null)

    if (area && area.width > 0 && area.height > 0) {
      const { x, y, width, height } = area
      console.log('[CROP DEBUG] Drawing crop area:', { x, y, width, height, canvasSize: { width: canvas.width, height: canvas.height } })

      // Draw dark overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Clear the crop area
      ctx.clearRect(x, y, width, height)

      // Draw crop border
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(x, y, width, height)
      ctx.setLineDash([])

      // Draw corner handles
      const handleSize = 12
      ctx.fillStyle = '#10b981'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      
      // Top-left
      ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize)
      ctx.strokeRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize)
      // Top-right
      ctx.fillRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize)
      ctx.strokeRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize)
      // Bottom-left
      ctx.fillRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize)
      ctx.strokeRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize)
      // Bottom-right
      ctx.fillRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize)
      ctx.strokeRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize)
    }
  }, [showCrop, cropStart, cropEnd, cropArea])

  // Get which handle is being clicked
  const getHandleAt = (x: number, y: number, area: { x: number; y: number; width: number; height: number }): string | null => {
    const handleSize = 12
    const tolerance = handleSize / 2 + 5
    
    // Top-left
    if (Math.abs(x - area.x) < tolerance && Math.abs(y - area.y) < tolerance) return 'tl'
    // Top-right
    if (Math.abs(x - (area.x + area.width)) < tolerance && Math.abs(y - area.y) < tolerance) return 'tr'
    // Bottom-left
    if (Math.abs(x - area.x) < tolerance && Math.abs(y - (area.y + area.height)) < tolerance) return 'bl'
    // Bottom-right
    if (Math.abs(x - (area.x + area.width)) < tolerance && Math.abs(y - (area.y + area.height)) < tolerance) return 'br'
    
    // Check if inside crop area (for moving)
    if (x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height) {
      return 'move'
    }
    
    return null
  }

  // Crop selection handlers
  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropCanvasRef.current) return
    const rect = cropCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicking on existing crop area to resize
    if (cropArea) {
      const handle = getHandleAt(x, y, cropArea)
      if (handle) {
        if (handle === 'move') {
          // Start moving the crop area
          setResizeStart({ x, y, cropX: cropArea.x, cropY: cropArea.y, cropWidth: cropArea.width, cropHeight: cropArea.height })
          setIsResizing(true)
          setResizeHandle('move')
        } else {
          // Start resizing from a corner
          setResizeStart({ x, y, cropX: cropArea.x, cropY: cropArea.y, cropWidth: cropArea.width, cropHeight: cropArea.height })
          setIsResizing(true)
          setResizeHandle(handle)
        }
        return
      }
    }

    // Start new selection
    setCropStart({ x, y })
    setCropEnd({ x, y })
    setIsCropSelecting(true)
    setCropArea(null)
  }

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropCanvasRef.current) return
    const rect = cropCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Update cursor based on hover position
    if (!isResizing && !isCropSelecting && cropArea) {
      const handle = getHandleAt(x, y, cropArea)
      if (handle === 'move') {
        cropCanvasRef.current.style.cursor = 'move'
      } else if (handle === 'tl' || handle === 'br') {
        cropCanvasRef.current.style.cursor = 'nwse-resize'
      } else if (handle === 'tr' || handle === 'bl') {
        cropCanvasRef.current.style.cursor = 'nesw-resize'
      } else {
        cropCanvasRef.current.style.cursor = 'crosshair'
      }
    } else if (!isResizing && !isCropSelecting) {
      cropCanvasRef.current.style.cursor = 'crosshair'
    }

    if (isResizing && resizeStart && resizeHandle && cropArea) {
      const deltaX = x - resizeStart.x
      const deltaY = y - resizeStart.y
      let newArea = { ...cropArea }

      switch (resizeHandle) {
        case 'tl': // Top-left
          newArea.x = Math.max(0, Math.min(resizeStart.cropX + deltaX, resizeStart.cropX + resizeStart.cropWidth - 10))
          newArea.y = Math.max(0, Math.min(resizeStart.cropY + deltaY, resizeStart.cropY + resizeStart.cropHeight - 10))
          newArea.width = resizeStart.cropX + resizeStart.cropWidth - newArea.x
          newArea.height = resizeStart.cropY + resizeStart.cropHeight - newArea.y
          break
        case 'tr': // Top-right
          newArea.y = Math.max(0, Math.min(resizeStart.cropY + deltaY, resizeStart.cropY + resizeStart.cropHeight - 10))
          newArea.width = Math.max(10, resizeStart.cropWidth + deltaX)
          newArea.height = resizeStart.cropY + resizeStart.cropHeight - newArea.y
          break
        case 'bl': // Bottom-left
          newArea.x = Math.max(0, Math.min(resizeStart.cropX + deltaX, resizeStart.cropX + resizeStart.cropWidth - 10))
          newArea.width = resizeStart.cropX + resizeStart.cropWidth - newArea.x
          newArea.height = Math.max(10, resizeStart.cropHeight + deltaY)
          break
        case 'br': // Bottom-right
          newArea.width = Math.max(10, resizeStart.cropWidth + deltaX)
          newArea.height = Math.max(10, resizeStart.cropHeight + deltaY)
          break
        case 'move': // Move entire area
          newArea.x = Math.max(0, Math.min(resizeStart.cropX + deltaX, rect.width - resizeStart.cropWidth))
          newArea.y = Math.max(0, Math.min(resizeStart.cropY + deltaY, rect.height - resizeStart.cropHeight))
          break
      }

      // Constrain to canvas bounds
      if (newArea.x < 0) {
        newArea.width += newArea.x
        newArea.x = 0
      }
      if (newArea.y < 0) {
        newArea.height += newArea.y
        newArea.y = 0
      }
      if (newArea.x + newArea.width > rect.width) {
        newArea.width = rect.width - newArea.x
      }
      if (newArea.y + newArea.height > rect.height) {
        newArea.height = rect.height - newArea.y
      }

      if (newArea.width > 10 && newArea.height > 10) {
        setCropArea(newArea)
        setCropInputValues(newArea)
      }
    } else if (isCropSelecting && cropStart) {
      setCropEnd({ x, y })
    }
  }

  const handleCropMouseUp = () => {
    if (isCropSelecting && cropStart && cropEnd) {
      const x = Math.min(cropStart.x, cropEnd.x)
      const y = Math.min(cropStart.y, cropEnd.y)
      const width = Math.abs(cropEnd.x - cropStart.x)
      const height = Math.abs(cropEnd.y - cropStart.y)

      if (width > 10 && height > 10) {
        const newArea = { x, y, width, height }
        setCropArea(newArea)
        setCropInputValues(newArea)
      }
    }
    
    setIsCropSelecting(false)
    setIsResizing(false)
    setResizeHandle(null)
    setResizeStart(null)
  }

  // Extract cropped image with zoom/pan support
  const getCroppedImage = async (): Promise<string | null> => {
    console.log('[CROP DEBUG] getCroppedImage called')
    console.log('[CROP DEBUG] imageUrl:', imageUrl)
    console.log('[CROP DEBUG] cropArea:', cropArea)
    console.log('[CROP DEBUG] originalImageSize:', originalImageSize)
    console.log('[CROP DEBUG] cropZoom:', cropZoom)
    console.log('[CROP DEBUG] cropPan:', cropPan)
    
    if (!imageUrl || !cropArea || !cropImageRef.current || !originalImageSize) {
      console.log('[CROP DEBUG] Missing required data, returning original imageUrl')
      return imageUrl
    }

    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      const currentImageUrl = imageUrl
      const isExternalUrl = currentImageUrl.startsWith('http://') || currentImageUrl.startsWith('https://')
      
      if (isExternalUrl) {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(currentImageUrl)}`
        img.src = proxyUrl
      } else {
        img.src = currentImageUrl
      }

      img.onload = () => {
        console.log('[CROP DEBUG] Image loaded, natural size:', img.width, 'x', img.height)
        
        const displayedImg = cropImageRef.current
        if (!displayedImg) {
          console.log('[CROP DEBUG] No displayed image ref')
          resolve(imageUrl)
          return
        }

        // Get displayed image dimensions
        const displayedWidth = displayedImg.offsetWidth
        const displayedHeight = displayedImg.offsetHeight
        console.log('[CROP DEBUG] Displayed size:', displayedWidth, 'x', displayedHeight)
        
        // Calculate scale from displayed to original
        const displayToOriginalScaleX = originalImageSize.width / displayedWidth
        const displayToOriginalScaleY = originalImageSize.height / displayedHeight
        console.log('[CROP DEBUG] Scale factors:', { displayToOriginalScaleX, displayToOriginalScaleY })
        
        // Calculate source coordinates accounting for zoom/pan
        const sourceX = (cropArea.x - cropPan.x) / cropZoom
        const sourceY = (cropArea.y - cropPan.y) / cropZoom
        const sourceWidth = cropArea.width / cropZoom
        const sourceHeight = cropArea.height / cropZoom
        console.log('[CROP DEBUG] Source coordinates (displayed space):', { sourceX, sourceY, sourceWidth, sourceHeight })
        
        // Convert to original image coordinates
        const actualX = sourceX * displayToOriginalScaleX
        const actualY = sourceY * displayToOriginalScaleY
        const actualWidth = sourceWidth * displayToOriginalScaleX
        const actualHeight = sourceHeight * displayToOriginalScaleY
        console.log('[CROP DEBUG] Actual coordinates (original image):', { actualX, actualY, actualWidth, actualHeight })
        
        // Ensure we don't go outside image bounds
        const clampedX = Math.max(0, Math.min(actualX, img.width - 1))
        const clampedY = Math.max(0, Math.min(actualY, img.height - 1))
        const clampedWidth = Math.min(actualWidth, img.width - clampedX)
        const clampedHeight = Math.min(actualHeight, img.height - clampedY)
        console.log('[CROP DEBUG] Clamped coordinates:', { clampedX, clampedY, clampedWidth, clampedHeight })

        // Create new canvas for cropped image at the requested crop size
        const cropCanvas = document.createElement('canvas')
        cropCanvas.width = cropArea.width  // Use crop area size (e.g., 1600x1600)
        cropCanvas.height = cropArea.height
        console.log('[CROP DEBUG] Crop canvas size:', cropCanvas.width, 'x', cropCanvas.height)
        const ctx = cropCanvas.getContext('2d')
        
        if (ctx) {
          // Draw the source area from original image, scaled to fit crop canvas
          ctx.drawImage(
            img,
            clampedX, clampedY, clampedWidth, clampedHeight,
            0, 0, cropArea.width, cropArea.height
          )
          console.log('[CROP DEBUG] Image drawn to canvas')
          
          // Convert to blob URL
          cropCanvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              console.log('[CROP DEBUG] Cropped image created, blob size:', blob.size)
              resolve(url)
            } else {
              console.log('[CROP DEBUG] Failed to create blob')
              resolve(imageUrl)
            }
          }, 'image/png')
        } else {
          console.log('[CROP DEBUG] Failed to get canvas context')
          resolve(imageUrl)
        }
      }

      img.onerror = (error) => {
        console.error('[CROP DEBUG] Image load error:', error)
        resolve(imageUrl)
      }
    })
  }

  // Clear crop selection
  const clearCrop = () => {
    setCropStart(null)
    setCropEnd(null)
    setCropArea(null)
    setIsCropSelecting(false)
    setIsResizing(false)
    setResizeHandle(null)
    setResizeStart(null)
    setCropInputValues({ x: 0, y: 0, width: 0, height: 0 })
    setCropZoom(1.0)
    setCropPan({ x: 0, y: 0 })
    setIsPanning(false)
    setPanStart(null)
    isCenteringRef.current = false
    isInitialCropSetupRef.current = false
    prevCropAreaRef.current = null
  }

  // Handle pan start
  const handlePanStart = (e: React.MouseEvent) => {
    if (!cropArea) {
      console.log('[PAN START] Skipped - no crop area')
      return
    }
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const startPos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    console.log('[PAN START] Starting pan:', {
      startPos,
      currentPan: cropPan,
      currentZoom: cropZoom,
      cropArea
    })
    setPanStart(startPos)
    setIsPanning(true)
  }

  // Handle pan move
  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning || !panStart || !cropArea) return
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top
    const deltaX = currentX - panStart.x
    const deltaY = currentY - panStart.y
    const newPan = {
      x: cropPan.x + deltaX,
      y: cropPan.y + deltaY
    }
    console.log('[PAN MOVE] Panning:', {
      delta: { x: deltaX, y: deltaY },
      oldPan: cropPan,
      newPan
    })
    setCropPan(newPan)
    setPanStart({ x: currentX, y: currentY })
  }

  // Handle pan end
  const handlePanEnd = () => {
    console.log('[PAN END] Ending pan, final pan:', cropPan)
    setIsPanning(false)
    setPanStart(null)
  }

  // Helper function to center image in crop frame for a given zoom level
  const centerImageForZoom = (zoom: number) => {
    if (!cropArea || !cropImageRef.current || !cropImageRef.current.complete) {
      console.log('[ZOOM CENTER] Skipping - missing cropArea or image not ready:', {
        hasCropArea: !!cropArea,
        hasImage: !!cropImageRef.current,
        imageComplete: cropImageRef.current?.complete
      })
      return
    }
    
    const img = cropImageRef.current
    const imgWidth = img.offsetWidth
    const imgHeight = img.offsetHeight
    const cropCenterX = cropArea.x + cropArea.width / 2
    const cropCenterY = cropArea.y + cropArea.height / 2
    const imgCenterX = imgWidth / 2
    const imgCenterY = imgHeight / 2
    
    // Center the image in the crop frame: crop center - (scaled image center)
    // Since transform origin is (0, 0), we translate by: cropCenter - (imgCenter * zoom)
    const newPanX = cropCenterX - (imgCenterX * zoom)
    const newPanY = cropCenterY - (imgCenterY * zoom)
    
    // Calculate where image center will be after transform
    const finalImageCenterX = newPanX + (imgCenterX * zoom)
    const finalImageCenterY = newPanY + (imgCenterY * zoom)
    const centerOffsetX = finalImageCenterX - cropCenterX
    const centerOffsetY = finalImageCenterY - cropCenterY
    
    console.log('[ZOOM CENTER] ========== CENTERING FOR ZOOM ==========')
    console.log('[ZOOM CENTER] Zoom change:', {
      oldZoom: cropZoom,
      newZoom: zoom,
      zoomDelta: zoom - cropZoom
    })
    console.log('[ZOOM CENTER] Crop frame:', {
      area: cropArea,
      center: { x: cropCenterX, y: cropCenterY }
    })
    console.log('[ZOOM CENTER] Image dimensions:', {
      offsetWidth: imgWidth,
      offsetHeight: imgHeight,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    })
    console.log('[ZOOM CENTER] Image center (local):', {
      x: imgCenterX,
      y: imgCenterY
    })
    console.log('[ZOOM CENTER] Scaled image center:', {
      x: imgCenterX * zoom,
      y: imgCenterY * zoom
    })
    console.log('[ZOOM CENTER] Pan calculation:', {
      currentPan: { x: cropPan.x, y: cropPan.y },
      calculatedPan: { x: newPanX, y: newPanY },
      panDelta: { x: newPanX - cropPan.x, y: newPanY - cropPan.y },
      formula: `pan = cropCenter(${cropCenterX}, ${cropCenterY}) - scaledImgCenter(${imgCenterX * zoom}, ${imgCenterY * zoom})`
    })
    console.log('[ZOOM CENTER] Verification - final image center:', {
      x: finalImageCenterX,
      y: finalImageCenterY,
      cropCenter: { x: cropCenterX, y: cropCenterY },
      offset: { x: centerOffsetX, y: centerOffsetY },
      isCentered: Math.abs(centerOffsetX) < 0.1 && Math.abs(centerOffsetY) < 0.1
    })
    console.log('[ZOOM CENTER] =========================================')
    
    setCropPan({ x: newPanX, y: newPanY })
  }

  // Handle zoom with wheel - keep image centered in crop frame
  const handleWheelZoom = (e: React.WheelEvent) => {
    if (!cropArea || !cropImageRef.current) {
      console.log('[WHEEL ZOOM] Skipped - no crop area or image')
      return
    }
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05  // Smaller increments
    console.log('[WHEEL ZOOM] Wheel event:', {
      deltaY: e.deltaY,
      zoomDelta: delta,
      currentZoom: cropZoom
    })
    setCropZoom(prev => {
      const newZoom = Math.max(0.1, Math.min(5.0, prev + delta))
      console.log('[WHEEL ZOOM] Zoom changing from', prev, 'to', newZoom)
      // Center image for the new zoom level
      centerImageForZoom(newZoom)
      return newZoom
    })
  }

  // Update crop area from input values - allow any size, crop frame is independent of image
  const updateCropFromInputs = () => {
    console.log('[CROP DEBUG] updateCropFromInputs called')
    console.log('[CROP DEBUG] Input values:', cropInputValues)
    
    const { x, y, width, height } = cropInputValues
    
    // Allow any size and position - crop frame is independent of displayed image
    // Minimum 10px for width/height, but no maximum constraint
    // X and Y can be any value (even negative or beyond image bounds)
    let constrainedX = x  // Don't constrain - allow any position
    let constrainedY = y  // Don't constrain - allow any position
    const constrainedWidth = Math.max(10, width)
    const constrainedHeight = Math.max(10, height)
    
    // If crop is larger than displayed image, auto-position it at (0, 0) for visibility
    const img = cropImageRef.current
    if (img && img.complete) {
      const imgWidth = img.offsetWidth
      const imgHeight = img.offsetHeight
      
      // If crop is larger than image, position it at (0, 0) so it's visible
      if (constrainedWidth > imgWidth) {
        constrainedX = 0
      }
      if (constrainedHeight > imgHeight) {
        constrainedY = 0
      }
      
      // If crop fits within image and position is 0, center it
      if (constrainedWidth <= imgWidth && constrainedHeight <= imgHeight && constrainedX === 0 && constrainedY === 0) {
        constrainedX = Math.floor((imgWidth - constrainedWidth) / 2)
        constrainedY = Math.floor((imgHeight - constrainedHeight) / 2)
      }
    }
    
    const newArea = {
      x: constrainedX,
      y: constrainedY,
      width: constrainedWidth,
      height: constrainedHeight
    }
    
    console.log('[CROP DEBUG] New crop area:', newArea)
    console.log('[CROP DEBUG] Previous cropArea:', cropArea)
    
    setCropArea(newArea)
    setCropInputValues(newArea)
    
    // Reset zoom when crop SIZE changes significantly, image will be centered by useEffect
    if (cropArea && (Math.abs(cropArea.width - newArea.width) > 100 || Math.abs(cropArea.height - newArea.height) > 100)) {
      console.log('[CROP DEBUG] Resetting zoom due to significant crop size change')
      setCropZoom(1)
      // Pan will be recalculated by the useEffect that watches cropArea and cropZoom
    }
    
    console.log('[CROP DEBUG] Crop area updated to:', newArea)
  }

  // Update input values when crop area changes (prevent infinite loop)
  useEffect(() => {
    if (cropArea) {
      // Only update if values are actually different to prevent infinite loop
      if (cropInputValues.x !== cropArea.x || 
          cropInputValues.y !== cropArea.y || 
          cropInputValues.width !== cropArea.width || 
          cropInputValues.height !== cropArea.height) {
        console.log('[CROP DEBUG] cropArea changed, updating input values:', cropArea)
        setCropInputValues(cropArea)
      }
      
      // When crop area SIZE changes, center the image in the crop frame
      // Only adjust if width or height changed, not just position
      const sizeChanged = !prevCropAreaRef.current || 
        prevCropAreaRef.current.width !== cropArea.width || 
        prevCropAreaRef.current.height !== cropArea.height
      
      if (cropImageRef.current && cropImageRef.current.complete && !isPanning && !isCenteringRef.current && !isInitialCropSetupRef.current && sizeChanged && prevCropAreaRef.current) {
        const img = cropImageRef.current
        const imgWidth = img.offsetWidth
        const imgHeight = img.offsetHeight
        
        // Calculate the crop frame center
        const oldCropCenterX = prevCropAreaRef.current.x + prevCropAreaRef.current.width / 2
        const oldCropCenterY = prevCropAreaRef.current.y + prevCropAreaRef.current.height / 2
        const cropCenterX = cropArea.x + cropArea.width / 2
        const cropCenterY = cropArea.y + cropArea.height / 2
        
        // Image center in image-local coordinates (before transform)
        const imgCenterX = imgWidth / 2
        const imgCenterY = imgHeight / 2
        
        // Calculate where image center currently is (in container coordinates)
        const currentImageCenterX = cropPan.x + (imgCenterX * cropZoom)
        const currentImageCenterY = cropPan.y + (imgCenterY * cropZoom)
        
        // Calculate the offset from the old crop center to the current image center
        // This offset represents where the user wants the image relative to the crop center
        const offsetFromOldCenterX = currentImageCenterX - oldCropCenterX
        const offsetFromOldCenterY = currentImageCenterY - oldCropCenterY
        
        // Maintain the same visual position relative to the new crop center
        // The new image center should be at: new crop center + same offset
        const targetImageCenterX = cropCenterX + offsetFromOldCenterX
        const targetImageCenterY = cropCenterY + offsetFromOldCenterY
        
        // Calculate pan to achieve this: pan = targetImageCenter - (scaled image center)
        const newPanX = targetImageCenterX - (imgCenterX * cropZoom)
        const newPanY = targetImageCenterY - (imgCenterY * cropZoom)
        
        // Calculate where image center will be after transform
        const finalImageCenterX = newPanX + (imgCenterX * cropZoom)
        const finalImageCenterY = newPanY + (imgCenterY * cropZoom)
        const centerOffsetX = finalImageCenterX - cropCenterX
        const centerOffsetY = finalImageCenterY - cropCenterY
        
        console.log('[CROP SIZE CHANGE] ========== CROP SIZE CHANGED ==========')
        console.log('[CROP SIZE CHANGE] Conditions check:', {
          hasImage: !!cropImageRef.current,
          imageComplete: cropImageRef.current?.complete,
          isPanning,
          isCentering: isCenteringRef.current,
          isInitialSetup: isInitialCropSetupRef.current,
          sizeChanged,
          hasPrevArea: !!prevCropAreaRef.current
        })
        console.log('[CROP SIZE CHANGE] Crop area change:', {
          oldCropArea: prevCropAreaRef.current,
          newCropArea: cropArea,
          sizeDelta: {
            width: cropArea.width - prevCropAreaRef.current.width,
            height: cropArea.height - prevCropAreaRef.current.height
          },
          positionDelta: {
            x: cropArea.x - prevCropAreaRef.current.x,
            y: cropArea.y - prevCropAreaRef.current.y
          }
        })
        console.log('[CROP SIZE CHANGE] Crop center change:', {
          oldCenter: { x: oldCropCenterX, y: oldCropCenterY },
          newCenter: { x: cropCenterX, y: cropCenterY },
          centerDelta: {
            x: cropCenterX - oldCropCenterX,
            y: cropCenterY - oldCropCenterY
          }
        })
        console.log('[CROP SIZE CHANGE] Image dimensions:', {
          offsetWidth: imgWidth,
          offsetHeight: imgHeight,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        })
        console.log('[CROP SIZE CHANGE] Image center (local):', {
          x: imgCenterX,
          y: imgCenterY
        })
        console.log('[CROP SIZE CHANGE] Current state:', {
          currentPan: { x: cropPan.x, y: cropPan.y },
          currentZoom: cropZoom,
          currentImageCenter: { x: currentImageCenterX, y: currentImageCenterY }
        })
        console.log('[CROP SIZE CHANGE] Pan calculation:', {
          oldCropCenter: { x: oldCropCenterX, y: oldCropCenterY },
          newCropCenter: { x: cropCenterX, y: cropCenterY },
          currentImageCenter: { x: currentImageCenterX, y: currentImageCenterY },
          offsetFromOldCenter: { x: offsetFromOldCenterX, y: offsetFromOldCenterY },
          targetImageCenter: { x: targetImageCenterX, y: targetImageCenterY },
          scaledImgCenter: { x: imgCenterX * cropZoom, y: imgCenterY * cropZoom },
          calculatedPan: { x: newPanX, y: newPanY },
          panDelta: { x: newPanX - cropPan.x, y: newPanY - cropPan.y },
          formula: `pan = targetImageCenter(${targetImageCenterX}, ${targetImageCenterY}) - scaledImgCenter(${imgCenterX * cropZoom}, ${imgCenterY * cropZoom})`
        })
        console.log('[CROP SIZE CHANGE] Verification - final image center:', {
          x: finalImageCenterX,
          y: finalImageCenterY,
          cropCenter: { x: cropCenterX, y: cropCenterY },
          offset: { x: centerOffsetX, y: centerOffsetY },
          isCentered: Math.abs(centerOffsetX) < 0.1 && Math.abs(centerOffsetY) < 0.1
        })
        console.log('[CROP SIZE CHANGE] =====================================')
        
        prevCropAreaRef.current = cropArea
        isCenteringRef.current = true
        
        // Update pan to center image in crop frame
        setCropPan({ x: newPanX, y: newPanY })
        
        // Reset flag after a short delay to allow state update
        setTimeout(() => {
          isCenteringRef.current = false
          console.log('[CROP SIZE CHANGE] Centering flag cleared')
        }, 100)
      } else if (sizeChanged) {
        // First time setting crop area, just store it
        console.log('[CROP SIZE CHANGE] First time setting crop area, storing:', cropArea)
        prevCropAreaRef.current = cropArea
      } else {
        // Log why centering was skipped
        if (sizeChanged) {
          console.log('[CROP SIZE CHANGE] Skipped centering - conditions:', {
            hasImage: !!cropImageRef.current,
            imageComplete: cropImageRef.current?.complete,
            isPanning,
            isCentering: isCenteringRef.current,
            isInitialSetup: isInitialCropSetupRef.current,
            hasPrevArea: !!prevCropAreaRef.current
          })
        }
      }
      
      // Scroll crop area into view if it extends beyond visible area
      if (cropCanvasRef.current) {
        const canvas = cropCanvasRef.current
        const container = canvas.parentElement?.parentElement
        if (container) {
          // Check if crop area extends beyond visible area
          const containerRect = container.getBoundingClientRect()
          const cropRight = cropArea.x + cropArea.width
          const cropBottom = cropArea.y + cropArea.height
          
          // Scroll to show crop area if needed
          if (cropRight > containerRect.width || cropBottom > containerRect.height) {
            container.scrollTo({
              left: Math.max(0, cropArea.x - 50),
              top: Math.max(0, cropArea.y - 50),
              behavior: 'smooth'
            })
          }
        }
      }
    }
  }, [cropArea, cropZoom, isPanning])
  
  // Debug: Log crop input value changes (throttled to reduce spam)
  // useEffect(() => {
  //   console.log('[CROP DEBUG] cropInputValues changed:', cropInputValues)
  // }, [cropInputValues])
  
  // Debug: Log zoom/pan changes (throttled to reduce spam)
  useEffect(() => {
    // Only log if zoom changed significantly (removed to reduce console spam)
    // const timeoutId = setTimeout(() => {
    //   console.log('[CROP DEBUG] Zoom set to:', cropZoom)
    // }, 100)
    // return () => clearTimeout(timeoutId)
  }, [cropZoom])
  
  useEffect(() => {
    // Log pan/zoom changes with detailed info
    if (cropArea && cropImageRef.current && cropImageRef.current.complete) {
      const img = cropImageRef.current
      const imgWidth = img.offsetWidth
      const imgHeight = img.offsetHeight
      const imgCenterX = imgWidth / 2
      const imgCenterY = imgHeight / 2
      const cropCenterX = cropArea.x + cropArea.width / 2
      const cropCenterY = cropArea.y + cropArea.height / 2
      
      // Calculate where image center actually is
      const actualImageCenterX = cropPan.x + (imgCenterX * cropZoom)
      const actualImageCenterY = cropPan.y + (imgCenterY * cropZoom)
      const offsetFromCropCenterX = actualImageCenterX - cropCenterX
      const offsetFromCropCenterY = actualImageCenterY - cropCenterY
      
      console.log('[PAN/ZOOM STATE] ========== STATE CHANGE ==========')
      console.log('[PAN/ZOOM STATE] Pan:', cropPan)
      console.log('[PAN/ZOOM STATE] Zoom:', cropZoom)
      console.log('[PAN/ZOOM STATE] Transform:', `translate(${cropPan.x}px, ${cropPan.y}px) scale(${cropZoom})`)
      console.log('[PAN/ZOOM STATE] Image dimensions:', {
        offsetWidth: imgWidth,
        offsetHeight: imgHeight
      })
      console.log('[PAN/ZOOM STATE] Crop frame:', {
        area: cropArea,
        center: { x: cropCenterX, y: cropCenterY }
      })
      console.log('[PAN/ZOOM STATE] Image center position:', {
        local: { x: imgCenterX, y: imgCenterY },
        scaled: { x: imgCenterX * cropZoom, y: imgCenterY * cropZoom },
        actual: { x: actualImageCenterX, y: actualImageCenterY }
      })
      console.log('[PAN/ZOOM STATE] Centering status:', {
        cropCenter: { x: cropCenterX, y: cropCenterY },
        imageCenter: { x: actualImageCenterX, y: actualImageCenterY },
        offset: { x: offsetFromCropCenterX, y: offsetFromCropCenterY },
        isCentered: Math.abs(offsetFromCropCenterX) < 1 && Math.abs(offsetFromCropCenterY) < 1,
        isCentering: isCenteringRef.current
      })
      console.log('[PAN/ZOOM STATE] ===================================')
    } else {
      console.log('[PAN/ZOOM STATE] State changed but crop not ready:', {
        pan: cropPan,
        zoom: cropZoom,
        hasCropArea: !!cropArea,
        hasImage: !!cropImageRef.current,
        imageComplete: cropImageRef.current?.complete
      })
    }
  }, [cropPan.x, cropPan.y, cropZoom, cropArea?.x, cropArea?.y, cropArea?.width, cropArea?.height])
  
  // Debug: Log original image size
  useEffect(() => {
    if (originalImageSize) {
      console.log('[CROP DEBUG] Original image size set:', originalImageSize)
    }
  }, [originalImageSize])

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
              <span className="hidden sm:inline text-sm">Memory</span>
            </Link>
          </div>

          {/* User Actions */}
          {user ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {isAdmin && (
                <button
                  onClick={() => setShowPanels(!showPanels)}
                  className="flex items-center gap-1 sm:gap-2 text-purple-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-purple-400/10"
                >
                  {showPanels ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  <span className="hidden sm:inline text-sm">{showPanels ? 'Hide Panels' : 'Show Panels'}</span>
                </button>
              )}
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
        {showPanels && isAdmin ? (
          <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
            {/* Left Panel */}
            <div className="hidden lg:block lg:col-span-3 space-y-6">
              <HudPanel title="Image Generation Core">
                <p className="flex items-center gap-2">
                  <AztecIcon name="sun-stone" className="text-purple-400 animate-icon-pulse" /> 
                  Model Status: <span className="text-green-400">ACTIVE</span>
                </p>
                <p className="flex items-center gap-2">
                  <AztecIcon name="sun-stone" className="text-purple-400 animate-icon-pulse" /> 
                  Current Model: <span className="text-white">{selectedImageModel.toUpperCase()}</span>
                </p>
                <p>
                  Enhancement Model: <span className="text-white">{selectedLLM.toUpperCase()}</span>
                </p>
                <p>
                  Aspect Ratio: <span className="text-white">{imageRatio}</span>
                </p>
              </HudPanel>
              
              <HudPanel title="Generation Status">
                {isGeneratingImage ? (
                  <>
                    <p className="flex items-center gap-2 text-purple-400">
                      <AztecIcon name="serpent" className="text-purple-400 animate-icon-pulse" /> 
                      Generating...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {imageGenerationProgress || 'Processing request'}
                    </p>
                    <p className="text-xs text-purple-400 mt-1">
                      Progress: {progressPercentage}%
                    </p>
                  </>
                ) : imageUrl ? (
                  <p className="flex items-center gap-2 text-green-400">
                    <AztecIcon name="serpent" className="text-green-400 animate-icon-pulse" /> 
                    Image Ready
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
                  <span className="text-purple-400">🖼️</span>{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600">
                    IMAGE MODE
                  </span>
                </h1>
                <p className="text-gray-300 text-lg">
                  AI-powered image generation with prompt enhancement • Upload and scan images with AI vision models
                </p>
              </div>

              <div className="w-full space-y-6">
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

            {/* Image Upload Section for AI Scanning */}
            <div 
              className={`aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-purple-500/30 shadow-purple-500/20 transition-all duration-300 relative ${
                isDragOver ? 'scale-105 border-2 border-dashed border-purple-400 bg-purple-900/40' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">📷 Scan Image with AI</h2>
                  {selectedImage && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearSelectedImage}
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Drag Overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center bg-purple-900/50 backdrop-blur-sm rounded-lg z-20">
                    <div className="text-center text-purple-400">
                      <Upload className="h-16 w-16 mx-auto mb-4 animate-bounce" />
                      <p className="text-xl font-bold">Drop Image Here</p>
                      <p className="text-sm">JPG, PNG, GIF, or other image formats</p>
                    </div>
                  </div>
                )}

                {!selectedImage ? (
                  <div className="text-center py-8">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white mb-4"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    <p className="text-purple-300 text-sm">or drag & drop an image here</p>
                    <p className="text-purple-400 text-xs mt-2">Upload an image to analyze it with AI vision models</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {imagePreview && (
                        <img 
                          src={imagePreview} 
                          alt="Selected image" 
                          className="w-32 h-32 object-cover rounded-lg border border-purple-500/50 shadow-lg"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-purple-300 text-sm font-medium">{selectedImage.name}</p>
                        <p className="text-purple-400 text-xs mb-2">{(selectedImage.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p className="text-green-400 text-xs mb-4">✅ Image loaded! Ask a question about it below or click "Analyze Image" for a detailed description.</p>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleAnalyzeImage}
                            disabled={isAnalyzingImage}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex-1"
                          >
                            {isAnalyzingImage ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <BrainCircuit className="h-4 w-4 mr-2" />
                                Analyze Image with AI
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={handleUseImageAsReference}
                            disabled={isAnalyzingImage}
                            className={`${useImageAsReference ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                            size="sm"
                          >
                            {useImageAsReference ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Using as Reference
                              </>
                            ) : (
                              <>
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Use as Reference
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Analysis Result */}
                {imageAnalysisResult && (
                  <div className="mt-4 p-4 bg-gray-900/20 border border-gray-500/30 rounded-lg">
                    <h3 className="text-white text-sm font-semibold mb-2">AI Analysis Result:</h3>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap mb-3">{imageAnalysisResult.replace(/\*\*/g, '')}</p>
                    <Button
                      onClick={() => {
                        setUseImageAsReference(true)
                        setStoredImageReference(imageAnalysisResult.replace(/\*\*/g, '').trim())
                      }}
                      className={`w-full ${useImageAsReference && storedImageReference === imageAnalysisResult.replace(/\*\*/g, '').trim() ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                      size="sm"
                    >
                      {useImageAsReference && storedImageReference === imageAnalysisResult.replace(/\*\*/g, '').trim() ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Using as Reference
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Use This Image as Reference
                        </>
                      )}
                    </Button>
                  </div>
                )}
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
                  placeholder={
                    selectedImage 
                      ? "Ask a question about the uploaded image... (e.g., 'What objects do you see?', 'Describe the colors and mood', 'What is the main subject?') Or describe an image you want to generate..."
                      : "Describe the image you want to generate... (e.g., 'A futuristic cityscape at sunset', 'A portrait of a cyberpunk warrior')"
                  }
                  className="w-full bg-black/30 text-lg text-white placeholder-purple-600 resize-none border border-purple-500/30 rounded-lg p-4 focus:ring-2 focus:ring-purple-400 min-h-[120px]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={enhancePromptWithLLM}
                    disabled={!prompt.trim() || isEnhancingPrompt}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    title="Enhance your prompt with AI"
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
                  <Select 
                    value={imageRatio} 
                    onValueChange={(value) => {
                      setImageRatio(value)
                    }}
                  >
                    <SelectTrigger className="bg-black/30 border-purple-500/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-purple-500/50">
                      {getSupportedRatios(selectedImageModel).map((ratio) => (
                        <SelectItem 
                          key={ratio.value} 
                          value={ratio.value}
                          className="text-purple-300 hover:bg-purple-500/20"
                        >
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-purple-400/70 text-xs mt-2">
                    Supported ratios for {selectedImageModel.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                
                {/* Inpainting Model Selector */}
                <div>
                  <label className="text-purple-400 text-sm font-medium mb-2 block">Inpainting Model</label>
                  <Select value={selectedInpaintModel} onValueChange={setSelectedInpaintModel}>
                    <SelectTrigger className="bg-black/30 border-purple-500/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-purple-500/50">
                      <SelectItem value="dall-e-2" className="text-purple-300 hover:bg-purple-500/20">DALL-E 2 (15 credits)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-purple-400/70 text-xs mt-2">
                    Used for editing/inpainting generated images
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
              <div className="bg-neutral-900/50 p-6 rounded-2xl border border-green-500/30 w-full max-w-full overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Generated Image</h3>
                  {imageRatio && (
                    <span className="text-sm text-purple-400 font-mono bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/30">
                      Ratio: {imageRatio}
                    </span>
                  )}
                </div>
                
                {/* Image Versions Thumbnails */}
                {imageHistory.length > 1 && !showInpainting && !showCrop && (
                  <div className="mb-4 p-3 bg-black/30 rounded-lg border border-purple-500/20">
                    <p className="text-sm text-purple-300 mb-2 font-medium">Versions (click to view):</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {originalImageUrl && (
                        <button
                          onClick={() => {
                            setImageUrl(originalImageUrl)
                            console.log('[INPAINT DEBUG] Switched to original image')
                          }}
                          className={`flex-shrink-0 group relative ${imageUrl === originalImageUrl ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-neutral-900' : 'opacity-70 hover:opacity-100'}`}
                        >
                          <img
                            src={originalImageUrl}
                            alt="Original"
                            className="w-20 h-20 object-cover rounded border-2 border-purple-500/30 group-hover:border-purple-400 transition-colors"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 px-1 rounded-b text-center">
                            Original
                          </div>
                        </button>
                      )}
                      {imageHistory.filter(v => v.url !== originalImageUrl).map((version, idx) => (
                        <button
                          key={version.timestamp}
                          onClick={() => {
                            setImageUrl(version.url)
                            console.log('[INPAINT DEBUG] Switched to version:', version.label)
                          }}
                          className={`flex-shrink-0 group relative ${imageUrl === version.url ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-neutral-900' : 'opacity-70 hover:opacity-100'}`}
                        >
                          <img
                            src={version.url}
                            alt={version.label}
                            className="w-20 h-20 object-cover rounded border-2 border-purple-500/30 group-hover:border-purple-400 transition-colors"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 px-1 rounded-b text-center">
                            {version.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {!showInpainting && !showCrop ? (
                  <>
                    <img 
                      key={`inpaint-${imageUrl}`} 
                      src={imageUrl} 
                      alt="Generated" 
                      className="w-full rounded-lg border border-green-500/30 max-h-[800px] object-contain"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement
                        console.log('[INPAINT DEBUG] Image loaded:', img.src)
                        console.log('[INPAINT DEBUG] Image naturalWidth:', img.naturalWidth, 'naturalHeight:', img.naturalHeight)
                      }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        console.error('[INPAINT DEBUG] Image failed to load:', img.src)
                      }}
                      style={{ imageRendering: 'auto' }}
                    />
                    <div className="mt-4 space-y-3">
                      {/* Crop Toggle */}
                      <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-green-500/30">
                        <div className="flex items-center gap-2">
                          <Crop className="h-4 w-4 text-green-400" />
                          <label htmlFor="crop-toggle" className="text-sm text-white cursor-pointer">
                            Enable Crop Tool
                          </label>
                        </div>
                        <Switch
                          id="crop-toggle"
                          checked={enableCrop}
                          onCheckedChange={(checked) => {
                            if (checked && showInpainting) {
                              setShowInpainting(false)
                            }
                            setEnableCrop(checked)
                            if (checked) {
                              setShowCrop(true)
                            } else {
                              setShowCrop(false)
                              clearCrop()
                            }
                          }}
                        />
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={handleDownloadImage}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          Download Image
                        </Button>
                        <Button
                          onClick={() => {
                            if (enableCrop) {
                              setEnableCrop(false)
                              setShowCrop(false)
                              clearCrop()
                            }
                            setShowInpainting(true)
                          }}
                          disabled={!user}
                          className="px-4 py-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 disabled:opacity-50 flex items-center gap-2"
                          variant="outline"
                        >
                          <Paintbrush className="h-4 w-4" />
                          Inpaint Image
                        </Button>
                        <Button
                          onClick={handleSaveImage}
                          disabled={isSaving || saveStatus === 'saved' || !user}
                          className="px-4 py-2 border-green-500/50 text-green-400 hover:bg-green-500/10 disabled:opacity-50 flex items-center gap-2"
                          variant="outline"
                        >
                          {saveStatus === 'saving' ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : saveStatus === 'saved' ? (
                            <>
                              <Check className="h-4 w-4" />
                              Saved!
                            </>
                          ) : (
                            <>
                              <BookUser className="h-4 w-4" />
                              Save to Library
                            </>
                          )}
                        </Button>
                        {saveError && (
                          <div className="w-full mt-2 text-sm text-red-400">
                            {saveError}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : showCrop ? (
                  <div className="space-y-4">
                    {/* Crop Canvas */}
                    <div 
                      className="relative border border-green-500/50 rounded-lg overflow-auto bg-gray-900"
                      onWheel={handleWheelZoom}
                      style={{ 
                        height: cropArea ? `${Math.max(400, Math.min(800, Math.max(cropArea.height, cropArea.y + cropArea.height) + 20))}px` : '400px',
                        width: '100%',
                        maxHeight: cropArea ? `${Math.max(800, Math.max(cropArea.height, cropArea.y + cropArea.height) + 100)}px` : '800px',
                        maxWidth: '100%',
                        display: 'flex',
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start',
                        position: 'relative',
                        boxSizing: 'border-box',
                        // Allow scrolling when crop area extends beyond container
                        overflow: 'auto'
                      }}
                    >
                      <div className="relative" style={{ 
                        position: 'relative', 
                        minWidth: cropArea ? `${Math.max(cropArea.width, Math.max(0, cropArea.x) + cropArea.width)}px` : 'auto', 
                        minHeight: cropArea ? `${Math.max(cropArea.height, Math.max(0, cropArea.y) + cropArea.height)}px` : 'auto',
                        boxSizing: 'border-box',
                        // Ensure the inner div expands to show the full crop area
                        width: cropArea ? `${Math.max(cropArea.width, Math.max(0, cropArea.x) + cropArea.width)}px` : 'auto',
                        height: cropArea ? `${Math.max(cropArea.height, Math.max(0, cropArea.y) + cropArea.height)}px` : 'auto'
                      }}>
                        {/* Display the actual image with zoom/pan */}
                        <img
                          ref={cropImageRef}
                          src={imageUrl}
                          alt="Crop"
                          className="block"
                          style={{ 
                            imageRendering: 'auto',
                            maxHeight: '800px',
                            maxWidth: '100%',
                            height: 'auto',
                            width: 'auto',
                            transform: `translate(${cropPan.x}px, ${cropPan.y}px) scale(${cropZoom})`,
                            transformOrigin: '0 0',
                            cursor: isPanning ? 'grabbing' : (cropArea ? 'grab' : 'default'),
                            userSelect: 'none'
                          }}
                          draggable={false}
                          onLoad={(e) => {
                            const img = e.target as HTMLImageElement
                            // Store original image dimensions
                            setOriginalImageSize({ width: img.naturalWidth, height: img.naturalHeight })
                            
                            // Get displayed dimensions
                            const displayedWidth = img.offsetWidth
                            const displayedHeight = img.offsetHeight
                            
                            console.log('[IMAGE LOAD DEBUG] Image loaded:', {
                              naturalSize: { width: img.naturalWidth, height: img.naturalHeight },
                              displayedSize: { width: displayedWidth, height: displayedHeight },
                              scaleFactor: {
                                x: displayedWidth / img.naturalWidth,
                                y: displayedHeight / img.naturalHeight
                              },
                              currentCropArea: cropArea,
                              currentZoom: cropZoom,
                              currentPan: cropPan,
                              imageRect: img.getBoundingClientRect()
                            })
                            
                            // Canvas size will be updated by the draw effect
                          }}
                          onMouseDown={(e) => {
                            if (e.button === 0 && cropArea && !isResizing && !isCropSelecting) { // Left click
                              handlePanStart(e)
                            }
                          }}
                          onMouseMove={handlePanMove}
                          onMouseUp={handlePanEnd}
                          onMouseLeave={handlePanEnd}
                        />
                        {/* Overlay canvas for crop selection */}
                        <canvas
                          ref={cropCanvasRef}
                          className="absolute top-0 left-0 block"
                          style={{ 
                            display: 'block',
                            backgroundColor: 'transparent',
                            cursor: isPanning ? 'grabbing' : (cropArea ? 'crosshair' : 'crosshair'),
                            pointerEvents: isPanning ? 'none' : 'auto'
                          }}
                          onMouseDown={(e) => {
                            if (!isPanning) {
                              handleCropMouseDown(e)
                            }
                          }}
                          onMouseMove={(e) => {
                            if (!isPanning) {
                              handleCropMouseMove(e)
                            }
                          }}
                          onMouseUp={handleCropMouseUp}
                          onMouseLeave={handleCropMouseUp}
                        />
                        <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-xs z-10 pointer-events-none">
                          {cropArea ? (
                            <>Drag corners to resize crop • Drag image to pan • Scroll to zoom</>
                          ) : (
                            <>Drag to select crop area or enter dimensions</>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Crop Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-green-500/30">
                        <div className="flex items-center gap-2">
                          <Crop className="h-4 w-4 text-green-400" />
                          <label htmlFor="crop-toggle-active" className="text-sm text-white cursor-pointer">
                            Crop Tool Enabled
                          </label>
                        </div>
                        <Switch
                          id="crop-toggle-active"
                          checked={enableCrop}
                          onCheckedChange={(checked) => {
                            setEnableCrop(checked)
                            if (!checked) {
                              setShowCrop(false)
                              clearCrop()
                            }
                          }}
                        />
                      </div>
                      
                      {showCrop && (
                        <div className="space-y-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <p className="text-green-400 text-sm font-medium">
                            {cropArea ? (
                              <>Crop Area: {Math.round(cropArea.width)} × {Math.round(cropArea.height)}px</>
                            ) : (
                              <>Set crop area by entering values or dragging on the image</>
                            )}
                          </p>
                          
                          {/* Pixel Input Fields */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-green-300 mb-1 block">X Position</label>
                              <input
                                type="number"
                                value={Math.round(cropInputValues.x) || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  console.log('[CROP DEBUG] X input changed to:', val)
                                  setCropInputValues({ ...cropInputValues, x: val })
                                }}
                                onBlur={updateCropFromInputs}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateCropFromInputs()
                                  }
                                }}
                                className="w-full bg-black/50 border border-green-500/50 text-white px-2 py-1 rounded text-sm"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-green-300 mb-1 block">Y Position</label>
                              <input
                                type="number"
                                value={Math.round(cropInputValues.y) || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  console.log('[CROP DEBUG] Y input changed to:', val)
                                  setCropInputValues({ ...cropInputValues, y: val })
                                }}
                                onBlur={updateCropFromInputs}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateCropFromInputs()
                                  }
                                }}
                                className="w-full bg-black/50 border border-green-500/50 text-white px-2 py-1 rounded text-sm"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-green-300 mb-1 block">Width</label>
                              <input
                                type="number"
                                value={Math.round(cropInputValues.width) || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  console.log('[CROP DEBUG] Width input changed to:', val, 'Current values:', cropInputValues)
                                  setCropInputValues({ ...cropInputValues, width: val })
                                }}
                                onBlur={updateCropFromInputs}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateCropFromInputs()
                                  }
                                }}
                                className="w-full bg-black/50 border border-green-500/50 text-white px-2 py-1 rounded text-sm"
                                placeholder="Width"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-green-300 mb-1 block">Height</label>
                              <input
                                type="number"
                                value={Math.round(cropInputValues.height) || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  console.log('[CROP DEBUG] Height input changed to:', val, 'Current values:', cropInputValues)
                                  setCropInputValues({ ...cropInputValues, height: val })
                                }}
                                onBlur={updateCropFromInputs}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateCropFromInputs()
                                  }
                                }}
                                className="w-full bg-black/50 border border-green-500/50 text-white px-2 py-1 rounded text-sm"
                                placeholder="Height"
                              />
                            </div>
                          </div>
                          
                          {/* Zoom and Pan Controls */}
                          {cropArea && (
                            <div className="space-y-2 pt-2 border-t border-green-500/20">
                              <div className="flex items-center justify-between">
                                <label className="text-xs text-green-300">Zoom: {Math.round(cropZoom * 100)}%</label>
                                <div className="flex gap-1">
                                  <Button
                                    onClick={() => {
                                      const newZoom = Math.max(0.1, cropZoom - 0.1)
                                      console.log('[ZOOM BUTTON] Zoom out clicked:', {
                                        oldZoom: cropZoom,
                                        newZoom
                                      })
                                      setCropZoom(newZoom)
                                      centerImageForZoom(newZoom)
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 border-green-500/50 text-green-400 hover:bg-green-500/10"
                                  >
                                    <ZoomOut className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      console.log('[ZOOM BUTTON] Reset clicked:', {
                                        oldZoom: cropZoom,
                                        newZoom: 1.0
                                      })
                                      setCropZoom(1.0)
                                      centerImageForZoom(1.0)
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 border-green-500/50 text-green-400 hover:bg-green-500/10 text-xs"
                                  >
                                    Reset
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      const newZoom = Math.min(5.0, cropZoom + 0.1)
                                      console.log('[ZOOM BUTTON] Zoom in clicked:', {
                                        oldZoom: cropZoom,
                                        newZoom
                                      })
                                      setCropZoom(newZoom)
                                      centerImageForZoom(newZoom)
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 border-green-500/50 text-green-400 hover:bg-green-500/10"
                                  >
                                    <ZoomIn className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <input
                                type="range"
                                max="500"
                                value={cropZoom * 100}
                                onChange={(e) => {
                                  const newZoom = parseFloat(e.target.value) / 100
                                  console.log('[ZOOM SLIDER] Slider changed:', {
                                    oldZoom: cropZoom,
                                    newZoom,
                                    rawValue: e.target.value
                                  })
                                  setCropZoom(newZoom)
                                  centerImageForZoom(newZoom)
                                }}
                                className="w-full"
                              />
                              <div className="flex items-center gap-2">
                                <Move className="h-3 w-3 text-green-400" />
                                <span className="text-xs text-green-300">Drag image to pan • Scroll to zoom</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={clearCrop}
                          variant="outline"
                          size="sm"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Selection
                        </Button>
                        <Button
                          onClick={() => {
                            setEnableCrop(false)
                            setShowCrop(false)
                            clearCrop()
                            isCenteringRef.current = false
                          }}
                          variant="outline"
                          size="sm"
                          className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel Crop
                        </Button>
                        <Button
                          onClick={() => {
                            setShowCrop(false)
                          }}
                          variant="outline"
                          className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
                        >
                          Done
                        </Button>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <a 
                          href={imageUrl} 
                          download
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          Download Original
                        </a>
                        <Button
                          onClick={handleSaveImage}
                          disabled={isSaving || saveStatus === 'saved' || !user || !cropArea}
                          className="px-4 py-2 border-green-500/50 text-green-400 hover:bg-green-500/10 disabled:opacity-50 flex items-center gap-2"
                          variant="outline"
                        >
                          {saveStatus === 'saving' ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving Cropped...
                            </>
                          ) : saveStatus === 'saved' ? (
                            <>
                              <Check className="h-4 w-4" />
                              Saved!
                            </>
                          ) : (
                            <>
                              <BookUser className="h-4 w-4" />
                              Save Cropped Image
                            </>
                          )}
                        </Button>
                        {saveError && (
                          <div className="w-full mt-2 text-sm text-red-400">
                            {saveError}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Inpainting Canvas */}
                    <div className="relative border border-purple-500/50 rounded-lg overflow-hidden bg-gray-900 flex justify-center items-start">
                      <div className="relative inline-block">
                        {/* Background image canvas - displays the actual image */}
                        <canvas
                          ref={imageCanvasRef}
                          className="block"
                          style={{ 
                            pointerEvents: 'none',
                            display: 'block',
                            maxHeight: '800px',
                            maxWidth: '100%',
                            height: 'auto',
                            width: 'auto'
                          }}
                        />
                        {/* Overlay mask canvas for drawing */}
                        <canvas
                          ref={maskCanvasRef}
                          className="absolute top-0 left-0 block cursor-crosshair"
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                          style={{ 
                            display: 'block',
                            backgroundColor: 'transparent',
                            maxHeight: '800px',
                            maxWidth: '100%',
                            height: 'auto',
                            width: 'auto',
                            mixBlendMode: 'normal' // Don't blend - show actual colors
                          }}
                        />
                        <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-xs z-10 pointer-events-none">
                          Draw on the image to mark areas to inpaint (black = area to change)
                        </div>
                      </div>
                    </div>
                    
                    {/* Inpainting Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-purple-400 text-sm font-medium">Brush Size:</label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-purple-300 text-sm w-12">{brushSize}px</span>
                      </div>
                      
                      <Button
                        onClick={clearMask}
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Eraser className="h-4 w-4 mr-2" />
                        Clear Mask
                      </Button>
                      
                      <div>
                        <label className="text-purple-400 text-sm font-medium mb-2 block">Inpainting Prompt</label>
                        <textarea
                          placeholder="Describe what you want in the masked area... (e.g., 'a red car', 'a beautiful sunset', 'remove the background')"
                          className="w-full bg-black/30 text-white placeholder-purple-600 resize-none border border-purple-500/30 rounded-lg p-3 focus:ring-2 focus:ring-purple-400 min-h-[80px]"
                          value={inpaintingPrompt}
                          onChange={(e) => setInpaintingPrompt(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={handleInpaint}
                          disabled={isInpainting || !inpaintingPrompt.trim() || !maskCanvasRef.current}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        >
                          {isInpainting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Inpainting...
                            </>
                          ) : (
                            <>
                              <Paintbrush className="h-4 w-4 mr-2" />
                              Inpaint ({inpaintingProgress || '15 credits'})
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowInpainting(false)
                            setInpaintingPrompt("")
                            clearMask()
                          }}
                          variant="outline"
                          className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
                        >
                          Cancel
                        </Button>
                      </div>
                      
                      {inpaintingProgress && (
                        <div className="text-purple-400 text-sm">
                          {inpaintingProgress}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
              </div>
            </div>

            {/* Right Panel */}
            <div className="hidden lg:block lg:col-span-3 space-y-6">
              <HudPanel title="Image Analysis">
                {selectedImage ? (
                  <>
                    <p className="flex items-center gap-2 text-purple-400">
                      <AztecIcon name="jaguar" className="text-purple-400 animate-icon-pulse" /> 
                      Image Loaded
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedImage.name}
                    </p>
                    <p className="text-xs text-purple-300 mt-1">
                      Ready for AI analysis
                    </p>
                  </>
                ) : (
                  <p className="flex items-center gap-2 text-gray-500">
                    <AztecIcon name="jaguar" className="text-gray-500" /> 
                    No image uploaded
                  </p>
                )}
              </HudPanel>

              <HudPanel title="User Stats">
                <p className="flex items-center gap-2">
                  <AztecIcon name="jaguar" className="text-green-400 animate-icon-pulse" /> 
                  Credits: <span className="text-white">{userCredits}</span>
                </p>
                {imageUrl && (
                  <p className="text-xs text-gray-400 mt-2">
                    Image Generated: ✅
                  </p>
                )}
                {prompt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Prompt Length: {prompt.length} chars
                  </p>
                )}
              </HudPanel>

              <HudPanel title="Data Stream">
                {isGeneratingImage ? (
                  <p className="truncate text-purple-400">[LIVE] Generating Image...</p>
                ) : imageUrl ? (
                  <p className="truncate text-green-400">[DONE] Image Generated</p>
                ) : (
                  <p className="truncate text-gray-600">[IDLE] Awaiting Input...</p>
                )}
                {isEnhancingPrompt && (
                  <p className="truncate text-purple-400 mt-1">[PROC] Enhancing Prompt...</p>
                )}
                {isAnalyzingImage && (
                  <p className="truncate text-cyan-400 mt-1">[PROC] Analyzing Image...</p>
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
                <span className="text-purple-400">🖼️</span>{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600">
                  IMAGE MODE
                </span>
              </h1>
              <p className="text-gray-300 text-lg">
                AI-powered image generation with prompt enhancement • Upload and scan images with AI vision models
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

            {/* Image Upload Section for AI Scanning */}
            <div 
              className={`aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-purple-500/30 shadow-purple-500/20 transition-all duration-300 relative ${
                isDragOver ? 'scale-105 border-2 border-dashed border-purple-400 bg-purple-900/40' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">📷 Scan Image with AI</h2>
                  {selectedImage && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearSelectedImage}
                      className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Drag Overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center bg-purple-900/50 backdrop-blur-sm rounded-lg z-20">
                    <div className="text-center text-purple-400">
                      <Upload className="h-16 w-16 mx-auto mb-4 animate-bounce" />
                      <p className="text-xl font-bold">Drop Image Here</p>
                      <p className="text-sm">JPG, PNG, GIF, or other image formats</p>
                    </div>
                  </div>
                )}

                {!selectedImage ? (
                  <div className="text-center py-8">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white mb-4"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    <p className="text-purple-300 text-sm">or drag & drop an image here</p>
                    <p className="text-purple-400 text-xs mt-2">Upload an image to analyze it with AI vision models</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {imagePreview && (
                        <img 
                          src={imagePreview} 
                          alt="Selected image" 
                          className="w-32 h-32 object-cover rounded-lg border border-purple-500/50 shadow-lg"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-purple-300 text-sm font-medium">{selectedImage.name}</p>
                        <p className="text-purple-400 text-xs mb-2">{(selectedImage.size / 1024 / 1024).toFixed(2)} MB</p>
                        <p className="text-green-400 text-xs mb-4">✅ Image loaded! Ask a question about it below or click "Analyze Image" for a detailed description.</p>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleAnalyzeImage}
                            disabled={isAnalyzingImage}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white flex-1"
                          >
                            {isAnalyzingImage ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white mr-2"></div>
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <BrainCircuit className="h-4 w-4 mr-2" />
                                Analyze Image with AI
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={handleUseImageAsReference}
                            disabled={isAnalyzingImage}
                            className={`${useImageAsReference ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                            size="sm"
                          >
                            {useImageAsReference ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Using as Reference
                              </>
                            ) : (
                              <>
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Use as Reference
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Image Analysis Result */}
                {imageAnalysisResult && (
                  <div className="mt-4 p-4 bg-gray-900/20 border border-gray-500/30 rounded-lg">
                    <h3 className="text-white text-sm font-semibold mb-2">AI Analysis Result:</h3>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap mb-3">{imageAnalysisResult.replace(/\*\*/g, '')}</p>
                    <Button
                      onClick={() => {
                        setUseImageAsReference(true)
                        setStoredImageReference(imageAnalysisResult.replace(/\*\*/g, '').trim())
                      }}
                      className={`w-full ${useImageAsReference && storedImageReference === imageAnalysisResult.replace(/\*\*/g, '').trim() ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white`}
                      size="sm"
                    >
                      {useImageAsReference && storedImageReference === imageAnalysisResult.replace(/\*\*/g, '').trim() ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Using as Reference
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Use This Image as Reference
                        </>
                      )}
                    </Button>
                  </div>
                )}
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
                  placeholder={
                    selectedImage 
                      ? "Ask a question about the uploaded image... (e.g., 'What objects do you see?', 'Describe the colors and mood', 'What is the main subject?') Or describe an image you want to generate..."
                      : "Describe the image you want to generate... (e.g., 'A futuristic cityscape at sunset', 'A portrait of a cyberpunk warrior')"
                  }
                  className="w-full bg-black/30 text-lg text-white placeholder-purple-600 resize-none border border-purple-500/30 rounded-lg p-4 focus:ring-2 focus:ring-purple-400 min-h-[120px]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={enhancePromptWithLLM}
                    disabled={!prompt.trim() || isEnhancingPrompt}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    title="Enhance your prompt with AI"
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
                  <Select 
                    value={imageRatio} 
                    onValueChange={(value) => {
                      setImageRatio(value)
                    }}
                  >
                    <SelectTrigger className="bg-black/30 border-purple-500/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-purple-500/50">
                      {getSupportedRatios(selectedImageModel).map((ratio) => (
                        <SelectItem 
                          key={ratio.value} 
                          value={ratio.value}
                          className="text-purple-300 hover:bg-purple-500/20"
                        >
                          {ratio.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-purple-400/70 text-xs mt-2">
                    Supported ratios for {selectedImageModel.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                
                {/* Inpainting Model Selector */}
                <div>
                  <label className="text-purple-400 text-sm font-medium mb-2 block">Inpainting Model</label>
                  <Select value={selectedInpaintModel} onValueChange={setSelectedInpaintModel}>
                    <SelectTrigger className="bg-black/30 border-purple-500/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-purple-500/50">
                      <SelectItem value="dall-e-2" className="text-purple-300 hover:bg-purple-500/20">DALL-E 2 (15 credits)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-purple-400/70 text-xs mt-2">
                    Used for editing/inpainting generated images
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
              <div className="bg-neutral-900/50 p-6 rounded-2xl border border-green-500/30 w-full max-w-full overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Generated Image</h3>
                  {imageRatio && (
                    <span className="text-sm text-purple-400 font-mono bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/30">
                      Ratio: {imageRatio}
                    </span>
                  )}
                </div>
                
                {/* Image Versions Thumbnails */}
                {imageHistory.length > 1 && !showInpainting && !showCrop && (
                  <div className="mb-4 p-3 bg-black/30 rounded-lg border border-purple-500/20">
                    <p className="text-sm text-purple-300 mb-2 font-medium">Versions (click to view):</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {originalImageUrl && (
                        <button
                          onClick={() => {
                            setImageUrl(originalImageUrl)
                            console.log('[INPAINT DEBUG] Switched to original image')
                          }}
                          className={`flex-shrink-0 group relative ${imageUrl === originalImageUrl ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-neutral-900' : 'opacity-70 hover:opacity-100'}`}
                        >
                          <img
                            src={originalImageUrl}
                            alt="Original"
                            className="w-20 h-20 object-cover rounded border-2 border-purple-500/30 group-hover:border-purple-400 transition-colors"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 px-1 rounded-b text-center">
                            Original
                          </div>
                        </button>
                      )}
                      {imageHistory.filter(v => v.url !== originalImageUrl).map((version, idx) => (
                        <button
                          key={version.timestamp}
                          onClick={() => {
                            setImageUrl(version.url)
                            console.log('[INPAINT DEBUG] Switched to version:', version.label)
                          }}
                          className={`flex-shrink-0 group relative ${imageUrl === version.url ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-neutral-900' : 'opacity-70 hover:opacity-100'}`}
                        >
                          <img
                            src={version.url}
                            alt={version.label}
                            className="w-20 h-20 object-cover rounded border-2 border-purple-500/30 group-hover:border-purple-400 transition-colors"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 px-1 rounded-b text-center">
                            {version.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {!showInpainting && !showCrop ? (
                  <>
                    <img 
                      key={`inpaint-${imageUrl}`} 
                      src={imageUrl} 
                      alt="Generated" 
                      className="w-full rounded-lg border border-green-500/30 max-h-[800px] object-contain"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement
                        console.log('[INPAINT DEBUG] Image loaded:', img.src)
                        console.log('[INPAINT DEBUG] Image naturalWidth:', img.naturalWidth, 'naturalHeight:', img.naturalHeight)
                      }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        console.error('[INPAINT DEBUG] Image failed to load:', img.src)
                      }}
                      style={{ imageRendering: 'auto' }}
                    />
                    <div className="mt-4 space-y-3">
                      {/* Crop Toggle */}
                      <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-green-500/30">
                        <div className="flex items-center gap-2">
                          <Crop className="h-4 w-4 text-green-400" />
                          <label htmlFor="crop-toggle" className="text-sm text-white cursor-pointer">
                            Enable Crop Tool
                          </label>
                        </div>
                        <Switch
                          id="crop-toggle"
                          checked={enableCrop}
                          onCheckedChange={(checked) => {
                            if (checked && showInpainting) {
                              setShowInpainting(false)
                            }
                            setEnableCrop(checked)
                            if (checked) {
                              setShowCrop(true)
                            } else {
                              setShowCrop(false)
                              clearCrop()
                            }
                          }}
                        />
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={handleDownloadImage}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          Download Image
                        </Button>
                        <Button
                          onClick={() => {
                            if (enableCrop) {
                              setEnableCrop(false)
                              setShowCrop(false)
                              clearCrop()
                            }
                            setShowInpainting(true)
                          }}
                          disabled={!user}
                          className="px-4 py-2 border-purple-500/50 text-purple-400 hover:bg-purple-500/10 disabled:opacity-50 flex items-center gap-2"
                          variant="outline"
                        >
                          <Paintbrush className="h-4 w-4" />
                          Inpaint Image
                        </Button>
                        <Button
                          onClick={handleSaveImage}
                          disabled={isSaving || saveStatus === 'saved' || !user}
                          className="px-4 py-2 border-green-500/50 text-green-400 hover:bg-green-500/10 disabled:opacity-50 flex items-center gap-2"
                          variant="outline"
                        >
                          {saveStatus === 'saving' ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : saveStatus === 'saved' ? (
                            <>
                              <Check className="h-4 w-4" />
                              Saved!
                            </>
                          ) : (
                            <>
                              <BookUser className="h-4 w-4" />
                              Save to Library
                            </>
                          )}
                        </Button>
                        {saveError && (
                          <div className="w-full mt-2 text-sm text-red-400">
                            {saveError}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : showCrop ? (
                  <div className="space-y-4">
                    {/* Crop Canvas */}
                    <div 
                      className="relative border border-green-500/50 rounded-lg overflow-auto bg-gray-900"
                      onWheel={handleWheelZoom}
                      style={{ 
                        height: cropArea ? `${Math.max(400, Math.min(800, Math.max(cropArea.height, cropArea.y + cropArea.height) + 20))}px` : '400px',
                        width: '100%',
                        maxHeight: cropArea ? `${Math.max(800, Math.max(cropArea.height, cropArea.y + cropArea.height) + 100)}px` : '800px',
                        maxWidth: '100%',
                        display: 'flex',
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start',
                        position: 'relative',
                        boxSizing: 'border-box',
                        // Allow scrolling when crop area extends beyond container
                        overflow: 'auto'
                      }}
                    >
                      <div className="relative" style={{ 
                        position: 'relative', 
                        minWidth: cropArea ? `${Math.max(cropArea.width, Math.max(0, cropArea.x) + cropArea.width)}px` : 'auto', 
                        minHeight: cropArea ? `${Math.max(cropArea.height, Math.max(0, cropArea.y) + cropArea.height)}px` : 'auto',
                        boxSizing: 'border-box',
                        // Ensure the inner div expands to show the full crop area
                        width: cropArea ? `${Math.max(cropArea.width, Math.max(0, cropArea.x) + cropArea.width)}px` : 'auto',
                        height: cropArea ? `${Math.max(cropArea.height, Math.max(0, cropArea.y) + cropArea.height)}px` : 'auto'
                      }}>
                        {/* Display the actual image with zoom/pan */}
                        <img
                          ref={cropImageRef}
                          src={imageUrl}
                          alt="Crop"
                          className="block"
                          style={{ 
                            imageRendering: 'auto',
                            maxHeight: '800px',
                            maxWidth: '100%',
                            height: 'auto',
                            width: 'auto',
                            transform: `translate(${cropPan.x}px, ${cropPan.y}px) scale(${cropZoom})`,
                            transformOrigin: '0 0',
                            cursor: isPanning ? 'grabbing' : (cropArea ? 'grab' : 'default'),
                            userSelect: 'none'
                          }}
                          draggable={false}
                          onLoad={(e) => {
                            const img = e.target as HTMLImageElement
                            // Store original image dimensions
                            setOriginalImageSize({ width: img.naturalWidth, height: img.naturalHeight })
                            
                            // Get displayed dimensions
                            const displayedWidth = img.offsetWidth
                            const displayedHeight = img.offsetHeight
                            
                            console.log('[IMAGE LOAD DEBUG] Image loaded:', {
                              naturalSize: { width: img.naturalWidth, height: img.naturalHeight },
                              displayedSize: { width: displayedWidth, height: displayedHeight },
                              scaleFactor: {
                                x: displayedWidth / img.naturalWidth,
                                y: displayedHeight / img.naturalHeight
                              },
                              currentCropArea: cropArea,
                              currentZoom: cropZoom,
                              currentPan: cropPan,
                              imageRect: img.getBoundingClientRect()
                            })
                            
                            // Canvas size will be updated by the draw effect
                          }}
                          onMouseDown={(e) => {
                            if (e.button === 0 && cropArea && !isResizing && !isCropSelecting) { // Left click
                              handlePanStart(e)
                            }
                          }}
                          onMouseMove={handlePanMove}
                          onMouseUp={handlePanEnd}
                          onMouseLeave={handlePanEnd}
                        />
                        {/* Overlay canvas for crop selection */}
                        <canvas
                          ref={cropCanvasRef}
                          className="absolute top-0 left-0 block"
                          style={{ 
                            display: 'block',
                            backgroundColor: 'transparent',
                            cursor: isPanning ? 'grabbing' : (cropArea ? 'crosshair' : 'crosshair'),
                            pointerEvents: isPanning ? 'none' : 'auto'
                          }}
                          onMouseDown={(e) => {
                            if (!isPanning) {
                              handleCropMouseDown(e)
                            }
                          }}
                          onMouseMove={(e) => {
                            if (!isPanning) {
                              handleCropMouseMove(e)
                            }
                          }}
                          onMouseUp={handleCropMouseUp}
                          onMouseLeave={handleCropMouseUp}
                        />
                        <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-xs z-10 pointer-events-none">
                          {cropArea ? (
                            <>Drag corners to resize crop • Drag image to pan • Scroll to zoom</>
                          ) : (
                            <>Drag to select crop area or enter dimensions</>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Crop Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-green-500/30">
                        <div className="flex items-center gap-2">
                          <Crop className="h-4 w-4 text-green-400" />
                          <label htmlFor="crop-toggle-active" className="text-sm text-white cursor-pointer">
                            Crop Tool Enabled
                          </label>
                        </div>
                        <Switch
                          id="crop-toggle-active"
                          checked={enableCrop}
                          onCheckedChange={(checked) => {
                            setEnableCrop(checked)
                            if (!checked) {
                              setShowCrop(false)
                              clearCrop()
                            }
                          }}
                        />
                      </div>
                      
                      {showCrop && (
                        <div className="space-y-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <p className="text-green-400 text-sm font-medium">
                            {cropArea ? (
                              <>Crop Area: {Math.round(cropArea.width)} × {Math.round(cropArea.height)}px</>
                            ) : (
                              <>Set crop area by entering values or dragging on the image</>
                            )}
                          </p>
                          
                          {/* Pixel Input Fields */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-green-300 mb-1 block">X Position</label>
                              <input
                                type="number"
                                value={Math.round(cropInputValues.x) || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  console.log('[CROP DEBUG] X input changed to:', val)
                                  setCropInputValues({ ...cropInputValues, x: val })
                                }}
                                onBlur={updateCropFromInputs}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateCropFromInputs()
                                  }
                                }}
                                className="w-full bg-black/50 border border-green-500/50 text-white px-2 py-1 rounded text-sm"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-green-300 mb-1 block">Y Position</label>
                              <input
                                type="number"
                                value={Math.round(cropInputValues.y) || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  console.log('[CROP DEBUG] Y input changed to:', val)
                                  setCropInputValues({ ...cropInputValues, y: val })
                                }}
                                onBlur={updateCropFromInputs}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateCropFromInputs()
                                  }
                                }}
                                className="w-full bg-black/50 border border-green-500/50 text-white px-2 py-1 rounded text-sm"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-green-300 mb-1 block">Width</label>
                              <input
                                type="number"
                                value={Math.round(cropInputValues.width) || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  console.log('[CROP DEBUG] Width input changed to:', val, 'Current values:', cropInputValues)
                                  setCropInputValues({ ...cropInputValues, width: val })
                                }}
                                onBlur={updateCropFromInputs}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateCropFromInputs()
                                  }
                                }}
                                className="w-full bg-black/50 border border-green-500/50 text-white px-2 py-1 rounded text-sm"
                                placeholder="Width"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-green-300 mb-1 block">Height</label>
                              <input
                                type="number"
                                value={Math.round(cropInputValues.height) || 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0
                                  console.log('[CROP DEBUG] Height input changed to:', val, 'Current values:', cropInputValues)
                                  setCropInputValues({ ...cropInputValues, height: val })
                                }}
                                onBlur={updateCropFromInputs}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateCropFromInputs()
                                  }
                                }}
                                className="w-full bg-black/50 border border-green-500/50 text-white px-2 py-1 rounded text-sm"
                                placeholder="Height"
                              />
                            </div>
                          </div>
                          
                          {/* Zoom and Pan Controls */}
                          {cropArea && (
                            <div className="space-y-2 pt-2 border-t border-green-500/20">
                              <div className="flex items-center justify-between">
                                <label className="text-xs text-green-300">Zoom: {Math.round(cropZoom * 100)}%</label>
                                <div className="flex gap-1">
                                  <Button
                                    onClick={() => {
                                      const newZoom = Math.max(0.1, cropZoom - 0.1)
                                      console.log('[ZOOM BUTTON] Zoom out clicked:', {
                                        oldZoom: cropZoom,
                                        newZoom
                                      })
                                      setCropZoom(newZoom)
                                      centerImageForZoom(newZoom)
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 border-green-500/50 text-green-400 hover:bg-green-500/10"
                                  >
                                    <ZoomOut className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      console.log('[ZOOM BUTTON] Reset clicked:', {
                                        oldZoom: cropZoom,
                                        newZoom: 1.0
                                      })
                                      setCropZoom(1.0)
                                      centerImageForZoom(1.0)
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 border-green-500/50 text-green-400 hover:bg-green-500/10 text-xs"
                                  >
                                    Reset
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      const newZoom = Math.min(5.0, cropZoom + 0.1)
                                      console.log('[ZOOM BUTTON] Zoom in clicked:', {
                                        oldZoom: cropZoom,
                                        newZoom
                                      })
                                      setCropZoom(newZoom)
                                      centerImageForZoom(newZoom)
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0 border-green-500/50 text-green-400 hover:bg-green-500/10"
                                  >
                                    <ZoomIn className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <input
                                type="range"
                                max="500"
                                value={cropZoom * 100}
                                onChange={(e) => {
                                  const newZoom = parseFloat(e.target.value) / 100
                                  console.log('[ZOOM SLIDER] Slider changed:', {
                                    oldZoom: cropZoom,
                                    newZoom,
                                    rawValue: e.target.value
                                  })
                                  setCropZoom(newZoom)
                                  centerImageForZoom(newZoom)
                                }}
                                className="w-full"
                              />
                              <div className="flex items-center gap-2">
                                <Move className="h-3 w-3 text-green-400" />
                                <span className="text-xs text-green-300">Drag image to pan • Scroll to zoom</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={clearCrop}
                          variant="outline"
                          size="sm"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Clear Selection
                        </Button>
                        <Button
                          onClick={() => {
                            setEnableCrop(false)
                            setShowCrop(false)
                            clearCrop()
                            isCenteringRef.current = false
                          }}
                          variant="outline"
                          size="sm"
                          className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel Crop
                        </Button>
                        <Button
                          onClick={() => {
                            setShowCrop(false)
                          }}
                          variant="outline"
                          className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
                        >
                          Done
                        </Button>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <a 
                          href={imageUrl} 
                          download
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          Download Original
                        </a>
                        <Button
                          onClick={handleSaveImage}
                          disabled={isSaving || saveStatus === 'saved' || !user || !cropArea}
                          className="px-4 py-2 border-green-500/50 text-green-400 hover:bg-green-500/10 disabled:opacity-50 flex items-center gap-2"
                          variant="outline"
                        >
                          {saveStatus === 'saving' ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving Cropped...
                            </>
                          ) : saveStatus === 'saved' ? (
                            <>
                              <Check className="h-4 w-4" />
                              Saved!
                            </>
                          ) : (
                            <>
                              <BookUser className="h-4 w-4" />
                              Save Cropped Image
                            </>
                          )}
                        </Button>
                        {saveError && (
                          <div className="w-full mt-2 text-sm text-red-400">
                            {saveError}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Inpainting Canvas */}
                    <div className="relative border border-purple-500/50 rounded-lg overflow-hidden bg-gray-900 flex justify-center items-start">
                      <div className="relative inline-block">
                        {/* Background image canvas - displays the actual image */}
                        <canvas
                          ref={imageCanvasRef}
                          className="block"
                          style={{ 
                            pointerEvents: 'none',
                            display: 'block',
                            maxHeight: '800px',
                            maxWidth: '100%',
                            height: 'auto',
                            width: 'auto'
                          }}
                        />
                        {/* Overlay mask canvas for drawing */}
                        <canvas
                          ref={maskCanvasRef}
                          className="absolute top-0 left-0 block cursor-crosshair"
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                          style={{ 
                            display: 'block',
                            backgroundColor: 'transparent',
                            maxHeight: '800px',
                            maxWidth: '100%',
                            height: 'auto',
                            width: 'auto',
                            mixBlendMode: 'normal' // Don't blend - show actual colors
                          }}
                        />
                        <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-xs z-10 pointer-events-none">
                          Draw on the image to mark areas to inpaint (black = area to change)
                        </div>
                      </div>
                    </div>
                    
                    {/* Inpainting Controls */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-purple-400 text-sm font-medium">Brush Size:</label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-purple-300 text-sm w-12">{brushSize}px</span>
                      </div>
                      
                      <Button
                        onClick={clearMask}
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Eraser className="h-4 w-4 mr-2" />
                        Clear Mask
                      </Button>
                      
                      <div>
                        <label className="text-purple-400 text-sm font-medium mb-2 block">Inpainting Prompt</label>
                        <textarea
                          placeholder="Describe what you want in the masked area... (e.g., 'a red car', 'a beautiful sunset', 'remove the background')"
                          className="w-full bg-black/30 text-white placeholder-purple-600 resize-none border border-purple-500/30 rounded-lg p-3 focus:ring-2 focus:ring-purple-400 min-h-[80px]"
                          value={inpaintingPrompt}
                          onChange={(e) => setInpaintingPrompt(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={handleInpaint}
                          disabled={isInpainting || !inpaintingPrompt.trim() || !maskCanvasRef.current}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                        >
                          {isInpainting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Inpainting...
                            </>
                          ) : (
                            <>
                              <Paintbrush className="h-4 w-4 mr-2" />
                              Inpaint ({inpaintingProgress || '15 credits'})
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setShowInpainting(false)
                            setInpaintingPrompt("")
                            clearMask()
                          }}
                          variant="outline"
                          className="border-gray-500/50 text-gray-400 hover:bg-gray-500/10"
                        >
                          Cancel
                        </Button>
                      </div>
                      
                      {inpaintingProgress && (
                        <div className="text-purple-400 text-sm">
                          {inpaintingProgress}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
          returnUrl={typeof window !== 'undefined' ? window.location.href : '/image-mode'}
        />
      </div>
    </div>
  )
}

