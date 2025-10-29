# Credit Refund System

## Overview

INFINITO now automatically refunds credits when video generation fails due to RunwayML API errors. This ensures users don't lose credits for videos that were never successfully generated.

## How It Works

### Before Refund System ❌
1. User clicks "Generate Video"
2. INFINITO deducts 26 credits
3. RunwayML API call fails (insufficient credits, timeout, error)
4. User loses 26 credits with no video
5. Credits are gone forever

### With Refund System ✅
1. User clicks "Generate Video"
2. INFINITO deducts 26 credits
3. RunwayML API call fails (insufficient credits, timeout, error)
4. **INFINITO automatically refunds 26 credits**
5. User credit balance is restored
6. Error message confirms refund

## When Refunds Occur

Refunds are triggered for:

### ✅ Automatic Refunds
- **RunwayML Insufficient Credits**: When RunwayML account doesn't have enough credits
- **API Timeouts**: When video generation times out (20+ minutes in THROTTLED status)
- **API Errors**: When RunwayML returns any error before video generation completes
- **Server Errors**: When the generation request fails due to technical issues

### ❌ No Refund
- **Successful Generation**: Video was successfully created
- **User Cancellation**: User manually cancels (not yet implemented)

## Technical Implementation

### Backend (app/api/runway/route.ts)

```typescript
// Refund function
async function refundCredits(userId: string, amount: number) {
  // Uses Supabase Service Role Key for direct database access
  // Adds credits back to user_profiles table
  // Returns success status and new balance
}

// Error handling with refund
try {
  // Video generation logic
} catch (error) {
  // Refund credits
  const refundResult = await refundCredits(user.id, 26)
  
  // Return error with refund status
  return NextResponse.json({
    error: 'Error message',
    refunded: true,
    newBalance: refundResult.newBalance
  })
}
```

### Frontend (app/page.tsx)

```typescript
if (!response.ok) {
  const errorData = await response.json()
  
  // Update UI with refunded credits
  if (errorData.refunded && errorData.newBalance !== undefined) {
    setUserCredits(errorData.newBalance)
  }
  
  // Show refund message to user
  const refundMessage = errorData.refunded 
    ? ' Your 26 INFINITO credits have been refunded.' 
    : ''
  
  throw new Error(errorData.error + refundMessage)
}
```

## User Experience

### Error Message Examples

**Before:**
```
Error: Insufficient RunwayML API credits. Please add credits to your RunwayML account.
```

**After:**
```
Error: Insufficient RunwayML API credits. Your INFINITO credits have been refunded. 
Please add credits to your RunwayML account at https://app.runwayml.com/billing 
or try a cheaper model (Gen4 Turbo uses only 25 RunwayML credits vs 200 for VEO 3).
```

### Visual Feedback

1. **Credit Balance Updates**: The credit counter in the UI updates immediately after refund
2. **Console Logs**: Debug logs show refund status in browser console
3. **Error Message**: Clear message indicates credits were refunded

## Database Operations

### Tables Affected
- **user_profiles**: Credits are added back to the `credits` column

### SQL Operations
```sql
-- Get current credits
SELECT credits FROM user_profiles WHERE id = 'user-id';

-- Add refund
UPDATE user_profiles 
SET credits = credits + 26 
WHERE id = 'user-id';
```

### Permissions
- Uses **Supabase Service Role Key** for admin-level database access
- Bypasses Row Level Security (RLS) policies
- Ensures refund succeeds even if user's session is invalid

## Logging

### Backend Logs (Terminal)
```
💰 Refunding 26 credits to user d6c6adba-2b70-4121-b6ca-a07335c0de67
✅ Refunded 26 credits. New balance: 4344
✅ Successfully refunded 26 credits to user d6c6adba-2b70-4121-b6ca-a07335c0de67
```

### Frontend Logs (Browser Console)
```
✅ Credits refunded. New balance: 4344
```

## Error Handling

### Refund Failure
If the refund itself fails (rare):
- Error is logged to console
- `refunded: false` is returned in response
- User sees error message without refund confirmation
- User should contact support for manual refund

### Partial Failures
- If video generation fails but refund succeeds: ✅ User gets error + refund
- If video generation fails and refund fails: ❌ User gets error without refund (support needed)

## Testing

### Test Scenarios

1. **Insufficient RunwayML Credits**
   - Start with low RunwayML credits (< 200)
   - Try to generate VEO 3 video
   - Verify: Error + Refund + Credit balance restored

2. **Video Generation Timeout**
   - Start video generation
   - Wait for 20+ minute timeout
   - Verify: Timeout error + Refund + Credit balance restored

3. **Invalid Model/Parameters**
   - Use invalid aspect ratio or duration
   - Verify: Validation error + Refund + Credit balance restored

## Future Enhancements

### Potential Improvements
1. **Refund History**: Track all refunds in a separate table
2. **Partial Refunds**: Refund proportional credits for partial generation
3. **User Cancellation**: Allow users to cancel and get refund
4. **Retry Logic**: Automatically retry failed generations before refunding
5. **Notification System**: Email users about refunds
6. **Audit Trail**: Log all credit transactions for accounting

### Credit Transaction Table (Future)
```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'deduction', 'refund', 'purchase'
  reason TEXT,
  related_task_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Benefits

### For Users
- ✅ **Fair**: Only pay for successful videos
- ✅ **Transparent**: Clear messaging about refunds
- ✅ **Reliable**: Automatic refund without support tickets
- ✅ **Immediate**: Credits restored instantly

### For Platform
- ✅ **Trust**: Builds user confidence
- ✅ **Retention**: Reduces frustration with failed attempts
- ✅ **Support**: Fewer manual refund requests
- ✅ **Reputation**: Shows commitment to fair pricing

## Troubleshooting

### "I didn't get my refund"
1. Check browser console for refund confirmation
2. Refresh page to see updated credit balance
3. Check if error occurred before credits were deducted
4. Contact support with timestamp and error message

### "Credits deducted twice"
1. Check if you clicked generate multiple times
2. Each attempt deducts credits but refunds on failure
3. Check browser network tab for multiple requests
4. Contact support if duplicate charges confirmed

### "Refund but still showing old balance"
1. Hard refresh the page (Cmd+Shift+R / Ctrl+Shift+R)
2. Log out and log back in
3. Check browser console for actual balance
4. Database might be cached - wait 1 minute

---

**Last Updated**: October 28, 2025  
**Version**: 1.0.0  
**Status**: ✅ Active

