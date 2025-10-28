"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Settings, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import Link from "next/link"

export default function AdminPreferencesPage() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPreferences, setAdminPreferences] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        await checkAdminStatus()
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      setLoading(false)
    }
  }

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const response = await fetch('/api/admin/check-role', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setIsAdmin(data.isAdmin || false)
        
        if (data.isAdmin) {
          await fetchAdminPreferences()
        }
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
      setLoading(false)
    }
  }

  const fetchAdminPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/preferences', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAdminPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Error fetching admin preferences:', error)
    }
  }

  const updateAdminPreferences = async (preferences: any) => {
    try {
      setSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/admin/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      })

      if (response.ok) {
        const data = await response.json()
        setAdminPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Error updating preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-cyan-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-cyan-400 mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Please log in to access admin preferences</p>
          <Link href="/login">
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You must be an admin to access this page</p>
          <Link href="/">
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              Go to Homepage
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Homepage
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Admin Preferences
          </h1>
          <p className="text-gray-400 mt-2">Manage AI model availability for all users</p>
        </div>

        {/* Model Management Card */}
        {adminPreferences && (
          <div className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-2xl p-8 shadow-2xl shadow-purple-500/10">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="h-6 w-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-purple-400">Model Management</h2>
              {saving && (
                <span className="text-sm text-green-400 ml-auto">Saving...</span>
              )}
            </div>

            <p className="text-sm text-gray-400 mb-8 pb-6 border-b border-gray-800">
              Toggle models on/off for all users. Admins always see all models regardless of these settings.
            </p>

            <div className="space-y-8">
              {/* Text Models */}
              <div className="space-y-4">
                <h3 className="text-cyan-400 font-semibold text-lg uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1 h-6 bg-cyan-400 rounded"></div>
                  Text Models
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_openai}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_openai: e.target.checked })}
                      className="rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 w-5 h-5"
                    />
                    <span className="text-cyan-300 font-medium">AiO</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_gpt}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_gpt: e.target.checked })}
                      className="rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 w-5 h-5"
                    />
                    <span className="text-cyan-300 font-medium">GPT</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_llama}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_llama: e.target.checked })}
                      className="rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 w-5 h-5"
                    />
                    <span className="text-cyan-300 font-medium">Zephyr</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_mistral}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_mistral: e.target.checked })}
                      className="rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 w-5 h-5"
                    />
                    <span className="text-cyan-300 font-medium">Maestro</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_custom}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_custom: e.target.checked })}
                      className="rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 w-5 h-5"
                    />
                    <span className="text-cyan-300 font-medium">Custom</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_rag}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_rag: e.target.checked })}
                      className="rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 w-5 h-5"
                    />
                    <span className="text-cyan-300 font-medium">RAG</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_web}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_web: e.target.checked })}
                      className="rounded border-cyan-500 text-cyan-500 focus:ring-cyan-500 w-5 h-5"
                    />
                    <span className="text-cyan-300 font-medium">WEB</span>
                  </label>
                </div>
              </div>

              {/* Vision/Image Models */}
              <div className="space-y-4">
                <h3 className="text-purple-400 font-semibold text-lg uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1 h-6 bg-purple-400 rounded"></div>
                  Vision/Image Models
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg hover:bg-purple-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_blip}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_blip: e.target.checked })}
                      className="rounded border-purple-500 text-purple-500 focus:ring-purple-500 w-5 h-5"
                    />
                    <span className="text-purple-300 font-medium">BLIP</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg hover:bg-purple-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_llava}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_llava: e.target.checked })}
                      className="rounded border-purple-500 text-purple-500 focus:ring-purple-500 w-5 h-5"
                    />
                    <span className="text-purple-300 font-medium">LLAVA</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg hover:bg-purple-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_dalle_image}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_dalle_image: e.target.checked })}
                      className="rounded border-purple-500 text-purple-500 focus:ring-purple-500 w-5 h-5"
                    />
                    <span className="text-purple-300 font-medium">DALL-E 3</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg hover:bg-purple-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_runway_image}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_runway_image: e.target.checked })}
                      className="rounded border-purple-500 text-purple-500 focus:ring-purple-500 w-5 h-5"
                    />
                    <span className="text-purple-300 font-medium">Runway Gen-4</span>
                  </label>
                </div>
              </div>

              {/* Video Models */}
              <div className="space-y-4">
                <h3 className="text-pink-400 font-semibold text-lg uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1 h-6 bg-pink-400 rounded"></div>
                  Video Models
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-pink-900/10 border border-pink-500/20 rounded-lg hover:bg-pink-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_gen4_turbo}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_gen4_turbo: e.target.checked })}
                      className="rounded border-pink-500 text-pink-500 focus:ring-pink-500 w-5 h-5"
                    />
                    <span className="text-pink-300 font-medium">Gen-4 Turbo</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-pink-900/10 border border-pink-500/20 rounded-lg hover:bg-pink-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_gen3a_turbo}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_gen3a_turbo: e.target.checked })}
                      className="rounded border-pink-500 text-pink-500 focus:ring-pink-500 w-5 h-5"
                    />
                    <span className="text-pink-300 font-medium">Gen-3A Turbo</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-pink-900/10 border border-pink-500/20 rounded-lg hover:bg-pink-900/20 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminPreferences.model_gen4_aleph}
                      onChange={(e) => updateAdminPreferences({ ...adminPreferences, model_gen4_aleph: e.target.checked })}
                      className="rounded border-pink-500 text-pink-500 focus:ring-pink-500 w-5 h-5"
                    />
                    <span className="text-pink-300 font-medium">Gen-4 Aleph</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Info Footer */}
            <div className="mt-8 pt-6 border-t border-gray-800">
              <p className="text-sm text-gray-500">
                💡 Changes are saved automatically. Models that are disabled will not appear in user dropdowns, but admins will always see all models.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

