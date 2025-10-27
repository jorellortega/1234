# Image Generation Setup (DALL-E 3 & RunwayML Gen-4)

## Overview
Your INFINITO AI platform now supports **dual image generation** with two powerful AI models:
- **DALL-E 3** by OpenAI - High-quality static images (fast, ~30 seconds)
- **RunwayML Gen-4 Image** - AI-generated images (1-3 minutes)

This gives users choice between two different AI image generation engines!

## Quick Start

### 1. API Keys (Already Set Up)
Both services are already configured:
- **OpenAI API Key**: Already in your database for DALL-E 3
- **RunwayML API Key**: Already configured in `.env.local` for both image and video generation

### 2. How to Use

1. **Select Image Mode**: On the homepage, choose from the "IMAGE MODE" dropdown:
   - **DALL-E 3** - For fast, high-quality images (~30 seconds)
   - **RUNWAY GEN-4** - For AI-generated images (1-3 minutes)
2. **Enter Prompt**: Describe the image you want to generate
   - Example: "A futuristic city with flying cars at sunset"
   - Example: "A portrait of a cyberpunk warrior with neon lights"
3. **Click "GENERATE IMAGE"**: Wait 1-3 minutes for your image to be created
4. **Download**: Once generated, you can view and download your image

### 3. Cost

Image generation costs vary by model:
- **DALL-E 3**: 13 credits per image
- **RunwayML Gen-4 Image**: 16 credits per image

**Pricing Breakdown:**

| Model | API Cost | User Cost | Your Profit | Speed |
|-------|----------|-----------|-------------|-------|
| DALL-E 3 | ~5 credits | 13 credits | ~8 credits | ~30 seconds |
| RunwayML Gen-4 | ~10 credits | 16 credits | ~6 credits | 1-3 minutes |
| **Videos** (comparison) | ~10 credits | 26 credits | ~16 credits | 1-5 minutes |

### 4. Technical Details

#### Backend API Routes
- **Location**: `/app/api/dalle-image/route.ts` - DALL-E 3 endpoint
- **Location**: `/app/api/runway-image/route.ts` - RunwayML Gen-4 Image endpoint
- **POST Endpoints**: Generate images using respective APIs

#### Frontend Integration
- **Location**: `/app/page.tsx`
- **Features**: 
  - Dual model selection in IMAGE MODE dropdown
  - Real-time progress tracking
  - Image preview and download
  - Dynamic credit checking (13 or 16 based on model)
  - Smart routing to correct API

### 5. Output Format

Both services generate high-quality **PNG images** (1024x1024 pixels).

**DALL-E 3 Features:**
- Standard quality
- Square format (1:1 ratio)
- Fast generation (~30 seconds)
- Perfect for web, social media

**RunwayML Gen-4 Image Features:**
- High-quality AI generation
- Square format (1:1 ratio)
- Slightly longer generation (1-3 minutes)
- Uses `textToImage.create()` API with `gen4_image` model

### 6. Comparison: Image Mode Options

| Model | Type | Use Case | Output Format | Cost | Requirements |
|-------|------|----------|---------------|------|--------------|
| **"One" (BLIP)** | Vision Analysis | Analyze/caption existing images | Text response | 3 credits | Upload image |
| **"Dos" (LLaVA)** | Vision Analysis | Q&A about existing images | Text response | 3 credits | Upload image |
| **DALL-E 3** | Image Generation | Fast image generation from text | PNG image | 13 credits | Text prompt |
| **RUNWAY GEN-4** | Image Generation | AI image generation from text | PNG image | 16 credits | Text prompt |

**For Video Generation**: Use VIDEO MODE with RunwayML Gen-3A Turbo, Gen-4 Turbo, or Gen-4 Aleph (26 credits)

### 7. Generation Time

**DALL-E 3:**
- **Average**: 20-40 seconds
- **Typical**: ~30 seconds
- Fastest option for image generation

**RunwayML Gen-4 Image:**
- **Average**: 1-2 minutes
- **Typical**: 1-3 minutes
- Slightly slower but different AI engine

**Videos** (comparison): 1-5 minutes

### 8. Example Prompts

**Great prompts for image generation:**
- "A serene Japanese garden with cherry blossoms at dawn, photorealistic"
- "Abstract geometric patterns in neon colors, digital art style"
- "A dragon flying over medieval castle, fantasy art"
- "Minimalist logo design for a tech startup, modern and clean"
- "Cyberpunk street scene with rain and neon signs, cinematic"
- "Portrait of an alien explorer, sci-fi concept art"

**Tips for better results:**
- Be specific about style (photorealistic, digital art, cartoon, etc.)
- Include lighting details (sunset, neon, dramatic lighting)
- Mention mood or atmosphere (serene, energetic, mysterious)
- Specify composition (close-up, wide shot, aerial view)

### 9. Error Handling

The system handles:
- Missing API key
- Insufficient credits
- Generation timeouts
- API failures

All errors are displayed in the UI with clear error messages.

### 10. UI Features

**Visual Design:**
- Purple theme for image generation (matching your color scheme)
- Animated spinner during generation
- Progress messages
- Success notification with download button
- Static image preview with download as PNG

**Progress Updates:**
- "Preparing your image generation..."
- "Sending request to DALL-E 3..." or "Sending request to RunwayML Gen-4..."
- "Image generated successfully!"

### 11. Technical Implementation

**Key Discovery:**
- RunwayML SDK has a `textToImage` resource (not just `imageToVideo`)!
- Method: `runway.textToImage.create()`
- Model: `gen4_image` (supports optional reference images, works with text-only)
- This was the missing piece - I initially tried using `imageToVideo` which requires an image input

**API Methods:**
- **DALL-E**: `fetch("https://api.openai.com/v1/images/generations")`
- **RunwayML**: `runway.textToImage.create({ model: 'gen4_image', promptText, ratio })`

## Troubleshooting

### "RUNWAYML_API_SECRET environment variable is not set"
- Make sure you've added the API key to your `.env.local` file
- Restart your development server after adding the key

### "Insufficient credits"
- Image generation costs 13 credits
- Purchase more credits from the Credits page

### "Image generation timed out"
- The generation took longer than 10 minutes (rare)
- Try again with a simpler prompt

### How does RunwayML image generation work?
- Uses the `textToImage` API endpoint (not `imageToVideo`)
- Model: `gen4_image` supports pure text-to-image generation
- Reference images are optional (we're using pure text prompts)
- Output: High-quality PNG images (1024x1024)

## Next Steps

1. ✅ Your RunwayML API key is already configured
2. ✅ The image generation feature is now live
3. Test the image generation on your homepage!
4. Share the feature with your users

---

**Note**: This integration uses the official `@runwayml/sdk` package and RunwayML's Gen-4 model for high-quality image generation. The output format (video) is a current limitation of the API but provides unique motion graphic capabilities.

