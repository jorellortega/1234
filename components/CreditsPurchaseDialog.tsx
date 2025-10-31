"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Zap, Plus, Minus } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CreditsPurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentCredits?: number
}

export function CreditsPurchaseDialog({ 
  open, 
  onOpenChange,
  currentCredits = 0 
}: CreditsPurchaseDialogProps) {
  const [user, setUser] = useState<any>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [customCredits, setCustomCredits] = useState(50)
  const MIN_CREDITS = 30 // Minimum credits = $1.44 / $0.048 (Stripe minimum $1.00)
  const MIN_PRICE = 1.44
  const MAX_PRICE = 999999.99 // Stripe maximum price
  const MAX_CREDITS = Math.floor(MAX_PRICE / 0.048) // Maximum credits = $999,999.99 / $0.048

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error('Error getting user:', error)
      }
    }

    getUser()
  }, [])

  const handleCustomPurchase = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login'
      return
    }

    // Calculate price: $0.048 per credit (includes 60% markup)
    const price = customCredits * 0.048

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
          price: price
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-black/95 to-gray-900/95 border-cyan-500/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-cyan-400 mb-2">
            Purchase Credits
          </DialogTitle>
          {user && (
            <div className="flex items-center gap-2 text-sm text-cyan-300 mb-4">
              <Zap className="h-4 w-4" />
              <span>Current Credits: <span className="font-bold text-cyan-400">{currentCredits}</span></span>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Custom Amount Section */}
          <div>
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="p-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <h4 className="text-xl font-bold text-green-400">
                  Choose Your Amount
                </h4>
              </div>
              <p className="text-base text-green-300">
                Select the exact number of credits you need
              </p>
            </div>
            
            <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 backdrop-blur-md border-2 border-green-400/50 shadow-2xl shadow-green-500/30">
              <CardContent className="p-6">
                <div className="flex flex-col gap-6">
                  
                  {/* Price Display */}
                  <div className="text-center bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-2xl p-6 md:p-8 border-2 border-green-400/30">
                    <div className="flex items-center justify-center gap-3 md:gap-4 mb-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => adjustCustomPrice(-1)}
                        disabled={(customCredits * 0.048) <= MIN_PRICE}
                        className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/20 text-lg px-4 py-3 h-14"
                      >
                        <Minus className="h-6 w-6" />
                      </Button>
                      <div className="relative inline-flex min-w-[120px]">
                        <Input
                          type="number"
                          value={(customCredits * 0.048).toFixed(2)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || MIN_PRICE
                            if (value >= MIN_PRICE && value <= MAX_PRICE) {
                              const newCredits = Math.round(value / 0.048)
                              if (newCredits >= MIN_CREDITS && newCredits <= MAX_CREDITS) {
                                setCustomCredits(newCredits)
                              }
                            }
                          }}
                          size={Math.max(8, ((customCredits * 0.048).toFixed(2).length + 2))}
                          className="text-center bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-400/60 text-green-400 text-4xl md:text-5xl font-bold w-auto min-w-[120px] max-w-[400px] h-14 md:h-16 pl-8 md:pl-10 pr-4 focus:border-green-400 focus:ring-2 focus:ring-green-400/30 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          min={MIN_PRICE}
                          max={MAX_PRICE}
                          step="0.01"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-4xl md:text-5xl font-bold text-green-400 pointer-events-none">
                          $
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => adjustCustomPrice(1)}
                        disabled={(customCredits * 0.048) >= MAX_PRICE}
                        className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/20 text-lg px-4 py-3 h-14"
                      >
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>
                    <div className="text-green-300 text-2xl font-semibold mb-2">
                      {customCredits} Credits
                    </div>
                    <div className="text-[10px] text-green-500/40 font-medium">
                      $0.048 per credit
                    </div>
                    <div className="mt-4 text-sm text-green-400">
                      ⚡ Instant delivery after payment
                    </div>
                  </div>
                  
                  {/* Purchase Button */}
                  <div>
                    <Button
                      onClick={handleCustomPurchase}
                      disabled={processing === 'custom'}
                      className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:brightness-110 text-white font-bold px-8 md:px-12 py-4 text-xl tracking-wider transition-all disabled:opacity-50 shadow-2xl shadow-green-500/30 hover:shadow-green-400/40 hover:scale-105 active:scale-100 ring-2 ring-green-400/50 ring-offset-2 ring-offset-black/50"
                    >
                      {processing === 'custom' ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <Zap className="h-6 w-6" />
                          Buy {customCredits} Credits
                        </div>
                      )}
                    </Button>
                  </div>
                  
                  {/* Amount Controls */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => adjustCustomCredits(-10)}
                        disabled={customCredits <= MIN_CREDITS}
                        className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/20 text-lg px-4 py-3 h-14"
                      >
                        <Minus className="h-6 w-6" />
                      </Button>
                      <div className="relative inline-flex min-w-[150px]">
                        <Input
                          type="number"
                          value={customCredits}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || MIN_CREDITS
                            if (value >= MIN_CREDITS && value <= MAX_CREDITS) {
                              setCustomCredits(value)
                            }
                          }}
                          size={Math.max(8, (customCredits.toString().length + 2))}
                          className="text-center bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-2 border-green-400/60 text-green-300 text-3xl md:text-4xl font-bold w-auto min-w-[150px] max-w-[300px] h-14 px-4 focus:border-green-400 focus:ring-2 focus:ring-green-400/30 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          min={MIN_CREDITS}
                          max={MAX_CREDITS}
                        />
                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-green-500 font-medium whitespace-nowrap">
                          CREDITS
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => adjustCustomCredits(10)}
                        disabled={customCredits >= MAX_CREDITS}
                        className="border-2 border-green-500/50 text-green-400 hover:bg-green-500/20 text-lg px-4 py-3 h-14"
                      >
                        <Plus className="h-6 w-6" />
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
        </div>
      </DialogContent>
    </Dialog>
  )
}

