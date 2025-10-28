# Audio AI Settings Guide

## Overview

The Audio AI Settings page (`/audio-ai-settings`) allows admin users to configure universal ElevenLabs text-to-speech settings for INFINITO. These settings are applied system-wide to all audio generation requests.

## Access

**Admin Only**: This page is restricted to users with `role: admin` in the `profiles` table.

Access the page at: `/audio-ai-settings`

## Database Setup

1. Run the SQL migration to add audio preferences columns:

```bash
psql -h your-supabase-host -U postgres -d postgres -f create_audio_ai_preferences.sql
```

This adds the following columns to `admin_preferences`:
- `elevenlabs_voice_id` - Selected voice (default: Sarah)
- `elevenlabs_model_id` - Model selection (default: eleven_multilingual_v2)
- `elevenlabs_stability` - Voice stability 0.0-1.0 (default: 0.50)
- `elevenlabs_similarity_boost` - Voice matching 0.0-1.0 (default: 0.75)
- `elevenlabs_style` - Style exaggeration 0.0-1.0 (default: 0.00)
- `elevenlabs_use_speaker_boost` - Enable quality boost (default: true)
- `audio_output_format` - Output format (default: mp3_44100_128)
- `audio_optimize_streaming_latency` - Latency optimization 0-4 (default: 0)

## Features

### 1. Voice Selection

Choose from 10 popular ElevenLabs voices:
- **Sarah** - Soft, professional female voice (default)
- **Rachel** - Calm, young female voice
- **Domi** - Strong, confident female voice
- **Antoni** - Well-rounded male voice
- **Elli** - Emotional, young female voice
- **Josh** - Deep, young male voice
- **Arnold** - Crisp, middle-aged male voice
- **Adam** - Deep, middle-aged male voice
- **Sam** - Raspy, young male voice
- **Charlie** - Casual, Australian male voice

### 2. Model Selection

Choose from 3 ElevenLabs models:
- **Multilingual v2** - Best quality, supports 29 languages (recommended)
- **Monolingual v1** - English only, fast and stable
- **Turbo v2** - Fastest, lowest latency

### 3. Voice Settings

Fine-tune the voice characteristics:

**Stability** (0.0 - 1.0)
- Higher = More consistent, stable voice
- Lower = More expressive and variable
- Default: 0.50

**Similarity Boost** (0.0 - 1.0)
- How closely to match original voice characteristics
- Higher = Closer to original voice
- Default: 0.75

**Style Exaggeration** (0.0 - 1.0)
- How much to exaggerate speaking style
- 0.0 = Neutral, natural speech
- 1.0 = Maximum style exaggeration
- Default: 0.00

**Speaker Boost**
- Checkbox to enable improved audio quality and clarity
- Default: Enabled

### 4. Output Settings

**Audio Format**
- `MP3 44.1kHz 128kbps` - Standard quality, small file size (default)
- `MP3 44.1kHz 192kbps` - High quality
- `PCM 16kHz` - Raw audio, 16kHz
- `PCM 22.05kHz` - Raw audio, 22.05kHz
- `PCM 24kHz` - Raw audio, 24kHz

**Optimize Streaming Latency** (0-4)
- 0 = Default quality and latency
- 4 = Lowest latency (faster response)
- Trade-off between quality and speed

### 5. Test Voice

Generate a test audio to hear how your settings sound before saving.

Click "Generate Test Audio" to create a sample with current settings.

## API Integration

The settings are automatically applied to all text-to-speech API calls.

### Text-to-Speech API

**Endpoint**: `/api/text-to-speech` (POST)

**Priority Order**:
1. Request body parameters (if provided)
2. Admin preferences (from database)
3. Default values

**Example Request**:
```typescript
const response = await fetch('/api/text-to-speech', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: "Hello, this is INFINITO speaking!",
    // Optional overrides (uses admin prefs if not provided):
    voice_id: "EXAVITQu4vr4xnSDxMaL",
    model_id: "eleven_multilingual_v2",
    stability: 0.50,
    similarity_boost: 0.75,
    style: 0.00,
    use_speaker_boost: true,
    output_format: "mp3_44100_128",
    optimize_streaming_latency: 0
  })
})

const data = await response.json()
// data.audioUrl - URL to the generated audio file
```

### Admin Settings API

**GET** `/api/admin/audio-settings`
- Retrieves current audio settings
- Requires admin authentication

**PUT** `/api/admin/audio-settings`
- Updates audio settings
- Requires admin authentication
- Body: JSON object with settings to update

## Usage Flow

1. **Navigate** to `/audio-ai-settings` (admin only)
2. **Select** your preferred voice from the voice grid
3. **Choose** a model based on your needs (multilingual vs. speed)
4. **Adjust** voice settings sliders to fine-tune characteristics
5. **Configure** output format and latency optimization
6. **Test** your settings with "Generate Test Audio"
7. **Listen** to the test audio and adjust if needed
8. **Save** settings with the "Save Settings" button
9. **Done!** All future audio generations will use these settings

## Best Practices

### For Natural Conversation
- Model: Multilingual v2
- Stability: 0.40-0.60
- Similarity: 0.70-0.80
- Style: 0.00-0.10
- Speaker Boost: Enabled

### For Consistent Professional Voice
- Model: Monolingual v1 or Multilingual v2
- Stability: 0.70-0.90
- Similarity: 0.80-0.90
- Style: 0.00
- Speaker Boost: Enabled

### For Expressive Storytelling
- Model: Multilingual v2
- Stability: 0.30-0.50
- Similarity: 0.60-0.70
- Style: 0.40-0.70
- Speaker Boost: Enabled

### For Low Latency (Real-time)
- Model: Turbo v2
- Optimize Latency: 3-4
- Format: mp3_44100_128

## Troubleshooting

### Settings Not Saving
- Verify you're logged in as admin (`role: admin` in profiles table)
- Check browser console for errors
- Verify database migration was run successfully

### Audio Not Using Settings
- Clear browser cache
- Verify settings are saved in database
- Check that `admin_preferences` table has `id: 00000000-0000-0000-0000-000000000001`

### Test Audio Fails
- Verify ElevenLabs API key is configured in AI Settings
- Check API key has sufficient credits
- Verify network connectivity

### Poor Audio Quality
- Increase output format to 192kbps MP3
- Lower "Optimize Latency" setting
- Enable Speaker Boost
- Adjust Stability higher (0.60-0.80)

## Notes

- Settings are stored in the `admin_preferences` table
- All audio files are uploaded to Supabase Storage (`generations` bucket)
- The system falls back to base64 encoding if storage upload fails
- Voice IDs are ElevenLabs voice identifiers
- Admin preferences override default values but can be overridden by API request params

## Future Enhancements

Potential features for future updates:
- User-specific voice preferences
- Custom voice cloning
- Voice library management
- Audio effect presets
- Multi-voice conversations
- Voice analytics and usage tracking

