"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, MessageCircle, Sparkles, User, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

import type { AIMessage } from "@/lib/ai-types"

interface PublicSettingsResponse {
  settings?: Record<string, string>
}

interface QuickReply {
  id: string
  label: string
  prompt: string
}

const QUICK_REPLIES_KEY = "public_ai_quick_replies"
const WELCOME_MESSAGE_KEY = "public_ai_welcome_message"

const DEFAULT_WELCOME =
  "Hi there! I'm Infinito's public AI concierge. Ask me anything about the platform and I'll do my best to help."

export default function PublicAIPage() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<AIMessage[]>([{ role: "assistant", content: DEFAULT_WELCOME }])
  const [input, setInput] = useState("")
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [isSending, setIsSending] = useState(false)
  const [assistantReady, setAssistantReady] = useState(true)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/public-ai/settings?public=true", { cache: "no-store" })
        if (!response.ok) throw new Error(`Failed to load public AI settings (${response.status})`)

        const data = (await response.json()) as PublicSettingsResponse
        const welcome = data.settings?.[WELCOME_MESSAGE_KEY]
        const quickRepliesRaw = data.settings?.[QUICK_REPLIES_KEY]

        if (welcome) {
          setMessages([{ role: "assistant", content: welcome }])
        }

        if (quickRepliesRaw) {
          try {
            const parsed = JSON.parse(quickRepliesRaw)
            if (Array.isArray(parsed)) {
              setQuickReplies(
                parsed
                  .filter(
                    (reply) =>
                      reply &&
                      typeof reply.id === "string" &&
                      typeof reply.label === "string" &&
                      typeof reply.prompt === "string"
                  )
                  .slice(0, 6)
              )
            }
          } catch {
            setQuickReplies([])
          }
        }

        setAssistantReady(true)
      } catch (error) {
        console.error("Failed to load public AI settings:", error)
        setAssistantReady(false)
        setQuickReplies([])
      } finally {
        setSettingsLoaded(true)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending])

  const sendMessage = async (message: string) => {
    if (!message.trim() || !assistantReady) return

    const trimmed = message.trim()
    const userMessage: AIMessage = { role: "user", content: trimmed, timestamp: new Date().toISOString() }

    const history = [...messages, userMessage]
    setMessages(history)
    setInput("")
    setIsSending(true)

    try {
      const response = await fetch("/api/public-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationHistory: history })
      })

      if (!response.ok) throw new Error(`Assistant request failed (${response.status})`)

      const data = await response.json()
      const reply = (data?.message as string | undefined)?.trim()

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply || "I'm still learning, but I'll try to answer better next time!"
        }
      ])
    } catch (error) {
      console.error("Public AI chat error:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please try again in a moment or reach out directly at hello@infinito.ai."
        }
      ])
      setAssistantReady(false)
      toast({
        title: "Connection issue",
        description: "We couldn't reach the AI concierge. Please try again shortly.",
        variant: "destructive"
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await sendMessage(input)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:py-16">
        <div className="flex w-full flex-col gap-4 md:w-2/3">
          <Card className="border-slate-800 bg-slate-950/70 backdrop-blur">
            <CardHeader className="border-b border-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-cyan-500/10 p-2">
                    <Bot className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-white">Infinito Concierge</CardTitle>
                    <p className="text-sm text-slate-400">Ask anything about the platform—no account required.</p>
                  </div>
                </div>
                <Badge
                  variant={assistantReady ? "outline" : "secondary"}
                  className={assistantReady ? "border-cyan-500/70 text-cyan-300" : "border-slate-600 text-slate-400"}
                >
                  {assistantReady ? "Online" : "Offline"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[420px] space-y-4 overflow-y-auto px-6 py-6">
                <div className="flex flex-col gap-4">
                  {messages.map((message, index) => {
                    const isAssistant = message.role === "assistant"
                    return (
                      <div
                        key={`${message.role}-${index}`}
                        className={`flex items-start gap-3 ${isAssistant ? "" : "justify-end"}`}
                      >
                        {isAssistant && (
                          <div className="rounded-full bg-cyan-500/20 p-2">
                            <Bot className="h-4 w-4 text-cyan-300" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                            isAssistant
                              ? "bg-slate-900/80 text-slate-200"
                              : "bg-cyan-500/20 text-cyan-100 backdrop-blur transition"
                          }`}
                        >
                          {message.content}
                        </div>
                        {!isAssistant && (
                          <div className="rounded-full bg-cyan-500/20 p-2">
                            <User className="h-4 w-4 text-cyan-300" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {isSending && (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Bot className="h-4 w-4 animate-pulse text-cyan-300" />
                      Thinking...
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              </div>
              <form onSubmit={handleSubmit} className="border-t border-slate-900 bg-slate-950/60 p-6">
                <div className="flex flex-col gap-3">
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about pricing, features, or how Infinito works..."
                    className="min-h-[100px] resize-none border-slate-800 bg-slate-900/70 text-slate-100 placeholder:text-slate-500"
                    disabled={!assistantReady}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">This public assistant doesn&apos;t store any personal data.</p>
                    <Button
                      type="submit"
                      className="bg-cyan-600 text-white hover:bg-cyan-500"
                      disabled={!input.trim() || isSending || !assistantReady || !settingsLoaded}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="flex w-full flex-col gap-4 md:w-1/3">
          <Card className="border-slate-800 bg-slate-950/70 backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-cyan-300" />
                <CardTitle className="text-base font-semibold text-white">Quick Questions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickReplies.length > 0 ? (
                quickReplies.map((reply) => (
                  <Button
                    key={reply.id}
                    variant="outline"
                    className="w-full border-slate-800 bg-slate-900/70 text-left text-sm text-slate-100 hover:border-cyan-500/50 hover:bg-cyan-500/10"
                    onClick={() => sendMessage(reply.prompt)}
                    disabled={!assistantReady || isSending}
                  >
                    {reply.label}
                  </Button>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  Popular questions appear here when configured in the admin prompts dashboard.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-950/70 backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-300" />
                <CardTitle className="text-base font-semibold text-white">What it Can Do</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <ul className="space-y-2">
                <li>• Explain what&apos;s included in each plan</li>
                <li>• Recommend AI tools based on your project</li>
                <li>• Share the latest roadmap updates</li>
                <li>• Help you get started with Infinito</li>
              </ul>
              <p className="text-xs text-slate-500">
                It won&apos;t perform private account actions or generate creative assets—that lives inside the main
                Infinito studio after you sign in.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

