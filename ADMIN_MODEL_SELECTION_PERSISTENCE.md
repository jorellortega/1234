# Admin Model Selection Persistence

## Overview
This feature allows admins to have their model selections (in the dropdowns above the prompt window) persist across sessions. When an admin selects a model and returns later, their selection is remembered.

## What It Does

When an admin selects a model from any of these dropdowns:
- **MODEL** (text models: AiO, GPT, Zephyr, Maestro, Custom, RAG, WEB)
- **IMAGE MODE** (image models: BLIP, LLAVA, DALL-E 3, Runway Gen-4)
- **VIDEO MODE** (video models: Gen-4 Turbo, Gen-3A Turbo, Gen-4 Aleph)

The selection is automatically saved and will be restored when they return.

## Database Setup

### Run the SQL Migration

```bash
# In Supabase SQL Editor, run: add_model_selection_preferences.sql
```

This adds three columns to the `admin_preferences` table:
- `selected_text_model` - Stores currently selected text model
- `selected_image_model` - Stores currently selected image model  
- `selected_video_model` - Stores currently selected video model

## How It Works

### 1. **When Admin Logs In**
- Preferences are fetched from the database
- If a saved model exists, it's automatically selected
- The homepage loads with the admin's preferred model

### 2. **When Admin Changes Model**
- The new selection is immediately saved to the database
- Happens automatically in the background
- No "Save" button needed

### 3. **Persistence**
- Selections persist across:
  - Browser refreshes
  - Logging out and back in
  - Different devices (as long as same admin account)

## Implementation Details

### Database Fields
```sql
selected_text_model VARCHAR(50) DEFAULT 'openai'
selected_image_model VARCHAR(50) DEFAULT NULL
selected_video_model VARCHAR(50) DEFAULT NULL
```

### API Changes
The `/api/admin/preferences` endpoint now accepts:
```json
{
  "selected_text_model": "gpt",
  "selected_image_model": "dalle_image",
  "selected_video_model": "gen4_turbo"
}
```

### Frontend Behavior
- `handleModelChange()` - Automatically saves selection when changed
- `fetchAdminPreferences()` - Loads and applies saved selections on login
- Only works for admin users (role-based)

## User Experience

### For Admins
1. Select your preferred model (e.g., GPT)
2. Use the system normally
3. Log out or close browser
4. When you return, GPT will still be selected ✨

### For Regular Users
- This feature doesn't affect regular users
- Their model selections are not saved (by design)
- Only admins have persistent selections

## Technical Notes

### Model Categories
The system categorizes models into three types:
- **Text Models**: openai, gpt, llama, mistral, custom, rag, web
- **Image Models**: blip, llava, dalle_image, runway_image
- **Video Models**: gen4_turbo, gen3a_turbo, gen4_aleph

### Auto-Detection
When a model is selected, the system automatically detects which category it belongs to and saves it to the appropriate field.

### Default Behavior
- On first login: defaults to "openai" (AiO)
- Image/Video modes: default to NULL (no selection)

## Benefits

✅ **Convenience** - No need to re-select your preferred model every time
✅ **Productivity** - Jump right into work with your preferred setup
✅ **Consistency** - Same experience across devices and sessions
✅ **Automatic** - Saves in background, no manual action needed

## Troubleshooting

### Selection Not Persisting
1. Verify you're logged in as admin (role: 'admin')
2. Check that the SQL migration was run successfully
3. Look for console logs: "📌 Restored saved model: {model}"
4. Verify the API endpoint `/api/admin/preferences` is accessible

### Wrong Model Loading
1. Check what's saved in the database:
   ```sql
   SELECT selected_text_model, selected_image_model, selected_video_model 
   FROM admin_preferences;
   ```
2. Clear your selection by updating the database to NULL
3. Try selecting a new model

### Not Saving on Change
1. Check browser console for errors when changing models
2. Verify admin status in console: "🔍 Checking admin status"
3. Ensure API has proper authentication headers

## Related Files

- `add_model_selection_preferences.sql` - Database migration
- `app/api/admin/preferences/route.ts` - API endpoint
- `app/page.tsx` - Homepage with model selectors
- `create_admin_preferences.sql` - Original table creation

## Future Enhancements

Potential improvements:
- Per-user preferences (not just admin)
- Remember advanced settings (temperature, top-k, etc.)
- Model selection history
- Quick switch between favorite models

