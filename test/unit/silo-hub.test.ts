import { describe, expect, it } from "vitest";
import { siblingCategorySlugs } from "~~/shared/activities";
import {
  excerptPlainText,
  resolveBlogGuideRedirect,
  sortSiloEntries,
} from "~~/shared/silo";

describe("siblingCategorySlugs", () => {
  it("returns other slugs from the same family", () => {
    expect(siblingCategorySlugs("yoga", 2)).toEqual(["fitness", "spa"]);
  });

  it("returns an empty list for an unknown category", () => {
    expect(siblingCategorySlugs("not-a-category")).toEqual([]);
  });
});

describe("silo helpers", () => {
  it("sorts silo entries by the canonical type order", () => {
    const sorted = sortSiloEntries([
      { type: "ecoles", title: "E" },
      { type: "guide", title: "G" },
      { type: "choisir-venue", title: "C" },
    ]);
    expect(sorted.map(entry => entry.type)).toEqual(["guide", "choisir-venue", "ecoles"]);
  });

  it("excerpts markdown to a word cap without markup", () => {
    const excerpt = excerptPlainText(
      "## Hello\n\nThis is a [link](/categories/yoga) with **bold** words that should be capped eventually once we pass the limit of words in this sentence for the test.",
      8,
    );
    expect(excerpt).toBe("Hello This is a link with bold words…");
  });

  it("returns no blog redirect when no legacy slugs are configured", () => {
    expect(resolveBlogGuideRedirect("fr", "guide-fitness")).toBeUndefined();
    expect(resolveBlogGuideRedirect("en", "unknown-legacy-slug")).toBeUndefined();
  });
});
