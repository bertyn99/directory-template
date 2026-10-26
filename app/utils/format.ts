interface ScheduleEntry {
  from: string;
  to: string;
}

interface Schedule {
  [day: string]: ScheduleEntry[];
}

interface FormattedSchedule {
  [day: string]: {
    from: string;
    to: string;
  };
}

export function formatSchedule(schedule: Schedule): FormattedSchedule {
  // Null-safe: venues without hours (jsonb null) hit this computed during head
  // rendering via the schema.org graph — Object.entries(null) throws.
  if (!schedule || typeof schedule !== "object") return {};
  const formattedSchedule: FormattedSchedule = {};

  for (const [day, entries] of Object.entries(schedule)) {
    // Assuming there's only one entry per day as per the given example
    if (entries.length > 0) {
      formattedSchedule[day] = {
        from: entries[0].from,
        to: entries[0].to,
      };
    }
  }

  return formattedSchedule;
}

export function unslugify(slug: string): string {
  // List of words to keep lowercase
  const lowercaseWords = ["de", "la", "en", "des"];

  // Remove numbers at the end and split the slug into words
  const words = slug.replace(/-\d+$/, "").split("-");

  // Capitalize each word, except for those in the lowercaseWords list
  const capitalizedWords = words.map((word, index) => {
    if (lowercaseWords.includes(word) && index !== 0) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  // Join the words back together
  return capitalizedWords.join("-");
}

export function formatRating(rating: unknown): string {
  return typeof rating === "number" ? rating.toFixed(1) : "N/A";
}

// Shared date formatter. Callers pick month style / locale / empty label:
//  - blog post page: { style: 'long' }        -> "March 5, 2026"
//  - cards/lists:     {}                        -> "Mar 5, 2026"
//  - dashboard table: { emptyLabel: '—' }       -> visitor locale, em-dash when null
export function formatDate(
  date: string | null | undefined,
  options: { style?: "long" | "short"; locale?: string; emptyLabel?: string } = {},
): string {
  const { style = "short", locale, emptyLabel = "" } = options;
  if (!date) return emptyLabel;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return emptyLabel;
  return parsed.toLocaleDateString(locale, { year: "numeric", month: style, day: "numeric" });
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

// Decodes HTML entities (e.g. &#038;, &amp;) so they render as plain text
// instead of showing the raw entity. Useful for values scraped from HTML
// page titles where characters like "&" are stored as entities.
export function decodeHtmlEntities(input: unknown): string {
  if (input == null) return "";
  return String(input).replace(/&#(x?[0-9a-fA-F]+);|&([a-zA-Z]+);/g, (match, numeric, named) => {
    if (numeric) {
      const isHex = numeric[0] === "x" || numeric[0] === "X";
      const code = isHex ? parseInt(numeric.slice(1), 16) : parseInt(numeric, 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return NAMED_HTML_ENTITIES[named] ?? match;
  });
}

// Plain text only: consumers render with {{ }} + whitespace-pre-line.
// Never emit HTML here — descriptions are owner/scraper-supplied.
export function formatDescription(
  description: unknown,
  locale: string,
): {
  intro: string;
  text: string;
} {
  if (!description || typeof description !== "object") return { intro: "", text: "" };

  const langContent =
    (description as Record<string, Record<string, string>>)[locale] ||
    (description as Record<string, Record<string, string>>)["fr"] ||
    {};

  return {
    intro: langContent.intro ?? "",
    text: langContent.text ?? "",
  };
}

export function formatAddress(address: {
  street1?: string | null;
  street2?: string | null;
  city?: {
    name?: string | null;
    country?: { code?: string; name?: string | null };
  } | null;
}) {
  if (!address) return "";
  const { street1, street2, city } = address;
  const cityName = city?.name;
  const code = city?.country?.code;
  let countryName = city?.country?.name;
  // Try to get localized country name, fall back to raw name on SSR error
  try {
    const { $t } = useNuxtApp();
    if (code && $t) {
      countryName = $t(`country_names.${code}`) || countryName;
    }
  } catch {
    // SSR context: use raw country name
  }
  // Only join non-empty parts, so a missing street no longer leaves a leading comma
  const parts = [street1, street2, cityName, countryName]
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean);
  return parts.join(", ");
}
