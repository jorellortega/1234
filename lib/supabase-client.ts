import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseClient: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error("Failed to initialize Supabase client:", error)
  }
}

const createPlaceholderClient = (): SupabaseClient => {
  const placeholderError = new Error("Supabase client is not configured")

  const asyncResult = async <T>() => ({
    data: null as T,
    error: placeholderError
  })

  const queryBuilder = () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: asyncResult,
        select: () => ({
          eq: () => ({
            maybeSingle: asyncResult
          })
        })
      }),
      maybeSingle: asyncResult
    }),
    eq: () => ({
      maybeSingle: asyncResult
    }),
    maybeSingle: asyncResult
  })

  return {
    auth: {
      getUser: async () => ({
        data: { user: null },
        error: placeholderError
      }),
      getSession: async () => ({
        data: { session: null },
        error: placeholderError
      })
    },
    from: () => queryBuilder()
  } as unknown as SupabaseClient
}

export const isSupabaseConfigured = Boolean(supabaseClient)

export const supabase = supabaseClient ?? createPlaceholderClient()
