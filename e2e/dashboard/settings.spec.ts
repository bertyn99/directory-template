import { dashboardTest as test, expect, TEST_ACCOUNTS } from '../fixtures/dashboard'

test.describe('Settings', () => {
  test('profile tab shows form fields with current user data', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    // Check header
    await expect(page.locator('h2', { hasText: 'Paramètres' })).toBeVisible()

    // Check form fields
    await expect(page.locator('input[name="first_name"]')).toBeVisible()
    await expect(page.locator('input[name="last_name"]')).toBeVisible()
    await expect(page.locator('input[name="username"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password_current"]')).toBeVisible()
    await expect(page.locator('input[name="password_new"]')).toBeVisible()

    // Check user data is populated
    await expect(page.locator('input[name="username"]')).toHaveValue(TEST_ACCOUNTS.user.username)
    await expect(page.locator('input[name="email"]')).toHaveValue(TEST_ACCOUNTS.user.email)
  })

  test('email field is read-only/disabled', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[name="email"]')
    await expect(emailInput).toBeDisabled()
  })

  test('can edit firstName and save', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    const firstNameInput = page.locator('input[name="first_name"]')
    await firstNameInput.fill('NewFirstName')

    // Click save button
    await page.locator('button[type="submit"]', { hasText: 'Enregistrer' }).click()

    // Wait for network idle to ensure save is complete
    await page.waitForLoadState('networkidle')
    
    // Verify the value is still there
    await expect(firstNameInput).toHaveValue('NewFirstName')
    
    // Revert back to avoid breaking other tests
    await firstNameInput.fill('')
    await page.locator('button[type="submit"]', { hasText: 'Enregistrer' }).click()
    await page.waitForLoadState('networkidle')
  })

  test('delete account modal opens with confirmation', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    // Click delete account button
    await page.locator('button', { hasText: 'Supprimer le compte' }).first().click()

    // Wait for modal overlay
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Check modal content
    await expect(modal.locator('h3', { hasText: 'Supprimer le compte' })).toBeVisible()
    await expect(modal.locator('button', { hasText: 'Annuler' })).toBeVisible()
  })

  test('delete account cancel closes modal', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/settings')
    await page.waitForLoadState('networkidle')

    await page.locator('button', { hasText: 'Supprimer le compte' }).first().click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Click cancel
    await modal.locator('button', { hasText: 'Annuler' }).click()

    // Modal should be closed
    await expect(modal).not.toBeVisible()
  })

  test('billing tab shows plan information', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/settings/billing')
    await page.waitForLoadState('networkidle')

    // Check heading
    await expect(page.locator('h3', { hasText: 'Facturation' })).toBeVisible()

    // Check plan info
    await expect(page.locator('text=Plan actuel')).toBeVisible()
  })

  test('billing shows upgrade button for free plan OR manage button for pro', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/settings/billing')
    await page.waitForLoadState('networkidle')

    // The user is likely on a free plan by default
    // We can check if either button is visible
    const upgradeBtn = page.locator('button', { hasText: 'Passer à la version Pro' }).first()
    const manageBtn = page.locator('button', { hasText: "Gérer l'abonnement" }).first()

    // Wait for either to be visible
    await expect(upgradeBtn.or(manageBtn)).toBeVisible()
  })
})
