/**
 * Facet filter-param validation — pure whitelist mechanics from
 * shared/facets.ts (the jsonb-injection guard behind the venues API's
 * `facet=key:value` params).
 */
import { describe, expect, it } from "vitest";
import {
  facetLabelKey,
  facetValueLabelKey,
  filterableFacets,
  parseFacetFilters,
} from "~~/shared/facets";
import { searchVenuesInputSchema } from "~~/server/db/queries/venues";
import { directoryConfig } from "~~/directory.config";

describe("filterableFacets", () => {
  it("derives from the config taxonomy (shipped sample has 3 filterable facets)", () => {
    expect(filterableFacets().map(f => f.key)).toEqual([
      "group-classes",
      "open-sundays",
      "ambiance",
    ]);
  });
});

describe("parseFacetFilters", () => {
  it("accepts whitelisted boolean + enum params", () => {
    expect(parseFacetFilters(["open-sundays:true", "ambiance:family"])).toEqual([
      { key: "open-sundays", value: "true" },
      { key: "ambiance", value: "family" },
    ]);
  });

  it("accepts a single raw string entry (h3 non-array shape)", () => {
    expect(parseFacetFilters(["group-classes:true"])).toEqual([
      { key: "group-classes", value: "true" },
    ]);
  });

  it("returns [] for no filters", () => {
    expect(parseFacetFilters([])).toEqual([]);
  });

  it("rejects unknown keys (jsonb-injection guard)", () => {
    expect(parseFacetFilters(["description: DROP TABLE venues;--:true"])).toBeNull();
    expect(parseFacetFilters(["made-up-facet:true"])).toBeNull();
  });

  it("rejects boolean values other than 'true' (the false side is not filterable)", () => {
    expect(parseFacetFilters(["group-classes:false"])).toBeNull();
    expect(parseFacetFilters(["group-classes:1"])).toBeNull();
  });

  it("rejects enum values outside the facet whitelist", () => {
    expect(parseFacetFilters(["ambiance:underground"])).toBeNull();
    expect(parseFacetFilters(["ambiance:true"])).toBeNull();
  });

  it("rejects malformed entries (no separator, empty key, non-strings)", () => {
    expect(parseFacetFilters(["no-separator"])).toBeNull();
    expect(parseFacetFilters([":true"])).toBeNull();
    expect(parseFacetFilters([42])).toBeNull();
    expect(parseFacetFilters([null])).toBeNull();
  });

  it("rejects the whole batch when any entry is invalid", () => {
    expect(parseFacetFilters(["ambiance:family", "made-up:true"])).toBeNull();
  });
});

describe("facet label keys", () => {
  it("booleans label at facet.<key>, enums at facet.<key>.label", () => {
    const [booleanFacet, , enumFacet] = directoryConfig.taxonomy.facets;
    expect(facetLabelKey(booleanFacet)).toBe("facet.group-classes");
    expect(facetLabelKey(enumFacet)).toBe("facet.ambiance.label");
  });

  it("enum values label at facet.<key>.<value>", () => {
    const enumFacet = directoryConfig.taxonomy.facets.find(f => f.kind === "enum");
    expect(facetValueLabelKey(enumFacet!, "family")).toBe("facet.ambiance.family");
  });
});

describe("searchVenuesInputSchema facets (zod chain)", () => {
  it("defaults to [] and parses whitelisted params", () => {
    const ok = searchVenuesInputSchema.parse({ facets: ["open-sundays:true", "ambiance:family"] });
    expect(ok.facets).toEqual([
      { key: "open-sundays", value: "true" },
      { key: "ambiance", value: "family" },
    ]);
    const empty = searchVenuesInputSchema.parse({});
    expect(empty.facets).toEqual([]);
  });

  it("raises a ZodError on unknown key / off-whitelist value / malformed entry", () => {
    expect(() => searchVenuesInputSchema.parse({ facets: ["made-up:true"] })).toThrow();
    expect(() => searchVenuesInputSchema.parse({ facets: ["ambiance:underground"] })).toThrow();
    expect(() => searchVenuesInputSchema.parse({ facets: ["open-sundays:false"] })).toThrow();
    expect(() => searchVenuesInputSchema.parse({ facets: ["noseparator"] })).toThrow();
  });
});
