# Sana Tenses

English tense learning app for Urdu speakers. Built for my wife Sana to practice translating Urdu sentences to English across all tenses.

## Live App

https://tamborine996.github.io/sana-tenses/

## Features

- **8 Tenses × 3 Levels × 30 sentences = 720 flashcards**
- Urdu → English flashcard practice
- ℹ️ button for tense explanations in Urdu
- Progress tracking with accuracy percentages
- Review mistakes at pack, category, or global level
- Recently completed packs for quick access
- Google sign-in for cloud sync across devices
- Mobile-responsive card layout

## Tech Stack

- Vanilla HTML/CSS/JS (no framework)
- Supabase for auth and progress sync
- GitHub Pages for hosting

## Supabase Project

- **Project**: sana-tenses
- **Reference ID**: rkogucekcwvldyetbqbg
- **Region**: West EU (Ireland)
- **Dashboard**: https://supabase.com/dashboard/project/rkogucekcwvldyetbqbg

### Database Schema

```sql
user_progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  pack_progress JSONB,      -- {packId: {practiced, correct, lastPracticed, wrongSentences[]}}
  recently_completed TEXT[],
  updated_at TIMESTAMPTZ
)
```

RLS enabled - users can only access their own data.

### Auth

- Google OAuth configured
- Redirect URI: `https://rkogucekcwvldyetbqbg.supabase.co/auth/v1/callback`
- Site URL: `https://tamborine996.github.io/sana-tenses/`

## Project Structure

```
sana-tenses/
├── index.html              # Main HTML
├── style.css               # All styles (mobile-responsive)
├── app.js                  # App logic with Supabase integration
├── supabase-config.js      # Supabase URL and anon key
├── data/
│   ├── tense-info.json     # Urdu explanations for each tense
│   ├── present-simple.json
│   ├── present-continuous.json
│   ├── past-simple.json
│   ├── past-continuous.json
│   ├── present-perfect.json
│   ├── present-perfect-continuous.json
│   ├── past-perfect.json
│   └── future-simple.json
└── supabase/
    └── migrations/
        └── 20241130_user_progress.sql
```

## Local Development

The app works without Supabase (uses localStorage). For cloud sync:

1. Supabase CLI: `npx supabase link --project-ref rkogucekcwvldyetbqbg`
2. Push migrations: `npx supabase db push`

## Tense Structure

| Category | Tenses |
|----------|--------|
| Present | Present Simple, Present Continuous |
| Past | Past Simple, Past Continuous |
| Perfect | Present Perfect, Present Perfect Continuous, Past Perfect |
| Future | Future Simple |

Each tense has 3 levels:
- **Beginner**: Simple, common sentences
- **Medium**: More complex structures
- **Advanced**: Conditionals, reported speech, complex narratives
