/**
 * Composable for signin/signup form state and validation (front-only).
 */
export function useAuthForm(mode: 'signin' | 'signup') {
  const email = ref('')
  const password = ref('')
  const confirmPassword = ref(mode === 'signup' ? '' : undefined)

  const emailError = computed(() => {
    if (!email.value) return 'L\'email est requis'
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(email.value)) return 'Email invalide'
    return ''
  })

  const passwordError = computed(() => {
    if (!password.value) return 'Le mot de passe est requis'
    if (mode === 'signup' && password.value.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères'
    }
    return ''
  })

  const confirmPasswordError = computed(() => {
    if (mode !== 'signup') return ''
    if (!confirmPassword.value) return 'Veuillez confirmer le mot de passe'
    if (confirmPassword.value !== password.value) return 'Les mots de passe ne correspondent pas'
    return ''
  })

  const isInvalid = computed(() =>
    !!emailError.value || !!passwordError.value || !!confirmPasswordError.value
  )

  const touched = ref({ email: false, password: false, confirmPassword: false })

  function showError(field: 'email' | 'password' | 'confirmPassword') {
    touched.value[field] = true
  }

  function getError(field: 'email' | 'password' | 'confirmPassword') {
    const key = field === 'confirmPassword' ? 'confirmPassword' : field
    if (!touched.value[key]) return ''
    if (field === 'email') return emailError.value
    if (field === 'password') return passwordError.value
    return confirmPasswordError.value
  }

  function handleSubmit(onValid: (payload: { email: string, password: string }) => void) {
    touched.value = { email: true, password: true, confirmPassword: true }
    if (isInvalid.value) return
    onValid({ email: email.value, password: password.value })
  }

  return {
    email,
    password,
    confirmPassword,
    emailError,
    passwordError,
    confirmPasswordError,
    isInvalid,
    touched,
    showError,
    getError,
    handleSubmit
  }
}
