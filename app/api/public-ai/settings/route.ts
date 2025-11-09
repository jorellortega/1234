import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

import {
  getAISettings,
  mapSettings,
  PUBLIC_AI_EXPOSED_KEYS,
  PUBLIC_AI_JSON_KEYS,
  PUBLIC_AI_SETTING_KEYS
} from "@/lib/ai-settings"
import type { AISetting } from "@/lib/ai-types"
import { supabaseServer, isSupabaseServerConfigured } from "@/lib/supabase-server"

const isSupabaseClientConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const PUBLIC_KEYS_SET = new Set(PUBLIC_AI_EXPOSED_KEYS)

interface AuthResult {
  userId: string | null
  isAdmin: boolean
}

async function getAuthContext(request: NextRequest): Promise<AuthResult> {
  if (!isSupabaseClientConfigured || !isSupabaseServerConfigured) {
    return { userId: null, isAdmin: false }
  }

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

function formatPublicResponse(settings: AISetting[]) {
  const filtered = settings.filter((setting) => PUBLIC_KEYS_SET.has(setting.setting_key))
  return {
    settings: mapSettings(filtered)
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const isPublic = searchParams.get("public") === "true"

  try {
    if (!isSupabaseServerConfigured) {
      return NextResponse.json(
        { error: "Supabase service role not configured" },
        { status: 503 }
      )
    }

    const auth = await getAuthContext(request)

    if (!isPublic && !auth.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 })
    }

    const keys = isPublic ? PUBLIC_AI_EXPOSED_KEYS : undefined
    const settings = await getAISettings(keys)

    if (isPublic) {
      return NextResponse.json(formatPublicResponse(settings))
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error fetching AI settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch AI settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isSupabaseClientConfigured || !isSupabaseServerConfigured) {
      return NextResponse.json(
        { error: "Supabase environment variables are not configured" },
        { status: 503 }
      )
    }

    const auth = await getAuthContext(request)

    if (!auth.isAdmin || !auth.userId) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, string> | undefined = body?.settings

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
    }

    const allowedKeys = new Set(Object.values(PUBLIC_AI_SETTING_KEYS))
    const payload: Array<{ setting_key: string; setting_value: string }> = []

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.has(key)) {
        return NextResponse.json({ error: `Unsupported setting key: ${key}` }, { status: 400 })
      }

      if (value === undefined) {
        continue
      }

      const normalizedValue =
        typeof value === "string"
          ? value
          : PUBLIC_AI_JSON_KEYS.has(key)
            ? JSON.stringify(value)
            : String(value)

      payload.push({
        setting_key: key,
        setting_value: normalizedValue
      })
    }

    if (payload.length === 0) {
      return NextResponse.json({ error: "No valid settings provided" }, { status: 400 })
    }

    const supabase = supabaseServer()
    const { data, error } = await supabase
      .from("ai_settings")
      .upsert(payload, { onConflict: "setting_key" })
      .select("setting_key, setting_value, description, created_at, updated_at")

    if (error) {
      console.error("Failed to update AI settings:", error)
      return NextResponse.json({ error: "Failed to update AI settings" }, { status: 500 })
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error("Error updating AI settings:", error)
    return NextResponse.json({ error: "Failed to update AI settings" }, { status: 500 })
  }
}

