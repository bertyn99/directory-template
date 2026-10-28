import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import VenueBookingCta from '~~/app/components/venue/BookingCta.vue'
import type { BookingPartnerConfig } from '~~/directory.config'

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'fr' },
}))

const PLAYTOMIC: BookingPartnerConfig = {
  id: 'playtomic',
  label: { fr: 'Réserver sur Playtomic', en: 'Book on Playtomic' },
  hosts: ['playtomic.com'],
  sponsored: true,
}

const OPENPLAY: BookingPartnerConfig = {
  id: 'openplay',
  label: { fr: 'Openplay' },
  hosts: ['openplay.fr'],
  sponsored: false,
}

describe('BookingCta', () => {
  const mountComponent = (props: {
    bookingUrl?: string | null
    bookingPartner?: string | null
    partners?: readonly BookingPartnerConfig[]
  }) =>
    mount(VenueBookingCta, {
      props,
      global: {
        stubs: {
          UButton: {
            template: '<a :href="href" :rel="rel" data-test="cta"><slot /></a>',
            props: ['href', 'rel', 'target', 'icon', 'trailingIcon', 'color'],
          },
        },
      },
    })

  it('renders nothing without a booking URL', () => {
    const wrapper = mountComponent({ bookingUrl: null, partners: [PLAYTOMIC] })

    expect(wrapper.find('[data-test="cta"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('affiliate.disclosure')
  })

  it('renders a plain outbound link (rel noopener + i18n label) for an unmatched URL', () => {
    const wrapper = mountComponent({
      bookingUrl: 'https://example.com/club/123',
      partners: [PLAYTOMIC],
    })

    const cta = wrapper.get('[data-test="cta"]')
    expect(cta.attributes('href')).toBe('https://example.com/club/123')
    expect(cta.attributes('rel')).toBe('noopener')
    // No partner matched ⇒ the i18n default label, no sponsored disclosure.
    expect(wrapper.text()).toContain('venues.bookingCta')
    expect(wrapper.text()).not.toContain('affiliate.disclosure')
  })

  it('does not match a host suffix that is not a subdomain', () => {
    const wrapper = mountComponent({
      bookingUrl: 'https://notplaytomic.com/club',
      partners: [PLAYTOMIC],
    })

    expect(wrapper.get('[data-test="cta"]').attributes('rel')).toBe('noopener')
  })

  it('resolves a host-matched sponsored partner (rel + disclosure + localized label)', () => {
    const wrapper = mountComponent({
      bookingUrl: 'https://www.venues.playtomic.com/club/123',
      partners: [PLAYTOMIC],
    })

    const cta = wrapper.get('[data-test="cta"]')
    expect(cta.attributes('rel')).toBe('sponsored noopener noreferrer')
    expect(wrapper.text()).toContain('affiliate.disclosure')
    // Partner label (fr) wins over the i18n default.
    expect(wrapper.text()).toContain('Réserver sur Playtomic')
    expect(wrapper.text()).not.toContain('venues.bookingCta')
  })

  it('resolves by partner id before the host match', () => {
    const wrapper = mountComponent({
      bookingUrl: 'https://example.com/whatever',
      bookingPartner: 'openplay',
      partners: [PLAYTOMIC, OPENPLAY],
    })

    const cta = wrapper.get('[data-test="cta"]')
    // openplay matched by id (host example.com matches nothing) — not sponsored.
    expect(cta.attributes('rel')).toBe('noopener')
    expect(wrapper.text()).toContain('Openplay')
    expect(wrapper.text()).not.toContain('affiliate.disclosure')
  })

  it('marks sponsored when the id matches a sponsored partner on an unmatched host', () => {
    const wrapper = mountComponent({
      bookingUrl: 'https://booking.example-partner.com/x',
      bookingPartner: 'playtomic',
      partners: [PLAYTOMIC, OPENPLAY],
    })

    expect(wrapper.get('[data-test="cta"]').attributes('rel')).toBe(
      'sponsored noopener noreferrer',
    )
    expect(wrapper.text()).toContain('affiliate.disclosure')
  })
})
