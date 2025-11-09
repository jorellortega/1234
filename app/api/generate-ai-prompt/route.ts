import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

import { getAISettings, mapSettings, PUBLIC_AI_SETTING_KEYS } from "@/lib/ai-settings"
import { supabaseServer } from "@/lib/supabase-server"

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
const IMPROVER_MODEL = "gpt-4o-mini"

interface AuthResult {
  userId: string | null
  isAdmin: boolean
}

async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return { userId: null, isAdmin: false }
  }

  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const {
    data: { user },
    error: userError
  } = await supabaseAnon.auth.getUser(token)

  if (userError || !user) {
    return { userId: null, isAdmin: false }
  }

  const supabase = supabaseServer()
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return { userId: user.id, isAdmin: false }
  }

  return {
    userId: user.id,
    isAdmin: profile.role === "admin"
  }
}

async function callPromptImprover(apiKey: string, prompt: string, tone?: string) {
  const systemPrompt = [
    "You are an expert AI prompt engineer.",
    "You take an existing system prompt and enhance it for clarity, guardrails, and effectiveness.",
    "Respond with the improved prompt text only."
  ].join(" ")

  const userContent = [
    "Original prompt:",
    "```",
    prompt.trim(),
    "```",
    tone ? `Desired tone or adjustments: ${tone}` : "",
    "Return a refined prompt that keeps the original intent but improves structure, guardrails, and clarity."
  ]
    .filter(Boolean)
    .join("\n")

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: IMPROVER_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ]
    })
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    throw new Error(
      `Prompt improver request failed: ${response.status} ${response.statusText} ${errorPayload ? JSON.stringify(errorPayload) : ""}`
    )
  }

  const data = await response.json()
  const improvedPrompt = data?.choices?.[0]?.message?.content

  if (typeof improvedPrompt !== "string" || !improvedPrompt.trim()) {
    throw new Error("Prompt improver returned an empty response")
  }

  return improvedPrompt.trim()
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)

    if (!auth.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 })
    }

    const { prompt, tone } = (await request.json()) as {
      prompt?: string
      tone?: string
    }

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const settings = await getAISettings([PUBLIC_AI_SETTING_KEYS.OPENAI_KEY])
    const settingsMap = mapSettings(settings)
    const apiKey = settingsMap[PUBLIC_AI_SETTING_KEYS.OPENAI_KEY]?.trim()

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI key is not configured for public AI settings" },
        { status: 400 }
      )
    }

    const improvedPrompt = await callPromptImprover(apiKey, prompt, tone)

    return NextResponse.json({ prompt: improvedPrompt })
  } catch (error) {
    console.error("Error generating improved prompt:", error)
    return NextResponse.json(
      { error: "Failed to generate improved prompt" },
      { status: 500 }
    )
  }
}

