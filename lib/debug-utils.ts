// Debug utilities for credit system
export const debugLog = {
  // Log database function calls
  logDatabaseCall: (functionName: string, params: any, result?: any, error?: any) => {
    console.log(`🗄️ Database Function: ${functionName}`)
    console.log(`📋 Parameters:`, params)
    if (result) {
      console.log(`✅ Result:`, result)
    }
    if (error) {
      console.error(`❌ Error:`, error)
    }
  },

  // Log credit transactions
  logCreditTransaction: (userId: string, amount: number, type: string, description?: string) => {
    console.log(`💰 Credit Transaction:`)
    console.log(`👤 User ID: ${userId}`)
    console.log(`💵 Amount: ${amount}`)
    console.log(`🏷️ Type: ${type}`)
    console.log(`📝 Description: ${description || 'N/A'}`)
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  },

  // Log user profile changes
  logUserProfile: (userId: string, oldCredits: number, newCredits: number) => {
    console.log(`👤 User Profile Update:`)
    console.log(`🆔 User ID: ${userId}`)
    console.log(`📊 Old Credits: ${oldCredits}`)
    console.log(`📊 New Credits: ${newCredits}`)
    console.log(`📈 Change: ${newCredits - oldCredits}`)
  },

  // Log Stripe webhook events
  logStripeEvent: (eventType: string, sessionId: string, metadata: any) => {
    console.log(`🔔 Stripe Event: ${eventType}`)
    console.log(`🆔 Session ID: ${sessionId}`)
    console.log(`📋 Metadata:`, metadata)
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  },

  // Log API requests
  logApiRequest: (endpoint: string, method: string, params?: any) => {
    console.log(`🌐 API Request: ${method} ${endpoint}`)
    if (params) {
      console.log(`📋 Parameters:`, params)
    }
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`)
  },

  // Log API responses
  logApiResponse: (endpoint: string, status: number, data?: any, error?: any) => {
    console.log(`📤 API Response: ${endpoint}`)
    console.log(`📊 Status: ${status}`)
    if (data) {
      console.log(`✅ Data:`, data)
    }
    if (error) {
      console.error(`❌ Error:`, error)
    }
  }
}

// Helper function to format credit amounts
export const formatCredits = (credits: number): string => {
  return `${credits} credit${credits !== 1 ? 's' : ''}`
}

// Helper function to validate credit amounts
export const validateCreditAmount = (amount: number): boolean => {
  return Number.isInteger(amount) && amount > 0
}

// Helper function to log credit balance changes
export const logCreditBalanceChange = (
  userId: string, 
  operation: 'add' | 'deduct', 
  amount: number, 
  oldBalance: number, 
  newBalance: number
) => {
  const change = operation === 'add' ? `+${amount}` : `-${amount}`
  console.log(`💳 Credit Balance Change:`)
  console.log(`👤 User: ${userId}`)
  console.log(`🔄 Operation: ${operation}`)
  console.log(`💵 Amount: ${change}`)
  console.log(`📊 Old Balance: ${oldBalance}`)
  console.log(`📊 New Balance: ${newBalance}`)
  console.log(`✅ Change Applied: ${newBalance === (oldBalance + (operation === 'add' ? amount : -amount))}`)
}
