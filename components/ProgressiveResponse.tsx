"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Copy, Check, Loader2, Volume2, Play, Pause, Download, FileText, Save } from "lucide-react"

interface ProgressiveResponseProps {
  content: string
  className?: string
  responseStyle?: "concise" | "detailed"
  onShowMore?: (topic: string) => Promise<string>
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
}

export function ProgressiveResponse({ 
  content, 
  className = "", 
  responseStyle = "detailed", 
  onShowMore,
  audioUrl,
  isGeneratingAudio = false,
  audioError,
  onGenerateAudio,
  onConvertToVideo,
  prompt,
  model
}: ProgressiveResponseProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [detailedContent, setDetailedContent] = useState<string>("")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const responseRef = useRef<HTMLDivElement>(null)
  
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
    // NEVER truncate image/video/audio responses - they need the full URL
    // Remove IMAGE_DISPLAY, VIDEO_DISPLAY, and AUDIO_DISPLAY tags from displayed text but keep for extraction
    let displayContent = content;
    if (content.includes('[IMAGE_DISPLAY:')) {
      // Remove the IMAGE_DISPLAY tag from the text
      displayContent = content.replace(/\[IMAGE_DISPLAY:[^\]]+\]/g, '').trim();
    }
    if (content.includes('[VIDEO_DISPLAY:')) {
      // Remove the VIDEO_DISPLAY tag from the text
      displayContent = content.replace(/\[VIDEO_DISPLAY:[^\]]+\]/g, '').trim();
    }
    if (content.includes('[AUDIO_DISPLAY:')) {
      // Remove the AUDIO_DISPLAY tag from the text
      displayContent = content.replace(/\[AUDIO_DISPLAY:[^\]]+\]/g, '').trim();
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

  const handleExportPDF = () => {
    // Get prompt from URL or current input if available
    const urlParams = new URLSearchParams(window.location.search)
    const prompt = urlParams.get('prompt') || ''
    
    // Use expanded content if available, otherwise use original content
    const contentToExport = isExpanded && detailedContent 
      ? `${concisePart}\n\n${detailedContent}` 
      : content
    
    // Generate PDF export URL
    const pdfUrl = `/api/export-pdf?response=${encodeURIComponent(contentToExport)}&prompt=${encodeURIComponent(prompt)}&timestamp=${encodeURIComponent(new Date().toISOString())}`
    
    // Open in new window
    window.open(pdfUrl, '_blank')
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

  const hasDetailedContent = detailedPart && detailedPart.trim().length > 0
  const hasMediaContent = content.includes('[IMAGE_DISPLAY:') || content.includes('[VIDEO_DISPLAY:') || content.includes('[AUDIO_DISPLAY:')
  const shouldShowProgressive = responseStyle === "concise" && (hasDetailedContent || onShowMore) && !hasMediaContent

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

  const downloadAudio = () => {
    if (!audioUrl) return

    const link = document.createElement('a')
    link.href = audioUrl
    link.download = `infinito-response-${Date.now()}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
                    // Download image via API proxy
                    window.open(`/api/download-image?url=${encodeURIComponent(imageMatch[1])}`, '_blank');
                  } else if (videoMatch) {
                    // Download video
                    const response = await fetch(videoMatch[1]);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `infinito-video-${Date.now()}.mp4`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } else if (audioMatch) {
                    // Download audio
                    const response = await fetch(audioMatch[1]);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `infinito-audio-${Date.now()}.mp3`;
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
        </div>
      </div>
      
      {/* Audio Element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
      
      <div className="text-gray-100 whitespace-pre-wrap break-words border border-cyan-500/20 rounded p-2 sm:p-3 bg-black/20 overflow-hidden">
        {/* Concise part - always visible */}
        <div className="mb-3">
          {concisePart}
        </div>
        
        {/* Display the generated image if present */}
        {(() => {
          const imageMatch = content.match(/\[IMAGE_DISPLAY:(.*?)\]/);
          const imageUrl = imageMatch ? imageMatch[1] : null;
          
          console.log('ProgressiveResponse content:', content);
          console.log('Image match:', imageMatch);
          console.log('Image URL:', imageUrl);
          
          if (imageUrl) {
            const handleDownload = async () => {
              try {
                // Use API proxy to avoid CORS issues
                window.open(`/api/download-image?url=${encodeURIComponent(imageUrl)}`, '_blank');
              } catch (error) {
                console.error('Failed to download image:', error);
              }
            };

            return (
              <div className="mb-4 p-2 sm:p-3 bg-black/10 rounded border border-cyan-500/30 overflow-hidden">
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
                a.download = `infinito-video-${Date.now()}.mp4`;
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
                const response = await fetch(audioUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `infinito-audio-${Date.now()}.mp3`;
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
        
        {/* Expand/Collapse button */}
        {shouldShowProgressive && (
          <div className="mt-3 pt-2 border-t border-cyan-500/20">
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
                  <span className="text-xs">Loading...</span>
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
    </div>
  )
}
