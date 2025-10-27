# RunwayML Video Generation Setup

## Overview
Your INFINITO AI platform now supports video generation using RunwayML's powerful AI models!

## Quick Start

### 1. Add your API key

Add the following to your `.env.local` file:

```env
RUNWAYML_API_SECRET=key_xxxxxxxxxxxxx
```

Replace `key_xxxxxxxxxxxxx` with your actual RunwayML API key.

### 2. Available Models

The integration supports three RunwayML models:

#### **GEN-4 TURBO** (`gen4_turbo`)
- **Requires**: Starting image (required)
- **Features**: Fast image-to-video generation
- **Duration**: 5 or 10 seconds
- **Best for**: Quick animations from static images

#### **GEN-3A TURBO** (`gen3a_turbo`)
- **Requires**: Starting image (required)
- **Features**: High-quality image-to-video
- **Duration**: 5 or 10 seconds
- **Best for**: Professional video content from images

#### **GEN-4 ALEPH** (`gen4_aleph`)
- **Requires**: Starting image (optional)
- **Features**: Advanced video generation with or without starting image
- **Duration**: 5 or 10 seconds
- **Best for**: Text-to-video or image-to-video with more control

### 3. How to Use

1. **Select Video Mode**: On the homepage, select one of the video models from the "VIDEO MODE" dropdown
2. **Upload Starting Image** (if required): For gen4_turbo and gen3a_turbo, you must upload a starting image
3. **Configure Settings**:
   - **Duration**: Choose between 5 or 10 seconds
   - **Aspect Ratio**: 
     - 16:9 Landscape (1280:720) - Standard widescreen
     - 9:16 Portrait (720:1280) - Vertical/mobile format
     - 1:1 Square (960:960) - Instagram-style square
     - 4:3 Landscape (1104:832) - Classic TV format
     - 3:4 Portrait (832:1104) - Vertical 4:3
     - Ultra Wide (1584:672) - Cinematic wide format
4. **Enter Prompt**: Describe the video you want to generate
5. **Click "GENERATE VIDEO"**: Wait 1-5 minutes for your video to be created
6. **Download**: Once generated, you can watch and download your video

### 4. Cost

Video generation costs **26 credits** per video (compared to 1-3 credits for text/image AI).

**Pricing Breakdown:**
- RunwayML API Cost: 10 credits
- User Cost: 26 credits (60% markup)
- Your Profit: 16 credits per video

### 5. Technical Details

#### Backend API Route
- **Location**: `/app/api/runway/route.ts`
- **POST Endpoint**: Creates and generates videos
- **GET Endpoint**: Checks generation status (optional)

#### Frontend Integration
- **Location**: `/app/page.tsx`
- **Features**: 
  - Video model selection
  - Image upload for image-to-video models
  - Real-time progress tracking
  - Video preview and download
  - Settings configuration (duration, ratio)

### 6. Model Requirements

| Model | Image Required | Text Required | Duration | Ratio Support |
|-------|----------------|---------------|----------|---------------|
| gen4_turbo | ✅ Yes | ✅ Yes | 5 or 10s | All |
| gen3a_turbo | ✅ Yes | ✅ Yes | 5 or 10s | All |
| gen4_aleph | ❌ Optional | ✅ Yes | 5 or 10s | All |

### 7. Generation Time

Video generation typically takes:
- **Minimum**: 30 seconds
- **Average**: 1-3 minutes
- **Maximum**: 5 minutes

The backend automatically polls RunwayML's API every 5 seconds until the video is ready.

### 8. Error Handling

The system handles:
- Missing API key
- Insufficient credits
- Missing required images
- Generation timeouts
- API failures

All errors are displayed in the UI with clear error messages.

### 9. Supported Formats

- **Input Images**: JPG, PNG, GIF, and other common image formats
- **Output Videos**: MP4 (provided by RunwayML)

## Example Prompts

### For Image-to-Video (gen4_turbo, gen3a_turbo)
- "Camera slowly zooms in on the subject"
- "Add gentle movement to the scene"
- "Make the water ripple and flow"
- "Add wind blowing through the hair"

### For Text-to-Video (gen4_aleph without image)
- "A cat playing with a ball of yarn"
- "Ocean waves crashing at sunset"
- "A futuristic city with flying cars"
- "A peaceful forest with falling leaves"

## Troubleshooting

### "RUNWAYML_API_SECRET environment variable is not set"
- Make sure you've added the API key to your `.env.local` file
- Restart your development server after adding the key

### "Insufficient credits"
- Video generation costs 10 credits
- Purchase more credits from the Credits page

### "Video generation timed out"
- The generation took longer than 10 minutes
- Try again with a simpler prompt or shorter duration

### "Model requires an image input"
- gen4_turbo and gen3a_turbo require a starting image
- Upload an image before generating

## Next Steps

1. Get your RunwayML API key from: https://runwayml.com/
2. Add it to your `.env.local` file
3. Restart your development server
4. Test the video generation on your homepage!

---

**Note**: This integration uses the official `@runwayml/sdk` package and follows RunwayML's best practices for video generation.

