export default defineNuxtRouteMiddleware(() => {
  const user = useUserSession().user.value
  if (!user || user.role !== 'admin') {
    return navigateTo('/')
  }
})
