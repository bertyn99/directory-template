/**
 * Venue attribute facets — config-derived mechanism, same shape as
 * shared/activities.ts: ALL data lives in directory.config.ts
 * `taxonomy.facets` (FacetConfig[]), this module only derives the runtime
 * helpers and hosts the filter-param MECHANISM. Never edit data here.
 *
 * A facet key is a venues.attributes JSONB key. Only config-declared keys are
 * rendered (public chips) and only filterable ones are accepted by the venues
 * API (`facet=key:value` repeated params) — the whitelist below is both the
 * UX contract and the jsonb-injection guard: no client-supplied string ever
 * becomes a JSONB path.
 */

import { directoryConfig, type FacetConfig } from "../directory.config";

/** All facets declared by the instantiation (rendering + filtering source). */
export const CONFIGURED_FACETS: readonly FacetConfig[] =
  directoryConfig.taxonomy.facets;

/** Facets exposed as API filters (filterable: false ⇒ display-only chip). */
export function filterableFacets(): readonly FacetConfig[] {
  return CONFIGURED_FACETS.filter((facet) => facet.filterable !== false);
}

/**
 * One validated facet filter: a config-declared key + a whitelisted value
 * ("true" for boolean facets, an enum value otherwise).
 */
export interface FacetFilter {
  key: string;
  value: string;
}

function facetByKey(key: string): FacetConfig | undefined {
  return filterableFacets().find((facet) => facet.key === key);
}

/**
 * Parse raw `key:value` filter params against the config whitelist.
 * Returns null when ANY entry is not exactly a filterable, config-declared
 * facet + its whitelisted value (unknown key, non-filterable key, boolean
 * value other than "true", enum value outside `values`, malformed string) —
 * the caller turns null into the API's invalid-param 400.
 */
export function parseFacetFilters(
  raw: readonly unknown[],
): FacetFilter[] | null {
  const filters: FacetFilter[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") return null;
    const separator = entry.indexOf(":");
    if (separator <= 0) return null;
    const key = entry.slice(0, separator);
    const value = entry.slice(separator + 1);
    const facet = facetByKey(key);
    if (!facet) return null;
    if (facet.kind === "boolean") {
      // Boolean facets only ever filter the TRUE side (SQL: ->> key = 'true').
      if (value !== "true") return null;
    } else if (!facet.values?.includes(value)) {
      return null;
    }
    filters.push({ key, value });
  }
  return filters;
}

/**
 * i18n key of a facet's label. Boolean facets: `facet.<key>`. Enum facets:
 * `facet.<key>.label` — the same `facet.<key>` object also nests the value
 * labels, and one vue-i18n key cannot be a string AND an object at once.
 */
export function facetLabelKey(facet: FacetConfig): string {
  return facet.kind === "enum" ? `facet.${facet.key}.label` : `facet.${facet.key}`;
}

/** i18n key of an enum value's label: `facet.<key>.<value>`. */
export function facetValueLabelKey(facet: FacetConfig, value: string): string {
  return `facet.${facet.key}.${value}`;
}
