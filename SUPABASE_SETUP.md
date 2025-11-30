# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Name it: `sana-tenses`
4. Set a strong database password (save it somewhere safe)
5. Choose a region close to you
6. Wait for the project to be created

## 2. Get Your API Keys

1. Go to **Project Settings > API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (the long one)

3. Copy `supabase-config.example.js` to `supabase-config.js` and fill in your values:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

## 3. Create Database Tables

Go to **SQL Editor** in your Supabase dashboard and run this SQL:

```sql
-- User progress table
CREATE TABLE user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pack_progress JSONB DEFAULT '{}'::jsonb,
  recently_completed TEXT[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own progress
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
CREATE TRIGGER user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

## 4. Set Up Google OAuth

### In Google Cloud Console:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select existing
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URI:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   (Get YOUR_PROJECT_REF from your Supabase project URL)
7. Copy the **Client ID** and **Client Secret**

### In Supabase Dashboard:

1. Go to **Authentication > Providers**
2. Find **Google** and enable it
3. Paste your **Client ID** and **Client Secret**
4. Save

### Add Authorized Domain:

1. In Supabase, go to **Authentication > URL Configuration**
2. Add your site URL to **Site URL**: `https://tamborine996.github.io/sana-tenses/`
3. Add to **Redirect URLs**: `https://tamborine996.github.io/sana-tenses/`

## 5. Test It

1. Open your app
2. Click "Sign in with Google"
3. Authorize with your Google account
4. Practice some cards
5. Refresh the page - your progress should persist!
6. Try from a different browser/device - same progress!

## Troubleshooting

**"redirect_uri_mismatch" error:**
- Make sure the redirect URI in Google Cloud Console exactly matches:
  `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

**Progress not syncing:**
- Check browser console for errors
- Verify the SQL tables were created correctly
- Check that RLS policies are in place
