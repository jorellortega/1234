"use client"

import { useState, useEffect, type ChangeEvent, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileUp, Mic, BookUser, BrainCircuit, Copy, Check, Upload, FileText, X, Settings, LogOut, User, Eye, EyeOff, CreditCard, Download } from "lucide-react"
import { HudPanel } from "@/components/hud-panel"
import { AztecIcon } from "@/components/aztec-icon"
import { DocumentUpload } from "@/components/DocumentUpload"
import { MemoryReview } from "@/components/MemoryReview"
import { ProgressiveResponse } from "@/components/ProgressiveResponse"
import { MemoryFormData } from "@/lib/types"
import { supabase } from "@/lib/supabase-client"

export default function AIPromptPage() {
  const [prompt, setPrompt] = useState("")
  const [lastPrompt, setLastPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [mode, setMode] = useState("openai")
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  const needsOllama = mode === "llama" || mode === "mistral"
  const isVisionModel = mode === "blip" || mode === "llava"
  const isImageGenModel = mode === "dalle_image" || mode === "runway_image"
  const isVideoModel = mode === "gen4_turbo" || mode === "gen3a_turbo" || mode === "gen4_aleph"
  
  // Authentication state
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [userCredits, setUserCredits] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Panel visibility state
  const [showPanels, setShowPanels] = useState(false)
  
  // Conversational signup state
  const [signupFlow, setSignupFlow] = useState<'idle' | 'asking' | 'collecting'>('idle')
  const [signupData, setSignupData] = useState({ name: '', email: '', phone: '', password: '' })
  const [signupStep, setSignupStep] = useState<'email' | 'name' | 'phone' | 'password'>('email')
  
  // Voice recognition state
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  
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

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          text: text.trim(),
          voice_id: "21m00Tcm4TlvDq8ikWAM", // Default voice
          model_id: "eleven_monolingual_v1"
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate audio')
      }

      const data = await response.json()
      setAudioUrl(data.audio)
    } catch (error) {
      console.error('Audio generation error:', error)
      setAudioError(error instanceof Error ? error.message : 'Failed to generate audio')
    } finally {
      setIsGeneratingAudio(false)
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
  const consoleRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Video generation state
  const [videoImage, setVideoImage] = useState<File | null>(null)
  const [videoImagePreview, setVideoImagePreview] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [videoGenerationProgress, setVideoGenerationProgress] = useState<string>('')
  const [videoDuration, setVideoDuration] = useState<5 | 10>(5)
  const [videoRatio, setVideoRatio] = useState<string>('1280:720')
  const videoFileInputRef = useRef<HTMLInputElement>(null)
  
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

  const handleModelChange = (value: string) => {
    setMode(value)
    console.log("mode:", value)
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
      // Automatically process and save the dropped document
      await processAndSaveDocument(files[0])
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
        throw new Error('Failed to process document')
      }

      const result = await response.json()
      
      if (result.memories && result.memories.length > 0) {
        // Get the current session token for authentication
        const { data: { session } } = await supabase.auth.getSession()
        
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
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = ''
    }
  }

  // Convert generated image to video
  const handleConvertImageToVideo = async (imageUrl: string) => {
    try {
      setError(null)
      
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
      
      // Switch to video mode (gen4_turbo as default)
      setMode('gen4_turbo')
      
      // Set a helpful prompt
      setPrompt('Add motion and animation to this image')
      
      // Scroll to top to show video generation UI
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
      // Show success message
      setOutput('✅ Image loaded! Ready to convert to video. You can edit the prompt or click "GENERATE VIDEO" to continue.')
      
    } catch (error) {
      console.error('Error converting image to video:', error)
      setError('Failed to load image for video generation')
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
        data: `Image file uploaded for vision model analysis.\n\nFilename: ${selectedImage.name}\nSize: ${(selectedImage.size / 1024 / 1024).toFixed(2)} MB\nType: ${selectedImage.type}\nVision Model: ${mode.toUpperCase()}\nStorage URL: ${storageUrl || 'Upload failed'}\n\nImage Data: ${imagePreview ? 'Available' : 'Not available'}`,
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
  async function* streamFromAPI(prompt: string, mode: string) {
    const res = await fetch("/api/generate-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
          prompt, 
          mode, 
          max_tokens: maxTokens, 
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
  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for image generation')
      return
    }

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

      // Check credits - DALL-E costs 13 credits, RunwayML costs 16 credits
      const requiredCredits = mode === 'dalle_image' ? 13 : 16
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
        return
      }

      setUserCredits(creditData.credits)

      // Determine which API to use
      const apiEndpoint = mode === 'dalle_image' ? '/api/dalle-image' : '/api/runway-image'
      const modelName = mode === 'dalle_image' ? 'DALL-E 3' : 'RunwayML Gen-4'
      
      setImageGenerationProgress(`Sending request to ${modelName}...`)

      // Send to backend
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Image generation failed')
      }

      const data = await response.json()
      
      if (data.success && data.url) {
        setImageGenerationProgress('Image generated successfully!')
        setLastPrompt(prompt) // Save prompt for later use
        setPrompt('') // Clear prompt
        // Use IMAGE_DISPLAY format so it appears in the AI response
        setOutput(`[IMAGE_DISPLAY:${data.url}]`)
      } else {
        throw new Error('No image URL returned')
      }

    } catch (error: any) {
      console.error('Image generation error:', error)
      setError(error.message || 'Failed to generate image')
      setImageGenerationProgress('')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt for video generation')
      return
    }

    // Check if model requires an image
    if ((mode === 'gen4_turbo' || mode === 'gen3a_turbo') && !videoImage) {
      setError(`${mode} requires an image input`)
      return
    }

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

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Check credits (video generation costs 26 credits - 60% markup on API cost)
      const creditResponse = await fetch('/api/credits/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requiredCredits: 26,
          operation: 'check_and_deduct'
        })
      })

      const creditData = await creditResponse.json()
      if (!creditData.success) {
        setError(creditData.message || 'Insufficient credits. Video generation costs 26 credits.')
        return
      }

      setUserCredits(creditData.credits)

      // Prepare form data
      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('model', mode)
      formData.append('duration', videoDuration.toString())
      formData.append('ratio', videoRatio)
      
      if (videoImage) {
        formData.append('file', videoImage)
      }

      setVideoGenerationProgress('INFINITO is processing your video...')

      // Send to backend
      const response = await fetch('/api/runway', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Video generation failed')
      }

      const data = await response.json()
      
      if (data.success && data.url) {
        setVideoUrl(data.url)
        setVideoGenerationProgress('Video generated successfully!')
        setLastPrompt(prompt) // Save prompt for later use
        setPrompt('') // Clear prompt
        // Use VIDEO_DISPLAY format so it appears in the AI response
        setOutput(`[VIDEO_DISPLAY:${data.url}]`)
      } else {
        throw new Error('No video URL returned')
      }

    } catch (error: any) {
      console.error('Video generation error:', error)
      setError(error.message || 'Failed to generate video')
      setVideoGenerationProgress('')
    } finally {
      setIsGeneratingVideo(false)
    }
  }

  // NEW: Handle TRANSMIT button click
  async function handleTransmit() {
    if (!prompt.trim()) return
    
    // Handle video generation mode
    if (isVideoModel) {
      await handleGenerateVideo()
      return
    }
    
    // Handle image generation mode (RunwayML)
    if (isImageGenModel) {
      await handleGenerateImage()
      return
    }
    
    // Handle signup flow if active
    if (signupFlow === 'collecting') {
      handleSignupInput(prompt)
      setPrompt('')
      return
    }
    
    // For image mode, check if an image is uploaded
    if (isVisionModel && !selectedImage) {
      setError("Please upload an image first to use image mode. Use the image upload section above.")
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
      
      const requiredCredits = isVisionModel ? 3 : 1 // Vision models cost more
      
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
      enhancedPrompt = `${styleInstruction}

Document Context: ${processedDocumentData.filename}
Extracted Text: ${processedDocumentData.extractedText}

${conversationContext ? `Conversation History:
${conversationContext}

` : ''}Current Question: ${prompt}

Please answer the user's question based on the document content above, and continue the conversation naturally.`
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
          await saveConversationTurn('user', prompt, '')
          
          // Save AI response to memory core
          await saveConversationTurn('assistant', '', text)
        }
        
        // Clear the input for the next question
        setPrompt('')
        
        // Log to Supabase
        fetch("/api/save-generation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prompt, 
            output: text, 
            model: "distilgpt2", 
            temperature, 
            top_k: topK 
          }),
        }).catch(() => {})
      } else {
        // Streaming path
        let finalText = ""
        for await (const chunk of streamFromAPI(enhancedPrompt, mode)) {
          finalText += chunk
          setOutput(prev => prev + chunk)
        }
        
        // Save user question to memory core (skip for image mode to avoid errors)
        if (!isVisionModel) {
          await saveConversationTurn('user', prompt, '')
          
          // Save AI response to memory core
          await saveConversationTurn('assistant', '', finalText)
        }
        
        // Clear the input for the next question
        setPrompt('')
        
        // Log to Supabase
        if (finalText) {
          fetch("/api/save-generation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              prompt, 
              output: finalText, 
              model: "distilgpt2", 
              temperature, 
              top_k: topK 
            }),
          }).catch(() => {})
        }
      }
    } catch (e: any) {
      setError(e.message || "Unknown error")
    } finally {
      setLoading(false)
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
      if (session) {
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

          const libraryResponse = await fetch('/api/generations/create', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(generationData)
          })
          
          if (libraryResponse.ok) {
            console.log('Saved complete conversation to library:', generationData)
          } else {
            console.error('Failed to save to library:', libraryResponse.status)
          }
        }
      }
    } catch (error) {
      console.error('Error saving to library:', error)
    }
    
    // Skip memory saving for image mode without images to avoid database errors
    if (isVisionModel && !selectedImage) {
      console.log('Skipping memory save for image mode without image')
      return
    }
    
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
    } catch (error) {
      console.error('Error saving conversation turn:', error)
    }
    
    // Fallback: Add to local conversation history even if memory save fails
    // But don't set a fake parent_id that doesn't exist
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
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Mobile: Stack navigation vertically */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {user && (
              <Link
                href="/memory-core"
                className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-cyan-400/10"
              >
                <BrainCircuit className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline text-sm">Memory Core</span>
              </Link>
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
          
          {/* Mobile: Stack controls vertically */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
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
              <div className="text-right text-cyan-400 text-xs sm:text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Link 
                    href="/credits" 
                    className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer hover:underline"
                  >
                    CREDITS:
                  </Link>
                  <Link 
                    href="/credits" 
                    className="text-amber-400 font-bold hover:text-amber-300 transition-colors cursor-pointer hover:underline"
                  >
                    {userCredits}
                  </Link>
                </div>
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
                  <Select value={mode} onValueChange={handleModelChange}>
                    <SelectTrigger className="w-full sm:w-32 h-10 sm:h-8 bg-transparent border-cyan-500/50 text-cyan-300 hover:border-cyan-400 focus:border-cyan-400 focus:ring-cyan-400/50 text-sm font-mono uppercase tracking-wider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-cyan-500/50 backdrop-blur-md">
                      <SelectItem value="openai" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">AiO</SelectItem>
                      <SelectItem value="gpt" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">GPT</SelectItem>
                      <SelectItem value="llama" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">Zephyr</SelectItem>
                      <SelectItem value="mistral" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">Maestro</SelectItem>
                      <SelectItem value="custom" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">Custom</SelectItem>
                      <SelectItem value="rag" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">RAG</SelectItem>
                      <SelectItem value="web" className="text-cyan-300 hover:bg-cyan-500/20 focus:bg-cyan-500/20 font-mono uppercase">WEB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Image Mode - Mobile: Full width, Desktop: Right side */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <span className="text-purple-400 text-xs sm:text-sm font-semibold tracking-wide uppercase">IMAGE MODE:</span>
                  <Select value={mode === "blip" || mode === "llava" || mode === "dalle_image" || mode === "runway_image" ? mode : ""} onValueChange={(value) => {
                    if (value === "blip" || value === "llava" || value === "dalle_image" || value === "runway_image") {
                      setMode(value)
                    }
                  }}>
                    <SelectTrigger className="w-full sm:w-56 h-10 sm:h-8 bg-transparent border-purple-500/50 text-purple-300 hover:border-purple-400 focus:border-purple-400 focus:ring-purple-400/50 text-sm font-mono uppercase tracking-wider">
                      <SelectValue placeholder="Select Image Model" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-purple-500/50 backdrop-blur-md">
                      <SelectItem value="blip" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">"One" (BLIP)</SelectItem>
                      <SelectItem value="llava" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">"Dos" (LLAVA)</SelectItem>
                      <SelectItem value="dalle_image" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">DALL-E 3</SelectItem>
                      <SelectItem value="runway_image" className="text-purple-300 hover:bg-purple-500/20 focus:bg-purple-500/20 font-mono uppercase">RUNWAY GEN-4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Video Mode - Mobile: Full width, Desktop: Right side */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <span className="text-pink-400 text-xs sm:text-sm font-semibold tracking-wide uppercase">VIDEO MODE:</span>
                  <Select value={isVideoModel ? mode : ""} onValueChange={(value) => {
                    if (value === "gen4_turbo" || value === "gen3a_turbo" || value === "gen4_aleph") {
                      setMode(value)
                    }
                  }}>
                    <SelectTrigger className="w-full sm:w-48 h-10 sm:h-8 bg-transparent border-pink-500/50 text-pink-300 hover:border-pink-400 focus:border-pink-400 focus:ring-pink-400/50 text-sm font-mono uppercase tracking-wider">
                      <SelectValue placeholder="Select Video Model" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-pink-500/50 backdrop-blur-md">
                      <SelectItem value="gen4_turbo" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">GEN-4 TURBO</SelectItem>
                      <SelectItem value="gen3a_turbo" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">GEN-3A TURBO</SelectItem>
                      <SelectItem value="gen4_aleph" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase">GEN-4 ALEPH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                    <p className="text-xl font-bold">Drop Document Here</p>
                    <p className="text-sm">PDF, Word, or Text files</p>
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
                          <option value="1280:720">16:9 Landscape (1280:720)</option>
                          <option value="720:1280">9:16 Portrait (720:1280)</option>
                          <option value="960:960">1:1 Square (960:960)</option>
                          <option value="1104:832">4:3 Landscape (1104:832)</option>
                          <option value="832:1104">3:4 Portrait (832:1104)</option>
                          <option value="1584:672">Ultra Wide (1584:672)</option>
                        </select>
                      </div>
                    </div>

                    {/* Image Upload for Image-to-Video models */}
                    {(mode === 'gen4_turbo' || mode === 'gen3a_turbo' || (mode === 'gen4_aleph' && !videoImage)) && (
                      <div className="mb-3">
                        <label className="text-pink-400 text-xs block mb-2">
                          {mode === 'gen4_aleph' ? 'Starting Image (optional)' : 'Starting Image (required)'}
                        </label>
                        {!videoImage ? (
                          <div className="text-center">
                            <input
                              ref={videoFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleVideoImageUpload}
                              className="hidden"
                            />
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
                      <div className="bg-black/30 p-3 rounded border border-purple-500/30 mb-3">
                        <div className="flex items-center gap-2 text-purple-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                          <span className="text-sm">{imageGenerationProgress}</span>
                        </div>
                      </div>
                    )}

                    {/* Video Generation Progress */}
                    {isGeneratingVideo && (
                      <div className="bg-black/30 p-3 rounded border border-pink-500/30 mb-3">
                        <div className="flex items-center gap-2 text-pink-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-400"></div>
                          <span className="text-sm">{videoGenerationProgress}</span>
                        </div>
                      </div>
                    )}


                    <p className="text-pink-300 text-xs mt-2">
                      💰 Cost: 26 credits per video • ⏱️ Generation time: 1-5 minutes
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
                      <div className="text-xs text-cyan-500 mb-3">Conversation Thread:</div>
                      <div className="text-xs text-cyan-300 max-h-60 overflow-y-auto space-y-3">
                        {conversationHistory.map((msg, index) => (
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
                            <div className="text-xs text-cyan-300 leading-relaxed">
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

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
                      title="Import Document"
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
                  </div>
                  
                  {/* Thread Button - Mobile: Full width, Desktop: Middle */}
                  {conversationHistory.length > 0 && (
                    <Button
                      onClick={() => setShowThreadView(!showThreadView)}
                      className="w-full sm:w-auto px-4 py-2 bg-transparent border border-cyan-500/40 text-cyan-400 hover:border-cyan-500/60 hover:text-cyan-300 transition-all text-sm font-medium"
                      title={showThreadView ? "Hide conversation thread" : "Show conversation thread"}
                    >
                      {showThreadView ? "HIDE THREAD" : "SHOW THREAD"}
                    </Button>
                  )}
                  
                  {/* Transmit Button - Mobile: Full width, Desktop: Right */}
                  <Button 
                    onClick={handleTransmit}
                    disabled={loading || isGeneratingVideo}
                    title={needsOllama && ollamaOk === false ? "May fail while Ollama is down." : undefined}
                    className={`w-full sm:w-auto ${
                      isVideoModel
                        ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500'
                        : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500'
                    } text-white font-bold hover:brightness-110 hover:shadow-lg hover:shadow-purple-400/50 rounded-lg px-6 sm:px-8 py-3 text-base sm:text-lg tracking-widest transition-all disabled:opacity-50`}
                  >
                    {isGeneratingVideo
                      ? "GENERATING VIDEO..."
                      : isGeneratingImage
                        ? "GENERATING IMAGE..."
                        : loading 
                          ? (stream ? "STREAMING..." : "PROCESSING...") 
                          : isVideoModel
                            ? "GENERATE VIDEO"
                            : isImageGenModel
                              ? "GENERATE IMAGE"
                              : isVisionModel 
                                ? "ANALYZE IMAGE" 
                                : "TRANSMIT"
                    }
                  </Button>
                </div>
              </div>
            </div>

            {/* NEW: Document Processing Success Message */}
            {lastProcessedDocument && (
              <div className="w-full max-w-3xl mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
                ✅ Document processed successfully! {lastProcessedDocument}
              </div>
            )}

            {/* NEW: Advanced Settings Toggle */}
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

            {/* NEW: Output display */}
            {error && (
              <div className="w-full max-w-3xl mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                Error: {error}
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
                onShowMore={async (topic: string) => {
                  // Make a follow-up API call asking for more details
                  const followUpPrompt = `Can you explain more about "${topic}"? Please provide a detailed explanation with examples, code snippets, and best practices. 

IMPORTANT: Format your response with clear paragraphs. Each paragraph should be separated by a blank line (double line break). For example:

Paragraph 1 content here.

Paragraph 2 content here.

Paragraph 3 content here.

Make sure to use proper spacing between paragraphs for readability.`
                  
                  const payload = JSON.stringify({
                    prompt: followUpPrompt,
                    mode,
                    max_tokens: maxTokens,
                    temperature,
                    top_k: topK,
                    response_style: "detailed", // Force detailed for follow-up
                  })

                  try {
                    if (stream) {
                      // For streaming, collect the response
                      let detailedResponse = ""
                      for await (const chunk of streamFromAPI(followUpPrompt, mode)) {
                        detailedResponse += chunk
                      }
                      return detailedResponse
                    } else {
                      // For non-streaming
                      const r = await fetch("/api/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: payload,
                      })
                      const data = await r.json()
                      if (!r.ok || data.error) throw new Error(data.error || "Request failed")
                      return String(data.output ?? "")
                    }
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

              {/* Skip button for phone step */}
              {signupFlow === 'collecting' && signupStep === 'phone' && (
                <div className="flex gap-4 justify-center mt-4">
                  <Button
                    onClick={handleSkipPhone}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-8 py-2"
                  >
                    Skip
                  </Button>
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
          />
        )}

        {showMemoryReview && (
          <MemoryReview
            memories={extractedMemories}
            onCancel={() => setShowMemoryReview(false)}
            onSave={handleSaveExtractedMemories}
          />
        )}

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
