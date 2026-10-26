import { describe, expect, it } from "vitest";
import {
  formatParisArrondissement,
  majorEuCityFromPublicSlug,
  majorEuCityImageSrc,
  majorEuCitySlugAliases,
  toMajorEuCityCards,
} from "~~/shared/major-eu-cities";

describe("major EU city cards", () => {
  it("always includes Lisbon even when the database has no matching rows", () => {
    const cards = toMajorEuCityCards([
      { name: "Paris", venueCount: 4 },
      { name: "Berlin", venueCount: 0 },
    ]);

    expect(cards.map((card) => card.name)).toEqual(
      expect.arrayContaining(["Lisbon"]),
    );
    expect(cards.find((card) => card.name === "Lisbon")?.venueCount).toBe(0);
  });

  it("counts Lisboa rows toward Lisbon", () => {
    const cards = toMajorEuCityCards([{ name: "Lisboa", venueCount: 3 }]);

    expect(cards.find((card) => card.name === "Lisbon")?.venueCount).toBe(3);
  });

  it("returns one card per major EU city", () => {
    const cards = toMajorEuCityCards([]);

    expect(cards.map((card) => card.name).sort()).toEqual([
      "Barcelona",
      "Berlin",
      "Lisbon",
      "London",
      "Paris",
      "Rome",
    ]);
  });

  it("maps city names and zip slugs to banner paths", () => {
    expect(majorEuCityImageSrc("Paris")).toBe("/img/cities/paris.jpg");
    expect(majorEuCityFromPublicSlug("paris")).toBe("Paris");
    expect(majorEuCityFromPublicSlug("paris-75011")).toBe("Paris");
    expect(majorEuCityFromPublicSlug("lisbon")).toBe("Lisbon");
    expect(majorEuCityFromPublicSlug("lisboa")).toBe("Lisbon");
    expect(majorEuCitySlugAliases("lisbon")).toEqual(
      expect.arrayContaining(["lisbon", "lisboa"]),
    );
    expect(majorEuCitySlugAliases("paris-75011")).toEqual(["paris-75011"]);
  });

  it("maps Paris postal codes to arrondissements", () => {
    expect(formatParisArrondissement("75001")).toBe(1);
    expect(formatParisArrondissement("75020")).toBe(20);
    expect(formatParisArrondissement("69001")).toBeNull();
  });
});
