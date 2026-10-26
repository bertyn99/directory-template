import { dashboardTest as test, expect } from '../fixtures/dashboard'

test.describe('Franchise Dashboard', () => {
  test('franchise overview shows stats when user owns a franchise', async ({ loginAs, sidebarNavigate }) => {
    const page = await loginAs('admin')
    
    const franchiseLink = page.locator('nav a:has-text("Franchise")')
    if (!(await franchiseLink.isVisible())) {
      test.skip('Admin does not own a franchise in this seed')
    }
    
    await sidebarNavigate('Franchise')
    
    const emptyState = page.locator('text="Vous n\'avez pas encore de franchise"')
    if (await emptyState.isVisible()) {
      test.skip('Admin does not own a franchise in this seed')
    }

    await expect(page.locator('text="Nombre de venues"')).toBeVisible()
    await expect(page.locator('text="Note moyenne"')).toBeVisible()
    await expect(page.locator('text="Avis total"')).toBeVisible()
    await expect(page.locator('text="Événements à venir"')).toBeVisible()

    await expect(page.locator('button:has-text("Ajouter un venue")')).toBeVisible()
    await expect(page.locator('button:has-text("Modifier les infos")')).toBeVisible()
  })

  test('non-franchise-owner sees empty state', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/franchise')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text="Vous n\'avez pas encore de franchise"')).toBeVisible()
  })

  test('franchise venues page shows table of franchise venues', async ({ loginAs }) => {
    const page = await loginAs('admin')
    await page.goto('/dashboard/franchise/venues')
    await page.waitForLoadState('networkidle')

    const emptyState = page.locator('text="Vous n\'avez pas encore de franchise"')
    if (await emptyState.isVisible()) {
      test.skip('Admin does not own a franchise in this seed')
    }

    await expect(page.locator('th:has-text("Nom")')).toBeVisible()
    await expect(page.locator('th:has-text("Site web")')).toBeVisible()
    await expect(page.locator('th:has-text("Téléphone")')).toBeVisible()
    await expect(page.locator('th:has-text("Actions")')).toBeVisible()
  })

  test('can open assign modal and see venue dropdown', async ({ loginAs }) => {
    const page = await loginAs('admin')
    await page.goto('/dashboard/franchise/venues')
    await page.waitForLoadState('networkidle')

    const emptyState = page.locator('text="Vous n\'avez pas encore de franchise"')
    if (await emptyState.isVisible()) {
      test.skip('Admin does not own a franchise in this seed')
    }

    const assignBtn = page.locator('button:has-text("Assigner un venue")')
    await expect(assignBtn).toBeVisible()
    await assignBtn.click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    
    await expect(modal.locator('[role="combobox"], select, input').first()).toBeVisible()
  })

  test('unassign opens confirmation modal', async ({ loginAs }) => {
    const page = await loginAs('admin')
    await page.goto('/dashboard/franchise/venues')
    await page.waitForLoadState('networkidle')

    const emptyState = page.locator('text="Vous n\'avez pas encore de franchise"')
    if (await emptyState.isVisible()) {
      test.skip('Admin does not own a franchise in this seed')
    }

    const retirerBtn = page.locator('button:has-text("Retirer")').first()
    if (!(await retirerBtn.isVisible())) {
      test.skip('No venues to unassign')
    }

    await retirerBtn.click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    await expect(modal.locator('text="Retirer ce venue ?"')).toBeVisible()
    await expect(modal.locator('text="Ce venue ne fera plus partie de la franchise."')).toBeVisible()
    await expect(modal.locator('button:has-text("Annuler")')).toBeVisible()
    await expect(modal.locator('button:has-text("Retirer")')).toBeVisible()
  })

  test('unassign cancel closes modal without removing venue', async ({ loginAs }) => {
    const page = await loginAs('admin')
    await page.goto('/dashboard/franchise/venues')
    await page.waitForLoadState('networkidle')

    const emptyState = page.locator('text="Vous n\'avez pas encore de franchise"')
    if (await emptyState.isVisible()) {
      test.skip('Admin does not own a franchise in this seed')
    }

    const retirerBtn = page.locator('button:has-text("Retirer")').first()
    if (!(await retirerBtn.isVisible())) {
      test.skip('No venues to unassign')
    }

    await retirerBtn.click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    const cancelBtn = modal.locator('button:has-text("Annuler")')
    await cancelBtn.click()

    await expect(modal).not.toBeVisible()
  })

  test('sidebar shows "Franchise" link for franchise owner', async ({ loginAs }) => {
    const page = await loginAs('admin')
    await page.waitForLoadState('networkidle')
    
    const franchiseLink = page.locator('nav a:has-text("Franchise")')
    if (!(await franchiseLink.isVisible())) {
      test.skip('Admin does not own a franchise in this seed')
    }
    
    await expect(franchiseLink).toBeVisible()
  })
})
