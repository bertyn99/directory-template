import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AuthForm from '~~/app/components/AuthForm.vue'

describe('AuthForm', () => {
  const defaultStubs = {
    UIcon: {
      template: '<span data-test="icon"><slot /></span>',
      props: ['name', 'class'],
    },
    UContainer: {
      template: '<div data-test="container" class="container-stub"><slot /></div>',
      props: ['class'],
    },
    UButton: {
      template: `
        <button
          data-test="button"
          :disabled="disabled"
          :type="type"
          :color="color"
          :icon="icon"
          :block="block"
          :label="label"
          @click="$emit('click')"
        >
          <slot>{{ label }}</slot>
        </button>
      `,
      props: ['type', 'disabled', 'color', 'icon', 'block', 'label', 'trailing', 'dynamic'],
      emits: ['click'],
    },
    UDivider: {
      template: '<hr data-test="divider" />',
      props: ['label'],
    },
    UForm: {
      template: '<form data-test="form" @submit.prevent="$emit(\'submit\', $event)"><slot /></form>',
      props: ['state', 'schema', 'class'],
      emits: ['submit', 'error'],
    },
    UFormField: {
      template: '<div data-test="form-field"><slot /></div>',
      props: ['label', 'name'],
    },
    UInput: {
      template: '<input data-test="input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
      props: ['modelValue', 'placeholder', 'type', 'ui'],
      emits: ['update:modelValue'],
    },
  }

  const mountAuthForm = (props: Record<string, unknown> = {}) =>
    mount(AuthForm, {
      props: {
        title: 'Sign In',
        ...props,
      },
      global: {
        stubs: defaultStubs,
      },
    })

  it('renders the title', async () => {
    const wrapper = await mountAuthForm({ title: 'Login to your account' })

    expect(wrapper.html()).toContain('Login to your account')
  })

  it('renders the description when provided', async () => {
    const wrapper = await mountAuthForm({ description: 'Enter your credentials' })

    expect(wrapper.html()).toContain('Enter your credentials')
  })

  it('renders default email and password fields', async () => {
    const wrapper = await mountAuthForm()

    const inputs = wrapper.findAll('[data-test="input"]')
    expect(inputs.length).toBe(2)
  })

  it('renders custom fields when provided', async () => {
    const wrapper = await mountAuthForm({
      fields: [
        { label: 'Username', type: 'text', placeholder: 'Enter username' },
        { label: 'Email', type: 'email', placeholder: 'Enter email' },
        { label: 'Password', type: 'password', placeholder: 'Enter password' },
      ],
    })

    const inputs = wrapper.findAll('[data-test="input"]')
    expect(inputs.length).toBe(3)
  })

  it('renders submit button with custom label', async () => {
    const wrapper = await mountAuthForm({ submitButton: 'Create Account' })

    const button = wrapper.find('[type="submit"]')
    expect(button.text()).toContain('Create Account')
  })

  it('renders submit button with default "Submit" text when no label provided', async () => {
    const wrapper = await mountAuthForm()

    const button = wrapper.find('[type="submit"]')
    expect(button.text()).toContain('Submit')
  })

  it('disables submit button when loading is true', async () => {
    const wrapper = await mountAuthForm({ loading: true })

    const button = wrapper.find('[type="submit"]')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('does not disable submit button when loading is false', async () => {
    const wrapper = await mountAuthForm({ loading: false })

    const button = wrapper.find('[type="submit"]')
    expect(button.attributes('disabled')).toBeUndefined()
  })

  it('renders provider buttons when providers are provided', async () => {
    const clickSpy = vi.fn()
    const wrapper = await mountAuthForm({
      providers: [
        { label: 'Google', icon: 'i-google', color: 'red', click: clickSpy },
        { label: 'GitHub', icon: 'i-github', color: 'black', click: vi.fn() },
      ],
    })

    const buttons = wrapper.findAll('[data-test="button"]')
    // 2 provider buttons + 1 submit button
    expect(buttons.length).toBe(3)
  })

  it('emits submit event when form is submitted', async () => {
    const wrapper = await mountAuthForm({
      fields: [
        { label: 'Email', type: 'email', placeholder: 'Enter email' },
        { label: 'Password', type: 'password', placeholder: 'Enter password' },
      ],
    })

    const form = wrapper.find('[data-test="form"]')
    await form.trigger('submit')

    expect(wrapper.emitted('submit')).toBeTruthy()
  })
})
