import { describe, expect, it } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import UApp from '@nuxt/ui/components/App.vue'
import DashboardChart from '~~/app/components/dashboard/DashboardChart.vue'

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'fr' },
}))

const sample = [
  { month: 'Jan', reviews: 10 },
  { month: 'Feb', reviews: 20 },
  { month: 'Mar', reviews: 15 },
]

describe('DashboardChart', () => {
  it('renders an SVG chart from review data', async () => {
    const wrapper = await mountSuspended({
      components: { UApp, DashboardChart },
      setup() {
        return { sample }
      },
      template: `
        <UApp>
          <DashboardChart :data="sample" :height="240" />
        </UApp>
      `,
    })

    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.get('[aria-label]').attributes('aria-label')).toBe('dashboard.chart.reviews')
  })
})
