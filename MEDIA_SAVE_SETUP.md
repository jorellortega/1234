# Media Save Feature Setup Guide

## ✅ What's Implemented

### 1. Save Button
- **Green "Save" button** appears on all generated images and videos
- Located in the AI response area next to Download and Convert buttons
- Shows real-time status: `Save` → `Saving...` → `Saved!`
- Auto-resets after 3 seconds

### 2. Permanent Storage
- Downloads media from temporary URLs (CloudFront/OpenAI)
- Uploads to **Supabase Storage** bucket (`media-files`)
- Saves permanent URLs to database
- Media persists forever (no expiration)

### 3. Library Integration
- Saved media appears in **Library** page (`/library`)
- Stored in `generations` table with:
  - User ID (automatic)
  - Prompt text
  - Permanent storage URL in `output` field
  - Model name
  - Timestamp

## 🔧 Required Setup

### Step 1: Create Supabase Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"Create a new bucket"**
3. Use these settings:
   - **Bucket name**: `media-files`
   - **Public bucket**: ✅ **YES** (must be public for URLs to work)
   - **File size limit**: `100 MB` (or higher if you want)
   - **Allowed MIME types**: 
     - `image/png`
     - `image/jpeg`
     - `video/mp4`

4. Click **"Create bucket"**

### Step 2: Set Bucket Policies (Important!)

After creating the bucket, you need to set up policies so:
- Authenticated users can **upload** files
- Everyone can **view** files (public access)

Run this SQL in Supabase SQL Editor:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload own media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view all files
CREATE POLICY "Public can view media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media-files');

-- Allow users to update their own files
CREATE POLICY "Users can update own media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 3: Test the Feature

1. **Generate an image or video**
   - Use DALL-E, RunwayML image, or RunwayML video
2. **Click the green "Save" button**
   - Should show "Saving..." with spinner
   - Then show "Saved!" with checkmark
3. **Go to Library** (`/library`)
   - Your saved media should appear
   - Click on it to see the full view
   - Media should load from permanent storage URL

## 📊 Database Schema

The `generations` table already has these columns:
- `id` (UUID)
- `user_id` (UUID) - Links to authenticated user
- `prompt` (TEXT) - The prompt used to generate
- `output` (TEXT) - Contains `[IMAGE_DISPLAY:url]` or `[VIDEO_DISPLAY:url]`
- `model` (TEXT) - e.g., "dalle_image", "runway_image", "gen4_turbo"
- `created_at` (TIMESTAMP)
- `tags`, `notes` (optional metadata)

## 🎬 How It Works

### Flow:
1. User generates image/video
2. Temporary URL is displayed (expires in ~1 hour)
3. User clicks **"Save"** button
4. API downloads media from temporary URL
5. Uploads to Supabase Storage (`media-files/{user_id}/{timestamp}-{type}.{ext}`)
6. Gets permanent public URL
7. Saves to `generations` table with permanent URL
8. Media now accessible forever from Library

### File Structure in Storage:
```
media-files/
  └── {user_id}/
      ├── 1234567890-image.png
      ├── 1234567891-image.png
      ├── 1234567892-video.mp4
      └── ...
```

## 💰 Credit Cost (Unchanged)

Saving media does NOT cost additional credits:
- **DALL-E 3**: 13 credits (generation only)
- **RunwayML Image**: 16 credits (generation only)
- **RunwayML Video**: 26 credits (generation only)
- **Saving to library**: FREE!

## 🚨 Troubleshooting

### "Storage not configured" error
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Restart Next.js dev server after adding env vars

### "Upload failed" error
- Check bucket exists and is named `media-files`
- Verify bucket is set to **public**
- Check storage policies are set correctly

### "Failed to save generation" error
- Verify user is authenticated
- Check `generations` table has `user_id` column
- Check RLS policies allow inserts for authenticated users

### Media not showing in Library
- Check the `output` field contains the storage URL
- Verify the storage URL is publicly accessible
- Check browser console for CORS errors

## 🎉 Features

✅ Manual save (user control)
✅ Permanent storage (never expires)
✅ Public URLs (easy sharing)
✅ User-scoped folders (organized)
✅ Library integration (view all saved media)
✅ Real-time status feedback (UX)
✅ Error handling (user-friendly)
✅ Free to save (no extra credits)

## 📝 Notes

- Temporary URLs expire in ~1 hour (CloudFront/OpenAI)
- Always save important media before it expires
- Storage bucket usage counts toward Supabase plan limits
- You can delete old media from Storage dashboard
- Deleted storage files won't break library (URL just 404s)

