import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const mockOpen = vi.fn(() => Promise.resolve(true))
const mockCreate = vi.fn(() => ({ open: mockOpen }))

// mockNuxtImport replaces the auto-imported value
// The factory must return the actual mock value (a function in this case)
mockNuxtImport('useOverlay', () => () => ({ create: mockCreate }))

describe('useConfirmDialog', () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockOpen.mockClear()
    mockOpen.mockImplementation(() => Promise.resolve(true))
    mockCreate.mockImplementation(() => ({ open: mockOpen }))
  })

  it('returns a function when called', async () => {
    const { useConfirmDialog } = await import('~~/app/composables/useConfirmDialog')
    const confirm = useConfirmDialog()
    expect(typeof confirm).toBe('function')
  })

  it('calls overlay.create with correct options when invoked', async () => {
    const { useConfirmDialog } = await import('~~/app/composables/useConfirmDialog')
    const confirm = useConfirmDialog()

    const options = { title: 'Delete Item', description: 'This cannot be undone' }
    await confirm(options)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.anything(),
      {
        destroyOnClose: true,
        props: options,
      },
    )
  })

  it('returns the result of modal.open()', async () => {
    mockOpen.mockResolvedValueOnce(false)

    const { useConfirmDialog } = await import('~~/app/composables/useConfirmDialog')
    const confirm = useConfirmDialog()

    const result = await confirm({ title: 'Test' })
    expect(result).toBe(false)
  })

  it('works with only required title (no description)', async () => {
    const { useConfirmDialog } = await import('~~/app/composables/useConfirmDialog')
    const confirm = useConfirmDialog()

    await confirm({ title: 'Confirm Action' })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        props: { title: 'Confirm Action' },
      }),
    )
  })
})
