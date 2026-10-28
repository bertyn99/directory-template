# i18n / Locales

Locale files for the directory template (`@nuxtjs/i18n`, `prefix_except_default` strategy — French has no URL prefix).

## Two-tier parity system

`fr.json` is the **reference key tree**: code depends on fr keys existing in every active locale, and missing keys **silently fall back to French at runtime**. The instantiation contract test (`test/unit/instantiation-contract.test.ts`, runs in `pnpm test:unit`) enforces two tiers so the shipped template passes while a half-translated activation gets vetoed:

| Tier | Who | Enforced |
|------|-----|----------|
| **Tier 1** | `VERIFIED_LOCALES` (`test/unit/instantiation-contract.test.ts`) + fr | Full key-tree parity with fr.json, **both directions** (extra keys fail too — they mean the translation lags: e.g. the historical `breadcrumb.items.home` vs fr's `breadcrumb.items.index` divergence) |
| **Tier 2** | every other **active** locale (drafts) | (a) **placeholder parity** — every shared key keeps fr's `{placeholders}` (French elision params `{categoryLe}`/`{categoryDe}`/`{categoryLeCap}` fold to `{category}`); (b) **launch-critical families present**: `nav`, `common`, `breadcrumb.items.index`, `affiliate.disclosure`, `billing`, `footer`, `home.title`, `categories`, `venues`, `search`, and `guide.types.<spoke>` for every `content.siloSpokes` entry |

Content files are also contract per active locale: `content/<code>/category-guides/_directory/guide.md` (the footer links `/<code>/venues/guide` for every active locale — missing file = guaranteed 404) and at least one `content/<code>/blog/*.md`.

## Status

| Locale | Tier | Notes |
|--------|------|-------|
| `fr.json` | reference | Verified, neutral template copy (~655 keys). |
| `en.json` | **1 — VERIFIED** | Full key-tree parity with fr enforced. |
| `de.json` | 2 — draft | Machine-neutralized draft (~335 keys); full family list + parity report via `pnpm instantiate:locale de`. |
| `es.json` | 2 — draft | Same as de. |
| `it.json` | 2 — draft | Same as de. |
| `pt.json` | 2 — draft | Same as de. |

Key counts drift as copy evolves — run `pnpm instantiate:locale <code>` for the live numbers.

## Activation workflow (new locale)

1. **Stub** — `pnpm instantiate:locale <code>`: creates the content stubs (footer guide + blog + first-category guide, copied from fr with a `TODO(<code>)` marker), copies `i18n/locales/<code>.json` from fr.json if missing, and prints the parity report + a checklist. It never edits `directory.config.ts`.
2. **Translate** the listed families in `i18n/locales/<code>.json`, fix any placeholder divergence, delete dead keys; rewrite the stubs (search `TODO(<code>)` under `content/<code>/`).
3. **Activate** — add the code to `locales` in `directory.config.ts` (single edit: creates the content collections, routes, sitemap and hreflang).
4. **Verify** — `pnpm test:unit`: the contract enforces tier 2 for drafts (launch families + placeholder parity) and the content files.
5. Optional: once the translation reaches full parity, raise the code into `VERIFIED_LOCALES` (tier 1).

## Warning: de / es / it / pt

These four files were **mechanically neutralized** (martial-arts vocabulary replaced with
generic venue-directory equivalents by a scripted pass). They are **not** human-reviewed
translations. Tier 2 keeps an activation from shipping half-French UI, but before using
any of these locales in a real instantiation:

1. **Rewrite them from scratch** against `fr.json` / `en.json` — several values are rough
   equivalents, not idiomatic copy.
2. A few key paths historically diverge (e.g. `venues.filter.stats.*`) — the contract
   test flags extra/dead keys only at tier 1; run `pnpm instantiate:locale <code>` to
   list them.
3. Sample placeholder categories (`fitness`, `yoga`, `spa`) may need adaptation to the
   target market's categories.

## Conventions

- **Keys are contract** — code depends on them. Never rename or remove a key without
  checking its usage in `app/`.
- **Interpolation placeholders** (`{category}`, `{city}`, `{count}`, …) must be preserved
  in every value. French-only elision params (`{categoryDe}`, `{categoryLe}`,
  `{categoryLeCap}`) may be collapsed to `{category}` in other locales — the parity
  checker folds them. Odd spacing such as `"{ count}"` in `en.countries.cities.count`
  is kept deliberately for backward compatibility.
- `country_names`, `country_prep` and `eu_city_names` are data maps, not copy — leave them.
- `affiliate.disclosure` is a **mandatory legal disclosure** (French loi « confiance dans
  l'économie numérique ») — never weaken or drop it.
- The legal/cookies texts under `pages.legal` must stay intact when neutralizing.
