import { describe, expect, it } from "vitest";
import { directoryConfig } from "~~/directory.config";
import { SCRAPING_SOURCE_IDS } from "~~/server/services/scraping/sources/ids";
import {
  buildOverpassQuery,
  decodeHtmlEntities,
  mapOverpassElement,
  osmOverpassSource,
  type OverpassElement,
} from "~~/server/services/scraping/sources/osm-overpass";

const PARIS: Parameters<typeof mapOverpassElement>[1] = {
  id: "paris",
  city: "Paris",
  url: "https://www.openstreetmap.org/search?query=Paris",
};

function element(overrides: Partial<OverpassElement> = {}): OverpassElement {
  return {
    type: "node",
    id: 1234,
    lat: 48.8566,
    lon: 2.3522,
    tags: { name: "Basic Fit" },
    ...overrides,
  };
}

// ============================================================================
// meta / registry coherence
// ============================================================================
describe("osm-overpass meta", () => {
  it("is the registered JSON no-browser adapter", () => {
    expect(osmOverpassSource.meta.id).toBe("osm-overpass");
    expect(SCRAPING_SOURCE_IDS).toContain("osm-overpass");
    expect(osmOverpassSource.meta.requiresBrowser).toBe(false);
  });

  it("derives the pseudo-activity from the config taxonomy's first category", async () => {
    const activities = await osmOverpassSource.getActivities({});
    expect(activities).toHaveLength(1);
    expect(activities[0]!.name).toBe(
      directoryConfig.taxonomy.categories[0]!.name,
    );
    expect(activities[0]!.url).toBeTruthy();
  });

  it("lists the config seedCities (unique ids, slugified)", async () => {
    const cities = await osmOverpassSource.getCitiesForActivity({}, {
      name: "Fitness",
      url: "x",
    });
    expect(cities.map((city) => city.city)).toEqual([
      ...directoryConfig.scraping.seedCities,
    ]);
    expect(new Set(cities.map((city) => city.id)).size).toBe(cities.length);
    expect(cities[0]!.id).toBe("paris");
  });
});

// ============================================================================
// Overpass QL builder
// ============================================================================
describe("buildOverpassQuery", () => {
  it("geocodes the city and filters the niche tag", () => {
    const query = buildOverpassQuery("Paris");
    expect(query).toContain('[out:json][timeout:25];');
    expect(query).toContain('area(geocodeArea:"Paris")->.a;');
    expect(query).toContain("nwr(area.a)[leisure=fitness_centre][name];");
    expect(query).toContain("out center 200;");
  });

  it("escapes Overpass string metacharacters in the city name", () => {
    const query = buildOverpassQuery('Frankfurt "am" \\Main');
    expect(query).toContain(
      'area(geocodeArea:"Frankfurt \\"am\\" \\\\Main")->.a;',
    );
  });
});

// ============================================================================
// HTML entity decoding
// ============================================================================
describe("decodeHtmlEntities", () => {
  it("decodes named entities in scraped text", () => {
    expect(decodeHtmlEntities("Café &amp; Sport")).toBe("Café & Sport");
    expect(decodeHtmlEntities("L&apos;Orange Bleue")).toBe("L'Orange Bleue");
    expect(decodeHtmlEntities("Studio &lt;Fit&gt;")).toBe("Studio <Fit>");
  });

  it("decodes numeric and hex entities", () => {
    expect(decodeHtmlEntities("L&#39;Equipe")).toBe("L'Equipe");
    expect(decodeHtmlEntities("K&#xF6;ln")).toBe("Köln");
  });

  it("leaves unknown entities and plain text untouched", () => {
    expect(decodeHtmlEntities("Plain Fitness")).toBe("Plain Fitness");
    expect(decodeHtmlEntities("&notinbox;")).toBe("&notinbox;");
  });
});

// ============================================================================
// element → PlaceData mapping
// ============================================================================
describe("mapOverpassElement", () => {
  it("maps a fully-tagged node", () => {
    const place = mapOverpassElement(
      element({
        tags: {
          name: "Café &amp; Sport",
          "addr:housenumber": "12",
          "addr:street": "Hauptstraße",
          "addr:postcode": "10115",
          "addr:city": "Berlin",
          "addr:country": "DE",
          website: "https://example.com",
          "contact:phone": "+49 30 123456",
          brand: "Basic-Fit",
          operator: "Basic-Fit SAS",
          wheelchair: "yes",
        },
      }),
      PARIS,
    );

    expect(place).not.toBeNull();
    expect(place!.name).toBe("Café & Sport");
    // osm.org canonical URL — the trailing id becomes sourceVenueId at ingest.
    expect(place!.url).toBe("https://www.openstreetmap.org/node/1234");
    expect(place!.address).toEqual({
      street: "12 Hauptstraße",
      city: "Berlin",
      zip: "10115",
      country: "DE",
      lat: 48.8566,
      lng: 2.3522,
    });
    expect(place!.website).toBe("https://example.com");
    expect(place!.tel).toBe("+49 30 123456");
    expect(place!.attributes).toEqual({
      brand: "Basic-Fit",
      operator: "Basic-Fit SAS",
      wheelchair: true,
    });
    expect(place!.raw).toEqual(element({
      tags: {
        name: "Café &amp; Sport",
        "addr:housenumber": "12",
        "addr:street": "Hauptstraße",
        "addr:postcode": "10115",
        "addr:city": "Berlin",
        "addr:country": "DE",
        website: "https://example.com",
        "contact:phone": "+49 30 123456",
        brand: "Basic-Fit",
        operator: "Basic-Fit SAS",
        wheelchair: "yes",
      },
    }));
  });

  it("uses the center point for ways/relations without top-level lat/lon", () => {
    const place = mapOverpassElement(
      element({ lat: undefined, lon: undefined, center: { lat: 50.9, lon: 6.9 } }),
      PARIS,
    );
    expect(place!.address).toMatchObject({ lat: 50.9, lng: 6.9 });
  });

  it("tolerates missing tags: name-only element falls back to the queried city", () => {
    const place = mapOverpassElement(
      element({ id: 42, type: "way", lat: undefined, lon: undefined, center: undefined }),
      PARIS,
    );
    expect(place!.name).toBe("Basic Fit");
    expect(place!.url).toBe("https://www.openstreetmap.org/way/42");
    expect(place!.address).toEqual({ city: "Paris" });
    expect(place!.website).toBeUndefined();
    expect(place!.tel).toBeUndefined();
    expect(place!.attributes).toBeUndefined();
  });

  it("returns null for nameless elements", () => {
    expect(mapOverpassElement(element({ tags: {} }), PARIS)).toBeNull();
    expect(mapOverpassElement(element({ tags: { name: "   " } }), PARIS)).toBeNull();
    expect(mapOverpassElement(element({ tags: undefined }), PARIS)).toBeNull();
  });

  it("maps wheelchair only as a clean boolean (no !== yes values leak)", () => {
    const no = mapOverpassElement(element({ tags: { name: "X", wheelchair: "no" } }), PARIS);
    const limited = mapOverpassElement(element({ tags: { name: "X", wheelchair: "limited" } }), PARIS);
    expect(no!.attributes).toEqual({ wheelchair: false });
    expect(limited!.attributes).toEqual({ wheelchair: false });
  });
});
