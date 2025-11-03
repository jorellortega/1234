"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Bot, Sparkles, RotateCcw, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AITextEditorProps {
  isOpen: boolean
  onClose: () => void
  selectedText: string
  fullContent: string
  sceneContext?: string
  onTextReplace: (newText: string) => void
  contentType?: 'script' | 'description' | 'dialogue' | 'action'
}

export default function AITextEditor({
  isOpen,
  onClose,
  selectedText,
  fullContent,
  sceneContext,
  onTextReplace,
  contentType = 'script'
}: AITextEditorProps) {
  const { toast } = useToast()
  const [prompt, setPrompt] = useState("")
  const [selectedService, setSelectedService] = useState<'openai' | 'anthropic'>('openai')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setPrompt("")
      setGeneratedText("")
      setError(null)
      setShowPreview(false)
    }
  }, [isOpen])

  const getContentTypeSuggestions = () => {
    switch (contentType) {
      case 'script':
        return [
          "Make this dialogue more natural and conversational",
          "Add more emotional depth to this scene",
          "Make this action description more cinematic",
          "Improve the pacing and rhythm of this section",
          "Add more visual details and atmosphere"
        ]
      case 'description':
        return [
          "Make this description more vivid and engaging",
          "Add more sensory details",
          "Make this more cinematic and visual",
          "Improve the mood and atmosphere"
        ]
      case 'dialogue':
        return [
          "Make this dialogue more natural",
          "Add more emotion and subtext",
          "Make this more authentic to the character",
          "Improve the rhythm and flow"
        ]
      case 'action':
        return [
          "Make this action more dynamic",
          "Add more visual detail",
          "Improve the pacing",
          "Make this more cinematic"
        ]
      default:
        return [
          "Improve the writing quality",
          "Make this more engaging",
          "Add more detail and depth"
        ]
    }
  }

  const generateText = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a prompt describing how you want to modify the selected text.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          selectedText,
          fullContent,
          sceneContext,
          contentType,
          service: selectedService,
          apiKey: "use_env_vars"
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate text')
      }

      if (result.success && result.text) {
        setGeneratedText(result.text)
        setShowPreview(true)
        toast({
          title: "Text Generated!",
          description: `AI has generated new text using ${result.service}.`,
        })
      } else {
        throw new Error('No text was generated')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate text'
      setError(errorMessage)
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const applyGeneratedText = () => {
    if (generatedText.trim()) {
      onTextReplace(generatedText)
      onClose()
      toast({
        title: "Text Applied!",
        description: "The AI-generated text has been applied to your selection.",
      })
    }
  }

  const regenerateText = () => {
    setGeneratedText("")
    setShowPreview(false)
    setError(null)
    generateText()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black/90 border-yellow-500/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-400">
            <Bot className="h-5 w-5" />
            AI Text Editor
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Use AI to modify your selected text. The AI will consider the full context of your document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Service Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-yellow-400">AI Service</label>
            <Select value={selectedService} onValueChange={(value: 'openai' | 'anthropic') => setSelectedService(value)}>
              <SelectTrigger className="w-48 bg-black/50 border-yellow-500/50 text-yellow-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-yellow-500/50">
                <SelectItem value="openai" className="text-yellow-300 hover:bg-yellow-500/20">
                  <div className="flex items-center gap-2">
                    <span>ChatGPT (GPT-4)</span>
                    <Badge variant="secondary" className="text-xs">✓ Available</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="anthropic" className="text-yellow-300 hover:bg-yellow-500/20">
                  <div className="flex items-center gap-2">
                    <span>Claude (Claude 3)</span>
                    <Badge variant="secondary" className="text-xs">✓ Available</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selected Text Display */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-yellow-400">
              Selected Text ({selectedText.length} characters)
            </label>
            <div className="p-3 bg-neutral-900/50 rounded-lg border border-yellow-500/30">
              <p className="text-sm text-white whitespace-pre-wrap">
                {selectedText || 'No text selected'}
              </p>
            </div>
          </div>

          {/* Prompt Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-yellow-400">AI Prompt</label>
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want to modify the selected text..."
              className="min-h-[100px] resize-none bg-black/30 border-yellow-500/50 text-white placeholder-gray-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  generateText()
                }
              }}
            />
            
            {/* Quick Prompt Suggestions */}
            <div className="flex flex-wrap gap-2">
              {getContentTypeSuggestions().map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setPrompt(suggestion)}
                  className="text-xs h-7 px-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          {/* Scene Context */}
          {sceneContext && (
            <div className="space-y-3">
              <label className="text-xs text-yellow-400/70">
                Scene Context (AI will use this for better understanding)
              </label>
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-sm text-blue-400 max-h-32 overflow-y-auto">
                  {sceneContext}
                </p>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              onClick={generateText}
              disabled={!prompt.trim() || isGenerating}
              className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 text-white min-w-[200px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Generated Text Preview */}
          {showPreview && generatedText && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-lg font-semibold text-white">Generated Text</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateText}
                  disabled={isGenerating}
                  className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Regenerate
                </Button>
              </div>
              
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-sm text-white whitespace-pre-wrap">
                  {generatedText}
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={onClose} className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
                  Cancel
                </Button>
                <Button
                  onClick={applyGeneratedText}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apply Changes
                </Button>
              </div>
            </div>
          )}
        </div>

        {!showPreview && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

