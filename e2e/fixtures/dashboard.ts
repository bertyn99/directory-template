import { test as base, expect, type Page } from '@playwright/test'

/**
 * Dashboard E2E Fixtures
 *
 * Provides seeded test accounts and authenticated page helpers
 * for testing dashboard pages by role.
 *
 * Seeded accounts (from pnpm seed):
 *   - admin@example.com  / AdminPassword123!  (role: admin)
 *   - user@example.com   / UserPassword123!   (role: user)
 *   - coach@example.com  / UserPassword123!   (role: user)
 */

// ─── Seeded test accounts ────────────────────────────────────────────────────

export const TEST_ACCOUNTS = {
  admin: {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    username: 'admin',
    role: 'admin' as const,
  },
  user: {
    email: 'user@example.com',
    password: 'UserPassword123!',
    username: 'testuser',
    role: 'user' as const,
  },
  coach: {
    email: 'coach@example.com',
    password: 'UserPassword123!',
    username: 'coach',
    role: 'user' as const,
  },
} as const

export type TestAccount = (typeof TEST_ACCOUNTS)[keyof typeof TEST_ACCOUNTS]
type Role = keyof typeof TEST_ACCOUNTS

// ─── Fixture venueCategories ───────────────────────────────────────────────────────────

type DashboardFixtures = {
  /** Logs in as the specified role and returns the authenticated page */
  loginAs: (role: Role) => Promise<Page>
  /** Sidebar navigation helper */
  sidebarNavigate: (label: string) => Promise<void>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function doLogin(page: Page, account: TestAccount): Promise<void> {
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', account.email)
  await page.fill('input[type="password"]', account.password)
  await page.click('button[type="submit"]')

  // Wait for post-login redirect (dashboard or onboarding)
  await page.waitForURL(/\/(dashboard|onboarding|venues|categories)/, {
    timeout: 15_000,
  })
}

// ─── Fixture definition ──────────────────────────────────────────────────────

export const dashboardTest = base.extend<DashboardFixtures>({
  loginAs: async ({ browser }, use) => {
    const pages: Page[] = []

    const loginAs = async (role: Role): Promise<Page> => {
      const account = TEST_ACCOUNTS[role]
      const context = await browser.newContext()
      const page = await context.newPage()

      await doLogin(page, account)
      pages.push(page)
      return page
    }

    await use(loginAs)

    // Cleanup: close all opened pages
    for (const p of pages) {
      const ctx = p.context()
      await ctx.close().catch(() => {})
    }
  },

  sidebarNavigate: async ({ page }, use) => {
    const sidebarNavigate = async (label: string): Promise<void> => {
      // Click sidebar link by visible text (French labels from i18n)
      const link = page.locator(`nav a:has-text("${label}")`).first()
      await link.click()
      await page.waitForLoadState('networkidle')
    }

    await use(sidebarNavigate)
  },
})

export { expect }
