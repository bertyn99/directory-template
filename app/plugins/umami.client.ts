/** Sync Umami distinct user ID when a session exists (bgervan fork umIdentify). */
export default defineNuxtPlugin(() => {
  const { user, loggedIn } = useUserSession()

  watch(
    () => (loggedIn.value && user.value?.id ? user.value.id : null),
    (userId) => {
      if (userId)
        umIdentify(userId)
    },
    { immediate: true },
  )
})
