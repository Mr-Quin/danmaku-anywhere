import * as Sentry from '@sentry/cloudflare'
import { factory } from '@/factory'

declare module 'hono' {
  interface ContextVariableMap {
    extensionVersion?: string
    extensionId?: string
  }
}

export const setContext = () =>
  factory.createMiddleware(async (context, next) => {
    const version = context.req.header('da-version')
    const id = context.req.header('da-extension-id')
    if (version) {
      context.set('extensionVersion', version)
      Sentry.setTag('extension_version', version)
    }
    if (id) {
      context.set('extensionId', id)
    }
    Sentry.setUser({
      id,
      ip_address: context.req.header('CF-Connecting-IP'),
      geo: {
        country_code: context.req.header('Cf-Ipcountry'),
      },
    })
    return next()
  })
