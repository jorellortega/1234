import { supabaseServer } from "@/lib/supabase-server"
import type { AISetting, AISettingsMap } from "@/lib/ai-types"

export const PUBLIC_AI_SETTING_KEYS = {
  OPENAI_KEY: "public_ai_openai_api_key",
  DEFAULT_MODEL: "public_ai_default_model",
  SYSTEM_PROMPT_SECTIONS: "public_ai_system_prompt_sections",
  GUARDRAIL_PROMPT: "public_ai_guardrail_prompt",
  WELCOME_MESSAGE: "public_ai_welcome_message",
  QUICK_REPLIES: "public_ai_quick_replies",
  ACTIONS: "public_ai_actions"
} as const

export const PUBLIC_AI_EXPOSED_KEYS: string[] = [
  PUBLIC_AI_SETTING_KEYS.DEFAULT_MODEL,
  PUBLIC_AI_SETTING_KEYS.WELCOME_MESSAGE,
  PUBLIC_AI_SETTING_KEYS.QUICK_REPLIES,
  PUBLIC_AI_SETTING_KEYS.ACTIONS
]

export const PUBLIC_AI_JSON_KEYS = new Set<string>([
  PUBLIC_AI_SETTING_KEYS.SYSTEM_PROMPT_SECTIONS,
  PUBLIC_AI_SETTING_KEYS.QUICK_REPLIES,
  PUBLIC_AI_SETTING_KEYS.ACTIONS
])

export function mapSettings(settings: AISetting[] | null | undefined): AISettingsMap {
  return (settings || []).reduce<AISettingsMap>((acc, setting) => {
    acc[setting.setting_key] = setting.setting_value ?? ""
    return acc
  }, {})
}

export async function getAISettings(keys?: string[]): Promise<AISetting[]> {
  const supabase = supabaseServer()
  let query = supabase
    .from("ai_settings")
    .select("setting_key, setting_value, description, created_at, updated_at")

  if (keys && keys.length > 0) {
    query = query.in("setting_key", keys)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return (data as AISetting[]) || []
}

export function buildSystemPromptFromSections(raw: string | null | undefined): string {
  if (!raw) return ""

  try {
    const sections = JSON.parse(raw)
    if (!Array.isArray(sections)) {
      return typeof raw === "string" ? raw : ""
    }

    return sections
      .filter((section) => section && typeof section.title === "string" && typeof section.content === "string")
      .map((section: { title: string; content: string }) => {
        const title = section.title.trim()
        const content = section.content.trim()
        if (!title && !content) return ""
        if (!title) return content
        return `### ${title}\n${content}`
      })
      .filter(Boolean)
      .join("\n\n")
  } catch {
    return raw ?? ""
  }
}

export function parseJsonSetting<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw)
    return parsed as T
  } catch {
    return fallback
  }
}

