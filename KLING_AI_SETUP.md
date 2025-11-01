# Kling AI Video Generation Setup

## Overview
INFINITO now supports **Kling AI** video generation - a high-quality AI model that can generate videos from text prompts or images, supporting cinematic outputs with smooth camera movements and realistic dynamics.

## Quick Start

### ⚠️ Need to add credentials? 
**See [ENV_SETUP_TEMPLATE.md](./ENV_SETUP_TEMPLATE.md) for the complete template!**

### 1. Add your API credentials

Add the following to your `.env.local` file:

```env
# Kling AI Video Generation API Credentials
KLING_ACCESS_KEY=your_access_key_here
KLING_SECRET_KEY=your_secret_key_here
```

**Example:**
```env
# Kling AI Video Generation API Credentials
KLING_ACCESS_KEY=ak_xxxxxxxxxxxxxxxxxxxxxxxxx
KLING_SECRET_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important Notes:**
- Replace `your_access_key_here` and `your_secret_key_here` with your actual Kling AI credentials
- The access key typically starts with `ak_`
- The secret key typically starts with `sk_`
- These credentials are obtained from the Kling AI platform
- Keep these credentials secure and never commit them to version control

### 2. API Authentication

Kling AI uses JWT (JSON Web Token) authentication with the following specifications:

- **Algorithm**: HS256
- **Token Format**: `Bearer {JWT_TOKEN}`
- **Token Lifetime**: 30 minutes
- **Header**: `Authorization: Bearer XXX`

The authentication token is automatically generated using your `KLING_ACCESS_KEY` and `KLING_SECRET_KEY` credentials.

### 3. Available Features

#### **Text-to-Video (T2V)**
- Generate videos directly from text prompts
- No image required
- Supports various durations and aspect ratios
- **Endpoint**: `/v1/videos/text2video`
- **Mode**: Pro mode (highest quality)

#### **Image-to-Video (I2V)**
- Transform static images into dynamic videos
- Upload a starting image for reference
- Combine with text prompts for motion control
- **Endpoint**: `/v1/videos/image2video`
- **Mode**: Pro mode (highest quality)
- **Auto-detection**: System automatically uses I2V endpoint when image is uploaded

#### **Advanced Features** (Currently Supported)
- ✅ **Start/End Frame Control**: Define both start and end frames for precise animation control
- ✅ **Text-to-Video**: Pure text prompts
- ✅ **Image-to-Video**: With starting image
- ✅ **Pro Mode**: Highest quality output

#### **Coming Soon**
Kling AI API supports many more advanced features that will be added in future updates:
- **Lip-Sync**: Synchronize lip movements with audio
- **Avatar**: Character-based video generation
- **Multi-Image to Video**: Multiple reference images
- **Video Extension**: Extend existing videos
- **Motion Masks**: 
  - Static masks for fixed motion areas
  - Dynamic masks with motion trajectories (up to 6 groups)
- **Camera Control**: Pre-defined and custom camera movements
- **Model Selection**: Multiple Kling model versions (v1, v1.5, v1.6, v2-master, v2-1-master, v2-5-turbo)

### 4. How to Use

#### On Video Mode Page (`/video-mode`)
1. **Select Kling AI**: Choose "KLING (T2V/I2V)" from the Video Generation Model dropdown
2. **Enter Prompt**: Describe the video you want to generate
3. **Upload Image (Optional)**: For image-to-video, upload a starting image
4. **Configure Settings**:
   - **Duration**: Choose 5 or 10 seconds
   - **Aspect Ratio**: Select your preferred format (16:9, 9:16, etc.)
5. **Generate**: Click "GENERATE VIDEO" and wait for processing

#### On Homepage
1. **Select Kling AI**: Choose "KLING (T2V/I2V)" from the Video Model dropdown
2. **Follow the same steps** as Video Mode page

### 5. Cost Structure

**INFINITO Pricing:**
- **Current Price**: 50 INFINITO credits per video generation
- **Your platform fee**: Covers API costs, infrastructure, and development

**Kling AI API Costs** (Reference: [Kling AI Pricing](https://klingai.com/global/dev/pricing)):
- **Pro mode, 5s video**: 2.5 units (~$0.35)
- **Pro mode, 10s video**: 5 units (~$0.70)
- **Standard mode**: Lower cost (varies)

**To get API credits**, purchase from:
- Trial: $9.79 for 100 units (5s videos)
- Package 1: $4,200 for 30,000 units
- See [KLING_AI_CREDITS_GUIDE.md](./KLING_AI_CREDITS_GUIDE.md) for all options

### 6. Supported Parameters

#### Duration
- **5 seconds**: Standard duration
- **10 seconds**: Extended duration

#### Aspect Ratios
Supports standard video aspect ratios (to be confirmed based on actual API capabilities):
- **16:9**: Landscape widescreen
- **9:16**: Portrait/mobile format
- Additional formats may be available

### 7. API Endpoint

**Official Kling AI API Endpoint:**
```
https://api-singapore.klingai.com/v1/videos/text2video
```

**How It Works:**
Kling AI uses an **asynchronous task-based** API:

1. **Create Task** (POST): Submit your video generation request and receive a `task_id`
2. **Poll Status** (GET): Check task status every 5 seconds until completion
3. **Retrieve Result**: Get the video URL when task status is "succeed"

**Request Process:**
- Your request is sent to `/v1/videos/text2video` with prompt, duration, aspect ratio
- The server responds with a `task_id` and initial status
- The system automatically polls `/v1/videos/text2video/{task_id}` every 5 seconds
- After 1-5 minutes, when the video is ready, the URL is returned

**Supported Parameters:**
- `prompt`: Text description (required)
- `duration`: "5" or "10" seconds
- `aspect_ratio`: "16:9", "9:16", or "1:1"
- `image`: Base64 encoded image for Image-to-Video (optional)

### 8. Credit System

Credits are deducted upfront before video generation begins. If generation fails, credits are automatically refunded to your account.

### 9. ⚠️ Two Credit Systems

Kling AI has **TWO separate credit systems**:

#### 1. Website Credits (Kling AI App)
- Used for the web interface at klingai.com
- Showed in your screenshot (513 credits)
- **Not used for API calls**

#### 2. API Credits (Developer Console)
- Used for API requests
- Must be purchased separately
- Available at: https://klingai.com/global/dev/model/video

**Important**: API and website credits are **separate**. You need to purchase API credits even if you have website credits!

### 10. Error Handling

- **Insufficient Credits**: You'll be notified before attempting generation
- **API Errors**: Credits are automatically refunded
- **Network Issues**: Your balance is restored if generation cannot complete
- **Admin Mode**: Detailed error messages for troubleshooting
- **"Account balance not enough"**: Your Kling AI **API credits** are insufficient (different from website credits!)

### 11. Authentication Details

The JWT token is generated with the following payload:

```javascript
{
  iss: accessKey,          // Your access key
  exp: now + 1800,         // Expires in 30 minutes
  nbf: now - 5             // Starts 5 seconds ago
}
```

The token is signed with your secret key using HS256 algorithm.

## Technical Implementation

### Frontend Routing
- `/video-mode`: Dedicated video generation page with Kling AI support
- Homepage: Main page with video model selector including Kling AI

### Backend API
- `/api/kling`: Dedicated API route for Kling AI video generation
- Automatic JWT token generation
- Credit management and refund system
- Comprehensive error handling

### Model Differences

| Feature | Kling AI | RunwayML Models |
|---------|----------|-----------------|
| T2V Support | ✅ Yes | ✅ (Some models) |
| I2V Support | ✅ Yes | ✅ Yes |
| Authentication | JWT | API Key |
| API Endpoint | Singapore | Global |
| Token Lifetime | 30 minutes | N/A |

## Troubleshooting

### "KLING_ACCESS_KEY and KLING_SECRET_KEY environment variables are not set"
- **Solution**: Add your credentials to `.env.local` and restart the development server

### "Kling AI API error: 401"
- **Cause**: Invalid or expired credentials
- **Solution**: Verify your access key and secret key are correct

### "Kling AI API error: 400"
- **Cause**: Invalid request parameters
- **Solution**: Check prompt length and image format (if using I2V)

### "Kling AI API error: 429 - Account balance not enough"
- **Cause**: Your Kling AI **API credits** are insufficient (NOT your website credits!)
- **Important**: Kling AI has TWO separate credit systems:
  - Website credits (for klingai.com app) - shown in your account
  - **API credits** (for API calls) - must be purchased separately
- **Solution**: 
  1. Visit https://klingai.com/global/dev/model/video
  2. Purchase a **Video Generation API Resource Package**
  3. Your INFINITO credits have been refunded, so you can try again
- **Note**: Even if you have 513 website credits, you still need API credits!

### Credits Not Refunded
- **Solution**: Contact support with your transaction ID and timestamp

## Future Enhancements

- Support for additional aspect ratios
- Custom duration options
- Advanced camera controls
- Batch generation
- Watermark management

## Additional Resources

- **📖 Credits Guide**: See [KLING_AI_CREDITS_GUIDE.md](./KLING_AI_CREDITS_GUIDE.md) for details on the two credit systems
- Kling AI API Documentation: https://klingai.com/global/dev/model/video
- JWT Specification: https://datatracker.ietf.org/doc/html/rfc7519
- INFINITO Support: Contact through your admin panel

## Notes

- The Kling AI integration follows the same credit system as RunwayML
- Admin users see detailed cost information and error messages
- Regular users receive simplified, user-friendly error messages
- All API calls are logged for debugging and monitoring

