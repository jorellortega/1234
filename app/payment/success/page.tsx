"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CheckCircle, Zap, Home, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

export default function PaymentSuccessPage() {
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('credits')
            .eq('id', user.id)
            .single()
          
          setCredits(profile?.credits || 0)
        }
      } catch (error) {
        console.error('Error fetching credits:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCredits()
  }, [])

  return (
    <div className="relative min-h-screen w-full">
      <div className="aztec-background" />
      <div className="animated-grid" />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <CheckCircle className="h-24 w-24 text-green-400 mx-auto mb-6 animate-pulse" />
            <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-widest infinito-gradient">
              PAYMENT SUCCESSFUL
            </h1>
            <p className="text-xl text-cyan-300 mb-8">
              Your credits have been added to your account
            </p>
          </div>

          {!loading && (
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Zap className="h-6 w-6 text-cyan-400" />
                <span className="text-cyan-300 text-lg">Your Credits:</span>
                <span className="text-cyan-400 font-bold text-2xl">{credits}</span>
              </div>
              <p className="text-cyan-300 text-sm">
                You can now use these credits to generate AI responses
              </p>
            </div>
          )}

          <div className="space-y-4">
            <Link href="/">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white font-bold hover:brightness-110 hover:shadow-lg hover:shadow-purple-400/50 rounded-lg px-8 py-3 text-lg tracking-widest transition-all">
                <Home className="mr-2 h-5 w-5" />
                Return to INFINITO
              </Button>
            </Link>
            
            <Link href="/credits">
              <Button variant="outline" className="w-full sm:w-auto border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 px-6 py-3">
                <ArrowRight className="mr-2 h-4 w-4" />
                Buy More Credits
              </Button>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <p className="text-cyan-600 text-sm">
              Thank you for supporting INFINITO! Your credits are ready to use.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
