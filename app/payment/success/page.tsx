"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, Zap, Home, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

function PaymentSuccessContent() {
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')

  useEffect(() => {
    const fetchCredits = async () => {
      console.log('🔄 Payment success page: Starting credit fetch')
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        console.log('👤 User authentication:', { 
          user: !!user, 
          userId: user?.id, 
          userEmail: user?.email,
          error: userError?.message 
        })
        
        if (user) {
          console.log('🔍 Fetching user profile for credits...')
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('credits')
            .eq('id', user.id)
            .single()
          
          console.log('📊 Profile fetch result:', {
            profile: profile,
            credits: profile?.credits,
            error: profileError?.message,
            profileExists: !!profile
          })
          
          setCredits(profile?.credits || 0)
          console.log('✅ Credits set to:', profile?.credits || 0)
          
          // If there's a returnUrl, automatically redirect after a short delay
          // This allows users to return to their generation page and resume work
          if (returnUrl) {
            console.log('🔙 Return URL detected, will redirect to:', returnUrl)
            setTimeout(() => {
              window.location.href = returnUrl
            }, 1500) // 1.5 second delay to show success message, then return to work
          }
        } else {
          console.log('⚠️ No user found, setting credits to 0')
          setCredits(0)
        }
      } catch (error) {
        console.error('❌ Error fetching credits:', error)
        console.error('🔍 Error details:', {
          message: error.message,
          stack: error.stack
        })
      } finally {
        setLoading(false)
        console.log('🏁 Credit fetch completed, loading set to false')
      }
    }

    fetchCredits()
  }, [returnUrl])

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
            <>
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
              {returnUrl && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
                  <p className="text-green-400 text-sm animate-pulse">
                    📍 Redirecting you back to continue your work...
                  </p>
                </div>
              )}
            </>
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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
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
                Loading...
              </p>
            </div>
          </div>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
