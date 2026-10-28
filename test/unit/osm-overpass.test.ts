import { describe, expect, it } from "vitest";
import { mapOverpassElement } from "../../server/services/scraping/sources/osm-overpass";

describe("mapOverpassElement", () => {
  it("maps a node with lat/lon and address tags", () => {
    const place = mapOverpassElement({
      type: "node",
      id: 42,
      lat: 48.85,
      lon: 2.35,
      tags: {
        name: "Fit Club",
        "addr:street": "Rue de Rivoli",
        "addr:housenumber": "10",
        "addr:city": "Paris",
        "addr:postcode": "75001",
        website: "https://fit.example",
        phone: "+33100000000",
        brand: "FitBrand",
        wheelchair: "yes",
      },
    });
    expect(place).toMatchObject({
      name: "Fit Club",
      website: "https://fit.example",
      tel: "+33100000000",
      address: {
        street: "10 Rue de Rivoli",
        city: "Paris",
        zip: "75001",
        lat: 48.85,
        lng: 2.35,
      },
      attributes: { brand: "FitBrand", wheelchair: true },
    });
    expect(place?.raw).toMatchObject({ id: 42 });
  });

  it("uses center when lat/lon are missing (ways)", () => {
    const place = mapOverpassElement({
      type: "way",
      id: 7,
      center: { lat: 45.75, lon: 4.85 },
      tags: { name: "Gym Lyon", "addr:city": "Lyon" },
    });
    expect(place?.address).toMatchObject({ city: "Lyon", lat: 45.75, lng: 4.85 });
  });

  it("unescapes HTML entities in names", () => {
    const place = mapOverpassElement({
      id: 1,
      lat: 1,
      lon: 1,
      tags: { name: "Spa &amp; Wellness" },
    });
    expect(place?.name).toBe("Spa & Wellness");
  });

  it("returns null without a name tag", () => {
    expect(mapOverpassElement({ id: 1, lat: 1, lon: 1, tags: {} })).toBeNull();
  });

  it("tolerates missing tags and contact:* aliases", () => {
    const place = mapOverpassElement({
      type: "node",
      id: 9,
      lat: 0,
      lon: 0,
      tags: {
        name: "Bare Gym",
        "contact:website": "https://bare.example",
        "contact:phone": "+330",
      },
    });
    expect(place?.website).toBe("https://bare.example");
    expect(place?.tel).toBe("+330");
    expect(place?.attributes).toBeUndefined();
  });
});
