export function useAdminAuth() {
  const { user, loggedIn } = useUserSession()
  const isAdmin = computed(() => user.value?.role === 'admin')
  return { user, loggedIn, isAdmin }
}
