# Claude Code Instructions - Sana Tenses

## Project Overview

English tense learning app for the user's wife (Sana). Flashcard-based Urdu → English translation practice.

**Live**: https://tamborine996.github.io/sana-tenses/

## Current State (as of 2024-11-30)

### Completed
- ✅ 720 sentences across 8 tenses × 3 levels × 30 sentences each
- ✅ Professional UI with mobile-responsive card layout
- ✅ Supabase project created and configured (rkogucekcwvldyetbqbg)
- ✅ Google OAuth set up and working
- ✅ Cloud sync for progress across devices
- ✅ Review system (per-pack, per-category, global)
- ✅ Recently completed packs section

### Supabase Access

```bash
# Set token for CLI commands
export SUPABASE_ACCESS_TOKEN=sbp_ccae1d64e9edb859eb3bd191549d6aa56c086571

# List projects
npx supabase projects list

# Link to this project
npx supabase link --project-ref rkogucekcwvldyetbqbg

# Push migrations
npx supabase db push
```

**Dashboard**: https://supabase.com/dashboard/project/rkogucekcwvldyetbqbg

### Key Files

| File | Purpose |
|------|---------|
| `app.js` | Main app logic, Supabase auth, progress sync |
| `style.css` | All styles including mobile breakpoints at 700px, 400px, 350px |
| `supabase-config.js` | Supabase URL and anon key (safe to commit) |
| `data/*.json` | Sentence packs and tense explanations |
| `supabase/migrations/` | Database schema with RLS |

### Data Structure

**Pack JSON format:**
```json
{
  "tense": "present-simple",
  "packs": [
    {
      "id": "present-simple-beginner",
      "level": "beginner",
      "levelName": "Beginner",
      "description": "Simple daily routines and basic facts",
      "sentences": [
        { "urdu": "میں چائے پیتی ہوں", "english": "I drink tea." }
      ]
    }
  ]
}
```

**Progress format (in Supabase/localStorage):**
```json
{
  "packProgress": {
    "present-simple-beginner": {
      "practiced": 30,
      "correct": 25,
      "lastPracticed": "2024-11-30T...",
      "wrongSentences": [3, 7, 12]
    }
  },
  "recentlyCompleted": ["present-simple-beginner", "past-simple-medium"]
}
```

## User Preferences

- Prefers CLI over web dashboard when possible
- Has Supabase project template at `C:\Users\mqc20\Downloads\Projects\supabase-project-template`
- Related project: Reading app for daughter at `C:\Users\mqc20\Downloads\Projects\Reading app`
- Uses same Google OAuth credentials for both apps (just different redirect URIs)

## Common Tasks

### Add new sentences
Edit the relevant `data/*.json` file and push to GitHub.

### Modify database schema
```bash
npx supabase migration new description_here
# Edit supabase/migrations/XXXXX_description_here.sql
npx supabase db push
```

### Test locally
Open `index.html` directly won't work (CORS). Use:
```bash
npx serve .
```
Or test on GitHub Pages after push.

## Notes

- The anon key in `supabase-config.js` is safe to commit (it's designed to be public)
- App works offline with localStorage, syncs to cloud when signed in
- Debounced sync (2 seconds) to avoid too many API calls
