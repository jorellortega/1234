# Complete Kling AI Integration Guide for Other Websites

This comprehensive guide contains everything you need to integrate Kling AI video generation into another website, based on the working implementation in INFINITO.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Package Dependencies](#package-dependencies)
5. [API Routes](#api-routes)
6. [Database Setup](#database-setup)
7. [Frontend Integration](#frontend-integration)
8. [Authentication & Credits System](#authentication--credits-system)
9. [Error Handling](#error-handling)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)

---

## Overview

Kling AI provides video generation via:
- **Text-to-Video (T2V)**: Generate videos from text prompts
- **Image-to-Video (I2V)**: Animate static images into videos
- **Authentication**: JWT (JSON Web Token) with HS256 algorithm
- **API Model**: Asynchronous task-based (create task → poll status → get result)

**Key Endpoints:**
- T2V: `https://api-singapore.klingai.com/v1/videos/text2video`
- I2V: `https://api-singapore.klingai.com/v1/videos/image2video`

---

## Prerequisites

### 1. Kling AI API Account

1. **Sign up** at [Kling AI Developer Console](https://app.klingai.com/global/dev/api-key)
2. **Get your credentials**:
   - Access Key (starts with `ak_`)
   - Secret Key (starts with `sk_`)
3. **Purchase API Credits** (separate from website credits):
   - Visit: https://klingai.com/global/dev/pricing
   - Choose a package (Trial: $9.79 for 100 units recommended to start)
   - **Important**: Website credits ≠ API credits. You need API credits for integration.

### 2. Tech Stack Requirements

- **Framework**: Next.js 13+ (App Router) or similar with API routes
- **Runtime**: Node.js 18+
- **Database**: Supabase (or similar PostgreSQL database)
- **Authentication**: Supabase Auth (or your auth system)

---

## Environment Variables

Add these to your `.env.local` (or your environment configuration):

```env
# Kling AI API Credentials
KLING_ACCESS_KEY=ak_xxxxxxxxxxxxxxxxxxxxxxxxx
KLING_SECRET_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase (if using)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Security Note**: Never commit these to version control. Use environment variable management in production.

---

## Package Dependencies

Install the required npm packages:

```bash
npm install jsonwebtoken @types/jsonwebtoken
# or
pnpm add jsonwebtoken @types/jsonwebtoken
```

**Package.json excerpt:**
```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.10"
  }
}
```

---

## API Routes

### 1. Create the API Route File

Create `/app/api/kling/route.ts` (Next.js App Router) or equivalent API endpoint:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Video model credit costs (adjust based on your pricing)
const VIDEO_CREDITS: Record<string, number> = {
  'kling_t2v': 50,
  'kling_i2v': 50,
}

// Generate JWT token for Kling AI authentication
function generateKlingToken() {
  const accessKey = process.env.KLING_ACCESS_KEY
  const secretKey = process.env.KLING_SECRET_KEY

  if (!accessKey || !secretKey) {
    throw new Error('KLING_ACCESS_KEY and KLING_SECRET_KEY environment variables are not set')
  }

  const payload = {
    iss: accessKey,
    exp: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
    nbf: Math.floor(Date.now() / 1000) - 5 // 5 seconds ago
  }

  const token = jwt.sign(payload, secretKey, { algorithm: 'HS256' })
  return token
}

// Refund credits function (adjust based on your credits system)
async function refundCredits(userId: string, amount: number, reason?: string) {
  try {
    // Implement your refund logic here
    // This example uses Supabase - adjust for your system
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const { error } = await supabaseAdmin.rpc('add_user_credits', {
      user_id: userId,
      credits_to_add: amount,
      transaction_type: 'refund',
      description: reason || 'Credit refund for failed generation',
      reference_id: `refund_${Date.now()}`
    })
    
    if (error) {
      return { success: false, error }
    }
    
    return { success: true }
  } catch (error) {
    return { success: false, error }
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify user authentication (adjust based on your auth system)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Handle server component errors
            }
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const prompt = formData.get('prompt') as string
    const model = formData.get('model') as string
    const duration = parseInt(formData.get('duration') as string) || 5
    const file = formData.get('file') as File | null
    const startFrame = formData.get('start_frame') as File | null
    const endFrame = formData.get('end_frame') as File | null
    const ratio = formData.get('ratio') as string || '16:9'

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!model) {
      return NextResponse.json(
        { error: 'Model is required' },
        { status: 400 }
      )
    }

    // Convert files to base64 if provided
    let imageBase64: string | undefined
    let imageTailBase64: string | undefined
    
    // Handle start/end frames
    if (startFrame) {
      const arrayBuffer = await startFrame.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      imageBase64 = `data:${startFrame.type};base64,${buffer.toString('base64')}`
    } else if (file) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      imageBase64 = `data:${file.type};base64,${buffer.toString('base64')}`
    }
    
    if (endFrame) {
      const arrayBuffer = await endFrame.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      imageTailBase64 = `data:${endFrame.type};base64,${buffer.toString('base64')}`
    }

    // Generate JWT token for Kling AI
    const authToken = generateKlingToken()

    // Call Kling AI API
    try {
      // Convert aspect ratio to Kling AI format (16:9, 9:16, 1:1)
      let klingAspectRatio = '16:9' // default
      const ratioMap: Record<string, string> = {
        '1280:720': '16:9',
        '1920:1080': '16:9',
        '720:1280': '9:16',
        '1080:1920': '9:16',
        '960:960': '1:1',
        '768:1280': '9:16',
        '832:1104': '3:4',
      }
      
      if (ratio in ratioMap) {
        klingAspectRatio = ratioMap[ratio]
      } else if (ratio === '1280:768' || ratio === '1104:832' || ratio === '1584:672') {
        klingAspectRatio = '16:9'
      } else {
        const [w, h] = ratio.split(':').map(Number)
        if (w && h) {
          const aspect = w / h
          if (aspect > 1.5) klingAspectRatio = '16:9'
          else if (aspect < 0.6) klingAspectRatio = '9:16'
          else klingAspectRatio = '1:1'
        }
      }

      // Determine endpoint based on model type
      let endpoint: string
      
      if (model === 'kling_t2v') {
        endpoint = 'https://api-singapore.klingai.com/v1/videos/text2video'
      } else if (model === 'kling_i2v' && imageBase64) {
        endpoint = 'https://api-singapore.klingai.com/v1/videos/image2video'
      } else if (imageBase64) {
        endpoint = 'https://api-singapore.klingai.com/v1/videos/image2video'
      } else {
        endpoint = 'https://api-singapore.klingai.com/v1/videos/text2video'
      }

      // Prepare request body
      const requestBody: any = {
        prompt: prompt,
        duration: duration.toString(), // Must be string: "5" or "10"
        aspect_ratio: klingAspectRatio,
        mode: 'pro', // Use pro mode for highest quality
      }

      // Add images if provided
      if (imageBase64) {
        // Remove data URI prefix (Kling AI only wants base64 string)
        requestBody.image = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
      }
      
      if (imageTailBase64) {
        requestBody.image_tail = imageTailBase64.replace(/^data:image\/[a-z]+;base64,/, '')
      }

      console.log('🎬 Calling Kling AI API:', { 
        endpoint, 
        prompt, 
        duration, 
        ratio: klingAspectRatio
      })
      
      // Step 1: Create task
      const createResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error('❌ Kling AI error:', createResponse.status, errorText)
        throw new Error(`Kling AI API error: ${createResponse.status} - ${errorText}`)
      }

      const createData = await createResponse.json()
      console.log('✅ Kling AI task created:', createData)

      // Check if task creation was successful
      if (createData.code !== 0 || !createData.data?.task_id) {
        throw new Error(`Kling AI task creation failed: ${createData.message || 'Unknown error'}`)
      }

      const taskId = createData.data.task_id

      // Step 2: Poll for task completion
      const maxAttempts = 60 // Try for up to 5 minutes (5s intervals)
      let attempts = 0
      let videoUrl: string | null = null

      // Use the same endpoint type for polling
      const statusEndpoint = endpoint.includes('image2video')
        ? `https://api-singapore.klingai.com/v1/videos/image2video/${taskId}`
        : `https://api-singapore.klingai.com/v1/videos/text2video/${taskId}`

      while (attempts < maxAttempts) {
        attempts++
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds

        console.log(`🔄 Polling task status (attempt ${attempts}/${maxAttempts})...`)
        
        const statusResponse = await fetch(statusEndpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!statusResponse.ok) {
          console.log(`⚠️ Status check failed: ${statusResponse.status}`)
          continue
        }

        const statusData = await statusResponse.json()

        if (statusData.data?.task_status === 'succeed') {
          videoUrl = statusData.data.task_result?.videos?.[0]?.url
          if (videoUrl) {
            console.log('✅ Video generated successfully!')
            break
          }
        } else if (statusData.data?.task_status === 'failed') {
          throw new Error(`Video generation failed: ${statusData.data?.task_status_msg || 'Unknown error'}`)
        }
      }

      if (!videoUrl) {
        throw new Error('Video generation timed out after maximum polling attempts')
      }

      return NextResponse.json({
        success: true,
        url: videoUrl,
        model: model,
        prompt: prompt,
        duration: duration,
        ratio: ratio,
      })

    } catch (error: any) {
      console.error('Kling AI API error:', error)
      
      // Refund credits for failed generation
      const REFUND_AMOUNT = VIDEO_CREDITS[model] || 50
      const refundResult = await refundCredits(user.id, REFUND_AMOUNT)
      
      let errorMessage = ''
      if (error.message?.includes('Account balance not enough')) {
        errorMessage = 'Kling AI account has insufficient credits. Please top up your account.'
      } else {
        errorMessage = 'Video generation failed: ' + (error.message || 'Unknown error')
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: error.message,
          refunded: refundResult.success
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Server error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}
```

### 2. Request Format

Your frontend should send a POST request with FormData:

```typescript
const formData = new FormData()
formData.append('prompt', 'A beautiful sunset over the ocean')
formData.append('model', 'kling_t2v') // or 'kling_i2v'
formData.append('duration', '5') // or '10'
formData.append('ratio', '16:9') // or '9:16', '1:1'

// For I2V, add image
if (imageFile) {
  formData.append('file', imageFile)
  // Or for start/end frame control:
  // formData.append('start_frame', startFrameFile)
  // formData.append('end_frame', endFrameFile)
}

const response = await fetch('/api/kling', {
  method: 'POST',
  body: formData
})
```

---

## Database Setup

### 1. Credits System (If Using Supabase)

Run this SQL in your Supabase SQL Editor:

```sql
-- Add credits column to user_profiles table
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

-- Create function to check if user has enough credits
CREATE OR REPLACE FUNCTION public.has_sufficient_credits(
  user_id UUID,
  required_credits INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT credits INTO current_credits 
  FROM public.user_profiles 
  WHERE id = user_id;
  
  RETURN COALESCE(current_credits, 0) >= required_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to deduct credits
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
  user_id UUID,
  credits_to_deduct INTEGER,
  transaction_type VARCHAR(50) DEFAULT 'usage',
  description TEXT DEFAULT NULL,
  reference_id VARCHAR(255) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT credits INTO current_credits 
  FROM public.user_profiles 
  WHERE id = user_id;
  
  IF current_credits IS NULL OR current_credits < credits_to_deduct THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.user_profiles 
  SET credits = credits - credits_to_deduct,
      updated_at = NOW()
  WHERE id = user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to add credits (for refunds)
CREATE OR REPLACE FUNCTION public.add_user_credits(
  user_id UUID,
  credits_to_add INTEGER,
  transaction_type VARCHAR(50) DEFAULT 'refund',
  description TEXT DEFAULT NULL,
  reference_id VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_profiles 
  SET credits = credits + credits_to_add,
      updated_at = NOW()
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (id, credits, created_at, updated_at)
    VALUES (user_id, credits_to_add, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET 
      credits = user_profiles.credits + credits_to_add,
      updated_at = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.has_sufficient_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_user_credits TO authenticated;
```

### 2. Credits Check API (Optional but Recommended)

Create `/app/api/credits/check/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: Request) {
  try {
    const { requiredCredits, operation } = await request.json()
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has sufficient credits
    const { data: hasCredits, error: checkError } = await supabase.rpc('has_sufficient_credits', {
      user_id: user.id,
      required_credits: requiredCredits
    })

    if (checkError) {
      return NextResponse.json(
        { error: 'Failed to check credits' },
        { status: 500 }
      )
    }

    if (!hasCredits) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient credits',
        requiredCredits,
        message: `You need ${requiredCredits} credits to perform this operation`
      })
    }

    // If operation is 'check_and_deduct', deduct the credits
    if (operation === 'check_and_deduct') {
      const { data: deducted, error: deductError } = await supabase.rpc('deduct_user_credits', {
        user_id: user.id,
        credits_to_deduct: requiredCredits,
        transaction_type: 'ai_generation',
        description: 'AI generation request',
        reference_id: `gen_${Date.now()}`
      })

      if (deductError || !deducted) {
        return NextResponse.json(
          { error: 'Failed to deduct credits' },
          { status: 500 }
        )
      }
    }

    // Get updated credit balance
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', user.id)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      credits: profile?.credits ?? 0,
      deducted: operation === 'check_and_deduct' ? requiredCredits : 0
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## Frontend Integration

### 1. Basic Frontend Component Example

```typescript
'use client'

import { useState } from 'react'

export default function KlingVideoGenerator() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('kling_t2v')
  const [duration, setDuration] = useState(5)
  const [ratio, setRatio] = useState('16:9')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    setLoading(true)
    setError(null)
    setVideoUrl(null)

    try {
      // Check and deduct credits first
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Please log in')
      }

      const creditResponse = await fetch('/api/credits/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requiredCredits: 50, // Adjust based on your pricing
          operation: 'check_and_deduct'
        })
      })

      const creditData = await creditResponse.json()
      if (!creditData.success) {
        setError(creditData.message || 'Insufficient credits')
        setLoading(false)
        return
      }

      // Prepare form data
      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('model', model)
      formData.append('duration', duration.toString())
      formData.append('ratio', ratio)
      
      if (imageFile && model === 'kling_i2v') {
        formData.append('file', imageFile)
      }

      // Call Kling API
      const response = await fetch('/api/kling', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Video generation failed')
      }

      const data = await response.json()
      setVideoUrl(data.url)

    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Kling AI Video Generator</h1>
      
      <div className="space-y-4">
        <div>
          <label>Model:</label>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="kling_t2v">Text-to-Video</option>
            <option value="kling_i2v">Image-to-Video</option>
          </select>
        </div>

        <div>
          <label>Prompt:</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video..."
            className="w-full p-2 border rounded"
          />
        </div>

        {model === 'kling_i2v' && (
          <div>
            <label>Image:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </div>
        )}

        <div>
          <label>Duration:</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
          </select>
        </div>

        <div>
          <label>Aspect Ratio:</label>
          <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
            <option value="16:9">16:9 (Landscape)</option>
            <option value="9:16">9:16 (Portrait)</option>
            <option value="1:1">1:1 (Square)</option>
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Video'}
        </button>

        {error && (
          <div className="text-red-500">{error}</div>
        )}

        {videoUrl && (
          <div>
            <video src={videoUrl} controls className="w-full max-w-2xl" />
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Authentication & Credits System

### Key Points:

1. **Authentication**: The API route checks for authenticated users. Adjust based on your auth system.
2. **Credits Check**: Frontend checks credits before calling the API.
3. **Credit Deduction**: Credits are deducted upfront.
4. **Automatic Refund**: Credits are refunded if generation fails.

### Credits Flow:

```
1. User clicks "Generate"
2. Frontend calls /api/credits/check with operation: 'check_and_deduct'
3. Credits are deducted if sufficient
4. Frontend calls /api/kling to generate video
5. If generation fails, /api/kling refunds credits automatically
```

---

## Error Handling

### Common Errors:

1. **"Account balance not enough"**:
   - Your Kling AI API credits are insufficient
   - Purchase more at https://klingai.com/global/dev/pricing
   - **Important**: This is API credits, not website credits

2. **"KLING_ACCESS_KEY and KLING_SECRET_KEY environment variables are not set"**:
   - Add credentials to `.env.local`
   - Restart your development server

3. **"Unauthorized - Please log in"**:
   - User must be authenticated
   - Adjust auth check in API route

4. **"Video generation timed out"**:
   - Increase `maxAttempts` in polling loop
   - Check Kling AI API status

---

## Testing

### 1. Test JWT Token Generation

```typescript
// Test in Node.js console or API route
const jwt = require('jsonwebtoken')

const payload = {
  iss: process.env.KLING_ACCESS_KEY,
  exp: Math.floor(Date.now() / 1000) + 1800,
  nbf: Math.floor(Date.now() / 1000) - 5
}

const token = jwt.sign(payload, process.env.KLING_SECRET_KEY, { algorithm: 'HS256' })
console.log('Token:', token)
```

### 2. Test API Call Directly

```bash
# Using curl
curl -X POST https://api-singapore.klingai.com/v1/videos/text2video \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset",
    "duration": "5",
    "aspect_ratio": "16:9",
    "mode": "pro"
  }'
```

### 3. Test Full Integration

1. Log in as a user with credits
2. Enter a prompt
3. Select model (T2V or I2V)
4. Click generate
5. Wait for polling to complete
6. Verify video URL is returned

---

## Troubleshooting

### Video Generation Takes Too Long

- **Issue**: Polling times out
- **Solution**: Increase `maxAttempts` or polling interval
- **Note**: Kling AI can take 1-5 minutes per video

### Credits Not Refunded

- **Check**: `refundCredits` function is called in catch block
- **Check**: Database function `add_user_credits` exists and works
- **Check**: Service role key has correct permissions

### Authentication Errors

- **Check**: JWT token is generated correctly
- **Check**: Access key and secret key are correct
- **Check**: Token hasn't expired (30-minute lifetime)

### Base64 Encoding Issues

- **Issue**: Image upload fails
- **Solution**: Ensure data URI prefix is removed: `imageBase64.replace(/^data:image\/[a-z]+;base64,/, '')`

---

## API Response Format

### Task Creation Response:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": "task_xxxxxxxxxxxxx"
  }
}
```

### Status Polling Response:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_status": "succeed",
    "task_result": {
      "videos": [
        {
          "url": "https://cdn.klingai.com/video/xxxxx.mp4"
        }
      ]
    }
  }
}
```

### Status Values:
- `submitted`: Task created, waiting to start
- `processing`: Video is being generated
- `succeed`: Video is ready
- `failed`: Generation failed

---

## Pricing Reference

### Kling AI API Costs:
- **Pro mode, 5s video**: 2.5 units (~$0.35)
- **Pro mode, 10s video**: 5 units (~$0.70)

### Purchase Packages:
- **Trial**: $9.79 for 100 units (30 days)
- **Package 1**: $4,200 for 30,000 units (90 days)
- **Package 2**: $6,300 for 45,000 units (90 days) - 10% off
- **Package 3**: $8,400 for 60,000 units (90 days) - 20% off

Visit: https://klingai.com/global/dev/pricing

---

## Complete File Structure

```
your-project/
├── app/
│   ├── api/
│   │   ├── kling/
│   │   │   └── route.ts          # Main Kling AI API route
│   │   └── credits/
│   │       └── check/
│   │           └── route.ts      # Credits check/deduct API
│   └── video-generator/
│       └── page.tsx              # Frontend component
├── .env.local                    # Environment variables
└── package.json                  # Dependencies
```

---

## Additional Resources

- **Kling AI API Docs**: https://klingai.com/global/dev/model/video
- **Kling AI Pricing**: https://klingai.com/global/dev/pricing
- **JWT Specification**: https://datatracker.ietf.org/doc/html/rfc7519

---

## Summary Checklist

- [ ] Install `jsonwebtoken` package
- [ ] Add `KLING_ACCESS_KEY` and `KLING_SECRET_KEY` to environment
- [ ] Create `/api/kling/route.ts` API route
- [ ] Implement JWT token generation
- [ ] Set up credits system (if using)
- [ ] Create frontend component
- [ ] Test authentication flow
- [ ] Test video generation
- [ ] Handle errors and refunds
- [ ] Purchase Kling AI API credits
- [ ] Deploy and test in production

---

**Note**: This guide is based on the working INFINITO implementation. Adjust authentication, database, and credits systems to match your stack. The core Kling AI integration (JWT auth, API calls, polling) remains the same.

