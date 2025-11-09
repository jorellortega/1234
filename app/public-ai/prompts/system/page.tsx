"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Plus, Save, Trash2, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase, isSupabaseConfigured } from "@/lib/supabase-client"
import { PUBLIC_AI_SETTING_KEYS, parseJsonSetting } from "@/lib/ai-settings"

interface PromptSection {
  id: string
  title: string
  content: string
}

const DEFAULT_SECTIONS: PromptSection[] = [
  {
    id: "role",
    title: "Role",
    content: "You are Infinito's public-facing concierge. Your job is to educate visitors and invite them into the platform."
  },
  {
    id: "tone",
    title: "Tone of Voice",
    content:
      "Sound friendly, confident, and concise. Avoid marketing fluff. Keep answers under 4 short paragraphs whenever possible."
  },
  {
    id: "boundaries",
    title: "Boundaries",
    content:
      "Never promise custom work, discounts, or features that are not publicly announced. If asked for sensitive account info, invite the user to email hello@infinito.ai."
  }
]

function createSection(): PromptSection {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `section-${Date.now()}`
  return { id, title: "New Section", content: "" }
}

export default function PublicAISystemPromptPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sections, setSections] = useState<PromptSection[]>(DEFAULT_SECTIONS)
  const [hasAccess, setHasAccess] = useState(false)
  const [userChecked, setUserChecked] = useState(false)

  const combinedPrompt = useMemo(() => {
    return sections
      .map((section) => {
        const title = section.title.trim()
        const content = section.content.trim()
        if (!title && !content) return ""
        if (!title) return content
        return `### ${title}\n${content}`
      })
      .filter(Boolean)
      .join("\n\n")
  }, [sections])

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

    const loadSections = async () => {
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
        const rawSections = data?.settings?.find?.(
          (item: { setting_key: string }) => item.setting_key === PUBLIC_AI_SETTING_KEYS.SYSTEM_PROMPT_SECTIONS
        )?.setting_value

        const parsedSections = parseJsonSetting<PromptSection[]>(rawSections, DEFAULT_SECTIONS)
        if (Array.isArray(parsedSections) && parsedSections.length > 0) {
          setSections(
            parsedSections.map((section, index) => ({
              id: section.id || `section-${index}`,
              title: section.title || `Section ${index + 1}`,
              content: section.content || ""
            }))
          )
        } else {
          setSections(DEFAULT_SECTIONS)
        }
      } catch (error) {
        console.error("Failed to load system prompt:", error)
        toast({
          title: "Unable to load prompt",
          description: "The system prompt settings could not be retrieved.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (hasAccess) {
      loadSections()
    }
  }, [hasAccess, toast])

  const updateSection = (id: string, updates: Partial<PromptSection>) => {
    setSections((prev) =>
      prev.map((section) => (section.id === id ? { ...section, ...updates } : section))
    )
  }

  const addSection = () => {
    setSections((prev) => [...prev, createSection()])
  }

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((section) => section.id !== id))
  }

  const handleSave = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Configuration required",
        description: "Supabase environment variables are not set. Update your .env to enable editing.",
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
            [PUBLIC_AI_SETTING_KEYS.SYSTEM_PROMPT_SECTIONS]: JSON.stringify(sections)
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save prompt (${response.status})`)
      }

      toast({
        title: "Prompt saved",
        description: "The system prompt sections have been updated."
      })
    } catch (error) {
      console.error("Failed to save prompt sections:", error)
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to update the prompt",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEnhance = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Configuration required",
        description: "Supabase environment variables are not set. Update your .env to enable prompt enhancement.",
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

      const response = await fetch("/api/generate-ai-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt: combinedPrompt,
          tone: "helpful, trustworthy, concise concierge for a software platform"
        })
      })

      if (!response.ok) {
        throw new Error(`Prompt enhancement failed (${response.status})`)
      }

      const data = await response.json()
      if (data?.prompt) {
        const enhanced = data.prompt as string
        setSections([
          {
            id: "enhanced",
            title: "Enhanced Prompt",
            content: enhanced
          }
        ])
        toast({
          title: "Prompt enhanced",
          description: "Review the AI-refined prompt, then adjust or split into new sections."
        })
      }
    } catch (error) {
      console.error("Prompt enhancement failed:", error)
      toast({
        title: "Enhancement failed",
        description: "Ensure the OpenAI key is configured in settings and try again.",
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
        <p className="text-sm text-slate-400">Loading system prompt builder...</p>
      </Card>
    )
  }

  if (!isSupabaseConfigured) {
    return (
      <Card className="border-amber-500/40 bg-amber-950/20 p-10 text-center text-white">
        <CardTitle className="text-xl text-amber-200">Supabase Not Configured</CardTitle>
        <CardDescription className="mt-2 text-sm text-amber-100/80">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your environment to
          unlock the public prompt builder.
        </CardDescription>
      </Card>
    )
  }

  if (!hasAccess) {
    return (
      <Card className="border-red-500/40 bg-red-950/20 p-10 text-center text-white">
        <CardTitle className="text-xl text-red-300">Admin Access Required</CardTitle>
        <CardDescription className="mt-2 text-sm text-red-100">
          You must be an administrator to edit the public assistant&apos;s system prompt.
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
          <h2 className="text-2xl font-semibold text-white">System Prompt Sections</h2>
          <p className="text-sm text-slate-400">
            Structure the concierge&apos;s behavior into digestible sections. They are merged into the final
            system prompt.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={addSection}
            className="border-cyan-500/40 bg-slate-950/80 text-cyan-200 hover:bg-cyan-500/10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-500">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving..." : "Save Sections"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {sections.map((section, index) => (
          <Card key={section.id} className="border-slate-800 bg-slate-950/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base text-white">
                  Section {index + 1}
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Title and content combine into the system prompt body.
                </CardDescription>
              </div>
              {sections.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSection(section.id)}
                  className="text-red-300 hover:text-red-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor={`title-${section.id}`} className="text-xs uppercase text-slate-400">
                  Title
                </Label>
                <Input
                  id={`title-${section.id}`}
                  value={section.title}
                  onChange={(event) => updateSection(section.id, { title: event.target.value })}
                  className="bg-slate-900/80 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`content-${section.id}`} className="text-xs uppercase text-slate-400">
                  Instructions
                </Label>
                <Textarea
                  id={`content-${section.id}`}
                  value={section.content}
                  onChange={(event) => updateSection(section.id, { content: event.target.value })}
                  className="min-h-[160px] resize-none bg-slate-900/80 text-slate-100"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-800 bg-slate-950/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base text-white">Preview Prompt</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              This is what gets sent as the system prompt when visitors chat with the concierge.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleEnhance}
            disabled={saving}
            className="border-cyan-600/70 bg-slate-900/60 text-cyan-200 hover:bg-cyan-500/10"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Enhance
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={combinedPrompt}
            readOnly
            className="min-h-[220px] bg-slate-900/80 text-slate-100"
          />
          <p className="text-xs text-slate-500">
            Tip: copy this prompt into a separate doc for version history before making large changes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

