"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Clipboard, Loader2, Plus, Save, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase, isSupabaseConfigured } from "@/lib/supabase-client"
import { PUBLIC_AI_SETTING_KEYS, parseJsonSetting } from "@/lib/ai-settings"

interface QuickReply {
  id: string
  label: string
  prompt: string
}

const DEFAULT_REPLIES: QuickReply[] = [
  {
    id: "pricing",
    label: "How does pricing work?",
    prompt: "What are the current pricing plans and what's included with each tier?"
  },
  {
    id: "features",
    label: "What can Infinito do?",
    prompt: "Give me a quick rundown of Infinito's main AI features."
  }
]

function createQuickReply(): QuickReply {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `reply-${Date.now()}`
  return {
    id,
    label: "New Quick Reply",
    prompt: ""
  }
}

export default function PublicAIQuickRepliesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [replies, setReplies] = useState<QuickReply[]>(DEFAULT_REPLIES)
  const [hasAccess, setHasAccess] = useState(false)
  const [userChecked, setUserChecked] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setHasAccess(false)
      setUserChecked(true)
      setLoading(false)
      return
    }

    const checkAdminAccess = async () => {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser()

        if (!user) {
          setHasAccess(false)
          setUserChecked(true)
          return
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()

        setHasAccess(profile?.role === "admin")
      } catch (error) {
        console.error("Failed to verify admin access:", error)
        setHasAccess(false)
      } finally {
        setUserChecked(true)
      }
    }

    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    const loadReplies = async () => {
      if (!hasAccess) {
        setLoading(false)
        return
      }

      try {
        const {
          data: { session }
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          setHasAccess(false)
          return
        }

        const response = await fetch("/api/public-ai/settings", {
          headers: { Authorization: `Bearer ${session.access_token}` }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch settings (${response.status})`)
        }

        const data = await response.json()
        const rawReplies = data?.settings?.find?.(
          (item: { setting_key: string }) => item.setting_key === PUBLIC_AI_SETTING_KEYS.QUICK_REPLIES
        )?.setting_value

        const parsedReplies = parseJsonSetting<QuickReply[]>(rawReplies, DEFAULT_REPLIES)
        if (Array.isArray(parsedReplies) && parsedReplies.length > 0) {
          setReplies(
            parsedReplies.map((reply, index) => ({
              id: reply.id || `reply-${index}`,
              label: reply.label || `Quick Reply ${index + 1}`,
              prompt: reply.prompt || ""
            }))
          )
        } else {
          setReplies(DEFAULT_REPLIES)
        }
      } catch (error) {
        console.error("Failed to load quick replies:", error)
        toast({
          title: "Unable to load quick replies",
          description: "The quick reply library could not be retrieved.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (hasAccess) {
      loadReplies()
    }
  }, [hasAccess, toast])

  const updateReply = (id: string, updates: Partial<QuickReply>) => {
    setReplies((prev) => prev.map((reply) => (reply.id === id ? { ...reply, ...updates } : reply)))
  }

  const addReply = () => {
    setReplies((prev) => [...prev, createQuickReply()])
  }

  const removeReply = (id: string) => {
    setReplies((prev) => prev.filter((reply) => reply.id !== id))
  }

  const handleSave = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Configuration required",
        description: "Supabase environment variables are not set. Update your .env to save quick replies.",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)

      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error("Authentication required")
      }

      const response = await fetch("/api/public-ai/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          settings: {
            [PUBLIC_AI_SETTING_KEYS.QUICK_REPLIES]: JSON.stringify(replies)
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save quick replies (${response.status})`)
      }

      toast({
        title: "Quick replies saved",
        description: "Visitors will see these shortcuts in the public assistant."
      })
    } catch (error) {
      console.error("Failed to save quick replies:", error)
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to update quick replies",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (!userChecked || loading) {
    return (
      <Card className="border-slate-800 bg-slate-950/70 p-10 text-center text-white">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-400" />
        <p className="text-sm text-slate-400">Loading quick reply library...</p>
      </Card>
    )
  }

  if (!isSupabaseConfigured) {
    return (
      <Card className="border-amber-500/40 bg-amber-950/20 p-10 text-center text-white">
        <CardTitle className="text-xl text-amber-200">Supabase Not Configured</CardTitle>
        <CardDescription className="mt-2 text-sm text-amber-100/80">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment to
          manage quick replies.
        </CardDescription>
      </Card>
    )
  }

  if (!hasAccess) {
    return (
      <Card className="border-red-500/40 bg-red-950/20 p-10 text-center text-white">
        <CardTitle className="text-xl text-red-300">Admin Access Required</CardTitle>
        <CardDescription className="mt-2 text-sm text-red-100">
          You must be an administrator to manage the public assistant&apos;s quick replies.
        </CardDescription>
        <div className="mt-6 flex justify-center">
          <Link href="/login">
            <Button className="bg-cyan-600 hover:bg-cyan-500">Go to Login</Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Quick Reply Library</h2>
          <p className="text-sm text-slate-400">
            Curate shortcuts for the most common public questions. These appear as buttons in the concierge.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={addReply}
            className="border-cyan-500/40 bg-slate-950/80 text-cyan-200 hover:bg-cyan-500/10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Quick Reply
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-500">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving..." : "Save Replies"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {replies.map((reply, index) => (
          <Card key={reply.id} className="border-slate-800 bg-slate-950/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base text-white">
                  Quick Reply {index + 1}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Visitors see the label; clicking it sends the full prompt.
                </CardDescription>
              </div>
              {replies.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeReply(reply.id)}
                  className="text-red-300 hover:text-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`label-${reply.id}`} className="text-xs uppercase text-slate-400">
                  Button Label
                </Label>
                <Input
                  id={`label-${reply.id}`}
                  value={reply.label}
                  onChange={(event) => updateReply(reply.id, { label: event.target.value })}
                  className="bg-slate-900/80 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`prompt-${reply.id}`} className="text-xs uppercase text-slate-400">
                  Prompt Text
                </Label>
                <Textarea
                  id={`prompt-${reply.id}`}
                  value={reply.prompt}
                  onChange={(event) => updateReply(reply.id, { prompt: event.target.value })}
                  className="min-h-[140px] resize-none bg-slate-900/80 text-slate-100"
                />
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
                <p className="mb-1 font-semibold text-slate-300">Suggestion</p>
                <p>
                  Write prompts in the visitor&apos;s voice (“What does your roadmap look like?”) so the concierge
                  understands context without extra conversion.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-800 bg-slate-950/80">
        <CardHeader>
          <CardTitle className="text-base text-white">Preview</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Here&apos;s how the quick replies appear inside the public assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {replies.map((reply) => (
            <Badge
              key={reply.id}
              variant="outline"
              className="border-cyan-500/30 bg-slate-900/80 px-4 py-2 text-cyan-200"
            >
              <Clipboard className="mr-2 h-3.5 w-3.5" />
              {reply.label}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

