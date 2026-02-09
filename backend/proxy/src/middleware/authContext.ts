import { getOrCreateAuth } from '@/auth/config'
import type { AuthSession } from '@/auth/types'
import { factory } from '@/factory'
import { getIsTestEnv } from '@/utils/getIsTestEnv'

const resolveAuthSession = async (
  headers: Headers,
  getSession: (headers: Headers) => Promise<AuthSession | null>
) => {
  const session = await getSession(headers)
  if (!session) {
    return { user: null, session: null }
  }
  return { user: session.user, session: session.session }
}

export const authContext = () =>
  factory.createMiddleware(async (context, next) => {
    if (getIsTestEnv() || !context.env.BETTER_AUTH_URL) {
      context.set('authUser', null)
      context.set('authSession', null)
      return next()
    }

    try {
      const auth = await getOrCreateAuth(context.env)
      const { user, session } = await resolveAuthSession(
        context.req.raw.headers,
        (headers) => auth.api.getSession({ headers })
      )

      context.set('authUser', user)
      context.set('authSession', session)
      return next()
    } catch (error) {
      console.error('Error getting auth session', error)
      context.set('authUser', null)
      context.set('authSession', null)
      return next()
    }
  })

export { resolveAuthSession }
