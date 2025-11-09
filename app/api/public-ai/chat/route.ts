import { NextRequest, NextResponse } from "next/server"

import { buildSystemPromptFromSections, getAISettings, mapSettings, PUBLIC_AI_SETTING_KEYS } from "@/lib/ai-settings"
import type { AIMessage } from "@/lib/ai-types"

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
const DEFAULT_MODEL = "gpt-4o-mini"

interface ChatRequestBody {
  message?: string
  conversationHistory?: AIMessage[]
}

function sanitizeMessages(messages: AIMessage[] | undefined): AIMessage[] {
  if (!Array.isArray(messages)) return []

  return messages
    .filter(
      (message): message is AIMessage =>
        typeof message?.role === "string" &&
        typeof message?.content === "string" &&
        (message.role === "user" || message.role === "assistant")
    )
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 4000)
    }))
}

async function callOpenAIChat({
  apiKey,
  model,
  messages
}: {
  apiKey: string
  model: string
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
}) {
  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 400
    })
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null)
    throw new Error(
      `OpenAI request failed: ${response.status} ${response.statusText} ${errorPayload ? JSON.stringify(errorPayload) : ""}`
    )
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Empty response from OpenAI")
  }

  return content.trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody
    const userMessage = body?.message?.trim()

    if (!userMessage) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const [settings] = await Promise.all([
      getAISettings([
        PUBLIC_AI_SETTING_KEYS.OPENAI_KEY,
        PUBLIC_AI_SETTING_KEYS.DEFAULT_MODEL,
        PUBLIC_AI_SETTING_KEYS.SYSTEM_PROMPT_SECTIONS,
        PUBLIC_AI_SETTING_KEYS.GUARDRAIL_PROMPT
      ])
    ])

    const settingsMap = mapSettings(settings)
    const apiKey = settingsMap[PUBLIC_AI_SETTING_KEYS.OPENAI_KEY]?.trim()

    if (!apiKey) {
      console.warn("[public-ai/chat] Missing OpenAI key in settings")
      return NextResponse.json(
        {
          message:
            "Our assistant is currently offline while we update its configuration. Please check back soon!"
        },
        { status: 200 }
      )
    }

    const selectedModel = settingsMap[PUBLIC_AI_SETTING_KEYS.DEFAULT_MODEL]?.trim() || DEFAULT_MODEL
    const systemPromptSections = settingsMap[PUBLIC_AI_SETTING_KEYS.SYSTEM_PROMPT_SECTIONS]
    const guardrailPrompt = settingsMap[PUBLIC_AI_SETTING_KEYS.GUARDRAIL_PROMPT]?.trim()
    const systemPrompt = buildSystemPromptFromSections(systemPromptSections)

    const sanitizedHistory = sanitizeMessages(body.conversationHistory)

    const keyPreview = `${"*".repeat(Math.max(0, apiKey.length - 4))}${apiKey.slice(-4)}`
    console.log("[public-ai/chat] Invoking OpenAI", {
      model: selectedModel,
      hasSystemPrompt: Boolean(systemPrompt),
      hasGuardrailPrompt: Boolean(guardrailPrompt),
      historyLength: sanitizedHistory.length,
      keyPreview,
      systemPromptLength: systemPrompt?.length ?? 0
    })

    const requestMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = []

    if (systemPrompt) {
      requestMessages.push({ role: "system", content: systemPrompt })
    }

    if (guardrailPrompt) {
      requestMessages.push({ role: "system", content: guardrailPrompt })
    }

    requestMessages.push(...sanitizedHistory)
    requestMessages.push({ role: "user", content: userMessage })

    let assistantReply: string

    try {
      assistantReply = await callOpenAIChat({
        apiKey,
        model: selectedModel,
        messages: requestMessages
      })
      console.log("[public-ai/chat] OpenAI reply", assistantReply)
    } catch (error) {
      console.error("OpenAI chat error:", error)
      return NextResponse.json(
        {
          message:
            "I'm having a bit of trouble reaching our knowledge base right now. Could you try again in a moment?"
        },
        { status: 200 }
      )
    }

    return NextResponse.json({ message: assistantReply })
  } catch (error) {
    console.error("Public AI chat error:", error)
    return NextResponse.json(
      {
        message:
          "Something went wrong while processing your message. Please refresh the page and try again."
      },
      { status: 200 }
    )
  }
}

