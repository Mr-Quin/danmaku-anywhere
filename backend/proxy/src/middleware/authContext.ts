import { getOrCreateAuth, setWaitUntil } from '@/auth/config'
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

// A session can only reach us in a cookie or an Authorization header, so a request
// carrying neither has no session to find. Most proxy traffic is anonymous passthrough,
// and resolving those through Better Auth costs CPU to arrive at null.
function hasAuthCredential(headers: Headers): boolean {
  return headers.has('cookie') || headers.has('authorization')
}

export const authContext = () =>
  factory.createMiddleware(async (context, next) => {
    if (
      getIsTestEnv() ||
      !context.env.BETTER_AUTH_URL ||
      !hasAuthCredential(context.req.raw.headers)
    ) {
      context.set('authUser', null)
      context.set('authSession', null)
      return next()
    }

    try {
      setWaitUntil(context.executionCtx.waitUntil)
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

export { hasAuthCredential, resolveAuthSession }
