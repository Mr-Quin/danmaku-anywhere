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
      Sentry.setTag('extension.version', version)
    }
    if (id) {
      Sentry.setTag('extension.id', id)
      context.set('extensionId', id)
    }
    const cf = context.req.raw.cf

    if (cf) {
      Sentry.setTags({
        'cf.colo': cf.colo as string,
        'cf.asn': cf.asn as string,
        'cf.asOrganization': cf.asOrganization as string,
        'cf.city': cf.city as string,
        'cf.region': cf.region as string,
        'cf.latitude': cf.latitude as string,
        'cf.longitude': cf.longitude as string,
        'cf.timezone': cf.timezone as string,
      })
    }

    Sentry.setUser({
      id,
      ip_address: context.req.header('CF-Connecting-IP'),
      geo: {
        country_code: cf?.country as string,
        region: cf?.region as string,
        city: cf?.city as string,
      },
    })
    return next()
  })
