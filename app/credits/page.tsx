"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Home, ArrowLeft, Zap, Crown, Rocket, Check, Star, Plus, Minus } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface PricingTier {
  id: string
  name: string
  price: number
  credits: number
  description: string
  features: string[]
  popular?: boolean
  icon: React.ReactNode
  color: string
}

const pricingTiers: PricingTier[] = [
  {
    id: "starter",
    name: "Starter Pack",
    price: 5.00,
    credits: 104,
    description: "Perfect for trying out INFINITO",
    features: [
      "104 credits (104,000 tokens)",
      "Basic memory storage",
      "Standard response time",
      "Email support"
    ],
    icon: <Zap className="h-6 w-6" />,
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "pro",
    name: "Pro Pack",
    price: 20.00,
    credits: 416,
    description: "For regular AI users",
    features: [
      "416 credits (416,000 tokens)",
      "Advanced memory storage",
      "Priority response time",
      "Document processing",
      "Priority support"
    ],
    popular: true,
    icon: <Crown className="h-6 w-6" />,
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "enterprise",
    name: "Enterprise Pack",
    price: 100.00,
    credits: 2083,
    description: "For power users and teams",
    features: [
      "2,083 credits (2,083,000 tokens)",
      "Unlimited memory storage",
      "Fastest response time",
      "Advanced document processing",
      "Vision model access",
      "Dedicated support"
    ],
    icon: <Rocket className="h-6 w-6" />,
    color: "from-orange-500 to-red-500"
  }
]

export default function CreditsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentCredits, setCurrentCredits] = useState(0)
  const [processing, setProcessing] = useState<string | null>(null)
  const [customCredits, setCustomCredits] = useState(50)
  const [customCreditsString, setCustomCreditsString] = useState<string>('50') // String version for input
  const [customPrice, setCustomPrice] = useState<string>('2.40') // Initialize with price string
  const isUserTypingRef = useRef(false) // Track if user is manually typing
  const MIN_CREDITS = 30 // Minimum credits = $1.44 / $0.048 (Stripe minimum $1.00)
  const MIN_PRICE = 1.44
  const MAX_PRICE = 999999.99 // Stripe maximum price
  const MAX_CREDITS = Math.floor(MAX_PRICE / 0.048) // Maximum credits = $999,999.99 / $0.048
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          // Fetch current credits
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('credits')
            .eq('id', user.id)
            .single()
          
          setCurrentCredits(profile?.credits || 0)
        }
      } catch (error) {
        console.error('Error getting user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  // Sync customPrice and customCreditsString when customCredits changes from buttons only (not from user typing)
  useEffect(() => {
    if (!isUserTypingRef.current) {
      const calculatedPrice = (customCredits * 0.048).toFixed(2)
      setCustomPrice(calculatedPrice)
      setCustomCreditsString(customCredits.toString())
    }
  }, [customCredits])

  const handlePurchase = async (tier: PricingTier) => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login'
      return
    }

    setProcessing(tier.id)
    
    try {
      console.log('🔍 Credits: Starting purchase for tier:', tier.id)
      
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔑 Session present:', !!session)
      console.log('🎫 Access token present:', !!session?.access_token)
      
      if (!session) {
        console.error('❌ No session found')
        alert('Please sign in to purchase credits')
        return
      }

      console.log('📤 Sending request to API...')
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          priceId: tier.id,
          credits: tier.credits,
          price: tier.price,
          returnUrl: window.location.href
        }),
      })
      
      console.log('📥 Response status:', response.status)
      console.log('📥 Response ok:', response.ok)

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      alert(error.message || 'Failed to start payment. Please try again.')
    } finally {
      setProcessing(null)
    }
  }

  const handleCustomPurchase = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login'
      return
    }

    // Use the user's entered price, or calculate from credits if price is invalid
    const enteredPrice = parseFloat(customPrice)
    const price = (!isNaN(enteredPrice) && enteredPrice >= MIN_PRICE && enteredPrice <= MAX_PRICE) 
      ? enteredPrice 
      : customCredits * 0.048

    if (price < MIN_PRICE) {
      alert(`Minimum purchase is $${MIN_PRICE.toFixed(2)} (${MIN_CREDITS} credits). Stripe requires a minimum payment of $1.00.`)
      return
    }

    if (customCredits < MIN_CREDITS) {
      alert(`Minimum purchase is ${MIN_CREDITS} credits ($${MIN_PRICE.toFixed(2)})`)
      return
    }

    if (price > MAX_PRICE) {
      alert(`Maximum purchase is $${MAX_PRICE.toFixed(2)} (${MAX_CREDITS.toLocaleString()} credits). Stripe maximum is $999,999.99.`)
      return
    }

    setProcessing('custom')
    
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please sign in to purchase credits')
        return
      }
      
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          priceId: 'custom',
          credits: customCredits,
          price: price,
          returnUrl: window.location.href
        }),
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Failed to create checkout session')
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      alert(error.message || 'Failed to start payment. Please try again.')
    } finally {
      setProcessing(null)
    }
  }

  const adjustCustomCredits = (amount: number) => {
    const newAmount = customCredits + amount
    if (newAmount >= MIN_CREDITS && newAmount <= MAX_CREDITS) {
      setCustomCredits(newAmount)
    }
  }

  const adjustCustomPrice = (amount: number) => {
    const currentPrice = customCredits * 0.048
    const newPrice = currentPrice + amount
    if (newPrice >= MIN_PRICE && newPrice <= MAX_PRICE) {
      // Calculate credits from price (round to nearest integer)
      const newCredits = Math.round(newPrice / 0.048)
      if (newCredits >= MIN_CREDITS && newCredits <= MAX_CREDITS) {
        setCustomCredits(newCredits)
      }
    }
  }

  if (loading) {
    return (
      <div className="relative min-h-screen w-full">
        <div className="aztec-background" />
        <div className="animated-grid" />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
            <p className="text-cyan-400 mt-4">Loading Credits...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full">
      <div className="aztec-background" />
      <div className="animated-grid" />

      <div className="relative z-10 flex flex-col min-h-screen p-3 sm:p-4 md:p-6 lg:p-8">
        <header className="flex flex-row justify-between items-center mb-4 sm:mb-6 md:mb-8 gap-2">
          <Link 
            href="/" 
            className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Back to INFINITO</span>
            <span className="sm:hidden">Back</span>
          </Link>
          
          <Link 
            href="/" 
            className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors text-sm sm:text-base"
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Home</span>
          </Link>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full">
          {/* Custom Amount Section - FIRST for mobile visibility */}
          <div className="mb-6 sm:mb-8 md:mb-12">
            <div className="text-center mb-4 sm:mb-6 md:mb-8">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="p-2 sm:p-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-green-400">
                    Choose Your Amount
                  </h4>
                </div>
              </div>
              <p className="text-base sm:text-lg md:text-xl text-green-300">
                Select the exact number of credits you need
              </p>
            </div>
            
            <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-md border-2 border-green-400/50 shadow-2xl shadow-green-500/30 hover:shadow-green-400/40 transition-all overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                {/* Mobile-first layout: Price and Buy Button at TOP */}
                <div className="flex flex-col gap-4 sm:gap-6">
                  
                  {/* Price Display - FIRST on mobile */}
                  <div className="text-center bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-2xl p-4 sm:p-6 md:p-8 border-2 border-green-400/30 order-1">
                    <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => adjustCustomPrice(-1)}
                        disabled={(customCredits * 0.048) <= MIN_PRICE}
                        className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/20 text-base sm:text-lg px-3 sm:px-4 py-2 sm:py-3 h-12 sm:h-14 flex-shrink-0"
                      >
                        <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                      <div className="relative inline-flex min-w-[120px]">
                        <Input
                          type="number"
                          value={customPrice}
                          onChange={(e) => {
                            const newValue = e.target.value
                            isUserTypingRef.current = true
                            // Allow empty input while typing
                            if (newValue === '') {
                              setCustomPrice('')
                              return
                            }
                            setCustomPrice(newValue)
                          }}
                          onBlur={(e) => {
                            // Validate and correct on blur if invalid, then update credits
                            const value = parseFloat(e.target.value)
                            if (isNaN(value) || value < MIN_PRICE || value > MAX_PRICE) {
                              const defaultPrice = (customCredits * 0.048).toFixed(2)
                              setCustomPrice(defaultPrice)
                              isUserTypingRef.current = false
                            } else {
                              // Valid value - preserve the exact price entered, calculate credits for it
                              const newCredits = Math.round(value / 0.048)
                              if (newCredits >= MIN_CREDITS && newCredits <= MAX_CREDITS) {
                                setCustomCredits(newCredits)
                                // Keep the exact price the user entered (don't recalculate from credits)
                                setCustomPrice(value.toFixed(2))
                              } else {
                                // Invalid credits range, revert to calculated price
                                const calculatedPrice = (customCredits * 0.048).toFixed(2)
                                setCustomPrice(calculatedPrice)
                              }
                              isUserTypingRef.current = false
                            }
                          }}
                          size={Math.max(8, customPrice.length)}
                          className="text-center bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-400/60 text-green-400 text-3xl sm:text-4xl md:text-5xl font-bold w-auto min-w-[120px] max-w-[400px] h-12 sm:h-14 md:h-16 pl-6 sm:pl-8 md:pl-10 pr-2 sm:pr-4 focus:border-green-400 focus:ring-2 focus:ring-green-400/30 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          min={MIN_PRICE}
                          max={MAX_PRICE}
                          step="0.01"
                        />
                        <div className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-3xl sm:text-4xl md:text-5xl font-bold text-green-400 pointer-events-none">
                          $
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => adjustCustomPrice(1)}
                        disabled={(customCredits * 0.048) >= MAX_PRICE}
                        className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/20 text-base sm:text-lg px-3 sm:px-4 py-2 sm:py-3 h-12 sm:h-14 flex-shrink-0"
                      >
                        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                    </div>
                    <div className="text-green-300 text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">
                      {customCredits} Credits
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-green-500/40 font-medium">
                      $0.048 per credit
                    </div>
                    <div className="mt-2 sm:mt-4 text-xs sm:text-sm text-green-400">
                      ⚡ Instant delivery after payment
                    </div>
                  </div>
                  
                  {/* Purchase Button - SECOND on mobile */}
                  <div className="order-2">
                    <Button
                      onClick={handleCustomPurchase}
                      disabled={processing === 'custom'}
                      className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:brightness-110 text-white font-bold px-6 sm:px-8 md:px-12 py-3 sm:py-4 text-lg sm:text-xl tracking-wider transition-all disabled:opacity-50 shadow-2xl shadow-green-500/30 hover:shadow-green-400/40 animate-buy-button hover:animate-none hover:scale-105 active:scale-100 ring-2 ring-green-400/50 ring-offset-2 ring-offset-black/50"
                    >
                      {processing === 'custom' ? (
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                          Buy {customCredits} Credits
                        </div>
                      )}
                    </Button>
                  </div>
                  
                  {/* Amount Controls - THIRD on mobile */}
                  <div className="space-y-4 sm:space-y-6 order-3">
                    <div className="flex items-center justify-center gap-3 sm:gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => adjustCustomCredits(-10)}
                        disabled={customCredits <= MIN_CREDITS}
                        className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/20 text-base sm:text-lg px-3 sm:px-4 py-2 sm:py-3 h-12 sm:h-14"
                      >
                        <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                      <div className="relative inline-flex min-w-[150px]">
                        <Input
                          type="number"
                          value={customCreditsString}
                          onChange={(e) => {
                            const newValue = e.target.value
                            isUserTypingRef.current = true
                            // Allow empty input while typing
                            if (newValue === '') {
                              setCustomCreditsString('')
                              return
                            }
                            setCustomCreditsString(newValue)
                          }}
                          onBlur={(e) => {
                            // Validate and correct on blur if invalid
                            const value = parseInt(e.target.value)
                            if (isNaN(value) || value < MIN_CREDITS || value > MAX_CREDITS) {
                              setCustomCreditsString(customCredits.toString())
                              isUserTypingRef.current = false
                            } else {
                              // Valid value, update credits
                              setCustomCredits(value)
                              isUserTypingRef.current = false
                            }
                          }}
                          size={Math.max(8, (customCreditsString.length + 2))}
                          className="text-center bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-400/60 text-green-300 text-2xl sm:text-3xl md:text-4xl font-bold w-auto min-w-[150px] max-w-[300px] h-12 sm:h-14 px-2 sm:px-4 focus:border-green-400 focus:ring-2 focus:ring-green-400/30 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          min={MIN_CREDITS}
                          max={MAX_CREDITS}
                        />
                        <div className="absolute -bottom-5 sm:-bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-green-500 font-medium whitespace-nowrap">
                          CREDITS
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => adjustCustomCredits(10)}
                        disabled={customCredits >= MAX_CREDITS}
                        className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/20 text-base sm:text-lg px-3 sm:px-4 py-2 sm:py-3 h-12 sm:h-14"
                      >
                        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                    </div>
                    
                    <p className="text-[10px] text-green-500 text-center opacity-70">
                      Min: {MIN_CREDITS} credits (${MIN_PRICE.toFixed(2)}) • Max: {MAX_CREDITS.toLocaleString()} credits (${MAX_PRICE.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Title and Current Credits - AFTER Custom Amount */}
          <div className="text-center mb-6 sm:mb-8 md:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 tracking-widest infinito-gradient">
              CREDITS
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-cyan-300 mb-4 sm:mb-6">
              Power your AI interactions with credits
            </p>
            
            {user && (
              <div className="inline-flex items-center gap-2 bg-cyan-900/20 border border-cyan-500/30 rounded-lg px-3 sm:px-4 py-2">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400" />
                <span className="text-cyan-300 text-sm sm:text-base">Current Credits:</span>
                <span className="text-cyan-400 font-bold text-lg sm:text-xl">{currentCredits}</span>
              </div>
            )}
          </div>

          {/* Pricing Packs */}
          <div className="mb-6 sm:mb-8 hidden">
            <h3 className="text-xl sm:text-2xl font-bold text-cyan-400 mb-4 sm:mb-6 text-center">Credit Packs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {pricingTiers.map((tier) => (
                <Card 
                  key={tier.id} 
                  className={`relative bg-black/40 backdrop-blur-md border-cyan-500/30 hover:border-cyan-400/50 transition-all ${
                    tier.popular ? 'ring-2 ring-purple-500/50 sm:scale-105' : ''
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 sm:px-4 py-1 text-xs sm:text-sm">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-3 sm:pb-4">
                    <div className={`mx-auto mb-3 sm:mb-4 p-2 sm:p-3 rounded-full bg-gradient-to-r ${tier.color}`}>
                      {tier.icon}
                    </div>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-cyan-400">
                      {tier.name}
                    </CardTitle>
                    <CardDescription className="text-cyan-300 text-sm sm:text-base">
                      {tier.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4 sm:space-y-6">
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl font-bold text-cyan-400 mb-2">
                        ${tier.price}
                      </div>
                      <div className="text-cyan-300 text-sm sm:text-base">
                        {tier.credits} Credits
                      </div>
                      <div className="text-xs sm:text-sm text-cyan-400 mt-1">
                        ({tier.credits.toLocaleString()} tokens)
                      </div>
                    </div>
                    
                    <ul className="space-y-2 sm:space-y-3">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 sm:gap-3 text-cyan-300">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-400 flex-shrink-0" />
                          <span className="text-xs sm:text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      onClick={() => handlePurchase(tier)}
                      disabled={processing === tier.id}
                      className={`w-full bg-gradient-to-r ${tier.color} hover:brightness-110 text-white font-bold py-2 sm:py-3 text-base sm:text-lg transition-all disabled:opacity-50`}
                    >
                      {processing === tier.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </div>
                      ) : (
                        `Buy ${tier.credits} Credits`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

        </main>

        <footer className="text-center text-cyan-800 text-xs mt-6 sm:mt-8">
          <p>Powered by Stripe • Secure payments • No recurring charges</p>
        </footer>
      </div>
    </div>
  )
}
