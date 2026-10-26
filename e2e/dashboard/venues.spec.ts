import { dashboardTest as test, expect } from '../fixtures/dashboard'

test.describe('Venue Management', () => {
  const mockVenues = [
    {
      id: 1,
      name: 'Fitness Studio Centrum',
      slug: 'fitness-studio-centrum',
      statusCode: 'active',
      rating: 4.5,
      updatedAt: '2026-06-01T10:00:00.000Z',
      cityName: 'Paris',
      franchiseId: null
    },
    {
      id: 2,
      name: 'Yoga Loft',
      slug: 'yoga-loft',
      statusCode: 'closed',
      rating: { average: 4.8 },
      updatedAt: '2026-05-15T10:00:00.000Z',
      cityName: 'Lyon',
      franchiseId: 1
    }
  ]

  test.beforeEach(async ({ page }) => {
    await page.route('/api/users/venues', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockVenues })
        })
      } else {
        await route.continue()
      }
    })
  })

  test('venue listing page loads with table', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/venues')
    
    await expect(page.getByRole('heading', { name: 'Mes venues' })).toBeVisible()
    await expect(page.getByText('Gérez et consultez tous vos venues')).toBeVisible()
    
    await expect(page.getByRole('cell', { name: 'Nom' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Ville' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Statut' })).toBeVisible()
    
    await expect(page.getByText('Fitness Studio Centrum')).toBeVisible()
    await expect(page.getByText('Yoga Loft')).toBeVisible()
  })

  test('search input filters venues by name', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/venues')
    
    await expect(page.getByText('Fitness Studio Centrum')).toBeVisible()
    await expect(page.getByText('Yoga Loft')).toBeVisible()
    
    const searchInput = page.getByPlaceholder('Rechercher un venue…')
    await expect(searchInput).toBeVisible()
    await searchInput.fill('Fitness')
    
    await expect(page.getByText('Fitness Studio Centrum')).toBeVisible()
    await expect(page.getByText('Yoga Loft')).not.toBeVisible()
  })

  test('status filter dropdown works', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/venues')
    
    await expect(page.getByText('Fitness Studio Centrum')).toBeVisible()
    await expect(page.getByText('Yoga Loft')).toBeVisible()
    
    const statusFilter = page.getByRole('button', { name: 'Tous' })
    await expect(statusFilter).toBeVisible()
    await statusFilter.click()
    
    const activeOption = page.getByText('Actif', { exact: true })
    await expect(activeOption).toBeVisible()
    await activeOption.click()
    
    await expect(page.getByText('Fitness Studio Centrum')).toBeVisible()
    await expect(page.getByText('Yoga Loft')).not.toBeVisible()
  })

  test('delete venue modal opens, cancel closes it without deleting', async ({ loginAs }) => {
    const page = await loginAs('user')
    await page.goto('/dashboard/venues')
    
    await expect(page.getByText('Fitness Studio Centrum')).toBeVisible()
    
    const row = page.locator('tr', { hasText: 'Fitness Studio Centrum' })
    const actionsBtn = row.locator('button')
    await expect(actionsBtn).toBeVisible()
    await actionsBtn.click()
    
    const deleteMenuItem = page.getByRole('menuitem', { name: 'Supprimer' })
    await expect(deleteMenuItem).toBeVisible()
    await deleteMenuItem.click()
    
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await expect(modal.getByText('Supprimer ce venue ?')).toBeVisible()
    await expect(modal.getByText('Cette action est irréversible. Toutes les données du venue seront perdues.')).toBeVisible()
    
    const cancelBtn = modal.getByRole('button', { name: 'Annuler' })
    await expect(cancelBtn).toBeVisible()
    await cancelBtn.click()
    
    await expect(modal).not.toBeVisible()
    await expect(page.getByText('Fitness Studio Centrum')).toBeVisible()
  })

  test('delete venue confirmation removes venue from table', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    await page.route('/api/users/venues/1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
      } else {
        await route.continue()
      }
    })
    
    let isDeleted = false
    await page.route('/api/users/venues', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: isDeleted ? [mockVenues[1]] : mockVenues })
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/dashboard/venues')
    
    await expect(page.getByText('Fitness Studio Centrum')).toBeVisible()
    
    const row = page.locator('tr', { hasText: 'Fitness Studio Centrum' })
    const actionsBtn = row.locator('button')
    await expect(actionsBtn).toBeVisible()
    await actionsBtn.click()
    
    const deleteMenuItem = page.getByRole('menuitem', { name: 'Supprimer' })
    await expect(deleteMenuItem).toBeVisible()
    await deleteMenuItem.click()
    
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    
    isDeleted = true
    
    const confirmBtn = modal.getByRole('button', { name: 'Supprimer' })
    await expect(confirmBtn).toBeVisible()
    await confirmBtn.click()
    
    await expect(modal).not.toBeVisible()
    await expect(page.getByText('Venue supprimé')).toBeVisible()
    await expect(page.getByText('Fitness Studio Centrum')).not.toBeVisible()
  })

  test('empty state when user has no venues', async ({ loginAs }) => {
    const page = await loginAs('user')
    
    await page.route('/api/users/venues', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] })
        })
      } else {
        await route.continue()
      }
    })
    
    await page.goto('/dashboard/venues')
    
    await expect(page.getByText("Vous n'avez pas encore de venues")).toBeVisible()
    
    const createBtn = page.getByRole('button', { name: 'Créer votre premier venue' })
    await expect(createBtn).toBeVisible()
  })
})
