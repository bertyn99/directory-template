import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from '~~/app/components/base/ConfirmDialog.vue'

describe('ConfirmDialog', () => {
  const mountComponent = (props: { title?: string; description?: string } = {}) =>
    mount(ConfirmDialog, {
      props,
      global: {
        stubs: {
          UModal: {
            template: `
              <div class="modal-stub">
                <div data-test="title">{{ title }}</div>
                <div data-test="description">{{ description }}</div>
                <slot name="footer" />
              </div>
            `,
            props: ['title', 'description', 'dismissible', 'ui'],
          },
          UButton: {
            template: '<button :data-test="label" @click="$emit(\'click\')">{{ label }}</button>',
            props: ['label', 'color', 'variant', 'ui'],
            emits: ['click'],
          },
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

  it('mounts with title and description props', async () => {
    const wrapper = await mountComponent({
      title: 'Delete Venue',
      description: 'Are you sure?',
    })

    expect(wrapper.html()).toContain('Delete Venue')
    expect(wrapper.html()).toContain('Are you sure?')
  })

  it('renders without title/description (optional props)', async () => {
    const wrapper = await mountComponent()

    expect(wrapper.find('.modal-stub').exists()).toBe(true)
  })

  it('emits close with false when cancel button is clicked', async () => {
    const wrapper = await mountComponent({ title: 'Confirm' })

    const buttons = wrapper.findAll('button')
    const cancelButton = buttons.find(btn => btn.text() === 'dashboard.venue.cancel')
    expect(cancelButton).toBeDefined()
    await cancelButton?.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')![0]).toEqual([false])
  })

  it('emits close with true when delete button is clicked', async () => {
    const wrapper = await mountComponent({ title: 'Confirm' })

    const buttons = wrapper.findAll('button')
    const deleteButton = buttons.find(btn => btn.text() === 'dashboard.venue.delete')
    expect(deleteButton).toBeDefined()
    await deleteButton?.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')![0]).toEqual([true])
  })

  it('uses i18n keys for button labels', async () => {
    const wrapper = await mountComponent({ title: 'Test' })

    const buttons = wrapper.findAll('button')
    expect(buttons[0].text()).toBe('dashboard.venue.cancel')
    expect(buttons[1].text()).toBe('dashboard.venue.delete')
  })
})
