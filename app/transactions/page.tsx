"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, History, ArrowDownCircle, ArrowUpCircle, CreditCard, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

interface Transaction {
  id: string
  user_id: string
  amount: number
  transaction_type: string
  description: string | null
  reference_id: string | null
  created_at: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          setError('Please sign in to view transactions')
          return
        }

        setUser(user)

        // Get session for API call
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('No active session')
          return
        }

        const response = await fetch('/api/transactions', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to fetch transactions')
        }

        const data = await response.json()
        console.log('Transactions received:', data)
        setTransactions(data.transactions || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions')
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTransactionType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getTransactionIcon = (type: string, amount: number) => {
    // Positive amounts are credits added, negative are credits deducted
    if (amount > 0) {
      return <ArrowUpCircle className="h-5 w-5 text-green-400" />
    } else {
      return <ArrowDownCircle className="h-5 w-5 text-red-400" />
    }
  }

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-400' : 'text-red-400'
  }

  if (loading) {
    return (
      <div className="relative min-h-screen w-full">
        <div className="aztec-background" />
        <div className="animated-grid" />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
            <p className="text-cyan-400 mt-4">Loading transactions...</p>
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
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/profile" 
              className="flex items-center gap-1 sm:gap-2 text-cyan-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Back to Profile</span>
            </Link>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            <span className="text-cyan-400">Transaction</span> History
          </h1>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full">
          {error && (
            <Card className="bg-red-900/20 border-red-500/30 mb-6">
              <CardContent className="pt-6">
                <p className="text-red-400">{error}</p>
              </CardContent>
            </Card>
          )}

          {!error && transactions.length === 0 && (
            <Card className="bg-black/40 backdrop-blur-md border-cyan-500/30">
              <CardContent className="pt-6 text-center py-12">
                <History className="h-12 w-12 text-cyan-400/50 mx-auto mb-4" />
                <p className="text-cyan-400 text-lg mb-2">No transactions found</p>
                <p className="text-gray-400 text-sm">Your transaction history will appear here</p>
              </CardContent>
            </Card>
          )}

          {!error && transactions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-cyan-300 text-sm sm:text-base">
                  Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </p>
                <Button
                  onClick={async () => {
                    setLoading(true)
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) return
                      
                      const response = await fetch('/api/transactions', {
                        headers: {
                          'Authorization': `Bearer ${session.access_token}`
                        }
                      })
                      
                      if (response.ok) {
                        const data = await response.json()
                        setTransactions(data.transactions || [])
                      }
                    } finally {
                      setLoading(false)
                    }
                  }}
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <Card 
                    key={transaction.id} 
                    className="bg-black/40 backdrop-blur-md border-cyan-500/30 hover:border-cyan-400/50 transition-all"
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex-shrink-0 mt-1">
                            {getTransactionIcon(transaction.transaction_type, transaction.amount)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-cyan-400 font-semibold text-sm sm:text-base">
                                {formatTransactionType(transaction.transaction_type)}
                              </h3>
                            </div>
                            {transaction.description && (
                              <p className="text-gray-300 text-xs sm:text-sm mb-1 break-words">
                                {transaction.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-2">
                              <span>{formatDate(transaction.created_at)}</span>
                              {transaction.reference_id && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">ID: {transaction.reference_id.slice(0, 8)}...</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className={`text-2xl sm:text-3xl font-bold ${getTransactionColor(transaction.amount)}`}>
                            {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">credits</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>

        <footer className="text-center text-cyan-800 text-xs mt-6 sm:mt-8">
          <p>All transactions are recorded in real-time</p>
        </footer>
      </div>
    </div>
  )
}

