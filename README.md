# WineSnob

A quiet-luxury wine-cellar app. This repo is a monorepo:

- **`src/`** — the `winesnob-design-system` React component library (synced from Claude Design via design-sync).
- **`app/`** — the WineSnob app (Vite + React + TS PWA) that consumes the design system from source. See [`app/README.md`](app/README.md) for setup, env, and deploy.
- **`supabase/`** — database migrations (schema + row-level security + storage) and Edge Functions (`read-label`, `parse-import`) that call the Claude API for label OCR and import parsing.

## Quick start

```bash
cd app
npm install
npm run dev        # demo mode without env; real accounts once VITE_SUPABASE_* is set
```

## Deploy

The `app/` directory deploys to Vercel (Root Directory = `app`) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The Anthropic key is a Supabase Edge Function secret (`ANTHROPIC_API_KEY`), never a client variable. Full details in [`app/README.md`](app/README.md).
