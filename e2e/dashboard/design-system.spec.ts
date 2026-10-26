import { dashboardTest as test, expect } from '../fixtures/dashboard'

// Design-system invariants for the NEUTRAL base theme. The template ships no
// brand palette: primary/secondary resolve to Tailwind's built-in `slate` via
// app/app.config.ts, Manrope serves both body and display roles, corners are
// rounded-sm (2px max) and depth comes from borders, never shadows.
// Niche apps re-theme colors/fonts at instantiation (see docs/design-system.md)
// and should revisit the font/color expectations here when they do.
test.describe('Design System Compliance', () => {
  const pagesToCheck = [
    '/dashboard',
    '/dashboard/venues',
    '/dashboard/settings'
  ]

  test('no forbidden border-radius classes on any dashboard page', async ({ loginAs }) => {
    const page = await loginAs('user')

    for (const path of pagesToCheck) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const forbiddenRounded = await page.evaluate(() => {
        const all = document.querySelectorAll('[class*="rounded-lg"], [class*="rounded-full"], [class*="rounded-xl"], [class*="rounded-2xl"], [class*="rounded-3xl"]')
        return all.length
      })

      expect(forbiddenRounded).toBe(0)
    }
  })

  test('no shadow classes on any dashboard page', async ({ loginAs }) => {
    const page = await loginAs('user')

    for (const path of pagesToCheck) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const forbiddenShadows = await page.evaluate(() => {
        const all = document.querySelectorAll('[class*="shadow-lg"], [class*="shadow-md"], [class*="shadow-sm"], [class*="shadow-xl"], [class*="shadow-2xl"], [class~="shadow"]')
        return all.length
      })

      expect(forbiddenShadows).toBe(0)
    }
  })

  test('heading elements resolve to the display font stack (Manrope in the base theme)', async ({ loginAs }) => {
    const page = await loginAs('user')

    for (const path of pagesToCheck) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const nonCompliantFont = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        let count = 0

        for (const h of headings) {
          const style = window.getComputedStyle(h)
          const fontFamily = style.fontFamily.toLowerCase()

          // Base template: --font-display falls back to Manrope, so headings
          // must resolve to Manrope (no custom display face shipped).
          if (!fontFamily.includes('manrope')) {
            count++
          }
        }

        return count
      })

      expect(nonCompliantFont).toBe(0)
    }
  })

  test('body text uses Manrope font', async ({ loginAs }) => {
    const page = await loginAs('user')

    for (const path of pagesToCheck) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const bodyFontCompliance = await page.evaluate(() => {
        const style = window.getComputedStyle(document.body)
        const fontFamily = style.fontFamily.toLowerCase()

        return fontFamily.includes('manrope')
      })

      expect(bodyFontCompliance).toBe(true)
    }
  })

  test('headings are uppercase', async ({ loginAs }) => {
    const page = await loginAs('user')

    for (const path of pagesToCheck) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      const nonCompliantTransform = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        let count = 0

        for (const h of headings) {
          const style = window.getComputedStyle(h)
          const textTransform = style.textTransform

          if (textTransform !== 'uppercase') {
            const text = h.textContent?.trim() || ''
            if (text.length > 0 && text !== text.toUpperCase()) {
              count++
            }
          }
        }

        return count
      })

      expect(nonCompliantTransform).toBe(0)
    }
  })

  test('no legacy brand colors are rendered on any dashboard page', async ({ loginAs }) => {
    const page = await loginAs('user')

    for (const path of pagesToCheck) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')

      // Regression guard for the neutral base theme: nothing may still render
      // the old extracted-app brand red — the legacy hex (230, 57, 70) and its
      // AA-darkened solid-button shade (204, 43, 57).
      const legacyBrandColors = await page.evaluate(() => {
        const legacy = new Set(['rgb(230, 57, 70)', 'rgb(204, 43, 57)'])
        let count = 0

        for (const el of Array.from(document.querySelectorAll('*'))) {
          const bg = window.getComputedStyle(el).backgroundColor
          if (legacy.has(bg)) count++
        }

        return count
      })

      expect(legacyBrandColors).toBe(0)
    }
  })
})
