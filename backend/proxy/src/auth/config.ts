import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, bearer, jwt, openAPI } from 'better-auth/plugins'
import { ac, adminRole, moderatorRole, userRole } from '@/auth/permissions'
import { createDb } from '@/db'

const getGoogleProvider = async (env: Env) => {
  const clientId = env.GOOGLE_CLIENT_ID?.trim()

  const clientSecret = await env.GOOGLE_CLIENT_SECRET.get()

  if (!clientId || !clientSecret) {
    return undefined
  }

  return {
    clientId,
    clientSecret,
  }
}

export const createAuth = async (env: Env) => {
  const secret = await env.BETTER_AUTH_SECRET.get()

  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is not configured')
  }

  const googleProvider = await getGoogleProvider(env)

  const baseURL = env.BETTER_AUTH_URL

  return betterAuth({
    appName: 'DanmakuAnywhere',
    baseURL,
    basePath: '/auth',
    secret,
    trustedOrigins: [env.BETTER_AUTH_TRUSTED_ORIGINS],
    emailAndPassword: { enabled: true, minPasswordLength: 6 },
    socialProviders: googleProvider ? { google: googleProvider } : {},
    database: drizzleAdapter(createDb(env.DB), {
      provider: 'sqlite',
    }),
    plugins: [
      admin({
        ac,
        defaultRole: 'user',
        roles: {
          admin: adminRole,
          moderator: moderatorRole,
          user: userRole,
        },
      }),
      bearer(),
      openAPI(),
      jwt(),
    ],
    advanced: {
      disableOriginCheck: env.ENVIRONMENT === 'dev',
    },
  })
}
