# WineSnob design system — building with it

Quiet-luxury components for a home wine cellar app: alabaster surfaces, hairline
borders, ink text, with **bordeaux** and **racing green** as rationed accents
(keep accents under ~10% of any surface). Display type is Spectral (serif),
interface type is Figtree (sans).

## Setup — no provider, just the stylesheet

There is **no React provider or theme wrapper**. Components render fully styled
as soon as the design system's `styles.css` is loaded (it `@import`s
`_ds_bundle.css`, which carries the design tokens, the component styles, and a
remote `@import` for the Spectral + Figtree webfonts). If a component renders in
a browser-default font or with no color, the stylesheet isn't loaded — that is
the only setup failure mode.

```jsx
import { AppHeader, BottleCard, Button } from 'winesnob-design-system';

<BottleCard
  name="Château Margaux"
  producer="Premier Grand Cru Classé"
  vintage={2015}
  region="Margaux, Bordeaux"
  quantity={6}
  status="ready"
  value="€4,200"
/>
```

## Styling idiom — props for components, CSS variables for your own layout

- **Do not style the components with className/utility classes.** Each component
  is self-styled via internal `ws-*` classes and exposes its design surface
  through **props** (`variant`, `size`, `tone`, `status`, `dot`, `label`,
  `hint`, `error`, …). Use those props — don't reach into the markup.
- **For your own layout glue** (page wrappers, grids, spacing between components),
  style with the system's CSS custom properties so it stays on-brand. There is
  no utility-class layer — write plain CSS / inline styles that reference the
  tokens:

  | Family | Real token names |
  |---|---|
  | Surfaces | `--ws-bg`, `--ws-surface`, `--ws-alabaster`, `--ws-cream`, `--ws-stone` |
  | Text | `--ws-ink` / `--ws-text`, `--ws-muted` / `--ws-text-muted` |
  | Lines | `--ws-border`, `--ws-border-strong`, `--ws-line`, `--ws-taupe` |
  | Accents | `--ws-bordeaux` (`--ws-accent`), `--ws-bordeaux-deep`, `--ws-green` (`--ws-ready`), `--ws-green-soft` |
  | Type | `--ws-font-display` (Spectral), `--ws-font-ui` (Figtree) |
  | Spacing | `--ws-space-1` (4px) … `--ws-space-7` (48px) |
  | Radius | `--ws-radius-sm` / `--ws-radius-md` / `--ws-radius-lg` |
  | Elevation | `--ws-shadow` |

  Example glue: `style={{ display: 'grid', gap: 'var(--ws-space-5)', background: 'var(--ws-bg)' }}`.

- **Accent discipline:** `Button variant="primary"` is the single bordeaux
  call-to-action per view; `Tag tone="ready"` is racing green for in-window
  bottles. Don't multiply accents — the brand reads as quiet because they're rare.

## Where the truth lives

- The design system's `styles.css` and the `_ds_bundle.css` it imports — every
  token and component class is defined there; read it before inventing a value.
- Per-component `<Name>.prompt.md` (usage + examples) and `<Name>.d.ts` (the prop
  contract the agent codes against).

## One idiomatic composition

```jsx
import { StatCard, BottleCard } from 'winesnob-design-system';

<div style={{ background: 'var(--ws-bg)', padding: 'var(--ws-space-6)' }}>
  <div style={{ display: 'flex', gap: 'var(--ws-space-4)', marginBottom: 'var(--ws-space-6)' }}>
    <StatCard label="Cellar value" value="€42,300" hint="248 bottles · 12 regions" />
    <StatCard label="Ready to drink" value={64} hint="In their window now" />
  </div>
  <BottleCard name="Barolo Monfortino Riserva" producer="Giacomo Conterno"
    vintage={2017} region="Piedmont" quantity={3} status="cellaring" value="€1,150" />
</div>
```
