# RunwayML Video Models Guide

## Overview

INFINITO now supports **6 video generation models** from RunwayML, each with different capabilities, speeds, and aspect ratio options.

## Available Models

### 1. **GEN-4 TURBO** ⚡
- **Type**: Image to Video
- **Speed**: Fastest
- **Duration**: 2-10 seconds (flexible)
- **Aspect Ratios**:
  - `1280:720` (16:9 Landscape)
  - `720:1280` (9:16 Portrait)
  - `1104:832` (Horizontal)
  - `832:1104` (Vertical)
  - `960:960` (Square)
  - `1584:672` (Ultra-wide)
- **Best For**: Quick generations, prototyping, testing ideas
- **Requirements**: Requires an image input

### 2. **GEN-3A TURBO** 🚀
- **Type**: Image to Video
- **Speed**: Fast
- **Duration**: 5 or 10 seconds only
- **Aspect Ratios**:
  - `1280:768` (Horizontal)
  - `768:1280` (Vertical/Portrait) ⭐ Default
- **Best For**: High-quality generations with good speed/quality balance
- **Requirements**: Requires an image input

### 3. **VEO 3.1** 🎯 ✨ TEXT-TO-VIDEO SUPPORTED
- **Type**: Text to Video OR Image to Video
- **Speed**: Medium-Fast
- **Duration**: 4, 6, or 8 seconds only
- **Aspect Ratios**:
  - `1280:720` (16:9 Landscape)
  - `720:1280` (9:16 Portrait)
  - `1080:1920` (Vertical HD)
  - `1920:1080` (Horizontal HD)
- **Best For**: High-quality video with text or image prompts
- **Requirements**: Works with text-only OR image + text ⭐

### 4. **VEO 3.1 FAST** ⚡🎯 ✨ TEXT-TO-VIDEO SUPPORTED
- **Type**: Text to Video OR Image to Video
- **Speed**: Fast
- **Duration**: 4, 6, or 8 seconds only
- **Aspect Ratios**:
  - `1280:720` (16:9 Landscape)
  - `720:1280` (9:16 Portrait)
  - `1080:1920` (Vertical HD)
  - `1920:1080` (Horizontal HD)
- **Best For**: Faster version of VEO 3.1, good quality with speed
- **Requirements**: Works with text-only OR image + text ⭐

### 5. **VEO 3** 🎬 ✨ TEXT-TO-VIDEO SUPPORTED
- **Type**: Text to Video OR Image to Video
- **Speed**: Medium
- **Duration**: 8 seconds only (fixed)
- **Aspect Ratios**:
  - `1280:720` (16:9 Landscape)
  - `720:1280` (9:16 Portrait)
  - `1080:1920` (Vertical HD)
  - `1920:1080` (Horizontal HD)
- **Best For**: Highest quality video generation
- **Requirements**: Works with text-only OR image + text ⭐

### 6. **GEN-4 ALEPH (V2V)** 🔄
- **Type**: Video to Video
- **Speed**: Medium
- **Duration**: Variable (depends on input video)
- **Aspect Ratios**:
  - `1280:720` (16:9)
  - `720:1280` (9:16)
  - `1104:832`, `832:1104`, `960:960`, `1584:672`, `848:480`, `640:480`
- **Best For**: Transforming existing videos with AI
- **Requirements**: Requires a video input (not yet supported in INFINITO)
- **Status**: ⚠️ Currently disabled - will be added in future update

## Model Comparison

| Model | Type | Duration | Speed | Quality | Aspect Ratios |
|-------|------|----------|-------|---------|---------------|
| GEN-4 TURBO | I2V | 2-10s | ⚡⚡⚡ | ⭐⭐⭐ | 6 options |
| GEN-3A TURBO | I2V | 5-10s | ⚡⚡ | ⭐⭐⭐⭐ | 2 options |
| VEO 3.1 | I2V/T2V | 4-8s | ⚡⚡ | ⭐⭐⭐⭐⭐ | 4 options |
| VEO 3.1 FAST | I2V/T2V | 4-8s | ⚡⚡⚡ | ⭐⭐⭐⭐ | 4 options |
| VEO 3 | I2V/T2V | 8s | ⚡ | ⭐⭐⭐⭐⭐ | 4 options |
| GEN-4 ALEPH | V2V | Variable | ⚡⚡ | ⭐⭐⭐⭐ | 8 options |

**Legend:**
- I2V = Image to Video
- T2V = Text to Video
- V2V = Video to Video
- ⚡ = Speed rating
- ⭐ = Quality rating

## Usage in INFINITO

### Selecting a Model

1. **For Admins**: Navigate to the main page
2. Look for the **VIDEO MODEL:** dropdown (pink/magenta colored)
3. Select your preferred model from the list:
   - GEN-4 TURBO
   - GEN-3A TURBO
   - VEO 3.1
   - VEO 3.1 FAST
   - VEO 3
   - GEN-4 ALEPH (V2V) - Coming soon

### Generating Video

#### Image to Video (Current Method)

1. **Upload or generate an image** first
2. **Select a video model** from the dropdown
3. **Enter a prompt** describing the motion/action you want
4. **Choose duration** (if options appear):
   - GEN-4 TURBO: 2-10 seconds
   - GEN-3A TURBO: 5 or 10 seconds
   - VEO models: 4, 6, or 8 seconds
5. **Select aspect ratio**:
   - Portrait (9:16) - Best for mobile/social media
   - Landscape (16:9) - Best for YouTube/web
   - Square - Best for Instagram posts
6. **Click "Generate Video"**

#### Text to Video (VEO Models Only) ✅ NOW AVAILABLE!

VEO models (VEO 3, VEO 3.1, VEO 3.1 FAST) now support **text-to-video generation**!

**How it works:**
1. **Select a VEO model** (VEO 3, VEO 3.1, or VEO 3.1 FAST) - these show **(T2V/I2V)** in the dropdown
2. **DO NOT upload an image** - leave the image field empty
3. **Enter a detailed text prompt** describing the video you want:
   - "A cinematic shot of ocean waves crashing on a beach at sunset"
   - "A cat playing with a ball of yarn in slow motion"
   - "Time-lapse of clouds moving across a blue sky"
4. **Choose duration** (4, 6, or 8 seconds for VEO models)
5. **Select aspect ratio**
6. **Click "Generate Video"**

The system will automatically detect that you haven't provided an image and use **text-to-video mode** instead!

## Aspect Ratio Guide

### Portrait (Vertical) - Best for:
- `768:1280` or `720:1280` - Instagram Stories, TikTok, Reels
- `1080:1920` - High-quality vertical video

### Landscape (Horizontal) - Best for:
- `1280:720` or `1920:1080` - YouTube, web videos, presentations
- `1280:768` - Standard horizontal

### Square - Best for:
- `960:960` - Instagram feed posts

### Ultra-wide - Best for:
- `1584:672` - Cinematic widescreen

## Duration Guidelines

### GEN-4 TURBO (2-10 seconds)
- **2-3 seconds**: Quick motion clips, loops
- **4-5 seconds**: Standard animations
- **6-8 seconds**: Complex scenes
- **9-10 seconds**: Story-driven content

### GEN-3A TURBO (5 or 10 seconds)
- **5 seconds**: Most common choice, balanced
- **10 seconds**: Extended scenes, more detail

### VEO Models (4, 6, or 8 seconds)
- **4 seconds**: Quick actions, transitions
- **6 seconds**: Default choice, versatile ⭐
- **8 seconds**: Complex scenes, narratives

## Pricing & Credits

Video generation costs **26 credits per video** in INFINITO.

- RunwayML API cost: 10 credits
- INFINITO service fee: 16 credits
- Total user cost: 26 credits

*Note: Pricing is the same regardless of model, duration, or aspect ratio.*

## Tips for Best Results

### 1. **Choose the Right Model**
- Need speed? → GEN-4 TURBO or VEO 3.1 FAST
- Need quality? → VEO 3 or VEO 3.1
- Need flexibility? → GEN-4 TURBO (most aspect ratios)

### 2. **Image Quality Matters**
- Use high-resolution images (1024x1024 or higher)
- Ensure good lighting and clear subjects
- Avoid blurry or low-contrast images

### 3. **Prompt Engineering**
- Be specific about motion: "camera pans left", "subject walks forward"
- Describe the action, not the scene (scene is in the image)
- Use action words: "waves crashing", "leaves rustling", "person smiling"

### 4. **Duration Selection**
- Shorter durations (2-5s) = Faster generation
- Longer durations (8-10s) = More complex motion
- Match duration to content complexity

### 5. **Aspect Ratio Strategy**
- Choose based on final platform:
  - Social media → Portrait (9:16)
  - YouTube → Landscape (16:9)
  - Multi-platform → Square (1:1)

## Known Limitations

1. **GEN-4 ALEPH (V2V)** is currently disabled
   - Requires video input support
   - Will be added in future update

2. **Text-to-Video Model Restrictions**
   - ✅ VEO 3, VEO 3.1, VEO 3.1 FAST support text-to-video
   - ❌ GEN-4 TURBO and GEN-3A TURBO require an image

3. **Generation Time**
   - Videos typically take 1-5 minutes to generate
   - Longer durations may take longer
   - System polls every 5 seconds for status

4. **Aspect Ratio Constraints**
   - Each model has specific supported ratios
   - System will validate and show only valid options
   - Invalid ratios will cause API errors

## API Integration

The video generation is handled by `/api/runway` endpoint which:

1. Validates user authentication
2. Processes image input
3. Validates model-specific parameters
4. Calls RunwayML API with correct duration for each model
5. Polls for completion (up to 10 minutes)
6. Returns video URL

### Model-Specific Duration Handling

The API automatically adjusts durations to match model requirements:

```typescript
// VEO 3 always uses 8 seconds
if (model === 'veo3') {
  validDuration = 8
}

// VEO 3.1/3.1 Fast: 4, 6, or 8 (defaults to 6)
else if (model === 'veo3.1' || model === 'veo3.1_fast') {
  if (![4, 6, 8].includes(duration)) {
    validDuration = 6
  }
}

// GEN-3A TURBO: 5 or 10 (defaults to 5)
else if (model === 'gen3a_turbo') {
  validDuration = duration === 10 ? 10 : 5
}

// GEN-4 TURBO: 2-10 seconds (flexible)
else if (model === 'gen4_turbo') {
  validDuration = Math.max(2, Math.min(10, duration))
}
```

## Future Updates

### ✅ Recently Added:
- ✅ VEO 3, VEO 3.1, VEO 3.1 FAST support
- ✅ Text-to-Video for VEO models (automatic detection)
- ✅ Smart duration handling per model

### Coming Soon:
- 🔜 Video-to-Video support (GEN-4 ALEPH)
- 🔜 Batch video generation
- 🔜 Video editing tools
- 🔜 Custom aspect ratio options
- 🔜 Video upscaling
- 🔜 Video preview before generation

## Troubleshooting

### "Model requires an image input"
- Make sure you've uploaded or generated an image first
- The image should be visible before generating video

### "Video generation failed"
- Check your internet connection
- Verify you have enough credits (26 required)
- Try a different model or shorter duration
- Ensure image is valid format (PNG, JPG, WebP)

### "Unsupported aspect ratio"
- Select from the dropdown options only
- Don't manually enter custom ratios
- Each model supports different ratios

### Video takes too long
- Normal generation time is 1-5 minutes
- Longer durations take more time
- Try shorter duration or faster model (GEN-4 TURBO, VEO 3.1 FAST)

## Support

For issues or questions:
- Check the console for error messages
- Verify your credit balance
- Try a different model
- Contact support if problems persist

---

**Last Updated**: Based on RunwayML API version 2024-11-06

