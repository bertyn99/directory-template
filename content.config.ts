import { defineContentConfig, defineCollection } from '@nuxt/content'
import { defineSitemapSchema } from '@nuxtjs/sitemap/content'
import { defineRobotsSchema } from '@nuxtjs/robots/content'
import { z } from 'zod'
import { directoryConfig } from './directory.config.ts'
import { SILO_ENTRY_TYPES } from './shared/silo.ts'

const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  translationKey: z.string().optional(),
  tags: z.array(z.string()).optional(),
  image: z.object({ src: z.string() }).optional(),
  author: z.object({
    name: z.string(),
    description: z.string().optional(),
    avatar: z.object({ src: z.string() }).optional(),
  }).optional(),
  sitemap: defineSitemapSchema(),
  robots: defineRobotsSchema(),
})

/**
 * Self-contained onUrl callback prepending a locale prefix to content URLs.
 * @nuxtjs/sitemap serializes the callback INTO the server bundle as source
 * text and rejects any identifier declared outside it (closures/imports do
 * not exist there), so the prefix must be a literal inside the function
 * source — hence the code generation at config-eval time.
 */
function sitemapUrlPrefixer(prefix: string): (url: { loc: string }) => void {
  return new Function(
    'url',
    `url.loc = ${JSON.stringify(prefix)} + url.loc`,
  ) as (url: { loc: string }) => void
}

export default defineContentConfig({
  collections: {
    // One blog collection per ACTIVE locale (directoryConfig.locales) —
    // activating a locale in the config creates its collection (and its
    // content/{locale}/blog/ sources) automatically.
    // prefix_except_default: the default locale's content URLs are already
    // prefix-less; other locales get their code prepended for the sitemap.
    ...Object.fromEntries(
      directoryConfig.locales.map((locale) => {
        const name = `blog_${locale}`
        const urlPrefix = locale === directoryConfig.defaultLocale ? '' : `/${locale}`
        return [
          name,
          defineCollection({
            type: 'page',
            source: {
              include: `${locale}/blog/**`,
              prefix: '/blog',
            },
            schema: z.object({
              ...blogSchema.shape,
              sitemap: urlPrefix
                ? defineSitemapSchema({ name, onUrl: sitemapUrlPrefixer(urlPrefix) })
                : defineSitemapSchema({ name }),
              robots: defineRobotsSchema(),
            }),
          }),
        ]
      }),
    ),
    // ── Category-guide silos (content-architecture.md §3c) ────────────────
    // Editorial prose for /categories/{style}/guide + subtopics, one collection
    // per ACTIVE locale (directoryConfig.locales — the sitemap handler iterates
    // the exact same set). Bound to the DB style via the canonical `style` slug
    // (shared/activities.ts). Collection paths are INTERNAL: public URLs come
    // from custom routes querying by frontmatter (style + type), and sitemap
    // entries are emitted manually in server/api/__sitemap__/urls/index.ts
    // (with hreflang) — hence `filter: () => false` keeps these out of
    // auto-emission.
    ...Object.fromEntries(
      directoryConfig.locales.map((locale) => {
        const prefix = '/categories'
        const name = `categoryGuides_${locale}`
        return [
          name,
          defineCollection({
            type: 'page',
            source: {
              include: `${locale}/category-guides/**`,
              exclude: ['**/_*.md'],
              prefix,
            },
            schema: z.object({
              title: z.string(),
              description: z.string(),
              style: z.string(), // canonical ACTIVITY_CATALOG slug ('_directory' = venue-index guide)
              type: z.enum(SILO_ENTRY_TYPES),
              faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
              translationKey: z.string().optional(),
              tags: z.array(z.string()).optional(),
              image: z.object({ src: z.string() }).optional(),
              author: z.object({ name: z.string() }).optional(),
              category: z.string().optional(),
              createdAt: z.string().optional(),
              updatedAt: z.string().optional(),
              sitemap: defineSitemapSchema({ name, filter: () => false }),
              robots: defineRobotsSchema(),
            }),
          }),
        ];
      }),
    ),
  }
})
