# Admin Model Preferences System

## Overview
This system allows admins to control which AI models are visible to regular users on the homepage. Admins can toggle models on/off, and these settings persist across sessions.

## Features
- ✅ Separate admin preferences table in the database
- ✅ Boolean flags for each model (14 models total)
- ✅ Admin-only UI to toggle models on/off
- ✅ API endpoints to get/update preferences
- ✅ Automatic filtering of model dropdowns based on preferences
- ✅ Admins always see all models regardless of preferences

## Database Setup

### 1. Run the SQL Migration
Execute the SQL file to create the admin preferences table:

```bash
# Connect to your Supabase database and run:
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres -f create_admin_preferences.sql
```

Or run the SQL directly in Supabase SQL Editor:
- Go to Supabase Dashboard → SQL Editor
- Copy and paste the contents of `create_admin_preferences.sql`
- Click "Run"

### 2. Verify Table Creation
The script creates:
- `admin_preferences` table with boolean fields for each model
- Row Level Security (RLS) policies (admin-only access)
- Default preferences row with all models enabled
- Automatic timestamp tracking

## Models Managed

### Text Models (7)
- `model_openai` - AiO
- `model_gpt` - GPT
- `model_llama` - Zephyr
- `model_mistral` - Maestro
- `model_custom` - Custom
- `model_rag` - RAG
- `model_web` - WEB

### Vision/Image Models (4)
- `model_blip` - BLIP ("One")
- `model_llava` - LLAVA ("Dos")
- `model_dalle_image` - DALL-E 3
- `model_runway_image` - Runway Gen-4

### Video Models (3)
- `model_gen4_turbo` - Gen-4 Turbo
- `model_gen3a_turbo` - Gen-3A Turbo
- `model_gen4_aleph` - Gen-4 Aleph

## How to Use

### For Admins

1. **Log in with an admin account**
   - Your user profile must have `role: 'admin'` in the `user_profiles` table

2. **Access Model Settings**
   - On the homepage, you'll see a "Model Settings" button below "Advanced Settings"
   - Click it to expand the model management panel

3. **Toggle Models**
   - Check/uncheck boxes to enable/disable models for regular users
   - Changes save automatically
   - Admins always see all models in their own dropdowns

### For Regular Users

- Users only see models that admins have enabled
- Model dropdowns automatically filter based on preferences
- No access to model management settings

## API Endpoints

### GET `/api/admin/preferences`
Fetch current admin preferences (admin only)

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "preferences": {
    "id": "...",
    "model_openai": true,
    "model_gpt": true,
    ...
  }
}
```

### PUT `/api/admin/preferences`
Update admin preferences (admin only)

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body:**
```json
{
  "model_openai": true,
  "model_gpt": false,
  "model_llama": true,
  ...
}
```

**Response:**
```json
{
  "success": true,
  "preferences": { ... }
}
```

## Security

- ✅ RLS policies ensure only admins can read/write preferences
- ✅ API routes verify admin role before processing requests
- ✅ Service role key used for database operations (bypasses RLS where needed)
- ✅ Regular users cannot access admin endpoints

## Technical Details

### State Management
- `adminPreferences` - Stores fetched preferences
- `showAdminModelSettings` - Controls model settings panel visibility
- Preferences loaded automatically when admin logs in

### Helper Functions
- `fetchAdminPreferences()` - Fetches preferences from API
- `updateAdminPreferences()` - Updates preferences via API
- `isModelEnabled(modelKey)` - Checks if a model should be shown
  - Returns `true` for admins (see all models)
  - Returns preference value for regular users

### Database Schema
```sql
admin_preferences (
  id UUID PRIMARY KEY,
  model_openai BOOLEAN,
  model_gpt BOOLEAN,
  ... (14 model fields total)
  updated_at TIMESTAMP,
  updated_by UUID
)
```

## Troubleshooting

### Preferences not loading
1. Check that you're logged in as an admin
2. Verify the `admin_preferences` table exists
3. Check browser console for API errors
4. Ensure RLS policies are properly set up

### Models not filtering for users
1. Verify preferences are set correctly in database
2. Check that non-admin users have `role: 'user'` (or anything except 'admin')
3. Clear browser cache and reload

### Cannot update preferences
1. Confirm you're logged in as admin
2. Check that the API route `/api/admin/preferences` is accessible
3. Verify service role key is set in environment variables

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Future Enhancements

Potential improvements:
- Multiple admin preference profiles
- Per-user model access control
- Model usage analytics
- Scheduled model availability
- Cost-based model restrictions

