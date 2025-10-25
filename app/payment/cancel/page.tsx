"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { XCircle, Home, ArrowLeft, RefreshCw } from "lucide-react"

export default function PaymentCancelPage() {
  return (
    <div className="relative min-h-screen w-full">
      <div className="aztec-background" />
      <div className="animated-grid" />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <XCircle className="h-24 w-24 text-red-400 mx-auto mb-6" />
            <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-widest text-red-400">
              PAYMENT CANCELLED
            </h1>
            <p className="text-xl text-cyan-300 mb-8">
              Your payment was cancelled. No charges have been made.
            </p>
          </div>

          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-red-400 mb-2">
              What happened?
            </h3>
            <p className="text-red-300 text-sm">
              You cancelled the payment process or there was an issue with the payment. 
              Your account has not been charged and no credits have been added.
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/credits">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white font-bold hover:brightness-110 hover:shadow-lg hover:shadow-purple-400/50 rounded-lg px-8 py-3 text-lg tracking-widest transition-all">
                <RefreshCw className="mr-2 h-5 w-5" />
                Try Again
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400 px-6 py-3">
                <Home className="mr-2 h-4 w-4" />
                Return to INFINITO
              </Button>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <p className="text-cyan-600 text-sm">
              Need help? Contact support if you're experiencing payment issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
