import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import VenueFilters from '~~/app/components/venue/Filters.vue'

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'fr' },
}))

// Filters.vue fetches countries/cities/categories on mount — keep the
// component test off the network.
vi.stubGlobal('$fetch', vi.fn(() => Promise.resolve({})))

describe('VenueFilters — facet controls from config', () => {
  const mountFilters = (selectedFacets: Record<string, string> = {}) =>
    mount(VenueFilters, {
      props: { selectedFacets },
      global: {
        // The template renders through the global $t, the script through the
        // mocked useI18n composable — both map keys to themselves.
        mocks: { $t: (key: string) => key },
        stubs: {
          UCard: { template: '<div data-test="card"><slot /></div>', props: ['class'] },
          UFormField: {
            template: '<div data-test="form-field" :data-label="label"><slot /></div>',
            props: ['label', 'name', 'ui'],
          },
          UInput: {
            template: '<input data-test="input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['modelValue', 'placeholder', 'icon', 'class'],
            emits: ['update:modelValue'],
          },
          USelectMenu: {
            template: `<div data-test="select">
              <button
                v-for="item in items"
                :key="item.value ?? item.id ?? item.slug"
                :data-test="'option-' + (item.value ?? item.id ?? item.slug)"
                @click="$emit('update:modelValue', item)"
              >{{ item.label ?? item.name }}</button>
              <button data-test="clear" @click="$emit('update:modelValue', null)">clear</button>
            </div>`,
            props: ['items', 'modelValue', 'placeholder', 'by', 'clear', 'multiple', 'searchTerm', 'ignoreFilter', 'loading', 'labelKey', 'class'],
            emits: ['update:modelValue', 'update:searchTerm'],
          },
          USwitch: {
            template: '<button data-test="switch" :data-checked="String(modelValue)" @click="$emit(\'update:modelValue\', !modelValue)" />',
            props: ['modelValue'],
            emits: ['update:modelValue'],
          },
          UButton: {
            template: '<button data-test="button" @click="$emit(\'click\')">{{ label }}</button>',
            props: ['label', 'color', 'variant', 'class'],
            emits: ['click'],
          },
        },
      },
    })

  it('renders one control per filterable config facet', () => {
    const wrapper = mountFilters()

    const labels = wrapper
      .findAll('[data-test="form-field"]')
      .map(node => node.attributes('data-label'))

    // Shipped sample taxonomy.facets (all filterable) — booleans label at
    // facet.<key>, enums at facet.<key>.label.
    expect(labels).toContain('facet.group-classes')
    expect(labels).toContain('facet.open-sundays')
    expect(labels).toContain('facet.ambiance.label')
  })

  it('renders boolean facets as a switch, enum facets as a select with whitelisted value labels', () => {
    const wrapper = mountFilters()

    expect(wrapper.find('[data-test="switch"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="option-family"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="option-performance"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="option-relaxed"]').exists()).toBe(true)
    // Value labels resolve through the facet.<key>.<value> i18n keys.
    expect(wrapper.find('[data-test="option-family"]').text()).toBe('facet.ambiance.family')
  })

  it('reflects a facet selection passed via the model', () => {
    const wrapper = mountFilters({ 'group-classes': 'true', ambiance: 'family' })

    expect(wrapper.find('[data-test="switch"]').attributes('data-checked')).toBe('true')
  })

  it('toggling a boolean switch emits the updated facet model', async () => {
    const wrapper = mountFilters()

    await wrapper.find('[data-test="switch"]').trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('update:selectedFacets')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1][0]).toEqual({ 'group-classes': 'true' })
  })

  it('selecting an enum value emits it under the facet key; clearing removes it', async () => {
    const wrapper = mountFilters({ ambiance: 'family' })

    await wrapper.find('[data-test="option-performance"]').trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('update:selectedFacets')!
    expect(emitted[emitted.length - 1][0]).toEqual({ ambiance: 'performance' })

    // The enum facet's select is the LAST USelectMenu rendered (facet controls
    // come after country/city/activities); its clear button emits a null
    // payload, exactly like USelectMenu's clear.
    const clearButtons = wrapper.findAll('[data-test="clear"]')
    await clearButtons[clearButtons.length - 1]!.trigger('click')
    await flushPromises()

    const afterClear = wrapper.emitted('update:selectedFacets')!
    expect(afterClear[afterClear.length - 1][0]).toEqual({})
  })
})
