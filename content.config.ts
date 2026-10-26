import { defineContentConfig, defineCollection } from '@nuxt/content'
import { defineSitemapSchema } from '@nuxtjs/sitemap/content'
import { defineRobotsSchema } from '@nuxtjs/robots/content'
import { z } from 'zod'
import { SILO_ENTRY_TYPES } from './shared/silo'

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

export default defineContentConfig({
  collections: {
    blog_en: defineCollection({
      type: 'page',
      source: {
        include: 'en/blog/**',
        prefix: '/blog',
      },
      schema: z.object({
        ...blogSchema.shape,
        sitemap: defineSitemapSchema({
          name: 'blog_en',
          onUrl: (url) => {
            url.loc = '/en' + url.loc
          },
        }),
        robots: defineRobotsSchema(),
      }),
    }),
    blog_fr: defineCollection({
      type: 'page',
      source: {
        include: 'fr/blog/**',
        prefix: '/blog',
      },
      schema: z.object({
        ...blogSchema.shape,
        sitemap: defineSitemapSchema({ name: 'blog_fr' }),
        robots: defineRobotsSchema(),
      }),
    }),
    // ── Style-guide silos (content-architecture.md §3c) ──────────────────
    // Editorial prose for /categories/{style}/guide + subtopics. Bound to the DB
    // style via the canonical `style` slug (shared/activities.ts). Collection
    // paths are INTERNAL: public URLs come from custom routes querying by
    // frontmatter (style + type), and sitemap entries are emitted manually in
    // server/api/__sitemap__/urls/index.ts (with hreflang) — hence
    // `filter: () => false` keeps these out of auto-emission.
    ...Object.fromEntries(
      (['fr', 'en'] as const).map((locale) => {
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
