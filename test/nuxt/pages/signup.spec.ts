import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Signup from '~/pages/signup.vue'

describe('Signup page', () => {
  it('renders signup form with email, password and confirm password', async () => {
    const wrapper = await mountSuspended(Signup)
    expect(wrapper.text()).toContain('Inscription')
    const inputs = wrapper.findAll('input[type="password"]')
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(inputs.length).toBe(2)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('shows link to signin', async () => {
    const wrapper = await mountSuspended(Signup)
    const link = wrapper.find('a[href="/signin"]')
    expect(link.exists()).toBe(true)
  })
})
