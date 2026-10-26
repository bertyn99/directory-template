// Unlighthouse bench config — mobile-first, performance-only.
// Usage: BENCH_SITE=https://example-directory.com npx unlighthouse
// The runner script (run.sh) sets BENCH_SITE and runs from this directory.
export default {
  // WSL guard: never let unlighthouse auto-resolve the Windows interop Chrome.
  puppeteerOptions: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
  },

  site: process.env.BENCH_SITE || 'https://example-directory.com',

  scanner: {
    // Representative page set: landing, blog listing + post, categories listing +
    // hub + guide, country listing + city hub, venues listing.
    include: [
      '/',
      '/blog',
      '/categories',
      '/categories/yoga',
      '/categories/spa',
      '/categories/spa/*',
      '/country',
      '/country/france',
      '/country/france/*',
      '/venues',
    ],
    samples: 1,
    throttle: true,
    // Bound runtime; i18n dedupe (x-default) usually trims /en copies.
    maxRoutes: 24,
  },

  lighthouseOptions: {
    // Default device is already mobile; performance-only keeps scans fast.
    onlyCategories: ['performance'],
  },
}
