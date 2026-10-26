/**
 * Scraper for arbitrary venue websites (v2 — multi-page, markdown output).
 *
 * Given a venue's website URL:
 *  1. Discover priority pages (schedule/pricing/about/programs) via
 *     llms.txt → sitemap.xml → same-origin DOM link walk (first wins).
 *  2. Render each page with Playwright, extract MAIN content with
 *     @mozilla/readability, convert to markdown with turndown (+GFM tables).
 *  3. Expose labeled, size-capped markdown sections so the enrichment LLM
 *     gets real facts (schedules, prices) instead of homepage boilerplate.
 *
 * Reuses the shared Playwright singleton from browser.ts.
 */

import { createContext, navigateWithRetry } from "./browser";
import type { BrowserContext, Page } from "playwright";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

export interface ScrapedPage {
  /** Semantic label used as the context section header (HOME, SCHEDULE, …) */
  label: string;
  url: string;
  title: string | null;
  /** Main-content markdown, size-capped */
  markdown: string;
}

export interface ScrapedVenueData {
  url: string;
  title: string | null;
  metaDescription: string | null;
  headings: string[];
  /** Home page main content as markdown (main-content extracted) */
  markdown: string;
  /** Priority subpages (schedule, pricing, …), main content as markdown */
  pages: ScrapedPage[];
  /** Alphanumeric char count of the combined useful content — drives the thin-context short-circuit */
  usefulChars: number;
  socialMedia: Record<string, string> | null;
  openingHours: Record<string, string> | null;
  jsonLd: unknown | null;
}

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  facebook: /facebook\.com\//i,
  instagram: /instagram\.com\//i,
  twitter: /(?:twitter|x)\.com\//i,
  youtube: /(?:youtube\.com|youtu\.be)\//i,
  linkedIn: /linkedin\.com\//i,
};

/** Max markdown chars kept per page (home gets a larger budget) */
const MAX_HOME_CHARS = 3500;
const MAX_PAGE_CHARS = 1500;
/** Below this the site is considered "thin" — generation must not pad */
export const THIN_CONTEXT_CHARS = 600;
/** Hard cap on extra pages rendered per venue */
const MAX_EXTRA_PAGES = 5;

/** Label → URL/anchor keywords (multi-language, lowercase contains-match) */
const PAGE_KEYWORDS: Array<{ label: string; keywords: string[] }> = [
  {
    label: "SCHEDULE",
    keywords: [
      "schedule",
      "timetable",
      "planning",
      "hours",
      "horaires",
      "horaires",
      "stundenplan",
      "oeffnungszeiten",
      "öffnungszeiten",
      "öffnung",
      "orari",
      "orários",
      "horários",
      "harmonogram",
    ],
  },
  {
    label: "PRICING",
    keywords: [
      "pricing",
      "price",
      "prices",
      "rates",
      "membership",
      "abonnement",
      "tarif",
      "tarifs",
      "preise",
      "preisz",
      "kosten",
      "prezzi",
      "preços",
      "precos",
      "subscription",
    ],
  },
  {
    label: "PROGRAMS",
    keywords: [
      "program",
      "programs",
      "class",
      "classes",
      "course",
      "courses",
      "cours",
      "kurse",
      "angebot",
      "training",
      "disciplines",
      "activities",
      "activites",
      "aktivitäten",
      "team",
      "coaches",
      "trainer",
      "instructors",
      "professeurs",
    ],
  },
  {
    label: "ABOUT",
    keywords: [
      "about",
      "über",
      "ueber",
      "uns",
      "a-propos",
      "apropos",
      "propos",
      "chi-siamo",
      "sobre",
      "nosotros",
      "story",
      "histoire",
      "geschichte",
      "equipe",
      "équipe",
      "philosophie",
      "philosophy",
    ],
  },
];

/** URL fragments that are never worth scraping for a venue description */
const EXCLUDE_PATTERN =
  /(legal|impressum|privacy|datenschutz|confidential|mentions|cgv|cgu|conditions|blog|news|actu|login|signin|account|cart|panier|checkout|booking|reserve|donate|press|jobs|careers|cookie|#[a-z-]+$)/i;

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Classify a URL (and its anchor text) into a semantic label, or null to skip */
function classifyUrl(url: string, anchorText: string): string | null {
  if (EXCLUDE_PATTERN.test(url)) return null;
  const haystack = `${url} ${anchorText}`.toLowerCase();
  for (const { label, keywords } of PAGE_KEYWORDS) {
    if (keywords.some((k) => haystack.includes(k))) return label;
  }
  return null;
}

interface Candidate {
  label: string;
  url: string;
}

/** Fetch a text resource without the browser (llms.txt, sitemap.xml) */
async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 200_000);
  } catch {
    return null;
  }
}

/**
 * Discovery tier 1: llms.txt / llms-full.txt (sites that publish markdown).
 * Returns candidate URLs mined from markdown links, classified as usual.
 */
async function discoverFromLlmsTxt(origin: string): Promise<Candidate[]> {
  const text =
    (await fetchText(`${origin}/llms.txt`)) ?? (await fetchText(`${origin}/llms-full.txt`));
  if (!text) return [];
  const candidates: Candidate[] = [];
  const linkRe = /\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(text)) !== null && candidates.length < 30) {
    try {
      const url = new URL(match[1]);
      if (url.origin !== origin) continue;
      const label = classifyUrl(url.href, match[0]);
      if (label) candidates.push({ label, url: url.href });
    } catch {
      // invalid URL in llms.txt, skip
    }
  }
  return candidates;
}

/** Discovery tier 2: sitemap.xml / sitemap_index.xml <loc> URLs */
async function discoverFromSitemap(origin: string): Promise<Candidate[]> {
  const raw =
    (await fetchText(`${origin}/sitemap.xml`)) ?? (await fetchText(`${origin}/sitemap_index.xml`));
  if (!raw) return [];
  const locs = [...raw.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
  // Sitemap index → descend one level into child sitemaps
  let urls = locs;
  if (locs.some((u) => u.endsWith(".xml"))) {
    const childUrls: string[] = [];
    for (const child of locs.filter((u) => u.endsWith(".xml")).slice(0, 5)) {
      const childRaw = await fetchText(child);
      if (childRaw)
        childUrls.push(...[...childRaw.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]));
    }
    urls = childUrls.length > 0 ? childUrls : locs;
  }
  const candidates: Candidate[] = [];
  for (const u of urls) {
    if (candidates.length >= 30) break;
    try {
      const url = new URL(u);
      if (url.origin !== origin) continue;
      const label = classifyUrl(url.href, url.pathname.replace(/[-_/]/g, " "));
      if (label) candidates.push({ label, url: url.href });
    } catch {
      // skip malformed locs
    }
  }
  return candidates;
}

/** Discovery tier 3: same-origin link walk on the already-rendered homepage */
async function discoverFromDom(page: Page, origin: string): Promise<Candidate[]> {
  try {
    const links = await page.evaluate((originArg: string) => {
      const out: Array<{ href: string; text: string }> = [];
      for (const a of Array.from(document.querySelectorAll("a[href]"))) {
        const href = a.getAttribute("href") || "";
        const text = (a.textContent || "").trim();
        try {
          const abs = new URL(href, window.location.href);
          if (abs.origin !== originArg) continue;
          out.push({ href: abs.href, text });
          if (out.length >= 120) break;
        } catch {
          // skip malformed hrefs
        }
      }
      return out;
    }, origin);
    const candidates: Candidate[] = [];
    for (const link of links) {
      const label = classifyUrl(link.href, link.text);
      if (label) candidates.push({ label, url: link.href });
    }
    return candidates;
  } catch {
    return [];
  }
}

/** Dedupe + prioritize candidates: one page per label, discovery order = priority */
function pickPages(...tiers: Candidate[][]): Candidate[] {
  const seenUrls = new Set<string>();
  const seenLabels = new Set<string>();
  const picked: Candidate[] = [];
  for (const tier of tiers) {
    for (const cand of tier) {
      if (picked.length >= MAX_EXTRA_PAGES) return picked;
      const key = cand.url.replace(/\/$/, "");
      if (seenUrls.has(key) || seenLabels.has(cand.label)) continue;
      seenUrls.add(key);
      seenLabels.add(cand.label);
      picked.push(cand);
    }
  }
  return picked;
}

/** Convert rendered HTML → main-content markdown. Returns null when extraction fails. */
function htmlToMarkdown(html: string): { title: string | null; markdown: string } | null {
  try {
    const { document } = parseHTML(html);
    const parsed = new Readability(document).parse();
    if (!parsed || !parsed.content) return null;
    const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
    turndown.use(gfm);
    let markdown = turndown.turndown(parsed.content as string);
    // Collapse the noise Readability leaves behind (links/labels soup)
    markdown = markdown
      .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "") // linked images
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (markdown.length < 80) return null;
    return { title: parsed.title ?? null, markdown };
  } catch {
    return null;
  }
}

/** Render one URL and return its main-content markdown (null on failure) */
async function scrapePageMarkdown(
  page: Page,
  url: string,
  maxChars: number,
): Promise<{ title: string | null; markdown: string } | null> {
  try {
    await navigateWithRetry(page, url, 1, 1000);
    const html = await page.content();
    const extracted = htmlToMarkdown(html);
    if (!extracted) return null;
    return {
      title: extracted.title,
      markdown: extracted.markdown.slice(0, maxChars),
    };
  } catch {
    return null;
  }
}

/**
 * Scrape a venue's website: homepage + up to MAX_EXTRA_PAGES priority subpages.
 *
 * Returns partial data on failure — any field that can't be extracted
 * is null. Never throws for normal "site didn't have X" cases.
 */
export async function scrapeVenueWebsite(rawUrl: string): Promise<ScrapedVenueData> {
  const url = normalizeUrl(rawUrl);
  const origin = new URL(url).origin;
  const result: ScrapedVenueData = {
    url,
    title: null,
    metaDescription: null,
    headings: [],
    markdown: "",
    pages: [],
    usefulChars: 0,
    socialMedia: null,
    openingHours: null,
    jsonLd: null,
  };

  let context: BrowserContext | null;
  let page: Page | null = null;

  try {
    context = await createContext();
    page = await context.newPage();

    await navigateWithRetry(page, url, 2, 1500);

    // --- Homepage extraction (socials, JSON-LD, meta, main-content markdown)
    const homeHtml = await page.content();
    const homeExtracted = htmlToMarkdown(homeHtml);

    const legacy = await page.evaluate(
      ({ SOCIAL_PATTERNS_KEYS }: { SOCIAL_PATTERNS_KEYS: string[] }) => {
        const socialPatterns: Record<string, RegExp> = {};
        for (const key of SOCIAL_PATTERNS_KEYS) {
          const lower = key.toLowerCase();
          if (lower === "facebook") socialPatterns[key] = /facebook\.com\//i;
          else if (lower === "instagram") socialPatterns[key] = /instagram\.com\//i;
          else if (lower === "twitter") socialPatterns[key] = /(?:twitter|x)\.com\//i;
          else if (lower === "youtube") socialPatterns[key] = /(?:youtube\.com|youtu\.be)\//i;
          else if (lower === "linkedin") socialPatterns[key] = /linkedin\.com\//i;
        }

        const metaDesc =
          document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() ||
          document
            .querySelector('meta[property="og:description"]')
            ?.getAttribute("content")
            ?.trim() ||
          null;

        const headings = Array.from(document.querySelectorAll("h1, h2"))
          .map((el) => el.textContent?.trim())
          .filter((t): t is string => Boolean(t) && t.length > 2 && t.length < 200)
          .slice(0, 15);

        const socialMedia: Record<string, string> = {};
        const links = Array.from(document.querySelectorAll("a[href]"));
        for (const link of links) {
          const href = link.getAttribute("href") || "";
          for (const [platform, pattern] of Object.entries(socialPatterns)) {
            if (pattern.test(href) && !socialMedia[platform]) {
              try {
                socialMedia[platform] = new URL(href, window.location.href).href;
              } catch {
                socialMedia[platform] = href;
              }
              break;
            }
          }
        }

        let jsonLd: unknown = null;
        const jsonLdScripts = Array.from(
          document.querySelectorAll('script[type="application/ld+json"]'),
        );
        for (const script of jsonLdScripts) {
          try {
            const parsed = JSON.parse(script.textContent || "");
            const items = Array.isArray(parsed) ? parsed : [parsed];
            const business = items.find(
              (item) =>
                item?.["@type"] &&
                (item["@type"] === "SportsActivityLocation" ||
                  item["@type"] === "LocalBusiness" ||
                  item["@type"] === "SportsOrganization" ||
                  (Array.isArray(item["@type"]) &&
                    item["@type"].some(
                      (t: string) => t.includes("Business") || t.includes("Sport"),
                    ))),
            );
            if (business) {
              jsonLd = business;
              break;
            }
          } catch {
            // Invalid JSON-LD, skip
          }
        }
        if (!jsonLd && jsonLdScripts.length > 0) {
          try {
            jsonLd = JSON.parse(jsonLdScripts[0].textContent || "");
          } catch {
            // skip
          }
        }

        return { metaDesc, headings, socialMedia, jsonLd };
      },
      { SOCIAL_PATTERNS_KEYS: Object.keys(SOCIAL_PATTERNS) },
    );

    result.metaDescription = legacy.metaDesc;
    result.headings = legacy.headings;
    result.socialMedia = Object.keys(legacy.socialMedia).length > 0 ? legacy.socialMedia : null;
    result.jsonLd = legacy.jsonLd;

    if (homeExtracted) {
      result.title = homeExtracted.title;
      result.markdown = homeExtracted.markdown.slice(0, MAX_HOME_CHARS);
    }

    // --- Opening hours from JSON-LD
    if (legacy.jsonLd && typeof legacy.jsonLd === "object") {
      const ld = legacy.jsonLd as Record<string, unknown>;
      const openingHoursSpec = ld.openingHoursSpecification;
      if (Array.isArray(openingHoursSpec)) {
        const hours: Record<string, string> = {};
        for (const spec of openingHoursSpec) {
          if (typeof spec === "object" && spec !== null) {
            const day = (spec as Record<string, unknown>).dayOfWeek as
              | string
              | string[]
              | undefined;
            const opens = (spec as Record<string, unknown>).opens as string | undefined;
            const closes = (spec as Record<string, unknown>).closes as string | undefined;
            if (day && opens && closes) {
              const days = Array.isArray(day) ? day : [day];
              for (const d of days) {
                hours[d] = `${opens}-${closes}`;
              }
            }
          }
        }
        if (Object.keys(hours).length > 0) {
          result.openingHours = hours;
        }
      }
    }

    // --- Priority subpage discovery: llms.txt → sitemap → DOM walk
    const candidates = pickPages(
      await discoverFromLlmsTxt(origin),
      await discoverFromSitemap(origin),
      await discoverFromDom(page, origin),
    );

    for (const cand of candidates) {
      const scraped = await scrapePageMarkdown(page, cand.url, MAX_PAGE_CHARS);
      if (!scraped || scraped.markdown.length < 120) continue;
      result.pages.push({
        label: cand.label,
        url: cand.url,
        title: scraped.title,
        markdown: scraped.markdown,
      });
    }

    // --- Thin-context signal (drives the generation short-circuit)
    result.usefulChars = (
      result.markdown +
      result.pages.map((p) => p.markdown).join(" ") +
      (result.metaDescription ?? "")
    ).replace(/\s+/g, "").length;
  } catch (error) {
    console.warn(`[venue-website] Failed to scrape ${url}:`, (error as Error).message);
    // Return whatever we got — even if it's just the URL
  } finally {
    if (page) await page.close().catch(() => {});
    // Note: context is NOT closed here — it's shared across calls
    // The caller (orchestrator) manages context lifecycle
  }

  return result;
}

/**
 * Build the labeled context string for the AI prompt.
 * Each page becomes its own labeled section so the model can ground
 * statements ("SCHEDULE: Mon–Fri 17–22h") instead of inventing filler.
 */
export function buildScrapedContext(data: ScrapedVenueData): string {
  const sections: string[] = [];

  if (data.metaDescription) {
    sections.push(`META DESCRIPTION: ${data.metaDescription}`);
  }

  const homeSection = data.markdown || "";
  if (homeSection) {
    sections.push(`HOME PAGE:\n${homeSection}`);
  }

  for (const p of data.pages) {
    if (p.markdown) {
      sections.push(`${p.label} PAGE (${p.url}):\n${p.markdown}`);
    }
  }

  if (data.openingHours) {
    const hoursStr = Object.entries(data.openingHours)
      .map(([day, time]) => `${day}: ${time}`)
      .join(", ");
    sections.push(`OPENING HOURS: ${hoursStr}`);
  }

  const raw = sections.join("\n\n") || "No content could be extracted from the website.";
  return (
    raw
      // Remove image file references that confuse text-only AI models
      .replace(/\b\S+\.(png|jpg|jpeg|gif|webp|svg|bmp)\b/gi, "")
      // Remove data URIs
      .replace(/data:image\/[^;\s]+;base64[^"]*/gi, "")
      // Collapse whitespace from removals
      .replace(/[ \t]{2,}/g, " ")
      .trim()
  );
}
