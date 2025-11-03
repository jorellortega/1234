"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Home, BookUser, BrainCircuit, User, LogOut, Settings, CreditCard, RefreshCw, Wand2, MessageSquare, Copy, Check, Bot, Trash2, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { CreditsPurchaseDialog } from "@/components/CreditsPurchaseDialog"
import AITextEditor from "@/components/ai-text-editor"
import { useToast } from "@/hooks/use-toast"
import { HudPanel } from "@/components/hud-panel"
import { AztecIcon } from "@/components/aztec-icon"

// Enhanced markdown renderer to format text properly
function formatMarkdownText(text: string): string {
  if (!text) return ""
  
  // Escape HTML to prevent XSS (only for text content, not our HTML tags)
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
  
  // Split into lines for processing
  const lines = text.split('\n')
  const formattedLines: string[] = []
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trimEnd()
    const prevLine = i > 0 ? lines[i - 1].trim() : ''
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : ''
    
    // Handle empty lines - add spacing
    if (!line.trim()) {
      if (prevLine && nextLine) {
        formattedLines.push('<div class="h-3"></div>')
      }
      continue
    }
    
    // Process all markdown/formatting first, building result as we go
    let result = line
    
    // Handle triple asterisks first (section headers) - must be before double
    result = result.replace(/\*\*\*([^*]+?)\*\*\*/g, (match, content) => {
      return `__TRIPLE_START__${content.trim()}__TRIPLE_END__`
    })
    
    // Handle double asterisks for bold
    result = result.replace(/\*\*([^*]+?)\*\*/g, (match, content) => {
      const trimmed = content.trim()
      if (trimmed.endsWith(':')) {
        return `__DOUBLE_HEADER__${trimmed}__DOUBLE_END__`
      }
      return `__DOUBLE_START__${content}__DOUBLE_END__`
    })
    
    // Handle single asterisks for italic (but not if part of ** or ***)
    result = result.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, (match, content) => {
      return `__SINGLE_START__${content}__SINGLE_END__`
    })
    
    // Handle common script patterns at start of line (even without markdown)
    result = result.replace(/^(Title|Scene\s*\d+|Setting|Action|Dialogue|Text overlay):/i, (match) => {
      return `__PATTERN_HEADER__${match}__PATTERN_END__`
    })
    
    // Handle character names
    if (/^[A-Z][a-zA-Z]*:\s*/.test(result) && !result.includes('__')) {
      result = result.replace(/^([A-Z][a-zA-Z]*):(\s*)/, (match, name, spaces) => {
        return `__CHAR_START__${name}:${spaces}__CHAR_END__`
      })
    }
    
    // Now escape the entire string
    result = escapeHtml(result)
    
    // Replace placeholders with actual HTML (now safe since content is escaped)
    result = result
      .replace(/__TRIPLE_START__([^_]+)__TRIPLE_END__/g, '<span style="display: block; font-size: 1.25rem; font-weight: 700; color: #4ade80; margin-top: 1.5rem; margin-bottom: 0.75rem;">$1</span>')
      .replace(/__DOUBLE_HEADER__([^_]+)__DOUBLE_END__/g, '<span style="display: block; font-weight: 700; color: #fbbf24; margin-top: 1rem; margin-bottom: 0.5rem;">$1</span>')
      .replace(/__DOUBLE_START__([^_]+)__DOUBLE_END__/g, '<strong style="font-weight: 600; color: #ffffff;">$1</strong>')
      .replace(/__SINGLE_START__([^_]+)__SINGLE_END__/g, '<em style="font-style: italic; color: #d1d5db;">$1</em>')
      .replace(/__PATTERN_HEADER__([^_]+)__PATTERN_END__/g, '<span style="display: block; font-weight: 700; color: #22d3ee; margin-top: 0.75rem; margin-bottom: 0.25rem; font-size: 1.1rem;">$1</span>')
      .replace(/__CHAR_START__([^_]+)__CHAR_END__/g, '<span style="font-weight: 700; color: #60a5fa; display: inline-block; margin-top: 0.5rem;">$1</span>')
    
    // Wrap each line
    formattedLines.push(`<div style="margin-bottom: 0.375rem; line-height: 1.6;">${result}</div>`)
  }
  
  return formattedLines.join('')
}

export default function TextModePage() {
  const { toast } = useToast()
  
  // State
  const [prompt, setPrompt] = useState("")
  const [enhancedPrompt, setEnhancedPrompt] = useState("")
  const [response, setResponse] = useState("")
  const [selectedTextModel, setSelectedTextModel] = useState<string>("gpt-4o")
  const [selectedLLM, setSelectedLLM] = useState<string>("gpt-4o")
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(1000)
  
  // Loading states
  const [isGenerating, setIsGenerating] = useState(false)
  const [textGenerationProgress, setTextGenerationProgress] = useState<string>('')
  const [progressPercentage, setProgressPercentage] = useState<number>(0)
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  // User state
  const [user, setUser] = useState<any>(null)
  const [userCredits, setUserCredits] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreditsDialog, setShowCreditsDialog] = useState(false)
  
  // Admin preferences
  const [adminPreferences, setAdminPreferences] = useState<any>(null)
  
  // Panel visibility state
  const [showPanels, setShowPanels] = useState(false)
  
  // AI Text Editor state
  const [selectedText, setSelectedText] = useState("")
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null)
  const [showAITextEditor, setShowAITextEditor] = useState(false)
  
  // Direct text editing state
  const [isEditingResponse, setIsEditingResponse] = useState(false)
  const [editedResponse, setEditedResponse] = useState("")
  const [responseDisplayHeight, setResponseDisplayHeight] = useState<number | null>(null)
  
  // Refs
  const responseEndRef = useRef<HTMLDivElement>(null)
  const responseTextareaRef = useRef<HTMLDivElement>(null)
  
  // Debug: Monitor response state changes
  useEffect(() => {
    console.log('[DEBUG STATE] Response state changed')
    console.log('[DEBUG STATE] response value:', response)
    console.log('[DEBUG STATE] response type:', typeof response)
    console.log('[DEBUG STATE] response length:', response?.length || 0)
    console.log('[DEBUG STATE] response.trim() result:', response?.trim() || 'empty')
    console.log('[DEBUG STATE] response.trim().length:', response?.trim()?.length || 0)
    console.log('[DEBUG STATE] Will render?', !!(response && response.trim()))
  }, [response])

  // Scroll to bottom when response updates
  useEffect(() => {
    console.log('[DEBUG] Response changed. Length:', response?.length || 0)
    console.log('[DEBUG] Response value:', response?.substring(0, 100) || 'empty')
    if (response && response.trim() && responseEndRef.current) {
      console.log('[DEBUG] Scrolling to response...')
      setTimeout(() => {
        if (responseEndRef.current) {
          responseEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          console.log('[DEBUG] Scroll completed')
        }
      }, 100)
    } else {
      console.log('[DEBUG] Not scrolling - response invalid or ref not available')
      console.log('[DEBUG] responseEndRef.current:', responseEndRef.current)
    }
  }, [response])

  // Keyboard shortcut for AI text editing (Ctrl/Cmd + Shift + A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        if (selectedText) {
          e.preventDefault()
          setShowAITextEditor(true)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedText])

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
        if (prefs.selected_text_model) {
          setSelectedTextModel(prefs.selected_text_model)
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
          prompt: `You are an expert at improving prompts for AI text generation. Enhance the following prompt to get better, more detailed responses. Focus on:
1. Clarity and specificity
2. Context and background
3. Desired output format
4. Key requirements

Original prompt: "${prompt}"

Return ONLY the enhanced prompt without any explanation or extra text.`,
          mode: selectedLLM,
          temperature: 0.7,
          max_tokens: 500,
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

  // Copy response to clipboard
  const copyResponse = async () => {
    try {
      await navigator.clipboard.writeText(response)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Generate text
  const handleGenerateText = async () => {
    console.log('[DEBUG] handleGenerateText called')
    console.log('[DEBUG] Prompt:', prompt)
    console.log('[DEBUG] User:', user)
    console.log('[DEBUG] Selected Model:', selectedTextModel)
    
    if (!prompt.trim()) {
      console.log('[DEBUG] Error: No prompt provided')
      setError('Please enter a prompt for text generation')
      return
    }
    
    if (!user) {
      console.log('[DEBUG] Error: No user logged in')
      setError('Please log in to generate text')
      return
    }

    try {
      console.log('[DEBUG] Starting text generation...')
      setIsGenerating(true)
      setIsStreaming(true)
      setError(null)
      setResponse("")
      setTextGenerationProgress('Preparing text generation...')
      setProgressPercentage(5)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }
      
      setTextGenerationProgress('Sending request to AI...')
      setProgressPercentage(10)

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
            temperature: temperature,
            max_tokens: maxTokens,
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
        setProgressPercentage(30)

        let fullText = ""
        let buffer = ""
        
        console.log('[DEBUG STREAM] Starting to read stream...')
        
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            console.log('[DEBUG STREAM] Stream done. Final text length:', fullText.length)
            break
          }
          
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer
          
          for (const line of lines) {
            // Don't trim the line yet - we need to preserve the exact format
            if (!line || line.trim() === '') continue
            
            // Check for data: prefix
            if (line.startsWith('data: ')) {
              // Extract content after "data: " - preserve everything including spaces
              // Only remove the trailing newline if present (which is part of the SSE format)
              let content = line.slice(6)
              
              // Remove trailing newline/carriage return from SSE format, but preserve spaces
              content = content.replace(/\r?\n$/, '')
              
              // Check for [DONE] marker
              if (content.trim() === '[DONE]') {
                console.log('[DEBUG STREAM] Received [DONE] marker')
                break
              }
              
              // Skip empty content
              if (!content || content.trim() === '') continue
              
              // The API sends plain text chunks directly (not JSON)
              // Each chunk should be appended as-is to preserve spaces between words
              fullText += content
              console.log('[DEBUG STREAM] Added chunk:', JSON.stringify(content.substring(0, 50)), 'chars, Total:', fullText.length)
              setResponse(fullText)
              setProgressPercentage(Math.min(30 + (fullText.length / 50), 90))
            } else if (line.trim() === 'event: done' || line.includes('event: done')) {
              console.log('[DEBUG STREAM] Received event: done')
              break
            }
          }
        }
        
        // Process any remaining buffer
        if (buffer) {
          const trimmedBuffer = buffer.trim()
          if (trimmedBuffer.startsWith('data: ')) {
            const text = trimmedBuffer.slice(6)
            if (text && text.trim() !== '[DONE]') {
              fullText += text
              setResponse(fullText)
            }
          }
        }

        console.log('[DEBUG] Streaming complete. Full text length:', fullText.length)
        console.log('[DEBUG] Full text preview:', fullText.substring(0, 100))
        
        if (fullText.trim()) {
          const trimmedText = fullText.trim()
          console.log('[DEBUG] Setting response state from streaming with text length:', trimmedText.length)
          setResponse(trimmedText)
          setTextGenerationProgress('Text generated successfully!')
          setProgressPercentage(100)
          console.log('[DEBUG] Streaming response state updated successfully')
        } else {
          console.log('[DEBUG] Error: Streaming result is empty')
          throw new Error('No text was generated. Please try again.')
        }
      } else {
        // Use non-streaming API for local models
        setTextGenerationProgress('Generating response...')
        setProgressPercentage(30)

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            prompt: prompt,
            mode: selectedTextModel,
            temperature: temperature,
            max_tokens: maxTokens,
            response_style: 'detailed'
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Text generation failed')
        }

      const data = await response.json()
      console.log('[DEBUG] Non-streaming response data:', data)
      const generatedText = data.output || data.response || data.generated || ''
      console.log('[DEBUG] Generated text length:', generatedText.length)
      console.log('[DEBUG] Generated text preview:', generatedText.substring(0, 100))
      
      if (generatedText.trim()) {
        const trimmedText = generatedText.trim()
        console.log('[DEBUG] Setting response state with text length:', trimmedText.length)
        setResponse(trimmedText)
        setTextGenerationProgress('Text generated successfully!')
        setProgressPercentage(100)
        console.log('[DEBUG] Response state updated successfully')
      } else {
        console.log('[DEBUG] Error: Generated text is empty')
        throw new Error('No text was generated. Please try again.')
      }
      }

      // Refresh credits after generation
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    } catch (error: any) {
      console.error('[DEBUG] Text generation error:', error)
      console.error('[DEBUG] Error message:', error.message)
      console.error('[DEBUG] Error stack:', error.stack)
      setError(error.message || 'Failed to generate text')
      setTextGenerationProgress('')
      setProgressPercentage(0)
      if (user?.id) {
        setTimeout(() => fetchUserCredits(user.id), 500)
      }
    } finally {
      console.log('[DEBUG] Generation complete. isGenerating set to false')
      setIsGenerating(false)
      setIsStreaming(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  // Handle text selection in response area
  const handleTextSelection = () => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      setTimeout(() => {
        const selection = window.getSelection()
        const selectedTextStr = selection?.toString().trim() || ""
        
        console.log('[DEBUG SELECTION] Selection check:', {
          hasSelection: !!selection,
          selectionString: selectedTextStr.substring(0, 50),
          length: selectedTextStr.length,
          rangeCount: selection?.rangeCount || 0
        })
        
        if (selectedTextStr.length > 0 && responseTextareaRef.current) {
          console.log('[DEBUG SELECTION] Selected text found:', selectedTextStr.substring(0, 50))
          setSelectedText(selectedTextStr)
          
          // Try to find the exact position in the response
          const responseContent = responseTextareaRef.current.textContent || responseTextareaRef.current.innerText || ""
          const firstOccurrenceIndex = responseContent.indexOf(selectedTextStr)
          
          if (firstOccurrenceIndex !== -1) {
            setSelectedRange({
              start: firstOccurrenceIndex,
              end: firstOccurrenceIndex + selectedTextStr.length
            })
            console.log('[DEBUG SELECTION] Range set from index:', { start: firstOccurrenceIndex, end: firstOccurrenceIndex + selectedTextStr.length })
          } else if (selection && selection.rangeCount > 0) {
            // If exact match not found, try to get range from selection
            try {
              const range = selection.getRangeAt(0)
              const container = range.commonAncestorContainer
              
              // Check if selection is within our response element
              const isInResponse = responseTextareaRef.current.contains(container.nodeType === Node.TEXT_NODE ? container.parentNode : container)
              
              if (isInResponse) {
                // Calculate position relative to response content
                const preRange = document.createRange()
                preRange.selectNodeContents(responseTextareaRef.current)
                preRange.setEnd(range.startContainer, range.startOffset)
                const start = preRange.toString().length
                const end = start + selectedTextStr.length
                
                setSelectedRange({ start, end })
                console.log('[DEBUG SELECTION] Range calculated from DOM:', { start, end })
              } else {
                setSelectedRange(null)
              }
            } catch (e) {
              console.log('[DEBUG SELECTION] Error calculating range:', e)
              setSelectedRange(null)
            }
          } else {
            setSelectedRange(null)
          }
        } else {
          // Only clear if we're sure there's no selection
          if (!selection || !selection.toString() || selection.toString().trim().length === 0) {
            console.log('[DEBUG SELECTION] Clearing selection')
            setSelectedText("")
            setSelectedRange(null)
          }
        }
      }, 50)
    })
  }

  // Handle AI text replacement
  const handleAITextReplace = (newText: string) => {
    if (selectedText && responseTextareaRef.current && selectedRange) {
      // Replace selected text at specific range
      const updatedResponse = 
        response.substring(0, selectedRange.start) + 
        newText + 
        response.substring(selectedRange.end)
      setResponse(updatedResponse)
      setSelectedText("")
      setSelectedRange(null)
    }
  }

  // Copy selection
  const copySelection = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText)
      toast({
        title: "Copied!",
        description: "Selected text copied to clipboard"
      })
    }
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedText("")
    window.getSelection()?.removeAllRanges()
  }

  // Get text model display info
  const getTextModelInfo = (model: string) => {
    const models: Record<string, { cost: string, features: string }> = {
      'gpt-4o': { 
        cost: '5 credits/msg', 
        features: 'Latest model, best quality'
      },
      'gpt-4o-mini': { 
        cost: '1 credit/msg', 
        features: 'Fast and affordable'
      },
      'gpt-4-turbo': { 
        cost: '18 credits/msg', 
        features: 'High-quality reasoning'
      },
      'gpt-4': { 
        cost: '43 credits/msg', 
        features: 'Maximum accuracy'
      },
      'gpt-3.5-turbo': { 
        cost: '1 credit/msg', 
        features: 'Budget-friendly'
      },
      'o1': { 
        cost: '32 credits/msg', 
        features: 'Advanced reasoning'
      },
      'o1-mini': { 
        cost: '6 credits/msg', 
        features: 'Fast reasoning'
      },
      'o1-preview': { 
        cost: '32 credits/msg', 
        features: 'Advanced reasoning (preview)'
      },
      'llama': { 
        cost: 'FREE', 
        features: 'Local Zephyr model'
      },
      'mistral': { 
        cost: 'FREE', 
        features: 'Local Maestro model'
      },
      'openai': { 
        cost: '1 credit/msg', 
        features: 'GPT-3.5 (legacy)'
      }
    }
    return models[model] || { cost: '1 credit/msg', features: 'Text generation' }
  }

  return (
    <div className="relative min-h-screen w-full">
      <div className="aztec-background" />
      <div className="animated-grid" />

      <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          {/* Navigation */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Link href="/" className="flex items-center gap-1 sm:gap-2 text-yellow-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-yellow-400/10">
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Home</span>
            </Link>
            <Link href="/library" className="flex items-center gap-1 sm:gap-2 text-yellow-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-yellow-400/10">
              <BookUser className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Library</span>
            </Link>
            <Link
              href="/memory-core"
              className="flex items-center gap-1 sm:gap-2 text-yellow-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-yellow-400/10"
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
                  className="flex items-center gap-1 sm:gap-2 text-yellow-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-yellow-400/10"
                >
                  {showPanels ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  <span className="hidden sm:inline text-sm">{showPanels ? 'Hide Panels' : 'Show Panels'}</span>
                </button>
              )}
              <Link
                href="/profile"
                className="flex items-center gap-1 sm:gap-2 text-yellow-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-yellow-400/10"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Profile</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 sm:gap-2 text-yellow-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-yellow-400/10"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Link
                href="/login"
                className="flex items-center gap-1 sm:gap-2 text-yellow-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-yellow-400/10"
              >
                <span className="text-sm">Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1 sm:gap-2 text-yellow-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-yellow-400/10"
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
              <HudPanel title="Text Generation Core">
                <p className="flex items-center gap-2">
                  <AztecIcon name="sun-stone" className="text-amber-400 animate-icon-pulse" /> 
                  Model Status: <span className="text-green-400">ACTIVE</span>
                </p>
                <p className="flex items-center gap-2">
                  <AztecIcon name="sun-stone" className="text-amber-400 animate-icon-pulse" /> 
                  Current Model: <span className="text-white">{selectedTextModel.toUpperCase()}</span>
                </p>
                <p>
                  Temperature: <span className="text-white">{temperature.toFixed(1)}</span>
                </p>
                <p>
                  Max Tokens: <span className="text-white">{maxTokens.toLocaleString()}</span>
                </p>
              </HudPanel>
              
              <HudPanel title="Generation Status">
                {isGenerating ? (
                  <>
                    <p className="flex items-center gap-2 text-cyan-400">
                      <AztecIcon name="serpent" className="text-cyan-400 animate-icon-pulse" /> 
                      Generating...
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {textGenerationProgress || 'Processing request'}
                    </p>
                    <p className="text-xs text-yellow-400 mt-1">
                      Progress: {progressPercentage}%
                    </p>
                  </>
                ) : response ? (
                  <p className="flex items-center gap-2 text-green-400">
                    <AztecIcon name="serpent" className="text-green-400 animate-icon-pulse" /> 
                    Response Ready
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
                  <span className="text-yellow-400">💬</span>{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-600">
                    INFINITO TEXT MODE
                  </span>
                </h1>
                <p className="text-gray-300 text-lg">
                  AI-powered text generation with advanced language models
                </p>
              </div>

              {/* Debug Panel - Remove this after debugging */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-black/80 border border-yellow-500/50 p-4 rounded-lg text-xs text-yellow-400 mb-4">
                  <div className="font-bold mb-2">🐛 DEBUG INFO:</div>
                  <div>Response exists: {response ? 'YES' : 'NO'}</div>
                  <div>Response length: {response?.length || 0}</div>
                  <div>Response trimmed length: {response?.trim()?.length || 0}</div>
                  <div>Will render: {response && response.trim() ? 'YES' : 'NO'}</div>
                  <div>Is generating: {isGenerating ? 'YES' : 'NO'}</div>
                  <div>Is streaming: {isStreaming ? 'YES' : 'NO'}</div>
                  <div>Error: {error || 'None'}</div>
                  {response && (
                    <div className="mt-2 text-yellow-300">
                      Preview: {response.substring(0, 50)}...
                    </div>
                  )}
                </div>
              )}

              <div className="w-full space-y-6">
            {/* Model Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Text Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-5 w-5 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-semibold uppercase">Text Generation Model</span>
                </div>
                <Select value={selectedTextModel} onValueChange={setSelectedTextModel}>
                  <SelectTrigger className="bg-transparent border-yellow-500/50 text-yellow-300 hover:border-yellow-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-yellow-500/50 backdrop-blur-md max-h-[400px] overflow-y-auto">
                    {isModelEnabled('gpt-4o') && <SelectItem value="gpt-4o" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4O</SelectItem>}
                    {isModelEnabled('gpt-4o-mini') && <SelectItem value="gpt-4o-mini" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4O MINI</SelectItem>}
                    {isModelEnabled('gpt-4-turbo') && <SelectItem value="gpt-4-turbo" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4 TURBO</SelectItem>}
                    {isModelEnabled('gpt-4') && <SelectItem value="gpt-4" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4</SelectItem>}
                    {isModelEnabled('gpt-3.5-turbo') && <SelectItem value="gpt-3.5-turbo" className="text-yellow-300 hover:bg-yellow-500/20">GPT-3.5 TURBO</SelectItem>}
                    {isModelEnabled('o1') && <SelectItem value="o1" className="text-yellow-300 hover:bg-yellow-500/20">O1 (REASONING)</SelectItem>}
                    {isModelEnabled('o1-mini') && <SelectItem value="o1-mini" className="text-yellow-300 hover:bg-yellow-500/20">O1-MINI</SelectItem>}
                    {isModelEnabled('o1-preview') && <SelectItem value="o1-preview" className="text-yellow-300 hover:bg-yellow-500/20">O1-PREVIEW</SelectItem>}
                    {isModelEnabled('llama') && <SelectItem value="llama" className="text-yellow-300 hover:bg-yellow-500/20">ZEPHYR (Local)</SelectItem>}
                    {isModelEnabled('mistral') && <SelectItem value="mistral" className="text-yellow-300 hover:bg-yellow-500/20">MAESTRO (Local)</SelectItem>}
                    {isModelEnabled('openai') && <SelectItem value="openai" className="text-yellow-300 hover:bg-yellow-500/20">AiO (GPT-3.5)</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-yellow-400 text-xs mt-2">
                  {getTextModelInfo(selectedTextModel).cost} • {getTextModelInfo(selectedTextModel).features}
                </p>
              </div>

              {/* Prompt Enhancement Model */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit className="h-5 w-5 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-semibold uppercase">Prompt Enhancement Model</span>
                </div>
                <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                  <SelectTrigger className="bg-transparent border-yellow-500/50 text-yellow-300 hover:border-yellow-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-yellow-500/50 backdrop-blur-md">
                    <SelectItem value="gpt-4o" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4O</SelectItem>
                    <SelectItem value="gpt-4o-mini" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4O MINI</SelectItem>
                    <SelectItem value="gpt-4-turbo" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4 TURBO</SelectItem>
                    <SelectItem value="gpt-4" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo" className="text-yellow-300 hover:bg-yellow-500/20">GPT-3.5 TURBO</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-yellow-400 text-xs mt-2">
                  Enhances your prompts for better responses
                </p>
              </div>
            </div>

            {/* Prompt Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-yellow-500/30 shadow-yellow-500/20">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Your Prompt</h2>
                  <div className="flex items-center gap-2">
                    {userCredits <= 50 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreditsDialog(true)}
                        className={`${userCredits <= 10 ? 'text-red-400 hover:bg-red-400/10' : 'text-yellow-400 hover:bg-yellow-400/10'}`}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {userCredits} credits
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="text-yellow-400 hover:bg-yellow-400/10"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <textarea
                  placeholder="Enter your prompt here... (e.g., 'Write a story about a futuristic city', 'Explain quantum computing', 'Help me write a blog post')"
                  className="w-full bg-black/30 text-lg text-white placeholder-yellow-600 resize-none border border-yellow-500/30 rounded-lg p-4 focus:ring-2 focus:ring-yellow-400 min-h-[120px]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />

                {/* Enhance Prompt Button */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={enhancePromptWithLLM}
                    disabled={!prompt.trim() || isEnhancingPrompt}
                    className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white"
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

            {/* Generation Settings */}
            <div className="bg-neutral-900/50 p-6 rounded-2xl border border-yellow-500/30">
              <h3 className="text-lg font-semibold text-white mb-4">Generation Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Temperature */}
                <div>
                  <label className="text-yellow-400 text-sm font-medium mb-2 block">
                    Temperature: {temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-yellow-400/70 mt-1">
                    <span>Focused</span>
                    <span>Creative</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="text-yellow-400 text-sm font-medium mb-2 block">Max Tokens</label>
                  <Select value={maxTokens.toString()} onValueChange={(v) => setMaxTokens(parseInt(v))}>
                    <SelectTrigger className="bg-black/30 border-yellow-500/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-yellow-500/50">
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1,000</SelectItem>
                      <SelectItem value="2000">2,000</SelectItem>
                      <SelectItem value="4000">4,000</SelectItem>
                      <SelectItem value="8000">8,000</SelectItem>
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

            {/* Text Generation Progress */}
            {isGenerating && (
              <div className="space-y-3">
                <div className="relative overflow-hidden bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-800 p-5 rounded-md border-2 border-yellow-400/60">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  <div className="relative flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/40 border-t-white"></div>
                    <span className="text-white/80 text-lg sm:text-xl font-bold tracking-[0.2em] uppercase">
                      {textGenerationProgress || (isStreaming ? 'GENERATING...' : 'PROCESSING...')}
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-black/40 rounded-full h-3 border border-yellow-500/50 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-800 transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                {/* Percentage Display */}
                <div className="text-center">
                  <span className="text-yellow-400 text-2xl font-bold">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerateText}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-800 hover:from-yellow-700 hover:via-amber-700 hover:to-yellow-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                  {isStreaming ? 'GENERATING...' : 'PROCESSING...'}
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5 mr-3" />
                  GENERATE TEXT
                </>
              )}
            </Button>

            {/* Generated Response */}
            {response && response.trim() && (
              <div className="space-y-4 mt-6">
                <div className="bg-neutral-900/50 p-6 rounded-2xl border border-green-500/30 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">AI Response</h3>
                    <div className="flex gap-2">
                      {!isEditingResponse ? (
                        <>
                          <Button
                            onClick={() => {
                              // Capture the height of the display div before switching
                              if (responseTextareaRef.current) {
                                const height = responseTextareaRef.current.offsetHeight
                                setResponseDisplayHeight(height)
                              }
                              setEditedResponse(response)
                              setIsEditingResponse(true)
                            }}
                            variant="outline"
                            size="sm"
                            className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Edit Text
                          </Button>
                          {selectedText && selectedText.trim().length > 0 && (
                            <Button
                              onClick={() => setShowAITextEditor(true)}
                              variant="outline"
                              size="sm"
                              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                            >
                              <Bot className="h-4 w-4 mr-2" />
                              Edit Selected ({selectedText.length} chars)
                            </Button>
                          )}
                          <Button
                            onClick={copyResponse}
                            variant="ghost"
                            size="sm"
                            className="text-yellow-400 hover:bg-yellow-400/10"
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
                              setResponse(editedResponse)
                              setIsEditingResponse(false)
                              toast({
                                title: "Text Updated",
                                description: "Your edits have been saved."
                              })
                            }}
                            variant="outline"
                            size="sm"
                            className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button
                            onClick={() => {
                              setIsEditingResponse(false)
                              setEditedResponse("")
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
                  <div className="prose prose-invert max-w-none">
                    {isEditingResponse ? (
                      <div 
                        className="min-h-[50px]"
                        style={{
                          minHeight: responseDisplayHeight ? `${responseDisplayHeight}px` : 'auto'
                        }}
                      >
                        <Textarea
                          value={editedResponse}
                          onChange={(e) => setEditedResponse(e.target.value)}
                          className="w-full bg-black/20 text-white border-green-500/10 rounded-lg p-4 text-base leading-relaxed whitespace-pre-wrap break-words resize-none"
                          style={{
                            wordSpacing: 'normal',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
                            minHeight: responseDisplayHeight ? `${responseDisplayHeight}px` : '50px',
                            height: 'auto'
                          }}
                          placeholder="Edit your response here..."
                        />
                      </div>
                    ) : (
                      <>
                        <div 
                          ref={responseTextareaRef}
                          className="text-white leading-relaxed select-all cursor-text min-h-[50px] break-words p-4 bg-black/20 rounded-lg border border-green-500/10"
                          style={{ 
                            wordSpacing: 'normal', 
                            whiteSpace: 'pre-wrap', 
                            userSelect: 'text',
                            WebkitUserSelect: 'text',
                            MozUserSelect: 'text',
                            msUserSelect: 'text'
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation()
                            handleTextSelection()
                          }}
                          onKeyUp={(e) => {
                            e.stopPropagation()
                            handleTextSelection()
                          }}
                          onSelect={(e) => {
                            e.stopPropagation()
                            handleTextSelection()
                          }}
                        >
                          <span dangerouslySetInnerHTML={{ __html: formatMarkdownText(response) }} />
                          {isStreaming && (
                            <span className="inline-block w-2 h-5 bg-yellow-400 ml-1 animate-pulse"></span>
                          )}
                        </div>
                        
                        {/* Selection Helper Text */}
                        {response && !selectedText && (
                          <div className="mt-2 p-2 bg-purple-500/5 rounded border border-purple-500/20">
                            <p className="text-xs text-purple-400">
                              💡 Tip: Click "Edit Text" to edit the full response, or select text to edit with AI
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div ref={responseEndRef} />
                </div>

                {/* Selection Actions */}
                {selectedText && selectedText.trim().length > 0 && (
                  <div className="space-y-3 bg-neutral-900/50 p-4 rounded-2xl border border-purple-500/30 animate-in fade-in slide-in-from-bottom-2">
                    {/* Selection Info */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <span className="text-sm font-medium text-purple-400">
                        ✨ Selected: {selectedText.length} characters
                      </span>
                      <span className="text-xs text-blue-400">
                        💡 Use Ctrl/Cmd + Shift + A for quick AI editing
                      </span>
                    </div>
                    
                    {/* Quick Action Buttons */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={copySelection} className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button size="sm" variant="outline" onClick={clearSelection} className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear Selection
                      </Button>
                    </div>
                    
                    {/* AI Edit Section */}
                    <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                        <div>
                          <span className="text-sm font-semibold text-purple-400">
                            🤖 AI-Powered Text Editing
                          </span>
                          <p className="text-xs text-gray-400 mt-1">
                            Use AI to rewrite, improve, or modify your selected text.
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            console.log('[DEBUG] Opening AI editor with text:', selectedText.substring(0, 50))
                            setShowAITextEditor(true)
                          }} 
                          className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:border-purple-400"
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          Edit with AI
                        </Button>
                      </div>
                    </div>
                    
                    {/* Preview of selected text */}
                    <div className="p-3 bg-black/30 rounded-lg border border-purple-500/10">
                      <p className="text-xs text-purple-300 mb-1">Selected text preview:</p>
                      <p className="text-xs text-gray-300 line-clamp-2">
                        "{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Text Editor Modal */}
                {showAITextEditor && (
                  <AITextEditor
                    isOpen={showAITextEditor}
                    onClose={() => setShowAITextEditor(false)}
                    selectedText={selectedText}
                    fullContent={response}
                    onTextReplace={handleAITextReplace}
                    contentType="script"
                  />
                )}
              </div>
            )}
              </div>
            </div>

            {/* Right Panel */}
            <div className="hidden lg:block lg:col-span-3 space-y-6">
              <HudPanel title="AI Editor Status">
                {selectedText ? (
                  <>
                    <p className="flex items-center gap-2 text-purple-400">
                      <AztecIcon name="jaguar" className="text-purple-400 animate-icon-pulse" /> 
                      Text Selected
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedText.length} characters selected
                    </p>
                    <p className="text-xs text-purple-300 mt-1">
                      Ready for AI editing
                    </p>
                  </>
                ) : (
                  <p className="flex items-center gap-2 text-gray-500">
                    <AztecIcon name="jaguar" className="text-gray-500" /> 
                    No selection
                  </p>
                )}
              </HudPanel>

              <HudPanel title="User Stats">
                <p className="flex items-center gap-2">
                  <AztecIcon name="jaguar" className="text-green-400 animate-icon-pulse" /> 
                  Credits: <span className="text-white">{userCredits}</span>
                </p>
                {response && (
                  <p className="text-xs text-gray-400 mt-2">
                    Response Length: {response.length.toLocaleString()} chars
                  </p>
                )}
                {prompt && (
                  <p className="text-xs text-gray-400 mt-1">
                    Prompt Length: {prompt.length} chars
                  </p>
                )}
              </HudPanel>

              <HudPanel title="Data Stream">
                {isStreaming ? (
                  <p className="truncate text-cyan-400">[LIVE] Streaming Response...</p>
                ) : response ? (
                  <p className="truncate text-green-400">[DONE] Response Generated</p>
                ) : (
                  <p className="truncate text-gray-600">[IDLE] Awaiting Input...</p>
                )}
                {isEnhancingPrompt && (
                  <p className="truncate text-purple-400 mt-1">[PROC] Enhancing Prompt...</p>
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
                <span className="text-yellow-400">💬</span>{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-600">
                  INFINITO TEXT MODE
                </span>
              </h1>
              <p className="text-gray-300 text-lg">
                AI-powered text generation with advanced language models
              </p>
            </div>


            <div className="max-w-5xl mx-auto space-y-6">
            {/* Model Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Text Model Selector */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-5 w-5 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-semibold uppercase">Text Generation Model</span>
                </div>
                <Select value={selectedTextModel} onValueChange={setSelectedTextModel}>
                  <SelectTrigger className="bg-transparent border-yellow-500/50 text-yellow-300 hover:border-yellow-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-yellow-500/50 backdrop-blur-md max-h-[400px] overflow-y-auto">
                    {isModelEnabled('gpt-4o') && <SelectItem value="gpt-4o" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4O</SelectItem>}
                    {isModelEnabled('gpt-4o-mini') && <SelectItem value="gpt-4o-mini" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4O MINI</SelectItem>}
                    {isModelEnabled('gpt-4-turbo') && <SelectItem value="gpt-4-turbo" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4 TURBO</SelectItem>}
                    {isModelEnabled('gpt-4') && <SelectItem value="gpt-4" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4</SelectItem>}
                    {isModelEnabled('gpt-3.5-turbo') && <SelectItem value="gpt-3.5-turbo" className="text-yellow-300 hover:bg-yellow-500/20">GPT-3.5 TURBO</SelectItem>}
                    {isModelEnabled('o1') && <SelectItem value="o1" className="text-yellow-300 hover:bg-yellow-500/20">O1 (REASONING)</SelectItem>}
                    {isModelEnabled('o1-mini') && <SelectItem value="o1-mini" className="text-yellow-300 hover:bg-yellow-500/20">O1-MINI</SelectItem>}
                    {isModelEnabled('o1-preview') && <SelectItem value="o1-preview" className="text-yellow-300 hover:bg-yellow-500/20">O1-PREVIEW</SelectItem>}
                    {isModelEnabled('llama') && <SelectItem value="llama" className="text-yellow-300 hover:bg-yellow-500/20">ZEPHYR (Local)</SelectItem>}
                    {isModelEnabled('mistral') && <SelectItem value="mistral" className="text-yellow-300 hover:bg-yellow-500/20">MAESTRO (Local)</SelectItem>}
                    {isModelEnabled('openai') && <SelectItem value="openai" className="text-yellow-300 hover:bg-yellow-500/20">AiO (GPT-3.5)</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-yellow-400 text-xs mt-2">
                  {getTextModelInfo(selectedTextModel).cost} • {getTextModelInfo(selectedTextModel).features}
                </p>
              </div>

              {/* Prompt Enhancement Model */}
              <div className="bg-neutral-900/50 p-4 rounded-2xl border border-yellow-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <BrainCircuit className="h-5 w-5 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-semibold uppercase">Prompt Enhancement Model</span>
                </div>
                <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                  <SelectTrigger className="bg-transparent border-yellow-500/50 text-yellow-300 hover:border-yellow-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black/90 border-yellow-500/50 backdrop-blur-md">
                    <SelectItem value="gpt-4o" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4O</SelectItem>
                    <SelectItem value="gpt-4o-mini" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4O MINI</SelectItem>
                    <SelectItem value="gpt-4-turbo" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4 TURBO</SelectItem>
                    <SelectItem value="gpt-4" className="text-yellow-300 hover:bg-yellow-500/20">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo" className="text-yellow-300 hover:bg-yellow-500/20">GPT-3.5 TURBO</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-yellow-400 text-xs mt-2">
                  Enhances your prompts for better responses
                </p>
              </div>
            </div>

            {/* Prompt Section */}
            <div className="aztec-panel backdrop-blur-md shadow-2xl p-6 rounded-2xl border border-yellow-500/30 shadow-yellow-500/20">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Your Prompt</h2>
                  <div className="flex items-center gap-2">
                    {userCredits <= 50 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreditsDialog(true)}
                        className={`${userCredits <= 10 ? 'text-red-400 hover:bg-red-400/10' : 'text-yellow-400 hover:bg-yellow-400/10'}`}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {userCredits} credits
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="text-yellow-400 hover:bg-yellow-400/10"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <textarea
                  placeholder="Enter your prompt here... (e.g., 'Write a story about a futuristic city', 'Explain quantum computing', 'Help me write a blog post')"
                  className="w-full bg-black/30 text-lg text-white placeholder-yellow-600 resize-none border border-yellow-500/30 rounded-lg p-4 focus:ring-2 focus:ring-yellow-400 min-h-[120px]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />

                {/* Enhance Prompt Button */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={enhancePromptWithLLM}
                    disabled={!prompt.trim() || isEnhancingPrompt}
                    className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white"
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

            {/* Generation Settings */}
            <div className="bg-neutral-900/50 p-6 rounded-2xl border border-yellow-500/30">
              <h3 className="text-lg font-semibold text-white mb-4">Generation Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Temperature */}
                <div>
                  <label className="text-yellow-400 text-sm font-medium mb-2 block">
                    Temperature: {temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-yellow-400/70 mt-1">
                    <span>Focused</span>
                    <span>Creative</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="text-yellow-400 text-sm font-medium mb-2 block">Max Tokens</label>
                  <Select value={maxTokens.toString()} onValueChange={(v) => setMaxTokens(parseInt(v))}>
                    <SelectTrigger className="bg-black/30 border-yellow-500/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-yellow-500/50">
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1,000</SelectItem>
                      <SelectItem value="2000">2,000</SelectItem>
                      <SelectItem value="4000">4,000</SelectItem>
                      <SelectItem value="8000">8,000</SelectItem>
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

            {/* Text Generation Progress */}
            {isGenerating && (
              <div className="space-y-3">
                <div className="relative overflow-hidden bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-800 p-5 rounded-md border-2 border-yellow-400/60">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  <div className="relative flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-3 border-white/40 border-t-white"></div>
                    <span className="text-white/80 text-lg sm:text-xl font-bold tracking-[0.2em] uppercase">
                      {textGenerationProgress || (isStreaming ? 'GENERATING...' : 'PROCESSING...')}
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-black/40 rounded-full h-3 border border-yellow-500/50 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-800 transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                {/* Percentage Display */}
                <div className="text-center">
                  <span className="text-yellow-400 text-2xl font-bold">
                    {progressPercentage}%
                  </span>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerateText}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-800 hover:from-yellow-700 hover:via-amber-700 hover:to-yellow-900 text-white font-bold py-6 text-lg tracking-widest disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white mr-3"></div>
                  {isStreaming ? 'GENERATING...' : 'PROCESSING...'}
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5 mr-3" />
                  GENERATE TEXT
                </>
              )}
            </Button>

            {/* Generated Response */}
            {response && response.trim() && (
              <div className="space-y-4 mt-6">
                <div className="bg-neutral-900/50 p-6 rounded-2xl border border-green-500/30 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">AI Response</h3>
                    <div className="flex gap-2">
                      {!isEditingResponse ? (
                        <>
                          <Button
                            onClick={() => {
                              // Capture the height of the display div before switching
                              if (responseTextareaRef.current) {
                                const height = responseTextareaRef.current.offsetHeight
                                setResponseDisplayHeight(height)
                              }
                              setEditedResponse(response)
                              setIsEditingResponse(true)
                            }}
                            variant="outline"
                            size="sm"
                            className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Edit Text
                          </Button>
                          {selectedText && selectedText.trim().length > 0 && (
                            <Button
                              onClick={() => setShowAITextEditor(true)}
                              variant="outline"
                              size="sm"
                              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                            >
                              <Bot className="h-4 w-4 mr-2" />
                              Edit Selected ({selectedText.length} chars)
                            </Button>
                          )}
                          <Button
                            onClick={copyResponse}
                            variant="ghost"
                            size="sm"
                            className="text-yellow-400 hover:bg-yellow-400/10"
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
                              setResponse(editedResponse)
                              setIsEditingResponse(false)
                              toast({
                                title: "Text Updated",
                                description: "Your edits have been saved."
                              })
                            }}
                            variant="outline"
                            size="sm"
                            className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button
                            onClick={() => {
                              setIsEditingResponse(false)
                              setEditedResponse("")
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
                  <div className="prose prose-invert max-w-none">
                    {isEditingResponse ? (
                      <div 
                        className="min-h-[50px]"
                        style={{
                          minHeight: responseDisplayHeight ? `${responseDisplayHeight}px` : 'auto'
                        }}
                      >
                        <Textarea
                          value={editedResponse}
                          onChange={(e) => setEditedResponse(e.target.value)}
                          className="w-full bg-black/20 text-white border-green-500/10 rounded-lg p-4 text-base leading-relaxed whitespace-pre-wrap break-words resize-none"
                          style={{
                            wordSpacing: 'normal',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            lineHeight: 'inherit',
                            minHeight: responseDisplayHeight ? `${responseDisplayHeight}px` : '50px',
                            height: 'auto'
                          }}
                          placeholder="Edit your response here..."
                        />
                      </div>
                    ) : (
                      <>
                        <div 
                          ref={responseTextareaRef}
                          className="text-white leading-relaxed select-all cursor-text min-h-[50px] break-words p-4 bg-black/20 rounded-lg border border-green-500/10"
                          style={{ 
                            wordSpacing: 'normal', 
                            whiteSpace: 'pre-wrap', 
                            userSelect: 'text',
                            WebkitUserSelect: 'text',
                            MozUserSelect: 'text',
                            msUserSelect: 'text'
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation()
                            handleTextSelection()
                          }}
                          onKeyUp={(e) => {
                            e.stopPropagation()
                            handleTextSelection()
                          }}
                          onSelect={(e) => {
                            e.stopPropagation()
                            handleTextSelection()
                          }}
                        >
                          <span dangerouslySetInnerHTML={{ __html: formatMarkdownText(response) }} />
                          {isStreaming && (
                            <span className="inline-block w-2 h-5 bg-yellow-400 ml-1 animate-pulse"></span>
                          )}
                        </div>
                        
                        {/* Selection Helper Text */}
                        {response && !selectedText && (
                          <div className="mt-2 p-2 bg-purple-500/5 rounded border border-purple-500/20">
                            <p className="text-xs text-purple-400">
                              💡 Tip: Click "Edit Text" to edit the full response, or select text to edit with AI
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div ref={responseEndRef} />
                </div>

                {/* Selection Actions */}
                {selectedText && selectedText.trim().length > 0 && (
                  <div className="space-y-3 bg-neutral-900/50 p-4 rounded-2xl border border-purple-500/30 animate-in fade-in slide-in-from-bottom-2">
                    {/* Selection Info */}
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <span className="text-sm font-medium text-purple-400">
                        ✨ Selected: {selectedText.length} characters
                      </span>
                      <span className="text-xs text-blue-400">
                        💡 Use Ctrl/Cmd + Shift + A for quick AI editing
                      </span>
                    </div>
                    
                    {/* Quick Action Buttons */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={copySelection} className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button size="sm" variant="outline" onClick={clearSelection} className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear Selection
                      </Button>
                    </div>
                    
                    {/* AI Edit Section */}
                    <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                        <div>
                          <span className="text-sm font-semibold text-purple-400">
                            🤖 AI-Powered Text Editing
                          </span>
                          <p className="text-xs text-gray-400 mt-1">
                            Use AI to rewrite, improve, or modify your selected text.
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            console.log('[DEBUG] Opening AI editor with text:', selectedText.substring(0, 50))
                            setShowAITextEditor(true)
                          }} 
                          className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:border-purple-400"
                        >
                          <Bot className="h-4 w-4 mr-2" />
                          Edit with AI
                        </Button>
                      </div>
                    </div>
                    
                    {/* Preview of selected text */}
                    <div className="p-3 bg-black/30 rounded-lg border border-purple-500/10">
                      <p className="text-xs text-purple-300 mb-1">Selected text preview:</p>
                      <p className="text-xs text-gray-300 line-clamp-2">
                        "{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Text Editor Modal */}
                {showAITextEditor && (
                  <AITextEditor
                    isOpen={showAITextEditor}
                    onClose={() => setShowAITextEditor(false)}
                    selectedText={selectedText}
                    fullContent={response}
                    onTextReplace={handleAITextReplace}
                    contentType="script"
                  />
                )}
              </div>
            )}
            </div>
          </main>
        )}

        {/* Credits Purchase Dialog */}
        <CreditsPurchaseDialog 
          open={showCreditsDialog} 
          onClose={() => setShowCreditsDialog(false)}
          currentCredits={userCredits}
        />
      </div>
    </div>
  )
}

