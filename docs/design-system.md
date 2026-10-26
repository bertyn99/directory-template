# Design System — Neutral Base Theme

This document describes the **neutral base theme** of the **Directory Template** and the
contract each niche app follows to re-theme it. It is implemented with **Nuxt UI v4** and
**Tailwind CSS v4** (CSS-variable theming in `app/assets/css/main.css` + `app/app.config.ts`).

> **Design-neutral by contract.** The template carries no brand identity of its own: no
> brand palette, no display font. Every niche app (padel clubs, spas, coworking spaces…)
> injects its identity at instantiation — component code never changes.

## 1. Archetype

*   **Concept:** Swiss Editorial precision applied to a directory product.
*   **Visual key:** High-key surfaces (white backgrounds), stark contrast, technical typography.
*   **Atmosphere:** Clean, direct, professional. Content and data lead; chrome stays quiet.

## 2. Base Palette

The base theme resolves every accent to **Tailwind's built-in `slate` scale** — a
restrained blue-gray family. Nothing in the UI is color-branded.

### Roles

*   **Primary (`slate`):** actions, CTAs, active states, hover borders. Light mode accent is
    `#475569` (slate-600 family, ≥4.5:1 on white — WCAG AA for text and white-on-solid buttons).
*   **Secondary (`slate`):** secondary accents (e.g. the footer band).
*   **Neutral (`slate`):** surfaces, borders, text. Text dimmed/muted steps are bumped one
    step darker than Nuxt UI defaults (neutral-500/600) to hold WCAG AA — see
    `main.css` "WCAG AA Color Contrast Overrides".
*   **Semantic colors** (`success`, `warning`, `error`, `info`) keep their Nuxt UI defaults —
    they are functional, not brand.

### Implementation (Nuxt UI CSS Variables)

`app/app.config.ts` wires the roles; `app/assets/css/main.css` holds the CSS-variable layer:

```ts
// app/app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: "slate",
      secondary: "slate",
      neutral: "slate",
    },
    // …component slot overrides (font-display on buttons/badges/prose headings)
  },
})
```

**Usage in Components:**
*   Primary actions: `bg-primary`, `text-primary`, `border-primary`
*   Secondary accents: `bg-secondary`, `text-secondary`
*   Text: `text-default`, `text-muted`, `text-toned`
*   Backgrounds: `bg-default`, `bg-muted`, `bg-elevated`
*   Borders: `border-default`, `border-muted`, `border-accented`

## 3. Re-theming Contract (per niche app)

A niche app brands the template **without touching any component**, in `main.css` +
`app.config.ts` only. Two strategies:

### Strategy A — Built-in palette (zero CSS)

Point `ui.colors.primary` at any built-in Tailwind palette (`emerald`, `rose`, `indigo`…).
Done. Nuxt UI regenerates `--ui-primary*` from that scale.

### Strategy B — Custom palette (full brand control)

Define a custom scale in `app/assets/css/main.css` and point `primary` at its name:

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
// app/app.config.ts
colors: { primary: "brand", secondary: "slate", neutral: "slate" }
```

**Rules for custom palettes:**

*   The `static` modifier on `@theme` is **required** — these variables are consumed by
    Nuxt UI's runtime inline styles (`--ui-color-primary-*` references), not by Tailwind
    utilities; without it, Tailwind v4 tree-shakes them out of the compiled CSS.
*   Keep the **500/600** shades at **≥4.5:1 contrast on white** (WCAG AA): they back
    `text-primary` and white-on-solid buttons.
*   Ship the full 50–950 ramp; Nuxt UI picks the shades per context (soft/solid/outline variants).
*   Fonts: override `--font-display` (headings/buttons/badges pick it up via the
    `font-display` utility) and, if the body face changes, `--font-sans`. Declare the
    families in `nuxt.config.ts` (`fonts.families`) so they are self-hosted and preloaded.

## 4. Typography System

The base template ships **one family**: **Manrope** (Google Fonts, self-hosted) for both roles.

*   **Body:** Manrope Regular (400) / Medium (500) — descriptions, addresses, schedules.
*   **Headings:** Manrope Bold (700), **uppercase**, tight tracking — page titles, section
    headers. `--font-display` falls back to Manrope so a niche app can swap in its own
    display face with a single variable.

### Implementation

```css
@theme {
  --font-sans: "Manrope", sans-serif;
  --font-display: "Manrope", sans-serif; /* niche app: override with its display face */
}

/* Headings: display face — Bold (700), Uppercase */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
}

/* Body: Manrope - Regular (400), Medium (500) */
body {
  font-family: var(--font-sans);
  font-weight: 400;
}
```

The uppercase heading treatment and the size scale (h1 `text-4xl` → h6 `text-base`) are
**template invariants** — re-theme the face, not the scale.

## 5. UI Component Definition

Components deviate from the default "soft SaaS" look toward a sharper, editorial aesthetic.

### Shape & Physics — TEMPLATE INVARIANTS

*   **Corner radius:** **Sharp / Micro (2px)**. Controlled via `--ui-radius: 0.125rem`; use
    the `rounded-sm` utility. Never `rounded-lg`, `rounded-xl`, `rounded-full`.
*   **Depth:** **Flat with borders.** Use `border border-default` / `border-muted` instead of
    drop shadows. Never `shadow-*`.
*   **Hover:** `border-primary` (active target), transition `150ms`.

### Key Components

**Buttons:**
*   Nuxt UI buttons with `rounded-sm`; solid rectangles, no gradients.
*   Primary actions: `bg-primary text-white`; secondary: `bg-secondary text-white`.

**Cards (venue/blog):**
*   `bg-default` background, `border border-default`, `rounded-sm`.
*   Structure: image top, content bottom.
*   Example: `<UCard class="bg-default border border-default rounded-sm">`

**Inputs:**
*   Sharp edges (`rounded-sm`), clear focus ring (`focus:ring-primary`),
    `border-default` → `border-primary` on focus.

**Text colors:** `text-default` (primary), `text-muted` (secondary), `text-dimmed`,
`text-highlighted`.

**Backgrounds:** `bg-default` (main), `bg-muted` (cards/sections), `bg-elevated`.

## 6. UX & Interaction

*   **Motion:** snap transitions — fast (150ms).
*   **Feedback:** high-contrast states. Loading: pulse skeletons (neutral). Success:
    sharp green checkmarks (semantic, unbranded).
*   **Tone:** direct, action-oriented, never verbose.
    *   *Good:* "Find your gym."
    *   *Bad:* "Please search for a venue here."

## 7. Sample Assets

Images under `public/img/` are **replaceable placeholders** (`hero-showcase.png`,
`hero-bubble.png`, `venue-fallback.png`, `og-default.jpg` …). A niche app swaps them for its
own imagery; component code references the neutral file names. `og-default.jpg` is the
fallback social-share image — replace it before launch.
