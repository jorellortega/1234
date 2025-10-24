"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase-client"
import { User, LogOut, ArrowLeft, Brain, Settings, Shield, Database } from "lucide-react"

interface UserProfile {
  id: string
  email: string
  created_at: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          setError("Please sign in to view your profile")
          router.push("/login")
          return
        }

        if (user) {
          setUser({
            id: user.id,
            email: user.email || "",
            created_at: user.created_at
          })
        }
      } catch (err) {
        setError("Failed to load user profile")
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/")
      router.refresh()
    } catch (err) {
      setError("Failed to sign out")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-8 w-8 text-cyan-400 animate-pulse mx-auto mb-4" />
          <p className="text-cyan-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="bg-black/40 backdrop-blur-md border-red-500/30 shadow-2xl shadow-red-500/20">
          <CardContent className="text-center py-8">
            <Alert className="bg-red-900/20 border-red-500/30">
              <AlertDescription className="text-red-400">
                Please sign in to view your profile
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Link href="/login">
                <Button className="bg-cyan-600 hover:bg-cyan-700">
                  Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to INFINITO
          </Link>
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Info */}
          <Card className="bg-black/40 backdrop-blur-md border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Email</Label>
                <Input
                  value={user.email}
                  disabled
                  className="bg-black/20 border-cyan-500/30 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">User ID</Label>
                <Input
                  value={user.id}
                  disabled
                  className="bg-black/20 border-cyan-500/30 text-white text-xs"
                />
              </div>
              <div>
                <Label className="text-slate-300">Member Since</Label>
                <Input
                  value={new Date(user.created_at).toLocaleDateString()}
                  disabled
                  className="bg-black/20 border-cyan-500/30 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Stats */}
          <Card className="bg-black/40 backdrop-blur-md border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <Database className="h-5 w-5" />
                Account Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">∞</div>
                <div className="text-sm text-slate-300">AI Generations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">∞</div>
                <div className="text-sm text-slate-300">Memories Stored</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">∞</div>
                <div className="text-sm text-slate-300">Documents Processed</div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-black/40 backdrop-blur-md border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-400">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/ai-settings">
                <Button variant="outline" className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                  <Shield className="h-4 w-4 mr-2" />
                  AI Settings
                </Button>
              </Link>
              <Link href="/memory-core">
                <Button variant="outline" className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                  <Brain className="h-4 w-4 mr-2" />
                  Memory Core
                </Button>
              </Link>
              <Link href="/library">
                <Button variant="outline" className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                  <Database className="h-4 w-4 mr-2" />
                  Generation Library
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Success/Error Messages */}
        {error && (
          <Alert className="mt-6 bg-red-900/20 border-red-500/30">
            <AlertDescription className="text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-6 bg-green-900/20 border-green-500/30">
            <AlertDescription className="text-green-400">
              {success}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
