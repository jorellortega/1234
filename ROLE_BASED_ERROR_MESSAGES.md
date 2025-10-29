# Role-Based Error Messages

## Overview

INFINITO uses **role-based error messaging** to provide appropriate information based on user type. Admins see technical details and model suggestions, while regular users see simplified, user-friendly messages.

## Why Role-Based Messages?

### For Regular Users
- ✅ **Simplified**: No confusing technical jargon
- ✅ **Professional**: Generic "service unavailable" messages
- ✅ **Reassuring**: Clear confirmation of credit refunds
- ✅ **Actionable**: Simple next steps (wait, try again, contact support)
- ❌ **No Model Names**: Protects internal infrastructure details

### For Admins
- ✅ **Technical Details**: Full error messages from APIs
- ✅ **Model Suggestions**: Specific alternatives (Gen3a Turbo, Gen4 Turbo)
- ✅ **Debugging Info**: Exact error codes and reasons
- ✅ **API References**: Links to RunwayML billing, documentation
- ✅ **Transparency**: See what's actually happening behind the scenes

## Error Message Comparison

### 1. Throttled Video Generation

**Admin Message:**
```
Video generation is currently throttled by RunwayML. Their API might be 
experiencing high demand. Please try again later or try a different model 
(Gen3a Turbo or Gen4 Turbo).
```

**Regular User Message:**
```
Video generation is temporarily unavailable due to high demand. 
Please try again in a few minutes.
```

---

### 2. Generation Timeout

**Admin Message:**
```
Video generation timed out after 20 minutes. Please try again or use a 
shorter duration.
```

**Regular User Message:**
```
Video generation took too long and timed out. Please try again.
```

---

### 3. Insufficient RunwayML Credits

**Admin Message:**
```
Insufficient RunwayML API credits. Your INFINITO credits have been refunded. 
Please add credits to your RunwayML account at 
https://app.runwayml.com/billing or try a cheaper model 
(Gen4 Turbo uses only 25 RunwayML credits vs 200 for VEO 3).
```

**Regular User Message:**
```
Video generation service temporarily unavailable. Your credits have been 
refunded. Please try again later or contact support.
```

---

### 4. General Video Generation Failure

**Admin Message:**
```
Video generation failed: [Technical error message from RunwayML API]
Details: [Full error response data]
```

**Regular User Message:**
```
Video generation failed. Your credits have been refunded. 
Please try again or contact support.
Details: An error occurred
```

---

## Technical Implementation

### Backend Detection

```typescript
// app/api/runway/route.ts

// Check if user is admin
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('id', user.id)
  .single()

const isAdmin = profile?.role === 'admin'
```

### Error Message Selection

```typescript
// Example: Throttled error
const errorMessage = isAdmin
  ? 'Video generation is currently throttled by RunwayML. Their API might be experiencing high demand. Please try again later or try a different model (Gen3a Turbo or Gen4 Turbo).'
  : 'Video generation is temporarily unavailable due to high demand. Please try again in a few minutes.'

throw new Error(errorMessage)
```

### Response Details

```typescript
// Admin gets full details
details: isAdmin ? 'RunwayML account credit balance too low' : 'Service unavailable'

// Admin gets technical info
details: isAdmin ? (error.response?.data || error.message) : 'An error occurred'
```

## Error Types Covered

### ✅ Role-Based Messages
1. **Throttled Requests**: High demand errors
2. **Timeouts**: 20+ minute generation timeouts
3. **Insufficient Credits**: RunwayML account issues
4. **General Failures**: Unexpected API errors

### ⚠️ Same for All Users
1. **Authentication Errors**: Login required
2. **Validation Errors**: Missing prompt, invalid parameters
3. **Success Messages**: Video generated successfully

## Benefits

### Security
- 🔒 **Infrastructure Privacy**: Regular users don't see model names
- 🔒 **API Details Hidden**: No exposure of RunwayML specifics
- 🔒 **Error Sanitization**: Technical details only for admins

### User Experience
- 😊 **Regular Users**: Simple, non-technical messages
- 😊 **Admins**: Full transparency for debugging
- 😊 **Both**: Credit refund confirmation

### Support
- 📞 **Fewer Confused Users**: Clear, simple messages
- 📞 **Better Admin Tools**: Technical details when needed
- 📞 **Faster Resolution**: Admins can self-diagnose

## Testing

### Test as Admin
1. Log in as admin user
2. Try video generation with VEO 3
3. Verify error shows:
   - Model names (Gen3a Turbo, Gen4 Turbo)
   - RunwayML billing URL
   - Technical error details
   - Full API response

### Test as Regular User
1. Log in as regular user
2. Try video generation with VEO 3
3. Verify error shows:
   - Generic "service unavailable" message
   - NO model names
   - NO technical details
   - Simple "try again" instructions

## Future Enhancements

### Potential Improvements
1. **Localization**: Translate messages to user's language
2. **Contextual Help**: Link to help articles based on error
3. **Admin Toggle**: Let admins see user view for testing
4. **Error Codes**: Hidden codes for support to reference
5. **Status Page**: Link to service status page
6. **Estimated Wait Time**: Show queue position for throttled requests

### Admin Dashboard
```
Potential admin panel features:
- View all error logs
- See which models are failing most
- Monitor RunwayML API status
- Track credit refund history
- User error statistics
```

## Error Message Guidelines

### For Regular Users
- ✅ Use simple, clear language
- ✅ Confirm credit refunds immediately
- ✅ Provide clear next steps
- ✅ Avoid technical jargon
- ❌ Don't expose model names
- ❌ Don't show API errors
- ❌ Don't mention third-party services

### For Admins
- ✅ Show full technical details
- ✅ Include model alternatives
- ✅ Provide direct solution links
- ✅ Show API error codes
- ✅ Reference documentation
- ✅ Enable self-service debugging

## Examples in Context

### Scenario: RunwayML Throttling

**What Happened:**
- User tries to generate video
- RunwayML API is overloaded
- Request stuck in THROTTLED status for 5+ minutes
- System automatically refunds 26 credits

**Admin Sees:**
```
Error: Video generation is currently throttled by RunwayML. 
Their API might be experiencing high demand. Please try again later 
or try a different model (Gen3a Turbo or Gen4 Turbo).

Your 26 INFINITO credits have been refunded.
```

**Regular User Sees:**
```
Error: Video generation is temporarily unavailable due to high demand. 
Please try again in a few minutes.

Your 26 INFINITO credits have been refunded.
```

**Admin Action:**
- Can switch to Gen4 Turbo (mentioned in error)
- Knows it's a RunwayML issue, not INFINITO issue
- Can check RunwayML status directly

**Regular User Action:**
- Waits a few minutes
- Tries again
- Doesn't worry about technical details
- Credits are already refunded

---

**Last Updated**: October 28, 2025  
**Version**: 1.0.0  
**Status**: ✅ Active

