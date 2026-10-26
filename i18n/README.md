# i18n / Locales

Locale files for the directory template (`@nuxtjs/i18n`, `prefix_except_default` strategy — French has no URL prefix).

## Status

| Locale | Status |
|--------|--------|
| `fr.json` | **Default locale.** Verified, neutral template copy. |
| `en.json` | Verified, neutral template copy. |
| `de.json` | ⚠️ **Unverified** machine-neutralized draft. |
| `es.json` | ⚠️ **Unverified** machine-neutralized draft. |
| `it.json` | ⚠️ **Unverified** machine-neutralized draft. |
| `pt.json` | ⚠️ **Unverified** machine-neutralized draft. |

## Warning: de / es / it / pt

These four files were **mechanically neutralized** (martial-arts vocabulary replaced with
generic venue-directory equivalents by a scripted pass). They are **not** human-reviewed
translations. Before using any of these locales in a real instantiation:

1. **Rewrite them from scratch** against `fr.json` / `en.json` — several values are rough
   equivalents, not idiomatic copy.
2. **Key parity is NOT guaranteed**: these files historically cover a smaller subset of the
   fr key tree (~400 keys vs ~766 in fr) and contain a few divergent key paths (e.g.
   `venues.filter.filter.*`, `venues.filter.stats.*`, `breadcrumb.items.home` vs
   `breadcrumb.items.index`). Missing keys fall back to French at runtime.
3. Sample placeholder categories (`fitness`, `yoga`, `spa`) may need adaptation to the
   target market's categories.

## Conventions

- **Keys are contract** — code depends on them. Never rename or remove a key without
  checking its usage in `app/`.
- **Interpolation placeholders** (`{category}`, `{city}`, `{count}`, `{categoryDe}`,
  `{categoryLe}`, `{prep}`, …) must be preserved verbatim in every value, including odd
  spacing such as `"{ count}"` in `en.countries.cities.count` (kept deliberately for
  backward compatibility).
- `country_names`, `country_prep` and `eu_city_names` are data maps, not copy — leave them.
- `affiliate.disclosure` is a **mandatory legal disclosure** (French loi « confiance dans
  l'économie numérique ») — never weaken or drop it.
- The legal/cookies texts under `pages.legal` must stay intact when neutralizing.
