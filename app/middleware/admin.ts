export default defineNuxtRouteMiddleware(() => {
  const { loggedIn, user } = useUserSession()
  if (!loggedIn.value) {
    return navigateTo('/signin')
  }
  if (user.value?.role !== 'admin') {
    return navigateTo('/')
  }
})
