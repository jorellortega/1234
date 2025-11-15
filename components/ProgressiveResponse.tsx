"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp, Copy, Check, Loader2, Volume2, Play, Pause, Download, FileText, Save, Edit2, X, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Sparkles, Zap, ArrowUp, ArrowDown, Minus, Heading, Type } from "lucide-react"

interface ProgressiveResponseProps {
  content: string
  className?: string
  responseStyle?: "concise" | "detailed"
  onShowMore?: (topic: string) => Promise<string>
  onShowPrevious?: () => Promise<void> // Callback to show previous "generate more" responses
  // Audio props
  audioUrl?: string
  isGeneratingAudio?: boolean
  audioError?: string
  onGenerateAudio?: (text: string) => void
  // Video conversion props
  onConvertToVideo?: (imageUrl: string) => void
  // Save media props
  prompt?: string
  model?: string
  // Admin-only props for image-to-video model selector
  isAdmin?: boolean
  imageToVideoModel?: string
  onImageToVideoModelChange?: (model: string) => void
  isModelEnabled?: (model: string) => boolean
  // Edit props
  onContentChange?: (newContent: string) => void | Promise<void>
  generationId?: string | null // ID of the generation to update in database
  isAuthenticated?: boolean
}

export function ProgressiveResponse({ 
  content, 
  className = "", 
  responseStyle = "detailed", 
  onShowMore,
  onShowPrevious,
  audioUrl,
  isGeneratingAudio = false,
  audioError,
  onGenerateAudio,
  onConvertToVideo,
  prompt,
  model,
  isAdmin = false,
  imageToVideoModel = 'gen4_turbo',
  onImageToVideoModelChange,
  isModelEnabled = () => true,
  onContentChange,
  generationId,
  isAuthenticated = true
}: ProgressiveResponseProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [detailedContent, setDetailedContent] = useState<string>("")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState<string>("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [hasPreviousResponse, setHasPreviousResponse] = useState(false)
  const [wasExpandedBeforeEdit, setWasExpandedBeforeEdit] = useState(false)
  const [originalContentHeight, setOriginalContentHeight] = useState<number | null>(null)
  const [selectedText, setSelectedText] = useState<string>("")
  const [selectionStart, setSelectionStart] = useState<number>(0)
  const [selectionEnd, setSelectionEnd] = useState<number>(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const responseRef = useRef<HTMLDivElement>(null)
  const contentDisplayRef = useRef<HTMLDivElement>(null)
  
  // Auto-resize textarea to fit content
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      // Use original height if available, otherwise calculate from content
      const targetHeight = originalContentHeight 
        ? Math.max(originalContentHeight, textareaRef.current.scrollHeight)
        : Math.max(200, textareaRef.current.scrollHeight)
      
      // Set height immediately to prevent layout shift
      textareaRef.current.style.height = `${targetHeight}px`
      
      // Then adjust if content is taller
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
          const contentHeight = textareaRef.current.scrollHeight
          const finalHeight = originalContentHeight 
            ? Math.max(originalContentHeight, contentHeight)
            : Math.max(200, contentHeight)
          textareaRef.current.style.height = `${finalHeight}px`
        }
      })
    }
  }, [isEditing, editedContent, originalContentHeight])
  
  // Track if we just finished editing to prevent state resets
  const justFinishedEditingRef = useRef(false)
  
  // When content prop changes and we're not editing, ensure we have the latest
  // This handles cases where content is updated after save
  useEffect(() => {
    if (!isEditing && content) {
      // Content was updated externally (e.g., after save) - reset any stale edit state
      // But don't reset if we just finished editing (to preserve display state)
      if (!justFinishedEditingRef.current) {
        setEditedContent("")
      } else {
        // Reset the flag after handling the post-save update
        justFinishedEditingRef.current = false
      }
    }
  }, [content, isEditing])
  
  // Preserve expanded state after edit - separate effect to avoid re-triggering
  // This is a backup in case immediate state preservation in handleSaveEdit didn't work
  useEffect(() => {
    if (!isEditing && wasExpandedBeforeEdit) {
      setIsExpanded(true)
      setWasExpandedBeforeEdit(false)
    }
  }, [isEditing, wasExpandedBeforeEdit])
  
  // Check if there are previous "generate more" responses when generationId changes
  // Use a ref to track the last checked generationId to prevent unnecessary re-fetches
  const lastCheckedGenerationIdRef = useRef<string | null>(null)
  
  useEffect(() => {
    const checkForPreviousResponse = async () => {
      // Only check if we haven't checked this generationId before
      if (generationId && onShowPrevious && generationId !== lastCheckedGenerationIdRef.current) {
        lastCheckedGenerationIdRef.current = generationId
        
        try {
          // Import supabase client dynamically
          const { supabase } = await import('@/lib/supabase-client')
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            const threadResponse = await fetch(`/api/generations/thread?id=${generationId}`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            })
            
            if (threadResponse.ok) {
              const threadData = await threadResponse.json()
              const thread = threadData.thread || []
              
              // Check if there are any child generations (generate more responses)
              if (thread.length > 1) {
                const children = thread.slice(1)
                const hasChildren = children.some((c: any) => c.output && c.output.trim().length > 0)
                setHasPreviousResponse(hasChildren)
              } else {
                setHasPreviousResponse(false)
              }
            }
          }
        } catch (error) {
          console.error('Error checking for previous response:', error)
          setHasPreviousResponse(false)
        }
      } else if (!generationId) {
        setHasPreviousResponse(false)
        lastCheckedGenerationIdRef.current = null
      }
    }
    
    checkForPreviousResponse()
    // Only depend on generationId, not onShowPrevious to avoid re-running when parent re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationId])
  
  // Save media state
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const audioRef = useRef<HTMLAudioElement>(null)

  const normalizeText = useCallback((text: string) => {
    if (!text) return ""

    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // bold
      .replace(/__([^_]+)__/g, '$1')   // underline style
      .replace(/\*(.*?)\*/g, '$1')     // italics / bullets
      .replace(/`{1,2}(.*?)`{1,2}/g, '$1') // inline code/backticks
      .replace(/---/g, '\n\n')         // horizontal rule style -> blank line
      .replace(/\[(.*?)\]/g, '$1')     // bracket placeholders
      .replace(/\]/g, '')              // stray closing brackets
      .replace(/[ \t]{2,}/g, ' ')      // collapse repeated spaces/tabs but keep newlines
      .replace(/\n{3,}/g, '\n\n')      // limit consecutive blank lines
      .trim()
  }, [])

  const extractParagraphs = useCallback((text: string) => {
    if (!text) return []

    const normalized = text.replace(/\r\n/g, '\n')
    let paragraphs = normalized.split('\n\n').map(p => p.trim()).filter(Boolean)

    if (paragraphs.length <= 1) {
      paragraphs = normalized.split('\n').map(p => p.trim()).filter(Boolean)
    }

    if (paragraphs.length <= 1) {
      const sentences = normalized.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
      paragraphs = sentences.map(sentence => sentence.endsWith('.') || sentence.endsWith('!') || sentence.endsWith('?')
        ? sentence
        : `${sentence}.`)
    }

    return paragraphs
      .map(paragraph => normalizeText(paragraph))
      .filter(paragraph => paragraph.length > 0)
  }, [normalizeText])

  const previousContentRef = useRef<string>("")

  // Removed auto-scroll - user stays at top of response during generation
  // Auto-scroll disabled to allow user to stay at top while text generates
  useEffect(() => {
    if (!content) {
      previousContentRef.current = ""
      return
    }

    previousContentRef.current = content
    // Scroll disabled - user controls their own scroll position
  }, [content])

  // Split content into concise and detailed parts
  const { concisePart, detailedPart } = useMemo(() => {
    // NEVER truncate image/video/audio responses - they need the full URL
    // Remove IMAGE_DISPLAY, VIDEO_DISPLAY, and AUDIO_DISPLAY tags from displayed text but keep for extraction
    let displayContent = content;
    if (content.includes('[IMAGE_DISPLAY:')) {
      // Remove the IMAGE_DISPLAY tag from the text
      displayContent = displayContent.replace(/\[IMAGE_DISPLAY:[^\]]+\]/g, '').trim();
    }
    if (content.includes('[VIDEO_DISPLAY:')) {
      // Remove the VIDEO_DISPLAY tag from the text
      displayContent = displayContent.replace(/\[VIDEO_DISPLAY:[^\]]+\]/g, '').trim();
    }
    if (content.includes('[AUDIO_DISPLAY:')) {
      // Remove the AUDIO_DISPLAY tag from the text
      displayContent = displayContent.replace(/\[AUDIO_DISPLAY:[^\]]+\]/g, '').trim();
    }
    
    if (content.includes('[IMAGE_DISPLAY:') || content.includes('[VIDEO_DISPLAY:') || content.includes('[AUDIO_DISPLAY:') || content.includes('[AiO Image Generated]') || content.includes('Image URL:')) {
      return { concisePart: displayContent, detailedPart: null }
    }
    
    // For concise mode, always show 1-2 complete sentences
    if (responseStyle === "concise") {
      // Split by sentence endings (. ! ?) but keep the punctuation
      const sentenceRegex = /([^.!?]*[.!?]+)/g
      const sentences = content.match(sentenceRegex) || []

      if (sentences.length <= 2) {
        // If response is short (1-2 sentences), show everything
        return { concisePart: content, detailedPart: null }
      } else {
        // Show first 1-2 complete sentences
        const sentencesToShow = Math.min(2, sentences.length)
        const conciseText = sentences.slice(0, sentencesToShow).join(' ').trim()
        const detailedText = sentences.slice(sentencesToShow).join(' ').trim()

        return { 
          concisePart: conciseText, 
          detailedPart: detailedText || null 
        }
      }
    }
    
    // For detailed mode, show everything
    return { concisePart: content, detailedPart: null }
  }, [content, responseStyle])

  const normalizedConcise = useMemo(
    () => normalizeText(concisePart || ""),
    [concisePart, normalizeText]
  )

  const handleCopy = async () => {
    try {
      // Use expanded content if available, otherwise use original content
      const textToCopy = isExpanded && detailedContent 
        ? `${concisePart}\n\n${detailedContent}` 
        : content
      
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleExportPDF = async () => {
    try {
      // Get prompt from URL or current input if available
      const urlParams = new URLSearchParams(window.location.search)
      const promptText = urlParams.get('prompt') || prompt || ''
      
      // Use expanded content if available, otherwise use original content
      const rawContent = isExpanded && detailedContent 
        ? `${concisePart}\n\n${detailedContent}` 
        : content
      
      // Strip HTML tags and convert to plain text
      let cleanContent = rawContent
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
        .replace(/&amp;/g, '&') // Replace HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
      
      // Normalize markdown formatting and extract paragraphs
      const paragraphs = extractParagraphs(cleanContent)
      
      // Join paragraphs with double line breaks for proper formatting
      const contentToExport = paragraphs.length > 0
        ? paragraphs.join('\n\n')
        : normalizeText(cleanContent)
      
      // Generate PDF export URL with clean, formatted text (no prompt - only response)
      const pdfUrl = `/api/export-pdf?response=${encodeURIComponent(contentToExport)}&timestamp=${encodeURIComponent(new Date().toISOString())}`
      
      // Fetch the PDF as a blob
      const response = await fetch(pdfUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'infinito-response.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download PDF:', error)
    }
  }

  const handleShowMore = async () => {
    if (!onShowMore) return
    
    setIsLoadingMore(true)
    try {
      // Extract the main topic from the concise part
      const topic = concisePart.replace(/[.!?]+$/, '').trim()
      const detailedResponse = await onShowMore(topic)
      setDetailedContent(detailedResponse)
      setIsExpanded(true)
    } catch (error) {
      console.error('Failed to get detailed response:', error)
      setDetailedContent("Sorry, I couldn't load more details. Please try asking a follow-up question.")
      setIsExpanded(true)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Helper function to apply AI transformation to selected text or full content
  const applyAITransformation = async (
    transformation: string,
    textToTransform: string,
    prompt: string,
    temperature: number = 0.7,
    maxTokens: number = 2000
  ) => {
    try {
      const { supabase } = await import('@/lib/supabase-client')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return null
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt: `${transformation}: ${textToTransform}`,
          mode: 'gpt-4o-mini',
          temperature,
          max_tokens: maxTokens
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.output || data.response || ''
      }
      return null
    } catch (error) {
      console.error('Failed to apply AI transformation:', error)
      return null
    }
  }

  const handleStartEdit = () => {
    // Capture the height of the content display before switching to edit mode
    if (contentDisplayRef.current) {
      const height = contentDisplayRef.current.offsetHeight
      setOriginalContentHeight(height)
      console.log('📏 [EDIT] Captured original content height:', height)
    }
    
    // Prepare readable text for editing using the same formatting as display
    const formattedParagraphs = extractParagraphs(detailedContent || detailedPart || content)
    const editableText = formattedParagraphs.length > 0
      ? formattedParagraphs.join('\n\n')
      : normalizeText(content)

    setEditedContent(editableText)
    // Reset selection
    setSelectedText("")
    setSelectionStart(0)
    setSelectionEnd(0)
    // Remember if content was expanded before editing
    setWasExpandedBeforeEdit(isExpanded)
    setIsEditing(true)
    console.log('✏️ [EDIT] Starting edit. Content length:', content.length, 'Was expanded:', isExpanded)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedContent("")
    // Reset original height after cancel
    setTimeout(() => {
      setOriginalContentHeight(null)
    }, 300)
  }

  const handleSaveEdit = async () => {
    if (!editedContent.trim()) {
      alert('Content cannot be empty')
      return
    }

    setIsSavingEdit(true)
    try {
      console.log('💾 [EDIT] Starting save. Generation ID:', generationId, 'Content length:', editedContent.length)
      
      // Save to database if generationId is provided
      if (generationId) {
        // Import supabase client dynamically
        const { supabase } = await import('@/lib/supabase-client')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          console.error('❌ [EDIT] No session found')
          throw new Error('Authentication required. Please refresh the page.')
        }
        
        // Fetch the thread to get root and all children
        console.log('🔄 [EDIT] Fetching thread to check for child generations...')
        const threadResponse = await fetch(`/api/generations/thread?id=${generationId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        let threadData = null
        if (threadResponse.ok) {
          threadData = await threadResponse.json()
          console.log('📋 [EDIT] Thread fetched. Found', threadData.thread?.length || 0, 'generations in thread')
        }
        
        // If we have a thread with multiple generations, replace ALL content in root and delete/clear children
        if (threadData && threadData.thread && threadData.thread.length > 1) {
          console.log('🔀 [EDIT] Multiple generations in thread. Replacing all with edited content...')
          
          const rootGen = threadData.thread[0]
          const childGens = threadData.thread.slice(1)
          
          // Update root generation with the FULL edited content (user wants to replace everything)
          console.log('💾 [EDIT] Updating root generation with full edited content...')
          const rootResponse = await fetch(`/api/generations/${rootGen.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ output: editedContent })
          })
          
          if (!rootResponse.ok) {
            const errorData = await rootResponse.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to update root generation')
          }
          
          // Delete child generations since user wants to replace everything with edited content
          console.log('🗑️ [EDIT] Deleting child generations...')
          for (const child of childGens) {
            try {
              const deleteResponse = await fetch(`/api/generations/${child.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`
                }
              })
              
              if (!deleteResponse.ok) {
                console.warn(`⚠️ [EDIT] Failed to delete child ${child.id}`)
              } else {
                console.log(`✅ [EDIT] Deleted child ${child.id}`)
              }
            } catch (err) {
              console.warn(`⚠️ [EDIT] Failed to delete child ${child.id}:`, err)
            }
          }
          
          console.log('✅ [EDIT] Root updated with full content, children deleted')
        } else {
          // Single generation - simple update
          console.log('✅ [EDIT] Single generation. Updating directly...')
          const response = await fetch(`/api/generations/${generationId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ output: editedContent })
          })

          console.log('📡 [EDIT] Response status:', response.status, response.ok)
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ [EDIT] Save failed:', errorData)
            throw new Error(errorData.error || 'Failed to save changes')
          }
          
          const responseData = await response.json().catch(() => ({}))
          console.log('✅ [EDIT] Save successful. Response:', responseData)
        }
      } else {
        console.warn('⚠️ [EDIT] No generationId provided. Skipping database save.')
      }

      // IMPORTANT: Update parent state BEFORE closing edit mode
      // This ensures the content prop updates immediately to reflect the edited text
      if (onContentChange) {
        console.log('🔄 [EDIT] Calling onContentChange callback with edited content. Length:', editedContent.length)
        await onContentChange(editedContent)
        console.log('✅ [EDIT] onContentChange completed. Parent state should now be updated.')
      } else {
        console.warn('⚠️ [EDIT] No onContentChange callback provided')
      }

      // Clear any expanded content since we've replaced everything with the edited content
      setDetailedContent("")
      
      // Preserve expanded state IMMEDIATELY (don't wait for useEffect)
      // For detailed mode, isExpanded doesn't affect display, but we preserve it anyway
      // for consistency and in case responseStyle changes
      if (wasExpandedBeforeEdit) {
        setIsExpanded(true)
        setWasExpandedBeforeEdit(false)
      }
      
      // Set flag to prevent state reset when content prop updates
      justFinishedEditingRef.current = true

      // Close edit mode after state is updated
      setIsEditing(false)
      setEditedContent("")
      // Reset original height after save
      setTimeout(() => {
        setOriginalContentHeight(null)
      }, 300)
      console.log('✅ [EDIT] Edit saved successfully! Content should now show:', editedContent.substring(0, 50) + '...')
    } catch (error) {
      console.error('❌ [EDIT] Failed to save edit:', error)
      alert(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const hasDetailedContent = detailedPart && detailedPart.trim().length > 0
  const hasMediaContent = content.includes('[IMAGE_DISPLAY:') || content.includes('[VIDEO_DISPLAY:') || content.includes('[AUDIO_DISPLAY:')
  // Only show "Show More" for actual text content, not for media generation status messages
  // Check if content is a status message (starts with emoji or status text) or contains media
  const isStatusMessage = concisePart && /^(✅|❌|🎬|🖼️|🎵|Image loaded|Ready to|Ready!|Video|Audio|Generating|Processing)/i.test(concisePart.trim())
  const isTextResponse = !hasMediaContent && !isStatusMessage && concisePart && concisePart.trim().length > 0
  const shouldShowProgressive = responseStyle === "concise" && (hasDetailedContent || onShowMore) && isTextResponse

  // Audio control functions
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
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

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const downloadAudio = async () => {
    if (!audioUrl) return

    try {
      // Use API proxy to ensure proper filename
      const response = await fetch(`/api/download-audio?url=${encodeURIComponent(audioUrl)}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Infinito-Audio.mp3`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download audio:', error)
    }
  }

  const handleGenerateAudio = () => {
    if (!onGenerateAudio || !isAuthenticated) return
    
    // Use expanded content if available, otherwise use original content
    const textToGenerate = isExpanded && detailedContent 
      ? `${concisePart}\n\n${detailedContent}` 
      : content
    
    if (textToGenerate.length > 5000) {
      alert("Text must be less than 5000 characters for audio generation")
      return
    }

    onGenerateAudio(textToGenerate)
  }

  const handleSaveMedia = async (mediaUrl: string, mediaType: 'image' | 'video' | 'audio') => {
    // Use prompt if available, otherwise use a fallback based on media type and content
    const promptToSave = prompt || 
      (mediaType === 'audio' ? (content.slice(0, 100) || 'Audio generation') : 'Media generation')
    
    if (!promptToSave) {
      alert('Cannot save: No content information available')
      return
    }

    setIsSaving(true)
    setSaveStatus('saving')
    setSaveError(null)

    try {
      const response = await fetch('/api/generations/save-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaUrl,
          mediaType,
          prompt: promptToSave,
          model: model || (mediaType === 'image' ? 'image_gen' : mediaType === 'video' ? 'video_gen' : 'audio_gen')
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save media')
      }

      setSaveStatus('saved')
      console.log('Media saved successfully:', data)
      
      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)

    } catch (error: any) {
      console.error('Save media error:', error)
      setSaveStatus('error')
      setSaveError(error.message || 'Failed to save media')
      
      // Reset to idle after 5 seconds
      setTimeout(() => {
        setSaveStatus('idle')
        setSaveError(null)
      }, 5000)
    } finally {
      setIsSaving(false)
    }
  }

  // Debug logging removed to prevent console spam

  return (
    <div ref={responseRef} className={`aztec-panel backdrop-blur-md shadow-2xl shadow-cyan-500/20 p-3 sm:p-4 overflow-hidden ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-cyan-400 text-sm font-semibold">AI RESPONSE:</div>
          <div className="text-cyan-400/40 text-xs font-mono tracking-wider flex items-center gap-1">
            <span className="text-[10px]">∞</span>
            <span className="hidden sm:inline">INFINITO</span>
            <span className="text-[10px]">∞</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 w-full sm:w-auto">
          {/* Audio Controls - Only show for text responses */}
          {onGenerateAudio && !hasMediaContent && (
            <div className="flex items-center gap-1">
              {!audioUrl && !isGeneratingAudio && (
                <Button 
                  onClick={handleGenerateAudio}
                  variant="ghost" 
                  size="sm"
                  className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-7 sm:h-8 px-2 sm:px-3 disabled:opacity-40"
                  disabled={!isAuthenticated}
                >
                  <Volume2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="text-xs hidden sm:inline">Audio</span>
                </Button>
              )}
              
              {isGeneratingAudio && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  disabled
                  className="text-cyan-400 h-7 sm:h-8 px-2 sm:px-3"
                >
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1 animate-spin" />
                  <span className="text-xs hidden sm:inline">Generating...</span>
                </Button>
              )}
              
              {audioUrl && !isGeneratingAudio && (
                <>
                  {/* Media Controls */}
                  <div className="flex items-center gap-1">
                    <Button 
                      onClick={togglePlayPause}
                      variant="ghost" 
                      size="sm"
                      className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-7 sm:h-8 px-2"
                    >
                      {isPlaying ? <Pause className="h-3 w-3 sm:h-4 sm:w-4" /> : <Play className="h-3 w-3 sm:h-4 sm:w-4" />}
                    </Button>
                    <Button 
                      onClick={downloadAudio}
                      variant="ghost" 
                      size="sm"
                      className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-7 sm:h-8 px-2"
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button 
                      onClick={() => handleSaveMedia(audioUrl, 'audio')}
                      variant="ghost" 
                      size="sm"
                      disabled={isSaving || saveStatus === 'saved'}
                      className="text-green-400 hover:bg-green-400/10 hover:text-white transition-all h-7 sm:h-8 px-2 disabled:opacity-50"
                    >
                      {saveStatus === 'saving' ? (
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      ) : saveStatus === 'saved' ? (
                        <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                      ) : (
                        <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Divider */}
                  <div className="h-6 w-px bg-gray-600 mx-1"></div>
                  
                  {/* Document Actions */}
                  <div className="flex items-center gap-1">
                    {/* Empty for now - PDF and Copy are handled elsewhere */}
                  </div>
                </>
              )}
              
              {audioError && (
                <span className="text-red-400 text-xs">{audioError}</span>
              )}
            </div>
          )}
          
          {/* Download Button - Only show for image/video/audio */}
          {hasMediaContent && (
            <>
              <div className="h-6 w-px bg-gray-600 mx-1"></div>
              <Button 
                onClick={async () => {
                  try {
                    const imageMatch = content.match(/\[IMAGE_DISPLAY:(.*?)\]/);
                    const videoMatch = content.match(/\[VIDEO_DISPLAY:(.*?)\]/);
                    const audioMatch = content.match(/\[AUDIO_DISPLAY:(.*?)\]/);
                    
                    if (imageMatch) {
                      // Download image via API proxy using blob
                      const response = await fetch(`/api/download-image?url=${encodeURIComponent(imageMatch[1])}`);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Infinito Image.png`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } else if (videoMatch) {
                      // Download video
                      const response = await fetch(videoMatch[1]);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Infinito Video.mp4`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } else if (audioMatch) {
                      // Download audio via API proxy
                      const response = await fetch(`/api/download-audio?url=${encodeURIComponent(audioMatch[1])}`);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Infinito-Audio.mp3`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    }
                  } catch (error) {
                    console.error('Failed to download media:', error);
                  }
                }}
                variant="ghost" 
                size="sm"
                className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-7 sm:h-8 px-2 sm:px-3"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="text-xs hidden sm:inline">Download</span>
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Audio Element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
      
      {/* Edit Mode - Show textarea */}
      {isEditing ? (
        <div 
          className="border border-yellow-500/50 rounded p-3 sm:p-4 bg-black/30"
          style={{ 
            minHeight: originalContentHeight ? `${originalContentHeight + 60}px` : 'auto' // Add padding for header
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-yellow-400 text-sm font-semibold">Editing Response</span>
            <div className="flex gap-2">
              <Button
                onClick={handleCancelEdit}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white h-7 px-2"
                disabled={isSavingEdit}
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="text-xs hidden sm:inline">Cancel</span>
              </Button>
              <Button
                onClick={handleSaveEdit}
                variant="ghost"
                size="sm"
                className="text-green-400 hover:bg-green-400/10 hover:text-white h-7 px-2"
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1 animate-spin" />
                    <span className="text-xs hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="text-xs hidden sm:inline">Save</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onSelect={(e) => {
              const target = e.target as HTMLTextAreaElement
              const start = target.selectionStart
              const end = target.selectionEnd
              const selected = editedContent.substring(start, end)
              setSelectionStart(start)
              setSelectionEnd(end)
              setSelectedText(selected)
            }}
            className="w-full p-3 bg-black/50 border border-cyan-500/30 rounded text-gray-100 text-sm font-mono resize-none overflow-y-auto focus:outline-none focus:border-cyan-500"
            style={{
              minHeight: originalContentHeight ? `${originalContentHeight}px` : '200px',
              height: originalContentHeight ? `${originalContentHeight}px` : 'auto'
            }}
            placeholder="Edit your response here..."
          />
        </div>
      ) : (
        <div 
          ref={contentDisplayRef}
          className="text-gray-100 whitespace-pre-wrap break-words border border-cyan-500/20 rounded p-2 sm:p-3 bg-black/20 overflow-hidden"
          style={{ 
            minHeight: originalContentHeight && !isEditing ? `${originalContentHeight}px` : 'auto'
          }}
        >
          {/* Concise part - only show if progressive mode, otherwise handled below */}
          {shouldShowProgressive && normalizedConcise && (
            <div className="mb-3">
              {normalizedConcise}
            </div>
          )}
        
        {/* Display the generated image if present */}
        {(() => {
          const imageMatch = content.match(/\[IMAGE_DISPLAY:(.*?)\]/);
          const imageUrl = imageMatch ? imageMatch[1] : null;
          
          if (imageUrl) {
            const handleDownload = async () => {
              try {
                // Use API proxy to avoid CORS issues
                const response = await fetch(`/api/download-image?url=${encodeURIComponent(imageUrl)}`);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Infinito Image.png`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (error) {
                console.error('Failed to download image:', error);
              }
            };

            return (
              <div className="mb-4 p-2 sm:p-3 bg-black/10 rounded border border-cyan-500/30 overflow-hidden">
                {/* Admin-only Image-to-Video Model Selector */}
                {isAdmin && onImageToVideoModelChange && (
                  <div className="mb-3 p-2 bg-black/20 rounded border border-pink-500/30">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <span className="text-pink-400 text-xs font-semibold tracking-wide uppercase">Image-to-Video Model:</span>
                      <Select 
                        value={imageToVideoModel} 
                        onValueChange={onImageToVideoModelChange}
                      >
                        <SelectTrigger className="w-full sm:w-48 h-8 bg-transparent border-pink-500/50 text-pink-300 hover:border-pink-400 focus:border-pink-400 focus:ring-pink-400/50 text-xs font-mono uppercase tracking-wider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-pink-500/50 backdrop-blur-md max-h-[300px] overflow-y-auto">
                          {isModelEnabled('gen4_turbo') && <SelectItem value="gen4_turbo" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase text-xs">GEN-4 TURBO (I2V)</SelectItem>}
                          {isModelEnabled('gen3a_turbo') && <SelectItem value="gen3a_turbo" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase text-xs">GEN-3A TURBO (I2V)</SelectItem>}
                          {isModelEnabled('veo3.1') && <SelectItem value="veo3.1" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase text-xs">VEO 3.1 (T2V/I2V)</SelectItem>}
                          {isModelEnabled('veo3.1_fast') && <SelectItem value="veo3.1_fast" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase text-xs">VEO 3.1 FAST (T2V/I2V)</SelectItem>}
                          {isModelEnabled('veo3') && <SelectItem value="veo3" className="text-pink-300 hover:bg-pink-500/20 focus:bg-pink-500/20 font-mono uppercase text-xs">VEO 3 (T2V/I2V)</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="text-cyan-400 text-sm font-semibold">Generated Image:</div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                    >
                      <Download className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    {onConvertToVideo && (
                      <Button
                        onClick={() => onConvertToVideo(imageUrl)}
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs border-pink-500/50 text-pink-400 hover:bg-pink-500/10"
                      >
                        <Play className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Convert to Video</span>
                      </Button>
                    )}
                    <Button
                      onClick={() => handleSaveMedia(imageUrl, 'image')}
                      variant="outline"
                      size="sm"
                      disabled={isSaving || saveStatus === 'saved'}
                      className="h-7 px-2 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10 disabled:opacity-50"
                    >
                      {saveStatus === 'saving' ? (
                        <>
                          <Loader2 className="h-3 w-3 sm:mr-1 animate-spin" />
                          <span className="hidden sm:inline">Saving...</span>
                        </>
                      ) : saveStatus === 'saved' ? (
                        <>
                          <Check className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Saved!</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Save</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {saveError && (
                  <div className="text-red-400 text-xs mb-2 break-words">❌ {saveError}</div>
                )}
                <div className="flex justify-center overflow-hidden">
                  <img 
                    src={imageUrl} 
                    alt="Generated image" 
                    className="w-full max-w-full sm:max-w-[500px] h-auto max-h-[300px] sm:max-h-[500px] rounded-lg border border-cyan-500/50 object-contain"
                    onError={(e) => {
                      console.error('Failed to load image:', imageUrl);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => console.log('Image loaded successfully:', imageUrl)}
                  />
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Display the generated video if present */}
        {(() => {
          const videoMatch = content.match(/\[VIDEO_DISPLAY:(.*?)\]/);
          const videoUrl = videoMatch ? videoMatch[1] : null;
          
          if (videoUrl) {
            const handleDownloadVideo = async () => {
              try {
                const response = await fetch(videoUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Infinito Video.mp4`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (error) {
                console.error('Failed to download video:', error);
              }
            };

            return (
              <div className="mb-4 p-2 sm:p-3 bg-black/10 rounded border border-pink-500/30 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="text-pink-400 text-sm font-semibold">Generated Video:</div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <Button
                      onClick={handleDownloadVideo}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs border-pink-500/50 text-pink-400 hover:bg-pink-500/10"
                    >
                      <Download className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    <Button
                      onClick={() => handleSaveMedia(videoUrl, 'video')}
                      variant="outline"
                      size="sm"
                      disabled={isSaving || saveStatus === 'saved'}
                      className="h-7 px-2 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10 disabled:opacity-50"
                    >
                      {saveStatus === 'saving' ? (
                        <>
                          <Loader2 className="h-3 w-3 sm:mr-1 animate-spin" />
                          <span className="hidden sm:inline">Saving...</span>
                        </>
                      ) : saveStatus === 'saved' ? (
                        <>
                          <Check className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Saved!</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Save</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {saveError && (
                  <div className="text-red-400 text-xs mb-2 break-words">❌ {saveError}</div>
                )}
                <div className="flex justify-center overflow-hidden">
                  <video 
                    src={videoUrl} 
                    controls
                    autoPlay
                    loop
                    className="w-full max-w-full sm:max-w-[600px] h-auto max-h-[400px] sm:max-h-[600px] rounded-lg border border-pink-500/50"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Display the generated audio if present */}
        {(() => {
          const audioMatch = content.match(/\[AUDIO_DISPLAY:(.*?)\]/);
          const audioUrl = audioMatch ? audioMatch[1] : null;
          
          if (audioUrl) {
            const handleDownloadAudio = async () => {
              try {
                // Use API proxy to ensure proper filename
                const response = await fetch(`/api/download-audio?url=${encodeURIComponent(audioUrl)}`);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Infinito-Audio.mp3`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (error) {
                console.error('Failed to download audio:', error);
              }
            };

            return (
              <div className="mb-4 p-2 sm:p-3 bg-black/10 rounded border border-green-500/30 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="text-green-400 text-sm font-semibold">Generated Audio:</div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <Button
                      onClick={handleDownloadAudio}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10"
                    >
                      <Download className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    <Button
                      onClick={() => handleSaveMedia(audioUrl, 'audio')}
                      variant="outline"
                      size="sm"
                      disabled={isSaving || saveStatus === 'saved'}
                      className="h-7 px-2 text-xs border-green-500/50 text-green-400 hover:bg-green-500/10 disabled:opacity-50"
                    >
                      {saveStatus === 'saving' ? (
                        <>
                          <Loader2 className="h-3 w-3 sm:mr-1 animate-spin" />
                          <span className="hidden sm:inline">Saving...</span>
                        </>
                      ) : saveStatus === 'saved' ? (
                        <>
                          <Check className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Saved!</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3 w-3 sm:mr-1" />
                          <span className="hidden sm:inline">Save</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {saveError && (
                  <div className="text-red-400 text-xs mb-2 break-words">❌ {saveError}</div>
                )}
                <div className="flex justify-center overflow-hidden">
                  <div className="w-full max-w-full sm:max-w-[500px] flex flex-col items-center justify-center py-8 bg-green-500/10 rounded-lg border border-green-500/30">
                    <div className="text-green-400 text-6xl mb-4">🎵</div>
                    <audio 
                      src={audioUrl} 
                      controls
                      className="w-full max-w-md"
                    >
                      Your browser does not support the audio tag.
                    </audio>
                    <p className="text-gray-400 text-sm mt-2">Click play to listen to the generated audio</p>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}
        
        {/* Detailed part - either from content or from API call */}
        {shouldShowProgressive && (
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="pt-2 border-t border-cyan-500/20">
              {/* Format the detailed content with proper paragraphs */}
              {(() => {
                const contentToRender = detailedContent || detailedPart
                if (!contentToRender) return null

                const paragraphs = extractParagraphs(contentToRender)

                return paragraphs.map((paragraph, index) => (
                  <div key={index} className="mb-4 p-3 bg-black/10 rounded border-l-2 border-cyan-500/30">
                    {paragraph}
                  </div>
                ))
              })()}
              
              {/* Action buttons at the BOTTOM of detailed content */}
              <div className="flex justify-end items-center gap-2 mt-4 pt-3 border-t border-cyan-500/20">
                {/* Audio Button */}
                {onGenerateAudio && !audioUrl && !isGeneratingAudio && (
                  <Button 
                    onClick={handleGenerateAudio}
                    variant="ghost" 
                    size="sm"
                    className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-7 px-3 text-xs"
                  >
                    <Volume2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Audio
                  </Button>
                )}
                
                {/* PDF Button */}
                <Button 
                  onClick={handleExportPDF}
                  variant="ghost" 
                  size="sm"
                  className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-7 px-3 text-xs"
                >
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  PDF
                </Button>
                
                {/* Copy Button */}
                <Button
                  onClick={async () => {
                    try {
                      const contentToCopy = detailedContent || detailedPart || ""
                      await navigator.clipboard.writeText(contentToCopy)
                      // Show brief feedback
                      const btn = document.activeElement as HTMLButtonElement
                      if (btn) {
                        const originalText = btn.innerHTML
                        btn.innerHTML = '<span class="text-xs">Copied!</span>'
                        setTimeout(() => { btn.innerHTML = originalText }, 1000)
                      }
                    } catch (err) {
                      console.error('Failed to copy detailed content:', err)
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-7 px-3 text-xs"
                >
                  <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Show the full content if not in progressive mode or if expanded (but not for media content) */}
        {!shouldShowProgressive && !hasMediaContent && (
          <div className="pt-2 border-t border-cyan-500/20">
            {/* Format the full content with proper paragraphs */}
            {extractParagraphs(content).map((paragraph, index) => (
              <div key={index} className="mb-4 p-3 bg-black/10 rounded border-l-2 border-cyan-500/30">
                {paragraph}
              </div>
            ))}
          </div>
        )}
        
        {/* Expand/Collapse buttons */}
        {shouldShowProgressive && (
          <div className="mt-3 pt-2 border-t border-cyan-500/20 flex items-center gap-2">
            {onShowPrevious && hasPreviousResponse && (
              <Button
                onClick={async () => {
                  if (onShowPrevious) {
                    await onShowPrevious()
                  }
                }}
                variant="ghost"
                size="sm"
                className="text-purple-400 hover:bg-purple-400/10 hover:text-white transition-all h-8 px-3"
              >
                <span className="text-xs">Show Previous</span>
              </Button>
            )}
            <Button
              onClick={isExpanded ? () => setIsExpanded(false) : handleShowMore}
              variant="ghost"
              size="sm"
              className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-8 px-3"
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  <span className="text-xs">Processing...</span>
                </>
              ) : isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  <span className="text-xs">Show Less</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  <span className="text-xs">Show More</span>
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Toolbar 1: PDF, Copy, Edit - Only for text responses */}
        {!hasMediaContent && !isEditing && (
          <div className="mt-4 pt-3 border-t border-cyan-500/20 flex flex-wrap items-center gap-2">
            <Button 
              onClick={handleExportPDF}
              variant="ghost" 
              size="sm"
              className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-8 px-3"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              <span className="text-xs">PDF</span>
            </Button>
            
            <Button 
              onClick={handleCopy}
              variant="ghost" 
              size="sm"
              className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-8 px-3"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Copy</span>
                </>
              )}
            </Button>
            
            {onContentChange && (
              <Button 
                onClick={handleStartEdit}
                variant="ghost" 
                size="sm"
                className="text-yellow-400 hover:bg-yellow-400/10 hover:text-white transition-all h-8 px-3"
              >
                <Edit2 className="h-4 w-4 mr-1.5" />
                <span className="text-xs">Edit</span>
              </Button>
            )}
          </div>
        )}
        
        {/* Toolbar 2: Text Formatting & AI Tools - Show for text responses (including edit mode) */}
        {!hasMediaContent && onContentChange && (
          <div className="mt-2 pt-2 border-t border-gray-600/30 flex flex-wrap items-center gap-1.5">
            {/* Text Formatting Tools */}
            <div className="flex items-center gap-1 pr-2 border-r border-gray-600/30">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:bg-gray-700/50 hover:text-white h-7 px-2"
                disabled={!isEditing}
                onClick={() => {
                  if (!isEditing || !textareaRef.current) return
                  
                  const textarea = textareaRef.current
                  const start = textarea.selectionStart
                  const end = textarea.selectionEnd
                  const selectedText = editedContent.substring(start, end)
                  
                  if (!selectedText.trim()) {
                    // No selection - insert bold markers at cursor
                    const newContent = editedContent.substring(0, start) + 
                                      '**bold text**' + 
                                      editedContent.substring(end)
                    setEditedContent(newContent)
                    setTimeout(() => {
                      if (textareaRef.current) {
                        const newPos = start + 2 // Position after **
                        textareaRef.current.setSelectionRange(newPos, newPos + 9) // Select "bold text"
                        textareaRef.current.focus()
                      }
                    }, 0)
                  } else {
                    // Wrap selected text in **
                    // Check if already bold
                    const isAlreadyBold = editedContent.substring(Math.max(0, start - 2), end + 2) === `**${selectedText}**`
                    
                    if (isAlreadyBold) {
                      // Remove bold formatting
                      const newContent = editedContent.substring(0, start - 2) + 
                                        selectedText + 
                                        editedContent.substring(end + 2)
                      setEditedContent(newContent)
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.setSelectionRange(start - 2, start - 2 + selectedText.length)
                          textareaRef.current.focus()
                        }
                      }, 0)
                    } else {
                      // Add bold formatting
                      const newContent = editedContent.substring(0, start) + 
                                        `**${selectedText}**` + 
                                        editedContent.substring(end)
                      setEditedContent(newContent)
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.setSelectionRange(start, start + selectedText.length + 4)
                          textareaRef.current.focus()
                        }
                      }, 0)
                    }
                  }
                }}
                title={isEditing && selectedText.trim() ? "Make bold (B)" : "Bold (Select text in edit mode)"}
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:bg-gray-700/50 hover:text-white h-7 px-2"
                disabled={!isEditing}
                onClick={() => {
                  if (!isEditing || !textareaRef.current) return
                  
                  const textarea = textareaRef.current
                  const start = textarea.selectionStart
                  const end = textarea.selectionEnd
                  const selectedText = editedContent.substring(start, end)
                  
                  if (!selectedText.trim()) {
                    // No selection - insert italic markers at cursor
                    const newContent = editedContent.substring(0, start) + 
                                      '*italic text*' + 
                                      editedContent.substring(end)
                    setEditedContent(newContent)
                    setTimeout(() => {
                      if (textareaRef.current) {
                        const newPos = start + 1 // Position after *
                        textareaRef.current.setSelectionRange(newPos, newPos + 12) // Select "italic text"
                        textareaRef.current.focus()
                      }
                    }, 0)
                  } else {
                    // Wrap selected text in *
                    // Check if already italic
                    const isAlreadyItalic = editedContent.substring(Math.max(0, start - 1), end + 1) === `*${selectedText}*`
                    
                    if (isAlreadyItalic) {
                      // Remove italic formatting
                      const newContent = editedContent.substring(0, start - 1) + 
                                        selectedText + 
                                        editedContent.substring(end + 1)
                      setEditedContent(newContent)
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.setSelectionRange(start - 1, start - 1 + selectedText.length)
                          textareaRef.current.focus()
                        }
                      }, 0)
                    } else {
                      // Add italic formatting
                      const newContent = editedContent.substring(0, start) + 
                                        `*${selectedText}*` + 
                                        editedContent.substring(end)
                      setEditedContent(newContent)
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.setSelectionRange(start, start + selectedText.length + 2)
                          textareaRef.current.focus()
                        }
                      }, 0)
                    }
                  }
                }}
                title={isEditing && selectedText.trim() ? "Make italic (I)" : "Italic (Select text in edit mode)"}
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:bg-gray-700/50 hover:text-white h-7 px-2"
                disabled={!isEditing}
                onClick={() => {
                  if (!isEditing || !textareaRef.current) return
                  
                  const textarea = textareaRef.current
                  const start = textarea.selectionStart
                  const end = textarea.selectionEnd
                  const selectedText = editedContent.substring(start, end)
                  
                  if (!selectedText.trim()) {
                    // No selection - insert underline markers at cursor
                    const newContent = editedContent.substring(0, start) + 
                                      '<u>underlined text</u>' + 
                                      editedContent.substring(end)
                    setEditedContent(newContent)
                    setTimeout(() => {
                      if (textareaRef.current) {
                        const newPos = start + 3 // Position after <u>
                        textareaRef.current.setSelectionRange(newPos, newPos + 16) // Select "underlined text"
                        textareaRef.current.focus()
                      }
                    }, 0)
                  } else {
                    // Wrap selected text in <u></u>
                    // Check if already underlined
                    const isAlreadyUnderlined = editedContent.substring(Math.max(0, start - 3), end + 4) === `<u>${selectedText}</u>`
                    
                    if (isAlreadyUnderlined) {
                      // Remove underline formatting
                      const newContent = editedContent.substring(0, start - 3) + 
                                        selectedText + 
                                        editedContent.substring(end + 4)
                      setEditedContent(newContent)
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.setSelectionRange(start - 3, start - 3 + selectedText.length)
                          textareaRef.current.focus()
                        }
                      }, 0)
                    } else {
                      // Add underline formatting
                      const newContent = editedContent.substring(0, start) + 
                                        `<u>${selectedText}</u>` + 
                                        editedContent.substring(end)
                      setEditedContent(newContent)
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.setSelectionRange(start, start + selectedText.length + 7)
                          textareaRef.current.focus()
                        }
                      }, 0)
                    }
                  }
                }}
                title={isEditing && selectedText.trim() ? "Make underlined (U)" : "Underline (Select text in edit mode)"}
              >
                <Underline className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:bg-gray-700/50 hover:text-white h-7 px-2"
                disabled={!isEditing}
                onClick={() => {
                  if (!isEditing || !textareaRef.current) return
                  
                  const textarea = textareaRef.current
                  const start = textarea.selectionStart
                  const end = textarea.selectionEnd
                  const selectedText = editedContent.substring(start, end)
                  
                  if (!selectedText.trim()) {
                    // No selection - insert list item
                    const newContent = editedContent.substring(0, start) + 
                                      '- List item' + 
                                      editedContent.substring(end)
                    setEditedContent(newContent)
                    setTimeout(() => {
                      if (textareaRef.current) {
                        const newPos = start + 2 // Position after "- "
                        textareaRef.current.setSelectionRange(newPos, newPos + 9) // Select "List item"
                        textareaRef.current.focus()
                      }
                    }, 0)
                  } else {
                    // Convert selected text to list items (split by lines)
                    const lines = selectedText.split('\n').filter(line => line.trim())
                    const listItems = lines.map(line => `- ${line.trim()}`).join('\n')
                    
                    const newContent = editedContent.substring(0, start) + 
                                      listItems + 
                                      editedContent.substring(end)
                    setEditedContent(newContent)
                    
                    // Select the converted list
                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.setSelectionRange(start, start + listItems.length)
                        textareaRef.current.focus()
                      }
                    }, 0)
                  }
                }}
                title={isEditing && selectedText.trim() ? "Convert to list" : "List (Select text in edit mode)"}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            {/* AI Tools */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-purple-400 hover:bg-purple-400/10 hover:text-white h-7 px-2"
                onClick={async () => {
                  const textToTransform = isEditing 
                    ? (selectedText.trim() || editedContent)
                    : content
                  
                  if (!textToTransform.trim()) return
                  
                  const transformed = await applyAITransformation(
                    'Improve and enhance the following text while keeping its meaning',
                    textToTransform,
                    prompt || '',
                    0.7,
                    2000
                  )
                  
                  if (transformed && transformed.trim()) {
                    if (isEditing && selectedText.trim() && textareaRef.current) {
                      // Replace selected text
                      const newContent = editedContent.substring(0, selectionStart) + 
                                        transformed.trim() + 
                                        editedContent.substring(selectionEnd)
                      setEditedContent(newContent)
                      // Clear selection
                      setSelectedText("")
                      // Set cursor after replaced text
                      setTimeout(() => {
                        if (textareaRef.current) {
                          const newPos = selectionStart + transformed.trim().length
                          textareaRef.current.setSelectionRange(newPos, newPos)
                        }
                      }, 0)
                    } else if (isEditing) {
                      // Replace entire content
                      setEditedContent(transformed.trim())
                    } else {
                      // Update main content
                      await onContentChange(transformed.trim())
                    }
                  }
                }}
                title={isEditing && selectedText.trim() ? `Improve selected text (${selectedText.length} chars)` : "Improve entire response with AI"}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs hidden sm:inline">Improve</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-400 hover:bg-blue-400/10 hover:text-white h-7 px-2"
                onClick={async () => {
                  const textToTransform = isEditing 
                    ? (selectedText.trim() || editedContent)
                    : content
                  
                  if (!textToTransform.trim()) return
                  
                  const transformed = await applyAITransformation(
                    'Expand and add more detail to the following text',
                    textToTransform,
                    prompt || '',
                    0.7,
                    2000
                  )
                  
                  if (transformed && transformed.trim()) {
                    if (isEditing && selectedText.trim() && textareaRef.current) {
                      // Replace selected text
                      const newContent = editedContent.substring(0, selectionStart) + 
                                        transformed.trim() + 
                                        editedContent.substring(selectionEnd)
                      setEditedContent(newContent)
                      setSelectedText("")
                      setTimeout(() => {
                        if (textareaRef.current) {
                          const newPos = selectionStart + transformed.trim().length
                          textareaRef.current.setSelectionRange(newPos, newPos)
                        }
                      }, 0)
                    } else if (isEditing) {
                      setEditedContent(transformed.trim())
                    } else {
                      await onContentChange(transformed.trim())
                    }
                  }
                }}
                title={isEditing && selectedText.trim() ? `Expand selected text (${selectedText.length} chars)` : "Expand entire response with AI"}
              >
                <ArrowUp className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs hidden sm:inline">Expand</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-green-400 hover:bg-green-400/10 hover:text-white h-7 px-2"
                onClick={async () => {
                  const textToTransform = isEditing 
                    ? (selectedText.trim() || editedContent)
                    : content
                  
                  if (!textToTransform.trim()) return
                  
                  const transformed = await applyAITransformation(
                    'Summarize the following text concisely',
                    textToTransform,
                    prompt || '',
                    0.5,
                    500
                  )
                  
                  if (transformed && transformed.trim()) {
                    if (isEditing && selectedText.trim() && textareaRef.current) {
                      // Replace selected text
                      const newContent = editedContent.substring(0, selectionStart) + 
                                        transformed.trim() + 
                                        editedContent.substring(selectionEnd)
                      setEditedContent(newContent)
                      setSelectedText("")
                      setTimeout(() => {
                        if (textareaRef.current) {
                          const newPos = selectionStart + transformed.trim().length
                          textareaRef.current.setSelectionRange(newPos, newPos)
                        }
                      }, 0)
                    } else if (isEditing) {
                      setEditedContent(transformed.trim())
                    } else {
                      await onContentChange(transformed.trim())
                    }
                  }
                }}
                title={isEditing && selectedText.trim() ? `Summarize selected text (${selectedText.length} chars)` : "Summarize entire response with AI"}
              >
                <ArrowDown className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs hidden sm:inline">Summarize</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-yellow-400 hover:bg-yellow-400/10 hover:text-white h-7 px-2"
                onClick={async () => {
                  const textToTransform = isEditing 
                    ? (selectedText.trim() || editedContent)
                    : content
                  
                  if (!textToTransform.trim()) return
                  
                  const transformed = await applyAITransformation(
                    'Rewrite the following text in a different style while keeping the same meaning',
                    textToTransform,
                    prompt || '',
                    0.8,
                    2000
                  )
                  
                  if (transformed && transformed.trim()) {
                    if (isEditing && selectedText.trim() && textareaRef.current) {
                      // Replace selected text
                      const newContent = editedContent.substring(0, selectionStart) + 
                                        transformed.trim() + 
                                        editedContent.substring(selectionEnd)
                      setEditedContent(newContent)
                      setSelectedText("")
                      setTimeout(() => {
                        if (textareaRef.current) {
                          const newPos = selectionStart + transformed.trim().length
                          textareaRef.current.setSelectionRange(newPos, newPos)
                        }
                      }, 0)
                    } else if (isEditing) {
                      setEditedContent(transformed.trim())
                    } else {
                      await onContentChange(transformed.trim())
                    }
                  }
                }}
                title={isEditing && selectedText.trim() ? `Rewrite selected text (${selectedText.length} chars)` : "Rewrite entire response with AI"}
              >
                <Zap className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs hidden sm:inline">Rewrite</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="text-pink-400 hover:bg-pink-400/10 hover:text-white h-7 px-2"
                onClick={async () => {
                  const textForTitle = isEditing ? editedContent : content
                  
                  if (!textForTitle.trim()) return
                  
                  // Remove existing title if present to get clean content (handles both ## and plain titles)
                  const contentWithoutTitle = textForTitle.replace(/^##?\s+.+\n\n/, '')
                  
                  // Generate a title based on the content
                  const generatedTitle = await applyAITransformation(
                    'Generate a concise, compelling title (5-10 words max) for the following text. Return ONLY the title, no explanation, no quotes, no colons, just the title text',
                    contentWithoutTitle.substring(0, 1000),
                    prompt || '',
                    0.9,
                    50
                  )
                  
                  if (generatedTitle && generatedTitle.trim()) {
                    // Clean up the title (remove quotes, extra spaces, prefixes)
                    let title = generatedTitle.trim()
                      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
                      .replace(/^Title:\s*/i, '') // Remove "Title:" prefix if present
                      .replace(/^#+\s*/, '') // Remove markdown headers if present
                      .replace(/^[-*]\s*/, '') // Remove list markers
                      .trim()
                    
                    // Format title without markdown (just title with spacing)
                    const formattedTitle = `${title}\n\n`
                    
                    if (isEditing) {
                      // Check if there's already a title at the start (with or without ##)
                      const hasExistingTitle = /^##?\s+.+\n\n/.test(editedContent)
                      
                      if (hasExistingTitle) {
                        // Replace existing title (handles both ## and plain titles)
                        const withoutTitle = editedContent.replace(/^##?\s+.+\n\n/, '')
                        setEditedContent(formattedTitle + withoutTitle)
                      } else {
                        // Add new title at the top
                        setEditedContent(formattedTitle + editedContent)
                      }
                      
                      // Scroll to top after adding title
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.scrollTop = 0
                        }
                      }, 100)
                    } else {
                      // Check if there's already a title (with or without ##)
                      const hasExistingTitle = /^##?\s+.+\n\n/.test(content)
                      
                      if (hasExistingTitle) {
                        // Replace existing title (handles both ## and plain titles)
                        const withoutTitle = content.replace(/^##?\s+.+\n\n/, '')
                        await onContentChange(formattedTitle + withoutTitle)
                      } else {
                        // Add new title at the top
                        await onContentChange(formattedTitle + content)
                      }
                    }
                  }
                }}
                title="Generate and add title at the top (click again for different title)"
              >
                <Heading className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs hidden sm:inline">Title</span>
              </Button>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  )
}
