import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Signin from '~/pages/signin.vue'

describe('Signin page', () => {
  it('renders signin form with email and password fields', async () => {
    const wrapper = await mountSuspended(Signin)
    expect(wrapper.text()).toContain('Connexion')
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('shows link to signup', async () => {
    const wrapper = await mountSuspended(Signin)
    expect(wrapper.find('a[href="/signup"]').exists()).toBe(true)
  })
})
