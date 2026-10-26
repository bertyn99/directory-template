import { z } from 'zod'

export const loginSchema = z.object({
    email: z.email('Invalid email address').trim().min(1, 'Email is required'),
    password: z.string().min(8, 'Password is required (minimum 8 characters)'),
})

export const registerSchema = z.object({
    email: z.email('Invalid email address').trim().min(1, 'Email is required'),
    username: z.string().min(3, 'Username is required (minimum 3 characters)'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters long')
        .max(100, 'Password cannot exceed 100 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/, {
            message: 'Password must include uppercase, lowercase, number, and special character',
        }),
})

export const useAuth = () => {
    const loading = ref(false)
    const error = ref<string | null>(null)
    const localePath = useLocalePath()
    const userSession = useUserSession()
    const { fetch, clear } = userSession
    /*   const analytics = useAnalytics() */

    async function login(credentials: z.infer<typeof loginSchema>) {
        try {
            loading.value = true
            error.value = null
            //analytics.auth.loginStarted()
            loginSchema.parse(credentials)

            const { csrf } = useCsrf()
            const userRes = await $fetch('/api/auth/login', {
                method: 'POST',
                body: credentials,
                headers: { 'csrf-token': csrf },
            }) as unknown

            const isSuccess = typeof userRes === 'object'
                && userRes !== null
                && 'success' in userRes
                && (userRes as { success?: boolean }).success

            if (isSuccess) {
                await fetch()
                //analytics.auth.loginSuccess()
                return true
            }
            else {
                error.value = 'Invalid email or password'
                //analytics.auth.loginFailed('invalid_credentials')
                return false
            }
        }
        catch (e: unknown) {
            // Extract error message from H3 error response
            let errorMessage = 'An unexpected error occurred'

            if (e && typeof e === 'object') {
                const errorObj = e as Record<string, unknown>
                const data = errorObj.data as Record<string, unknown> | undefined
                if (data?.message && typeof data.message === 'string') {
                    errorMessage = data.message
                } else if (data?.statusMessage && typeof data.statusMessage === 'string') {
                    errorMessage = data.statusMessage
                } else if (errorObj.message && typeof errorObj.message === 'string') {
                    errorMessage = errorObj.message
                }
            } else if (typeof e === 'string') {
                errorMessage = e
            } else if (e instanceof Error) {
                errorMessage = e.message
            }

            error.value = errorMessage
            /*   analytics.auth.loginFailed(e instanceof Error ? e.message : 'unknown_error') */
            return false
        }
        finally {
            loading.value = false
        }
    }

    async function register(credentials: z.infer<typeof registerSchema>) {
        try {
            loading.value = true
            error.value = null
            registerSchema.parse(credentials)

            const { csrf } = useCsrf()
            const userRes = await $fetch('/api/auth/signup', {
                method: 'POST',
                body: credentials,
                headers: { 'csrf-token': csrf },
            }) as unknown

            const isSuccess = typeof userRes === 'object'
                && userRes !== null
                && 'success' in userRes
                && (userRes as { success?: boolean }).success

            if (isSuccess) {
                await fetch()
                /*  analytics.onboarding.accountCreated()
                 analytics.identifyUser() */
                return true
            }
            else {
                error.value = 'Registration failed'
                return false
            }
        }
        catch (e: unknown) {
            error.value = e instanceof Error ? e.message : 'An unexpected error occurred'
            return false
        }
        finally {
            loading.value = false
        }
    }

    async function logout() {
        try {
            const { csrf } = useCsrf()
            await $fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'csrf-token': csrf },
            })
        } finally {
            // Destroy client state + leave the dashboard even if the server
            // call failed — an unauthenticated visitor must never stay there.
            await clear()
            await navigateTo(localePath('/'))
        }
    }

    return {
        loading,
        error,
        login,
        register,
        logout,
    }
}
