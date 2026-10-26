/**
 * Venue Glossary — Protected Terms for Translation
 *
 * Prevents proper nouns (category names, brand names) from being mangled by DeepL.
 * Usage: protectTerms(text) before sending to DeepL, restoreTerms(text) after.
 *
 * The template ships a small NEUTRAL sample set — replace per instantiation
 * with the proper nouns of your niche (category names, federations, brands).
 */

/** Single glossary entry with canonical form and known variations */
interface GlossaryEntry {
  /** The canonical/official spelling to preserve */
  canonical: string;
  /** All known spellings/variations (lowercase for matching) */
  variations: string[];
}

/**
 * Sample categories treated as proper nouns.
 * Order matters: longer/more-specific terms first so the most specific
 * variation is matched before a shorter one greedily consumes it.
 */
const GLOSSARY: GlossaryEntry[] = [
  {
    canonical: "CrossFit",
    variations: ["crossfit", "cross-fit", "cross fit"],
  },
  { canonical: "Pilates", variations: ["pilates"] },
  { canonical: "Yoga", variations: ["yoga", "yôga"] },
  { canonical: "Zumba", variations: ["zumba"] },
  { canonical: "Aquagym", variations: ["aquagym", "aqua gym", "aquafitness"] },
];

/** Placeholder format — unlikely to appear naturally in text */
const PLACEHOLDER_PREFIX = "§§";
const PLACEHOLDER_SUFFIX = "§§";

/** Map from placeholder → canonical form for restoration */
type PlaceholderMap = Map<string, string>;

/**
 * Protect glossary terms in text by replacing them with placeholders.
 * Placeholders won't be touched by DeepL since they contain no translatable words.
 *
 * @returns `{ protectedText, placeholders }` — pass protectedText to DeepL,
 *   then call restoreTerms(translatedText, placeholders) to get clean output.
 */
export function protectTerms(text: string): {
  protectedText: string;
  placeholders: PlaceholderMap;
} {
  const placeholders: PlaceholderMap = new Map();
  let result = text;

  for (const entry of GLOSSARY) {
    for (const variation of entry.variations) {
      // Case-insensitive regex — word-boundary-aware to avoid partial matches
      const regex = new RegExp(`\\b${escapeRegex(variation)}\\b`, "gi");
      result = result.replace(regex, (match) => {
        // Preserve the original casing in the placeholder key
        const key = `${PLACEHOLDER_PREFIX}${match}${PLACEHOLDER_SUFFIX}`;
        // Only map if not already mapped (first occurrence wins)
        if (!placeholders.has(key)) {
          placeholders.set(key, entry.canonical);
        }
        return key;
      });
    }
  }

  return { protectedText: result, placeholders };
}

/**
 * Restore placeholders back to their canonical glossary form after translation.
 * Removes any leftover `<span translate="no">` wrappers as a safety measure.
 */
export function restoreTerms(text: string, placeholders: PlaceholderMap): string {
  let result = text;

  for (const [placeholder, canonical] of placeholders) {
    // Placeholders may have been slightly modified by DeepL (spacing, case)
    // Use a flexible regex to catch variations
    const escaped = escapeRegex(placeholder);
    const flexibleRegex = new RegExp(escaped, "gi");
    result = result.replace(flexibleRegex, canonical);
  }

  // Safety: strip any <span translate="no">...</span> wrappers
  result = result.replace(/<span\s+translate="no"\s*>([^<]+)<\/span>/gi, "$1");

  return result;
}

/**
 * Convenience: wrap protected terms in `<span translate="no">` HTML tags.
 * Useful when the translation API supports HTML-aware processing (DeepL does).
 */
export function wrapWithNoTranslateSpans(text: string): string {
  let result = text;

  for (const entry of GLOSSARY) {
    for (const variation of entry.variations) {
      const regex = new RegExp(`\\b${escapeRegex(variation)}\\b`, "gi");
      result = result.replace(regex, (_match) => `<span translate="no">${entry.canonical}</span>`);
    }
  }

  return result;
}

/**
 * Remove `<span translate="no">` wrappers, replacing with canonical forms where possible.
 */
export function unwrapNoTranslateSpans(text: string): string {
  return text.replace(/<span\s+translate="no"\s*>([^<]+)<\/span>/gi, "$1");
}

/** Escape special regex characters in a string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Get all canonical terms (useful for UI/autocomplete) */
export function getCanonicalTerms(): string[] {
  return GLOSSARY.map((entry) => entry.canonical);
}

/** Check if a string contains any glossary term */
export function containsGlossaryTerm(text: string): boolean {
  const lower = text.toLowerCase();
  return GLOSSARY.some((entry) => entry.variations.some((v) => lower.includes(v.toLowerCase())));
}
