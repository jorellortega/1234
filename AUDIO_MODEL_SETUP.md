# Audio Model Selector Setup

## Overview
Added a 4th model selector for Audio/Text-to-Speech models, allowing admins to select and persist their preferred audio model.

## What Was Added

### 1. Audio Model Selector
- **Location**: Below the prompt window (admin only)
- **Style**: Orange theme to differentiate from other models
- **Models Available**:
  - ElevenLabs
  - Google TTS
  - Amazon Polly
  - OpenAI TTS

### 2. Database Column
Added `selected_audio_model` column to `admin_preferences` table to store the selection.

### 3. Full Persistence
Like other models, the audio selection:
- Saves automatically when changed
- Loads automatically on login
- Persists across sessions

## Setup Instructions

### Run the SQL Migration

```bash
# In Supabase SQL Editor, run: add_audio_model_preference.sql
```

This adds the `selected_audio_model` column to your admin preferences table.

## How It Works

### All 4 Model Types Now Persist:
1. **TEXT** (cyan) - Top section: AiO, GPT, Zephyr, etc.
2. **IMAGE** (purple) - Top section: BLIP, LLAVA, DALL-E 3, Runway
3. **VIDEO** (pink) - Top section: Gen-4 Turbo, Gen-3A Turbo, Gen-4 Aleph
4. **AUDIO** (orange) - Below prompt: ElevenLabs, Google TTS, etc. ⭐ NEW

### Visual Layout:
```
┌─────────────────────────────────────┐
│  MODEL: [GPT▼]  IMAGE: [DALL-E▼]   │
│  VIDEO: [Gen-4▼]                    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  [Prompt textarea]                  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  AUDIO: [ElevenLabs▼]              │  ← NEW!
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  [Buttons: File, Mic, Process]      │
└─────────────────────────────────────┘
```

## Usage

### For Admins:
1. Select your preferred audio model from the dropdown below the prompt
2. Selection saves automatically
3. Returns to that selection when you log back in

### Adding More Audio Models:
To add more audio models, edit the Select component in `app/page.tsx`:

```tsx
<SelectItem value="your_model_name" className="text-orange-300 hover:bg-orange-500/20 focus:bg-orange-500/20 font-mono uppercase">
  YOUR MODEL NAME
</SelectItem>
```

## Database Schema

```sql
admin_preferences
├── selected_text_model   VARCHAR(50)  -- Text model selection
├── selected_image_model  VARCHAR(50)  -- Image model selection
├── selected_video_model  VARCHAR(50)  -- Video model selection
└── selected_audio_model  VARCHAR(50)  -- Audio model selection ⭐ NEW
```

## API Changes

The `/api/admin/preferences` endpoint now accepts:
```json
{
  "selected_text_model": "gpt",
  "selected_image_model": "dalle_image",
  "selected_video_model": "gen4_turbo",
  "selected_audio_model": "elevenlabs"
}
```

## Files Modified

1. `add_audio_model_preference.sql` - Database migration
2. `app/api/admin/preferences/route.ts` - API endpoint
3. `app/page.tsx` - Homepage with audio selector

## Testing

1. **Run SQL migration** (`add_audio_model_preference.sql`)
2. Log in as admin
3. Look below the prompt window - you should see "AUDIO:" selector
4. Select "ElevenLabs"
5. Refresh the page
6. ElevenLabs should still be selected ✅

## Benefits

✅ **Complete Model Coverage** - Text, Image, Video, and Audio all persist
✅ **Consistent UX** - Same behavior across all model types
✅ **Easy Access** - Audio selector right where you need it (below prompt)
✅ **Admin Only** - Regular users don't see the selector
✅ **Auto-Save** - No manual save button needed

## Future Enhancements

- Voice selection (male/female, different accents)
- Audio quality settings
- Preview audio samples
- Per-language model preferences

