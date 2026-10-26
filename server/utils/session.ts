import { getRequestIP } from '#imports'
import type { H3Event } from 'h3'

export const extractSessionDataInRequest = (event: H3Event) => {
    const userAgent = getRequestHeader(event, 'user-agent')
    const ipAddress = getRequestIP(event, { xForwardedFor: true }) || getRequestHeader(event, 'cf-connecting-ip') || '127.0.0.1'
    //get the expires at from the runtime config of nuxt auth utils
    const expiresAt = useRuntimeConfig(event).session.maxAge
    return { userAgent, ipAddress, expiresAt }
}