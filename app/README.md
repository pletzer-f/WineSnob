# WineSnob

A mobile-first PWA for managing a personal wine cellar — cataloguing bottles,
tracking value and drink windows, logging pours, and keeping a wishlist. Built
on the `winesnob-design-system` component library (one level up, in `../src`).

## Stack

- **Frontend** — Vite + React + TypeScript, installable PWA (`vite-plugin-pwa`).
- **State** — Zustand store (`src/store`) mirroring the design prototype, with
  debounced persistence.
- **Backend** — Supabase (Postgres + row-level security, Auth, Storage).
- **AI** — Supabase Edge Functions call the Claude API (`claude-opus-4-8`) for
  label OCR and import parsing. The Anthropic key lives only as a function
  secret, never in the browser.

The app consumes the design system directly from source via a Vite alias
(`winesnob-design-system` → `../src/index.ts`), so the library and app stay in
lockstep with design-sync. No build step for the library is required.

## Local development

```bash
cd app
npm install
cp .env.example .env.local   # fill in from Supabase → Project Settings → API
npm run dev
```

Without `.env.local`, the app runs in **demo mode** (sample cellar, local
persistence) so every screen is explorable offline. With Supabase configured,
it uses real accounts and per-user cloud data.

- `npm run dev` — dev server
- `npm run build` — typecheck + production build
- `npm run preview` — preview the production build

## Environment

| Var | Where |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API (anon / publishable key) |

The Anthropic key is **not** a client env var — see below.

## Backend (Supabase)

- Project ref: `vryrpaqawxkvluefxinu` (region eu-central-1).
- Schema + RLS + storage: `../supabase/migrations`.
- Edge Functions: `../supabase/functions/{read-label,parse-import}`.

**Set the Anthropic key** (required for the AI capture/import features) as an
Edge Function secret — Supabase Dashboard → Edge Functions → Secrets, or:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref vryrpaqawxkvluefxinu
```

## Deploy (Vercel)

Import the repo into the `wine-snob` Vercel project with:

- **Root Directory:** `app`
- **Framework:** Vite (auto-detected)
- **Environment variables:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

`vercel.json` handles the SPA fallback. The design system at `../src` is part of
the same repo, so the alias resolves during the Vercel build.
