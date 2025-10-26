"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Copy, Check, Loader2 } from "lucide-react"

interface ProgressiveResponseProps {
  content: string
  className?: string
  responseStyle?: "concise" | "detailed"
  onShowMore?: (topic: string) => Promise<string>
}

export function ProgressiveResponse({ content, className = "", responseStyle = "detailed", onShowMore }: ProgressiveResponseProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [detailedContent, setDetailedContent] = useState<string>("")
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const responseRef = useRef<HTMLDivElement>(null)

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
    // Look for natural break points in the response
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // NEVER truncate image responses - they need the full URL
    if (content.includes('[AiO Image Generated]') || content.includes('Image URL:')) {
      return { concisePart: content, detailedPart: null }
    }
    
    // For concise mode, always try to create a split even for single sentences
    if (responseStyle === "concise") {
      if (content.length > 100) {
        // If content is long, split it roughly in half
        const midPoint = Math.floor(content.length / 2)
        const concisePart = content.substring(0, midPoint).trim()
        const detailedPart = content.substring(midPoint).trim()
        return { concisePart, detailedPart }
      } else if (sentences.length <= 1) {
        // For short single sentences, show everything
        return { concisePart: content, detailedPart: null }
      }
    }
    
    if (sentences.length <= 2) {
      // If response is short, show everything
      return { concisePart: content, detailedPart: null }
    }
    
    // Take first 1-2 sentences for concise part
    const conciseCount = Math.min(2, Math.ceil(sentences.length * 0.3))
    const concisePart = sentences.slice(0, conciseCount).join('. ') + '.'
    const detailedPart = sentences.slice(conciseCount).join('. ') + '.'
    
    return { concisePart, detailedPart }
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

  // Debug logging removed to prevent console spam

  return (
    <div ref={responseRef} className={`aztec-panel backdrop-blur-md shadow-2xl shadow-cyan-500/20 p-4 ${className}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="text-cyan-400 text-sm font-semibold">AI RESPONSE:</div>
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
      
      <div className="text-cyan-300 whitespace-pre-wrap border border-cyan-500/20 rounded p-3 bg-black/20">
        {/* Concise part - always visible */}
        <div className="mb-3">
          {concisePart}
        </div>
        
        {/* Display the generated image if present */}
        {(() => {
          const imageMatch = content.match(/\[IMAGE_DISPLAY:(.*?)\]/);
          const imageUrl = imageMatch ? imageMatch[1] : null;
          
          if (imageUrl) {
            return (
              <div className="mb-4 p-3 bg-black/10 rounded border border-cyan-500/30">
                <div className="text-cyan-400 text-sm font-semibold mb-2">Generated Image:</div>
                <img 
                  src={imageUrl} 
                  alt="Generated image" 
                  className="max-w-full h-auto rounded-lg border border-cyan-500/50"
                  onError={(e) => {
                    console.error('Failed to load image:', imageUrl);
                    e.currentTarget.style.display = 'none';
                  }}
                />
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
