# Design System — Token-Driven Neutral Base

This document describes the **neutral base theme** of the **Directory Template** and the
contract each niche app follows to re-theme it. It is implemented with **Nuxt UI v4** and
**Tailwind CSS v4** (CSS-variable theming in `app/assets/css/main.css` + `app/app.config.ts`).

> **Design-neutral by contract — but one block away from a brand.** The template carries
> no brand identity of its own. Every visual token lives in `directory.config.ts` →
> `design`; a niche app (padel clubs, spas, coworking spaces…) injects its identity by
> editing that block — component code never changes.

## 1. Archetype

*   **Concept:** Swiss Editorial precision applied to a directory product.
*   **Visual key:** High-key surfaces (white backgrounds), stark contrast, technical typography.
*   **Atmosphere:** Clean, direct, professional. Content and data lead; chrome stays quiet.

## 2. The Design Kit (`directory.config.ts` → `design`)

ONE block owns the whole visual identity. Everything downstream — Nuxt UI semantic
colors, the radius system, the font faces, the display text-transform — derives from it:

```ts
design: {
  accent: "slate",       // Nuxt UI primary: a Tailwind built-in palette (emerald,
                         // rose, sky, indigo…) or a custom @theme static palette
                         // defined in main.css (e.g. "brand" — recipe in §3).
  accentSecondary: undefined, // optional secondary accent; folds into the accent.
  neutral: "slate",      // slate | zinc | stone | gray | neutral — text/borders/
                         // backgrounds scale. Cool (slate/zinc) vs warm (stone).
  radius: "sharp",       // 'sharp' 2px (architectural) | 'soft' 8px (friendly)
                         // | 'round' 12px (consumer). ONE scale site-wide.
  fonts: {               // any Google Fonts — @nuxt/fonts resolves them at build
    display: "Manrope",  // (weights 400/500/700; the 700 face is preloaded for
    body: "Manrope",     // LCP). Distinct display+body pairing = instant identity.
  },
  displayTransform: "uppercase", // uppercase | none | capitalize — headings,
                                 // font-display utility, buttons, badges.
}
```

**Wiring** (read-only plumbing — instantiations never touch it):
`nuxt.config.ts` builds `fonts.families` from `design.fonts` and injects the tokens as
`:root` CSS variables (`--design-font-*`, `--ui-radius`, `--design-display-transform`);
`app/app.config.ts` maps the accents onto Nuxt UI's `ui.colors`. The contract test
(`pnpm test:unit`) validates the block (known palettes or a custom palette present in
main.css, radius/transform enums, non-empty font names).

**Design-taste rules baked into the base** (so an instantiation starts from taste, not slop):

*   **One accent carries the site.** `accentSecondary` exists for a complementary
    highlight; leaving it unset keeps the monochrome discipline. No second accent may
    appear ad hoc in components — use semantic colors (`success`, `warning`, `error`,
    `info`) for functional states only.
*   **No raw palette colors in components** — semantic utilities only (`text-default`,
    `bg-elevated`, `border-muted`, …).
*   **WCAG AA floor** — `text-dimmed`/`text-muted` are bumped one neutral step darker
    than Nuxt UI defaults (see `main.css`); custom palettes keep 500/600 ≥ 4.5:1 on white.
*   **Buttons press** — `active:translate-y-px` is part of the button base slot: tactile
    feedback on every CTA.
*   **Radius lock** — every corner uses the ONE `radius` token (`--ui-radius`, and
    Tailwind's `rounded-sm` maps onto it). Never mix scales.

## 3. Re-theming Contract (per niche app)

A niche app brands the template by editing `design` ONLY. Two accent strategies:

### Strategy A — Built-in palette (zero CSS)

Set `design.accent` to any built-in Tailwind palette (`emerald`, `rose`, `indigo`, `sky`…).
Done. Nuxt UI regenerates `--ui-primary*` from that scale.

### Strategy B — Custom palette (full brand control)

Define a custom scale in `app/assets/css/main.css` and point `design.accent` at its name:

```css
/* app/assets/css/main.css */
@theme static {
  --color-brand-50: #f0f9ff;
  --color-brand-500: #0284c7; /* consumed as --ui-primary (light mode) */
  --color-brand-600: #0369a1; /* consumed as --ui-primary (dark mode)  */
  --color-brand-950: #082f49;
}
```

```ts
// directory.config.ts
design: { accent: "brand", /* … */ }
```

**Rules for custom palettes:**

*   The `static` modifier on `@theme` is **required** — these variables are consumed by
    Nuxt UI's runtime inline styles (`--ui-color-primary-*` references), not by Tailwind
    utilities; without it, Tailwind v4 tree-shakes them out of the compiled CSS.
*   Keep the **500/600** shades at **≥4.5:1 contrast on white** (WCAG AA): they back
    `text-primary` and white-on-solid buttons.
*   Ship the full 50–950 ramp; Nuxt UI picks the shades per context (soft/solid/outline variants).
*   The contract test rejects an accent that is neither built-in nor declared in main.css.

**Roles in the shipped neutral config** (`accent`/`neutral` = `slate`):

*   **Primary (`slate`):** actions, CTAs, active states, hover borders. Light mode accent is
    `#475569` (slate-600 family, ≥4.5:1 on white).
*   **Secondary:** folds into the accent.
*   **Neutral (`slate`):** surfaces, borders, text. Dimmed/muted steps bumped for WCAG AA —
    see `main.css` "WCAG AA Color Contrast Overrides".
*   **Semantic colors** (`success`, `warning`, `error`, `info`) keep their Nuxt UI defaults —
    functional, not brand.

**Usage in Components:**
*   Primary actions: `bg-primary`, `text-primary`, `border-primary`
*   Text: `text-default`, `text-muted`, `text-toned`
*   Backgrounds: `bg-default`, `bg-muted`, `bg-elevated`
*   Borders: `border-default`, `border-muted`, `border-accented`

## 4. Typography System

Font faces come from `design.fonts` (any Google Font — @nuxt/fonts resolves, self-hosts
and preloads the 700 display face at build). The shipped neutral config uses ONE family:
**Manrope** (Regular 400 / Medium 500 body, Bold 700 headings).

*   **Body:** `--font-sans` ← `design.fonts.body` — descriptions, addresses, schedules.
*   **Headings:** `--font-display` ← `design.fonts.display`, Bold (700), tight tracking —
    page titles, section headers, and every `font-display` utility (buttons, badges pick
    it up through the Nuxt UI slots).
*   **Text-transform token:** `design.displayTransform` — the shipped `uppercase` is the
    architectural voice; `"none"` gives an editorial register. One variable re-voices
    every heading, button and badge (heading sizes h1 `text-4xl` → h6 `text-base` stay).

```css
@theme {
  /* values injected from directoryConfig.design on :root:root (nuxt.config) */
  --font-sans: var(--design-font-body, "Manrope"), sans-serif;
  --font-display: var(--design-font-display, "Manrope"), sans-serif;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: var(--design-display-transform, uppercase);
}
```

## 5. UI Component Definition

Components deviate from the default "soft SaaS" look toward a sharper, editorial aesthetic.

### Shape & Physics — TOKEN-DRIVEN

*   **Corner radius:** ONE scale from `design.radius` → `--ui-radius`
    (`sharp` 2px shipped | `soft` 8px | `round` 12px); Tailwind's `rounded-sm` maps onto
    the same token, so hardcoded utilities follow the switch. Never mix scales
    (`rounded-lg` / `rounded-xl` / `rounded-full` stay out).
*   **Depth:** **Flat with borders.** Use `border border-default` / `border-muted` instead of
    drop shadows. Never `shadow-*`.
*   **Hover:** `border-primary` (active target), transition `150ms`; buttons depress
    `active:translate-y-px`.

### Key Components

**Buttons:**
*   Nuxt UI buttons at the site radius; solid rectangles, no gradients; display-face
    labels with the `displayTransform` token.
*   Primary actions: `bg-primary text-white`; secondary: `bg-secondary text-white`.

**Cards (venue/blog):**
*   `bg-default` background, `border border-default`, site radius.
*   Structure: image top, content bottom.
*   Example: `<UCard class="bg-default border border-default rounded-sm">`

**Inputs:**
*   Site radius, clear focus ring (`focus:ring-primary`),
    `border-default` → `border-primary` on focus.

**Text colors:** `text-default` (primary), `text-muted` (secondary), `text-dimmed`,
`text-highlighted`.

**Backgrounds:** `bg-default` (main), `bg-muted` (cards/sections), `bg-elevated`.

## 7. Sample Assets

Images under `public/img/` are **replaceable placeholders** (`hero-showcase.png`,
`hero-bubble.png`, `venue-fallback.png`, `og-default.jpg` …). A niche app swaps them for its
own imagery; component code references the neutral file names. `og-default.jpg` is the
fallback social-share image — replace it before launch.
