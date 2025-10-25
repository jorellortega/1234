# Credit System Debug Guide

This guide explains the comprehensive debug logging added to the credit purchase system to help identify why credits aren't being updated after purchase.

## 🔍 Debug Features Added

### 1. Enhanced Stripe Webhook Handler (`/app/api/stripe/webhook/route.ts`)

**New Debug Logging:**
- ✅ Webhook event details (ID, type, timestamp, livemode)
- ✅ Session metadata analysis (userId, credits, priceId)
- ✅ User profile existence and current credits
- ✅ RPC function call parameters and results
- ✅ Credit balance verification before and after
- ✅ Transaction log verification
- ✅ Detailed error reporting with error codes and hints

**Key Debug Points:**
```typescript
// Before credit addition
console.log('👤 Current user profile:', { 
  exists: !!currentProfile, 
  current_credits: currentCredits,
  profile_error: profileError?.message 
})

// After credit addition
logCreditBalanceChange(userId, 'add', credits, currentCredits, newCredits)
```

### 2. Enhanced Checkout Session Creation (`/app/api/stripe/create-checkout-session/route.ts`)

**New Debug Logging:**
- ✅ Session configuration details
- ✅ Metadata verification
- ✅ User authentication status
- ✅ Session creation success confirmation

### 3. Enhanced Payment Success Page (`/app/payment/success/page.tsx`)

**New Debug Logging:**
- ✅ User authentication status
- ✅ Profile fetch results
- ✅ Credit balance retrieval
- ✅ Error handling with detailed stack traces

### 4. Enhanced Credits Check API (`/app/api/credits/check/route.ts`)

**New Debug Logging:**
- ✅ Request parameters
- ✅ User authentication
- ✅ Credit balance checks
- ✅ Credit deduction operations
- ✅ Final balance verification

### 5. Debug Utilities (`/lib/debug-utils.ts`)

**New Utility Functions:**
- `debugLog.logDatabaseCall()` - Log database function calls
- `debugLog.logCreditTransaction()` - Log credit transactions
- `debugLog.logUserProfile()` - Log user profile changes
- `debugLog.logStripeEvent()` - Log Stripe webhook events
- `logCreditBalanceChange()` - Log balance changes with validation

### 6. Debug API Endpoint (`/app/api/debug/credits/route.ts`)

**New Debug Endpoints:**
- `GET /api/debug/credits?userId=<user_id>` - Check user's credit status
- `POST /api/debug/credits` - Test credit addition functionality

## 🚀 How to Use Debug Features

### 1. Monitor Webhook Logs
When a purchase is made, check the server logs for:
```
🔔 Webhook received
📅 Timestamp: 2024-01-01T12:00:00.000Z
💳 Checkout session completed: cs_xxxxx
👤 User ID: user-uuid
💰 Credits to add: 100
```

### 2. Verify Credit Addition
Look for these log entries:
```
✅ Added 100 credits to user user-uuid
💳 Credit Balance Change:
👤 User: user-uuid
🔄 Operation: add
💵 Amount: +100
📊 Old Balance: 0
📊 New Balance: 100
```

### 3. Check Transaction Log
Verify transaction was recorded:
```
📝 Transaction log:
transaction_found: true
transaction_data: { id: '...', amount: 100, ... }
```

### 4. Use Debug API
Test the credit system:
```bash
# Check user's credits
GET /api/debug/credits?userId=user-uuid

# Test credit addition
POST /api/debug/credits
{
  "userId": "user-uuid",
  "credits": 10,
  "description": "Test addition"
}
```

## 🔧 Troubleshooting Common Issues

### Issue 1: Credits Not Added After Purchase
**Check for:**
- Webhook received logs
- User ID in metadata
- Database function errors
- Transaction log entries

### Issue 2: User Profile Not Found
**Check for:**
- User authentication in webhook
- Profile existence logs
- Database connection issues

### Issue 3: Database Function Errors
**Check for:**
- RPC function call parameters
- Error details and codes
- Database permissions

### Issue 4: Transaction Not Logged
**Check for:**
- Transaction table existence
- Database function completion
- Reference ID matching

## 📊 Debug Output Examples

### Successful Purchase Flow:
```
🔔 Webhook received
💳 Checkout session completed: cs_1234567890
👤 User ID: 123e4567-e89b-12d3-a456-426614174000
💰 Credits to add: 100
✅ Added 100 credits to user 123e4567-e89b-12d3-a456-426614174000
💳 Credit Balance Change:
👤 User: 123e4567-e89b-12d3-a456-426614174000
🔄 Operation: add
💵 Amount: +100
📊 Old Balance: 0
📊 New Balance: 100
✅ Change Applied: true
```

### Failed Purchase Flow:
```
🔔 Webhook received
💳 Checkout session completed: cs_1234567890
⚠️ Missing userId or credits in metadata
🔍 Metadata analysis:
userId_present: false
userId_value: null
credits_present: true
credits_value: "100"
```

## 🎯 Next Steps

1. **Monitor Logs**: Watch server logs during test purchases
2. **Use Debug API**: Test credit system with debug endpoints
3. **Check Database**: Verify user_profiles and credits_transactions tables
4. **Verify Webhooks**: Ensure Stripe webhooks are reaching your server
5. **Test Functions**: Use debug API to test database functions

The debug logging will help identify exactly where the credit system is failing and provide detailed information for troubleshooting.
