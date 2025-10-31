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
import { User, LogOut, ArrowLeft, Brain, Settings, Shield, Database, CreditCard, Zap, ShoppingCart, History } from "lucide-react"

interface UserProfile {
  id: string
  email: string
  created_at: string
  full_name?: string
  credits?: number
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
          // Fetch user profile with credits and full name
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('credits, full_name')
            .eq('id', user.id)
            .single()
          
          setUser({
            id: user.id,
            email: user.email || "",
            created_at: user.created_at,
            full_name: profile?.full_name || null,
            credits: profile?.credits || 0
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
                <Label className="text-slate-300">Full Name</Label>
                <Input
                  value={user.full_name || "Not set"}
                  disabled
                  className="bg-black/20 border-cyan-500/30 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Email</Label>
                <Input
                  value={user.email}
                  disabled
                  className="bg-black/20 border-cyan-500/30 text-white"
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

        {/* Credit System Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Credit System
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Buy Credits Card */}
            <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-md border-blue-500/30 shadow-2xl shadow-blue-500/20 hover:shadow-blue-400/30 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-400 text-lg">
                  <ShoppingCart className="h-5 w-5" />
                  Buy Credits
                </CardTitle>
                <CardDescription className="text-blue-300">
                  Purchase credits to power your AI interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/credits">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:brightness-110 text-white font-bold">
                    <Zap className="h-4 w-4 mr-2" />
                    View Pricing
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Current Credits Card */}
            <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-md border-green-500/30 shadow-2xl shadow-green-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-400 text-lg">
                  <Zap className="h-5 w-5" />
                  Current Credits
                </CardTitle>
                <CardDescription className="text-green-300">
                  Your available credit balance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-2">{user?.credits || 0}</div>
                  <p className="text-sm text-green-300">Credits Available</p>
                </div>
              </CardContent>
            </Card>

            {/* Credit Usage Card */}
            <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-md border-purple-500/30 shadow-2xl shadow-purple-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-400 text-lg">
                  <History className="h-5 w-5" />
                  Usage
                </CardTitle>
                <CardDescription className="text-purple-300">
                  Track your credit usage history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-purple-300">
                  <div className="flex justify-between">
                    <span>AI Generations:</span>
                    <span className="text-purple-400">1 credit each</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vision Models:</span>
                    <span className="text-purple-400">3 credits each</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Document Processing:</span>
                    <span className="text-purple-400">5 credits each</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment History Card */}
            <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 backdrop-blur-md border-orange-500/30 shadow-2xl shadow-orange-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-orange-400 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Payment History
                </CardTitle>
                <CardDescription className="text-orange-300">
                  View your transaction history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/transactions">
                  <Button variant="outline" className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
                    <History className="h-4 w-4 mr-2" />
                    View Transactions
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-purple-400 mb-6 flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Developer Portal Access
          </h2>
          
          <Card className="bg-black/40 backdrop-blur-md border-purple-500/30 shadow-2xl shadow-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                <Settings className="h-5 w-5" />
                ⚡ Developer Portal
              </CardTitle>
              <CardDescription className="text-purple-300">
                Access your developer portal to configure AI platform integrations and service credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/ai-settings">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:brightness-110 text-white font-bold">
                  <Settings className="h-4 w-4 mr-2" />
                  Access Developer Portal
                </Button>
              </Link>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-purple-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Configure AI platform integrations</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Override system defaults</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Secure credential management</span>
                </div>
              </div>
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
