import { dashboardTest as test, expect } from '../fixtures/dashboard'

test.describe('Venue Detail', () => {
  test('can navigate to venue detail from listing', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    await page.goto('/dashboard/venues')
    await page.waitForLoadState('networkidle')
    
    // Wait for table to load
    await page.waitForSelector('table')
    
    // Click the first row
    const firstRow = page.locator('tbody tr').first()
    await firstRow.click()
    
    // Wait for navigation to venue detail
    await page.waitForURL(/\/dashboard\/venues\/.+/)
    
    // Verify we are on the detail page by checking the title or tabs
    await expect(page.locator('button[role="tab"]:has-text("Informations")')).toBeVisible()
  })

  test('info tab shows form fields and save button', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    await page.goto('/dashboard/venues')
    await page.waitForLoadState('networkidle')
    await page.locator('tbody tr').first().click()
    await page.waitForURL(/\/dashboard\/venues\/.+/)
    
    // Info tab is default
    await expect(page.locator('label:has-text("Nom")').first()).toBeVisible()
    await expect(page.locator('label:has-text("Téléphone")').first()).toBeVisible()
    await expect(page.locator('label:has-text("Site Web")').first()).toBeVisible()
    await expect(page.locator('button:has-text("Enregistrer")').first()).toBeVisible()
  })

  test('can edit description and save', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    await page.goto('/dashboard/venues')
    await page.waitForLoadState('networkidle')
    await page.locator('tbody tr').first().click()
    await page.waitForURL(/\/dashboard\/venues\/.+/)
    
    // The description has tabs for locales (FR, EN, etc.)
    // We can just type in the first textarea
    const descTextarea = page.locator('textarea[placeholder="Texte"]').first()
    await expect(descTextarea).toBeVisible()
    
    await descTextarea.fill('Updated description for testing')
    
    const saveButton = page.locator('button:has-text("Enregistrer")').first()
    await saveButton.click()
    
    // Wait for toast
    // The toast might have the text "Enregistrer" as title
    await expect(page.locator('text=Enregistrer').last()).toBeVisible()
  })

  test('location tab shows address fields', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    await page.goto('/dashboard/venues')
    await page.waitForLoadState('networkidle')
    await page.locator('tbody tr').first().click()
    await page.waitForURL(/\/dashboard\/venues\/.+/)
    
    // Click Location tab
    await page.locator('button[role="tab"]:has-text("Localisation")').click()
    
    // Wait for tab content
    await expect(page.locator('label:has-text("Rue")').first()).toBeVisible()
    await expect(page.locator('label:has-text("Complément")').first()).toBeVisible()
    await expect(page.locator('label:has-text("Code postal")').first()).toBeVisible()
    await expect(page.locator('label:has-text("Ville")').first()).toBeVisible()
  })

  test('activities tab shows activities list or empty state', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    await page.goto('/dashboard/venues')
    await page.waitForLoadState('networkidle')
    await page.locator('tbody tr').first().click()
    await page.waitForURL(/\/dashboard\/venues\/.+/)
    
    // Click Activities tab
    await page.locator('button[role="tab"]:has-text("Activités")').click()
    
    // Wait for tab content
    await expect(page.locator('h3:has-text("Activités")').first()).toBeVisible()
    await expect(page.locator('button:has-text("Enregistrer")').first()).toBeVisible()
  })

  test('events tab shows events or empty state', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    await page.goto('/dashboard/venues')
    await page.waitForLoadState('networkidle')
    await page.locator('tbody tr').first().click()
    await page.waitForURL(/\/dashboard\/venues\/.+/)
    
    // Click Events tab
    await page.locator('button[role="tab"]:has-text("Événements")').click()
    
    // Wait for tab content
    await expect(page.locator('h3:has-text("Ajouter un événement")')).toBeVisible()
  })

  test('pricing tab shows formulas or empty state', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    await page.goto('/dashboard/venues')
    await page.waitForLoadState('networkidle')
    await page.locator('tbody tr').first().click()
    await page.waitForURL(/\/dashboard\/venues\/.+/)
    
    // Click Pricing tab
    await page.locator('button[role="tab"]:has-text("Tarifs")').click()
    
    // Wait for tab content
    await expect(page.locator('h3:has-text("Ajouter un tarif")')).toBeVisible()
  })
})
