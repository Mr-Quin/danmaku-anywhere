import * as Sentry from '@sentry/cloudflare'
import type { Context } from 'hono'
import type { AuthSessionData, AuthUser } from '@/auth/types'
import { type Database, getOrCreateDb } from '@/db'
import { factory } from '@/factory'

declare module 'hono' {
  interface ContextVariableMap {
    extensionVersion?: string
    extensionId?: string
    ip?: string
    createDb: () => Database
    authUser?: AuthUser | null
    authSession?: AuthSessionData | null
  }
}

export const setContext = () =>
  factory.createMiddleware(async (context, next) => {
    const version = context.req.header('da-version')
    const id = context.req.header('da-extension-id')
    const ip = context.req.header('CF-Connecting-IP')
    if (version) {
      context.set('extensionVersion', version)
    }
    if (id) {
      context.set('extensionId', id)
    }
    if (ip) {
      context.set('ip', ip)
    }
    context.set('createDb', () => getOrCreateDb(context.env.DB))
    return next()
  })

/**
 * Copy the request's identifying details onto the Sentry scope. Every tag is a write
 * that only pays off when an event is actually sent, so this runs from the error
 * handler rather than on every request.
 */
export function applySentryContext(context: Context): void {
  const version = context.get('extensionVersion')
  const id = context.get('extensionId')
  const ip = context.get('ip')
  const cf = context.req.raw.cf

  if (version) {
    Sentry.setTag('extension.version', version)
  }
  if (id) {
    Sentry.setTag('extension.id', id)
  }
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
    ip_address: ip,
    geo: {
      country_code: cf?.country as string,
      region: cf?.region as string,
      city: cf?.city as string,
    },
  })
}
