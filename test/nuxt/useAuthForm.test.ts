import { describe, it, expect, vi } from 'vitest'
import { useAuthForm } from '~/composables/useAuthForm'

describe('useAuthForm', () => {
  describe('signin mode', () => {
    it('returns email, password and form helpers', () => {
      const { email, password, getError, isInvalid, handleSubmit } = useAuthForm('signin')
      expect(email.value).toBe('')
      expect(password.value).toBe('')
      expect(getError('email')).toBe('')
      expect(getError('password')).toBe('')
      expect(isInvalid.value).toBe(false)
      expect(typeof handleSubmit).toBe('function')
    })

    it('validates required email', () => {
      const { email, getError, showError } = useAuthForm('signin')
      showError('email')
      expect(getError('email')).toBe('L\'email est requis')
      email.value = 'invalid'
      expect(getError('email')).toBe('Email invalide')
      email.value = 'user@example.com'
      expect(getError('email')).toBe('')
    })

    it('validates required password', () => {
      const { password, getError, showError } = useAuthForm('signin')
      showError('password')
      expect(getError('password')).toBe('Le mot de passe est requis')
      password.value = 'secret'
      expect(getError('password')).toBe('')
    })

    it('calls onValid when form is valid', () => {
      const { email, password, handleSubmit } = useAuthForm('signin')
      email.value = 'user@test.com'
      password.value = 'password123'
      const onValid = vi.fn()
      handleSubmit(onValid)
      expect(onValid).toHaveBeenCalledWith({ email: 'user@test.com', password: 'password123' })
    })

    it('does not call onValid when email is invalid', () => {
      const { email, password, handleSubmit } = useAuthForm('signin')
      email.value = 'bad'
      password.value = 'password123'
      const onValid = vi.fn()
      handleSubmit(onValid)
      expect(onValid).not.toHaveBeenCalled()
    })
  })

  describe('signup mode', () => {
    it('validates password length >= 8', () => {
      const { password, getError, showError } = useAuthForm('signup')
      password.value = 'short'
      showError('password')
      expect(getError('password')).toBe('Le mot de passe doit contenir au moins 8 caractères')
      password.value = 'longenough'
      expect(getError('password')).toBe('')
    })

    it('validates confirmPassword match', () => {
      const { password, confirmPassword, getError, showError } = useAuthForm('signup')
      password.value = 'password123'
      confirmPassword!.value = 'other'
      showError('confirmPassword')
      expect(getError('confirmPassword')).toBe('Les mots de passe ne correspondent pas')
      confirmPassword!.value = 'password123'
      expect(getError('confirmPassword')).toBe('')
    })

    it('calls onValid when signup form is valid', () => {
      const { email, password, confirmPassword, handleSubmit } = useAuthForm('signup')
      email.value = 'user@test.com'
      password.value = 'password123'
      confirmPassword!.value = 'password123'
      const onValid = vi.fn()
      handleSubmit(onValid)
      expect(onValid).toHaveBeenCalledWith({ email: 'user@test.com', password: 'password123' })
    })
  })
})
