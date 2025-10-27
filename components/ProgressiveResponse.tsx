"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Copy, Check, Loader2, Volume2, Play, Pause, Download, FileText } from "lucide-react"

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
}

export function ProgressiveResponse({ 
  content, 
  className = "", 
  responseStyle = "detailed", 
  onShowMore,
  audioUrl,
  isGeneratingAudio = false,
  audioError,
  onGenerateAudio
}: ProgressiveResponseProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [detailedContent, setDetailedContent] = useState<string>("")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const responseRef = useRef<HTMLDivElement>(null)
  
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
    // NEVER truncate image responses - they need the full URL
    // Remove IMAGE_DISPLAY tags from displayed text but keep for image extraction
    let displayContent = content;
    if (content.includes('[IMAGE_DISPLAY:')) {
      // Remove the IMAGE_DISPLAY tag from the text
      displayContent = content.replace(/\[IMAGE_DISPLAY:[^\]]+\]/g, '').trim();
    }
    
    if (content.includes('[IMAGE_DISPLAY:') || content.includes('[AiO Image Generated]') || content.includes('Image URL:')) {
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
      await navigator.clipboard.writeText(content)
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
    
    // Generate PDF export URL
    const pdfUrl = `/api/export-pdf?response=${encodeURIComponent(content)}&prompt=${encodeURIComponent(prompt)}&timestamp=${encodeURIComponent(new Date().toISOString())}`
    
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
      
      // Auto-scroll to keep the response window in view after expansion
      setTimeout(() => {
        if (responseRef.current) {
          responseRef.current.scrollIntoView({ 
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
        }
      }, 100)
    } catch (error) {
      console.error('Failed to get detailed response:', error)
      setDetailedContent("Sorry, I couldn't load more details. Please try asking a follow-up question.")
      setIsExpanded(true)
      
      // Auto-scroll even on error
      setTimeout(() => {
        if (responseRef.current) {
          responseRef.current.scrollIntoView({ 
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
        }
      }, 100)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const hasDetailedContent = detailedPart && detailedPart.trim().length > 0
  const shouldShowProgressive = responseStyle === "concise" && (hasDetailedContent || onShowMore)

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
    link.download = `ai-response-${Date.now()}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleGenerateAudio = () => {
    if (!content || !onGenerateAudio) return
    
    if (content.length > 5000) {
      alert("Text must be less than 5000 characters for audio generation")
      return
    }

    onGenerateAudio(content)
  }

  // Debug logging removed to prevent console spam

  return (
    <div ref={responseRef} className={`aztec-panel backdrop-blur-md shadow-2xl shadow-cyan-500/20 p-4 ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="text-cyan-400 text-sm font-semibold">AI RESPONSE:</div>
        <div className="flex items-center gap-2">
          {/* Audio Controls */}
          {onGenerateAudio && (
            <div className="flex items-center gap-1">
              {!audioUrl && !isGeneratingAudio && (
                <Button 
                  onClick={handleGenerateAudio}
                  variant="ghost" 
                  size="sm"
                  className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-8 px-3"
                >
                  <Volume2 className="h-4 w-4 mr-1" />
                  <span className="text-xs">Audio</span>
                </Button>
              )}
              
              {isGeneratingAudio && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  disabled
                  className="text-cyan-400 h-8 px-3"
                >
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  <span className="text-xs">Generating...</span>
                </Button>
              )}
              
              {audioUrl && !isGeneratingAudio && (
                <>
                  <Button 
                    onClick={togglePlayPause}
                    variant="ghost" 
                    size="sm"
                    className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-8 px-2"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button 
                    onClick={downloadAudio}
                    variant="ghost" 
                    size="sm"
                    className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-8 px-2"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              {audioError && (
                <span className="text-red-400 text-xs">{audioError}</span>
              )}
            </div>
          )}
          
          {/* Export PDF Button */}
          <Button 
            onClick={handleExportPDF}
            variant="ghost" 
            size="sm"
            className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-8 px-3"
          >
            <FileText className="h-4 w-4 mr-1" />
            <span className="text-xs">PDF</span>
          </Button>
          
          {/* Copy Button */}
          <Button 
            onClick={handleCopy}
            variant="ghost" 
            size="sm"
            className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-8 px-3"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Audio Element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}
      
      <div className="text-gray-100 whitespace-pre-wrap border border-cyan-500/20 rounded p-3 bg-black/20">
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
            return (
              <div className="mb-4 p-3 bg-black/10 rounded border border-cyan-500/30">
                <div className="text-cyan-400 text-sm font-semibold mb-2">Generated Image:</div>
                <div className="flex justify-center">
                  <img 
                    src={imageUrl} 
                    alt="Generated image" 
                    className="max-w-[500px] max-h-[500px] w-auto h-auto rounded-lg border border-cyan-500/50 object-contain"
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
        
        {/* Detailed part - either from content or from API call */}
        {shouldShowProgressive && (
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="pt-2 border-t border-cyan-500/20">
              {/* Copy button for detailed content */}
              <div className="flex justify-end mb-2">
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
                  className="text-cyan-400 hover:bg-cyan-400/10 hover:text-white transition-all h-6 px-2 text-xs"
                >
                  Copy Details
                </Button>
              </div>
              
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
            </div>
          </div>
        )}
        
        {/* Show the full content if not in progressive mode or if expanded */}
        {!shouldShowProgressive && (
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
