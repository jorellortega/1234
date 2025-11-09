"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Save, Settings, Shield, Sparkles, Wand2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase, isSupabaseConfigured } from "@/lib/supabase-client"
import { PUBLIC_AI_SETTING_KEYS, PUBLIC_AI_SETTING_KEYS as KEYS, parseJsonSetting } from "@/lib/ai-settings"

const MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (recommended)" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" }
]

const DEFAULT_SETTINGS = {
  [KEYS.OPENAI_KEY]: "",
  [KEYS.DEFAULT_MODEL]: "gpt-4o-mini",
  [KEYS.WELCOME_MESSAGE]:
    "Hi there! I'm Infinito's public AI concierge. Ask me anything about the platform and I'll do my best to help.",
  [KEYS.GUARDRAIL_PROMPT]:
    "Keep responses concise, factual, and aligned with published information about Infinito. Do not promise delivery timelines or guarantees. If a question is sensitive, encourage the visitor to contact support directly.",
  [KEYS.SYSTEM_PROMPT_SECTIONS]: "[]",
  [KEYS.ACTIONS]: "[]"
}

type ActionTypeOption = "signup" | "link" | "prompt"

interface PublicAIAction {
  id: string
  label: string
  description?: string
  type?: ActionTypeOption | string
  payload?: Record<string, any>
}

interface PublicAIActionForm {
  id: string
  label: string
  description?: string
  type: ActionTypeOption
  payloadRaw: string
}

const DEFAULT_ACTIONS: PublicAIAction[] = [
  {
    id: "signup_flow",
    label: "Create an account",
    description: "Guide guests through creating an Infinito account.",
    type: "signup"
  }
]

type SettingsState = Record<string, string>

export default function PublicAISettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [hasAccess, setHasAccess] = useState(false)
  const [userChecked, setUserChecked] = useState(false)
  const [actions, setActions] = useState<PublicAIActionForm[]>([])

  const createActionId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const toFormAction = (action: PublicAIAction): PublicAIActionForm => ({
    id: action.id || createActionId(),
    label: action.label ?? "",
    description: action.description ?? "",
    type: (action.type as ActionTypeOption) || "signup",
    payloadRaw: action.payload ? JSON.stringify(action.payload, null, 2) : ""
  })

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

        const supabaseAdmin = supabase
        const { data: profile } = await supabaseAdmin
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

    const loadSettings = async () => {
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
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch settings (${response.status})`)
        }

        const data = await response.json()
        const fetchedSettings = (data?.settings || []) as Array<{
          setting_key: string
          setting_value: string
        }>

        const nextState: SettingsState = { ...DEFAULT_SETTINGS }
        let actionsValue = DEFAULT_SETTINGS[KEYS.ACTIONS]

        fetchedSettings.forEach((setting) => {
          if (setting.setting_key in nextState) {
            nextState[setting.setting_key] = setting.setting_value ?? ""
          }
          if (setting.setting_key === KEYS.ACTIONS) {
            actionsValue = setting.setting_value ?? DEFAULT_SETTINGS[KEYS.ACTIONS]
          }
        })

        const parsedActions = parseJsonSetting<PublicAIAction[]>(actionsValue, DEFAULT_ACTIONS)
        const actionsToUse = parsedActions.length > 0 ? parsedActions : DEFAULT_ACTIONS
        setActions(actionsToUse.map(toFormAction))
        nextState[KEYS.ACTIONS] = actionsValue || JSON.stringify(actionsToUse)

        setSettings(nextState)
      } catch (error) {
        console.error("Failed to load public AI settings:", error)
        toast({
          title: "Unable to load settings",
          description: "Check that the AI settings table exists and you have admin access.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (hasAccess) {
      loadSettings()
    }
  }, [hasAccess, toast])

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Configuration required",
        description: "Supabase environment variables are not set. Update your .env to save settings.",
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

      const normalizedActions: PublicAIAction[] = []
      for (const action of actions) {
        if (!action.label.trim()) continue
        let payloadObj: Record<string, any> | undefined
        if (action.payloadRaw.trim()) {
          try {
            payloadObj = JSON.parse(action.payloadRaw)
          } catch (error) {
            console.error("Invalid action payload:", error)
            toast({
              title: "Invalid action configuration",
              description: `Fix the payload for "${action.label || action.id}" before saving.`,
              variant: "destructive"
            })
            setSaving(false)
            return
          }
        }
        normalizedActions.push({
          id: action.id || createActionId(),
          label: action.label.trim(),
          description: action.description?.trim() || undefined,
          type: action.type,
          payload: payloadObj
        })
      }

      const response = await fetch("/api/public-ai/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          settings: {
            [KEYS.OPENAI_KEY]: settings[KEYS.OPENAI_KEY],
            [KEYS.DEFAULT_MODEL]: settings[KEYS.DEFAULT_MODEL],
            [KEYS.WELCOME_MESSAGE]: settings[KEYS.WELCOME_MESSAGE],
            [KEYS.GUARDRAIL_PROMPT]: settings[KEYS.GUARDRAIL_PROMPT],
            [KEYS.ACTIONS]: JSON.stringify(normalizedActions)
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save settings (${response.status})`)
      }

      toast({
        title: "Settings saved",
        description: "Public AI configuration updated successfully."
      })

      setSettings((prev) => ({
        ...prev,
        [KEYS.ACTIONS]: JSON.stringify(normalizedActions)
      }))
      setActions(normalizedActions.map(toFormAction))
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to update settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePromptEnhancement = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Configuration required",
        description: "Supabase environment variables are not set. Update your .env to enhance prompts.",
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
          prompt: settings[KEYS.GUARDRAIL_PROMPT],
          tone: "friendly, professional, trustworthy"
        })
      })

      if (!response.ok) {
        throw new Error(`Prompt enhancement failed (${response.status})`)
      }

      const data = await response.json()
      if (data?.prompt) {
        setSettings((prev) => ({
          ...prev,
          [KEYS.GUARDRAIL_PROMPT]: data.prompt
        }))
        toast({
          title: "Prompt enhanced",
          description: "The guardrail prompt has been refined by the AI."
        })
      }
    } catch (error) {
      console.error("Prompt enhancement failed:", error)
      toast({
        title: "Enhancement failed",
        description: "Make sure the OpenAI key is configured and try again.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddAction = () => {
    setActions((prev) => [
      ...prev,
      {
        id: createActionId(),
        label: "",
        description: "",
        type: "signup",
        payloadRaw: ""
      }
    ])
  }

  const handleRemoveAction = (id: string) => {
    setActions((prev) => prev.filter((action) => action.id !== id))
  }

  const updateAction = (id: string, updates: Partial<PublicAIActionForm>) => {
    setActions((prev) =>
      prev.map((action) => (action.id === id ? { ...action, ...updates } : action))
    )
  }

  if (!userChecked || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-slate-400">Preparing AI settings...</p>
        </div>
      </div>
    )
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <Card className="w-full max-w-md border-amber-500/30 bg-amber-950/20 p-6">
          <CardTitle className="mb-2 text-xl text-amber-200">Supabase Not Configured</CardTitle>
          <CardDescription className="text-sm text-amber-100/80">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,{" "}
            <code>SUPABASE_URL</code>, and <code>SUPABASE_SERVICE_ROLE_KEY</code> to your environment to manage the
            public AI assistant.
          </CardDescription>
        </Card>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <Card className="w-full max-w-md border-red-500/30 bg-red-950/20 p-6">
          <CardTitle className="mb-2 text-xl text-red-300">Admin Access Required</CardTitle>
          <CardDescription className="text-sm text-red-200">
            The public AI configuration is only available to administrators. Please sign in with an
            admin account.
          </CardDescription>
          <div className="mt-6">
            <Link href="/login">
              <Button className="w-full bg-cyan-600 hover:bg-cyan-500">Go to Login</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black py-10 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Public AI Configuration</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage the concierge model, welcome message, and guardrails for logged-out visitors.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-500">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-slate-800 bg-slate-950/80 backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-cyan-300" />
                <div>
                  <CardTitle className="text-lg text-white">Provider Credentials</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Store the API key used exclusively for the public concierge.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key" className="text-sm text-slate-300">
                  OpenAI API Key
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="openai-key"
                    type={showSecrets ? "text" : "password"}
                    value={settings[KEYS.OPENAI_KEY]}
                    onChange={(event) => handleChange(KEYS.OPENAI_KEY, event.target.value)}
                    placeholder="sk-..."
                    className="bg-slate-900/80 text-slate-100"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSecrets((prev) => !prev)}
                    className="border-slate-700 bg-slate-900/60"
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  This key is only used for the logged-out concierge. Rotate it regularly.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-950/80 backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-cyan-300" />
                <div>
                  <CardTitle className="text-lg text-white">Default Model</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Choose the model used for public conversations.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model" className="text-sm text-slate-300">
                  Model Selection
                </Label>
                <Select
                  value={settings[KEYS.DEFAULT_MODEL]}
                  onValueChange={(value) => handleChange(KEYS.DEFAULT_MODEL, value)}
                >
                  <SelectTrigger id="model" className="bg-slate-900/80 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                    {MODEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  GPT-4o Mini offers a great balance between cost and conversational quality.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-cyan-300" />
                <div>
                  <CardTitle className="text-lg text-white">Welcome Experience</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Configure the greeting message shown to every visitor.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-300">
                Public Facing
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="welcome-message" className="text-sm text-slate-300">
              Concierge Welcome Message
            </Label>
            <Textarea
              id="welcome-message"
              value={settings[KEYS.WELCOME_MESSAGE]}
              onChange={(event) => handleChange(KEYS.WELCOME_MESSAGE, event.target.value)}
              className="min-h-[120px] resize-none border-slate-800 bg-slate-900/80 text-slate-100"
            />
            <p className="text-xs text-slate-500">
              This message appears immediately when a visitor opens the public concierge.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-emerald-300" />
                <div>
                  <CardTitle className="text-lg text-white">Guardrail Prompt</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Define safety instructions applied to every AI response.
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePromptEnhancement}
                disabled={saving}
                className="border-cyan-600/70 bg-slate-900/60 text-cyan-200 hover:bg-cyan-500/10"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Enhance
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={settings[KEYS.GUARDRAIL_PROMPT]}
              onChange={(event) => handleChange(KEYS.GUARDRAIL_PROMPT, event.target.value)}
              className="min-h-[180px] resize-none border-slate-800 bg-slate-900/80 text-slate-100"
              placeholder="Outline tone, escalation guidance, and what the public assistant should avoid..."
            />
            <p className="text-xs text-slate-500">
              Use this prompt to keep messaging on-brand and protect sensitive details. The concierge
              follows it before responding to any visitor.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur">
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-white">Concierge Actions</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Configure buttons the public assistant can trigger (e.g., start signup, open links).
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddAction}
              className="border-cyan-600/70 bg-slate-900/60 text-cyan-200 hover:bg-cyan-500/10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Action
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {actions.length === 0 ? (
              <p className="text-sm text-slate-400">
                No actions configured yet. Add an action to help guests complete tasks like signing up or
                opening specific pages.
              </p>
            ) : (
              actions.map((action, index) => {
                const payloadPlaceholder =
                  action.type === "link"
                    ? '{"href": "/signup"}'
                    : action.type === "prompt"
                      ? '{"prompt": "Tell me about pricing"}'
                      : "Payload optional. Leave empty unless additional data is required."

                return (
                  <div
                    key={action.id}
                    className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="border-cyan-500/50 text-cyan-200">
                        Action #{index + 1}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAction(action.id)}
                        className="text-red-300 hover:text-red-200"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`action-label-${action.id}`} className="text-xs uppercase text-slate-400">
                          Label
                        </Label>
                        <Input
                          id={`action-label-${action.id}`}
                          value={action.label}
                          onChange={(event) => updateAction(action.id, { label: event.target.value })}
                          placeholder="Create an account"
                          className="bg-slate-900/80 text-slate-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`action-type-${action.id}`} className="text-xs uppercase text-slate-400">
                          Type
                        </Label>
                        <Select
                          value={action.type}
                          onValueChange={(value: ActionTypeOption) => updateAction(action.id, { type: value })}
                        >
                          <SelectTrigger id={`action-type-${action.id}`} className="bg-slate-900/80 text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                            <SelectItem value="signup">Signup Flow</SelectItem>
                            <SelectItem value="link">Open Link</SelectItem>
                            <SelectItem value="prompt">Prefill Prompt</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`action-description-${action.id}`} className="text-xs uppercase text-slate-400">
                        Description
                      </Label>
                      <Input
                        id={`action-description-${action.id}`}
                        value={action.description ?? ""}
                        onChange={(event) => updateAction(action.id, { description: event.target.value })}
                        placeholder="Guide guests through creating an account."
                        className="bg-slate-900/80 text-slate-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`action-payload-${action.id}`} className="text-xs uppercase text-slate-400">
                        Payload (JSON)
                      </Label>
                      <Textarea
                        id={`action-payload-${action.id}`}
                        value={action.payloadRaw}
                        onChange={(event) => updateAction(action.id, { payloadRaw: event.target.value })}
                        placeholder={payloadPlaceholder}
                        className="min-h-[100px] resize-none border-slate-800 bg-slate-900/80 text-slate-100 font-mono text-xs"
                      />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

