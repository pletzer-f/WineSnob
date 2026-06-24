# design-sync notes — winesnob-design-system

Repo-specific gotchas for future syncs.

- **Config migration (2026-06-21):** the original config carried a `previewArgs` key that the current converter rejects (strict top-level schema). Removed it. The current preview mechanism is authored `.design-sync/previews/<Name>.tsx` files. The old per-component prop values are preserved below as composition data for authoring.
- **Build:** `npm run build` (tsup) → `dist/index.js` + `dist/index.d.ts`. The package's own `node_modules` has react/react-dom (devDeps), so `--node-modules ./node_modules` works.
- **Single group:** all components are in the `general` group (no docs/categories in the repo).
- **Component count (2026-06-23):** grew from 10 → 17. Added CaptureBar, DrinkWindow, ImportCard, Rating, ReviewRow, SearchField, TabBar — all exported from `src/index.ts`, all with authored previews in `.design-sync/previews/`, all graded `good`.
- **Component count (2026-06-24):** grew from 17 → 39. Added 22: AppShell, Avatar, BarChart, BottleDetail, FilterChips, FormSection, IconButton, Modal, NumberStepper, ProcessingState, SectionHeader, SegmentedControl, SettingsRow, SideNav, SignIn, Skeleton, Sparkline, Spinner, Switch, TextArea, Toast, Uploader. All have authored previews, all cells graded `good`, render check clean (0 bad, 0 floor cards). Re-sync was a single clean driver run: 17 carried forward via the anchor, 22 added. Bundle CSS (`styleSha`) changed because the new components added `ws-*` classes to `_ds_bundle.css`. Empty `tokens/` and `guidelines/` dirs are emitted by the converter but carry no files (no separate tokens pkg, no guideline `.md`s) — harmless.
- **TabBar preview:** `.ws-tab__dot` (the active-tab indicator) is `position:absolute; top:0` on the tab — correct for a bottom-nav bar, but in an isolated `overflow:hidden` card it sits flush to the top edge and reads as clipped. The preview wrapper carries `paddingTop: var(--ws-space-4)` to give it room; keep that if regrading.

## Composition data (from the prior run's previewArgs)
- **Logo**: `variant: "stacked"`
- **Button**: `variant: "primary"`, children "Add a bottle"
- **TextField**: label "Wine name", placeholder "e.g. Château Margaux"
- **Select**: label "Region", placeholder "Choose a region", options Bordeaux/Burgundy/Piedmont
- **Tag**: `tone: "ready"`, `dot: true`, children "Ready to drink"
- **BottleCard**: Château Margaux · Premier Grand Cru Classé · 2015 · Margaux, Bordeaux · qty 6 · status ready · €4,200
- **CellarRow**: Brunello di Montalcino · Biondi-Santi · 2016 · Tuscany · qty 2 · status ready
- **StatCard**: label "Cellar value", value "€42,300", hint "248 bottles · 12 regions"
- **EmptyState**: title "Nothing to declare. Yet.", message "Your cellar is waiting. Add your first bottle and we'll keep its counsel."
- **AppHeader**: (no props)

## Known render warns
- `[FONT_REMOTE]` "Spectral", "Figtree" — expected. The brand fonts load via a remote Google Fonts `@import` in `src/styles/winesnob.css`; they are NOT shipped in the bundle. Render check confirmed they load in headless Chromium (Spectral serif visible in BottleCard names/StatCard numerals, Figtree in labels). Not an action item.

## Render check
- Playwright `playwright-core` 1.61.0 in `.ds-sync`; Chromium build `chromium-1228` at `~/Library/Caches/ms-playwright/` (macOS path, NOT `~/.cache/ms-playwright`). Render check finds it automatically — no reinstall needed.

## Re-sync risks
- **Brand fonts depend on the network.** Spectral + Figtree come from a remote `@import` (Google Fonts). Any design built with the DS renders in fallback fonts if that host is unreachable. There is no shipped `@font-face`. If you ever want fonts to ship, add them via `cfg.extraFonts`; for now this is intentional (host app serves them).
- **All 17 previews are authored and owned** in `.design-sync/previews/`. They reference the real exported API; a breaking prop rename upstream would need the matching preview updated. Grades carry forward via the uploaded `_ds_sync.json` — a source change to a `.tsx` or the component re-grades just that one.
- **Single `general` group.** The repo has no docs/categories, so every component lands in `general`. If categories are added later (frontmatter `category` in a doc, or `cfg.docsMap` stubs), regrouping will move card paths — the driver's `deletePaths` handles the old paths.
- **Build is deterministic** (tsup → `dist/`). An unnecessary rebuild is a no-op; when in doubt, rebuild.
