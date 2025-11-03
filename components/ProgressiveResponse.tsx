"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp, Copy, Check, Loader2, Volume2, Play, Pause, Download, FileText, Save, Edit2, X } from "lucide-react"

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
  generationId
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const responseRef = useRef<HTMLDivElement>(null)
  
  // Auto-resize textarea to fit content
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      // Reset height to auto to get proper scrollHeight
      textareaRef.current.style.height = 'auto'
      // Set height based on content
      textareaRef.current.style.height = `${Math.max(200, textareaRef.current.scrollHeight)}px`
    }
  }, [isEditing, editedContent])
  
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

  // Auto-scroll to response when it first appears
  useEffect(() => {
    if (content && responseRef.current) {
      setTimeout(() => {
        responseRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
        
        // Additional scroll adjustment to ensure content is visible
        setTimeout(() => {
          const rect = responseRef.current?.getBoundingClientRect()
          if (rect && rect.bottom > window.innerHeight) {
            window.scrollBy({
              top: rect.bottom - window.innerHeight + 50,
              behavior: 'smooth'
            })
          }
        }, 300)
      }, 200)
    }
  }, [content])

  // Split content into concise and detailed parts
  const { concisePart, detailedPart } = useMemo(() => {
    console.log('🔍 [SPLIT] Splitting content. Length:', content?.length, 'Style:', responseStyle)
    
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
      console.log('🔍 [SPLIT] Media content, not splitting')
      return { concisePart: displayContent, detailedPart: null }
    }
    
    // For concise mode, always show 1-2 complete sentences
    if (responseStyle === "concise") {
      // Split by sentence endings (. ! ?) but keep the punctuation
      const sentenceRegex = /([^.!?]*[.!?]+)/g
      const sentences = content.match(sentenceRegex) || []
      
      console.log('🔍 [SPLIT] Concise mode. Total sentences:', sentences.length)
      
      if (sentences.length <= 2) {
        // If response is short (1-2 sentences), show everything
        console.log('🔍 [SPLIT] Short content, not splitting')
        return { concisePart: content, detailedPart: null }
      } else {
        // Show first 1-2 complete sentences
        const sentencesToShow = Math.min(2, sentences.length)
        const conciseText = sentences.slice(0, sentencesToShow).join(' ').trim()
        const detailedText = sentences.slice(sentencesToShow).join(' ').trim()
        
        console.log('🔍 [SPLIT] Split into concise:', conciseText.length, 'detailed:', detailedText.length)
        
        return { 
          concisePart: conciseText, 
          detailedPart: detailedText || null 
        }
      }
    }
    
    // For detailed mode, show everything
    console.log('🔍 [SPLIT] Detailed mode, not splitting')
    return { concisePart: content, detailedPart: null }
  }, [content, responseStyle])

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
      const prompt = urlParams.get('prompt') || ''
      
      // Use expanded content if available, otherwise use original content
      const contentToExport = isExpanded && detailedContent 
        ? `${concisePart}\n\n${detailedContent}` 
        : content
      
      // Generate PDF export URL
      const pdfUrl = `/api/export-pdf?response=${encodeURIComponent(contentToExport)}&prompt=${encodeURIComponent(prompt)}&timestamp=${encodeURIComponent(new Date().toISOString())}`
      
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

  const handleStartEdit = () => {
    // Get full content - use the actual content prop (it includes everything)
    // Don't try to reconstruct from concise/detailed parts
    setEditedContent(content)
    // Remember if content was expanded before editing
    setWasExpandedBeforeEdit(isExpanded)
    setIsEditing(true)
    console.log('✏️ [EDIT] Starting edit. Content length:', content.length, 'Was expanded:', isExpanded)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedContent("")
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

  console.log('🎨 [DISPLAY] Render decision:', {
    responseStyle,
    hasDetailedContent,
    isExpanded,
    shouldShowProgressive,
    concisePartLength: concisePart?.length || 0,
    detailedPartLength: detailedPart?.length || 0,
    detailedContentLength: detailedContent?.length || 0
  })

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
    if (!onGenerateAudio) return
    
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
                  className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-7 sm:h-8 px-2 sm:px-3"
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
          
          {/* Export PDF Button - Only show for text responses */}
          {!hasMediaContent && (
            <>
              {/* Divider */}
              <div className="h-6 w-px bg-gray-600 mx-1"></div>
              
              {/* Document Actions */}
              <div className="flex items-center gap-1">
            <Button 
              onClick={handleExportPDF}
              variant="ghost" 
              size="sm"
              className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-7 sm:h-8 px-2 sm:px-3"
            >
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="text-xs hidden sm:inline">PDF</span>
            </Button>
              </div>
            </>
          )}
          
          {/* Download Button - Only show for image/video */}
          {hasMediaContent && (
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
          )}
          
          {/* Copy Button */}
          <div className="flex items-center gap-1">
          <Button 
            onClick={handleCopy}
            variant="ghost" 
            size="sm"
            className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-7 sm:h-8 px-2 sm:px-3"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="text-xs hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="text-xs hidden sm:inline">Copy</span>
              </>
            )}
          </Button>
          </div>
          
          {/* Edit Button - Only show for text responses when not editing */}
          {!hasMediaContent && onContentChange && !isEditing && (
            <>
              <div className="h-6 w-px bg-gray-600 mx-1"></div>
              <div className="flex items-center gap-1">
                <Button 
                  onClick={handleStartEdit}
                  variant="ghost" 
                  size="sm"
                  className="text-yellow-400 hover:bg-yellow-400/10 hover:text-white transition-all h-7 sm:h-8 px-2 sm:px-3"
                >
                  <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="text-xs hidden sm:inline">Edit</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Audio Element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
      
      {/* Edit Mode - Show textarea */}
      {isEditing ? (
        <div className="border border-yellow-500/50 rounded p-3 sm:p-4 bg-black/30">
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
            className="w-full min-h-[200px] p-3 bg-black/50 border border-cyan-500/30 rounded text-gray-100 text-sm font-mono resize-none overflow-y-auto focus:outline-none focus:border-cyan-500"
            placeholder="Edit your response here..."
          />
        </div>
      ) : (
        <div className="text-gray-100 whitespace-pre-wrap break-words border border-cyan-500/20 rounded p-2 sm:p-3 bg-black/20 overflow-hidden">
          {/* Concise part - only show if progressive mode, otherwise handled below */}
          {shouldShowProgressive && (
            <div className="mb-3">
              {concisePart}
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
                const content = detailedContent || detailedPart
                if (!content) return null
                
                // First try to split by double line breaks (paragraphs)
                let paragraphs = content.split('\n\n').filter(p => p.trim().length > 0)
                
                // If no paragraphs found, try single line breaks
                if (paragraphs.length <= 1) {
                  paragraphs = content.split('\n').filter(p => p.trim().length > 0)
                }
                
                // If still no breaks, create paragraphs from sentences
                if (paragraphs.length <= 1) {
                  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
                  paragraphs = sentences.map(s => s.trim() + '.')
                }
                
                return paragraphs.map((paragraph, index) => (
                  <div key={index} className="mb-4 p-3 bg-black/10 rounded border-l-2 border-cyan-500/30">
                    {paragraph.trim()}
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
            {(() => {
              // First try to split by double line breaks (paragraphs)
              let paragraphs = content.split('\n\n').filter(p => p.trim().length > 0)
              
              // If no paragraphs found, try single line breaks
              if (paragraphs.length <= 1) {
                paragraphs = content.split('\n').filter(p => p.trim().length > 0)
              }
              
              // If still no breaks, create paragraphs from sentences
              if (paragraphs.length <= 1) {
                const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
                paragraphs = sentences.map(s => s.trim() + '.')
              }
              
              return paragraphs.map((paragraph, index) => (
                <div key={index} className="mb-4 p-3 bg-black/10 rounded border-l-2 border-cyan-500/30">
                  {paragraph.trim()}
                </div>
              ))
            })()}
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
        </div>
      )}
    </div>
  )
}
