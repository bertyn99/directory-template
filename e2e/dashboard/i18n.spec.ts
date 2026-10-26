import { dashboardTest as test, expect } from '../fixtures/dashboard'

test.describe('Dashboard i18n — French (default) vs English', () => {
  // ─── French (default, no URL prefix) ────────────────────────────────────────

  test('French: overview page shows French nav labels', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard')

    // Sidebar nav labels — French
    await expect(page.locator('nav').getByText('Accueil')).toBeVisible()
    await expect(page.locator('nav').getByText('Venues')).toBeVisible()
    await expect(page.locator('nav').getByText('Paramètres')).toBeVisible()
  })

  test('French: overview page shows French heading', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard')
    await page.waitForURL('**/dashboard')

    // Page title — "Tableau de bord"
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
  })

  test('French: venues page shows French table headers', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/venues')
    await page.waitForURL('**/dashboard/venues')

    // Table column headers in French
    await expect(page.getByRole('columnheader', { name: 'Nom' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Ville' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Statut' })).toBeVisible()
  })

  test('French: venues page shows French page title', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/venues')
    await page.waitForURL('**/dashboard/venues')

    await expect(page.getByRole('heading', { name: 'Mes venues' })).toBeVisible()
  })

  // ─── English (prefix /en/) ─────────────────────────────────────────────────

  test('English: overview page shows English nav labels', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/en/dashboard')
    await page.waitForURL('**/en/dashboard')

    // Sidebar nav labels — English
    await expect(page.locator('nav').getByText('Home')).toBeVisible()
    await expect(page.locator('nav').getByText('Venues')).toBeVisible()
    await expect(page.locator('nav').getByText('Settings')).toBeVisible()
  })

  test('English: overview page shows English heading', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/en/dashboard')
    await page.waitForURL('**/en/dashboard')

    // Page title — "Dashboard" (English)
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('English: venues page shows English table headers', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/en/dashboard/venues')
    await page.waitForURL('**/en/dashboard/venues')

    // Table column headers in English
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'City' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible()
  })

  test('English: venues page shows English page title', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/en/dashboard/venues')
    await page.waitForURL('**/en/dashboard/venues')

    await expect(page.getByRole('heading', { name: 'My Venues' })).toBeVisible()
  })

  test('English: settings page shows English title', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/en/dashboard/settings')
    await page.waitForURL('**/en/dashboard/settings')

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  // ─── Key text differs between locales ──────────────────────────────────────

  test('overview heading changes between French and English', async ({ loginAs }) => {
    const frPage = await loginAs('user')
    await frPage.goto('/dashboard')
    await frPage.waitForURL('**/dashboard')

    // French heading must exist
    const frHeading = frPage.getByRole('heading', { name: 'Tableau de bord' })
    await expect(frHeading).toBeVisible()

    // Switch to English
    const enPage = await loginAs('user')
    await enPage.goto('/en/dashboard')
    await enPage.waitForURL('**/en/dashboard')

    // English heading must exist and differ from French
    const enHeading = enPage.getByRole('heading', { name: 'Dashboard' })
    await expect(enHeading).toBeVisible()

    // Verify French-specific text is NOT present in English version
    await expect(enPage.getByRole('heading', { name: 'Tableau de bord' })).toHaveCount(0)
  })
})
